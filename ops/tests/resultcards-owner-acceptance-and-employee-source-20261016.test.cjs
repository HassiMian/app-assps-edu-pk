'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx'),'utf8')
test('React useCallback imported at Employees boundary, no global polyfill required',()=>{
 assert.match(source,/import\s*\{[^}]*\buseCallback\b[^}]*\}\s*from\s*['"]react['"]/)
 assert.match(source,/const btnPrimary\s*=/)
 assert.match(source,/const btnSecondary\s*=/)
 assert.doesNotMatch(source,/window\.React\s*=|window\.useCallback\s*=/)
})
test('only incomplete academic records print DRAFT while owner accepted full subject cards do not show generic awaiting approval',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/examination/premiumResultCardTemplates.jsx'),'utf8')
 assert.match(src,/academicIntegrity\?\.status==='DRAFT'/)
 assert.doesNotMatch(src,/AWAITING ACADEMIC APPROVAL/)
 assert.match(src,/DRAFT RESULT/)
})
