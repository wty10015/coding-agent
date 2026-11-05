import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, realpath, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getSessionInfo, listSessions } from '../src/entrypoints/agentSdkTypes.ts'
import { getProjectDir } from '../src/utils/sessionStoragePortable.ts'

test('public SDK listSessions reads, sorts, and pages project sessions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-list-'))
  const previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  try {
    process.env.CLAUDE_CONFIG_DIR = join(root, 'config')
    const dir = join(root, 'project')
    await mkdir(dir)
    const canonicalDir = await realpath(dir)
    const projectDir = getProjectDir(canonicalDir)
    await mkdir(projectDir, { recursive: true })

    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]
    for (const [index, sessionId] of ids.entries()) {
      const path = join(projectDir, `${sessionId}.jsonl`)
      const entry = {
        type: 'user',
        uuid: sessionId,
        timestamp: `2026-01-0${index + 1}T00:00:00.000Z`,
        cwd: canonicalDir,
        message: { role: 'user', content: `Prompt ${index + 1}` },
      }
      await writeFile(path, `${JSON.stringify(entry)}\n`)
      const modified = new Date(`2026-01-0${index + 1}T12:00:00.000Z`)
      await utimes(path, modified, modified)
    }
    const sidechainId = '33333333-3333-4333-8333-333333333333'
    await writeFile(
      join(projectDir, `${sidechainId}.jsonl`),
      `${JSON.stringify({ type: 'user', isSidechain: true, message: { content: 'Hidden' } })}\n`,
    )

    const firstPage = await listSessions({ dir, includeWorktrees: false, limit: 1 })
    const secondPage = await listSessions({ dir, includeWorktrees: false, limit: 1, offset: 1 })
    expect(firstPage.map(session => session.sessionId)).toEqual([ids[1]])
    expect(secondPage.map(session => session.sessionId)).toEqual([ids[0]])
    expect(firstPage[0]?.summary).toBe('Prompt 2')
    expect(firstPage[0]?.cwd).toBe(canonicalDir)
    expect(firstPage[0]?.fileSize).toBeGreaterThan(0)
    expect((await listSessions({ dir, includeWorktrees: false })).length).toBe(2)
    expect((await listSessions()).length).toBe(2)
    expect(await listSessions({ dir: join(root, 'missing'), includeWorktrees: false })).toEqual([])
    expect((await getSessionInfo(ids[0], { dir }))?.summary).toBe('Prompt 1')
    expect((await getSessionInfo(ids[1], { dir }))?.sessionId).toBe(ids[1])
    expect((await getSessionInfo(ids[1]))?.summary).toBe('Prompt 2')
    expect(await getSessionInfo('invalid-id', { dir })).toBeUndefined()
    expect(await getSessionInfo(sidechainId, { dir })).toBeUndefined()
  } finally {
    if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
    await rm(root, { recursive: true, force: true })
  }
})
