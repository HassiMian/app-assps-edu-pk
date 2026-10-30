import test from 'node:test'
import assert from 'node:assert/strict'
import {buildStudentTermDiary3Up as build,studentTermDiaryColor,studentTermDiaryIdentity,studentTermDiarySubjects,studentTermDiaryAssessmentSubjects} from '../studentTermDiary3Up.js'
const student=(id=1,name='Ayesha',s={})=>({id,name, father_name:'Zain Ali',class:'Three',section:'Red',roll_number:'',gr_number:'MIG26-001',is_active:true,...s})
const plan=()=>({classLevel:'Three',planningType:'term',termCoverageRows:[{subject:'English (A + B)',detail:'Read Units 7–11 and complete classwork.'},{subject:'Urdu (A + B)',detail:'سبق پڑھیں اور کلاس ورک مکمل کریں۔'}],assessments:[{subject:'English (A + B)',number:1,date:'2026-11-05'},{subject:'English (A + B)',number:3,date:'2027-01-12'}]})
const make=(opts={})=>build({students:[student()],plan:plan(),classLevel:'Three',section:'Red',schoolName:'Al Siddique Scholars Public School',logoUrl:'/assets/assps.png',strictClassCoverage:false,...opts})
test('mandatory SaaS identity key; never fabricate missing student id',()=>assert.throws(()=>studentTermDiaryIdentity({name:'Ayesha'}),/id and name/))
test('migration reference is not mislabeled as GR',()=>{const x=studentTermDiaryIdentity(student());assert.equal(x.grLabel,'SaaS Ref');assert.equal(x.roll,'')})
test('regular GR and Roll are separately preserved',()=>{const x=studentTermDiaryIdentity(student(7,'Hadi',{gr_number:'GR-2026-0145',roll_number:'09'}));assert.equal(x.grLabel,'GR');assert.equal(x.roll,'09')})
test('same 3 portrait cards on one A4 landscape sheet',()=>{const x=make({students:[student(1),student(2,'Fatima'),student(3,'Maryam')]});assert.equal(x.pages,1);assert.equal(x.students,3);assert.match(x.html,/A4 landscape/);assert.equal((x.html.match(/class="card"/g)||[]).length,3)})
test('four students use two landscape sheets with no fourth fake card',()=>{const x=make({students:[student(1),student(2,'Fatima'),student(3,'Maryam'),student(4,'Areeba')]});assert.equal(x.pages,2);assert.equal((x.html.match(/class="card"/g)||[]).length,4)})
test('MOVER purple locked even when section marked Red',()=>assert.equal(studentTermDiaryColor('Mover','Red')[0],'#f2edfc'))
test('class THREE Red and ONE Yellow respect supplied class-specific sections',()=>{assert.equal(studentTermDiaryColor('Three','Red')[0],'#fff0ee');assert.equal(studentTermDiaryColor('One','Yellow')[0],'#fff8e7')})
test('assessment dates remain in per-subject A1/A3 columns, others blank',()=>{const x=make();assert.match(x.html,/2026-11-05/);assert.match(x.html,/2027-01-12/);assert.match(x.html,/Assess.5/);assert.match(x.html,/2026-11-05<\/td><td><\/td><td>2027-01-12/)})
test('lessons source document only — no default made-up chapters',()=>{assert.deepEqual(studentTermDiarySubjects({subjects:[]}),[]);assert.throws(()=>make({plan:{planningType:'term',subjects:[],assessments:[]}}),/No verified syllabus/)})
test('no placeholder student cards when SaaS roster absent',()=>assert.throws(()=>make({students:[]}),/SaaS student roster unavailable/))
test('duplicates refused rather than repeat names twice',()=>assert.throws(()=>make({students:[student(1),student(1,'Ayesha')] }),/Duplicate student IDs/))
test('cross-class student denied',()=>assert.throws(()=>make({students:[student(1,'Ayesha',{class:'Six'})]}),/Cross-class/))
test('inactive student refused',()=>assert.throws(()=>make({students:[student(1,'Ayesha',{is_active:false})]}),/Inactive/))
test('second term Class Eight not generated',()=>assert.throws(()=>make({classLevel:'Eight'}),/No Second Term/))
test('over five assessment dates cannot be silently truncated',()=>assert.throws(()=>make({plan:{...plan(),assessments:[1,2,3,4,5,6].map(number=>({subject:'English (A + B)',number,date:'2026-11-05'}))}}),/More than five/))
test('bad assessment date refused',()=>assert.throws(()=>make({plan:{...plan(),assessments:[{subject:'Urdu (A + B)',date:'31-Nov-2026'}]}}),/Unverified/))
test('escaping of names and curriculum prevents HTML injection',()=>{const x=make({students:[student(1,'<img src=x onerror=alert(1)>')],plan:{...plan(),termCoverageRows:[{subject:'English',detail:'<script>alert(1)</script>'}]}});assert(!x.html.includes('<script>'));assert(!x.html.includes('<img src=x onerror'));assert(x.html.includes('&lt;script&gt;'))})
test('no external school crest when unexpected path or protocol provided',()=>{const x=make({logoUrl:'javascript:alert(1)'});assert(!x.html.includes('javascript:'));assert.equal(x.students,1)})
test('no school2/student session mutation actions in HTML',()=>{const x=make();assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|POST|DELETE|PUT/.test(x.html));assert(!x.html.includes('http://localhost'))})
test('CSS includes table borders, Jameel first in font stack, Urdu note RTL',()=>{const x=make();assert(x.html.includes('Jameel Noori Nastaleeq'));assert(x.html.includes('dir="rtl"'));assert(x.html.includes('border:.25mm solid'))})

