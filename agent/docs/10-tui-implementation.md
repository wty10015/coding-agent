# 上游工具TUI 实现深度分析

## 1. 架构总览

上游工具的终端用户界面（TUI）是一个完全自研的终端渲染引擎，基于 React 的协调器（Reconciler）机制，
结合 Facebook Yoga 布局引擎和自定义的双缓冲屏幕差分算法，实现了一个高性能的全屏终端应用。

### 1.1 核心架构图

```
+-------------------------------------------------------------------+
|                        用户输入层                                   |
|  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  |
|  │ parse-keypress│  │ Vim 状态机   │  │ Keybinding 系统          │  |
|  │  (键盘解析)   │  │ (模态编辑)   │  │ (快捷键分发)             │  |
|  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────────┘  |
+---------┼────────────────┼──────────────────────┼─────────────────+
          │                │                      │
          v                v                      v
+-------------------------------------------------------------------+
|                     React 组件层                                    |
|  ┌───────────┐  ┌──────────────┐  ┌────────────────────────────┐  |
|  │ REPL.tsx  │  │ PromptInput  │  │ VirtualMessageList         │  |
|  │ (5005行)  │  │ (2338行)     │  │ (虚拟滚动消息列表)          │  |
|  └─────┬─────┘  └──────┬───────┘  └──────────┬─────────────────┘  |
|        │               │                     │                    |
|        └───────────────┼─────────────────────┘                    |
+------------------------┼-----------------------------------------+
                         │
+-------------------------------------------------------------------+
|                   Ink 渲染引擎层 (~96 文件)                         |
|  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  |
|  │ reconciler │  │ dom.ts     │  │ renderer   │  │ output.ts  │  |
|  │ (React协调) │  │ (虚拟DOM)  │  │ (渲染器)    │  │ (操作收集)  │  |
|  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  |
|         │               │               │               │         |
|  ┌──────┴───────────────┴───────────────┴───────────────┴──────┐  |
|  │                  ink.tsx (1722行) - 核心编排器                 │  |
|  │  双缓冲 + 差分渲染 + 选择覆盖 + 搜索高亮 + 光标管理           │  |
|  └─────────────────────────┬────────────────────────────────────┘  |
+--------------------------------┼----------------------------------+
                                 │
+-------------------------------------------------------------------+
|                    底层终端层                                       |
|  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐  |
|  │ Yoga 布局引擎 │  │ Screen 缓冲区  │  │ terminal.ts            │  |
|  │ (Flexbox计算) │  │ (Cell数组+Pool)│  │ (ANSI序列/差分写入)     │  |
|  └──────────────┘  └───────────────┘  └────────────────────────┘  |
+-------------------------------------------------------------------+
```

### 1.2 文件规模统计

| 模块 | 文件数 | 核心文件 | 行数 |
|------|--------|----------|------|
| ink/ | ~96 | ink.tsx | ~1722 |
| components/ | ~389 | PromptInput.tsx | ~2338 |
| screens/ | - | REPL.tsx | ~5005 |
| vim/ | 5 | transitions.ts | ~300 |
| keybindings/ | 14 | resolver.ts | ~200 |

## 2. 自定义 Ink 渲染引擎

### 2.1 React Reconciler 集成

上游工具使用 `react-reconciler` 创建了一个自定义的 React 渲染器，将 React 组件树映射到
自定义的终端 DOM 节点。

**文件**: `src/ink/reconciler.ts`

```typescript
// reconciler.ts:4-23
import createReconciler from 'react-reconciler'
import {
  appendChildNode,
  clearYogaNodeReferences,
  createNode,
  createTextNode,
  type DOMElement,
  insertBeforeNode,
  markDirty,
  removeChildNode,
  setAttribute,
  setStyle,
  setTextNodeValue,
  setTextStyles,
  type TextNode,
} from './dom.js'
```

Reconciler 实现了完整的 React 宿主配置，包括：
- `createInstance`: 创建 DOM 元素节点（ink-box、ink-text 等）
- `createTextInstance`: 创建文本节点
- `appendChildTo`/`removeChildFrom`: 树操作
- `commitUpdate`: 属性差分更新
- `resetAfterCommit`: 触发 Yoga 布局计算和渲染调度

关键优化是在 `resetAfterCommit` 中进行属性差分（`diff` 函数，reconciler.ts:62-93），
只有属性真正变化时才标记节点为脏（`markDirty`），避免不必要的重新布局。

### 2.2 自定义 DOM 模型

**文件**: `src/ink/dom.ts`

DOM 节点类型定义了终端 UI 的基础结构：

