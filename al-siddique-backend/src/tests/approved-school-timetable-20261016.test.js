'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const p=require('../services/approvedSchoolTimetable')
test('approved six school days, Friday no break, Sunday closed',()=>{
 for(const d of ['Monday','Tuesday','Wednesday','Thursday','Saturday']){
  const x=p.rowsForDay(d);assert.equal(x.length,10);assert.equal(x.filter(y=>y.kind==='teaching').length,8)
  assert.equal(x[0].start,'08:30');assert.equal(x.at(-1).end,'13:30')
  assert.equal(x.find(y=>y.label==='Period 5').start,'10:55')
  assert.equal(x.find(y=>y.label==='Break').duration_minutes,25)
 }
 const f=p.rowsForDay('Friday');assert.equal(f.length,9)
 assert(!f.some(x=>x.kind==='break'));assert.equal(f.at(-1).end,'12:30')
 assert.equal(f.find(x=>x.label==='Period 5').start,'10:40')
 assert.deepEqual(p.rowsForDay('Sunday'),[])
 assert.throws(()=>p.rowsForDay('Funday'),/INVALID_SCHOOL_WEEKDAY/)
})
test('first period defines non-junior class incharge, Friday displays correct slot, source DB timing ignored',()=>{
 const child={id:22,name:'Test learner',class:'Four',section:'Blue'}
 const rows=[
 {class_name:'Four',section:'Blue',period_label:'Period 1',subject:'Urdu',teacher_display_name:'Miss Aqsa',teacher_id:4192,start_time:'08:15'},
 {class_name:'Four',section:'Blue',period_label:'Period 5',subject:'English',teacher_display_name:'Miss Sumaira',teacher_id:2378},
 {class_name:'Five',section:'Blue',period_label:'Period 1',subject:'Math',teacher_display_name:'Miss Isma',teacher_id:3266}
 ]
 const v=p.buildChildTimetable(child,rows,'Friday')
 assert.equal(v.class_incharge.name,'Miss Aqsa')
 assert.equal(v.class_incharge.source,'verified-first-period')
 assert.equal(v.periods.find(x=>x.label==='Period 1').start,'08:45')
 assert.equal(v.periods.find(x=>x.label==='Period 5').start,'10:40')
 assert.equal(v.periods.find(x=>x.label==='Period 5').subject,'English')
 assert.equal(v.periods.filter(x=>x.subject).length,2)
 assert.equal(v.periods.find(x=>x.label==='Period 2').subject,null)
})
test('junior staff fixed; flyer excludes Faiza; Mover retains two teachers without inventing primary',()=>{
 for(const [cls,section,expected] of [['Starter','Blue','Miss Mubeen'],['Flyer','Pink','Miss Mubeen'],['One','Yellow','Miss Amina'],['Two','Orange','Miss Aasia'],['Three','Red','Miss Alisha']]){
  const t=p.buildChildTimetable({id:4,name:'Test',class:cls,section},[],'Monday')
  assert.equal(t.class_incharge.name,expected)
  assert.equal(t.timetable_status,'junior-subject-allocation-pending')
  assert(t.periods.filter(x=>x.kind==="teaching" && x.subject===null).length===8)
 }
 const m=p.buildChildTimetable({id:4,name:'Test',class:'Mover',section:'Purple'},[],'Monday')
 assert.equal(m.class_incharge.name,null)
 assert.deepEqual(m.class_incharge.teachers,['Miss Laiba','Miss Abida'])
 assert(!JSON.stringify(p.JUNIOR_INCHARGES).includes('Faiza'))
})
test('Class Eight is NOT automatically linked to Pre-Nine',()=>{
 const r=p.buildChildTimetable({id:5,name:'Test',class:'Eight',section:'Blue'},[
 {class_name:'Pre-Nine',section:'',period_label:'Period 1',subject:'Islamiyat',teacher_display_name:'Qari Fida-ul-Rehman',teacher_id:2386}
 ],'Tuesday')
 assert.equal(r.class_incharge.name,null)
 assert.equal(r.timetable_status,'unverified')
 assert.equal(r.periods.filter(x=>x.subject).length,0)
})
