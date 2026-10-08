const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {inspectMap}=require('../qbank/verify-biology9-chapter-anchors.cjs')
const root=path.resolve(__dirname,'../..')
const map=JSON.parse(fs.readFileSync(path.join(root,'docs/question-bank/ASSPS_BIO9_TOC_PAGE_ANCHORS_20261008.json')))
const samples=JSON.parse(fs.readFileSync(path.join(root,'docs/question-bank/ASSPS_BIOLOGY9_HEADER_SAMPLES_20261008.json')))
const supplement=JSON.parse(fs.readFileSync(path.join(root,'docs/question-bank/ASSPS_BIO9_CHAPTER6_OCR_EVIDENCE_20261008.json')))
const copy=o=>JSON.parse(JSON.stringify(o))

test('11 contiguous chapters have a source-heading OCR candidate and zero academic approvals',()=>{
 const x=inspectMap(map,samples,supplement)
 assert.equal(x.safe,true)
 assert.equal(x.candidateChapterCount,11)
 assert.equal(x.academicApprovals,0)
})
test('source hash and page count are immutable',()=>{
 const x=copy(map);x.expectedSha256='0'.repeat(64);assert.equal(inspectMap(x,samples,supplement).safe,false)
 const y=copy(map);y.pdfiumObservedPageCount=170;assert.equal(inspectMap(y,samples,supplement).safe,false)
})
test('missing scanned header evidence cannot be replaced by a guess',()=>{
 const x=copy(samples);x.samples=x.samples.filter(s=>s.chapter!==8)
 assert.ok(inspectMap(map,x,supplement).issues.includes('NO_CHAPTER_HEADING_EVIDENCE:8'))
})
test('chapter 6 supplemental OCR evidence is required and cannot approve content',()=>{
 const x=copy(supplement);x.recognizedChapterMarker='Chapter 5'
 assert.ok(inspectMap(map,samples,x).issues.includes('NO_CHAPTER_HEADING_EVIDENCE:6'))
 const m=copy(map);m.chapters[5].academicApproval=true
 assert.equal(inspectMap(m,samples,supplement).safe,false)
})
test('no pagination gaps or overlaps may pass as verified book chapter anchors',()=>{
 const x=copy(map);x.chapters[6].pdfPhysicalPageStart++
 assert.ok(inspectMap(x,samples,supplement).issues.some(v=>v.includes('NONCONTIGUOUS_CHAPTER_PAGES')))
})
test('print-to-physical offset must be consistent and preserve PDF bounds',()=>{
 const x=copy(map);x.chapters[10].printedPageEnd++
 assert.ok(inspectMap(x,samples,supplement).issues.some(v=>v.includes('UNVERIFIED_PRINT_PHYSICAL_OFFSET')))
 const y=copy(map);y.chapters[10].pdfPhysicalPageEnd=181
 assert.ok(inspectMap(y,samples,supplement).issues.some(v=>v.includes('CHAPTER_OUT_OF_BOUNDS')))
})
test('review flags cannot be bypassed by updating the top-level source status',()=>{
 const x=copy(map);x.questionGenerationApproved=true
 assert.ok(inspectMap(x,samples,supplement).issues.includes('UNAUTHORIZED_SOURCE_APPROVAL_FLAG'))
})
