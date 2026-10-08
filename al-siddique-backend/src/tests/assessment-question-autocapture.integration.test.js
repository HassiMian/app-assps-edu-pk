process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { pool } = require('../config/database')
const { captureFinalizedAssessmentQuestions } = require('../services/assessmentQuestionAutoCapture')
const { withTenantTransaction } = require('../services/questionBankGovernance')

test('finalized assessment capture is Candidate, idempotent, duplicate-aware, revisioned and mapped', {timeout:30000}, async t => {
  t.after(async()=>{ await pool.end().catch(()=>{}) })
  const schoolId = 1
  const suffix = crypto.randomBytes(6).toString('hex')
  const questionText = 'Auto capture force question ' + suffix
  const baseSnapshot = {
    metadata:{ classLevel:'7', subject:'Science', language:'english' },
    assessment:{ scope:{ chapterId:'ch-' + suffix, label:'Force ' + suffix, learningScopeIds:['slo-' + suffix] } },
    sections:[{
      id:'section-1',
      title:'Short Questions',
      nodes:[{
        id:'node-1',
        type:'short_question',
        stemText:questionText,
        authoritativeNodeMarks:2,
        answer:'A push or pull.',
      }],
    }],
  }

  const release1 = 'autocap-r1-' + suffix
  const first = await captureFinalizedAssessmentQuestions({
    schoolId, releaseId:release1, paperPublicId:'paper-' + suffix, snapshot:baseSnapshot,
  })
  assert.equal(first.total,1)
  assert.equal(first.captured,1)
  assert.equal(first.created,1)
  assert.equal(first.replayed,0)
  assert.equal(first.failed,0)
  assert.equal(first.results[0].lifecycleStatus,'candidate')

  const replay = await captureFinalizedAssessmentQuestions({
    schoolId, releaseId:release1, paperPublicId:'paper-' + suffix, snapshot:baseSnapshot,
  })
  assert.equal(replay.captured,1)
  assert.equal(replay.replayed,1)
  assert.equal(replay.created,0)

  const release2 = 'autocap-r2-' + suffix
  const duplicate = await captureFinalizedAssessmentQuestions({
    schoolId, releaseId:release2, paperPublicId:'paper-' + suffix, snapshot:baseSnapshot,
  })
  assert.equal(duplicate.created,0)
  assert.equal(duplicate.duplicates,1)
  assert.equal(duplicate.revisions,0)

  const correctedSnapshot = JSON.parse(JSON.stringify(baseSnapshot))
  correctedSnapshot.sections[0].nodes[0].answer = 'Force is a push or a pull.'
  const release3 = 'autocap-r3-' + suffix
  const corrected = await captureFinalizedAssessmentQuestions({
    schoolId, releaseId:release3, paperPublicId:'paper-' + suffix, snapshot:correctedSnapshot,
  })
  assert.equal(corrected.created,0)
  assert.equal(corrected.revisions,1)

  const state = await withTenantTransaction(schoolId, async client => {
    const master = (await client.query(
      "SELECT id,lifecycle_status,current_revision FROM question_masters WHERE school_id=$1 AND canonical_fingerprint=$2",
      [schoolId, first.results[0].canonicalFingerprint]
    )).rows[0]
    const mappings = (await client.query(
      "SELECT mapping_type,mapping_key,mapping_status FROM question_mappings WHERE school_id=$1 AND question_master_id=$2 ORDER BY mapping_type,mapping_key",
      [schoolId, master.id]
    )).rows
    return { master, mappings }
  })

  assert.equal(state.master.lifecycle_status,'candidate')
  assert.equal(Number(state.master.current_revision),2)
  const releaseMappings = state.mappings.filter(x=>x.mapping_type==='assessment_release')
  assert.deepEqual(new Set(releaseMappings.map(x=>x.mapping_key)), new Set([release1,release2,release3]))
  assert.ok(state.mappings.some(x=>x.mapping_type==='class_level' && x.mapping_key==='7'))
  assert.ok(state.mappings.some(x=>x.mapping_type==='subject' && x.mapping_key==='Science'))
  assert.ok(state.mappings.some(x=>x.mapping_type==='learning_scope_id' && x.mapping_key==='slo-' + suffix))

  const optOut = await captureFinalizedAssessmentQuestions({
    schoolId,
    releaseId:'autocap-optout-' + suffix,
    paperPublicId:'paper-' + suffix,
    snapshot:{...baseSnapshot,assessment:{...baseSnapshot.assessment,captureToQuestionBank:false}},
  })
  assert.equal(optOut.eligible,false)
  assert.equal(optOut.total,0)
})
