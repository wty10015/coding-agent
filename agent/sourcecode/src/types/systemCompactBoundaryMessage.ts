import type { UUID } from 'crypto'
import type { CompactMetadata } from './compactMetadata.js'

export type SystemCompactBoundaryMessage = {
  type: 'system'
  subtype: 'compact_boundary'
  content: string
  isMeta: false
  timestamp: string
  uuid: UUID
  level: 'info'
  compactMetadata: CompactMetadata
  logicalParentUuid?: UUID
}
