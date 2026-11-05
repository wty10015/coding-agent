// Check the restored host declaration and its positive/negative JSX fixture.
// This deliberately does not claim to type-check the entire source tree.
const path = require('node:path')
const ts = require('typescript')

const sourceRoot = path.resolve(__dirname, '..')
const reactTypesRoot = path.dirname(require.resolve('@types/react/package.json'))
const files = [
  path.join(sourceRoot, 'src/ink/global.d.ts'),
  path.join(sourceRoot, 'scripts/fixtures/ink-jsx.typecheck.tsx'),
]
const options = {
  noEmit: true,
  strict: true,
  skipLibCheck: false,
  target: ts.ScriptTarget.ES2023,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  baseUrl: sourceRoot,
  typeRoots: [path.dirname(reactTypesRoot)],
  types: ['node'],
  paths: {
    react: [path.join(reactTypesRoot, 'index.d.ts')],
    'react/*': [path.join(reactTypesRoot, '*')],
    'src/*': [path.join(sourceRoot, 'src/*')],
  },
}
const program = ts.createProgram(files, options)
const diagnostics = [...program.getOptionsDiagnostics()]
for (const file of files) {
  const source = program.getSourceFile(file)
  if (!source) throw new Error(`Type-check input not found: ${file}`)
  diagnostics.push(
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  )
}
console.log(JSON.stringify({
  typescriptVersion: ts.version,
  reactTypesVersion: require('@types/react/package.json').version,
  scope: 'Strict fixture and host declaration only; transitive project bodies are not validated.',
  success: diagnostics.length === 0,
  diagnostics: diagnostics.map(diagnostic => ({
    ...(diagnostic.file && {
      file: path.relative(sourceRoot, diagnostic.file.fileName).replaceAll('\\', '/'),
      line: diagnostic.start === undefined ? undefined
        : diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1,
    }),
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  })),
}, null, 2))
process.exitCode = diagnostics.length === 0 ? 0 : 1
