import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { forkSession } from '../src/entrypoints/agentSdkTypes.ts'
import { getProjectDir } from '../src/utils/sessionStoragePortable.ts'

const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userUuid = '11111111-1111-4111-8111-111111111111'
const systemUuid = '22222222-2222-4222-8222-222222222222'
const assistantUuid = '33333333-3333-4333-8333-333333333333'
const followUpUuid = '44444444-4444-4444-8444-444444444444'

async function createTranscript() {
  const root = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-fork-'))
  const previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = join(root, 'config')
  const dir = join(root, 'project')
  await mkdir(dir)
  const canonicalDir = await realpath(dir)
  const projectDir = getProjectDir(canonicalDir)
  await mkdir(projectDir, { recursive: true })
  const entries = [
    { type: 'user', uuid: userUuid, parentUuid: null, message: { role: 'user', content: 'first' } },
    { type: 'system', uuid: systemUuid, parentUuid: userUuid, subtype: 'informational', content: 'checkpoint' },
    { type: 'assistant', uuid: assistantUuid, parentUuid: systemUuid, message: { id: 'message-1', role: 'assistant', content: [{ type: 'text', text: 'answer' }] } },
    { type: 'user', uuid: followUpUuid, parentUuid: assistantUuid, message: { role: 'user', content: 'follow-up' } },
    { type: 'content-replacement', sessionId, replacements: [{ toolUseID: 'tool-1', contentHash: 'hash-1' }] },
  ].map(entry => ({
    cwd: canonicalDir,
    userType: 'external',
    version: '0.1.0',
    sessionId,
    isSidechain: false,
    ...entry,
  }))
  const sourcePath = join(projectDir, `${sessionId}.jsonl`)
  await writeFile(sourcePath, entries.map(entry => JSON.stringify(entry)).join('\n') + '\n')
  return {
    root,
    dir,
    projectDir,
    restore: () => {
      if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
      else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
    },
  }
}

test('forkSession remaps transcript UUIDs, preserves the chain, and truncates at a UUID', async () => {
  const fixture = await createTranscript()
  try {
    const result = await forkSession(sessionId, {
      dir: fixture.dir,
      upToMessageId: assistantUuid,
      title: 'Forked session',
    })
    const forkPath = join(fixture.projectDir, `${result.sessionId}.jsonl`)
    const entries = (await readFile(forkPath, 'utf8')).trim().split('\n').map(JSON.parse)
    const messages = entries.filter(entry => ['user', 'system', 'assistant'].includes(entry.type))

    expect(messages).toHaveLength(3)
    expect(messages.map(entry => entry.uuid)).not.toEqual([userUuid, systemUuid, assistantUuid])
    expect(messages.map(entry => entry.parentUuid)).toEqual([null, messages[0].uuid, messages[1].uuid])
    expect(messages.every(entry => entry.sessionId === result.sessionId)).toBe(true)
    expect(messages.map(entry => entry.forkedFrom.messageUuid)).toEqual([userUuid, systemUuid, assistantUuid])
    expect(entries.at(-2)).toEqual({
      type: 'content-replacement',
      sessionId: result.sessionId,
      replacements: [{ toolUseID: 'tool-1', contentHash: 'hash-1' }],
    })
    expect(entries.at(-1)).toEqual({
      type: 'custom-title',
      sessionId: result.sessionId,
      customTitle: 'Forked session',
    })
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('forkSession rejects an unknown UUID boundary without writing a fork', async () => {
  const fixture = await createTranscript()
  try {
    await expect(
      forkSession(sessionId, { dir: fixture.dir, upToMessageId: 'missing' }),
    ).rejects.toThrow('No message found with message.uuid')
  } finally {
    fixture.restore()
    await rm(fixture.root, { recursive: true, force: true })
  }
})
