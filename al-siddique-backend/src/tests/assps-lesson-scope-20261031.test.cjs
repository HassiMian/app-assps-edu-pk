'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {checkSchoolPlanningScope}=require('../services/asspsLessonScope2026')
const {violatesAsspsSecondTermPolicy}=require('../services/asspsSecondTermPolicy')
test('Pre Nine aliases held, only ASSPS school 1',()=>{
 for(const name of ['Pre Nine','Pre-Nine','Pre 9','Pre 9th','Pre-IX'])assert.equal(checkSchoolPlanningScope(1,name)?.code,'ASSPS_PRENINE_PLANNING_HELD',name)
 assert.equal(checkSchoolPlanningScope(2,'Pre Nine'),null)
})
test('Eight Second Term blocked while genuine historical First Term remains accessible',()=>{
 assert.equal(violatesAsspsSecondTermPolicy(1,{classLevel:'Class Eight',term:'Second Term'}),true)
 assert.equal(violatesAsspsSecondTermPolicy(1,{classLevel:'Class Eight',term:'First Term'}),false)
 assert.equal(violatesAsspsSecondTermPolicy(2,{classLevel:'Eight',term:'Second Term'}),false)
})
test('Starter–Class Seven and Class Nine unaffected by Pre Nine reservation',()=>{
 for(const name of ['Starter','Mover','Flyer','One','Class 1','Seven','Class Seven','Nine'])assert.equal(checkSchoolPlanningScope(1,name),null,name)
})
test('all three new writes and portal share are guarded',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../routes/lessonPlanRoutes.js'),'utf8')
 assert.equal(s.split('checkSchoolPlanningScope(schoolId,').length-1,5)
 assert.equal(s.split('if(excluded)return res.status(409)').length-1,3)
 assert.match(s,/preNinePolicyHold/)
})
