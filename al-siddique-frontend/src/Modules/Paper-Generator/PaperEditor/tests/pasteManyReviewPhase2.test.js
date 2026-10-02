import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePasteMany,validatePasteManyRows,toQuestionBankRecord,questionIdentityKeys} from '../../pasteManyReview.js'
const subjectId='science-seven'
const allowed=['mcq','short','long','fill','true_false','columns']
const review=(rows,existing=[])=>validatePasteManyRows(rows,existing,subjectId,allowed)
test('plain numbered questions parse independently, with no invented marks or answers',()=>{
 const rows=parsePasteMany('1. Define photosynthesis.\n2) What is respiration?\n3: Explain diffusion.',{type:'short'})
 assert.deepEqual(rows.map(r=>r.text),['Define photosynthesis.','What is respiration?','Explain diffusion.'])
 assert.deepEqual(rows.map(r=>r.marks),['','',''])
 assert.equal(rows.every(r=>r.answer===''),true)
 assert.equal(review(rows).canCommit,false)
 const fixed=rows.map(r=>({...r,marks:'2'}))
 assert.equal(review(fixed).canCommit,true)
})
test('plain unnumbered line-separated questions and alternative structured Q tags',()=>{
 const plain=parsePasteMany('Define osmosis.\nExplain a cell.\nList two minerals.',{type:'short'})
 assert.equal(plain.length,3)
 const tagged=parsePasteMany('Q: Define osmosis.\nMARKS: 2\nANS: Movement of water.\n---\nQ: Define diffusion.\nMARKS: 2\nCHAP: Chapter 1',{type:'short'})
 assert.equal(tagged.length,2)
 assert.equal(tagged[0].marks,'2')
 assert.equal(tagged[0].answer,'Movement of water.')
 assert.equal(tagged[1].chapter,'Chapter 1')
 assert.equal(review(tagged).canCommit,true)
})
test('structured MCQ tags preserve all explicit options and answer',()=>{
 const text='Q: What is the capital of Pakistan?\nA: Lahore\nB: Islamabad\nC: Karachi\nD: Quetta\nANS: B\nMARKS: 1\nPRI: exercise'
 const [row]=parsePasteMany(text,{type:'mcq'})
 assert.equal(row.options.length,4)
 assert.equal(row.answer,'B')
 assert.equal(row.priority,'exercise')
 assert.equal(review([row]).canCommit,true)
 const bank=toQuestionBankRecord(row,subjectId)
 assert.equal(bank.options[1].text,'Islamabad')
 assert.equal(bank.marks,1)
 assert.equal(bank.subjectId,subjectId)
})
test('ordinary MCQ options A), (b), etc attach to their question',()=>{
 const input='1. Which is a living organism?\nA) Rock\n(b) Tree\nC. Water\nMARKS: 1\nANS: B\n2. What is 2 + 2?\nA) 3\nB) 4\nMARKS: 1\nANS: B'
 const rows=parsePasteMany(input,{type:'mcq'})
 assert.equal(rows.length,2)
 assert.deepEqual(rows[0].options.map(o=>o.label),['A','B','C'])
 assert.equal(review(rows).canCommit,true)
})
test('Urdu/dual content is preserved separately, missing translation blocks dual',()=>{
 const ur=parsePasteMany('Q: پانی کیا ہے؟\nMARKS: 2',{type:'short',medium:'urdu'})
 assert.equal(ur[0].text,'')
 assert.equal(ur[0].textUrdu,'پانی کیا ہے؟')
 assert.equal(review(ur).canCommit,true)
 const dual=parsePasteMany('Q: Define biology.\nMARKS: 2',{type:'short',medium:'dual'})
 assert.equal(review(dual).canCommit,false)
 assert.equal(review([{...dual[0],textUrdu:'حیاتیات کی تعریف کریں۔'}]).canCommit,true)
 const bank=toQuestionBankRecord(ur[0],subjectId)
 assert.equal(bank.text,'')
 assert.equal(bank.textUrdu,'پانی کیا ہے؟')
})
test('same question detected despite punctuation/spacing/marks differences',()=>{
 const [row]=parsePasteMany('Q: Define photosynthesis.\nMARKS: 4',{type:'short'})
 const existing=[{subjectId,type:'short',text:' Define  photosynthesis!',marks:2}]
 const analyzed=review([row],existing)
 assert.equal(analyzed.rows[0].duplicateExisting,true)
 assert.equal(analyzed.canCommit,false)
 assert.equal(review([{...row,included:false}],existing).includedCount,0)
})
test('duplicates within one batch are flagged, skipping makes remaining row valid',()=>{
 const rows=parsePasteMany('1. Explain gravity.\n2. Explain gravity!',{type:'short'}).map(r=>({...r,marks:'2'}))
 const result=review(rows)
 assert.equal(result.rows[1].duplicateBatch,true)
 assert.equal(result.canCommit,false)
 const skipped=review(rows.map((r,i)=>i===1?{...r,included:false}:r))
 assert.equal(skipped.canCommit,true)
 assert.equal(skipped.includedCount,1)
})
test('matching columns and invalid MCQ answer are blocked before writing',()=>{
 const row=parsePasteMany('Q: Match terms\nLEFT: A|B\nRIGHT: One\nMARKS: 2',{type:'columns'})
 assert.equal(review(row).canCommit,false)
 const corrected=[{...row[0],rightColumn:['One','Two']}]
 assert.equal(review(corrected).canCommit,true)
 const mcq=parsePasteMany('Q: Pick one\nA: Yes\nB: No\nANS: D\nMARKS: 1',{type:'mcq'})
 assert.equal(review(mcq).canCommit,false)
 assert.equal(review([{...mcq[0],answer:'B'}]).canCommit,true)
})
test('explicit marks and type constraints are enforced, not coerced to 1',()=>{
 const row=parsePasteMany('Q: Explain heat.',{type:'short'})[0]
 for(const marks of ['',0,'0','-2','banana','1001']){
  assert.equal(review([{...row,marks}]).canCommit,false)
 }
 assert.equal(review([{...row,marks:'2',type:'unapproved'}]).canCommit,false)
 assert.equal(review([{...row,marks:'2'}]).canCommit,true)
})
test('batch size cap and source preservation',()=>{
 const raw=Array.from({length:151},(_,i)=>(i+1)+'. Question '+(i+1)).join('\n')
 assert.throws(()=>parsePasteMany(raw),/Maximum 150/)
 const original='Q: Define life.\nMARKS: 2'
 const rows=parsePasteMany(original)
 const copy=JSON.stringify(rows)
 review(rows)
 assert.equal(JSON.stringify(rows),copy)
 assert.equal(original,'Q: Define life.\nMARKS: 2')
 assert.deepEqual(questionIdentityKeys({subjectId,type:'short',text:'Life?'},subjectId),[subjectId+'::short::en:life'])
})

