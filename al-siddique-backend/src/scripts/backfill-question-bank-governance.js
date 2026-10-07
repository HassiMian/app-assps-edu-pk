const { pool } = require('../config/database')
const { captureQuestionGovernance } = require('../services/questionBankGovernance')

async function main(){
  if(process.env.ALLOW_QBANK_GOVERNANCE_BACKFILL!=='YES') throw new Error('Set ALLOW_QBANK_GOVERNANCE_BACKFILL=YES explicitly')
  const {rows}=await pool.query(`SELECT * FROM question_bank ORDER BY school_id,created_at,id`)
  const stats={scanned:rows.length,captured:0,duplicates:0,replayed:0,errors:0}
  for(const row of rows){
    try{
      const result=await captureQuestionGovernance({schoolId:row.school_id,userId:row.created_by||null,idempotencyKey:`legacy-backfill:${row.school_id}:${row.id}`,question:row,sourceQuestionBankId:row.id})
      stats.captured++; if(result.duplicate)stats.duplicates++; if(result.replayed)stats.replayed++
    }catch(error){stats.errors++;console.error(JSON.stringify({id:row.id,schoolId:row.school_id,code:error.code||null,message:error.message}))}
  }
  const counts=(await pool.query(`SELECT lifecycle_status,count(*)::int n FROM question_masters GROUP BY lifecycle_status ORDER BY lifecycle_status`)).rows
  const revisions=Number((await pool.query(`SELECT count(*)::int n FROM question_revisions`)).rows[0].n)
  console.log(JSON.stringify({...stats,lifecycle:counts,revisions},null,2))
  if(stats.errors)process.exitCode=2
}
main().finally(()=>pool.end())
