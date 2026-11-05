import type { UUID } from 'crypto'

export type SystemScheduledTaskFireMessage = {
  type: 'system'
  subtype: 'scheduled_task_fire'
  content: string
  isMeta: false
  timestamp: string
  uuid: UUID
}
