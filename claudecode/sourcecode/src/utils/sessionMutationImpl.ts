import type { UUID } from 'crypto'
import { saveCustomTitle, saveTag } from './sessionStorage.js'
import {
  resolveSessionFilePath,
  validateUuid,
} from './sessionStoragePortable.js'
import type { SessionMutationOptions } from '../entrypoints/sdk/runtimeTypes.js'

type ResolvedSession = {
  sessionId: UUID
  filePath: string
}

async function resolveMutableSession(
  sessionId: string,
  dir: string | undefined,
): Promise<ResolvedSession> {
  const validId = validateUuid(sessionId)
  if (!validId) throw new Error('Invalid session ID')

  const resolved = await resolveSessionFilePath(validId, dir)
  if (!resolved) throw new Error('Session not found')

  return { sessionId: validId, filePath: resolved.filePath }
}

export async function renameSessionImpl(
  sessionId: string,
  title: string,
  options?: SessionMutationOptions,
): Promise<void> {
  if (typeof title !== 'string' || title.length === 0) {
    throw new TypeError('Session title must be a non-empty string')
  }

  const resolved = await resolveMutableSession(sessionId, options?.dir)
  await saveCustomTitle(resolved.sessionId, title, resolved.filePath)
}

export async function tagSessionImpl(
  sessionId: string,
  tag: string | null,
  options?: SessionMutationOptions,
): Promise<void> {
  if (tag !== null && typeof tag !== 'string') {
    throw new TypeError('Session tag must be a string or null')
  }

  const resolved = await resolveMutableSession(sessionId, options?.dir)
  await saveTag(resolved.sessionId, tag ?? '', resolved.filePath)
}
