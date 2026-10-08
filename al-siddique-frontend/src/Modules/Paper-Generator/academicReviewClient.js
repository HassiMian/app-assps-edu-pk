/**
 * Teacher-facing Phase 5 academic review client.
 * All permissions, school identity, answer/content hash and academic approval
 * remain authoritative on the backend. No student questions are cached here.
 */
import api from '../../services/api.js'

export const REVIEW_FIELDS = Object.freeze([
  { key:'sourceImageChecked',label:'I inspected the actual source page image.' },
  { key:'editionChecked',label:'I confirmed the textbook edition and grade.' },
  { key:'chapterMatchChecked',label:'I confirmed this chapter and topic match.' },
  { key:'curriculumChecked',label:'I checked curriculum and learning outcomes.' },
  { key:'answerKeyChecked',label:'I independently checked answers and MCQ keys.' },
  { key:'languageChecked',label:'I checked English/Urdu language and clarity.' },
  { key:'originalityChecked',label:'I checked originality and question provenance.' },
])
export const ACADEMIC_SCHEMA='assps-grade910-independent-review-v1'
export function highSchoolGrade(value){
  const v=String(value||'').trim().toLowerCase().replace(/^(?:class|grade)\s*[:.-]?\s*/,'')
  if(['9','09','9th','ix','nine'].includes(v))return 9
  if(['10','10th','x','ten'].includes(v))return 10
  return null
}
export function sourcesForQuestion(sources=[],question={}){
  const grade=highSchoolGrade(question.classLevel??question.class_level)
  const subject=String(question.subject||'').trim().toLowerCase()
  const medium=String(question.medium||'english').trim().toLowerCase()
  return sources.filter(item=>Number(item.grade)===grade &&
    String(item.subject||'').trim().toLowerCase()===subject &&
    String(item.medium||'').trim().toLowerCase()===medium)
}
export function completeAttestations(flags={}){
  return REVIEW_FIELDS.every(item=>flags[item.key]===true)
}
export function buildAcademicReviewPacket({
  context,source,origin,flags,notes,printedPage,exerciseReference,
}){
  if(!context||!source)throw new Error('Open a governed revision and select a verified textbook source.')
  if(!/^[a-f0-9]{64}$/i.test(String(context.currentContentHash||'')) ||
     !Number.isInteger(Number(context.currentRevision)) ||
     Number(context.currentRevision)<1)
    throw new Error('Review requires a current immutable revision and SHA-256.')
  const question=context.question||{}
  if(!sourcesForQuestion([source],question).length)
    throw new Error('The textbook source does not match the grade, subject and medium.')
  if(!completeAttestations(flags))
    throw new Error('Every academic review check must be confirmed.')
  const editorialNotes=String(notes||'').trim()
  if(editorialNotes.length<45)throw new Error('Add substantive review notes (at least 45 characters).')
  if(!['ORIGINAL','TEXTBOOK_EXERCISE'].includes(origin))
    throw new Error('Specify whether the question is original or textbook-derived.')
  if(origin==='TEXTBOOK_EXERCISE' &&
    (!Number.isInteger(Number(printedPage)) || Number(printedPage)<1 ||
     !String(exerciseReference||'').trim()))
    throw new Error('Textbook-derived items require their printed page and exercise reference.')
  return {
    expectedRevision:Number(context.currentRevision),
    expectedContentHash:String(context.currentContentHash).toLowerCase(),
    evidence:{
      schemaVersion:ACADEMIC_SCHEMA,
      sourceRecordId:source.recordId,sourcePdfSha256:source.pdfSha256,
      edition:source.edition,chapterNo:String(question.chapterNo||'').trim(),
      questionOrigin:origin,
      sourcePrintedPage:origin==='TEXTBOOK_EXERCISE'?Number(printedPage):null,
      exerciseReference:origin==='TEXTBOOK_EXERCISE'?String(exerciseReference).trim():null,
      attestations:Object.fromEntries(REVIEW_FIELDS.map(({key})=>[key,true])),
      editorialNotes,
    },
  }
}
export function editableQuestionDraft(question={}){
  return {
    question_text:String(question.questionText||''),
    question_text_urdu:String(question.questionTextUrdu||''),
    options:Array.isArray(question.options)
      ? question.options.map(option=>typeof option==='string'?option:String(option?.text||'')) : [],
    correct_option:String(question.correctOption||'A').toUpperCase(),
    answer:String(question.answer||''),
    explanation:String(question.explanation||''),
    marks:Number(question.marks||1),
  }
}
export function buildProvisionalCorrection(context,fields={}){
  if(!context || !Number.isInteger(Number(context.currentRevision)) ||
     Number(context.currentRevision)<1 ||
     !/^[a-f0-9]{64}$/i.test(String(context.currentContentHash||'')))
    throw new Error('A current governed source revision/hash is required.')
  if(context.lifecycleStatus!=='candidate'||!context.requesterIsOriginalAuthor)
    throw new Error('Only the original author may correct their own candidate question.')
  const stem=String(fields.question_text||'').trim()
  const urdu=String(fields.question_text_urdu||'').trim()
  const answer=String(fields.answer||'').trim()
  const explanation=String(fields.explanation||'').trim()
  const key=String(fields.correct_option||'').trim().toUpperCase()
  const marks=Number(fields.marks)
  const options=Array.isArray(fields.options)?fields.options.map(x=>String(x||'').trim()):[]
  if(!stem&&!urdu)throw new Error('A question prompt is required.')
  if(!Number.isInteger(marks)||marks<1||marks>25)
    throw new Error('Marks must be an integer between 1 and 25.')
  if(String(context.question?.questionType||'').toLowerCase()==='mcq' &&
    (options.length!==4||options.some(x=>!x)||!['A','B','C','D'].includes(key)))
    throw new Error('MCQ corrections require four filled options and an A–D answer key.')
  return {expectedRevision:Number(context.currentRevision),
    expectedContentHash:String(context.currentContentHash).toLowerCase(),
    changes:{question_text:stem,question_text_urdu:urdu,options,
      correct_option:key,answer,explanation,marks},
  }
}

