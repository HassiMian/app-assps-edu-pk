import test from 'node:test'
import assert from 'node:assert/strict'
import { marksSubjectsForClass as pick } from './marksEntryModel.js'
const assessment={name:'Assessment 1',type:'AS',subject_offerings:[]}
test('Assessment without approved offerings cannot use unrelated school subjects',()=>assert.deepEqual(pick({exam:assessment,className:'Five',academicSubjects:['Math']}),[]))
test('Assessment with missing catalog fails closed',()=>assert.deepEqual(pick({exam:{name:'Assessment 2',type:'Assessment'},className:'Five',academicSubjects:['Math']}),[]))
test('Approved server catalog subject remains visible to exact class',()=>assert.deepEqual(pick({exam:{...assessment,subject_offerings:[{class_name:'Five',subject:'English'}]},className:'Five'}),['English']))
test('Pre Nine and Nine must remain distinct',()=>assert.deepEqual(pick({exam:{...assessment,subject_offerings:[{class_name:'Nine',subject:'Biology'}]},className:'Pre Nine',academicSubjects:['Biology']}),[]))
test('First Term official fallback remains available',()=>assert.ok(pick({exam:{name:'First Term Exam',type:'TE',session:'2026-2027'},className:'Five'}).length>0))
