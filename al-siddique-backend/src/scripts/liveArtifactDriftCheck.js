const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const liveRoot = path.resolve(process.env.ASSPS_BACKEND_LIVE_ROOT || '/var/www/apex-backend')
const sourceRoot = path.join(liveRoot, 'src')
const mirroredItems = ['server.js','package.json','package-lock.json','config','middleware','routes','services','utils','scripts']

function ignored(name) {
  return name === '.env' || name === 'node_modules' || name === 'logs' || name === 'uploads' || /\.bak[-.]/.test(name) || name.endsWith('~')
}

function filesUnder(root, relative = '') {
  const target = path.join(root, relative)
  if (!fs.existsSync(target)) return []
  const stat = fs.lstatSync(target)
  if (stat.isFile()) return [relative]
  if (!stat.isDirectory()) return []
  const out = []
  for (const name of fs.readdirSync(target)) {
    if (ignored(name)) continue
    const child = path.join(relative, name)
    const childStat = fs.lstatSync(path.join(root, child))
    if (childStat.isDirectory()) out.push(...filesUnder(root, child))
    else if (childStat.isFile()) out.push(child)
  }
  return out
}

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

const mismatches = []
for (const item of mirroredItems) {
  const sourcePath = path.join(sourceRoot, item)
  if (!fs.existsSync(sourcePath)) continue
  const sourceStat = fs.lstatSync(sourcePath)
  const relFiles = sourceStat.isFile() ? [item] : filesUnder(sourceRoot, item)
  for (const rel of relFiles) {
    const src = path.join(sourceRoot, rel)
    const compat = path.join(liveRoot, rel)
    if (!fs.existsSync(compat)) {
      mismatches.push(`${rel}: compatibility copy missing`)
      continue
    }
    if (hash(src) !== hash(compat)) mismatches.push(`${rel}: content differs`)
  }
}

if (mismatches.length) {
  console.error('BACKEND_ARTIFACT_DRIFT_FAIL')
  for (const item of mismatches) console.error(`- ${item}`)
  process.exit(1)
}

console.log(`BACKEND_ARTIFACT_DRIFT_PASS root=${liveRoot}`)
