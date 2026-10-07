const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

test('governance tables are in strict FORCE-RLS migration path and failures are fatal',()=>{
 const rls=fs.readFileSync(path.join(__dirname,'../config/migrations/005_rls_policies.js'),'utf8')
 const strictBlock=rls.match(/const strictTables\s*=\s*\[([\s\S]*?)\]/)?.[1] || ''
 for(const table of ['question_bank','question_bank_imports','question_masters','question_revisions','question_mappings','question_capture_requests','assessment_roster_snapshots','assessment_print_jobs']) assert.match(strictBlock,new RegExp(`['\"]${table}['\"]`))
 assert.match(rls,/ALTER TABLE \$\{table\} ENABLE ROW LEVEL SECURITY/)
 assert.match(rls,/ALTER TABLE \$\{table\} FORCE ROW LEVEL SECURITY/)
 assert.match(rls,/WITH CHECK/)
 const migrate=fs.readFileSync(path.join(__dirname,'../config/migrate.js'),'utf8')
 assert.ok(migrate.indexOf("007_question_bank_governance_v1") < migrate.indexOf("008_assessment_print_jobs_v1"))
 assert.ok(migrate.indexOf("008_assessment_print_jobs_v1") < migrate.indexOf("005_rls_policies"))
 assert.doesNotMatch(migrate,/Non-fatal, let the app start/)
 assert.match(migrate,/Security-critical authoring migration failed:[\s\S]*throw err/)
})
