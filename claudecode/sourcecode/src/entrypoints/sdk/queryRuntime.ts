import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SDKMessage, SDKUserMessage } from './coreTypes.generated.js'
import type {
  CanUseTool,
  McpSdkServerConfigWithInstance,
  Options,
  PermissionMode,
  Query,
} from './runtimeTypes.js'
import type { SDKControlRequest, SDKControlResponse } from './controlTypes.js'

type PendingControl = {
  resolve: (value: Record<string, unknown>) => void
  reject: (error: Error) => void
}

type QueryParams = {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
}

class AsyncQueue<T> {
  private readonly items: T[] = []
  private readonly waiters: Array<{
    resolve: (result: IteratorResult<T>) => void
    reject: (error: Error) => void
  }> = []
  private closed = false
  private failure: Error | undefined

  push(item: T): void {
    if (this.closed) return
    const waiter = this.waiters.shift()
    if (waiter) waiter.resolve({ value: item, done: false })
    else this.items.push(item)
  }

  close(error?: Error): void {
    if (this.closed) return
    this.closed = true
    this.failure = error
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!
      if (error) waiter.reject(error)
      else waiter.resolve({ value: undefined as never, done: true })
    }
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.items.length > 0) return { value: this.items.shift()!, done: false }
    if (this.failure) throw this.failure
    if (this.closed) return { value: undefined as never, done: true }
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }))
  }
}

const cliPathFromModule = (): string =>
  process.env.CODING_AGENT_CLI_PATH ??
  join(dirname(fileURLToPath(import.meta.url)), '../../dist/cli.js')

const appendFlag = (args: string[], name: string, value: string | number): void => {
  args.push(`--${name}`, String(value))
}

const buildCliArgs = (options: Options): string[] => {
  const args = [
    '--bare',
    '--print',
    '--output-format',
    'stream-json',
    '--verbose',
    '--input-format',
    'stream-json',
  ]
  if (options.continue) args.push('--continue')
  if (options.resume) appendFlag(args, 'resume', options.resume)
  if (options.forkSession) args.push('--fork-session')
  if (options.model) appendFlag(args, 'model', options.model)
  if (options.fallbackModel) appendFlag(args, 'fallback-model', options.fallbackModel)
  if (options.permissionMode) appendFlag(args, 'permission-mode', options.permissionMode)
  if (options.maxTurns !== undefined) appendFlag(args, 'max-turns', options.maxTurns)
  if (options.systemPrompt) appendFlag(args, 'system-prompt', options.systemPrompt)
  if (options.appendSystemPrompt) appendFlag(args, 'append-system-prompt', options.appendSystemPrompt)
  for (const directory of options.additionalDirectories ?? []) appendFlag(args, 'add-dir', directory)
  if (options.includePartialMessages) args.push('--include-partial-messages')
  if (options.allowedTools?.length) args.push(`--allowedTools=${options.allowedTools.join(',')}`)
  if (options.disallowedTools?.length) args.push(`--disallowedTools=${options.disallowedTools.join(',')}`)
  for (const [name, value] of Object.entries(options.extraArgs ?? {})) {
    if (value === null) args.push(`--${name}`)
    else args.push(`--${name}=${value}`)
  }
  return args
}

const toUserMessage = (prompt: string): SDKUserMessage =>
  ({
    type: 'user',
    session_id: '',
    message: { role: 'user', content: prompt },
    parent_tool_use_id: null,
  }) as SDKUserMessage

const writeLine = (child: ChildProcessWithoutNullStreams, value: unknown): void => {
  child.stdin.write(`${JSON.stringify(value)}\n`)
}

const sendControlRequest = (
  child: ChildProcessWithoutNullStreams,
  pending: Map<string, PendingControl>,
  request: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const requestId = randomUUID()
  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    writeLine(child, { type: 'control_request', request_id: requestId, request })
  })
}

const mcpResponse = (id: unknown, result: Record<string, unknown>): Record<string, unknown> => ({
  jsonrpc: '2.0',
  id,
  result,
})

const mcpError = (id: unknown, code: number, message: string): Record<string, unknown> => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

