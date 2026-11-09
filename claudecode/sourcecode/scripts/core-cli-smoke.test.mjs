import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url))
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

async function runCli(args) {
  const child = Bun.spawn([process.execPath, cli, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { exitCode, stdout, stderr }
}

test('built CLI reports its version and help successfully', async () => {
  const version = await runCli(['--version'])
  expect(version.exitCode).toBe(0)
  expect(version.stdout.trim()).toBe(`${packageJson.version} (Coding Agent)`)
  expect(version.stderr).toBe('')

  const help = await runCli(['--help'])
  expect(help.exitCode).toBe(0)
  expect(help.stdout).toContain('Usage: coding-agent')
  expect(help.stdout).toContain('Coding Agent - starts an interactive session')
  expect(help.stderr).toBe('')
}, 15_000)

async function runCoreSmoke(outputFormat, inputFormat = 'text') {
  const tempRoot = await mkdtemp(join(tmpdir(), 'coding-agent-core-'))
  const filePath = join(tempRoot, 'created.txt')
  const requests = []
  let messageCalls = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const body = request.method === 'POST' ? await request.json() : null
      requests.push({ method: request.method, path: url.pathname, stream: body?.stream, messages: body?.messages, tools: body?.tools?.map(tool => tool.name) })
      if (url.pathname.endsWith('/messages/count_tokens')) {
        return Response.json({ input_tokens: 12 })
      }
      if (!url.pathname.endsWith('/messages')) {
        return Response.json({ error: { type: 'not_found_error', message: url.pathname } }, { status: 404 })
      }
      const toolCall = ++messageCalls === 1
      const toolInput = { file_path: filePath, old_string: '', new_string: 'SMOKE_OK\n' }
      const message = {
        id: `msg_coding_agent_smoke_${messageCalls}`,
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 0 },
      }
      if (!body.stream) {
        return Response.json({
          ...message,
          content: toolCall
            ? [{ type: 'tool_use', id: 'toolu_coding_agent_smoke', name: 'Edit', input: toolInput }]
            : [{ type: 'text', text: 'FILE_WRITTEN' }],
          stop_reason: toolCall ? 'tool_use' : 'end_turn',
        })
      }
      const events = [
        frame('message_start', { type: 'message_start', message }),
        frame('content_block_start', {
          type: 'content_block_start', index: 0,
          content_block: toolCall
            ? { type: 'tool_use', id: 'toolu_coding_agent_smoke', name: 'Edit', input: {} }
            : { type: 'text', text: '' },
        }),
        frame('content_block_delta', {
          type: 'content_block_delta', index: 0,
          delta: toolCall
            ? { type: 'input_json_delta', partial_json: JSON.stringify(toolInput) }
            : { type: 'text_delta', text: 'FILE_WRITTEN' },
        }),
        frame('content_block_stop', { type: 'content_block_stop', index: 0 }),
        frame('message_delta', { type: 'message_delta', delta: { stop_reason: toolCall ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 3 } }),
        frame('message_stop', { type: 'message_stop' }),
      ]
      return new Response(events.join(''), { headers: { 'content-type': 'text/event-stream' } })
    },
  })
  try {
    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: 'local-fixture-key',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
      CLAUDE_CONFIG_DIR: join(tempRoot, 'config'),
    }
    const child = Bun.spawn([
      process.execPath, cli, '--bare', '--print', '--output-format', outputFormat,
      ...(outputFormat === 'stream-json' ? ['--verbose'] : []),
      ...(inputFormat === 'stream-json' ? ['--input-format', 'stream-json'] : []),
      '--max-turns', '2', '--allowedTools=Edit',
      ...(inputFormat === 'text' ? ['Create a file for the smoke test'] : []),
    ], {
      cwd: tempRoot, env, stdin: inputFormat === 'stream-json' ? 'pipe' : 'ignore',
      stdout: 'pipe', stderr: 'pipe',
    })
    if (inputFormat === 'stream-json') {
      child.stdin.write(`${JSON.stringify({
        type: 'user', session_id: '',
        message: { role: 'user', content: 'Create a file for the smoke test' },
        parent_tool_use_id: null,
      })}\n`)
      child.stdin.end()
    }
    const timeout = setTimeout(() => child.kill(), 30_000)
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
    ])
    clearTimeout(timeout)
    if (exitCode !== 0) throw new Error(JSON.stringify({ exitCode, stdout, stderr, requests }))
    const messages = outputFormat === 'stream-json'
      ? stdout.trim().split(/\r?\n/).map(line => JSON.parse(line))
      : [JSON.parse(stdout)]
    const result = messages.findLast(message => message.type === 'result')
    expect(result?.result).toBe('FILE_WRITTEN')
    if (outputFormat === 'stream-json') {
      expect(messages.some(message => message.type === 'assistant')).toBe(true)
    }
    const written = await readFile(filePath, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (written === null) throw new Error(JSON.stringify({
      offeredTools: requests.find(request => request.tools)?.tools,
      toolResult: requests.at(-1)?.messages?.at(-1), stderr,
    }))
    expect(written).toBe('SMOKE_OK\n')
    expect(messageCalls).toBe(2)
    expect(JSON.stringify(requests.find(request => request.path.endsWith('/messages'))?.messages)).toContain('Create a file for the smoke test')
    expect(JSON.stringify(requests.at(-1)?.messages)).toContain('toolu_coding_agent_smoke')
  } finally {
    server.stop(true)
    if (dirname(tempRoot) !== tmpdir() || !basename(tempRoot).startsWith('coding-agent-core-')) {
      throw new Error('Refusing to remove a path outside the smoke-test directory')
    }
    await rm(tempRoot, { recursive: true, force: true })
  }
}

test('built CLI executes an Edit turn with JSON output', () => runCoreSmoke('json'), 45_000)
test('built CLI streams an Edit turn as NDJSON', () => runCoreSmoke('stream-json'), 45_000)
test('built CLI accepts NDJSON input and streams an Edit turn', () => runCoreSmoke('stream-json', 'stream-json'), 45_000)
