import type { UUID } from 'crypto'
import type { StopHookInfo } from './stopHookInfo.js'
import type { SystemMessageLevel } from './systemMessageLevel.js'

export type SystemStopHookSummaryMessage = {
  type: 'system'
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason: string | undefined
  hasOutput: boolean
  level: SystemMessageLevel
  timestamp: string
  uuid: UUID
  toolUseID: string | undefined
  hookLabel: string | undefined
  totalDurationMs: number | undefined
}
