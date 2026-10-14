#!/usr/bin/env node
'use strict'
// Live-only read-only evidence collection; intentionally never alters production state.
function status(exists){return exists?'PRESENT_NOT_YET_RELEASE_CERTIFIED':'ABSENT'}
async function inspectReadOnly(client,schoolId=1){
 if(!Number.isSafeInteger(schoolId)||schoolId<1)throw Error('SCHOOL_ID_REQUIRED')
 await client.query('BEGIN TRANSACTION READ ONLY')
 try{
  const meta=await client.query(`
   SELECT to_regclass('public.grade910_human_signoff_evidence')::text AS signoffs,
          to_regclass('public.grade910_verified_paper_publications')::text AS publications,
          to_regprocedure('core_security.signed_school_allowed(integer)')::text AS signed_guard
  `)
  const user=await client.query(`
   SELECT role,count(*)::int AS total FROM users
   WHERE school_id=$1 AND is_active=true AND role IN ('teacher','principal','admin','school_admin')
   GROUP BY role ORDER BY role`,[schoolId])
  const counts=await client.query(`
   SELECT (SELECT count(*)::int FROM students WHERE school_id=$1) AS students,
          (SELECT count(*)::int FROM exam_results WHERE school_id=$1) AS exam_results,
          (SELECT count(*)::int FROM question_bank WHERE school_id=$1) AS question_bank
  `,[schoolId])
  const m=meta.rows[0]||{},rollup=Object.fromEntries(user.rows.map(x=>[x.role,Number(x.total)]))
  let storedClaims=0,verifiedPublished=0
  if(m.signoffs){
   const q=await client.query('SELECT count(*)::int AS total FROM grade910_human_signoff_evidence WHERE school_id=$1',[schoolId])
   storedClaims=Number(q.rows[0]?.total||0)
  }
  if(m.publications){
   const q=await client.query(`
    SELECT count(*)::int AS total FROM grade910_verified_paper_publications
    WHERE school_id=$1 AND revoked_at IS NULL AND academic_approval_verified=true
    AND paper_studio_acceptance_verified=true AND core_restricted_release_verified=true
   `,[schoolId])
   verifiedPublished=Number(q.rows[0]?.total||0)
  }
  await client.query('COMMIT')
  return {
   schoolId,
   schoolStaffRoles:rollup,
   originalPreservationCounts:counts.rows[0],
   signoffStorage:status(m.signoffs),verifiedPublicationStorage:status(m.publications),
   signedCorePredicateInstalled:Boolean(m.signed_guard),
   submittedHumanClaims:storedClaims,
   candidateVerifiedPublicationRows:verifiedPublished,
   academicIndependentlyCertified:false,
   authenticatedStaffSaveReopenPrintCertified:false,
   signedActiveProductionRoleCertified:false,
   liveTrafficRollbackCertified:false,
   academicallyVerifiedProductionRelease:false,
   decision:'HOLD_AUTHENTIC_SCHOOL_FACULTY_PAPER_STUDIO_CORE_ACCEPTANCE',
   note:'Counts and table existence alone are NOT human signatures, authenticated reviewer correctness, paper render acceptance or live rollback.'
  }
 }catch(error){
  try{await client.query('ROLLBACK')}catch(_){}
  throw error
 }
}
async function execute(options={}){
 const pg=options.pg||require('pg'),config=options.config||{}
 const schoolId=Number(options.schoolId||process.env.ASSPS_QBANK_PROBE_SCHOOL_ID||1)
 const client=options.client||new pg.Client(config)
 const owns=!options.client
 try{
  if(owns)await client.connect()
  return await inspectReadOnly(client,schoolId)
 }finally{if(owns)await client.end()}
}
if(require.main===module){
 execute({config:{
  host:process.env.PGHOST||'/var/run/postgresql',
  port:Number(process.env.PGPORT||5432),
  database:process.env.PGDATABASE||'apexos',
  user:process.env.PGUSER||'postgres',
  connectionTimeoutMillis:3000,
 }}).then(x=>{console.log(JSON.stringify(x,null,2));process.exitCode=2},e=>{
  console.error('GRADE910_LIVE_READONLY_PROBE_BLOCKED:',e.code||e.message);process.exitCode=2})
}
module.exports={inspectReadOnly,execute}
