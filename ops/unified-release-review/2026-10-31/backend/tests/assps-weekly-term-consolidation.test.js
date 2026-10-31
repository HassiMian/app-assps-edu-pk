'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {consolidateWeeklyToTerm:f,parsePages}=require('../services/asspsWeeklyTermConsolidator')
const p=(id,date,parts,cls='Seven',section='Blue')=>({public_id:id,planning_scope:'weekly',class_level:cls,plan_date:date,end_date:date,payload:{section,subjects:parts.map(([subject,pg])=>({subject,units:[{pageRange:pg}]}))}})
test('page parsing never invents missing source pages',()=>{
 assert.deepEqual(parsePages('Pages 32–40'),{start:32,end:40})
 assert.deepEqual(parsePages('Pg# 41 to 50'),{start:41,end:50})
 for(const x of ['','Chapter 1','the next pages','51–12','0–3','1–2001']) assert.equal(parsePages(x),null)
})
test('weekly evidence consolidates a single range rather than concatenating weekly instructions',()=>{
 const x=f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Science','31–40']]),p('w2','2026-10-22',[['Science','41–49']])]})
 assert.ok(x.data,JSON.stringify(x))
 assert.equal(x.data.subjects[0].pageRangeLabel,'Pages 31–49')
 assert.equal(x.data.sourceStartDate,'2026-10-15')
 assert.equal(x.data.assessments.length,4)
 assert.equal(x.data.paperLayout.portraitPlansPerSheet,3)
 assert.match(x.data.academicCertification,/HOLD/)
})
test('English A/B merge under one subject but retain independent textbook pagination',()=>{
 const x=f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['English A','31–36'],['English B','12–18']]),p('w2','2026-10-22',[['English A','37–40'],['English B','19–22']])]})
 assert.ok(x.data,JSON.stringify(x))
 assert.equal(x.data.subjects.length,1)
 assert.equal(x.data.subjects[0].pageRangeLabel,'English A: Pages 31–40 | English B: Pages 12–22')
})
test('Class Eight Second Term and Pre Nine are excluded, Nine remains distinct',()=>{
 for(const cls of ['Eight','8'])assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']],cls)]}).error,'ASSPS_EIGHT_SECOND_TERM_FORBIDDEN')
 assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']],'Pre-Nine')]}).error,'PRE_NINE_PLANNING_DEFERRED')
 assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']],'Nine')]}).error,'SECOND_TERM_SCHOOL_SCOPE_ENDS_AT_SEVEN')
})
test('missing, out-of-order and gapped pages fail closed',()=>{
 assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','Chapter 2']])]}).error,'OFFICIAL_SOURCE_PAGES_REQUIRED')
 assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']]),p('w2','2026-10-22',[['Math','49–52']])]}).error,'SOURCE_PAGE_GAP_REQUIRES_REVIEW')
 assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']]),p('w2','2026-10-22',[['Math','15–19']])]}).error,'SOURCE_PAGES_OUT_OF_SEQUENCE')
})
test('school and class/section mixing rejected',()=>{
 assert.equal(f({schoolId:2,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']])]}).error,'ASSPS_SCHOOL_SCOPE_REQUIRED')
 assert.equal(f({schoolId:1,weeklyPlans:[p('w1','2026-10-15',[['Math','31–40']],'Seven','Blue'),p('w2','2026-10-22',[['Math','41–50']],'Seven','Red')]}).error,'MIXED_SECTION_SOURCES_REJECTED')
})
