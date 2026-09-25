const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const excluded = new Set(['node_modules', 'dist', 'build', 'coverage', 'uploads', 'logs', 'legacy', '.git'])

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    if (entry.isSymbolicLink() || excluded.has(entry.name)) return []
    if (entry.isDirectory()) return sources(file)
    return /\.(?:js|cjs|mjs)$/.test(entry.name) ? [file] : []
  })
}

function run(label, args, quiet = false) {
  const result = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit',
  })
  if (result.error || result.status !== 0) {
    console.error(`FAIL ${label}`)
    if (result.stderr) console.error(result.stderr)
    if (result.error) console.error(result.error.message)
    process.exit(1)
  }
}

function runCommand(label, command, args, quiet = false) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit',
  })
  if (result.error || result.status !== 0) {
    console.error(`FAIL ${label}`)
    if (result.stderr) console.error(result.stderr)
    if (result.stdout) console.error(result.stdout)
    if (result.error) console.error(result.error.message)
    process.exit(1)
  }
}

run('source safety guard', ['ops/production-safety-check.js'])
const files = [...sources(path.join(root, 'al-siddique-backend/src')), ...sources(path.join(root, 'ops'))]
for (const file of files) run(`syntax: ${path.relative(root, file)}`, ['--check', file], true)
console.log(`PASS syntax: ${files.length} backend and ops files (not executed)`)
if (process.platform === 'win32') {
  runCommand('powershell syntax: ops/deploy-production.ps1', 'powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "$ErrorActionPreference='Stop'; [void][scriptblock]::Create((Get-Content -Raw -LiteralPath 'ops\\deploy-production.ps1'))",
  ], true)
  console.log('PASS syntax: ops/deploy-production.ps1')
}
run('ops regression', ['--test', ...sources(path.join(root, 'ops/tests')).filter(file => file.endsWith('.test.js'))])
const npmCli = process.env.npm_execpath
if (!npmCli || !fs.existsSync(npmCli)) {
  console.error('Run through npm run verify:local so the installed npm CLI can be resolved.')
  process.exit(1)
}
run('frontend build', [npmCli, 'run', 'build:frontend'])
console.log('PASS local verification. Live workflow acceptance and deployment approval remain separate.')
