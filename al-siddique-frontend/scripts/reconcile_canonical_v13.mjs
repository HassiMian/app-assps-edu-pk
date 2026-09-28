import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  generate43NormalizationManifest,
  sortObjectKeysRecursively,
} from '../src/Modules/Paper-Generator/PaperEditor/migration/normalizeOfficialPaper.js'
import {
  generateCanonicalV2Corpus,
} from '../src/Modules/Paper-Generator/PaperEditor/migration/migrateOfficialPaperToV2.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const migrationData = path.join(frontendRoot, 'src/Modules/Paper-Generator/PaperEditor/migration/data')
const v12Path = path.join(frontendRoot, 'src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json')
const v13Path = path.join(frontendRoot, 'src/Modules/Paper-Generator/seed-data/official-first-term-2026-v13.json')
const manifestPath = path.join(migrationData, 'normalizationManifestV13.json')
const canonicalPath = path.join(migrationData, 'canonical-first-term-2026-paperdoc-v2-schema3.json')
const earlyYearsPath = path.join(frontendRoot, 'src/Modules/Paper-Generator/PaperEditor/earlyYears/data/early-years-first-term-2026-source-v2.json')
const lockPath = path.join(migrationData, 'referenceCorpusLock.json')
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')
const rel = filePath => path.relative(repoRoot, filePath).replaceAll('\\', '/')
const gitText = args => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
const gitBytes = args => execFileSync('git', args, { cwd: repoRoot, maxBuffer:32 * 1024 * 1024 })

function canonicalStringify(value) {
  return JSON.stringify(sortObjectKeysRecursively(value), null, 2) + '\n'
}

function lastCommitFor(filePath) {
  return gitText(['log', '-1', '--format=%H', '--', rel(filePath)])
}

function historicalBlob(ref, filePath) {
  const commit = gitText(['rev-parse', ref])
  const bytes = gitBytes(['show', commit + ':' + rel(filePath)])
  return { commit, sha256: sha256(bytes) }
}

const v13Bytes = fs.readFileSync(v13Path)
const v13 = JSON.parse(v13Bytes.toString('utf8'))
if (v13.papers?.length !== 43) throw new Error('Expected exactly 43 papers in operational V13')
const v13Sha = sha256(v13Bytes)
const sourceCommit = lastCommitFor(v13Path)
const manifest = generate43NormalizationManifest(v13, {
  sourceDatasetByteSha256: v13Sha,
  generatedAtBaseline: sourceCommit,
})
const manifestText = canonicalStringify(manifest)
const manifestSha = sha256(Buffer.from(manifestText, 'utf8'))

const corpus = generateCanonicalV2Corpus(v13, manifest, {
  migrationBaselineCommit: sourceCommit,
  sourceDatasetByteSha256: v13Sha,
  normalizationManifestByteSha256: manifestSha,
})
const canonicalText = canonicalStringify(corpus)
const canonicalSha = sha256(Buffer.from(canonicalText, 'utf8'))

const v12Sha = sha256(fs.readFileSync(v12Path))
const earlyYearsNormalizedText = fs.readFileSync(earlyYearsPath, 'utf8').replace(/\r\n/g, '\n')
const earlyYearsSha = sha256(Buffer.from(earlyYearsNormalizedText, 'utf8'))
const earlyYearsCommit = lastCommitFor(earlyYearsPath)
const oldCanonical = historicalBlob('350e947', canonicalPath)
const oldManifest = historicalBlob('6eea677', manifestPath)
const firstCommittedV13 = historicalBlob('a2fbb7a', v13Path)

const lock = {
  schemaVersion: '1.0.0',
  policy: 'ASSPS_REFERENCE_CORPUS_IMMUTABILITY',
  sourceAuthority: {
    dataset: path.basename(v13Path),
    datasetVersion: v13.version,
    paperCount: v13.papers.length,
    baselineCommit: sourceCommit,
    sha256: v13Sha,
  },
  files: [
    { name:path.basename(v12Path), role:'historical-reference', path:rel(v12Path), sha256:v12Sha, hashMode:'raw-bytes', immutable:true },
    { name:path.basename(v13Path), role:'operational-authority', path:rel(v13Path), sha256:v13Sha, hashMode:'raw-bytes', immutable:true, baselineCommit:sourceCommit },
    { name:path.basename(earlyYearsPath), role:'protected-early-years-source', path:rel(earlyYearsPath), sha256:earlyYearsSha, hashMode:'utf8-lf-normalized', immutable:true, baselineCommit:earlyYearsCommit },
    { name:path.basename(manifestPath), role:'derived-normalization-manifest', path:rel(manifestPath), sha256:manifestSha, hashMode:'raw-bytes', derivedFromSha256:v13Sha },
    { name:path.basename(canonicalPath), role:'derived-canonical-corpus', path:rel(canonicalPath), sha256:canonicalSha, hashMode:'raw-bytes', derivedFromSha256:manifestSha },
  ],
  historicalGitReferences: [
    { name:'canonical-v2-pre-convergence', ref:'350e947', ...oldCanonical, path:rel(canonicalPath) },
    { name:'normalization-manifest-initial-freeze', ref:'6eea677', ...oldManifest, path:rel(manifestPath) },
    { name:'first-committed-v13', ref:'a2fbb7a', ...firstCommittedV13, path:rel(v13Path) },
  ],
  rules: {
    sourceChangesRequireReviewedReconciliation: true,
    derivedArtifactsMustMatchSource: true,
    productionRouteSwitchRequiresParityGate: true,
    historicalArtifactsRemainAvailableThroughGit: true,
  },
}
const lockText = canonicalStringify(lock)

const candidates = [
  [manifestPath, manifestText],
  [canonicalPath, canonicalText],
  [lockPath, lockText],
]
const write = process.argv.includes('--write')
const report = {
  mode: write ? 'write' : 'check',
  sourceCommit,
  v13Sha256: v13Sha,
  manifestSha256: manifestSha,
  canonicalSha256: canonicalSha,
  paperCount: v13.papers.length,
  files: [],
}

for (const [filePath, content] of candidates) {
  const before = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
  const matches = before === content
  if (write && !matches) {
    fs.mkdirSync(path.dirname(filePath), { recursive:true })
    fs.writeFileSync(filePath, content, 'utf8')
  }
  report.files.push({ path:rel(filePath), matches, written:write && !matches })
}

console.log(JSON.stringify(report, null, 2))
if (!write && report.files.some(item => !item.matches)) process.exitCode = 2
