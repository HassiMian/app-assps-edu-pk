import test from 'node:test'
import assert from 'node:assert/strict'
import {cloudAssessmentRows} from './savedCloudAssessment.js'
test('cloud assessment list uses authorized server IDs even when browser has an older local mirror',()=>{
 const rows=cloudAssessmentRows([
  {public_id:'a-1',title:'Assessment 1',current_revision:3,status:'DRAFT'},
  {public_id:'a-2',title:'Assessment 2',current_revision:1,status:'DRAFT'},
  {public_id:'a-2',title:'Assessment 2 DUPLICATE'},
  {public_id:''},
 ])
 assert.equal(rows.length,2)
 assert.equal(rows[0].name,'Assessment 1')
 assert.equal(rows[1].name,'Assessment 2')
 assert.equal(rows[0].serverOnly,true)
 assert.equal(rows[0].serverPaperId,'a-1')
 assert.equal(rows[1].serverPaperId,'a-2')
 assert.equal(rows[0].persistenceMode,'SERVER_LISTED_NOT_YET_OPENED')
 assert.equal('canonicalDocument' in rows[0],false,'listing is not a trusted edit document')
})
test('invalid or missing cloud responses never masquerade as empty authorized lists',()=>{
 assert.throws(()=>cloudAssessmentRows(null))
 assert.deepEqual(cloudAssessmentRows([]),[])
})
