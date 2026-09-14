const { execFileSync } = require('child_process')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')

function git(args) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
}

function parseStatus(output) {
  const entries = output.split('\0')
  const rows = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!entry) continue
    const status = entry.slice(0, 2)
    const row = { status: status.trim(), file: entry.slice(3) }
    // Porcelain -z lists the destination first, then the original rename path.
    if (/[RC]/.test(status)) row.originalFile = entries[++index]
    rows.push(row)
  }
  return rows
}

function listChanged() {
  return parseStatus(git(['status', '--porcelain=v1', '-z', '--untracked-files=all']))
}

function categoryFor(file) {
  const normalized = file.replace(/\\/g, '/')
  if (normalized.startsWith('al-siddique-backend/src/middleware/') || normalized.includes('/auth')) return 'HIGH_AUTH_SECURITY'
  if (normalized.startsWith('al-siddique-backend/src/routes/')) return 'HIGH_BACKEND_ROUTE'
  if (normalized.startsWith('al-siddique-backend/src/prisma/') || normalized.includes('migrate')) return 'HIGH_DB_MIGRATION'
  if (normalized.startsWith('al-siddique-backend/src/config/')) return 'HIGH_DB_CONFIG'
  if (normalized.startsWith('al-siddique-backend/')) return 'HIGH_BACKEND_RUNTIME'
  if (normalized.startsWith('al-siddique-frontend/src/Modules/fees/')) return 'HIGH_FEES_UI'
  if (normalized.startsWith('al-siddique-frontend/src/Modules/students/')) return 'HIGH_STUDENT_UI'
  if (normalized.startsWith('al-siddique-frontend/src/Modules/attendance/')) return 'HIGH_ATTENDANCE_UI'
  if (normalized.startsWith('al-siddique-frontend/src/Modules/Paper-Generator/')) return 'MEDIUM_PAPER_PRINT'
  if (normalized.startsWith('al-siddique-frontend/src/services/')) return 'HIGH_FRONTEND_DATA_SERVICE'
  if (normalized.startsWith('ops/')) return 'OPS_DEPLOY_SAFETY'
  if (normalized.startsWith('runtime/')) return 'RUNTIME_REPORT_NOT_DEPLOY'
  if (normalized === 'package.json' || normalized === 'package-lock.json') return 'PACKAGE_SCRIPT_OR_DEP'
  if (normalized.startsWith('al-siddique-frontend/src/')) return 'HIGH_FRONTEND_SHARED'
  return 'UNCLASSIFIED_REVIEW_REQUIRED'
}

function deploymentImpact(category) {
  if (category.startsWith('HIGH_')) return 'REQUIRES_REVIEW_AND_TARGETED_SMOKE'
  if (category === 'OPS_DEPLOY_SAFETY' || category === 'PACKAGE_SCRIPT_OR_DEP') return 'REQUIRES_RELEASE_REVIEW'
  if (category === 'RUNTIME_REPORT_NOT_DEPLOY') return 'DO_NOT_DEPLOY_ARTIFACT'
  return 'REQUIRES_REVIEW_AND_TARGETED_SMOKE'
}

function main() {
const rows = listChanged().map(item => {
  const category = categoryFor(item.file)
  return { ...item, category, impact: deploymentImpact(category) }
})

const grouped = rows.reduce((acc, row) => {
  acc[row.category] = acc[row.category] || []
  acc[row.category].push(row)
  return acc
}, {})

console.log('# ASSPS Release Candidate Manifest')
console.log(`Generated: ${new Date().toISOString()}`)
console.log(`Base commit: ${git(['rev-parse', 'HEAD']).trim()}`)
console.log(`Changed files: ${rows.length}`)
console.log('')

for (const category of Object.keys(grouped).sort()) {
  console.log(`## ${category}`)
  for (const row of grouped[category]) {
    console.log(`- [${row.status}] ${JSON.stringify(row.file)}${row.originalFile ? ` (from ${JSON.stringify(row.originalFile)})` : ''} :: ${row.impact}`)
  }
  console.log('')
}

const highRisk = rows.filter(row => row.impact.includes('REQUIRES'))
const runtime = rows.filter(row => row.category === 'RUNTIME_REPORT_NOT_DEPLOY')

console.log('## Release Gate')
console.log(`High/review-risk files: ${highRisk.length}`)
console.log(`Runtime/report files: ${runtime.length}`)
console.log('Recommended: review high-risk files one by one before any production deploy.')
console.log('Inventory only: no file in this output is approved for deployment.')
}

module.exports = { parseStatus, categoryFor, deploymentImpact }
if (require.main === module) main()
