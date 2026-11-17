import type { UUID } from 'crypto'

export type SystemLocalCommandMessage = {
  type: 'system'
  subtype: 'local_command'
  content: string
  level: 'info'
  timestamp: string
  uuid: UUID
  isMeta: false
}
