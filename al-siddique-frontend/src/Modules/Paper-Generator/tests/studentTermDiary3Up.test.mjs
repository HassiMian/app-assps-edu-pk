import test from 'node:test'
import assert from 'node:assert/strict'
import {buildStudentTermDiary3Up as build,studentTermDiaryColor,studentTermDiaryIdentity,studentTermDiarySubjects} from '../studentTermDiary3Up.js'
const student=(id=1,name='Ayesha',s={})=>({id,name, father_name:'Zain Ali',class:'Three',section:'Red',roll_number:'',gr_number:'MIG26-001',is_active:true,...s})
const plan=()=>({classLevel:'Three',planningType:'term',termCoverageRows:[{subject:'English (A + B)',detail:'Read Units 7–11 and complete classwork.'},{subject:'Urdu (A + B)',detail:'سبق پڑھیں اور کلاس ورک مکمل کریں۔'}],assessments:[{subject:'English (A + B)',number:1,date:'2026-11-05'},{subject:'English (A + B)',number:3,date:'2027-01-12'}]})
const make=(opts={})=>build({students:[student()],plan:plan(),classLevel:'Three',section:'Red',schoolName:'Al Siddique Scholars Public School',logoUrl:'/assets/assps.png',...opts})
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