```typescript
// dom.ts:19-27
export type ElementNames =
  | 'ink-root'
  | 'ink-box'
  | 'ink-text'
  | 'ink-virtual-text'
  | 'ink-link'
  | 'ink-progress'
  | 'ink-raw-ansi'
```

每个 `DOMElement` 携带丰富的状态：

```typescript
// dom.ts:31-91 (简化)
export type DOMElement = {
  nodeName: ElementNames
  attributes: Record<string, DOMNodeAttribute>
  childNodes: DOMNode[]
  dirty: boolean                    // 是否需要重渲染
  isHidden?: boolean                // 隐藏状态
  scrollTop?: number                // 滚动位置
  pendingScrollDelta?: number       // 待消耗的滚动增量
  scrollClampMin?: number           // 虚拟滚动边界钳位
  scrollClampMax?: number
  scrollHeight?: number             // 内容总高度
  scrollViewportHeight?: number     // 可视区域高度
  stickyScroll?: boolean            // 粘性滚动（自动跟随底部）
  scrollAnchor?: { el: DOMElement; offset: number }  // 滚动锚点
  focusManager?: FocusManager       // 焦点管理器（仅 root 节点）
  yogaNode?: LayoutNode             // Yoga 布局节点
  style: Styles                     // 样式
} & InkNode
```

特别值得注意的是，DOM 元素直接包含了滚动状态（`scrollTop`、`pendingScrollDelta` 等），
这使得滚动可以在渲染层面被高效处理，无需通过 React 状态更新。

### 2.3 Yoga 布局引擎集成

**文件**: `src/ink/layout/yoga.ts`, `src/ink/layout/node.ts`, `src/native-ts/yoga-layout/`

布局系统通过一个抽象适配器层连接 Yoga：

```
LayoutNode (接口)  -->  YogaLayoutNode (适配器)  -->  Yoga WASM (native-ts)
    node.ts                  yoga.ts              yoga-layout/index.ts
```

`LayoutNode` 接口（node.ts:93+）抽象了所有布局操作：

```typescript
// node.ts:93-100
export type LayoutNode = {
  insertChild(child: LayoutNode, index: number): void
  removeChild(child: LayoutNode): void
  getChildCount(): number
  getParent(): LayoutNode | null
  calculateLayout(width: number): void
  getComputedWidth(): number
  getComputedHeight(): number
  // ... Flexbox 属性设置方法
}
```

`YogaLayoutNode`（yoga.ts:54+）将这些调用转发到真实的 Yoga 节点，并处理枚举映射：

```typescript
// yoga.ts:33-49
const EDGE_MAP: Record<LayoutEdge, Edge> = {
  all: Edge.All,
  horizontal: Edge.Horizontal,
  // ...
}
```

布局支持完整的 CSS Flexbox 模型：FlexDirection、JustifyContent、AlignItems、
Overflow（visible/hidden/scroll）、Position（relative/absolute）等。

布局计算在 React 的 commit 阶段执行（ink.tsx:246-257）：

```typescript
// ink.tsx:246-257
this.rootNode.onComputeLayout = () => {
  if (this.isUnmounted) return;
  if (this.rootNode.yogaNode) {
    const t0 = performance.now();
    this.rootNode.yogaNode.setWidth(this.terminalColumns);
    this.rootNode.yogaNode.calculateLayout(this.terminalColumns);
    const ms = performance.now() - t0;
    recordYogaMs(ms);
  }
};
```

## 3. 双缓冲渲染管线

### 3.1 帧管理与双缓冲

**文件**: `src/ink/ink.tsx`, `src/ink/frame.ts`

系统维护两个帧缓冲区：`frontFrame`（当前显示帧）和 `backFrame`（下一帧的写入目标）。

```typescript
// frame.ts:12-20
export type Frame = {
  readonly screen: Screen           // 屏幕缓冲区
  readonly viewport: Size           // 视口尺寸
  readonly cursor: Cursor           // 光标位置
  readonly scrollHint?: ScrollHint  // DECSTBM 滚动优化提示
  readonly scrollDrainPending?: boolean  // 滚动排空标志
}
```

每帧渲染后交换：

```typescript
// ink.tsx:594-595
this.backFrame = this.frontFrame;
this.frontFrame = frame;
```

### 3.2 渲染管线流程

