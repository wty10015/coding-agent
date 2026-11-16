import type { SerializedMessage } from '../../types/logs.js'

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
