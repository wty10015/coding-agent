import type { UUID } from 'crypto'
import type { SystemMessageLevel } from './systemMessageLevel.js'

export type SystemInformationalMessage = {
  type: 'system'
  subtype: 'informational'
  content: string
  isMeta: false
  timestamp: string
  uuid: UUID
  toolUseID?: string
  level: SystemMessageLevel
  preventContinuation?: boolean
}
