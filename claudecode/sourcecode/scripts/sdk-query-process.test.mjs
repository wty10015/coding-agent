import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSdkMcpServer, query, tool } from '../src/entrypoints/agentSdkTypes.ts'
import { z } from 'zod/v4'

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url))
const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

test('query starts the built CLI and completes an Edit turn through the SDK stream', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-query-'))
  const filePath = join(tempRoot, 'created.txt')
  let messageCalls = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const body = request.method === 'POST' ? await request.json() : null
      if (url.pathname.endsWith('/messages/count_tokens')) {
        return Response.json({ input_tokens: 12 })
      }
      if (!url.pathname.endsWith('/messages')) {
        return Response.json({ error: { type: 'not_found_error', message: url.pathname } }, { status: 404 })
      }
      messageCalls += 1
      const toolInput = { file_path: filePath, old_string: '', new_string: 'SDK_QUERY_OK\n' }
      const message = {
        id: `msg_coding_agent_sdk_query_${messageCalls}`,
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 0 },
      }
      const toolCall = messageCalls === 1
      const events = [
        frame('message_start', { type: 'message_start', message }),
        frame('content_block_start', {
          type: 'content_block_start',
          index: 0,
          content_block: toolCall
            ? { type: 'tool_use', id: 'toolu_coding_agent_sdk_query', name: 'Edit', input: {} }
            : { type: 'text', text: '' },
        }),
        frame('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: toolCall
            ? { type: 'input_json_delta', partial_json: JSON.stringify(toolInput) }
            : { type: 'text_delta', text: 'SDK_QUERY_DONE' },
        }),
        frame('content_block_stop', { type: 'content_block_stop', index: 0 }),
        frame('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: toolCall ? 'tool_use' : 'end_turn', stop_sequence: null },
          usage: { output_tokens: 3 },
        }),
        frame('message_stop', { type: 'message_stop' }),
      ]
      return new Response(events.join(''), { headers: { 'content-type': 'text/event-stream' } })
    },
  })

  try {
    const messages = []
    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: 'local-fixture-key',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
      CLAUDE_CONFIG_DIR: join(tempRoot, 'config'),
    }
    const stream = query({
      prompt: 'Create a file through the SDK query',
      options: { cliPath: cli, cwd: tempRoot, env, allowedTools: ['Edit'], maxTurns: 2 },
    })
    for await (const message of stream) messages.push(message)

    const result = messages.findLast(message => message.type === 'result')
    expect(result?.result).toBe('SDK_QUERY_DONE')
    expect(messages.some(message => message.type === 'assistant')).toBe(true)
    expect(messageCalls).toBe(2)
    await expect(readFile(filePath, 'utf8')).resolves.toBe('SDK_QUERY_OK\n')
  } finally {
    server.stop(true)
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('query aborts the child process and closes the stream', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-abort-'))
  let requestStartedResolve
  const requestStarted = new Promise(resolve => {
    requestStartedResolve = resolve
  })
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname.endsWith('/messages/count_tokens')) {
        return Response.json({ input_tokens: 1 })
      }
      requestStartedResolve()
      return new Promise(() => {})
    },
  })

  try {
    const controller = new AbortController()
    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: 'local-fixture-key',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
      CLAUDE_CONFIG_DIR: join(tempRoot, 'config'),
    }
    const stream = query({
      prompt: 'Wait for the abort test',
      options: { cliPath: cli, cwd: tempRoot, env, abortController: controller },
    })
    const consumer = (async () => {
      for await (const _message of stream) {
        // The fixture intentionally never returns a model response.
      }
    })()
    await Promise.race([
      requestStarted,
      new Promise((_, reject) => setTimeout(() => reject(new Error('fixture request timed out')), 15_000)),
    ])
    controller.abort()
    await expect(consumer).resolves.toBeUndefined()
  } finally {
    server.stop(true)
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('query serves SDK MCP tools through the existing control protocol', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'coding-agent-sdk-mcp-'))
  let messageCalls = 0
  let toolCalls = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const body = request.method === 'POST' ? await request.json() : null
      if (url.pathname.endsWith('/messages/count_tokens')) return Response.json({ input_tokens: 12 })
      if (!url.pathname.endsWith('/messages')) return Response.json({ error: { type: 'not_found_error' } }, { status: 404 })
      messageCalls += 1
      const toolCall = messageCalls === 1
      const message = {
        id: `msg_coding_agent_sdk_mcp_${messageCalls}`,
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 0 },
      }
      const events = [
        frame('message_start', { type: 'message_start', message }),
        frame('content_block_start', {
          type: 'content_block_start',
          index: 0,
          content_block: toolCall
            ? { type: 'tool_use', id: 'toolu_coding_agent_sdk_mcp', name: 'mcp__local_tools__greet', input: {} }
            : { type: 'text', text: '' },
        }),
        frame('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: toolCall
            ? { type: 'input_json_delta', partial_json: JSON.stringify({ name: 'Ada' }) }
            : { type: 'text_delta', text: 'MCP_DONE' },
        }),
        frame('content_block_stop', { type: 'content_block_stop', index: 0 }),
        frame('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: toolCall ? 'tool_use' : 'end_turn', stop_sequence: null },
          usage: { output_tokens: 3 },
        }),
        frame('message_stop', { type: 'message_stop' }),
      ]
      return new Response(events.join(''), { headers: { 'content-type': 'text/event-stream' } })
    },
  })

  const greet = tool(
    'greet',
    'Greets a person',
    { name: z.string() },
    async args => {
      toolCalls += 1
      return { content: [{ type: 'text', text: `hello ${args.name}` }] }
    },
  )

  try {
    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: 'local-fixture-key',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
      CLAUDE_CONFIG_DIR: join(tempRoot, 'config'),
    }
    const messages = []
    const stream = query({
      prompt: 'Use the greeting tool',
      options: {
        cliPath: cli,
        cwd: tempRoot,
        env,
        allowedTools: ['mcp__local_tools__greet'],
        maxTurns: 2,
        mcpServers: { local_tools: createSdkMcpServer({ name: 'local_tools', tools: [greet] }) },
      },
    })
    for await (const message of stream) messages.push(message)

    const result = messages.findLast(message => message.type === 'result')
    const init = messages.find(message => message.type === 'system' && message.subtype === 'init')
    expect(result?.result).toBe('MCP_DONE')
    expect(init?.mcp_servers).toEqual([{ name: 'local_tools', status: 'connected' }])
    expect(toolCalls).toBe(1)
    expect(messageCalls).toBe(2)
  } finally {
    server.stop(true)
    await rm(tempRoot, { recursive: true, force: true })
  }
}, 15_000)
