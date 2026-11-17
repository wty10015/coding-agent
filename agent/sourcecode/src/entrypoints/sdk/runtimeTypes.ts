import type { SerializedMessage } from '../../types/logs.js'
import type { SDKMessage, SDKUserMessage } from './coreTypes.generated.js'
import type {
  CallToolResult,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod/v4'

/** A Zod object shape accepted by the public tool builder. */
export type AnyZodRawShape = z.ZodRawShape

/** The parsed argument type for a Zod object shape. */
export type InferShape<Schema extends AnyZodRawShape> = z.infer<
  z.ZodObject<Schema>
>

/**
 * The local definition produced by `tool()`.
 *
 * `inputSchema` is retained as a Zod object for handler validation. The
 * JSON-compatible projection is exposed separately for an MCP adapter to
 * publish when it has an established server lifecycle.
 */
export type SdkMcpToolDefinition<
  Schema extends AnyZodRawShape = AnyZodRawShape,
> = {
  name: string
  description: string
  inputSchema: z.ZodObject<Schema>
  inputSchemaJson: Record<string, unknown>
  handler: (
    args: InferShape<Schema>,
    extra: unknown,
  ) => Promise<CallToolResult>
  annotations?: ToolAnnotations
  searchHint?: string
  alwaysLoad?: boolean
}

/**
 * SDK MCP configuration with its in-process definition.
 *
 * The CLI currently consumes the serializable `type`/`name` fields. Keeping
 * the definition attached here makes the boundary explicit without claiming
 * that the query runtime already owns server initialization or cleanup.
 */
export type McpSdkServerConfigWithInstance = {
  type: 'sdk'
  name: string
  instance: {
    name: string
    version?: string
    tools: Array<SdkMcpToolDefinition>
  }
}

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'
export type { ListSessionsOptions } from '../../utils/listSessionsImpl.js'
export type GetSessionInfoOptions = { dir?: string }

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type SessionMutationOptions = { dir?: string }

export type SessionMessage = SerializedMessage

/** Options for creating a fork of an existing transcript. */
export type ForkSessionOptions = {
  dir?: string
  /** Transcript `uuid` to include as the final message in the fork. */
  upToMessageId?: string
  /** Optional title appended to the new transcript. */
  title?: string
}

export type ForkSessionResult = {
  sessionId: string
}

/** Permission modes accepted by the CLI control protocol. */
export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'plan'
  | 'dontAsk'
  | 'auto'

/** Result returned by an SDK host when the CLI asks to use a tool. */
export type PermissionResult =
  | {
      behavior: 'allow'
      updatedInput?: Record<string, unknown>
      updatedPermissions?: unknown[]
      toolUseID?: string
    }
  | {
      behavior: 'deny'
      message: string
      interrupt?: boolean
      toolUseID?: string
    }

/** Minimal permission callback supported by the process-backed query adapter. */
export type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal
    toolUseID: string
    requestId: string
    blockedPath?: string
    decisionReason?: string
    mcpServer?: { name: string; source: string }
  },
) => Promise<PermissionResult | null>

/**
 * Options mapped to the existing `--print` stream protocol.
 *
 * The adapter intentionally keeps this surface small: every option here is
 * backed by an existing CLI flag or environment boundary in the repository.
 */
export type Options = {
  abortController?: AbortController
  allowedTools?: string[]
  disallowedTools?: string[]
  canUseTool?: CanUseTool
  continue?: boolean
  cwd?: string
  env?: Record<string, string | undefined>
  fallbackModel?: string
  forkSession?: boolean
  maxTurns?: number
  model?: string
  permissionMode?: PermissionMode
  resume?: string
  systemPrompt?: string
  appendSystemPrompt?: string
  additionalDirectories?: string[]
  includePartialMessages?: boolean
  cliPath?: string
  extraArgs?: Record<string, string | null>
  mcpServers?: Record<string, McpSdkServerConfigWithInstance>
}

/** Internal overloads currently share the public process-backed contract. */
export type InternalOptions = Options

/** Query control methods supported by the existing CLI control protocol. */
export interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>
  setPermissionMode(mode: PermissionMode): Promise<void>
  setModel(model?: string): Promise<void>
  setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>
}

export type InternalQuery = Query

/** Placeholder V2 session types remain explicit until a session lifecycle is evidenced. */
export type SDKSessionOptions = Options

export interface SDKSession {
  readonly sessionId: string
  close(): Promise<void>
  send(message: string | SDKUserMessage): Promise<void>
}
