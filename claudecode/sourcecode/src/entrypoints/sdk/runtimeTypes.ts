import type { SerializedMessage } from '../../types/logs.js'
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
