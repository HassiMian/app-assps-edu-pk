const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const route=fs.readFileSync(path.join(__dirname,'../routes/lessonPlanRoutes.js'),'utf8')
test('tenant-scoped list query preserves its original school_id binding',()=>{
 assert(route.includes("SELECT * FROM lesson_plans WHERE school_id=$1"))
 assert(route.includes('AND created_by='))
})
test('grade alias lookup is read-only, parameterized and includes numeric legacy class codes',()=>{
 assert(route.includes('normalizeClassKey(rawClass)'))
 assert(route.includes("'5':'five'"))
 assert(route.includes('lower(class_level) = ANY($${params.length}::text[])'))
 assert(route.includes('params.push(aliases)'))
})
test('class key normalization cannot silently interpret Primary as Five',()=>{
 assert(route.includes('gradeNames[numericKey]'))
 assert(!route.includes("'Primary':'5'"))
})

test('date-scoped list includes existing weekly/term plans whose ranges cover selected day',()=>{
 assert(route.includes("planning_scope IN ('weekly','term')"))
 assert(route.includes('COALESCE(end_date,plan_date) >= $${dateFrom}::date'))
 assert(route.includes('plan_date <= $${dateTo}::date'))
 assert(route.includes('school_id=$1'))
})
