import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const nodeTests = [
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalCutoverReadiness.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/migrationV2_43.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalSemanticParity.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalEditorInvariants.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/paperSystemRules.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalRouteCanary.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalMetadataMarksEditing.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/editorV2B4StructuredOverlay.test.js',
]

const browserTests = [
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalAll43RenderPrintAcceptance.test.js',
  'src/Modules/Paper-Generator/PaperEditor/tests/canonicalCanaryBrowserAcceptance.test.js',
]

function run(label, command, args) {
  console.log(`\n=== ${label} ===`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    console.error(`${label}: ERROR`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`${label}: FAIL (exit ${result.status})`)
    process.exit(result.status || 1)
  }
  console.log(`${label}: PASS`)
}

run(
  'STATIC + CORE READINESS',
  process.execPath,
  ['--test', ...nodeTests]
)

run(
  'ALL-43 RENDER / STATIC / PRINT PARITY',
  process.execPath,
  ['--test', browserTests[0]]
)

run(
  'REAL PAPERGENERATOR CANARY ROUTE',
  process.execPath,
  ['--test', browserTests[1]]
)

if (process.platform === 'win32') {
  run(
    'PRODUCTION FRONTEND BUILD',
    process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
    ['/d', '/s', '/c', 'npm run build']
  )
} else {
  run(
    'PRODUCTION FRONTEND BUILD',
    'npm',
    ['run', 'build']
  )
}

console.log('\nCANONICAL_CUTOVER_READINESS_READY')
console.log('Default production route is intentionally unchanged by this audit.')
