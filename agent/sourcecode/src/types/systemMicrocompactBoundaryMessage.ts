import type { UUID } from 'crypto'

export type SystemMicrocompactBoundaryMessage = {
  type: 'system'
  subtype: 'microcompact_boundary'
  content: string
  isMeta: false
  timestamp: string
  uuid: UUID
  level: 'info'
  microcompactMetadata: {
    trigger: 'auto'
    preTokens: number
    tokensSaved: number
    compactedToolIds: string[]
    clearedAttachmentUUIDs: string[]
  }
}
