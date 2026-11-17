import type { UUID } from 'crypto'

export type SystemTurnDurationMessage = {
  type: 'system'
  subtype: 'turn_duration'
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
  timestamp: string
  uuid: UUID
  isMeta: false
}
