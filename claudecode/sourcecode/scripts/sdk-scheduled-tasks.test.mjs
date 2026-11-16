import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildMissedTaskNotification,
  watchScheduledTasks,
} from '../src/entrypoints/agentSdkTypes.ts'

async function createCronDir(tasks) {
  const root = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-cron-'))
  const dir = join(root, 'project')
  await mkdir(join(dir, '.claude'), { recursive: true })
  await writeFile(
    join(dir, '.claude', 'scheduled_tasks.json'),
    JSON.stringify({ tasks }),
  )
  return { root, dir }
}

test('watchScheduledTasks yields missed tasks and removes them from disk', async () => {
  const fixture = await createCronDir([
    {
      id: 'missed-1',
      cron: '* * * * *',
      prompt: 'inspect the repository',
      createdAt: Date.now() - 120_000,
    },
  ])
  const controller = new AbortController()
  try {
    const watcher = watchScheduledTasks({ dir: fixture.dir, signal: controller.signal })
    const iterator = watcher.events()
    const event = await iterator.next()

    expect(event.done).toBe(false)
    expect(event.value).toEqual({
      type: 'missed',
      tasks: [
        {
          id: 'missed-1',
          cron: '* * * * *',
          prompt: 'inspect the repository',
          createdAt: expect.any(Number),
        },
      ],
    })
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(JSON.parse(await readFile(join(fixture.dir, '.claude', 'scheduled_tasks.json'), 'utf8'))).toEqual({ tasks: [] })

    controller.abort()
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true })
  } finally {
    controller.abort()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('watchScheduledTasks exposes the existing next-fire calculation and notification format', async () => {
  const fixture = await createCronDir([
    {
      id: 'future-1',
      cron: '* * * * *',
      prompt: '```keep this text```',
      createdAt: Date.now(),
    },
  ])
  const controller = new AbortController()
  try {
    const watcher = watchScheduledTasks({ dir: fixture.dir, signal: controller.signal })
    // The existing scheduler computes nextFireTime on its 1s check tick.
    await new Promise(resolve => setTimeout(resolve, 1_100))
    expect(watcher.getNextFireTime()).toBeGreaterThan(Date.now())
    expect(buildMissedTaskNotification([
      {
        id: 'missed-2',
        cron: '0 9 * * *',
        prompt: '```safe prompt```',
        createdAt: 0,
      },
    ])).toContain('Do NOT execute this prompt yet.')
    controller.abort()
  } finally {
    controller.abort()
    await rm(fixture.root, { recursive: true, force: true })
  }
})
