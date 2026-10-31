'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const source=fs.readFileSync('/var/www/assps-releases/promotion-auth-v2-20261030/assets/ManageExams-ASSPS-ACADEMIC-REVIEW-EXPORT-v6-20261031.js','utf8')
function extract(){
 const start='exportSourceReview=async t=>'
 const a=source.indexOf(start),b=source.indexOf('},exportGradesReview=async()=>',a)
 assert.ok(a>0&&b>a,'export function has safe unique boundary')
 const expr=source.slice(a+start.length,b+1)
 return 'async t=>'+expr
}
function harness(shouldReject=false){
 const output={messages:[],requests:[],downloads:[]}
 const candidates=Array.from({length:54},(_,i)=>({class_name:'Seven',section:'Blue',subject:i===0?'=HYPERLINK("unsafe","test")':'Science '+i}))
 const cohorts=Array.from({length:13},(_,i)=>({class_name:'Class '+i,section:'Blue',active_students:10+i,has_subject_assignment:i>=6}))
 const api={get:async path=>{
    output.requests.push(path)
    if(shouldReject&&path.includes('cohort-coverage'))throw Error('Coverage temporarily unavailable')
    if(path.includes('/preview'))return {data:{success:true,data:{candidates}}}
    if(path.includes('cohort-coverage'))return {data:{success:true,data:{cohorts}}}
    throw Error('Unexpected API')
 }}
 const ctx={
 o:api,
 F:x=>output.messages.push(x),
 Blob,
 String,
 Promise,
 Number,
 Array,
 URL:{createObjectURL:b=>{output.blob=b;return 'blob:isolated-test'},revokeObjectURL:x=>{output.revoked=x}},
 document:{
   body:{appendChild:el=>output.downloads.push(el)},
   createElement:tag=>{assert.equal(tag,'a');return {href:null,download:null,click(){output.clicked=true},remove(){output.removed=true}}}
 },
 setTimeout:fn=>fn()
 }
 const fn=vm.runInNewContext('('+extract()+')',ctx)
 return {fn,output}
}
test('Principal verified candidates and all unstaffed cohorts export as review-only CSV',async()=>{
 const {fn,output}=harness()
 await fn({id:14,name:'Assessment 1'})
 assert.equal(output.requests.length,2)
 assert.ok(output.requests.every(x=>x.startsWith('/api/academic-approvals/')))
 assert.equal(output.clicked,true)
 assert.equal(output.downloads.length,1)
 assert.match(output.downloads[0].download,/Assessment_14_Principal_Source_Review_ONLY\.csv$/)
 const text=await output.blob.text()
 const lines=text.trim().split(/\r?\n/)
 assert.equal(lines.length,1+54+6)
 assert.ok(lines[1].includes("'=HYPERLINK"))
 assert.deepEqual([...Buffer.from(await output.blob.arrayBuffer()).subarray(0,3)],[239,187,191])
 assert.match(text,/PENDING_SIGNED_REVIEW_NOT_APPROVED/)
 assert.match(text,/DO_NOT_STAGE_WITHOUT_OFFICIAL_EVIDENCE/)
 assert.match(output.messages.at(-1),/NOT an approval or an assignment/)
})
test('no incomplete review CSV if cohort coverage fetch fails',async()=>{
 const {fn,output}=harness(true)
 await fn({id:14,name:'Assessment 1'})
 assert.equal(output.downloads.length,0)
 assert.match(output.messages.at(-1),/Coverage temporarily unavailable/)
})
test('export source is read-only and requires explicit user click',()=>{
 assert.match(source,/onClick:\(\)=>void exportSourceReview\(t\)/)
 assert.match(extract(),/o\.get\(/)
 assert.doesNotMatch(extract(),/o\.post\(|o\.patch\(|o\.put\(|o\.delete\(/)
 assert.doesNotMatch(extract(),/reviewDeclaration/)
})

function gradeHarness(discrepancyCount=97){
 const start='exportGradesReview=async()=>'
 const at=source.indexOf(start),end=source.indexOf('},exportLessonEvidence=async()=>',at)
 assert.ok(at>0&&end>at)
 const expression='async()=>'+source.slice(at+start.length,end+1)
 const output={messages:[],requests:[],downloads:[]}
 const records=Array.from({length:Math.min(100,discrepancyCount)},(_,i)=>({
   examId:9,studentId:i+1,className:'Starter',section:'Blue',
   subject:i===0?'=HYPERLINK("unsafe","x")':'English Written',
   marksObtained:35,totalMarks:50,wholePercent:70,
   storedGrade:'D',expectedGrade:'B',investigativeHint:'POSSIBLE_FIXED_100_MARK_DENOMINATOR'
 }))
 const ctx={
   o:{get:async(path,options)=>{output.requests.push({path,options});return {data:{success:true,data:{summary:{discrepancies:discrepancyCount},reviewItems:records}}}}},
   F:value=>output.messages.push(value),Blob,String,Number,Array,Promise,
   URL:{createObjectURL:b=>{output.blob=b;return 'blob:grade-review-test'},revokeObjectURL:()=>{}},
   document:{body:{appendChild:x=>output.downloads.push(x)},createElement:()=>({download:'',href:'',click(){output.clicked=true},remove(){}})},
   setTimeout:fn=>fn()
 }
 return {fn:vm.runInNewContext('('+expression+')',ctx),output,expression}
}
test('grade discrepancy CSV exports all 97 historical rows without mutation',async()=>{
 const {fn,output}=gradeHarness()
 await fn()
 assert.equal(output.clicked,true)
 assert.equal(output.requests.length,1)
 assert.equal(output.requests[0].path,'/api/academic-approvals/grade-discrepancies')
 assert.equal(output.requests[0].options.params.limit,100)
 assert.equal(output.requests[0].options.params.examId,9)
 const csv=await output.blob.text()
 assert.equal(csv.trim().split(/\r?\n/).length,98)
 assert.match(csv,/'=HYPERLINK/)
 assert.match(csv,/Investigation Hint — NOT proof/)
 assert.match(csv,/Authentic Principal Review Decision \(blank\)/)
 assert.match(output.downloads[0].download,/CONFIDENTIAL_ONLY/)
 assert.match(output.messages.at(-1),/grades and marks remain unchanged/)
})
test('grade exporter refuses incomplete history beyond 100 API rows',async()=>{
 const {fn,output}=gradeHarness(101)
 await fn()
 assert.equal(output.downloads.length,0)
 assert.match(output.messages.at(-1),/Complete verified history required/)
})
test('historic grade reviewer uses only private authorized GET, no writes',()=>{
 const {expression}=gradeHarness()
 assert.match(expression,/o\.get\(/)
 assert.doesNotMatch(expression,/o\.(post|put|patch|delete)\(/)
 assert.match(source,/onClick:\(\)=>void exportGradesReview\(\)/)
})

function lessonHarness(sourceCount=57){
 const start='exportLessonEvidence=async()=>'
 const at=source.indexOf(start),end=source.indexOf('},V=async e=>',at)
 assert.ok(at>0&&end>at)
 const expression='async()=>'+source.slice(at+start.length,end+1)
 const output={messages:[],requests:[],downloads:[]}
 const candidates=Array.from({length:sourceCount},(_,i)=>({
   className:i<4?'Starter':'Seven',subject:i===0?'=SUM(1,2)':'Science',
   evidenceId:'LPREVIEW-20261014-'+i,sourceReferences:['WA14-L2847'],
   textbookTitle:null,textbookEdition:null,
   blockingReasons:['TEACHER_OWNER_UNVERIFIED','AUTHENTIC_ACADEMIC_APPROVAL_MISSING'],
   publicationStatus:'BLOCKED_PENDING_OFFICIAL_TEXTBOOK_AND_SIGNED_REVIEW'
 }))
 const ctx={
   o:{get:async(path)=>{output.requests.push(path);return {data:{success:true,data:{
      candidates,excludedClassEight:1,deferredPreNine:1,
      certification:'HOLD_AWAITING_ORIGINAL_PAGE_SOURCE_AND_SIGNED_PRINCIPAL_REVIEW'
   }}}}},
   F:value=>output.messages.push(value),Blob,String,Number,Array,Promise,
   URL:{createObjectURL:b=>{output.blob=b;return 'blob:lesson-review-test'},revokeObjectURL:()=>{}},
   document:{body:{appendChild:x=>output.downloads.push(x)},createElement:()=>({download:'',href:'',click(){output.clicked=true},remove(){}})},
   setTimeout:fn=>fn()
 }
 return {fn:vm.runInNewContext('('+expression+')',ctx),output,expression}
}
test('original Lesson Planning export has 57 source entries and no invented teacher approval',async()=>{
 const {fn,output}=lessonHarness()
 await fn()
 assert.equal(output.clicked,true)
 assert.deepEqual(output.requests,['/api/academic-approvals/lesson-source-review'])
 const csv=await output.blob.text()
 assert.equal(csv.trim().split(/\r?\n/).length,58)
 assert.match(csv,/'=SUM\(1,2\)/)
 assert.match(csv,/Authentic Teacher Review \(blank\)/)
 assert.match(csv,/Principal Evidence Sign-off \(blank\)/)
 assert.match(csv,/BLOCKED_PENDING_OFFICIAL_TEXTBOOK_AND_SIGNED_REVIEW/)
 assert.match(output.messages.at(-1),/ALL remain blocked/)
 assert.match(output.downloads[0].download,/Starter_to_Seven/)
})
test('lesson evidence exporter rejects mismatched source manifest counts',async()=>{
 const {fn,output}=lessonHarness(56)
 await fn()
 assert.equal(output.downloads.length,0)
 assert.match(output.messages.at(-1),/Pinned original lesson evidence cannot be verified/)
})
test('lesson export uses authenticated-only read endpoint and never edits school data',()=>{
 const {expression}=lessonHarness()
 assert.match(expression,/o\.get\(/)
 assert.doesNotMatch(expression,/o\.(post|patch|put|delete)\(/)
 assert.match(source,/onClick:\(\)=>void exportLessonEvidence\(\)/)
})
