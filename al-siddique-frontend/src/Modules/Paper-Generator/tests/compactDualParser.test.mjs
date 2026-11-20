import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCompactDual, serializeCompactDual, optionColumnCount} from '../compactDualParser.js';

const options=[
  {id:'A',en:'Water',ur:'پانی'},
  {id:'B',en:'Air',ur:'ہوا'},
  {id:'C',en:'Light',ur:'روشنی'},
  {id:'D',en:'Heat',ur:'حرارت'},
];
const doc={
  kind:'mcq',
  items:[
    {id:'q1',number:1,en:'Which is liquid?',ur:'کون سا مائع ہے؟',options},
    {id:'q2',number:2,en:'Which is gas?',ur:'کون سی گیس ہے؟',options},
  ],
};
const parse=content=>parseCompactDual({medium:'dual',content});

test('valid two-question MCQ roundtrip preserves four aligned A-D options',()=>{
  const actual=parse(serializeCompactDual(doc));
  assert.equal(actual.kind,'mcq');
  assert.deepEqual(actual.items.map(x=>x.number),[1,2]);
  assert.deepEqual(actual.items.map(x=>x.options.map(o=>o.id)),[['A','B','C','D'],['A','B','C','D']]);
  assert.equal(actual.items[0].ur,doc.items[0].ur);
});
test('duplicate MCQ serials are rejected instead of silently rendered',()=>{
  const raw=serializeCompactDual(doc);
  const repeated=raw.replace('2. Which is gas?','1. Which is gas?').replace('2۔ کون سی گیس ہے؟','1۔ کون سی گیس ہے؟');
  assert.equal(parse(repeated),null);
});
test('decreasing MCQ serials are rejected',()=>{
  const raw=serializeCompactDual(doc);
  const descending=raw.replace('2. Which is gas?','0. Which is gas?').replace('2۔ کون سی گیس ہے؟','0۔ کون سی گیس ہے؟');
  assert.equal(parse(descending),null);
});
test('serializer rejects malformed or duplicate MCQ serials',()=>{
  assert.throws(()=>serializeCompactDual({...doc,items:[doc.items[0],{...doc.items[1],number:1}]}),/serials/);
});
test('valid bilingual short questions retain their supplied numbering',()=>{
  const actual=parse('1. Define matter / مادہ کی تعریف کریں\n3. Define light / روشنی کی تعریف کریں');
  assert.equal(actual.kind,'short');
  assert.deepEqual(actual.items.map(x=>x.number),[1,3]);
});
test('duplicate short numbers and reversed numbers fail closed',()=>{
  assert.equal(parse('1. Define matter / مادہ کی تعریف کریں\n1. Define light / روشنی کی تعریف کریں'),null);
  assert.equal(parse('2. Define matter / مادہ کی تعریف کریں\n1. Define light / روشنی کی تعریف کریں'),null);
});
test('short serializer rejects duplicate and unsafe numbers',()=>{
  const q={kind:'short',items:[{number:1,en:'Matter',ur:'مادہ'},{number:1,en:'Light',ur:'روشنی'}]};
  assert.throws(()=>serializeCompactDual(q),/serials/);
  q.items[1].number=Number.MAX_SAFE_INTEGER+1;
  assert.throws(()=>serializeCompactDual(q),/serials/);
});
test('A OR B is one structured long question, OR is not numbered',()=>{
  const raw='(A) Define atom / ایٹم کی تعریف کریں\nOR / یا\n(B) Define molecule / سالمے کی تعریف کریں';
  const actual=parse(raw);
  assert.equal(actual.kind,'long');
  assert.deepEqual(actual.items.map(x=>x.number),['A','B']);
  assert.equal(serializeCompactDual(actual),raw);
});
test('duplicate long choice letters A/A and B/B fail closed',()=>{
  assert.equal(parse('(A) Define atom / ایٹم کی تعریف کریں\nOR / یا\n(A) Define molecule / سالمے کی تعریف کریں'),null);
  assert.equal(parse('(B) Define atom / ایٹم کی تعریف کریں\nOR / یا\n(B) Define molecule / سالمے کی تعریف کریں'),null);
});
test('long serializer accepts only exactly A and B',()=>{
  assert.throws(()=>serializeCompactDual({kind:'long',items:[{number:'A',en:'A',ur:'الف'},{number:'A',en:'B',ur:'ب'}]}),/exactly A OR B/);
});
test('English-only questions cannot enter dual parser',()=>{
  assert.equal(parseCompactDual({medium:'en',content:serializeCompactDual(doc)}),null);
});
test('small options retain compact four-column layout',()=>{
  assert.equal(optionColumnCount(options),4);
});

