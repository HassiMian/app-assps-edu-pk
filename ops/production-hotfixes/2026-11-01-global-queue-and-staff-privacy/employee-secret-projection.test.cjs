'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {employeePublicRecord}=require('./staffSecurityProjection')
const src=fs.readFileSync('/root/secure-archive/assps-security-mission-20261101/employeeRoutes.candidate.js','utf8')
test('legacy portal password removed from employee responses without altering source',()=>{
 const record={id:9,school_id:1,name:'Synthetic Test',portal_password:'A_PRIVATE_SECRET_NOT_TO_SEND',
  portal_username:'test',portal_role:'teacher',is_active:true}
 const safe=employeePublicRecord(record)
 assert.equal(Object.prototype.hasOwnProperty.call(safe,'portal_password'),false)
 assert.equal(safe.portal_role,'teacher')
 assert.equal(record.portal_password,'A_PRIVATE_SECRET_NOT_TO_SEND')
 assert.equal(JSON.stringify(safe).includes(record.portal_password),false)
})
test('list/detail/create/update responses all sanitize legacy credential',()=>{
 assert.match(src,/result\.rows\.map\(employeePublicRecord\)/)
 assert.match(src,/data: employeePublicRecord\(result\.rows\[0\]\)/)
 assert.match(src,/data: employeePublicRecord\(updated\)/)
 assert.equal((src.match(/data: employeePublicRecord\(result\.rows\[0\]\)/g)||[]).length,2)
})
test('employee mass assignment no longer accepts raw legacy password',()=>{
 const fields=src.slice(src.indexOf('const EMPLOYEE_WRITE_FIELDS'),src.indexOf('async function existingEmployeeWriteFields'))
 assert.equal(fields.includes("'portal_password'"),false)
 assert.match(src,/portal_password = NULL/) // explicit provisioning cleanup preserved
})
test('projection handles null and immutable sample',()=>{
 assert.equal(employeePublicRecord(null),null)
 assert.equal(employeePublicRecord(undefined),undefined)
 assert.deepEqual(employeePublicRecord({portal_password:null,id:1}),{id:1})
})