```
React 状态变更
    │
    v
scheduleRender (16ms 节流)    <-- constants.ts: FRAME_INTERVAL_MS = 16
    │
    v
onRender()
    │
    ├── 1. flushInteractionTime()         // 批量更新交互时间
    ├── 2. renderer()                     // DOM -> Screen (Yoga 布局 -> 像素写入)
    │       ├── renderNodeToOutput()      // 递归遍历 DOM 树
    │       │   ├── Yoga 布局读取
    │       │   ├── 文本换行/裁剪
    │       │   ├── 边框渲染
    │       │   ├── 滚动偏移
    │       │   └── 脏检查 + Blit 优化
    │       └── Output.get()              // 操作 -> Screen 缓冲区
    │
    ├── 3. 选择覆盖                       // applySelectionOverlay()
    ├── 4. 搜索高亮                       // applySearchHighlight()
    ├── 5. 全屏损伤检测                    // didLayoutShift() 判定
    │
    ├── 6. log.render()                   // Screen 差分 -> Diff[]
    │       ├── diffEach()                // 逐 Cell 比较
    │       ├── DECSTBM 硬件滚动         // 如果 scrollHint 可用
    │       └── fullReset (回退)          // 如果滚动缓冲区不可达
    │
    ├── 7. optimize(diff)                 // Diff 优化合并
    ├── 8. 光标定位                       // 原生 IME 光标跟踪
    └── 9. writeDiffToTerminal()          // ANSI 序列写入 stdout
```

### 3.3 Screen 缓冲区与对象池

**文件**: `src/ink/screen.ts`

Screen 是一个二维 Cell 数组，每个 Cell 存储字符、样式 ID 和超链接 ID。
为了极致的内存效率，使用了三个对象池进行字符串驻留（interning）：

```typescript
// screen.ts:21-53
export class CharPool {
  private strings: string[] = [' ', '']  // 索引0=空格，索引1=空串
  private ascii: Int32Array              // ASCII 快速路径

  intern(char: string): number {
    // ASCII 快速路径：直接数组查找，避免 Map.get
    if (char.length === 1) {
      const code = char.charCodeAt(0)
      if (code < 128) {
        const cached = this.ascii[code]!
        if (cached !== -1) return cached
        // ...
      }
    }
    // Unicode 回退到 Map
    const existing = this.stringMap.get(char)
    // ...
  }
}
```

```
StylePool:  AnsiCode[][] → 整数ID（位0编码是否影响空格可见性）
CharPool:   字符串 → 整数ID（ASCII快速路径 + Unicode Map回退）
HyperlinkPool: URL字符串 → 整数ID
```

**StylePool 的位编码技巧**（screen.ts:129-141）：

```typescript
intern(styles: AnsiCode[]): number {
  // ...
  id = (rawId << 1) |
    (styles.length > 0 && hasVisibleSpaceEffect(styles) ? 1 : 0)
  // 位0=1 表示该样式对空格字符有可见效果（如背景色、反转）
  // 渲染器可以通过单个位掩码跳过不可见的空格
}
```

对象池每 5 分钟重置一次以防止长会话中的无界增长（ink.tsx:600-603）。

### 3.4 差分渲染（LogUpdate）

**文件**: `src/ink/log-update.ts`

`LogUpdate.render()` 方法计算两帧之间的最小 ANSI 更新序列：

```typescript
// log-update.ts:123-131
render(prev: Frame, next: Frame, altScreen = false, decstbmSafe = true): Diff {
  // 1. 视口尺寸变化 → 全量重绘
  // 2. DECSTBM 硬件滚动优化
  // 3. diffEach 逐 Cell 比较（仅在损伤区域内）
  // 4. 滚动缓冲区不可达 → 全量重绘回退
}
```

**DECSTBM 硬件滚动优化**（log-update.ts:166-185）：

当 ScrollBox 的 scrollTop 变化时，使用终端的硬件滚动区域功能（DECSTBM: Set Top and Bottom Margins），
通过 `CSI top;bottom r` 设置滚动区域，然后 `CSI n S/T` 上/下滚动。prev.screen 上的 `shiftRows`
模拟了硬件滚动效果，使得差分循环只发现新滚入的行作为差异——字节数大幅减少。

```typescript
// log-update.ts:166-185
if (altScreen && next.scrollHint && decstbmSafe) {
  const { top, bottom, delta } = next.scrollHint
  shiftRows(prev.screen, top, bottom, delta)
  scrollPatch = [{
    type: 'stdout',
    content:
      setScrollRegion(top + 1, bottom + 1) +
      (delta > 0 ? csiScrollUp(delta) : csiScrollDown(-delta)) +
      RESET_SCROLL_REGION + CURSOR_HOME,
  }]
}
```

