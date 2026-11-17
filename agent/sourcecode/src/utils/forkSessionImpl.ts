import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { resolveSessionFilePath, validateUuid } from './sessionStoragePortable.js'

export type ForkSessionOptions = {
  dir?: string
  upToMessageId?: string
  title?: string
}

export type ForkSessionResult = { sessionId: string }

type JsonEntry = {
  type?: unknown
  uuid?: unknown
  parentUuid?: unknown
  sessionId?: unknown
  isSidechain?: unknown
  agentId?: unknown
  replacements?: unknown
  [key: string]: unknown
}

function isTranscriptEntry(entry: JsonEntry): boolean {
  return (
    (entry.type === 'user' ||
      entry.type === 'assistant' ||
      entry.type === 'attachment' ||
      entry.type === 'system') &&
    typeof entry.uuid === 'string' &&
    entry.isSidechain !== true
  )
}

function parseJsonLines(content: string): JsonEntry[] {
  const entries: JsonEntry[] = []
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        entries.push(parsed as JsonEntry)
      }
    } catch {
      // Match the transcript reader: ignore an incomplete/corrupt line.
    }
  }
  return entries
}

/**
 * Fork a persisted transcript using the same UUID/parent-chain rules as the
 * interactive branch command. The public API uses transcript UUIDs for its
 * `upToMessageId` boundary, as confirmed by the resume loader.
 */
export async function forkSessionImpl(
  sessionId: string,
  options: ForkSessionOptions = {},
): Promise<ForkSessionResult> {
  const sourceId = validateUuid(sessionId)
  if (!sourceId) throw new Error('Invalid session ID')
  if (
    options.upToMessageId !== undefined &&
    (typeof options.upToMessageId !== 'string' || !options.upToMessageId)
  ) {
    throw new Error('upToMessageId must be a non-empty string')
  }
  if (options.title !== undefined && typeof options.title !== 'string') {
    throw new Error('title must be a string')
  }

  const resolved = await resolveSessionFilePath(sourceId, options.dir)
  if (!resolved) throw new Error('Session not found')

  const sourceEntries = parseJsonLines(await readFile(resolved.filePath, 'utf8'))
  const messages = sourceEntries.filter(isTranscriptEntry)
  if (messages.length === 0) throw new Error('No messages to fork')

  let selected = messages
  if (options.upToMessageId) {
    const boundary = messages.findIndex(
      entry => entry.uuid === options.upToMessageId,
    )
    if (boundary < 0) {
      throw new Error(`No message found with message.uuid of: ${options.upToMessageId}`)
    }
    selected = messages.slice(0, boundary + 1)
  }

  const forkId = randomUUID()
  const forkPath = join(dirname(resolved.filePath), `${forkId}.jsonl`)
  await mkdir(dirname(forkPath), { recursive: true, mode: 0o700 })

  let parentUuid: string | null = null
  const lines: string[] = []
  for (const entry of selected) {
    const uuid = randomUUID()
    const forkedEntry: JsonEntry = {
      ...entry,
      uuid,
      sessionId: forkId,
      parentUuid,
      isSidechain: false,
      forkedFrom: { sessionId: sourceId, messageUuid: entry.uuid },
    }
    lines.push(JSON.stringify(forkedEntry))
    parentUuid = uuid
  }

  const replacementEntries = sourceEntries.filter(
    entry =>
      entry.type === 'content-replacement' &&
      entry.sessionId === sourceId &&
      Array.isArray(entry.replacements),
  )
  if (replacementEntries.length > 0) {
    const replacements = replacementEntries.flatMap(entry => entry.replacements as unknown[])
    lines.push(
      JSON.stringify({
        type: 'content-replacement',
        sessionId: forkId,
        replacements,
      }),
    )
  }

  if (options.title !== undefined && options.title.length > 0) {
    lines.push(
      JSON.stringify({
        type: 'custom-title',
        sessionId: forkId,
        customTitle: options.title,
      }),
    )
  }

  await writeFile(forkPath, `${lines.join('\n')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  })
  return { sessionId: forkId }
}
