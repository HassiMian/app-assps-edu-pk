const test=require('node:test'),assert=require('node:assert/strict')
const {parseArgs}=require('../qbank/audit-tenant-evidence.cjs')
test('tenant evidence CLI refuses production database and ambiguous identity',()=>{
 const old={DB_NAME:process.env.DB_NAME,DB_RUNTIME_ROLE:process.env.DB_RUNTIME_ROLE}
 try{
  process.env.DB_NAME='apexos'
  process.env.DB_RUNTIME_ROLE='apex_app_runtime'
  assert.throws(()=>parseArgs(['--school-id','5','--school-code','al-siddique']),/DISPOSABLE_DB/)
  process.env.DB_NAME='assps_qbank_intake_stage_unit'
  assert.throws(()=>parseArgs(['--school-id','0','--school-code','al-siddique']),/EXACT_CODE/)
  assert.throws(()=>parseArgs(['--school-id','5','--school-code','AL SIDDIQUE SCHOLARS PUBLIC SCHOOL']),/EXACT_CODE/)
  assert.deepEqual(parseArgs(['--school-id','5','--school-code','al-siddique']),
    {schoolId:5,schoolCode:'al-siddique'})
 }finally{
   for(const [k,v] of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v
 }
})
