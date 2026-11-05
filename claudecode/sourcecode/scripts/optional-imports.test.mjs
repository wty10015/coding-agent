import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

// Isolate module resolution: other dependencies stay external, and enabled
// optional modules use test exports because their implementations are absent.
const cases = [
  { file: 'tools.ts', module: './tools/TungstenTool/TungstenTool.js',
    user: 'external', enabled: false },
  { file: 'tools.ts', module: './tools/TungstenTool/TungstenTool.js',
    user: 'ant', enabled: true },
  { file: 'constants/tools.ts', module: '../tools/WorkflowTool/constants.js',
    user: 'external', enabled: false },
  { file: 'constants/tools.ts', module: '../tools/WorkflowTool/constants.js',
    user: 'external', enabled: true, features: ['WORKFLOW_SCRIPTS'] },
  { file: 'services/compact/microCompact.ts', module: './cachedMicrocompact.js',
    user: 'external', enabled: false },
  { file: 'services/compact/microCompact.ts', module: './cachedMicrocompact.js',
    user: 'external', enabled: true, features: ['CACHED_MICROCOMPACT'] },
  { file: 'utils/attachments.ts', module: '../services/compact/snipCompact.js',
    user: 'external', enabled: false },
  { file: 'utils/attachments.ts', module: '../services/compact/snipCompact.js',
    user: 'external', enabled: true, features: ['HISTORY_SNIP'] },
]

for (const scenario of cases) {
  test(`${scenario.file}: ${scenario.user}, optional import ${scenario.enabled ? 'enabled' : 'disabled'}`, async () => {
    const resolved = []
    const marker = 'optional_import_test_marker'
    const entrypoint = fileURLToPath(new URL(`../src/${scenario.file}`, import.meta.url))
    const result = await Bun.build({
      entrypoints: [entrypoint],
      target: 'bun',
      write: false,
      throw: false,
      features: scenario.features ?? [],
      define: { 'process.env.USER_TYPE': JSON.stringify(scenario.user) },
      plugins: [{
        name: 'observe-optional-import',
        setup(build) {
          build.onResolve({ filter: /.*/ }, args => {
            if (args.path === entrypoint || args.path === 'bun:bundle') return
            if (args.path === scenario.module) {
              resolved.push(args.path)
              return { path: args.path, namespace: 'optional-test' }
            }
            return { path: args.path, external: true }
          })
          build.onLoad({ filter: /.*/, namespace: 'optional-test' }, () => ({
            contents: {
              'tools.ts': `export const TungstenTool = { name: '${marker}' }`,
              'constants/tools.ts': `export const WORKFLOW_TOOL_NAME = '${marker}'`,
              'services/compact/microCompact.ts': `export const optionalImportMarker = '${marker}'`,
              'utils/attachments.ts': `
                export const isSnipRuntimeEnabled = () => true;
                export function shouldNudgeForSnips(_messages, marker = '${marker}') {
                  return marker.length > 0;
                }
              `,
            }[scenario.file],
            loader: 'js',
          }))
        },
      }],
    })
    expect(result.logs.filter(log => log.level === 'error')).toEqual([])
    expect(result.success).toBe(true)
    expect(result.outputs).toHaveLength(1)
    expect(resolved).toEqual(scenario.enabled ? [scenario.module] : [])
    const output = await result.outputs[0].text()
    expect(output.length).toBeGreaterThan(0)
    expect(output.includes(marker)).toBe(scenario.enabled)
  })
}
