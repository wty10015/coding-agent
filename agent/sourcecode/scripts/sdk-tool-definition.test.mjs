import { expect, test } from 'bun:test'
import { tool } from '../src/entrypoints/agentSdkTypes.ts'
import { z } from 'zod/v4'

test('tool builds a reusable Zod schema and JSON Schema projection', async () => {
  const handler = async args => ({
    content: [{ type: 'text', text: `hello ${args.name}` }],
  })
  const definition = tool(
    'greet',
    'Greets a person',
    { name: z.string().describe('Person to greet') },
    handler,
    {
      searchHint: 'greeting',
      alwaysLoad: true,
      annotations: { readOnlyHint: true },
    },
  )

  expect(definition.name).toBe('greet')
  expect(definition.description).toBe('Greets a person')
  expect(definition.handler).toBe(handler)
  expect(definition.inputSchema.parse({ name: 'Ada' })).toEqual({ name: 'Ada' })
  expect(definition.inputSchemaJson).toMatchObject({
    type: 'object',
    properties: { name: { type: 'string', description: 'Person to greet' } },
    required: ['name'],
  })
  expect(definition.searchHint).toBe('greeting')
  expect(definition.alwaysLoad).toBe(true)
  expect(definition.annotations).toEqual({ readOnlyHint: true })
  await expect(definition.handler({ name: 'Ada' }, {})).resolves.toEqual({
    content: [{ type: 'text', text: 'hello Ada' }],
  })
})

test('tool preserves optional schema fields in the generated projection', () => {
  const definition = tool(
    'lookup',
    'Looks up an item',
    {
      id: z.string(),
      includeDetails: z.boolean().optional(),
    },
    async () => ({ content: [] }),
  )

  expect(definition.inputSchemaJson).toMatchObject({
    type: 'object',
    properties: {
      id: { type: 'string' },
      includeDetails: { type: 'boolean' },
    },
    required: ['id'],
  })
})
