# SDK scheduled tasks 验证记录

## 我的实现范围

我依据现有 `src/utils/cronScheduler.ts`、`cronTasks.ts` 和 `cronTasksLock.ts` 的生产实现恢复了公开 `watchScheduledTasks()` 包装器。入口使用显式 `dir`，因此复用已有的：

- 每项目 scheduler lock 和进程存活检查；
- `scheduled_tasks.json` 读取、监听、错过任务删除和 recurring 重排；
- 抖动后的下一次触发时间计算；
- `fire` / `missed` 回调语义。

公开包装器只增加一层可取消异步事件队列。`AbortSignal` 触发时会停止 scheduler、关闭文件监听并唤醒等待中的事件迭代器；没有复制调度算法，也没有把任务直接送入模型调用链。

## 验证结果

```text
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-scheduled
2 pass
0 fail
6 expect() calls
```

隔离夹具覆盖：

- 初始加载时 missed one-shot 事件及磁盘任务删除；
- `getNextFireTime()` 复用现有 1 秒检查周期后的结果；
- abort 后事件流结束；
- missed 通知文本和代码围栏保留。

本轮不证明公开 `query()` 的进程启动、MCP server 实例注册、工具请求关联、真实模型调用或 V2 session 生命周期。

## 可复核命令

```powershell
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-scheduled
```