但这需要原子性保证——如果终端不支持 DEC 2026 同步输出（如 tmux），
则回退到逐行差分更新以避免闪烁。

### 3.5 Diff 优化器

**文件**: `src/ink/optimizer.ts`

优化器在单次遍历中应用多条规则减少写入量：

```typescript
// optimizer.ts:16-93
export function optimize(diff: Diff): Diff {
  // - 移除空 stdout 补丁
  // - 合并连续 cursorMove 补丁
  // - 移除无操作 cursorMove(0,0)
  // - 连接相邻样式补丁（过渡差分不能丢弃）
  // - 去重连续相同 URI 的超链接
  // - 取消光标 hide/show 对
  // - 移除 count=0 的 clear 补丁
}
```

### 3.6 Patch 类型系统

**文件**: `src/ink/frame.ts`

```typescript
// frame.ts:73-94
export type Patch =
  | { type: 'stdout'; content: string }       // 原始 ANSI 输出
  | { type: 'clear'; count: number }          // 清除行数
  | { type: 'clearTerminal'; reason: ... }    // 全屏清除
  | { type: 'cursorHide' }                    // 隐藏光标
  | { type: 'cursorShow' }                    // 显示光标
  | { type: 'cursorMove'; x: number; y: number }  // 相对移动
  | { type: 'cursorTo'; col: number }         // 绝对列定位
  | { type: 'carriageReturn' }                // 回车
  | { type: 'hyperlink'; uri: string }        // OSC 8 超链接
  | { type: 'styleStr'; str: string }         // 预序列化样式转换
```

## 4. 虚拟滚动系统

### 4.1 ScrollBox 组件

**文件**: `src/ink/components/ScrollBox.tsx`

ScrollBox 是一个内置 `overflow: scroll` 的 Box 组件，提供命令式滚动 API：

```typescript
// ScrollBox.tsx:10-62 (关键接口)
export type ScrollBoxHandle = {
  scrollTo: (y: number) => void;
  scrollBy: (dy: number) => void;
  scrollToElement: (el: DOMElement, offset?: number) => void;
  scrollToBottom: () => void;
  getScrollTop: () => number;
  getScrollHeight: () => number;
  getViewportHeight: () => number;
  isSticky: () => boolean;          // 是否粘在底部
  setClampBounds: (min, max) => void;  // 虚拟滚动边界钳位
};
```

`scrollToElement` 是一个巧妙的设计——它不像 `scrollTo(N)` 那样烘焙一个在节流渲染触发时
已经过时的数字，而是将 DOM 元素引用存储为 `scrollAnchor`（dom.ts:82），在渲染时读取
`el.yogaNode.getComputedTop()`，确保位置计算与当前 Yoga 布局一致。

### 4.2 虚拟消息列表

**文件**: `src/components/VirtualMessageList.tsx`

VirtualMessageList 通过 `useVirtualScroll` Hook 实现消息的按需渲染：

```
+----------------------------------------------------------+
|  虚拟化原理:                                               |
|                                                           |
|  ┌──────────────────────────────┐ ← scrollClampMin       |
|  │ Spacer (未挂载的上方消息高度)   │                        |
|  ├──────────────────────────────┤                         |
|  │ 消息 #15                     │ ← 视口顶部              |
|  │ 消息 #16                     │                         |
|  │ 消息 #17                     │ ← 可见区域              |
|  │ 消息 #18                     │                         |
|  ├──────────────────────────────┤                         |
|  │ Spacer (未挂载的下方消息高度)   │                        |
|  └──────────────────────────────┘ ← scrollClampMax       |
+----------------------------------------------------------+
```

`setClampBounds` 防止在 React 的异步重渲染追上之前，burst scrollTo 调用滚到空白区域——
render-node-to-output 将 scrollTop 钳位到 [min, max]，显示已挂载内容的边缘而不是空白。

### 4.3 滚动排空（Scroll Drain）

**文件**: `src/ink/render-node-to-output.ts`

滚动使用渐进排空（drain）机制，而不是一次性跳转，实现平滑动画效果：

```typescript
// render-node-to-output.ts:109-121
const SCROLL_MIN_PER_FRAME = 4          // 最小排空行数
const SCROLL_INSTANT_THRESHOLD = 5      // ≤此值：一次排空（慢速点击立即响应）
const SCROLL_HIGH_PENDING = 12          // 快速滑动阈值
const SCROLL_STEP_MED = 2              // 中等排空步长
const SCROLL_STEP_HIGH = 3             // 快速排空步长
const SCROLL_MAX_PENDING = 30          // 超出此值立即消化
```

