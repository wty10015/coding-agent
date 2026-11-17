import type { UUID } from 'crypto'

export type SystemAwaySummaryMessage = {
  type: 'system'
  subtype: 'away_summary'
  content: string
  timestamp: string
  uuid: UUID
  isMeta: false
}
