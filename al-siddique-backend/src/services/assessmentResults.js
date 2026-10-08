const crypto = require('crypto')
const { pool } = require('../config/database')

const ScoreState = Object.freeze({
  SCORED:'SCORED',
  NOT_ATTEMPTED:'NOT_ATTEMPTED',
  ABSENT:'ABSENT',
  NOT_CHECKED:'NOT_CHECKED',
  EXEMPT:'EXEMPT',
})
const SCORE_STATES = new Set(Object.values(ScoreState))

function finite(value) {
  const n=Number(value)
  return Number.isFinite(n) ? n : 0
}
function stableResultId(releaseId, studentKey) {
  return `result-${crypto.createHash('sha256').update(`${releaseId}|${studentKey}`).digest('hex').slice(0,24)}`
}
function sectionMax(section={}) {
  return Math.max(0, finite(section.authoritativeSectionTotal ?? section.operationalSectionTotal))
}
function buildQuestionInstances(snapshot={}) {
  const sections=Array.isArray(snapshot.sections)?snapshot.sections:[]
  return sections.map((section,index)=>({
    questionInstanceId:String(section.id || `section-${index+1}`),
    displayLabel:`Q${index+1}`,
    maximumMarks:sectionMax(section),
  }))
}
function normalizeEntries(snapshot, entries=[]) {
  const instances=buildQuestionInstances(snapshot)
  const byId=new Map((Array.isArray(entries)?entries:[]).map(entry=>[String(entry.questionInstanceId||''),entry]))
  const errors=[]
  const normalized=instances.map(instance=>{
    const raw=byId.get(instance.questionInstanceId) || {}
    const state=String(raw.state || ScoreState.NOT_CHECKED).toUpperCase()
    if(!SCORE_STATES.has(state)) errors.push(`${instance.questionInstanceId}: invalid score state`)
    let score=null
    if(state===ScoreState.SCORED){
      score=Number(raw.score)
      if(!Number.isFinite(score) || score<0 || score>instance.maximumMarks){
        errors.push(`${instance.questionInstanceId}: score must be between 0 and ${instance.maximumMarks}`)
        score=null
      }
    }
    return {...instance,state:SCORE_STATES.has(state)?state:ScoreState.NOT_CHECKED,score}
  })
  for(const id of byId.keys()) if(!instances.some(x=>x.questionInstanceId===id)) errors.push(`${id}: unknown question instance`)
  return {instances:normalized,errors}
}
function summarizeResult(snapshot, entries) {
  const normalized=normalizeEntries(snapshot,entries)
  const scoringMaximum=Math.max(0,finite(snapshot?.scoringPlan?.maximumObtainableMarks))
  const sectionMaximum=normalized.instances.reduce((sum,item)=>sum+item.maximumMarks,0)
  const maximumMarks=scoringMaximum || sectionMaximum
  const obtainedMarks=normalized.instances.reduce((sum,item)=>sum+(item.state===ScoreState.SCORED?finite(item.score):0),0)
  if(obtainedMarks>maximumMarks+1e-9) normalized.errors.push(`obtained marks ${obtainedMarks} exceed maximum ${maximumMarks}`)
  return {...normalized,obtainedMarks,maximumMarks}
}

async function saveResultRevision({
  schoolId, releaseId, studentKey, studentSnapshot={}, resultId=null,
  expectedRevision=0, entries=[], reason=null, status='IN_PROGRESS', actorKey='unknown'
}) {
  if(!Number.isInteger(Number(schoolId)) || Number(schoolId)<=0) throw Object.assign(new Error('schoolId required'),{code:'RESULT_INVALID'})
  if(!releaseId || !studentKey) throw Object.assign(new Error('releaseId and studentKey required'),{code:'RESULT_INVALID'})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(`SELECT set_config('app.rls_enabled','true',true), set_config('app.tenant_id',$1,true), set_config('app.is_super_admin','false',true)`,[String(schoolId)])
    const release=(await client.query(`SELECT release_id,snapshot_json FROM assessment_releases WHERE school_id=$1 AND release_id=$2`,[schoolId,releaseId])).rows[0]
    if(!release) throw Object.assign(new Error('assessment release not found'),{code:'ASSESSMENT_RELEASE_NOT_FOUND'})
    const summary=summarizeResult(release.snapshot_json,entries)
    if(summary.errors.length) throw Object.assign(new Error(summary.errors.join(' | ')),{code:'RESULT_VALIDATION_FAILED',details:summary.errors})
    const rid=resultId || stableResultId(releaseId,studentKey)
    let record=(await client.query(`SELECT * FROM assessment_result_records WHERE school_id=$1 AND result_id=$2 FOR UPDATE`,[schoolId,rid])).rows[0]
    if(!record){
      if(Number(expectedRevision)!==0) throw Object.assign(new Error('result revision conflict'),{code:'RESULT_REVISION_CONFLICT',currentRevision:0})
      record=(await client.query(`
        INSERT INTO assessment_result_records(school_id,result_id,release_id,student_key,student_snapshot,status,current_revision,created_by_key,updated_by_key)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,0,$7,$7) RETURNING *
      `,[schoolId,rid,releaseId,studentKey,JSON.stringify(studentSnapshot||{}),status,actorKey])).rows[0]
    } else {
      if(record.release_id!==releaseId || record.student_key!==studentKey) throw Object.assign(new Error('result identity mismatch'),{code:'RESULT_IDENTITY_MISMATCH'})
      if(Number(expectedRevision)!==Number(record.current_revision)) throw Object.assign(new Error('result revision conflict'),{code:'RESULT_REVISION_CONFLICT',currentRevision:Number(record.current_revision)})
    }
    const nextRevision=Number(record.current_revision)+1
    await client.query(`
      INSERT INTO assessment_result_revisions(school_id,result_record_id,revision_number,entries_json,obtained_marks,maximum_marks,revision_reason,created_by_key)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
    `,[schoolId,record.id,nextRevision,JSON.stringify(summary.instances),summary.obtainedMarks,summary.maximumMarks,reason,actorKey])
    await client.query(`
      UPDATE assessment_result_records SET current_revision=$3,status=$4,student_snapshot=$5::jsonb,updated_by_key=$6,updated_at=NOW()
      WHERE school_id=$1 AND id=$2
    `,[schoolId,record.id,nextRevision,status,JSON.stringify(studentSnapshot||record.student_snapshot||{}),actorKey])
    await client.query('COMMIT')
    return {resultId:rid,currentRevision:nextRevision,status,entries:summary.instances,obtainedMarks:summary.obtainedMarks,maximumMarks:summary.maximumMarks}
  } catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { client.release() }
}

module.exports={ScoreState,buildQuestionInstances,normalizeEntries,summarizeResult,saveResultRevision,stableResultId}