排空策略根据终端类型自适应：
- **原生终端**（iTerm2/Ghostty）：比例排空（~3/4 的剩余量），大突发以 log4 帧追赶
- **xterm.js**（VS Code）：低挂起量（<=5）一次排空完，高挂起量固定步长平滑过渡

排空帧比正常帧更频繁运行（`FRAME_INTERVAL_MS >> 2`，约 4ms，ink.tsx:758），因为
排空帧本身很轻量（DECSTBM + ~10 patches，~200 bytes）。

## 5. 交备屏与终端管理

### 5.1 交备屏切换

**文件**: `src/ink/ink.tsx`

上游工具使用终端的交备屏（Alternate Screen）实现全屏模式：

```typescript
// ink.tsx:357-377
enterAlternateScreen(): void {
  this.pause();
  this.suspendStdin();
  this.options.stdout.write(
    DISABLE_KITTY_KEYBOARD + DISABLE_MODIFY_OTHER_KEYS +
    (this.altScreenMouseTracking ? DISABLE_MOUSE_TRACKING : '') +
    (this.altScreenActive ? '' : '\x1b[?1049h') +  // 进入交备屏
    '\x1b[?1004l' +  // 禁用焦点报告
    '\x1b[0m' +      // 重置属性
    '\x1b[?25h' +    // 显示光标
    '\x1b[2J' +      // 清屏
    '\x1b[H'         // 光标归位
  );
}
```

退出交备屏时需要特别处理 vim/nano 等编辑器的 smcup/rmcup 序列冲突（ink.tsx:392-418）。

### 5.2 同步输出（DEC 2026）

**文件**: `src/ink/terminal.ts`

```typescript
// terminal.ts:70-78
export function isSynchronizedOutputSupported(): boolean {
  // tmux 不支持 DEC 2026，跳过以节省 16字节/帧
  if (process.env.TMUX) return false;
  // 检测 Ghostty、iTerm2、WezTerm 等支持的终端
}
```

当终端支持 DEC 2026 时，每帧的写入被包裹在 BSU/ESU（Begin/End Synchronized Update）中，
确保更新原子性，防止在重绘期间出现可见闪烁。

### 5.3 SIGCONT 恢复

当进程从挂起恢复时（ink.tsx:280-301），处理逻辑区分两种模式：
- **交备屏模式**：重新进入交备屏并全量重绘
- **主屏模式**：重置两个帧缓冲区，清除 displayCursor，从零开始渲染

## 6. 文本选择系统

### 6.1 选择状态

**文件**: `src/ink/selection.ts`

```typescript
// selection.ts:19-63
export type SelectionState = {
  anchor: Point | null        // 拖拽起点
  focus: Point | null         // 当前拖拽位置
  isDragging: boolean         // 是否正在拖拽
  anchorSpan: {               // 双击/三击的初始范围
    lo: Point; hi: Point;
    kind: 'word' | 'line'
  } | null
  scrolledOffAbove: string[]  // 滚出视口上方的文本
  scrolledOffBelow: string[]  // 滚出视口下方的文本
  scrolledOffAboveSW: boolean[]  // 软换行标志
  scrolledOffBelowSW: boolean[]
  virtualAnchorRow?: number   // 钳位前的真实锚点行
  virtualFocusRow?: number
  lastPressHadAlt: boolean    // macOS option+click 检测
}
```

### 6.2 选择与滚动的协调

选择跟随滚动是一个精妙的设计（ink.tsx:462-512）。当内容向上滚动（新内容到达底部）时：

1. `captureScrolledRows` 捕获即将滚出视口的行文本（从 frontFrame 读取，因为 swap 还没发生）
2. `shiftAnchor`/`shiftSelectionForFollow` 将选择端点上移相同行数
3. 选择保持锚定在文本上（而不是屏幕位置），就像原生终端行为

拖拽期间只移动锚点（焦点跟踪鼠标），释放后两端一起移动。

### 6.3 选择覆盖渲染

选择覆盖直接修改 Screen 缓冲区中的 Cell 样式 ID（反转颜色），
然后差分引擎将这些变化作为普通的 Cell 变化输出。
这意味着 LogUpdate 保持纯差分引擎的角色，不需要知道选择的存在。

由于覆盖"污染"了 frontFrame 的 Screen，下一帧需要标记 `prevFrameContaminated = true`
（ink.tsx:743），防止 blit 从被污染的缓冲区复制反转的 Cell。

## 7. PromptInput 输入系统

### 7.1 组件架构

**文件**: `src/components/PromptInput/PromptInput.tsx` (~2338 行)

