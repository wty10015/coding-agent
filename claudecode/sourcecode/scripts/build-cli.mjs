import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { entrypoint, externalDefine, sourceLoader, sourceMinify, sourceRoot } from './source-build-config.mjs'

const outdir = join(sourceRoot, 'dist')
const manifest = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'))

const define = {
  ...externalDefine,
  'MACRO.VERSION': JSON.stringify(manifest.version),
  'MACRO.BUILD_TIME': JSON.stringify(''),
  'MACRO.PACKAGE_URL': JSON.stringify(''),
  'MACRO.NATIVE_PACKAGE_URL': 'null',
  'MACRO.FEEDBACK_CHANNEL': JSON.stringify('https://github.com/wty10015/coding-agent/issues'),
  'MACRO.ISSUES_EXPLAINER': JSON.stringify('open an issue at https://github.com/wty10015/coding-agent/issues'),
  'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
}

const result = await Bun.build({
  entrypoints: [entrypoint],
  target: 'bun',
  packages: 'bundle',
  outdir,
  write: false,
  throw: false,
  minify: sourceMinify,
  define,
  loader: sourceLoader,
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exitCode = 1
} else {
  if (result.outputs.length === 0) throw new Error('Build produced no outputs')
  for (const output of result.outputs) {
    const target = resolve(output.path)
    if (!target.startsWith(resolve(outdir) + sep)) {
      throw new Error(`Refusing to write outside dist: ${output.path}`)
    }
    await mkdir(dirname(target), { recursive: true })
    await Bun.write(target, output)
    console.log(`${relative(sourceRoot, target)} (${output.size} bytes)`)
  }
}
