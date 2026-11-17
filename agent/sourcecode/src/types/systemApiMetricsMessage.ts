import type { UUID } from 'crypto'

export type SystemApiMetricsMessage = {
  type: 'system'
  subtype: 'api_metrics'
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
  timestamp: string
  uuid: UUID
  isMeta: false
}
