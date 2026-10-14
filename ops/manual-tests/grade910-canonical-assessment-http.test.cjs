'use strict'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path')
const express=require(require.resolve('express',{paths:[path.join(__dirname,'../../al-siddique-backend')]}))
const {sha}=require('../../al-siddique-backend/src/services/grade910VerifiedPublicationContract')
const H='a'.repeat(64),question={text:'DNA stores what?',marks:2},answer={answer:'Genetic information'}
const published={id:1,school_id:11,original_question_id:'IX-BIO-Q7',question_revision:7,
 question_sha:sha(question),answer_sha:sha(answer),publication_grant_sha:H,original_source_pdf_sha:H,
 verified_review_packet_sha:H,qualified_faculty_receipt_sha:H,school_book_certificate_sha:H,principal_approval_sha:H,
 catalog_id:'synthetic-qa',grade:9,subject:'Biology',medium:'english',
 paper_payload:{originalQuestionId:'IX-BIO-Q7',questionRevision:7,finalQuestion:question,finalAnswer:answer},
 academic_approval_verified:true,paper_studio_acceptance_verified:true,core_restricted_release_verified:true,
 published_at:'2026-10-14T00:00:00Z',revoked_at:null}
function document(){
 return {format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,
 documentOrigin:'USER_AUTHORED',sourceIdentity:null,metadata:{classLevel:'9th',subjectName:'Biology'},
 sections:[{id:'manual-section-verified-IX-BIO-Q7-rev-7',nodes:[{content:'DNA stores what?',authoritativeNodeMarks:2}]}],
 grade910Verified:{grade:9,subject:'Biology',section:'Usman',refs:[{
  sectionId:'verified-IX-BIO-Q7-rev-7',originalQuestionId:'IX-BIO-Q7',revision:7,
  questionSha:published.question_sha,answerSha:published.answer_sha,publicationGrantSha:H}]}}
}
let stored=null,rev=0,revoked=false
const authPath=require.resolve('../../al-siddique-backend/src/middleware/auth')
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
 protect:(req,res,next)=>{if(!req.get('x-qa-session'))return res.status(401).json({success:false});req.user={id:20,role:'principal',school_id:11};next()},
 requireRoles:()=>(req,res,next)=>next()
}}
const tenantPath=require.resolve('../../al-siddique-backend/src/middleware/tenant')
require.cache[tenantPath]={id:tenantPath,filename:tenantPath,loaded:true,exports:{
 currentSchoolId:req=>req.user.school_id,
 tenantClause:async()=>({clause:'',params:[]})
}}
const client={async query(sql,args){
 if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql.includes('set_config'))return{rows:[]}
 if(sql.includes('grade910_verified_paper_publications'))return{rows:revoked?[]:[published]}
 if(sql.includes('SELECT id FROM assessment_papers'))return{rows:[{id:99}]}
 if(sql.includes('SELECT j.* FROM assessment_print_jobs j'))return{rows:[{
  release_id:'qa-release-7',roster_snapshot_id:'qa-roster',binding_snapshot_json:{},
  render_settings_json:{},copy_count:1,personalized:false,duplex:false,
  student_boundary_policy:'SINGLE_STUDENT',reprint_mode:'REPRINT_ORIGINAL'}]}
 if(sql.includes('SELECT snapshot_json FROM assessment_releases'))return{rows:[{snapshot_json:stored}]}
 if(sql.includes('INSERT INTO assessment_print_jobs'))return{rows:[{print_job_id:'qa-new-reprint',status:'CREATED'}]}
 if(sql.includes('SELECT * FROM assessment_papers'))return{rows:rev?[{id:99,current_revision:rev}]:[]}
 if(sql.includes('INSERT INTO assessment_papers'))return{rows:[{id:99,current_revision:0}]}
 if(sql.includes('INSERT INTO assessment_paper_revisions')){stored=JSON.parse(args[3]);return{rows:[]}}
 if(sql.includes('UPDATE assessment_papers')){rev=args[3];return{rows:[]}}
 throw Error('Unmocked QA SQL: '+sql.slice(0,95))
 },async release(){}}
const dbPath=require.resolve('../../al-siddique-backend/src/config/database')
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{
 pool:{connect:async()=>client},
 query:async(sql)=> {
  if(sql.includes('SELECT p.public_id'))return{rowCount:stored?1:0,
    rows:stored?[{public_id:'qa-paper-01',title:'Test',current_revision:rev,document_json:stored,content_hash:'mock'}]:[]}
  return{rows:[],rowCount:0}
 }
}}
const router=require('../../al-siddique-backend/src/routes/assessmentStudioRoutes')
test('authenticated canonical Save → Reopen → Print revalidation and live revoke rejection',async t=>{
 const app=express();app.use(express.json({limit:'1mb'}));app.use('/api/assessment-studio',router)
 const server=app.listen(0,'127.0.0.1');t.after(()=>server.close())
 await new Promise(resolve=>server.once('listening',resolve))
 const base='http://127.0.0.1:'+server.address().port+'/api/assessment-studio'
 const json=(endpoint,body,session=true)=>fetch(base+endpoint,{
  method:'POST',headers:{'Content-Type':'application/json',...(session?{'x-qa-session':'principal'}:{})},
  body:JSON.stringify(body)})
 const unauth=await json('/verify-grade910-paper',{document:document()},false)
 assert.equal(unauth.status,401)
 const save=await json('/papers/qa-paper-01/revisions',{expectedRevision:0,title:'Verified QA paper',document:document()})
 assert.equal(save.status,201,await save.text().catch(()=>''));assert.equal(rev,1)
 const reopen=await fetch(base+'/papers/qa-paper-01',{headers:{'x-qa-session':'principal'}})
 assert.equal(reopen.status,200);assert.equal((await reopen.json()).data.document_json.grade910Verified.refs.length,1)
 const reprintBody={reprintMode:'REPRINT_ORIGINAL',parentPrintJobId:'qa-parent',printJobId:'qa-new-reprint'}
 const reprint=await json('/papers/qa-paper-01/print-jobs',reprintBody)
 assert.equal(reprint.status,201)
 const print=await json('/verify-grade910-paper',{document:stored})
 assert.equal(print.status,200);assert.equal((await print.json()).data.verifiedCount,1)
 revoked=true
 const reprintRevoked=await json('/papers/qa-paper-01/print-jobs',reprintBody)
 assert.equal(reprintRevoked.status,409)
 const denied=await json('/verify-grade910-paper',{document:stored})
 assert.equal(denied.status,409)
 const reopenRevoked=await fetch(base+'/papers/qa-paper-01',{headers:{'x-qa-session':'principal'}})
 assert.notEqual(reopenRevoked.status,200)
 const changed=structuredClone(stored);changed.sections[0].nodes[0].content='tampered'
 const edit=await json('/papers/qa-paper-01/revisions',{expectedRevision:1,document:changed})
 assert.notEqual(edit.status,201);assert.equal(rev,1)
})
