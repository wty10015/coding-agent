# 上游工具Buddy 机制深度解析

## 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [核心文件结构](#核心文件结构)
4. [伪随机数生成器 Mulberry32](#伪随机数生成器-mulberry32)
5. [哈希与种子生成](#哈希与种子生成)
6. [物种系统与反泄漏机制](#物种系统与反泄漏机制)
7. [稀有度系统](#稀有度系统)
8. [属性分配算法](#属性分配算法)
9. [Companion 数据模型](#companion-数据模型)
10. [反作弊机制](#反作弊机制)
11. [ASCII 精灵渲染系统](#ascii-精灵渲染系统)
12. [动画与交互系统](#动画与交互系统)
13. [通知与预告系统](#通知与预告系统)
14. [系统提示词集成](#系统提示词集成)
15. [数据流总览](#数据流总览)
16. [亮点发现](#亮点发现)

---

## 概述

Buddy 系统是上游工具中一个隐藏的"电子宠物"功能,于 2026 年 4 月 1 日上线(愚人节彩蛋)。
每个用户根据其 userId 确定性地生成一个唯一的 ASCII 伴侣角色(Companion),拥有物种、
眼睛样式、帽子装饰、稀有度等级和五维属性。系统通过 Mulberry32 伪随机数生成器(PRNG)
保证相同用户始终获得相同角色,同时内嵌了多层反作弊和反泄漏保护。

```
+------------------------------------------------------------------+
|                    Buddy 系统架构总览                              |
+------------------------------------------------------------------+
|                                                                   |
|  userId + SALT ──> hashString() ──> mulberry32(seed)             |
|                                          |                        |
|                                     [PRNG 流]                     |
|                                    /    |    \                    |
|                              species   eye   hat                  |
|                              rarity  shiny  stats                 |
|                                    \    |    /                    |
|                                 CompanionBones                    |
|                                      +                            |
|                              CompanionSoul (LLM生成)              |
|                                      =                            |
|                                  Companion                        |
|                                      |                            |
|                   +------------------+------------------+         |
|                   |                  |                  |          |
|            CompanionSprite    SpeechBubble     PromptIntro        |
|            (ASCII渲染+动画)   (对话气泡)      (系统提示词)        |
+------------------------------------------------------------------+
```

## 系统架构

整个 Buddy 系统由 6 个核心文件组成,各司其职:

```
buddy/
├── types.ts              # 类型定义、常量表、物种编码
├── companion.ts          # PRNG、哈希、骨架生成、核心逻辑
├── sprites.ts            # 18种物种的ASCII精灵帧 + 帽子渲染
├── CompanionSprite.tsx   # React组件:精灵动画、气泡、交互
├── prompt.ts             # 系统提示词注入逻辑
└── useBuddyNotification.tsx  # 预告通知、彩虹文字、时间窗口
```

## 核心文件结构

### types.ts — 类型与常量定义

文件路径: `src/buddy/types.ts`

此文件定义了 Buddy 系统的所有基础类型和常量表:

**稀有度体系** (types.ts:1-7):
```typescript
export const RARITIES = [
  'common', 'uncommon', 'rare', 'epic', 'legendary',
] as const
```

**眼睛与帽子** (types.ts:76-89):
```typescript
export const EYES = ['·', '✦', '×', '◉', '@', '°'] as const
export const HATS = [
  'none', 'crown', 'tophat', 'propeller',
  'halo', 'wizard', 'beanie', 'tinyduck',
] as const
```

**五维属性** (types.ts:91-98):
```typescript
export const STAT_NAMES = [
  'DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK',
] as const
```

## 伪随机数生成器 Mulberry32

文件路径: `src/buddy/companion.ts:16-25`

系统使用 **Mulberry32** 算法作为确定性伪随机数生成器。这是一个32位的种子PRNG,
代码注释原话: "tiny seeded PRNG, good enough for picking ducks"。

```typescript
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

**算法解析:**

```
+----------------------------------------------------------+
|               Mulberry32 PRNG 运算流程                     |
+----------------------------------------------------------+
|                                                           |
|  seed (uint32)                                            |
|       |                                                   |
|       v                                                   |
|  a = a + 0x6D2B79F5     [增量步进, 黄金比例相关常数]       |
|       |                                                   |
|       v                                                   |
|  t = Math.imul(a ^ (a >>> 15), 1 | a)   [异或右移+乘法]   |
|       |                                                   |
|       v                                                   |
|  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t          |
|       |                [二次混淆: 再次异或右移+乘法]        |
|       v                                                   |
|  result = (t ^ (t >>> 14)) >>> 0                          |
|       |                [最终异或右移, 无符号化]              |
|       v                                                   |
|  output = result / 4294967296    [映射到 [0, 1) 浮点数]    |
+----------------------------------------------------------+
```

关键特性:
- **确定性**: 相同种子永远产生相同序列
- **轻量**: 仅使用位运算和整数乘法
- **闭包封装**: 返回一个函数,每次调用推进内部状态
- **0x6d2b79f5**: 这是与黄金比例相关的常数,确保状态空间均匀遍历

## 哈希与种子生成

文件路径: `src/buddy/companion.ts:27-37`

**hashString 函数** 将任意字符串转为 32 位无符号整数:

```typescript
function hashString(s: string): number {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn)
  }
  let h = 2166136261          // FNV offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) // FNV prime
  }
  return h >>> 0
}
```

**双路径设计:**
1. **Bun 运行时**: 直接使用 `Bun.hash()` 的原生哈希,截断为 32 位
2. **通用路径**: 使用经典的 **FNV-1a** (Fowler-Noll-Vo) 哈希算法
   - `2166136261` = FNV offset basis
   - `16777619` = FNV prime for 32-bit

**种子组合** (companion.ts:84,107-113):

```typescript
const SALT = 'friend-2026-401'

export function roll(userId: string): Roll {
  const key = userId + SALT
  if (rollCache?.key === key) return rollCache.value
  const value = rollFrom(mulberry32(hashString(key)))
  rollCache = { key, value }
  return value
}
```

SALT 值 `'friend-2026-401'` 暗藏了发布日期: 2026年4月1日(愚人节),也暗示了"friend"
的定位。通过 `userId + SALT` 的拼接,即使 userId 相似,生成结果也会完全不同。

**单例缓存**: `rollCache` 使用简单的 `{key, value}` 单条缓存,因为注释说明
此函数在三个热路径中被频繁调用(500ms 精灵tick、每次按键的 PromptInput、每轮对话的 observer),
但 userId 在会话期间不会变化。

## 物种系统与反泄漏机制

文件路径: `src/buddy/types.ts:10-73`

这是整个 Buddy 系统最精妙的设计之一。所有 18 种物种名称都使用 `String.fromCharCode`
进行十六进制编码,而非直接写成字面字符串:

```typescript
// types.ts:10-13 — 注释解释了原因
// One species name collides with a model-codename canary in excluded-strings.txt.
// The check greps build output (not source), so runtime-constructing the value keeps
// the literal out of the bundle while the check stays armed for the actual codename.
// All species encoded uniformly; `as` casts are type-position only (erased pre-bundle).
const c = String.fromCharCode

export const duck     = c(0x64,0x75,0x63,0x6b) as 'duck'
export const goose    = c(0x67,0x6f,0x6f,0x73,0x65) as 'goose'
export const blob     = c(0x62,0x6c,0x6f,0x62) as 'blob'
export const cat      = c(0x63,0x61,0x74) as 'cat'
export const dragon   = c(0x64,0x72,0x61,0x67,0x6f,0x6e) as 'dragon'
export const octopus  = c(0x6f,0x63,0x74,0x6f,0x70,0x75,0x73) as 'octopus'
export const owl      = c(0x6f,0x77,0x6c) as 'owl'
export const penguin  = c(0x70,0x65,0x6e,0x67,0x75,0x69,0x6e) as 'penguin'
export const turtle   = c(0x74,0x75,0x72,0x74,0x6c,0x65) as 'turtle'
export const snail    = c(0x73,0x6e,0x61,0x69,0x6c) as 'snail'
export const ghost    = c(0x67,0x68,0x6f,0x73,0x74) as 'ghost'
export const axolotl  = c(0x61,0x78,0x6f,0x6c,0x6f,0x74,0x6c) as 'axolotl'
export const capybara = c(0x63,0x61,0x70,0x79,0x62,0x61,0x72,0x61) as 'capybara'
export const cactus   = c(0x63,0x61,0x63,0x74,0x75,0x73) as 'cactus'
export const robot    = c(0x72,0x6f,0x62,0x6f,0x74) as 'robot'
export const rabbit   = c(0x72,0x61,0x62,0x62,0x69,0x74) as 'rabbit'
export const mushroom = c(0x6d,0x75,0x73,0x68,0x72,0x6f,0x6f,0x6d) as 'mushroom'
export const chonk    = c(0x63,0x68,0x6f,0x6e,0x6b) as 'chonk'
```

**为什么要这样做?**

Anthropic 的构建流水线中有一个 `excluded-strings.txt` 安全检查,会扫描构建产物中是否
包含内部模型代号(codename)的字面量。某个物种名恰好与一个模型代号冲突("capybara"
即水豚,是一个已知的内部项目代号),如果直接写 `'capybara'`,构建检查会误报。

```
+--------------------------------------------------------------+
|               fromCharCode 编码策略                            |
+--------------------------------------------------------------+
|                                                               |
|  源代码层:   c(0x63,0x61,0x70,0x79,0x62,0x61,0x72,0x61)      |
|                 ↓ (TypeScript 编译)                            |
|  构建产物:   String.fromCharCode(0x63,0x61,...)               |
|                 ↓ (运行时求值)                                 |
|  运行时值:   "capybara"                                       |
|                                                               |
|  excluded-strings.txt 扫描目标: 构建产物中的字面字符串          |
|  结果: 扫描不到 "capybara" 字面量 → 检查通过                   |
|  但: 如果有人真的在代码里写了模型代号 → 检查正常触发            |
+--------------------------------------------------------------+
```

**统一编码**: 注释特别说明,虽然只有一个物种名冲突,但所有物种都使用相同编码方式,
这样做的好处是:
1. 代码风格一致,不会暴露"哪个名字是敏感的"
2. `as 'duck'` 类型断言在编译时擦除,不影响运行时
3. biome-ignore format 注释保持物种列表紧凑

**18 种物种列表:**

| 物种 | 十六进制编码 | 中文 |
|------|------------|------|
| duck | 0x64,0x75,0x63,0x6b | 鸭子 |
| goose | 0x67,0x6f,0x6f,0x73,0x65 | 鹅 |
| blob | 0x62,0x6c,0x6f,0x62 | 团子 |
| cat | 0x63,0x61,0x74 | 猫 |
| dragon | 0x64,0x72,0x61,0x67,0x6f,0x6e | 龙 |
| octopus | 0x6f,0x63,0x74,0x6f,0x70,0x75,0x73 | 章鱼 |
| owl | 0x6f,0x77,0x6c | 猫头鹰 |
| penguin | 0x70,0x65,0x6e,0x67,0x75,0x69,0x6e | 企鹅 |
| turtle | 0x74,0x75,0x72,0x74,0x6c,0x65 | 乌龟 |
| snail | 0x73,0x6e,0x61,0x69,0x6c | 蜗牛 |
| ghost | 0x67,0x68,0x6f,0x73,0x74 | 幽灵 |
| axolotl | 0x61,0x78,0x6f,0x6c,0x6f,0x74,0x6c | 蝾螈 |
| capybara | 0x63,0x61,0x70,0x79,0x62,0x61,0x72,0x61 | 水豚 |
| cactus | 0x63,0x61,0x63,0x74,0x75,0x73 | 仙人掌 |
| robot | 0x72,0x6f,0x62,0x6f,0x74 | 机器人 |
| rabbit | 0x72,0x61,0x62,0x62,0x69,0x74 | 兔子 |
| mushroom | 0x6d,0x75,0x73,0x68,0x72,0x6f,0x6f,0x6d | 蘑菇 |
| chonk | 0x63,0x68,0x6f,0x6e,0x6b | 胖墩 |

## 稀有度系统

文件路径: `src/buddy/types.ts:126-140`, `src/buddy/companion.ts:43-59`

**权重分布** (types.ts:126-132):
```typescript
export const RARITY_WEIGHTS = {
  common:    60,
  uncommon:  25,
  rare:      10,
  epic:       4,
  legendary:  1,
} as const
```

**概率计算:**
- common: 60/100 = 60%
- uncommon: 25/100 = 25%
- rare: 10/100 = 10%
- epic: 4/100 = 4%
- legendary: 1/100 = 1%

**抽取算法** (companion.ts:43-51):
```typescript
function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}
```

经典的加权随机选择: 将 [0,100) 区间按权重切分,PRNG 的随机浮点数落在哪个区间就选中
对应稀有度。

**稀有度视觉表现** (types.ts:134-148):

```
+-----------------------------------------------------------+
|  稀有度    | 星级    | 颜色        | 属性下限  | 帽子    |
+-----------------------------------------------------------+
|  common    | ★      | inactive    | 5        | 无      |
|  uncommon  | ★★     | success     | 15       | 随机    |
|  rare      | ★★★    | permission  | 25       | 随机    |
|  epic      | ★★★★   | autoAccept  | 35       | 随机    |
|  legendary | ★★★★★  | warning     | 50       | 随机    |
+-----------------------------------------------------------+
```

注意: common 稀有度的角色不会有帽子 (`hat: rarity === 'common' ? 'none' : pick(rng, HATS)`,
companion.ts:97)。

## 属性分配算法

文件路径: `src/buddy/companion.ts:53-82`

```typescript
const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50,
}

function rollStats(rng: () => number, rarity: Rarity): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)       // 随机选一个最强属性
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)  // 最弱不能与最强相同

  const stats = {} as Record<StatName, number>
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    } else {
      stats[name] = floor + Math.floor(rng() * 40)
    }
  }
  return stats
}
```

**属性生成策略: "一峰一谷"**

每个角色有 5 个属性: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK。

```
+---------------------------------------------------------------+
|  属性分配公式(以 legendary 为例, floor=50)                     |
+---------------------------------------------------------------+
|                                                                |
|  peak (峰值属性):                                              |
|    value = min(100, 50 + 50 + random(0..29))                   |
|    范围: [100, 100] → 始终满值                                  |
|                                                                |
|  dump (谷底属性):                                              |
|    value = max(1, 50 - 10 + random(0..14))                     |
|    范围: [40, 54]                                              |
|                                                                |
|  其他属性:                                                     |
|    value = 50 + random(0..39)                                  |
|    范围: [50, 89]                                              |
+---------------------------------------------------------------+
|                                                                |
|  以 common 为例 (floor=5):                                     |
|    peak: min(100, 5+50+random(0..29)) = [55, 84]              |
|    dump: max(1, 5-10+random(0..14)) = [1, 9]                  |
|    其他: 5 + random(0..39) = [5, 44]                           |
+---------------------------------------------------------------+
```

这种设计让每个角色都有鲜明个性: 一个突出优势,一个明显短板,其余属性中等。
稀有度越高,属性下限越高,但即使 legendary 也有一个相对弱势的属性。

## Companion 数据模型

文件路径: `src/buddy/types.ts:100-124`

Buddy 系统将角色数据分为两层:

```typescript
// 确定性部分 — 从 hash(userId) 派生
export type CompanionBones = {
  rarity: Rarity
  species: Species
  eye: Eye
  hat: Hat
  shiny: boolean      // 1% 概率闪光
  stats: Record<StatName, number>
}

// 模型生成的灵魂 — 首次孵化时存储到配置
export type CompanionSoul = {
  name: string
  personality: string
}

// 完整角色 = Bones + Soul + 孵化时间
export type Companion = CompanionBones & CompanionSoul & {
  hatchedAt: number
}

// 实际持久化的数据: 只存 Soul + hatchedAt
export type StoredCompanion = CompanionSoul & { hatchedAt: number }
```

```
+---------------------------------------------------------------+
|              Companion 数据分层架构                              |
+---------------------------------------------------------------+
|                                                                |
|  持久化层 (config.companion):                                   |
|  ┌──────────────────────────────┐                              |
|  │  StoredCompanion             │                              |
|  │  ├── name: "Sparky"         │  ← LLM 生成                  |
|  │  ├── personality: "quirky"  │  ← LLM 生成                  |
|  │  └── hatchedAt: 1711929600  │  ← 首次孵化时间戳             |
|  └──────────────────────────────┘                              |
|                                                                |
|  计算层 (每次读取时重新计算):                                    |
|  ┌──────────────────────────────┐                              |
|  │  CompanionBones              │                              |
|  │  ├── rarity: "rare"         │  ← hash(userId) 确定         |
|  │  ├── species: "duck"        │  ← hash(userId) 确定         |
|  │  ├── eye: "✦"               │  ← hash(userId) 确定         |
|  │  ├── hat: "crown"           │  ← hash(userId) 确定         |
|  │  ├── shiny: false           │  ← hash(userId) 确定         |
|  │  └── stats: {...}           │  ← hash(userId) 确定         |
|  └──────────────────────────────┘                              |
|                                                                |
|  合并: { ...stored, ...bones }                                  |
|    bones 后展开,覆盖旧格式配置中的 stale 字段                   |
+---------------------------------------------------------------+
```

## 反作弊机制

文件路径: `src/buddy/companion.ts:124-133`

```typescript
// Regenerate bones from userId, merge with stored soul. Bones never persist
// so species renames and SPECIES-array edits can't break stored companions,
// and editing config.companion can't fake a rarity.
export function getCompanion(): Companion | undefined {
  const stored = getGlobalConfig().companion
  if (!stored) return undefined
  const { bones } = roll(companionUserId())
  // bones last so stale bones fields in old-format configs get overridden
  return { ...stored, ...bones }
}
```

**核心安全设计:**

1. **Bones 永不持久化**: CompanionBones(稀有度、物种等)每次从 userId 重新计算,
   配置文件中只存储 name/personality/hatchedAt。用户无法通过编辑配置文件来伪造稀有度。

2. **展开顺序**: `{ ...stored, ...bones }` — bones 在后,如果旧格式的配置中残留了
   bones 字段(例如旧版本曾经存储了 rarity),它们会被最新计算值覆盖。

3. **userId 来源** (companion.ts:119-122):
   ```typescript
   export function companionUserId(): string {
     const config = getGlobalConfig()
     return config.oauthAccount?.accountUuid ?? config.userID ?? 'anon'
   }
   ```
   优先使用 OAuth 账户 UUID(不可伪造),其次是 userID,最后降级为 'anon'。

4. **SALT 绑定**: SALT = `'friend-2026-401'` 使得即使知道 userId,也无法在不知道
   SALT 的情况下预测生成结果。

5. **Shiny 机制**: `rng() < 0.01` (companion.ts:98) — 1% 概率产生"闪光"变体,
   这是完全由 PRNG 决定的,无法通过任何方式刷出。

## ASCII 精灵渲染系统

文件路径: `src/buddy/sprites.ts`

每个物种有 **3 帧动画**,每帧 **5 行高、12 字符宽**。帧中使用 `{E}` 作为眼睛占位符,
渲染时替换为角色的实际眼睛样式。

**鸭子精灵示例** (sprites.ts:27-49):
```
帧 0 (静止):          帧 1 (摇摆):         帧 2 (伸展):

    __      	    __      	    __
  <(· )___  	  <(· )___  	  <(· )___
   (  ._>   	   (  ._>   	   (  .__>
    `--´    	    `--´~   	    `--´
```

**帽子系统** (sprites.ts:443-452):
```typescript
const HAT_LINES: Record<Hat, string> = {
  none:     '',
  crown:    '   \\^^^/    ',
  tophat:   '   [___]    ',
  propeller:'    -+-     ',
  halo:     '   (   )    ',
  wizard:   '    /^\\     ',
  beanie:   '   (___)    ',
  tinyduck: '    ,>      ',
}
```

**渲染逻辑** (sprites.ts:454-469):
```typescript
export function renderSprite(bones: CompanionBones, frame = 0): string[] {
  const frames = BODIES[bones.species]
  const body = frames[frame % frames.length]!.map(line =>
    line.replaceAll('{E}', bones.eye),   // 替换眼睛
  )
  const lines = [...body]
  // 仅当第0行为空且角色有帽子时渲染帽子
  if (bones.hat !== 'none' && !lines[0]!.trim()) {
    lines[0] = HAT_LINES[bones.hat]
  }
  // 如果所有帧的第0行都是空的且无帽子,删除空行节省空间
  if (!lines[0]!.trim() && frames.every(f => !f[0]!.trim())) lines.shift()
  return lines
}
```

**renderFace 函数** (sprites.ts:475-514): 为窄终端提供单行表情,每个物种有独特表情:

```
duck/goose: (·>        cat:   =·ω·=
dragon:     <·~·>      octopus: ~(··)~
owl:        (·)(·)     penguin: (·>)
ghost:      /··\       capybara: (·oo·)
robot:      [··]       mushroom: |·  ·|
```

## 动画与交互系统

文件路径: `src/buddy/CompanionSprite.tsx`

**时序常量** (CompanionSprite.tsx:16-19):
```typescript
const TICK_MS = 500         // 动画刷新间隔: 500ms
const BUBBLE_SHOW = 20      // 气泡显示时长: 20 ticks = ~10秒
const FADE_WINDOW = 6       // 淡出窗口: 最后~3秒气泡变暗
const PET_BURST_MS = 2500   // 抚摸爱心持续时间: 2.5秒
```

**空闲动画序列** (CompanionSprite.tsx:23):
```typescript
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0]
// 帧0: 静止(大部分时间)
// 帧1: 微动(偶尔)
// 帧2: 摆动(罕见)
// -1:  在帧0上闪烁眼睛(罕见)
```

```
+---------------------------------------------------------------+
|              空闲动画时序 (每格500ms)                            |
+---------------------------------------------------------------+
|                                                                |
|  时间: 0s    1s    2s    3s    4s    5s    6s    7s             |
|  帧:  0 0   0 0   1 0   0 0   -1 0   0 2   0 0   0 ...       |
|        静止      微动      静止     眨眼      摆动     静止     |
|                                                                |
|  反应/抚摸时: tick % frameCount → 快速循环所有帧                 |
+---------------------------------------------------------------+
```

**气泡系统** (SpeechBubble 组件):
- 圆角边框 (`borderStyle: "round"`)
- 宽度固定 34 字符 + 2 padding = 36 字符
- 文本自动换行 (30 字符宽)
- 淡出效果: 最后 3 秒文字变暗
- 两种气泡尾巴方向: right (内联模式) 和 bottom (浮动模式)

**抚摸动画** (CompanionSprite.tsx:26-27):
```typescript
const H = figures.heart
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  '
]
```

爱心从角色上方飘散, 5 帧循环,最后一帧爱心变为小点消散。

**终端宽度适配** (CompanionSprite.tsx:152,167-175,227-241):
```typescript
export const MIN_COLS_FOR_FULL_SPRITE = 100
```
- >= 100 列: 完整 ASCII 精灵 + 气泡
- < 100 列: 单行表情模式 (renderFace + 名字/台词)

## 通知与预告系统

文件路径: `src/buddy/useBuddyNotification.tsx`

**时间窗口控制** (useBuddyNotification.tsx:12-21):
```typescript
// 本地时间判断,非UTC — 跨时区形成24小时滚动波
// 预告窗口: 2026年4月1-7日。之后命令永久可用。
export function isBuddyTeaserWindow(): boolean {
  if ("external" === 'ant') return true  // 内部用户始终可见
  const d = new Date()
  return d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() <= 7
}
export function isBuddyLive(): boolean {
  if ("external" === 'ant') return true
  const d = new Date()
  return d.getFullYear() > 2026 || (d.getFullYear() === 2026 && d.getMonth() >= 3)
}
```

**设计意图** (注释原文翻译):
- 使用本地时间而非 UTC,形成跨时区的 24 小时滚动波
- "持续的 Twitter 热度而非单一 UTC 午夜尖峰,对灵魂生成(soul-gen)负载更温和"
- 预告窗口: 4月1日-7日; 命令永久保留

**彩虹文字** (useBuddyNotification.tsx:22-36):
```typescript
function RainbowText({ text }: { text: string }): React.ReactNode {
  return (
    <>
      {[...text].map((ch, i) => (
        <Text key={i} color={getRainbowColor(i)}>{ch}</Text>
      ))}
    </>
  )
}
```

每个字符用不同的彩虹色渲染 `/buddy` 文字,作为启动预告通知。

**trigger 检测** (useBuddyNotification.tsx:79-97):
```typescript
export function findBuddyTriggerPositions(text: string): Array<{
  start: number; end: number
}> {
  if (!feature('BUDDY')) return []
  const triggers: Array<{ start: number; end: number }> = []
  const re = /\/buddy\b/g
  // ... 找到输入文本中所有 /buddy 出现的位置
}
```

用于在输入框中高亮显示 `/buddy` 触发词。

## 系统提示词集成

文件路径: `src/buddy/prompt.ts`

```typescript
export function companionIntroText(name: string, species: string): string {
  return `# Companion

A small ${species} named ${name} sits beside the user's input box and
occasionally comments in a speech bubble. You're not ${name} — it's a
separate watcher.

When the user addresses ${name} directly (by name), its bubble will answer.
Your job in that moment is to stay out of the way: respond in ONE line or
less, or just answer any part of the message meant for you. Don't explain
that you're not ${name} — they know. Don't narrate what ${name} might say
— the bubble handles that.`
}
```

**关键设计:**
1. 仅在 `feature('BUDDY')` 启用且有 companion 且未静音时注入
2. 通过 `companion_intro` 类型的 attachment 去重,避免重复注入
3. 告诉模型"你不是这个伴侣",避免角色混淆
4. 用户直接称呼伴侣名字时,模型应保持低调

## 数据流总览

```
+------------------------------------------------------------------+
|                    Buddy 完整数据流                                |
+------------------------------------------------------------------+
|                                                                   |
|  1. 用户登录                                                      |
|     config.oauthAccount.accountUuid ──> companionUserId()         |
|                                              |                    |
|  2. 骨架生成                                                      |
|     userId + SALT ──> hashString() ──> mulberry32() ──> rollFrom()|
|     rollFrom() 产出:                                              |
|       ├── CompanionBones (rarity, species, eye, hat, shiny, stats)|
|       └── inspirationSeed (用于名字/性格生成)                      |
|                                              |                    |
|  3. 灵魂注入 (首次孵化)                                           |
|     inspirationSeed + bones ──> LLM 生成 name + personality       |
|     结果存入 config.companion (StoredCompanion)                    |
|                                              |                    |
|  4. 每次显示                                                      |
|     config.companion + roll(userId).bones ──> getCompanion()      |
|     Companion ──> CompanionSprite 组件                             |
|       ├── renderSprite() + 动画序列                                |
|       ├── SpeechBubble (反应文字)                                  |
|       └── renderFace() (窄终端)                                   |
|                                              |                    |
|  5. 每轮对话                                                      |
|     companion ──> companionIntroText() ──> 系统提示词附件          |
+------------------------------------------------------------------+
```

## 亮点发现

### 1. fromCharCode 反泄漏堪称精妙

整个物种列表使用十六进制 `String.fromCharCode` 编码并非过度工程,而是因为 Anthropic
的构建流水线有严格的 `excluded-strings.txt` 检查机制。该机制扫描构建产物中的字面字符串
来防止内部模型代号泄漏。`capybara` (水豚) 恰好与某个内部模型代号冲突。通过运行时
构造字符串,既保证了安全检查对真正的代号泄漏继续有效,又让宠物系统正常工作。
为了不暴露"哪个名字是敏感的",所有 18 个物种统一使用相同编码。

### 2. Bones/Soul 分离是优雅的反作弊设计

将角色的确定性部分(Bones)和可变部分(Soul)分离:
- Bones 永不持久化,每次从 userId 重新计算
- Soul 只包含名字和性格,由 LLM 在首次孵化时生成
- 展开顺序 `{...stored, ...bones}` 确保即使旧配置残留了 bones 字段也会被覆盖
- 用户编辑配置文件无法伪造稀有度、物种或属性

### 3. 时区滚动波策略

预告系统使用本地时间而非 UTC,使得:
- 新西兰用户最先看到(UTC+12/+13)
- 美国西海岸用户最后看到(UTC-7/-8)
- 形成 24+ 小时的滚动社交媒体热度
- 避免所有用户在 UTC 午夜同时涌入,减轻服务器压力

### 4. 500ms 动画 Tick 与三路缓存命中

CompanionSprite 的 500ms tick timer 驱动所有动画。但 `roll()` 函数被三个热路径
频繁调用:精灵 tick (500ms)、每次按键的 PromptInput、每轮对话的 observer。
单条缓存 `rollCache = { key, value }` 完美覆盖了这种场景 — 会话内 userId 不变,
所以始终命中。这种"懒人缓存"比 Map 或 WeakMap 更轻量。

### 5. SALT 中的彩蛋

`SALT = 'friend-2026-401'` 包含三层含义:
- `friend` — 角色定位为用户的"朋友/伙伴"
- `2026` — 发布年份
- `401` — 4月1日(愚人节)

### 6. 1% 闪光概率与 common 无帽子

两个细节增加了收集乐趣:
- `shiny: rng() < 0.01` — 任何稀有度都可能出现 1% 概率的闪光变体
- common 角色固定无帽子,而 uncommon+ 随机分配帽子(包括搞笑的"头顶小鸭子" tinyduck)

### 7. 全屏/内联双模式气泡

气泡系统有两种渲染路径:
- 非全屏: 气泡内联在精灵旁边,输入框缩窄给它让出空间
- 全屏: 气泡通过 `CompanionFloatingBubble` 在独立的浮动层渲染,
  因为底部区域的 `overflowY:hidden` 会裁切绝对定位的覆盖层

这种双轨设计让气泡在任何终端布局下都能正确显示。
