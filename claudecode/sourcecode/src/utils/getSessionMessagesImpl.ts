import {
  buildConversationChain,
  loadTranscriptFile,
  removeExtraFields,
} from './sessionStorage.js'
import { resolveSessionFilePath, validateUuid } from './sessionStoragePortable.js'
import type { TranscriptMessage } from '../types/logs.js'
import type {
  GetSessionMessagesOptions,
  SessionMessage,
} from '../entrypoints/sdk/runtimeTypes.js'

/** Read the latest user/assistant conversation chain from a session transcript. */
export async function getSessionMessagesImpl(
  sessionId: string,
  options?: GetSessionMessagesOptions,
): Promise<SessionMessage[]> {
  const validId = validateUuid(sessionId)
  if (!validId) return []

  const resolved = await resolveSessionFilePath(validId, options?.dir)
  if (!resolved) return []

  const { messages, leafUuids } = await loadTranscriptFile(resolved.filePath)
  let latestLeaf: TranscriptMessage | undefined
  let latestTimestamp = -Infinity
  for (const message of messages.values()) {
    if (
      !leafUuids.has(message.uuid) ||
      (message.type !== 'user' && message.type !== 'assistant')
    ) {
      continue
    }
    const timestamp = Date.parse(message.timestamp)
    if (timestamp > latestTimestamp) {
      latestLeaf = message
      latestTimestamp = timestamp
    }
  }
  if (!latestLeaf) return []

  const conversation = removeExtraFields(
    buildConversationChain(messages, latestLeaf),
  ).filter(
    message =>
      message.type === 'user' ||
      message.type === 'assistant' ||
      (options?.includeSystemMessages && message.type === 'system'),
  )

  const offset =
    typeof options?.offset === 'number' &&
    Number.isFinite(options.offset) &&
    options.offset > 0
      ? Math.floor(options.offset)
      : 0
  const limit =
    typeof options?.limit === 'number' &&
    Number.isFinite(options.limit) &&
    options.limit > 0
      ? Math.floor(options.limit)
      : 0

  return limit > 0
    ? conversation.slice(offset, offset + limit)
    : conversation.slice(offset)
}
