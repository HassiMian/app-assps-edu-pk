import api from '../../../../services/api.js'
const HASH=/^[0-9a-f]{64}$/
export function gradeOf(value){
 const v=String(value||'').toLowerCase().trim()
 if(/^(9|9th|9th class|ix|class 9|grade 9)$/.test(v))return 9
 if(/^(10|10th|10th class|x|class 10|grade 10)$/.test(v))return 10
 return null
}
export function renderVerifiedBody(question){
 if(!question||typeof question!=='object')throw Error('Approved question is missing.')
 const main=String(question.text||question.stem||'').trim()
 if(!main)throw Error('Approved question has no verified text.')
 const opts=Array.isArray(question.options)?question.options:[]
 if(opts.length>8)throw Error('Too many MCQ options.')
 const extra=opts.map((x,i)=>{
  const label=String(x?.label||x?.key||String.fromCharCode(65+i)).trim()
  const text=String(x?.text||'').trim()
  if(!label||!text)throw Error('Approved MCQ option incomplete.')
  return label+'. '+text
 })
 return [main,...extra].join('\n')
}
export function toVerifiedPaperSection(record){
 if(!record||record.academicallyVerified!==true||record.paperStudioSelectable!==true||
  !Number.isSafeInteger(record.revision)||record.revision<1||
  ![record.questionSha,record.answerSha,record.publicationGrantSha].every(x=>HASH.test(x||'')))
  throw Error('Certified paper revision not confirmed.')
 const q=record.paperPayload?.finalQuestion
 if(!q||record.paperPayload?.originalQuestionId!==record.originalQuestionId||
   Number(record.paperPayload?.questionRevision)!==record.revision)
  throw Error('Approved payload revision mismatch.')
 const content=renderVerifiedBody(q)
 const marks=Number(q.marks)
 if(!Number.isFinite(marks)||marks<=0||marks>100)throw Error('Verified question marks missing.')
 const sectionId='verified-'+record.originalQuestionId.replace(/[^a-zA-Z0-9-]/g,'_')+'-rev-'+record.revision
 return {
   section:{id:sectionId,type:'official_section',layoutPreset:'auto',medium:record.medium||'english',
    heading:'Verified question — '+record.originalQuestionId,content,
    marks,priority:'verified',sourceOrder:0},
   ref:{sectionId,originalQuestionId:record.originalQuestionId,revision:record.revision,
    questionSha:record.questionSha,answerSha:record.answerSha,publicationGrantSha:record.publicationGrantSha}
 }
}
export async function fetchVerifiedPaperQuestions({grade,subject,section}){
 const r=await api.get('/api/grade910-verified-picker/approved-only',{params:{grade,subject,section},headers:{'Cache-Control':'no-store'}})
 if(!r.data?.success||r.data.source!=='server-signed-restricted-verified-publications'||
    r.data.academicallyApprovedOnly!==true||!Array.isArray(r.data.records))
  throw Error('Unverified or unavailable question source.')
 return r.data.records.map(x=>{toVerifiedPaperSection(x);return x})
}
export async function verifyPaperDocumentOnline(document){
 if(!document?.grade910Verified?.refs?.length)throw Error('No verified question references found.')
 const r=await api.post('/api/assessment-studio/verify-grade910-paper',{document})
 if(!r.data?.success||r.data?.data?.verifiedCount!==document.grade910Verified.refs.length)
  throw Error('Server could not confirm every question revision.')
 return r.data
}