export const academicReviewApi={
  async getQuestion(id){
    const questionId=String(id||'').trim()
    if(!/^[a-zA-Z0-9_-]{3,120}$/.test(questionId))
      throw new Error('Enter a valid school question ID.')
    const response=await api.get('/api/question-bank/'+encodeURIComponent(questionId))
    return response.data.data
  },
  async listQuestions({grade='9th',subject='',offset=0,limit=30,signal}={}){
    const response=await api.get('/api/question-bank',{
      params:{classLevel:grade,approved:false,subject:subject||undefined,limit,offset},
      signal,
    })
    return response.data
  },
  async getSources(signal){
    const response=await api.get('/api/question-bank/academic-sources',{signal})
    return response.data.data||[]
  },
  async intake(id){
    const response=await api.post('/api/question-bank/academic-intake/'+encodeURIComponent(id),{})
    return response.data.data
  },
  async revise(id,packet){
    const response=await api.post('/api/question-bank/academic-revise/'+encodeURIComponent(id),packet)
    return response.data.data
  },
  async getReviewContext(publicId,signal){
    const response=await api.get('/api/question-bank/governance/'+encodeURIComponent(publicId)+'/review-context',{signal})
    return response.data.data
  },
  async changeStatus(publicId,status){
    const response=await api.patch('/api/question-bank/governance/'+encodeURIComponent(publicId)+'/status',{status})
    return response.data.data
  },
  async submitReview(publicId,packet){
    const response=await api.post('/api/question-bank/governance/'+encodeURIComponent(publicId)+'/academic-review',packet)
    return response.data.data
  },
  async returnForCorrection(publicId,packet){
    const response=await api.post('/api/question-bank/governance/'+encodeURIComponent(publicId)+'/return-for-correction',packet)
    return response.data.data
  },
}
