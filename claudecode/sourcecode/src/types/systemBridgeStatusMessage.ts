import type { UUID } from 'crypto'

export type SystemBridgeStatusMessage = {
  type: 'system'
  subtype: 'bridge_status'
  content: string
  url: string
  upgradeNudge?: string
  isMeta: false
  timestamp: string
  uuid: UUID
}