PromptInput 是上游工具中最复杂的组件之一，集成了：

```
PromptInput
├── TextInput / VimTextInput      // 文本编辑器
├── PromptInputFooter             // 底部状态栏
├── PromptInputModeIndicator      // 模式指示器
├── PromptInputQueuedCommands     // 排队命令
├── HistorySearchDialog           // 历史搜索（Ctrl+R）
├── ModelPicker                   // 模型选择器
├── ThinkingToggle                // 思考模式切换
├── GlobalSearchDialog            // 全局搜索
├── BackgroundTasksDialog         // 后台任务
├── TeamsDialog                   // 团队对话框
├── FastModePicker                // 快速模式选择
└── 多种上下文建议/自动完成组件
```

### 7.2 输入模式

```typescript
// PromptInput.tsx:124 (Props 中的关键类型)
type PromptInputMode = 'chat' | 'bash' | ...
type VimMode = 'INSERT' | 'NORMAL'
```

输入模式决定了提交行为、提示符显示和自动完成策略。
模式切换通过 `shift+tab`（或 Windows 上的 `meta+m`）实现。

### 7.3 图片粘贴

PromptInput 支持通过 `ctrl+v`（或 Windows 上的 `alt+v`）从剪贴板粘贴图片，
使用 `getImageFromClipboard` 工具提取并存储图片数据。

## 8. Vim 模态编辑

### 8.1 状态机设计

**文件**: `src/vim/types.ts`, `src/vim/transitions.ts`

Vim 模式实现了一个精确的状态机，状态图如下：

```
                          VimState
  ┌──────────────────────────┬──────────────────────────────────────┐
  │  INSERT                  │  NORMAL                              │
  │  (tracks insertedText)   │  (CommandState machine)              │
  │                          │                                      │
  │                          │  idle ──┬─[d/c/y]──► operator        │
  │                          │         ├─[1-9]────► count           │
  │                          │         ├─[fFtT]───► find            │
  │                          │         ├─[g]──────► g               │
  │                          │         ├─[r]──────► replace         │
  │                          │         └─[><]─────► indent          │
  │                          │                                      │
  │                          │  operator ─┬─[motion]──► execute     │
  │                          │            ├─[0-9]────► operatorCount│
  │                          │            ├─[ia]─────► operatorTextObj│
  │                          │            └─[fFtT]───► operatorFind │
  └──────────────────────────┴──────────────────────────────────────┘
```

### 8.2 CommandState 类型

```typescript
// types.ts:59-75
export type CommandState =
  | { type: 'idle' }
  | { type: 'count'; digits: string }
  | { type: 'operator'; op: Operator; count: number }
  | { type: 'operatorCount'; op: Operator; count: number; digits: string }
  | { type: 'operatorFind'; op: Operator; count: number; find: FindType }
  | { type: 'operatorTextObj'; op: Operator; count: number; scope: TextObjScope }
  | { type: 'find'; find: FindType; count: number }
  | { type: 'g'; count: number }
  | { type: 'operatorG'; op: Operator; count: number }
  | { type: 'replace'; count: number }
  | { type: 'indent'; dir: '>' | '<'; count: number }
```

TypeScript 的可辨识联合类型确保了 switch 语句的穷尽性检查。

### 8.3 状态转换

```typescript
// transitions.ts:59-88
export function transition(
  state: CommandState,
  input: string,
  ctx: TransitionContext,
): TransitionResult {
  switch (state.type) {
    case 'idle':          return fromIdle(input, ctx)
    case 'count':         return fromCount(state, input, ctx)
    case 'operator':      return fromOperator(state, input, ctx)
    case 'operatorCount': return fromOperatorCount(state, input, ctx)
    case 'operatorFind':  return fromOperatorFind(state, input, ctx)
    case 'operatorTextObj': return fromOperatorTextObj(state, input, ctx)
    case 'find':          return fromFind(state, input, ctx)
    case 'g':             return fromG(state, input, ctx)
    case 'operatorG':     return fromOperatorG(state, input, ctx)
    case 'replace':       return fromReplace(state, input, ctx)
    case 'indent':        return fromIndent(state, input, ctx)
  }
}
```

### 8.4 持久状态与点重复

```typescript
// types.ts:81-86
export type PersistentState = {
  lastChange: RecordedChange | null    // 上次修改（用于 . 重复）
  lastFind: { type: FindType; char: string } | null  // 上次查找
  register: string                     // 寄存器内容
  registerIsLinewise: boolean          // 寄存器是否行级
}
```

## 9. 快捷键系统

