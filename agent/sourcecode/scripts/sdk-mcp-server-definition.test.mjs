import { expect, test } from 'bun:test'
import { createSdkMcpServer, tool } from '../src/entrypoints/agentSdkTypes.ts'
import { z } from 'zod/v4'

test('createSdkMcpServer packages tool definitions without mutating the input array', () => {
  const greet = tool(
    'greet',
    'Greets a person',
    { name: z.string() },
    async () => ({ content: [] }),
  )
  const tools = [greet]
  const server = createSdkMcpServer({
    name: 'local-tools',
    version: '1.0.0',
    tools,
  })

  expect(server).toMatchObject({
    type: 'sdk',
    name: 'local-tools',
    instance: {
      name: 'local-tools',
      version: '1.0.0',
      tools: [greet],
    },
  })
  expect(server.instance.tools).not.toBe(tools)
  expect(tools).toEqual([greet])
})

test('createSdkMcpServer keeps an omitted version omitted and defaults tools to an empty list', () => {
  const server = createSdkMcpServer({ name: 'empty-tools' })

  expect(server).toEqual({
    type: 'sdk',
    name: 'empty-tools',
    instance: {
      name: 'empty-tools',
      tools: [],
    },
  })
})
