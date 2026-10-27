// Provisional Class One 18-week teacher image transcription adapter.
// Never upgrades source review status to academically approved or publishes it.
const strictIso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(new Date(v+'T00:00:00Z').getTime())
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)

export function reviewClassOneImageWeeks(imageReview,candidates=[]){
 const out={status:'HOLD',reason:'ORIGINAL_CLASS_ONE_IMAGE_REVIEW_MISSING',
            academicApproval:false,weeks:[],bySubject:{},originalEvidence:{}}
 if(!imageReview||!Array.isArray(imageReview.weeks))return out
 const sourceStatus=String(imageReview.review_state||'')
 if(!imageReview.source_image_sha256||!imageReview.transcript_sha256)
   return {...out,reason:'MISSING_IMAGE_OR_TRANSCRIPT_DIGEST'}
 if(!imageReview.weeks.length)return {...out,reason:'NO_SOURCE_WEEK_RECORDS'}
 if(imageReview.weeks.length>52)return {...out,reason:'EXCESSIVE_WEEK_RECORDS'}
 const sourceNames=new Set(candidates.filter(c=>c.class_display==='One').map(c=>c.source_subject_label))
 const rows=[]
 let previous=''
 for(const w of imageReview.weeks){
   if(!Number.isSafeInteger(w.week)||w.week!==rows.length+1||
       !strictIso(w.start)||!strictIso(w.end)||w.start>w.end||
       (previous&&w.start<=previous)||!w.work||typeof w.work!=='object')
     return {...out,reason:'WEEK_DATE_SEQUENCE_NOT_VERIFIED'}
   const work={}
   for(const [subject,raw] of Object.entries(w.work)){
     if(subject==='all')continue
     if(!sourceNames.has(subject))return {...out,reason:'UNMATCHED_SOURCE_SUBJECT'}
     if(typeof raw!=='string'||!raw.trim())return {...out,reason:'INVALID_TEACHER_WORK_TEXT'}
     // Only explicit Pg NN—NN can produce verified page bounds. "S1 Masjid"
     // is a teacher label, not a page range or invented chapter title.
     const m=raw.trim().match(/^(?:pg|page)\s*#?\s*(\d+)\s*[-–—]\s*(\d+)(?:\s|$)/i)
     const valid=Boolean(m)&&Number(m[2])>=Number(m[1])
     work[subject]={verbatim:raw.trim(),pageFrom:valid?m[1]:'',
       pageTo:valid?m[2]:'',source:'CLASS_ONE_IMAGE_TRANSCRIPTION_PROVISIONAL'}
   }
   rows.push({week:w.week,start:w.start,end:w.end,work,
     allSourceStatus:hasOwn(w.work,'all')?String(w.work.all):''})
   previous=w.end
 }
 const bySubject=Object.fromEntries([...sourceNames].map(s=>[s,rows.filter(w=>w.work[s]).map(w=>({
   week:w.week,start:w.start,end:w.end,...w.work[s]
 }))]))
 return {status:'REVIEW_ONLY',reason:sourceStatus||'ACADEMIC_REVIEW_REQUIRED',
         academicApproval:false,weeks:rows,bySubject,
         originalEvidence:{imageSha256:imageReview.source_image_sha256,
            transcriptSha256:imageReview.transcript_sha256,originalWeeks:rows.length}}
}
