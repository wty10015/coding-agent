import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { SourceMap } from 'node:module'
import { fileURLToPath } from 'node:url'

// Execute the actual launcher module with controlled UI and optional components.
// This checks callback wiring, not rendering or the missing components' behavior.
async function loadLaunchers(features, failDefaultDir = false) {
  const entrypoint = fileURLToPath(new URL('../src/dialogLaunchers.tsx', import.meta.url))
  const result = await Bun.build({
    entrypoints: [entrypoint],
    target: 'bun',
    write: false,
    throw: false,
    features,
    plugins: [{
      name: 'launcher-collaborators',
      setup(build) {
        build.onResolve({ filter: /.*/ }, args => {
          if (args.path === entrypoint || args.path === 'bun:bundle') return
          return { path: args.path, namespace: 'launcher-test' }
        })
        build.onLoad({ filter: /.*/, namespace: 'launcher-test' }, args => {
          if (args.path === 'react' || args.path.startsWith('react/')) {
            return { loader: 'js', contents: `
              export const jsx = (type, props) => ({ type, props });
              export const jsxs = jsx;
              export const jsxDEV = jsx;
              export default { createElement: jsx };
            ` }
          }
          if (args.path === './interactiveHelpers.js') {
            return { loader: 'js', contents: `
              export function showSetupDialog(root, renderer) {
                return new Promise(resolve => root.render(renderer(resolve)));
              }
              export function renderAndRun() { throw new Error('Unexpected launcher'); }
            ` }
          }
          const components = {
            './keybindings/KeybindingProviderSetup.js': 'KeybindingSetup',
            './components/agents/SnapshotUpdateDialog.js': 'SnapshotUpdateDialog',
            './assistant/AssistantSessionChooser.js': 'AssistantSessionChooser',
            './components/InvalidSettingsDialog.js': 'InvalidSettingsDialog',
            './components/TeleportResumeWrapper.js': 'TeleportResumeWrapper',
            './components/TeleportRepoMismatchDialog.js': 'TeleportRepoMismatchDialog',
            './screens/ResumeConversation.js': 'ResumeConversation',
            './components/App.js': 'App',
          }
          if (components[args.path]) {
            const name = components[args.path]
            return { loader: 'js', contents: `export const ${name} = '${name}';` }
          }
          if (args.path === './commands/assistant/assistant.js') {
            return { loader: 'js', contents: `
              export const NewInstallWizard = 'NewInstallWizard';
              export async function computeDefaultInstallDir() {
                ${failDefaultDir ? "throw new Error('directory failure');" : "return '/fixture/target';"}
              }
            ` }
          }
          throw new Error(`Unexpected runtime dependency: ${args.path}`)
        })
      },
    }],
  })
  expect(result.logs.filter(log => log.level === 'error')).toEqual([])
  expect(result.success).toBe(true)
  expect(result.outputs).toHaveLength(1)
  const output = await result.outputs[0].text()
  expect(output.length).toBeGreaterThan(0)
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

for (const choice of ['merge', 'keep', 'replace', 'cancel']) {
  test(`snapshot launcher forwards ${choice}`, async () => {
    const { launchSnapshotUpdateDialog } = await loadLaunchers(['AGENT_MEMORY_SNAPSHOT'])
    const input = { agentType: 'fixture-agent', scope: 'project', snapshotTimestamp: 'fixture' }
    const root = { render(element) {
      expect(element.type).toBe('SnapshotUpdateDialog')
      for (const key of Object.keys(input)) expect(element.props[key]).toBe(input[key])
      if (choice === 'cancel') element.props.onCancel()
      else element.props.onComplete(choice)
    } }
    expect(await launchSnapshotUpdateDialog(root, input)).toBe(choice === 'cancel' ? 'keep' : choice)
  })
}

for (const cancel of [false, true]) {
  test(`session chooser ${cancel ? 'cancels' : 'selects'}`, async () => {
    const { launchAssistantSessionChooser } = await loadLaunchers(['KAIROS'])
    const sessions = [{ id: 'fixture-session' }]
    const root = { render(element) {
      expect(element.type).toBe('AssistantSessionChooser')
      expect(element.props.sessions).toBe(sessions)
      if (cancel) element.props.onCancel()
      else element.props.onSelect(sessions[0].id)
    } }
    expect(await launchAssistantSessionChooser(root, { sessions })).toBe(cancel ? null : sessions[0].id)
  })
}

for (const outcome of ['installed', 'cancel', 'error']) {
  test(`install launcher forwards ${outcome}`, async () => {
    const { launchAssistantInstallWizard } = await loadLaunchers(['KAIROS'])
    const root = { render(element) {
      expect(element.type).toBe('NewInstallWizard')
      expect(element.props.defaultDir).toBe('/fixture/target')
      if (outcome === 'installed') element.props.onInstalled('/fixture/installed')
      else if (outcome === 'cancel') element.props.onCancel()
      else element.props.onError('fixture failure')
    } }
    const result = launchAssistantInstallWizard(root)
    if (outcome === 'error') await expect(result).rejects.toThrow('Installation failed: fixture failure')
    else expect(await result).toBe(outcome === 'cancel' ? null : '/fixture/installed')
  })
}

test('default-directory failure propagates before any dialog renders', async () => {
  const { launchAssistantInstallWizard } = await loadLaunchers(['KAIROS'], true)
  const root = { render() { throw new Error('Must not render') } }
  await expect(launchAssistantInstallWizard(root)).rejects.toThrow('directory failure')
})

test('disabled launchers reject without rendering', async () => {
  const launchers = await loadLaunchers([])
  const root = { render() { throw new Error('Must not render') } }
  await expect(launchers.launchSnapshotUpdateDialog(root, {})).rejects.toThrow('not enabled in this build')
  await expect(launchers.launchAssistantSessionChooser(root, {})).rejects.toThrow('not enabled in this build')
  await expect(launchers.launchAssistantInstallWizard(root)).rejects.toThrow('not enabled in this build')
})

test('embedded source map preserves guarded import locations', () => {
  const source = readFileSync(new URL('../src/dialogLaunchers.tsx', import.meta.url), 'utf8')
  const encoded = source.match(/sourceMappingURL=data:application\/json;charset=utf-8;base64,([^\r\n]+)/)
  expect(encoded).not.toBeNull()
  const payload = JSON.parse(Buffer.from(encoded[1], 'base64').toString('utf8'))
  expect(payload.sources).toEqual(['dialogLaunchers.tsx'])
  expect(payload.sourcesContent).toHaveLength(1)
  const originalLines = payload.sourcesContent[0].split('\n')
  const generatedLines = source.split('\n')
  const map = new SourceMap(payload)
  for (const specifier of [
    './components/agents/SnapshotUpdateDialog.js',
    './assistant/AssistantSessionChooser.js',
    './commands/assistant/assistant.js',
  ]) {
    const line = generatedLines.findIndex(value => value.includes(`import('${specifier}')`))
    expect(line).toBeGreaterThanOrEqual(0)
    const entry = map.findEntry(line, generatedLines[line].indexOf(specifier))
    expect(entry.originalSource).toBe('dialogLaunchers.tsx')
    expect(originalLines[entry.originalLine].trim()).toBe(`'${specifier}'`)
  }
  expect(payload.sourcesContent[0]).toContain("if (feature('AGENT_MEMORY_SNAPSHOT'))")
  expect(payload.sourcesContent[0].match(/if \(feature\('KAIROS'\)\)/g)).toHaveLength(2)
})
