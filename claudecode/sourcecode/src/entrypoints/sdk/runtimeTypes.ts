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
