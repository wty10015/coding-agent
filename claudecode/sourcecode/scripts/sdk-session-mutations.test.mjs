import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getSessionInfo, renameSession, tagSession } from '../src/entrypoints/agentSdkTypes.ts'
import { getProjectDir } from '../src/utils/sessionStoragePortable.ts'

const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userUuid = '11111111-1111-4111-8111-111111111111'
const assistantUuid = '22222222-2222-4222-8222-222222222222'

async function createTranscript() {
  const root = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-mutations-'))
  const previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = join(root, 'config')
  const dir = join(root, 'project')
  await mkdir(dir)
  const canonicalDir = await realpath(dir)
  const projectDir = getProjectDir(canonicalDir)
  await mkdir(projectDir, { recursive: true })
  const filePath = join(projectDir, `${sessionId}.jsonl`)
  const entries = [
    {
      type: 'user', uuid: userUuid, parentUuid: null,
      timestamp: '2026-01-01T00:00:00.000Z',
      message: { role: 'user', content: 'mutation fixture' },
    },
    {
      type: 'assistant', uuid: assistantUuid, parentUuid: userUuid,
      timestamp: '2026-01-01T00:01:00.000Z',
      message: { id: 'message-1', role: 'assistant', content: [{ type: 'text', text: 'ready' }] },
    },
  ]
  await Bun.write(filePath, entries.map(entry => JSON.stringify({
    cwd: canonicalDir,
    userType: 'external',
    version: '0.1.0',
    sessionId,
    isSidechain: false,
    ...entry,
  })).join('\n') + '\n')
  return {
    root,
    dir,
    filePath,
    restore: () => {
      if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
      else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
    },
  }
}

test('renameSession and tagSession append metadata for an existing session', async () => {
  const fixture = await createTranscript()
  try {
    await renameSession(sessionId, 'Important session', { dir: fixture.dir })
    await tagSession(sessionId, 'release', { dir: fixture.dir })

    const lines = (await readFile(fixture.filePath, 'utf8')).trim().split('\n').map(JSON.parse)
    expect(lines.at(-2)).toEqual({
      type: 'custom-title', customTitle: 'Important session', sessionId,
    })
    expect(lines.at(-1)).toEqual({ type: 'tag', tag: 'release', sessionId })

    const info = await getSessionInfo(sessionId, { dir: fixture.dir })
    expect(info?.customTitle).toBe('Important session')
    expect(info?.tag).toBe('release')
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('tagSession clears a tag with the existing empty-tag record format', async () => {
  const fixture = await createTranscript()
  try {
    await tagSession(sessionId, 'temporary', { dir: fixture.dir })
    await tagSession(sessionId, null, { dir: fixture.dir })

    const lines = (await readFile(fixture.filePath, 'utf8')).trim().split('\n').map(JSON.parse)
    expect(lines.slice(-2)).toEqual([
      { type: 'tag', tag: 'temporary', sessionId },
      { type: 'tag', tag: '', sessionId },
    ])
    const info = await getSessionInfo(sessionId, { dir: fixture.dir })
    expect(info?.tag).toBeUndefined()
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('session mutations reject invalid, unknown, and invalid runtime inputs before writing', async () => {
  const fixture = await createTranscript()
  try {
    await expect(renameSession('invalid-id', 'title', { dir: fixture.dir })).rejects.toThrow('Invalid session ID')
    await expect(tagSession('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'tag', { dir: fixture.dir })).rejects.toThrow('Session not found')
    await expect(renameSession(sessionId, '', { dir: fixture.dir })).rejects.toThrow('non-empty string')
    await expect(tagSession(sessionId, 42, { dir: fixture.dir })).rejects.toThrow('string or null')
    expect((await readFile(fixture.filePath, 'utf8')).trim().split('\n')).toHaveLength(2)
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})
