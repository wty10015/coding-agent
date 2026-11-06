import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getSessionMessages } from '../src/entrypoints/agentSdkTypes.ts'
import { getProjectDir } from '../src/utils/sessionStoragePortable.ts'

const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

async function createTranscript(entries) {
  const root = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-messages-'))
  const previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = join(root, 'config')
  const dir = join(root, 'project')
  await mkdir(dir)
  const canonicalDir = await realpath(dir)
  const projectDir = getProjectDir(canonicalDir)
  await mkdir(projectDir, { recursive: true })
  await writeFile(
    join(projectDir, `${sessionId}.jsonl`),
    entries.map(entry => JSON.stringify({
      cwd: canonicalDir,
      userType: 'external',
      version: '0.1.0',
      sessionId,
      isSidechain: false,
      ...entry,
    })).join('\n') + '\n',
  )
  return {
    root,
    dir,
    restore: () => {
      if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
      else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
    },
  }
}

const transcript = [
  {
    type: 'user', uuid: '11111111-1111-4111-8111-111111111111', parentUuid: null,
    timestamp: '2026-01-01T00:00:00.000Z', message: { role: 'user', content: 'first' },
  },
  {
    type: 'system', subtype: 'informational', uuid: '22222222-2222-4222-8222-222222222222',
    parentUuid: '11111111-1111-4111-8111-111111111111', timestamp: '2026-01-01T00:01:00.000Z',
    content: 'checkpoint', level: 'info',
  },
  {
    type: 'assistant', uuid: '33333333-3333-4333-8333-333333333333',
    parentUuid: '22222222-2222-4222-8222-222222222222', timestamp: '2026-01-01T00:02:00.000Z',
    message: { id: 'message-1', role: 'assistant', content: [{ type: 'text', text: 'answer' }] },
  },
  {
    type: 'user', uuid: '44444444-4444-4444-8444-444444444444',
    parentUuid: '33333333-3333-4333-8333-333333333333', timestamp: '2026-01-01T00:03:00.000Z',
    message: { role: 'user', content: 'follow-up' },
  },
  {
    type: 'assistant', uuid: '55555555-5555-4555-8555-555555555555',
    parentUuid: '44444444-4444-4444-8444-444444444444', timestamp: '2026-01-01T00:04:00.000Z',
    message: { id: 'message-2', role: 'assistant', content: [{ type: 'text', text: 'latest' }] },
  },
  {
    type: 'assistant', uuid: '66666666-6666-4666-8666-666666666666',
    parentUuid: '11111111-1111-4111-8111-111111111111', timestamp: '2026-01-01T00:00:30.000Z',
    message: { id: 'old-branch', role: 'assistant', content: [{ type: 'text', text: 'older branch' }] },
  },
]

test('getSessionMessages returns the latest conversation chain without system messages by default', async () => {
  const fixture = await createTranscript(transcript)
  try {
    const messages = await getSessionMessages(sessionId, { dir: fixture.dir })
    expect(messages.map(message => message.uuid)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555',
    ])
    expect(messages.map(message => message.timestamp)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:02:00.000Z',
      '2026-01-01T00:03:00.000Z',
      '2026-01-01T00:04:00.000Z',
    ])
    expect(messages.some(message => 'parentUuid' in message)).toBe(false)
    expect(messages.some(message => 'isSidechain' in message)).toBe(false)
    expect(await getSessionMessages(sessionId)).toEqual(messages)
    expect(await getSessionMessages(sessionId, { dir: fixture.dir, limit: 0 })).toEqual(messages)
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('getSessionMessages includes system messages and applies limit and offset after chain reconstruction', async () => {
  const fixture = await createTranscript(transcript)
  try {
    const messages = await getSessionMessages(sessionId, {
      dir: fixture.dir,
      includeSystemMessages: true,
      limit: 2,
      offset: 1,
    })
    expect(messages.map(message => message.type)).toEqual(['system', 'assistant'])
    expect(messages.map(message => message.uuid)).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ])
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('getSessionMessages returns an empty array for invalid and unknown session IDs', async () => {
  const fixture = await createTranscript(transcript)
  try {
    expect(await getSessionMessages('invalid-id', { dir: fixture.dir })).toEqual([])
    expect(await getSessionMessages('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { dir: fixture.dir })).toEqual([])
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})
