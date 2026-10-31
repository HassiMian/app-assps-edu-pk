'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const code=fs.readFileSync(path.join(__dirname,'../routes/assessmentStudioRoutes.js'),'utf8')
const list=code.slice(code.indexOf("router.get('/papers',"),code.indexOf("router.get('/papers/:paperId'"))
const detail=code.slice(code.indexOf("router.get('/papers/:paperId'"),code.indexOf("router.post('/papers/:paperId/revisions'"))
test('assessment listing marks missing actual revision and never invents document content',()=>{
 assert.match(list,/\(r.id IS NOT NULL\) AS current_revision_available/)
 assert.match(list,/LEFT JOIN assessment_paper_revisions r/)
 assert.doesNotMatch(list,/INSERT INTO assessment_paper_revisions/)
})
test('every editable server GET is blocked on missing or hash-mismatched revision',()=>{
 assert.match(detail,/ASSESSMENT_REVISION_NOT_AVAILABLE/)
 assert.match(detail,/ASSESSMENT_REVISION_HASH_MISMATCH/)
 assert.match(detail,/hashDocument\(revision.document_json\)/)
 assert.match(detail,/recheckVerifiedSnapshot/)
})
test('tenant scoping and authenticated author/teacher roles stay enabled',()=>{
 assert.match(code,/router.use\(protect, canAuthorAssessments\)/)
 assert.match(list,/school_id = \$1/)
 assert.match(detail,/p.school_id = \$1/)
})
