import type { UUID } from 'crypto'

export type SystemPermissionRetryMessage = {
  type: 'system'
  subtype: 'permission_retry'
  content: string
  commands: string[]
  level: 'info'
  isMeta: false
  timestamp: string
  uuid: UUID
}
