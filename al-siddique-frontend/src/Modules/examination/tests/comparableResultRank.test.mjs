import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {rankComparableResults as rank} from '../comparableResultRank.js'
const subjects=['English Oral','English Written','GK Oral','Math Oral','Math Written','Urdu Oral','Urdu Written']
const ledger=(id,marks,scheme=subjects,possible=scheme.map((_,i)=>(i===1||i===4||i===6)?50:25),cls='Flyer')=>
  scheme.map((subject,index)=>({student_id:id,subject,marks_obtained:marks[index],total_marks:possible[index],student_class:cls}))
const users=(...ids)=>ids.map(id=>({id,class:'Flyer'}))
test('baseline unfair raw total fixed: noncomparable 320-point outlier is unranked',()=>{
  const a=ledger(1,[24,48,24,24,48,24,24])
  const b=ledger(2,[23,46,23,23,46,23,23])
  const c=ledger(3,[55,58,56,52,49],['English','Urdu','Mathematics','Science','Islamiyat'],[75,75,60,60,50])
  // Outlier score is 270/320, above 216/250 raw but different subject scheme.
  const r=rank([...a,...b,...c],users(1,2,3))
  assert.equal(r.get('1'),'1st')
  assert.equal(r.get('2'),'2nd')
  assert.equal(r.get('3'),null)
})
test('genuine 0 marks are ranked, not treated as missing/null',()=>{
 const r=rank([...ledger(1,[0,0,0,0,0,0,0]),...ledger(2,[1,0,0,0,0,0,0])],users(1,2))
 assert.equal(r.get('1'),'2nd')
 assert.equal(r.get('2'),'1st')
})
test('ties use stable competition ranks 1,1,3',()=>{
 const r=rank([...ledger(1,[10,20,10,10,20,10,10]),...ledger(2,[10,20,10,10,20,10,10]),...ledger(3,[9,19,9,9,19,9,9])],users(1,2,3))
 assert.equal(r.get('1'),'1st')
 assert.equal(r.get('2'),'1st')
 assert.equal(r.get('3'),'3rd')
})
test('same total possible with different subject structure is unranked',()=>{
 const out=ledger(3,[50,30],['English','Urdu'],[150,100])
 const r=rank([...ledger(1,[10,20,10,10,20,10,10]),...ledger(2,[11,21,11,11,21,11,11]),...out],users(1,2,3))
 assert.equal(r.get('3'),null)
})
test('tied cohort schemes fail closed for all, including raw score winner',()=>{
 const x=ledger(1,[10,20,10,10,20,10,10])
 const y=ledger(2,[12,23,12,12,23,12,12])
 const z=ledger(3,[56,50],['English','Urdu'],[150,100])
 const w=ledger(4,[58,51],['English','Urdu'],[150,100])
 const r=rank([...x,...y,...z,...w],users(1,2,3,4))
 assert([...r.values()].every(v=>v===null))
})
test('missing mark is NOT silently converted into a valid numeric zero',()=>{
 const wrong=ledger(2,[20,30,20,20,30,20,20]);wrong[2].marks_obtained=null
 const r=rank([...ledger(1,[21,31,21,21,31,21,21]),...ledger(3,[20,30,20,20,30,20,20]),...wrong],users(1,2,3))
 assert.equal(r.get('2'),null)
 assert.equal(r.get('1'),'1st')
})
test('duplicate subject and out-of-range values fail closed',()=>{
 const e=ledger(2,[20,30,20,20,30,20,20]);
 const missing=ledger(4,[20,30,20,20,30,20,20]);missing[0].marks_obtained=900;
 const r=rank([...ledger(1,[25,30,20,20,30,20,20]),...ledger(3,[20,30,20,20,30,20,20]),...e,e[0],...missing],users(1,2,3,4))
 assert.equal(r.get('2'),null)
 assert.equal(r.get('4'),null)
})
test('excluded Quran/Nazra does not perturb scheme fingerprint or ranking',()=>{
 const rows=[...ledger(1,[10,20,10,10,20,10,10]),...ledger(2,[11,20,10,10,20,10,10]),{student_id:1,subject:'Quran / Nazra',marks_obtained:23,total_marks:50}]
 const r=rank(rows,users(1,2),{excludedSubject:name=>String(name).includes('Nazra')})
 assert.equal(r.get('2'),'1st')
 assert.equal(r.get('1'),'2nd')
})
test('different classes cannot be ranked together',()=>{
 // Replace malformed fixture with real alternate class record.
 const other=ledger(3,[20,20,20,20,20,20,20],subjects,undefined,'Three')
 const r=rank([...ledger(1,[10,20,10,10,20,10,10]),...other],[{id:1,class:'Flyer'},{id:3,class:'Three'}])
 assert.equal(r.get('1'),'1st')
 assert.equal(r.get('3'),'1st')
})
test('singleton scheme cannot become dominant by arbitrary ordering',()=>{
 const a=ledger(1,[10,20,10,10,20,10,10])
 const b=ledger(2,[50,60],['English','Urdu'],[150,100])
 const r=rank([...a,...b],users(1,2))
 assert.equal(r.get('1'),null)
 assert.equal(r.get('2'),null)
})
test('printed ResultCards.jsx cannot fallback to a stale student.position',()=>{
 const source=fs.readFileSync(path.join(import.meta.dirname,'../ResultCards.jsx'),'utf8')
 assert.match(source,/rankComparableResults\(activeResults,students/)
 assert.match(source,/const pos = classRanks\.get\(String\(s\.id\)\) \|\| '—'/)
 assert.doesNotMatch(source,/const pos = classRanks\.get\(String\(s\.id\)\) \|\| s\.position/)
})
test('production-size Flyer layout: 24 comparable students outrank a higher RAW total from a different scheme',()=>{
 const normal=[]
 for(let id=1;id<=24;id++)normal.push(...ledger(id,[id,15,15,15,15,15,15]))
 const outsider=ledger(25,[60,60,60,60,50],['English','Urdu','Mathematics','Science','Islamiyat'],[75,75,60,60,50])
 const r=rank([...normal,...outsider],users(...Array.from({length:25},(_,i)=>i+1)))
 assert.equal(r.get('25'),null)
 assert.equal(r.get('24'),'1st')
 assert.equal(r.get('1'),'24th')
 assert.equal(r.size,25)
})
// Regression: imported/edited empty marks must NOT be converted to numeric 0.
for (const [name,bad] of [
  ['blank marks','   '],
  ['boolean marks',false],
  ['exponential marks','1e1'],
  ['hexadecimal marks','0x10'],
]) {
  test(`${name} cannot enter an approved ranking cohort`,()=>{
    const a=ledger(1,[10,20,10,10,20,10,10])
    const b=ledger(2,[9,19,9,9,19,9,9])
    const unverified=ledger(3,[1,2,3,4,5,6,7])
    unverified[0].marks_obtained=bad
    const ranks=rank([...a,...b,...unverified],users(1,2,3))
    assert.equal(ranks.get('1'),'1st')
    assert.equal(ranks.get('2'),'2nd')
    assert.equal(ranks.get('3'),null)
  })
}
