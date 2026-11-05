// Diagnose the existing CLI runtime graph without emitting a partial build.
import { isAbsolute, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
const entrypoint = fileURLToPath(new URL('../src/entrypoints/cli.tsx', import.meta.url))
const args = process.argv.slice(2)
if (args.some(arg => arg !== '--include-packages')) {
  throw new Error('Usage: bun scripts/audit-source-build.mjs [--include-packages]')
}
const packages = args.includes('--include-packages') ? 'bundle' : 'external'
const localSourceAliases = new Set([
  '@ant/claude-for-chrome-mcp',
  'color-diff-napi',
  'image-processor-napi',
  'modifiers-napi',
])
const define = {
  // envUtils.ts and tools.ts document the external distribution build guard.
  'process.env.USER_TYPE': JSON.stringify('external'),
  'process.env.NODE_ENV': JSON.stringify('production'),
  // messages.ts and ExitPlanModePermissionRequest.tsx document this external default.
  'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify('false'),
}

const result = await Bun.build({
  entrypoints: [entrypoint],
  target: 'bun',
  // Blanket packages: 'external' can also hide unresolved src/* aliases.
  packages: 'bundle',
  plugins: packages === 'external' ? [{
    name: 'external-packages-keep-source-aliases',
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.path === 'bun:bundle' || localSourceAliases.has(args.path) ||
            args.path.startsWith('src/') ||
            args.path.startsWith('.') || isAbsolute(args.path)) return
        return { path: args.path, external: true }
      })
    },
  }] : [],
  write: false,
  throw: false,
  minify: { syntax: true, whitespace: false, identifiers: false },
  define,
  // Existing resource consumers expect Markdown and prompt files as strings.
  loader: { '.md': 'text', '.txt': 'text' },
})

const diagnostics = result.logs.map(log => ({
  level: log.level,
  message: log.message,
  ...(log.position && {
    file: relative(sourceRoot, log.position.file).replaceAll('\\', '/'),
    line: log.position.line,
    column: log.position.column,
  }),
})).sort((left, right) =>
  (left.file ?? '').localeCompare(right.file ?? '') ||
  (left.line ?? 0) - (right.line ?? 0) ||
  (left.column ?? 0) - (right.column ?? 0) ||
  left.message.localeCompare(right.message),
)

console.log(JSON.stringify({
  bunVersion: Bun.version,
  entrypoint: 'src/entrypoints/cli.tsx',
  packages,
  define,
  scope: packages === 'external'
    ? 'Local runtime module resolution; package imports stay external. This is not a full build, type check, or runtime validation.'
    : 'Source and package module resolution using available local dependencies. This is not an installation, type check, or runtime validation; no build artifact is written.',
  success: result.success,
  diagnostics,
}, null, 2))

process.exitCode = result.success ? 0 : 1
