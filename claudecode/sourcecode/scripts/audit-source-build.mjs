// Diagnose the existing CLI runtime graph without emitting a partial build.
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
const entrypoint = fileURLToPath(new URL('../src/entrypoints/cli.tsx', import.meta.url))

const result = await Bun.build({
  entrypoints: [entrypoint],
  target: 'bun',
  packages: 'external',
  write: false,
  throw: false,
  minify: { syntax: true, whitespace: false, identifiers: false },
  define: {
    // envUtils.ts and tools.ts document the external distribution build guard.
    'process.env.USER_TYPE': JSON.stringify('external'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
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
  scope: 'Local runtime module resolution; package imports stay external. This is not a full build, type check, or runtime validation.',
  success: result.success,
  diagnostics,
}, null, 2))

process.exitCode = result.success ? 0 : 1
