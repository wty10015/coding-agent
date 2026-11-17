import type { UUID } from 'crypto'

export type SystemMemorySavedMessage = {
  type: 'system'
  subtype: 'memory_saved'
  writtenPaths: string[]
  timestamp: string
  uuid: UUID
  isMeta: false
  teamCount?: number
  verb?: string
}
