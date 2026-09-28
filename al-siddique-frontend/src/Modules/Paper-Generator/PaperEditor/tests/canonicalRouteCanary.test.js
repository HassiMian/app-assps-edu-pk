import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolvePaperRoute } from '../../resolvePaperRoute.js'
import {
  resolvePaperEditorRoute,
  isPristineOfficialV13Paper,
} from '../editorV2/canonicalRouteGuards.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const v13Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const v13 = JSON.parse(fs.readFileSync(v13Path, 'utf8'))

test('Phase 15: default official routing remains stable with canary off', () => {
  for (const paper of v13.papers) {
    assert.strictEqual(resolvePaperRoute(paper), 'build', paper.id)
    assert.strictEqual(
      resolvePaperRoute(paper, 'word_editor'),
      'build',
      `${paper.id}: targetTab must not bypass default official routing`
    )
  }
})

test('Phase 15: explicit official canary sends all pristine V13 papers through canonical guard', () => {
  assert.strictEqual(v13.papers.length, 43)
  for (const paper of v13.papers) {
    assert.strictEqual(isPristineOfficialV13Paper(paper), true, `${paper.id} must be pristine`)
    assert.strictEqual(
      resolvePaperRoute(paper, null, { officialCanonicalCanary: true }),
      'word_editor',
      `${paper.id}: canary must enter guarded editor chain`
    )
    const decision = resolvePaperEditorRoute(paper)
    assert.strictEqual(decision.route, 'CANONICAL_V2', `${paper.id}: ${decision.reason}`)
    assert.strictEqual(decision.reason, 'PRISTINE_V13_CONVERTED_TO_CANONICAL')
    assert.strictEqual(decision.resolvedPaper?.schemaVersion, 3)
    assert.ok(decision.resolvedPaper?.id?.startsWith('doc__'))
  }
})
test('Phase 15: modified official V13 is rejected by canonical guard', () => {
  const source = v13.papers.find(paper => paper.id === 'official-first-term-2026-class-5-english')
  assert.ok(source)
  const modified = structuredClone(source)
  modified.selectedQuestions.official_section.questions[0].content += '\nUSER MODIFICATION'

  assert.strictEqual(isPristineOfficialV13Paper(modified), false)
  assert.strictEqual(
    resolvePaperRoute(modified, null, { officialCanonicalCanary: true }),
    'word_editor'
  )
  const decision = resolvePaperEditorRoute(modified)
  assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2')
  assert.strictEqual(decision.reason, 'MODIFIED_OR_CUSTOM_V13_PRESERVED_IN_LEGACY')
})

test('Phase 15: legacy V12, Early Years and board-pattern routes do not change under canary', () => {
  const policy = { officialCanonicalCanary: true }

  assert.strictEqual(
    resolvePaperRoute({
      id: 'official-first-term-2026-class-5-urdu',
      documentFormat: 'official-v12',
    }, null, policy),
    'build'
  )

  assert.strictEqual(
    resolvePaperRoute({ id: 'ey-starter-english-2026', classStage: 'starter' }, null, policy),
    'early_years'
  )

  assert.strictEqual(
    resolvePaperRoute({ id: 'custom-board', structureMode: 'board_pattern' }, null, policy),
    'board_pattern'
  )
})

test('Phase 15: canonical official document can enter canary editor but remains build by default', () => {
  const canonicalPaper = {
    id: 'doc__official-first-term-2026-class-5-english',
    schemaVersion: 2,
    documentFormat: 'canonical-v2',
  }
  assert.strictEqual(resolvePaperRoute(canonicalPaper), 'build')
  assert.strictEqual(
    resolvePaperRoute(canonicalPaper, null, { officialCanonicalCanary: true }),
    'word_editor'
  )
})

test('Phase 16: schedule-only header metadata changes remain canonical-safe', () => {
  const source = v13.papers.find(paper => paper.id === 'official-first-term-2026-class-1-countdown-mathematics')
  assert.ok(source)

  const scheduled = structuredClone(source)
  scheduled.config.examDate = '2026-09-30'
  scheduled.config.timeAllowed = '2 Hours'

  assert.strictEqual(isPristineOfficialV13Paper(scheduled), true)
  const decision = resolvePaperEditorRoute(scheduled)
  assert.strictEqual(decision.route, 'CANONICAL_V2')
  assert.strictEqual(decision.resolvedPaper?.metadata?.examDate, '2026-09-30')
  assert.strictEqual(decision.resolvedPaper?.metadata?.timeAllowed, '2 Hours')
})

test('Phase 16: academic marks mutation still fails pristine canonical guard', () => {
  const source = v13.papers.find(paper => paper.id === 'official-first-term-2026-class-5-english')
  assert.ok(source)

  const modified = structuredClone(source)
  modified.config.totalMarks = Number(modified.config.totalMarks || 0) + 1

  assert.strictEqual(isPristineOfficialV13Paper(modified), false)
  const decision = resolvePaperEditorRoute(modified)
  assert.strictEqual(decision.route, 'LEGACY_CANVAS_V2')
})
