'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const pre=fs.readFileSync(require('node:path').join(__dirname,'employeeRoutes.before.js'),'utf8')
const next=fs.readFileSync(require('node:path').join(__dirname,'employeeRoutes.after.js'),'utf8')
test('employee queries do not fetch historical password field',()=>{assert.match(next,/EMPLOYEE_DIRECTORY_SAFE_COLUMNS/);assert.doesNotMatch(next,/SELECT \* FROM employees/);assert.match(next,/FROM employees WHERE is_active/);assert.match(next,/FROM employees WHERE id/)})
test('safe database field list retains legacy directory fields',()=>{for(const name of ['emp_id','name','school_id','tenant_id','phone','email','salary','user_id','raw_import','portal_role'])assert.match(next,new RegExp('\\b'+name+'\\b'));const cols=next.match(/const EMPLOYEE_DIRECTORY_SAFE_COLUMNS = '([^']+)'/);assert.ok(cols);assert.ok(!cols[1].split(',').map(x=>x.trim()).includes('portal_password'))})
test('existing response redaction still remains',()=>{assert.match(next,/employeePublicRecord\(result.rows\[0\]\)/);assert.match(next,/result.rows.map\(employeePublicRecord\)/)})
test('guarded staff create/edit routes stay untouched',()=>{assert.match(next,/rejectLegacyPortalPasswordWrite/);assert.equal((pre.match(/router\.(get|post|patch|put|delete)\(/g)||[]).length,(next.match(/router\.(get|post|patch|put|delete)\(/g)||[]).length)})