### 9.1 架构设计

**文件**: `src/keybindings/`（14 个文件）

```
快捷键系统架构：

defaultBindings.ts ─► parser.ts ─► resolver.ts ─► useKeybinding.ts
    (默认绑定)        (解析器)      (匹配器)         (React Hook)
                        │
loadUserBindings.ts ────┘  用户自定义覆盖
                        │
schema.ts ──────────────┘  验证约束
                        │
reservedShortcuts.ts ───┘  不可重绑定的键（ctrl+c, ctrl+d）
```

### 9.2 上下文分层

```typescript
// defaultBindings.ts:32-98 (简化)
export const DEFAULT_BINDINGS: KeybindingBlock[] = [
  {
    context: 'Global',
    bindings: {
      'ctrl+c': 'app:interrupt',
      'ctrl+d': 'app:exit',
      'ctrl+l': 'app:redraw',
      'ctrl+t': 'app:toggleTodos',
      'ctrl+r': 'history:search',
      'ctrl+shift+f': 'app:globalSearch',
    },
  },
  {
    context: 'Chat',
    bindings: {
      'escape': 'chat:cancel',
      'ctrl+x ctrl+k': 'chat:killAgents',   // 和弦（chord）快捷键
      'shift+tab': 'chat:cycleMode',
      'enter': 'chat:submit',
      'ctrl+_': 'chat:undo',
      'ctrl+g': 'chat:externalEditor',
    },
  },
  {
    context: 'Autocomplete',
    bindings: { /* ... */ },
  },
]
```

### 9.3 解析与匹配

**文件**: `src/keybindings/parser.ts`

```typescript
// parser.ts:13-75
export function parseKeystroke(input: string): ParsedKeystroke {
  const parts = input.split('+')
  const keystroke: ParsedKeystroke = {
    key: '', ctrl: false, alt: false,
    shift: false, meta: false, super: false,
  }
  for (const part of parts) {
    switch (part.toLowerCase()) {
      case 'ctrl': case 'control': keystroke.ctrl = true; break
      case 'alt': case 'opt': case 'option': keystroke.alt = true; break
      case 'cmd': case 'command': case 'super': keystroke.super = true; break
      // ... 特殊键名映射
    }
  }
  return keystroke
}
```

**和弦支持**：`ctrl+x ctrl+k` 解析为两步 chord，解析器支持空格分隔的多键序列。

### 9.4 解析器（Resolver）

**文件**: `src/keybindings/resolver.ts`

```typescript
// resolver.ts:10-20
export type ChordResolveResult =
  | { type: 'match'; action: string }
  | { type: 'none' }
  | { type: 'unbound' }
  | { type: 'chord_started'; pending: ParsedKeystroke[] }
  | { type: 'chord_cancelled' }
```

解析器的 `resolveKey` 函数接受当前活跃的上下文列表，从所有绑定中查找匹配项。
**最后一个匹配胜出**——这使得用户自定义绑定（追加到列表末尾）自然覆盖默认绑定。

### 9.5 平台适配

```typescript
// defaultBindings.ts:15
const IMAGE_PASTE_KEY = getPlatform() === 'windows' ? 'alt+v' : 'ctrl+v'

// defaultBindings.ts:30
const MODE_CYCLE_KEY = SUPPORTS_TERMINAL_VT_MODE ? 'shift+tab' : 'meta+m'
```

Windows Terminal 在没有 VT 模式时无法可靠传递 `shift+tab`，因此回退到 `meta+m`。
Node.js 24.2.0+ / Bun 1.2.23+ 启用了 VT 模式，修复了此问题。

## 10. 焦点管理

### 10.1 FocusManager

**文件**: `src/ink/focus.ts`

```typescript
// focus.ts:15-19
export class FocusManager {
  activeElement: DOMElement | null = null
  private focusStack: DOMElement[] = []  // 最大深度 32
  private enabled = true

  focus(node: DOMElement): void {
    // 去重后压入焦点栈
    // 派发 blur/focus 事件
  }

  handleNodeRemoved(node: DOMElement, root: DOMElement): void {
    // 清理被移除节点及其后代
    // 从栈中恢复上一个仍在树中的焦点
  }
}
```

焦点管理器存储在根 DOM 元素上（`root.focusManager`），任何节点可以通过
`parentNode` 链到达它——类似浏览器的 `node.ownerDocument`。

## 11. REPL 主屏幕

### 11.1 屏幕组织

**文件**: `src/screens/REPL.tsx` (~5005 行)

REPL 是上游工具中最大的单一组件，协调了几乎所有功能模块：