test('weekly plan does not masquerade as consolidated term',()=>assert.throws(()=>make({plan:{...plan(),planningType:'weekly'}}),/Consolidate the saved weekly plan/))

// Source wiring: the SaaS API defaults to active=all; explicitly request active=true.
test('real SaaS roster API is queried with active student filter',async()=>{const fs=await import('node:fs');const src=fs.readFileSync(new URL('../DailyDiaryWorkspace.jsx',import.meta.url),'utf8');assert.match(src,/api\.get\('\/api\/students',\s*\{\s*params:\s*\{\s*class:\s*classLabel,\s*active:\s*'true'/)})

test('different class saved term plan fails closed',()=>assert.throws(()=>make({plan:{...plan(),classLevel:'Six'}}),/different class/))
test('different section saved term plan fails closed',()=>assert.throws(()=>make({plan:{...plan(),section:'Blue'}}),/different section/))
test('term plan cannot silently become a daily plan on save or smart paste',async()=>{
  const fs=await import('node:fs');const src=fs.readFileSync(new URL('../DailyDiaryWorkspace.jsx',import.meta.url),'utf8');
  for (const name of ['saveLessonPlan','arrangeLessonPaste','autoPlanToday']){
    const start=src.search(new RegExp('const\\s+'+name+'\\s*=\\s*async\\s*\\(\\)\\s*=>'));assert(start>=0,name)
    const next=src.slice(start,start+550)
    assert(next.includes("lessonDoc.planningType !== 'daily'"),name)
  }
})

test('merged English A+B generates separate English A/B assessment rows when teacher source separates them',()=>{
 const p={...plan(),termCoverageRows:[{subject:'English (A + B)',detail:'Read lesson and complete classwork.'}],assessments:[{subject:'English A',number:1,date:'2026-11-05'},{subject:'English B',number:1,date:'2026-11-09'}]}
 assert.deepEqual(studentTermDiaryAssessmentSubjects(p,studentTermDiarySubjects(p)),['English A','English B'])
 const output=make({plan:p}).html
 assert(output.includes('<th>English A</th>')&&output.includes('<th>English B</th>'))
 assert(output.includes('2026-11-05')&&output.includes('2026-11-09'))
})
test('teacher source assessment subjects not in lesson table are not silently lost',()=>{
 const p={...plan(),assessments:[...plan().assessments,{subject:'General Knowledge',number:1,date:'2026-11-12'}]}
 assert(studentTermDiaryAssessmentSubjects(p,studentTermDiarySubjects(p)).includes('General Knowledge'))
 assert(make({plan:p}).html.includes('<th>General Knowledge</th>'))
})
test('invalid real calendar dates rejected (31 Nov and non-leap Feb)',()=>{
 for(const date of ['2026-11-31','2027-02-29','31-11-2026']) {
   assert.throws(()=>make({plan:{...plan(),assessments:[{subject:'English (A + B)',number:1,date}]}}),/Unverified assessment date/)
 }
})
test('duplicate A1 slots rejected even if original date was blank',()=>{
 assert.throws(()=>make({plan:{...plan(),assessments:[{subject:'Urdu (A + B)',number:1,date:''},{subject:'Urdu (A + B)',number:1,date:'2027-01-05'}]}}),/Duplicate assessment number/)
})

test('legacy numeric Grade Three term class alias is compatible with word-label SaaS roster',()=>{
 const out=make({plan:{...plan(),classLevel:'3'},students:[student(1,'Ayesha',{class:'3'})]})
 assert.equal(out.students,1)
})
test('numeric School1 Eight still barred from Second Term print',()=>assert.throws(()=>make({classLevel:'8',plan:{...plan(),classLevel:'8'}}),/No Second Term/))

test('actual SaaS print refuses a single-subject term plan as full class diary',()=>assert.throws(()=>make({strictClassCoverage:true}),/Incomplete Three Second Term coverage/))

test('Pre-9, Grade 9, unknown classes are never silently printed as school Second Term',()=>{
 for(const klass of ['Pre-9','Pre 9th','9','Nine','Unknown'])assert.throws(()=>make({classLevel:klass}),/Only Starter–Seven/)
})
test('non-boolean inactive legacy value denied',()=>assert.throws(()=>make({students:[student(1,'Ayesha',{is_active:'false'})]}),/Inactive/))

test('SaaS print button must fail closed when roster loading failed or is in progress',async()=>{
 const fs=await import('node:fs');const src=fs.readFileSync(new URL('../DailyDiaryWorkspace.jsx',import.meta.url),'utf8')
 assert(src.includes('if (!rosterVerified)'))
 assert(src.includes('setRosterVerified(false)'))
 assert(src.includes('setRosterVerified(true)'))
 assert(src.includes('setStudents([]); setSelectedStudentIds([]); setRosterStatus(error'))
})
