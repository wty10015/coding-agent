import type { APIError } from '@anthropic-ai/sdk'
import type { UUID } from 'crypto'

export type SystemAPIErrorMessage = {
  type: 'system'
  subtype: 'api_error'
  level: 'error'
  cause?: Error
  error: APIError
  retryInMs: number
  retryAttempt: number
  maxRetries: number
  timestamp: string
  uuid: UUID
}
