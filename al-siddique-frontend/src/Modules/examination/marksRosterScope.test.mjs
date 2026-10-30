import test from 'node:test'
import assert from 'node:assert/strict'
import {marksRosterQueryParams} from './marksEntryModel.js'

test('Assessment 1/2/3 excludes inactive pupils through server-side roster filter', () => {
  for (const exam of [{type:'AS',name:'Assessment 1'}, {type:'Assessment',name:'Assessment 2'}]) {
    assert.deepEqual(marksRosterQueryParams('Class Seven',exam), {class:'Class Seven',active:'true'})
  }
})
test('historical First Term rosters remain available for authorized past result review', () => {
  assert.deepEqual(marksRosterQueryParams('Class Seven',{type:'TE',name:'First Term'}), {class:'Class Seven'})
  assert.deepEqual(marksRosterQueryParams('Class Seven',{type:'Term Exam',name:'First Term'}), {class:'Class Seven'})
})
test('query params never widen scope to a full-school roster', () => {
  assert.deepEqual(marksRosterQueryParams('Class 3',{type:'Assessment'}), {class:'Class 3',active:'true'})
})