// The CLI control channel expects every mcp_message request to receive a
// JSON-RPC-shaped value, even for MCP notifications that have no response.
// The client transport ignores this placeholder for notifications.
const mcpNotificationAck = (): Record<string, unknown> => mcpResponse(null, {})

const handleMcpMessage = async (
  serverName: string,
  message: unknown,
  servers: Record<string, McpSdkServerConfigWithInstance>,
): Promise<Record<string, unknown> | undefined> => {
  if (!message || typeof message !== 'object') return mcpNotificationAck()
  const request = message as { id?: unknown; method?: string; params?: Record<string, unknown> }
  if (request.id === undefined) return mcpNotificationAck()
  const server = servers[serverName]
  if (!server) return mcpError(request.id, -32001, `Unknown MCP server: ${serverName}`)
  if (request.method === 'initialize') {
    return mcpResponse(request.id, {
      protocolVersion: typeof request.params?.protocolVersion === 'string' ? request.params.protocolVersion : '2024-11-05',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: server.instance.name, version: server.instance.version ?? '0.0.0' },
    })
  }
  if (request.method === 'tools/list') {
    return mcpResponse(request.id, {
      tools: server.instance.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchemaJson,
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      })),
    })
  }
  if (request.method === 'tools/call') {
    const name = request.params?.name
    const args = request.params?.arguments
    const tool = server.instance.tools.find(candidate => candidate.name === name)
    if (!tool) return mcpError(request.id, -32602, `Unknown tool: ${String(name)}`)
    try {
      const parsed = tool.inputSchema.parse(args ?? {})
      return mcpResponse(request.id, await tool.handler(parsed, {}))
    } catch (error) {
      return mcpError(request.id, -32602, error instanceof Error ? error.message : String(error))
    }
  }
  return mcpError(request.id, -32601, `Unsupported MCP method: ${request.method ?? '<missing>'}`)
}

const respondToPermissionRequest = async (
  child: ChildProcessWithoutNullStreams,
  request: SDKControlRequest,
  canUseTool: CanUseTool | undefined,
  signal: AbortSignal,
): Promise<void> => {
  if (request.request.subtype !== 'can_use_tool') return
  const permission = request.request
  const result = canUseTool
    ? await canUseTool(permission.tool_name, permission.input, {
        signal,
        toolUseID: permission.tool_use_id,
        requestId: request.request_id,
        blockedPath: permission.blocked_path,
        decisionReason: permission.decision_reason,
        mcpServer: permission.mcp_server,
      })
    : {
        behavior: 'deny' as const,
        message: 'No canUseTool callback configured',
        toolUseID: permission.tool_use_id,
      }
  if (result === null) return
  writeLine(child, {
    type: 'control_response',
    response: { subtype: 'success', request_id: request.request_id, response: result },
  })
}

const rejectPending = (pending: Map<string, PendingControl>, error: Error): void => {
  for (const entry of pending.values()) entry.reject(error)
  pending.clear()
}

const parseOutputLine = (line: string): unknown => {
  if (!line.trim()) return undefined
  try {
    return JSON.parse(line)
  } catch (error) {
    throw new Error(`CLI emitted invalid stream-json: ${String(error)}`)
  }
}

