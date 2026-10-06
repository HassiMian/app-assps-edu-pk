const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname,'../services/papers/curriculumReviewedEvidenceV6G2')
const g6 = JSON.parse(fs.readFileSync(path.join(root,'biology9ExerciseQuestionPageCoverageV6G6.json'),'utf8'))
const g5 = JSON.parse(fs.readFileSync(path.join(root,'biology9Chapter1QuestionPageMapV6G5.json'),'utf8'))
const ledgers = {
  English: JSON.parse(fs.readFileSync(path.join(root,'biology9EnglishEvidenceLedger.json'),'utf8')),
  Urdu: JSON.parse(fs.readFileSync(path.join(root,'biology9UrduEvidenceLedger.json'),'utf8')),
}

function sections(chapter) {
  const exercise = chapter.exercise || chapter.exerciseSource || {}
  return Array.isArray(exercise) ? exercise : (exercise.sections || [])
}
function ledgerRefs(medium) {
  const out = new Map()
  for (const ch of ledgers[medium].chapters || []) {
    for (const sec of sections(ch)) {
      for (const ref of sec.questionSourceRefs || []) {
        out.set(ref,{chapter:ch.number,section:sec.label || sec.visibleLabel,questionType:sec.type,first:sec.firstPhysicalPage,last:sec.lastPhysicalPage})
      }
    }
  }
  return out
}
function g5Refs(medium) {
  const source = g5.sources?.[medium] || g5[medium] || {}
  const rows = source.items || source.mapped || source.questions || []
  return new Map(rows.map(x=>[x.sourceRef,x]))
}

for (const medium of ['English','Urdu']) {
  test(`${medium} G6 coverage never guesses a multi-page section`,()=>{
    const source = g6.sources[medium]
    const refs = ledgerRefs(medium)
    const exact = g5Refs(medium)
    const seen = new Set()
    for (const row of source.mapped || []) {
      assert.ok(refs.has(row.sourceRef),`unknown ref ${row.sourceRef}`)
      assert.equal(seen.has(row.sourceRef),false,`duplicate mapped ref ${row.sourceRef}`)
      seen.add(row.sourceRef)
      const origin = refs.get(row.sourceRef)
      assert.equal(row.chapter,origin.chapter)
      if (row.verificationStatus === 'DETERMINISTIC_SINGLE_PAGE_SECTION') {
        assert.equal(origin.first,origin.last,`deterministic mapping came from multi-page section ${row.sourceRef}`)
        assert.equal(row.verifiedPhysicalPage,origin.first)
      } else if (row.verificationStatus === 'VISUALLY_VERIFIED_EXACT_PAGE') {
        const g5row = exact.get(row.sourceRef)
        assert.ok(g5row,`visual mapping missing from G5 ${row.sourceRef}`)
        const expected = g5row.verifiedPhysicalPage ?? g5row.page ?? g5row.physicalPage
        assert.equal(row.verifiedPhysicalPage,expected)
      } else {
        assert.fail(`unsupported mapping status ${row.verificationStatus}`)
      }
    }
    for (const row of source.unresolved || []) {
      assert.ok(refs.has(row.sourceRef),`unknown unresolved ref ${row.sourceRef}`)
      assert.equal(seen.has(row.sourceRef),false,`ref both mapped and unresolved ${row.sourceRef}`)
      seen.add(row.sourceRef)
      const origin = refs.get(row.sourceRef)
      assert.notEqual(origin.first,origin.last,`single-page ref left unresolved ${row.sourceRef}`)
      assert.equal(row.verifiedPhysicalPage ?? null,null)
    }
    assert.equal(seen.size,refs.size,`coverage mismatch: seen=${seen.size} ledger=${refs.size}`)
  })
}

test('G6 summary matches computed coverage and keeps question text out',()=>{
  let total=0,mapped=0,unresolved=0
  for (const medium of ['English','Urdu']) {
    const source=g6.sources[medium]
    total += (source.mapped||[]).length + (source.unresolved||[]).length
    mapped += (source.mapped||[]).length
    unresolved += (source.unresolved||[]).length
    for (const row of [...(source.mapped||[]),...(source.unresolved||[])]) {
      assert.equal(Object.prototype.hasOwnProperty.call(row,'questionText'),false)
    }
  }
  assert.equal(g6.summary.combined.totalRefs,total)
  assert.equal(g6.summary.combined.exactMapped,mapped)
  assert.equal(g6.summary.combined.unresolved,unresolved)
  assert.equal(g6.policy.noPageGuessing,true)
  assert.equal(g6.policy.questionTextCopied,false)
  assert.equal(g6.policy.sourceLedgersMutated,false)
})