test('structured Q+UR sets Dual with an explicit review notice, never drops either language',()=>{
 const input='Q: Define biology.\nUR: حیاتیات کی تعریف کریں۔\nMARKS: 2'
 const [row]=parsePasteMany(input,{type:'short',medium:'english'})
 assert.equal(row.medium,'dual')
 assert.match(row.parseWarnings.join(' '),/Dual/)
 assert.equal(review([row]).canCommit,true)
 const explicitEnglish={...row,medium:'english'}
 assert.equal(review([explicitEnglish]).canCommit,false)
 const explicitUrdu={...row,medium:'urdu'}
 assert.equal(review([explicitUrdu]).canCommit,false)
})
test('Urdu MCQ maps Urdu options into textUrdu rather than silently dropping their language',()=>{
 const [row]=parsePasteMany('Q: صحیح لفظ چنیں۔\nA: پانی\nB: آگ\nMARKS: 1\nANS: A',{type:'mcq',medium:'urdu'})
 assert.equal(review([row]).canCommit,true)
 const record=toQuestionBankRecord(row,subjectId)
 assert.equal(record.options[0].text,'')
 assert.equal(record.options[0].textUrdu,'پانی')
 assert.equal(record.options[1].textUrdu,'آگ')
})
test('Dual MCQ requires aligned bilingual options before Commit',()=>{
 const input='Q: Choose a number.\nUR: ایک عدد منتخب کریں۔\nA: One\nB: Two\nMARKS: 1\nANS: A'
 const [row]=parsePasteMany(input,{type:'mcq',medium:'english'})
 assert.equal(row.medium,'dual')
 assert.equal(review([row]).canCommit,false)
 const opts=row.options.map((o,i)=>({...o,textUrdu:i===0?'ایک':'دو'}))
 assert.equal(review([{...row,options:opts}]).canCommit,true)
})

test('structured-only activity types cannot be silently stored as plain questions',()=>{
 const rows=parsePasteMany('Q: Change singular to plural.\nMARKS: 2',{type:'short'})
 const changed={...rows[0],type:'wahid_jama'}
 const result=validatePasteManyRows([changed],[],subjectId,[...allowed,'wahid_jama'])
 assert.equal(result.canCommit,false)
 assert.match(result.rows[0].errors.join(' '),/Advanced Add/)
})
