import { parseSessionInfoFromLite, type SessionInfo } from './listSessionsImpl.js'
import { readSessionLite, resolveSessionFilePath, validateUuid } from './sessionStoragePortable.js'

/** Read one session without enumerating every session in the project. */
export async function getSessionInfoImpl(
  sessionId: string,
  options?: { dir?: string },
): Promise<SessionInfo | undefined> {
  const validId = validateUuid(sessionId)
  if (!validId) return undefined

  const resolved = await resolveSessionFilePath(validId, options?.dir)
  if (!resolved) return undefined

  const lite = await readSessionLite(resolved.filePath)
  if (!lite) return undefined

  return parseSessionInfoFromLite(validId, lite, resolved.projectPath) ?? undefined
}
