/**
 * Run the exact Early Years Chromium acceptance cases with fresh browser
 * processes, avoiding renderer exhaustion from 40+ paper navigations.
 *
 * Does not change test assertions, test fixtures, or production services.
 */
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const frontendRoot = path.resolve(__dirname, '../al-siddique-frontend')
const file = 'src/Modules/Paper-Generator/PaperEditor/tests/earlyYearsRenderPrintGeometryAcceptance.test.js'
let passed = 0
for (let i = 1; i <= 8; i++) {
  const id = String(i).padStart(2, '0')
  const result = spawnSync(process.execPath, [
    '--test',
    '--test-name-pattern', '^EY-RENDER-' + id + ':',
    file,
  ], {
    cwd: frontendRoot,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 5 * 1024 * 1024,
    env: { ...process.env },
  })
  if (result.status !== 0 || result.error) {
    console.error('EY-RENDER-' + id + ': FAIL', result.error?.message || ('exit ' + result.status))
    console.error((result.stdout || '').slice(-2000))
    console.error((result.stderr || '').slice(-1000))
    process.exitCode = 1
    break
  }
  if (!/# pass 1\b/.test(result.stdout) || !/# fail 0\b/.test(result.stdout)) {
    console.error('EY-RENDER-' + id + ': unexpected acceptance count')
    process.exitCode = 1
    break
  }
  console.log('EY-RENDER-' + id + ': PASS (fresh Chromium)')
  passed++
}
if (passed === 8) console.log('EARLY_YEARS_BROWSER_ISOLATED 8/8 PASS')
