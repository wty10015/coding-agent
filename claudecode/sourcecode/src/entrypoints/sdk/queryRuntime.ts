import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SDKMessage, SDKUserMessage } from './coreTypes.generated.js'
import type {
  CanUseTool,
  Options,
  PermissionMode,
  Query,
} from './runtimeTypes.js'
import type {
  SDKControlRequest,
  SDKControlResponse,
} from './controlTypes.js'

type PendingControl = {
  resolve: (value: Record<string, unknown>) => void
  reject: (error: Error) => void
}

type QueryParams = {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
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
  for (const directory of options.additionalDirectories ?? []) {
    appendFlag(args, 'add-dir', directory)
  }
  if (options.includePartialMessages) args.push('--include-partial-messages')
  if (options.allowedTools?.length) args.push(`--allowedTools=${options.allowedTools.join(',')}`)
  if (options.disallowedTools?.length) {
    args.push(`--disallowedTools=${options.disallowedTools.join(',')}`)
  }
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

const writeLine = (
  child: ChildProcessWithoutNullStreams,
  value: unknown,
): void => {
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

const respondToPermissionRequest = async (
  child: ChildProcessWithoutNullStreams,
  request: SDKControlRequest,
  canUseTool: CanUseTool | undefined,
  signal: AbortSignal,
): Promise<void> => {
  if (request.request.subtype !== 'can_use_tool') return
  const permission = request.request
  let result = canUseTool
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
    response: {
      subtype: 'success',
      request_id: request.request_id,
      response: result,
    },
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
  let stderr = ''
  let settled = false

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', chunk => {
    stderr += String(chunk)
  })

  const abort = (): void => {
    if (settled) return
    child.kill()
  }
  controller.signal.addEventListener('abort', abort, { once: true })

  const writePrompt = async (): Promise<void> => {
    try {
      if (typeof prompt === 'string') {
        writeLine(child, toUserMessage(prompt))
      } else {
        for await (const message of prompt) writeLine(child, message)
      }
      child.stdin.end()
    } catch (error) {
      controller.abort(error)
    }
  }
  void writePrompt()

  const generator = (async function* (): AsyncGenerator<SDKMessage, void> {
    let buffer = ''
    try {
      for await (const chunk of child.stdout) {
        buffer += String(chunk)
        for (;;) {
          const newline = buffer.indexOf('\n')
          if (newline < 0) break
          const parsed = parseOutputLine(buffer.slice(0, newline))
          buffer = buffer.slice(newline + 1)
          if (!parsed || typeof parsed !== 'object') continue
          const message = parsed as { type?: string }
          if (message.type === 'control_response') {
            const response = parsed as SDKControlResponse
            const pendingRequest = pending.get(response.response.request_id)
            if (!pendingRequest) continue
            pending.delete(response.response.request_id)
            if (response.response.subtype === 'error') {
              pendingRequest.reject(new Error(response.response.error))
            } else {
              pendingRequest.resolve(response.response.response ?? {})
            }
            continue
          }
          if (message.type === 'control_request') {
            await respondToPermissionRequest(
              child,
              parsed as SDKControlRequest,
              options.canUseTool,
              controller.signal,
            )
            continue
          }
          if (message.type === 'control_cancel_request' || message.type === 'keep_alive') {
            continue
          }
          yield parsed as SDKMessage
        }
      }
      if (buffer.trim()) yield parseOutputLine(buffer) as SDKMessage
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
    }
  })()

  const control = (request: Record<string, unknown>): Promise<void> =>
    sendControlRequest(child, pending, request).then(() => undefined)

  return Object.assign(generator, {
    interrupt: () => control({ subtype: 'interrupt' }),
    setPermissionMode: (mode: PermissionMode) =>
      control({ subtype: 'set_permission_mode', mode }),
    setModel: (model?: string) => control({ subtype: 'set_model', ...(model ? { model } : {}) }),
    setMaxThinkingTokens: (maxThinkingTokens: number | null) =>
      control({ subtype: 'set_max_thinking_tokens', max_thinking_tokens: maxThinkingTokens }),
  }) as Query
}

export function queryWithProcess(params: QueryParams): Query {
  return createQuery(params)
}
