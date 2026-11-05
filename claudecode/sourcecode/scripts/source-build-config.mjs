import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
export const entrypoint = join(sourceRoot, 'src/entrypoints/cli.tsx')

// These are the external-distribution build guards documented by their callers.
export const externalDefine = {
  'process.env.USER_TYPE': JSON.stringify('external'),
  'process.env.NODE_ENV': JSON.stringify('production'),
  'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify('false'),
}

export const localSourceAliases = new Set([
  '@ant/claude-for-chrome-mcp',
  'color-diff-napi',
  'image-processor-napi',
  'modifiers-napi',
])

export const sourceMinify = { syntax: true, whitespace: false, identifiers: false }
export const sourceLoader = { '.md': 'text', '.txt': 'text' }
