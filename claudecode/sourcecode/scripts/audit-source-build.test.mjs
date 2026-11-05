import { expect, test } from 'bun:test'
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

// Exercise the real diagnostic CLI in disposable source trees, without packages.
async function audit(source, { args = [], localModule, localAlias } = {}) {
  const tempRoot = resolve(tmpdir())
  const root = await mkdtemp(join(tempRoot, 'coding-agent-audit-'))
  try {
    await mkdir(join(root, 'scripts'))
    await mkdir(join(root, 'src', 'entrypoints'), { recursive: true })
    const script = join(root, 'scripts', 'audit-source-build.mjs')
    await copyFile(new URL('./audit-source-build.mjs', import.meta.url), script)
    await copyFile(new URL('./source-build-config.mjs', import.meta.url), join(root, 'scripts', 'source-build-config.mjs'))
    await writeFile(join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { baseUrl: '.', paths: {
        'src/*': ['./src/*'],
        ...(localAlias && { '@ant/claude-for-chrome-mcp': ['./vendor/chrome-mcp-src/index.ts'] }),
      } },
    }))
    await writeFile(join(root, 'src', 'entrypoints', 'cli.tsx'), source)
    if (localModule) {
      await writeFile(join(root, 'src', 'present.ts'), localModule)
    }
    if (localAlias) {
      await mkdir(join(root, 'vendor', 'chrome-mcp-src'), { recursive: true })
      await writeFile(join(root, 'vendor', 'chrome-mcp-src', 'index.ts'), localAlias)
    }
    const child = Bun.spawn([process.execPath, script, ...args], {
      cwd: root, stdout: 'pipe', stderr: 'pipe',
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
    ])
    // Neither success nor failure may leave a misleading build artifact.
    expect((await readdir(root)).sort()).toEqual(
      localAlias ? ['scripts', 'src', 'tsconfig.json', 'vendor'] : ['scripts', 'src', 'tsconfig.json'],
    )
    return { exitCode, stdout, stderr }
  } finally {
    if (dirname(root) !== tempRoot || !basename(root).startsWith('coding-agent-audit-')) {
      throw new Error('Refusing to remove a path outside the audit test directory')
    }
    await rm(root, { recursive: true, force: true })
  }
}

test('local audit rejects missing src aliases while keeping packages external', async () => {
  const result = await audit(`
    import 'coding-agent-audit-missing-package';
    import { value } from 'src/missing.js';
    console.log(value);
  `)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toBe('')
  const report = JSON.parse(result.stdout)
  expect(report.packages).toBe('external')
  expect(report.success).toBe(false)
  expect(report.diagnostics.some(log => log.level === 'error' && log.message.includes('src/missing.js'))).toBe(true)
  expect(report.diagnostics.some(log => log.message.includes('coding-agent-audit-missing-package'))).toBe(false)
}, 15_000)

test('local audit resolves existing src aliases with the source extension', async () => {
  const result = await audit(`
    import 'coding-agent-audit-missing-package';
    import { value } from 'src/present.js';
    console.log(value);
  `, { localModule: 'export const value = 42;' })
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')
  const report = JSON.parse(result.stdout)
  expect(report.success).toBe(true)
  expect(report.diagnostics).toEqual([])
  expect(report.define?.['process.env.CLAUDE_CODE_VERIFY_PLAN']).toBe('"false"')
}, 15_000)

test('local audit traverses a vendored package alias', async () => {
  const result = await audit(`import '@ant/claude-for-chrome-mcp';`, {
    localAlias: `import './missing.js';`,
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toBe('')
  const report = JSON.parse(result.stdout)
  expect(report.packages).toBe('external')
  expect(report.diagnostics.some(log => log.message.includes('./missing.js'))).toBe(true)
}, 15_000)

test('package audit exposes a missing external package', async () => {
  const result = await audit(`import 'coding-agent-audit-missing-package';`, {
    args: ['--include-packages'],
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toBe('')
  const report = JSON.parse(result.stdout)
  expect(report.packages).toBe('bundle')
  expect(report.success).toBe(false)
  expect(report.diagnostics.some(log => log.level === 'error' && log.message.includes('coding-agent-audit-missing-package'))).toBe(true)
}, 15_000)

test('audit rejects unsupported arguments', async () => {
  const result = await audit(`console.log('ready');`, { args: ['--include-package'] })
  expect(result.exitCode).toBe(1)
  expect(result.stdout).toBe('')
  expect(result.stderr).toContain('Usage: bun scripts/audit-source-build.mjs [--include-packages]')
}, 15_000)