```
REPL.tsx
├── KeybindingSetup                // 快捷键初始化
├── AlternateScreen                // 交备屏包裹
├── FullscreenLayout               // 全屏布局容器
│   ├── ScrollBox + VirtualMessageList  // 滚动区域
│   │   ├── Messages                   // 消息渲染
│   │   └── PermissionRequest          // 权限请求（覆盖层）
│   └── Bottom Slot                    // 底部固定区域
│       ├── SpinnerWithVerb            // 加载指示器
│       ├── PromptInput                // 输入框
│       └── 各种对话框
├── ScrollKeybindingHandler        // 滚动快捷键
├── GlobalKeybindingHandlers       // 全局快捷键
├── CommandKeybindingHandlers      // 命令快捷键
└── 30+ 状态管理 Hooks
```

### 11.2 消息流处理

REPL 管理完整的消息生命周期：
- 用户输入提交 → `handlePromptSubmit`
- API 查询 → `query()` 流式处理
- 工具调用权限 → `PermissionRequest` 组件
- 消息压缩（compact）→ 令牌预算管理
- 会话恢复 → `deserializeMessages`
- 分支切换 → `switchSession`

## 12. 亮点发现

### 12.1 StylePool 的位编码 ID

`StylePool.intern()` 中，样式 ID 的位 0 编码该样式是否对空格字符有可见效果。
这使得渲染器可以用单个位运算 `(packedWord & 1)` 判断是否需要渲染空格，
将热循环中的条件判断从字符串比较降级为整数位操作——对于全是空格的背景区域，
这是一个巨大的优化。

### 12.2 ScrollAnchor 延迟读取

`scrollToElement` 存储 DOM 元素引用而非数字位置。在渲染时，
`render-node-to-output` 从 Yoga 的**同一次**布局计算中读取 `getComputedTop()`。
这消除了"设置 scrollTo 时的位置"和"渲染时的位置"之间的竞态条件，
因为节流渲染可能延迟 16ms+。

### 12.3 prevFrameContaminated 的传递性

选择覆盖和搜索高亮直接修改 Screen 缓冲区而不跟踪损伤区域。
`prevFrameContaminated` 标志确保下一帧强制全区域比较，
然后覆盖消失后再恢复到窄损伤路径。
这种 "污染 → 清洗 → 恢复" 的三阶段模式保证了正确性而不牺牲稳态性能。

### 12.4 DECSTBM + BSU/ESU 原子性保护

硬件滚动优化（DECSTBM）只在终端支持同步输出（DEC 2026）时启用。
没有原子性保护，外层终端（如 tmux）会在滚动和重绘之间渲染中间状态，
导致每帧可见的垂直跳动。回退到逐行差分写入虽然字节数更多，
但没有中间状态——因为差分是从上到下的覆盖式写入。

### 12.5 对象池 5 分钟代际重置

CharPool、HyperlinkPool 在长会话中会无界增长（每个唯一字符串一个 intern 条目）。
每 5 分钟执行一次 `migrateScreenPools`（ink.tsx:600-603），创建新的空池并将
当前两个帧缓冲区的活跃 Cell 迁移到新池。这相当于一次标记-清除 GC，
将池大小限制为"两帧内使用的唯一字符串"而非"会话中见过的所有唯一字符串"。

### 12.6 Vim 状态机的类型驱动设计

Vim 模式的 `CommandState` 使用 TypeScript 的可辨识联合类型，
每个状态精确编码了它期望的输入类型。这不仅是文档——TypeScript 编译器
会强制 switch 语句的穷尽性，使得遗漏状态转换成为编译错误而非运行时 bug。
正如类型文件所说："The types ARE the documentation"。

### 12.7 光标声明式定位

`useDeclaredCursor` Hook 允许组件声明终端光标应该停放的位置。
这使得 IME（中日韩输入法）的预编辑文本在物理光标位置内联渲染，
屏幕阅读器和放大镜可以跟踪输入焦点。
声明在 `useLayoutEffect` 中设置，而渲染在微任务中执行（ink.tsx:212），
确保声明总是比渲染先一个提交周期——不会有一键延迟。

### 12.8 滚动排空的终端自适应

滚动排空策略检测终端类型并调整行为：xterm.js（VS Code terminal）
使用低阈值立即排空（慢速滚轮点击应该立即响应），高挂起量使用固定小步长；
原生终端使用比例排空（3/4 剩余量），大突发以对数帧数追赶。
这种自适应使得同样的代码在不同终端上都能提供原生般的滚动体验。
