require('/var/www/apex-backend/node_modules/dotenv').config({path:'/var/www/apex-backend/.env'})
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {pool}=require('../config/database')
const {reviewPortalPaperDocument}=require('../services/papers/portalDocumentBoundaryV6C')
const {pathToFileURL}=require('node:url')
const path=require('node:path')
const ROOT=path.join(__dirname,'../services/papers/saasReviewedContract')
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')

async function makeReviewedNewAuthoring(){
 const p=await import(pathToFileURL(path.join(ROOT,'curriculumPhase3PBridge.js')).href)
 const n=await import(pathToFileURL(path.join(ROOT,'newAuthoringPaperDocumentPhase3R.js')).href)
 const shaEn='a'.repeat(64),shaUr='b'.repeat(64)
 const identity={authority:'PECTAA',grade:9,subjectId:'biology',textbookId:'ix-bio-pair',edition:'2025-26',syllabusVersion:'ix-2025-26'}
 const academic=(id,type)=>{const en=['A','B','C','D'].map(v=>({id:v,text:id+' '+v}));const ur=['A','B','C','D'].map(v=>({id:v,text:'اردو '+id+' '+v}));return {id,type,marks:type==='mcq'?1:2,medium:'dual',chapter:{id:'IX-C1',number:1},topicId:'1.1',curriculum:{...identity},content:{en:{stem:'English '+id,answer:type==='mcq'?en[1].text:'Answer '+id,...(type==='mcq'?{options:en}:{})},ur:{stem:'اردو '+id,answer:type==='mcq'?ur[1].text:'جواب '+id,...(type==='mcq'?{options:ur}:{})}},correctOptionId:type==='mcq'?'B':null,review:{status:'approved'},source:{languages:{en:{pdfSha256:shaEn,page:8,paragraph:'reviewed-heading'},ur:{pdfSha256:shaUr,page:9,paragraph:'reviewed-heading'}}}}}
 const qs=[academic('m1','mcq'),academic('m2','mcq'),academic('s1','short'),academic('s2','short')]
 const projection={schema:p.PHASE3P_SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',identity,sourceBookIds:{en:'book-en',ur:'book-ur'},sourceChecksums:{en:shaEn,ur:shaUr},selection:{syllabusMode:'full',examYear:null},subjects:[{id:'biology9',classId:'nine',syllabusId:'ptb'}],chapters:[{id:'IX-C1',subjectId:'biology9',n:1,en:'Introduction',ur:'تعارف',topics:[{id:'1.1',en:'Science of Biology',ur:'حیاتیات کی سائنس'}]}],questions:qs.map(a=>({id:a.id,subjectId:'biology9',chapterId:a.chapter.id,topicId:a.topicId,type:a.type,marks:a.marks,text:a.content.en.stem,textUrdu:a.content.ur.stem,options:a.type==='mcq'?a.content.en.options.map((o,i)=>({label:o.id,text:o.text,textUrdu:a.content.ur.options[i].text})):[],answerEn:a.content.en.answer,answerUrdu:a.content.ur.answer,correctOptionId:a.correctOptionId,academicRecord:a}))}
 const blocks=[{id:'objectives',type:'mcq',questionIds:['m1','m2'],attemptAny:2},{id:'shorts',type:'short',questionIds:['s1','s2'],attemptAny:1}]
 const handoff=p.composeCurriculumPhase3PPreview({projection,blocks,medium:'en'})
 const doc=n.createNewAuthoringPaperDocument({handoff,draftId:'v6f2-rehearsal-draft-001',metadata:{title:'Synthetic V6F2 Biology',session:'2026-2027'}})
 assert.equal(n.validateNewAuthoringPaperDocument(doc).valid,true)
 const review=await reviewPortalPaperDocument(doc)
 assert.equal(review.family,'approved-curriculum-authoring')
 assert.equal(review.reviewStatus,'STRUCTURE_VALID_STAGING')
 assert.equal(review.canonicalWriteAllowed,false)
 return doc
}

async function expectSqlState(fn,state,label){let err=null;try{await fn()}catch(e){err=e}assert.ok(err,`${label}: expected failure`);assert.equal(err.code,state,`${label}: SQLSTATE`);return err}

;(async()=>{
 const doc=await makeReviewedNewAuthoring()
 const client=await pool.connect();let roleSet=false
 try{
  await client.query('BEGIN')
  const suffix=crypto.randomBytes(5).toString('hex')
  const schoolA=(await client.query("insert into schools(name,code,status,tenant_id) values($1,$2,'active',$2) returning id",[`Synthetic V6F2 A ${suffix}`,`v6f2a${suffix}`])).rows[0].id
  const schoolB=(await client.query("insert into schools(name,code,status,tenant_id) values($1,$2,'active',$2) returning id",[`Synthetic V6F2 B ${suffix}`,`v6f2b${suffix}`])).rows[0].id
  const user=(await client.query("insert into users(school_id,tenant_id,name,email,role,password,is_active) values($1,$2,'V6F2 Teacher',$3,'teacher','rehearsal-not-loginable',true) returning id",[schoolA,`v6f2a${suffix}`,`v6f2-${suffix}@invalid.example`])).rows[0].id
  await client.query('SET ROLE apex_paper_runtime');roleSet=true
  await client.query("select set_config('app.tenant_id',$1,true)",[String(schoolA)])
  await client.query("select set_config('app.paper_canonical_write_enabled','true',true)")
  const hash=sha(doc)
  const inserted=(await client.query(`insert into paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,title,class_name,section,subject_name,status,current_revision,payload_hash,payload,created_by,updated_by) values($1,$2,'approved-curriculum-authoring','assps-new-authoring-paper',1,$3,'9','','biology','draft',1,$4,$5::jsonb,$2,$2) returning id`,[schoolA,user,doc.metadata.title,hash,JSON.stringify(doc)])).rows[0]
  await client.query(`insert into paper_revisions(school_id,paper_document_id,revision,actor_user_id,event_kind,document_family,document_format,schema_version,payload_hash,payload) values($1,$2,1,$3,'canonical_create','approved-curriculum-authoring','assps-new-authoring-paper',1,$4,$5::jsonb)`,[schoolA,inserted.id,user,hash,JSON.stringify(doc)])
  const own=await client.query('select id,payload_hash from paper_documents where school_id=$1',[schoolA]);assert.equal(own.rowCount,1);assert.equal(own.rows[0].payload_hash.trim(),hash)
  console.log('PASS restricted runtime can write a reviewed synthetic document only with transaction-local tenant/write gate')

  await client.query("select set_config('app.tenant_id',$1,true)",[String(schoolB)])
  const other=await client.query('select id from paper_documents');assert.equal(other.rowCount,0)
  console.log('PASS FORCE RLS hides school A canonical rows under school B tenant context')
  await client.query("select set_config('app.tenant_id',$1,true)",[String(schoolA)])

  await client.query('SAVEPOINT badpayload')
  await expectSqlState(()=>client.query(`insert into paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,title,status,current_revision,payload_hash,payload,created_by,updated_by) values($1,$2,'approved-curriculum-authoring','assps-new-authoring-paper',1,'Mismatch','draft',1,$3,$4::jsonb,$2,$2)`,[schoolA,user,'f'.repeat(64),JSON.stringify({...doc,format:'evil-format'})]),'23514','payload discriminator mismatch')
  await client.query('ROLLBACK TO SAVEPOINT badpayload')
  console.log('PASS DB constraint rejects relational/JSON discriminator mismatch')

  await client.query('SAVEPOINT revmut')
  await expectSqlState(()=>client.query('update paper_revisions set event_kind=\'canonical_edit\' where school_id=$1 and paper_document_id=$2 and revision=1',[schoolA,inserted.id]),'42501','revision mutation')
  await client.query('ROLLBACK TO SAVEPOINT revmut')
  await client.query('SAVEPOINT docdelete')
  await expectSqlState(()=>client.query('delete from paper_documents where school_id=$1 and id=$2',[schoolA,inserted.id]),'42501','document hard delete')
  await client.query('ROLLBACK TO SAVEPOINT docdelete')
  console.log('PASS revision UPDATE and document hard DELETE remain database-blocked')

  await client.query("select set_config('app.paper_canonical_write_enabled','false',true)")
  await client.query('SAVEPOINT nogate')
  await expectSqlState(()=>client.query(`update paper_documents set title='Must fail' where school_id=$1 and id=$2`,[schoolA,inserted.id]),'42501','disabled write gate')
  await client.query('ROLLBACK TO SAVEPOINT nogate')
  console.log('PASS canonical write gate blocks UPDATE when transaction-local enable flag is false')

  console.log('V6F2_REGISTRY_REHEARSAL 5/5 PASS — TRANSACTION WILL ROLLBACK')
  await client.query('ROLLBACK')
 }catch(e){try{await client.query('ROLLBACK')}catch{};throw e}finally{if(roleSet){try{await client.query('RESET ROLE')}catch{}}client.release();await pool.end()}
})().catch(e=>{console.error('V6F2_REHEARSAL_FAIL',e.stack||e.message);process.exit(1)})
