const test=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const express=require('express')
const http=require('node:http')
const jwt=require('jsonwebtoken')
const {pool,tenantContext}=require('../config/database')
const {ACADEMIC_REVIEW_VERSION,ATTESTATIONS}=require('../services/grade910AcademicReviewGate')
const catalog=require('../data/verifiedGrade910SourceRegistry.json')

function req(port,method,path,body,token){
  const text=body===undefined?'':JSON.stringify(body)
  return new Promise((resolve,reject)=>{
    const r=http.request({hostname:'127.0.0.1',port,path,method,headers:{
      'content-type':'application/json',
      ...(token?{authorization:'Bearer '+token}:{}),
      ...(text?{'content-length':Buffer.byteLength(text)}:{})
    }},res=>{
      let raw='';res.on('data',buf=>raw+=buf);res.on('end',()=>{
        let data=null;try{data=JSON.parse(raw)}catch{}
        resolve({status:res.statusCode,data,raw})
      })
    })
    r.on('error',reject);if(text)r.write(text);r.end()
  })
}
test('Phase5: review rejection requires a changed immutable revision and atomically corrects legacy source before independent release',
  {timeout:90000},async t=>{
  assert.equal(process.env.NODE_ENV,'test')
  assert.match(String(process.env.DB_NAME||''),/^assps_phase5_academic_review_test_/)
  const actor=id=>jwt.sign({id},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'})
  const author=actor(999),reviewer=actor(1),publisher=actor(2419)
  const id='q_phase5_correction_'+crypto.randomBytes(6).toString('hex')
  const initial={
    id,school_id:1,class_level:'9th',subject:'Biology',medium:'english',chapter_no:'1',
    chapter_name:'The Science of Biology',question_type:'mcq',
    question_text:'Which science studies animals in their natural environment? '+id,
    options:['Zoology','Astronomy','Meteorology','Mineralogy'],
    correct_option:'A',answer:'Zoology',explanation:'Zoology concerns the study of animals.',
    marks:1,source_type:'json_seed',metadata:{review_state:'provisional_internal'},
  }
  const app=express();app.use(express.json())
  app.use((rq,rs,next)=>tenantContext.run({
    rlsEnabled:true,isSuperAdmin:false,tenantId:1,tenantKey:'assps'
  },next))
  app.use('/api/question-bank',require('../routes/questionBankRoutes'))
  const server=await new Promise(resolve=>{
    const s=app.listen(0,'127.0.0.1',()=>resolve(s))
  })
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end()})
  const port=server.address().port
  await tenantContext.run({rlsEnabled:true,isSuperAdmin:false,tenantId:1,tenantKey:'assps'},
    ()=>pool.query(
      `INSERT INTO question_bank(id,school_id,class_level,subject,medium,chapter_no,
        chapter_name,question_type,question_text,options,correct_option,answer,
        explanation,marks,source_type,metadata,is_approved,created_by)
       VALUES($1,1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15::jsonb,false,999)`,
      [initial.id,initial.class_level,initial.subject,initial.medium,initial.chapter_no,
       initial.chapter_name,initial.question_type,initial.question_text,
       JSON.stringify(initial.options),initial.correct_option,initial.answer,
       initial.explanation,initial.marks,initial.source_type,JSON.stringify(initial.metadata)]
    ))
  const intake=await req(port,'POST','/api/question-bank/academic-intake/'+id,{},author)
  assert.equal(intake.status,201,intake.raw)
  const pub=intake.data.data.publicId
  const gov='/api/question-bank/governance/'+pub
  const rev1=await req(port,'GET',gov+'/review-context',undefined,author)
  assert.equal(rev1.status,200,rev1.raw)
  assert.equal(rev1.data.data.currentRevision,1)
  assert.equal((await req(port,'PATCH',gov+'/status',{status:'reviewed'},author)).status,200)

  const failShort=await req(port,'POST',gov+'/return-for-correction',{
    expectedRevision:1,expectedContentHash:rev1.data.data.currentContentHash,
    reason:'Fix it',
  },reviewer)
  assert.equal(failShort.status,422,failShort.raw)
  const failSelf=await req(port,'POST',gov+'/return-for-correction',{
    expectedRevision:1,expectedContentHash:rev1.data.data.currentContentHash,
    reason:'This biological question requires an independently corrected answer key and clearer option wording.',
  },author)
  assert.equal(failSelf.status,403,failSelf.raw)
  const returned=await req(port,'POST',gov+'/return-for-correction',{
    expectedRevision:1,expectedContentHash:rev1.data.data.currentContentHash,
    reason:'Recheck the scientific explanation and improve the alternative options before approving this question.',
  },reviewer)
  assert.equal(returned.status,200,returned.raw)
  assert.equal(returned.data.data.correctionRecorded,true)
  const contextAfter=await req(port,'GET',gov+'/review-context',undefined,author)
  assert.equal(contextAfter.data.data.returnedForCorrection,true)
  assert.equal(contextAfter.data.data.lifecycleStatus,'candidate')
  const noResubmit=await req(port,'PATCH',gov+'/status',{status:'reviewed'},author)
  assert.equal(noResubmit.status,409,noResubmit.raw)
  assert.equal(noResubmit.data.code,'CORRECTION_REQUIRES_NEW_REVISION')

  const corrected={
    question_text:initial.question_text+' Record observed animal behavior.',
    options:['Animal ecology and zoology','Astronomy','Meteorology','Mineralogy'],
    correct_option:'A',answer:'Animal ecology and zoology',
    explanation:'Zoology includes studies of animal behavior and ecological interactions.',
    marks:1,
  }
  const rejectOther=await req(port,'POST','/api/question-bank/academic-revise/'+id,{
    expectedRevision:1,expectedContentHash:rev1.data.data.currentContentHash,
    changes:corrected,
  },reviewer)
  assert.equal(rejectOther.status,403,rejectOther.raw)
  const hashConflict=await req(port,'POST','/api/question-bank/academic-revise/'+id,{
    expectedRevision:1,expectedContentHash:'0'.repeat(64),changes:corrected,
  },author)
  assert.equal(hashConflict.status,409,hashConflict.raw)
  const edit=await req(port,'POST','/api/question-bank/academic-revise/'+id,{
    expectedRevision:1,expectedContentHash:rev1.data.data.currentContentHash,changes:corrected,
  },author)
  assert.equal(edit.status,200,edit.raw)
  assert.equal(edit.data.data.currentRevision,2)
  assert.equal(edit.data.data.academicApprovalGranted,false)
  const updated=await req(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(updated.status,200,updated.raw)
  assert.equal(updated.data.data.question_text,corrected.question_text)
  assert.equal(updated.data.data.correct_option,corrected.correct_option)
  assert.equal(updated.data.data.is_approved,false)
  const rev2=await req(port,'GET',gov+'/review-context',undefined,author)
  assert.equal(rev2.status,200,rev2.raw)
  assert.equal(rev2.data.data.currentRevision,2)
  assert.notEqual(rev2.data.data.currentContentHash,rev1.data.data.currentContentHash)
  assert.equal(rev2.data.data.returnedForCorrection,false)
  assert.equal(rev2.data.data.question.questionText,corrected.question_text)
  assert.equal((await req(port,'PATCH',gov+'/status',{status:'reviewed'},author)).status,200)
  const source=catalog.entries.find(s=>s.recordId==='pectaa-catalog-009')
  const packet={
    expectedRevision:2,expectedContentHash:rev2.data.data.currentContentHash,
    evidence:{
      schemaVersion:ACADEMIC_REVIEW_VERSION,
      sourceRecordId:source.recordId,sourcePdfSha256:source.pdfSha256,
      edition:source.edition,chapterNo:'1',questionOrigin:'ORIGINAL',
      sourcePrintedPage:null,exerciseReference:null,
      attestations:Object.fromEntries(ATTESTATIONS.map(key=>[key,true])),
      editorialNotes:'Synthetic isolated test confirms independent source/hash and corrected answer review; this does not certify real curriculum questions.',
    }
  }
  const reviewed=await req(port,'POST',gov+'/academic-review',packet,reviewer)
  assert.equal(reviewed.status,201,reviewed.raw)
  assert.equal(reviewed.data.data.questionBankApproved,false)
  const released=await req(port,'PATCH',gov+'/status',{status:'ready'},publisher)
  assert.equal(released.status,200,released.raw)
  const final=await req(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(final.status,200,final.raw)
  assert.equal(final.data.data.is_approved,true)
  assert.equal(final.data.data.metadata.reviewed_revision,2)
  assert.equal(final.data.data.metadata.academic_reviewer_id,1)
  assert.equal(final.data.data.metadata.approved_by,2419)
  console.log('PHASE5_CORRECTION_ATOMICITY_REJECTION_NEW_REVISION_INDEPENDENT_APPROVAL_PASS')
})
