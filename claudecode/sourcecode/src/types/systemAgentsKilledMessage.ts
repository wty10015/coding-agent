import type { UUID } from 'crypto'

export type SystemAgentsKilledMessage = {
  type: 'system'
  subtype: 'agents_killed'
  timestamp: string
  uuid: UUID
  isMeta: false
}
