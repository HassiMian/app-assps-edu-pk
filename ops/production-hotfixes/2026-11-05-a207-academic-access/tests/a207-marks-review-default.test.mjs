import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..')
const dir=path.join(root,'al-siddique-frontend/src/Modules/examination')
const {selectDefaultMarksReviewExam:pick}=await import('file://'+path.join(dir,'marksReviewExamSelection.js'))
const live=fs.readFileSync('/var/www/apex-backend/src/routes/examRoutes.js','utf8')
const view=fs.readFileSync(path.join(dir,'MarksRegister.jsx'),'utf8')
const exams=[
 {id:17,name:'Assessment 4',saved_result_count:0,saved_scored_count:0},
 {id:16,name:'Assessment 3',saved_result_count:0,saved_scored_count:0},
 {id:15,name:'Assessment 2',saved_result_count:0,saved_scored_count:0},
 {id:14,name:'Assessment 1',saved_result_count:0,saved_scored_count:0},
 {id:9,name:'First Term Exam',saved_result_count:1854,saved_scored_count:1854},
 {id:7,name:'Assessment - Class 1',saved_result_count:0,saved_scored_count:0},
]
test('actual school1 aggregate mock chooses saved First Term instead of empty latest Assessment 4',()=>{
 assert.equal(pick(exams)?.id,9)
})
test('newest scored exam wins only within a single authorized catalog result',()=>{
 assert.equal(pick([{id:5,saved_scored_count:2},{id:3,saved_scored_count:5}])?.id,5)
})
test('recorded zero marks still count as scored and must not be confused with blank',()=>{
 assert.equal(pick([{id:5,saved_scored_count:0},{id:3,saved_scored_count:1,saved_result_count:1}])?.id,3)
})
test('latest nonempty pending exam preferred when there are no scored results',()=>{
 assert.equal(pick([{id:8,saved_result_count:0},{id:6,saved_result_count:12,saved_scored_count:0},{id:2,saved_result_count:3}])?.id,6)
})
test('legacy backend missing counters uses First Term fallback instead of unrelated Assessment',()=>{
 assert.equal(pick([{id:17,name:'Assessment 4'},{id:9,name:'First Term Exam'}])?.id,9)
})
test('catalog with only an unsaved assessment remains selectable without fabricating marks',()=>{
 assert.equal(pick([{id:17,name:'Assessment 4',saved_result_count:0}])?.id,17)
})
test('zero-length and invalid catalogs never synthesize an exam ID',()=>{
 assert.equal(pick([]),null)
 assert.equal(pick(null),null)
 assert.equal(pick({id:5}),null)
 assert.equal(pick([{id:0},{id:-1},{id:'no'}]),null)
})
test('invalid or corrupt exam IDs cannot win over real saved exam',()=>{
 assert.equal(pick([{id:'__proto__',saved_result_count:100},{id:9,saved_result_count:1854}])?.id,9)
})
test('numeric-string valid ID may be chosen without coercing external response data',()=>{
 assert.equal(pick([{id:'9',name:'First Term',saved_scored_count:'1854'}])?.id,'9')
})
test('MarksRegister explicitly requests read-only saved counts from backend before default selection',()=>{
 assert.match(view,/include_saved_counts:'1'/)
 assert.match(view,/selectDefaultMarksReviewExam\(r\.data\.data\)\?\.id/)
 assert.match(view,/marksReviewReadOnly401:true/)
})
test('live backend responds to include_saved_counts using protected school scope',()=>{
 assert.match(live,/req\.query\.include_saved_counts === '1'/)
 assert.match(live,/MARKS_REVIEW_SCHOOL_REQUIRED/)
 assert.match(live,/saved_scored_count/)
})
test('MarksRegister still invalidates requests and purges stale data on exam switch',()=>{
 assert.match(view,/request\.current\+\+/)
 assert.match(view,/setRows\(\[\]\);setError\(''\)/)
 assert.match(view,/token!==request\.current/)
})