const createQuery = ({ prompt, options = {} }: QueryParams): Query => {
  const controller = options.abortController ?? new AbortController()
  const child = spawn(process.execPath, [options.cliPath ?? cliPathFromModule(), ...buildCliArgs(options)], {
    cwd: options.cwd,
    env: options.env ? { ...options.env } : process.env,
    stdio: 'pipe',
  })
  const pending = new Map<string, PendingControl>()
  const output = new AsyncQueue<unknown>()
  const keepStdinOpen = Object.keys(options.mcpServers ?? {}).length > 0
  let stderr = ''
  let settled = false

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', chunk => {
    stderr += String(chunk)
  })

  const abort = (): void => {
    if (!settled) child.kill()
  }
  controller.signal.addEventListener('abort', abort, { once: true })

  const processIncoming = async (parsed: unknown): Promise<void> => {
    if (!parsed || typeof parsed !== 'object') return
    const message = parsed as { type?: string }
    if (message.type === 'control_response') {
      const response = parsed as SDKControlResponse
      const pendingRequest = pending.get(response.response.request_id)
      if (!pendingRequest) return
      pending.delete(response.response.request_id)
      if (response.response.subtype === 'error') pendingRequest.reject(new Error(response.response.error))
      else pendingRequest.resolve(response.response.response ?? {})
      return
    }
    if (message.type === 'control_request') {
      const request = parsed as SDKControlRequest
      if (request.request.subtype === 'can_use_tool') {
        await respondToPermissionRequest(child, request, options.canUseTool, controller.signal)
      } else if (request.request.subtype === 'mcp_message') {
        const mcpRequest = request.request
        const response = await handleMcpMessage(mcpRequest.server_name, mcpRequest.message, options.mcpServers ?? {})
        writeLine(child, {
          type: 'control_response',
          response: {
            subtype: 'success',
            request_id: request.request_id,
            response: { mcp_response: response ?? mcpNotificationAck() },
          },
        })
      } else {
        writeLine(child, {
          type: 'control_response',
          response: { subtype: 'error', request_id: request.request_id, error: `Unsupported control request: ${request.request.subtype}` },
        })
      }
      return
    }
    if (message.type === 'control_cancel_request' || message.type === 'keep_alive') return
    output.push(parsed)
    if (keepStdinOpen && message.type === 'result') child.stdin.end()
  }

  const pump = (async (): Promise<void> => {
    let buffer = ''
    try {
      for await (const chunk of child.stdout) {
        buffer += String(chunk)
        for (;;) {
          const newline = buffer.indexOf('\n')
          if (newline < 0) break
          const parsed = parseOutputLine(buffer.slice(0, newline))
          buffer = buffer.slice(newline + 1)
          await processIncoming(parsed)
        }
      }
      if (buffer.trim()) await processIncoming(parseOutputLine(buffer))
      output.close()
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error))
      output.close(failure)
      rejectPending(pending, failure)
    }
  })()

  const writePrompt = async (): Promise<void> => {
    try {
      await sendControlRequest(child, pending, {
        subtype: 'initialize',
        ...(Object.keys(options.mcpServers ?? {}).length > 0
          ? { sdkMcpServers: Object.keys(options.mcpServers) }
          : {}),
        ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
        ...(options.appendSystemPrompt ? { appendSystemPrompt: options.appendSystemPrompt } : {}),
      })
      if (typeof prompt === 'string') writeLine(child, toUserMessage(prompt))
      else for await (const message of prompt) writeLine(child, message)
      if (!keepStdinOpen) child.stdin.end()
    } catch (error) {
      controller.abort(error)
    }
  }
  void writePrompt()

  const generator = (async function* (): AsyncGenerator<SDKMessage, void> {
    try {
      for (;;) {
        const next = await output.next()
        if (next.done) break
        yield next.value as SDKMessage
      }
      const exitCode = await new Promise<number | null>(resolve => {
        if (child.exitCode !== null) resolve(child.exitCode)
        else child.once('close', resolve)
      })
      if (exitCode !== 0 && !controller.signal.aborted) {
        throw new Error(`Coding Agent CLI exited with code ${exitCode}: ${stderr.trim()}`)
      }
    } finally {
      settled = true
      controller.signal.removeEventListener('abort', abort)
      rejectPending(pending, new Error('Query closed before control response'))
      if (!child.killed && child.exitCode === null) child.kill()
      await pump.catch(() => {})
    }
  })()

  const control = (request: Record<string, unknown>): Promise<void> =>
    sendControlRequest(child, pending, request).then(() => undefined)

  return Object.assign(generator, {
    interrupt: () => control({ subtype: 'interrupt' }),
    setPermissionMode: (mode: PermissionMode) => control({ subtype: 'set_permission_mode', mode }),
    setModel: (model?: string) => control({ subtype: 'set_model', ...(model ? { model } : {}) }),
    setMaxThinkingTokens: (maxThinkingTokens: number | null) =>
      control({ subtype: 'set_max_thinking_tokens', max_thinking_tokens: maxThinkingTokens }),
  }) as Query
}

export function queryWithProcess(params: QueryParams): Query {
  return createQuery(params)
}
