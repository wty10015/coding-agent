import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { SourceMap } from 'node:module'
import { fileURLToPath } from 'node:url'

// Isolate module resolution: other dependencies stay external, and enabled
// optional modules use test exports because their implementations are absent.
const cases = [
  { file: 'tools.ts', module: './tools/TungstenTool/TungstenTool.js',
    user: 'external', enabled: false },
  { file: 'tools.ts', module: './tools/TungstenTool/TungstenTool.js',
    user: 'ant', enabled: true },
  { file: 'tools.ts', module: './tools/VerifyPlanExecutionTool/VerifyPlanExecutionTool.js',
    user: 'external', enabled: false, verifyPlan: 'false' },
  { file: 'tools.ts', module: './tools/VerifyPlanExecutionTool/VerifyPlanExecutionTool.js',
    user: 'ant', enabled: true, verifyPlan: 'true' },
  // This snapshot has a literal external-only render condition, even for ant.
  { file: 'screens/REPL.tsx', module: '../tools/TungstenTool/TungstenLiveMonitor.js',
    user: 'external', enabled: false },
  { file: 'screens/REPL.tsx', module: '../tools/TungstenTool/TungstenLiveMonitor.js',
    user: 'ant', enabled: false },
  { file: 'components/agents/ToolSelector.tsx', module: 'src/tools/TungstenTool/TungstenTool.js',
    user: 'external', enabled: false },
  { file: 'components/agents/ToolSelector.tsx', module: 'src/tools/TungstenTool/TungstenTool.js',
    user: 'ant', enabled: false },
  { file: 'cli/print.ts', module: 'src/utils/filePersistence/filePersistence.js',
    user: 'external', enabled: false },
  { file: 'cli/print.ts', module: 'src/utils/filePersistence/filePersistence.js',
    user: 'external', enabled: true, features: ['FILE_PERSISTENCE'] },
  { file: 'components/TokenWarning.tsx', module: '../services/contextCollapse/index.js',
    user: 'external', enabled: false },
  { file: 'components/TokenWarning.tsx', module: '../services/contextCollapse/index.js',
    user: 'external', enabled: true, features: ['CONTEXT_COLLAPSE'], resolutions: 2 },
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
  { file: 'dialogLaunchers.tsx', module: './components/agents/SnapshotUpdateDialog.js',
    user: 'external', enabled: false },
  { file: 'dialogLaunchers.tsx', module: './components/agents/SnapshotUpdateDialog.js',
    user: 'external', enabled: true, features: ['AGENT_MEMORY_SNAPSHOT'] },
  { file: 'dialogLaunchers.tsx', module: './assistant/AssistantSessionChooser.js',
    user: 'external', enabled: false },
  { file: 'dialogLaunchers.tsx', module: './assistant/AssistantSessionChooser.js',
    user: 'external', enabled: true, features: ['KAIROS'] },
  { file: 'dialogLaunchers.tsx', module: './commands/assistant/assistant.js',
    user: 'external', enabled: false },
  { file: 'dialogLaunchers.tsx', module: './commands/assistant/assistant.js',
    user: 'external', enabled: true, features: ['KAIROS'] },
]

for (const scenario of cases) {
  test(`${scenario.file}: ${scenario.module}, ${scenario.user}, optional import ${scenario.enabled ? 'enabled' : 'disabled'}`, async () => {
    const resolved = []
    const marker = 'optional_import_test_marker'
    const entrypoint = fileURLToPath(new URL(`../src/${scenario.file}`, import.meta.url))
    const result = await Bun.build({
      entrypoints: [entrypoint],
      target: 'bun',
      write: false,
      throw: false,
      features: scenario.features ?? [],
      define: {
        'process.env.USER_TYPE': JSON.stringify(scenario.user),
        ...(scenario.verifyPlan !== undefined && {
          'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify(scenario.verifyPlan),
        }),
      },
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
              'tools.ts': `
                export const TungstenTool = { name: '${marker}' };
                export const VerifyPlanExecutionTool = { name: '${marker}' };
              `,
              'screens/REPL.tsx': `export const TungstenLiveMonitor = '${marker}'`,
              'components/agents/ToolSelector.tsx': `export const TungstenTool = { name: '${marker}' }`,
              'cli/print.ts': `export const executeFilePersistence = () => '${marker}'`,
              'components/TokenWarning.tsx': `
                export const getStats = () => '${marker}';
                export const subscribe = () => '${marker}';
                export const isContextCollapseEnabled = () => true;
              `,
              'constants/tools.ts': `export const WORKFLOW_TOOL_NAME = '${marker}'`,
              'services/compact/microCompact.ts': `export const optionalImportMarker = '${marker}'`,
              'dialogLaunchers.tsx': `
                export const SnapshotUpdateDialog = '${marker}';
                export const AssistantSessionChooser = '${marker}';
                export const NewInstallWizard = '${marker}';
                export const computeDefaultInstallDir = () => '${marker}';
              `,
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
    expect(resolved).toEqual(scenario.enabled
      ? Array(scenario.resolutions ?? 1).fill(scenario.module)
      : [])
    const output = await result.outputs[0].text()
    expect(output.length).toBeGreaterThan(0)
    expect(output.includes(marker)).toBe(scenario.enabled)
  })
}

for (const scenario of [
  { file: 'screens/REPL.tsx', specifier: '../tools/TungstenTool/TungstenLiveMonitor.js',
    call: 'require' },
  { file: 'screens/REPL.tsx', specifier: '../types/partialCompactDirection.js',
    call: 'from' },
  { file: 'components/agents/ToolSelector.tsx', specifier: 'src/tools/TungstenTool/TungstenTool.js',
    call: 'require' },
  { file: 'components/TokenWarning.tsx', specifier: '../services/contextCollapse/index.js',
    call: 'require' },
]) {
  test(`${scenario.file}: embedded source map preserves ${scenario.specifier}`, async () => {
    const source = await readFile(new URL(`../src/${scenario.file}`, import.meta.url), 'utf8')
    const match = source.match(/\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,([^\r\n]+)/)
    expect(match).not.toBeNull()
    const payload = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
    const { specifier, call } = scenario
    const lines = source.slice(0, match.index).split('\n')
    const hasPath = text => call === 'from'
      ? text.includes(`from '${specifier}'`)
      : text.includes(`require('${specifier}')`) || text.includes(`require("${specifier}")`)
    const line = lines.findIndex(hasPath)
    expect(line).toBeGreaterThanOrEqual(0)
    const entry = new SourceMap(payload).findEntry(line, lines[line].indexOf(specifier))
    expect(entry.originalSource).toBe(payload.sources[0])
    const originalLines = payload.sourcesContent[0].split('\n')
    expect(hasPath(originalLines[entry.originalLine])).toBe(true)
  })
}
