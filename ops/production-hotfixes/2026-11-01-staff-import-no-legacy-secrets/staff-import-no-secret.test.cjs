'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../../al-siddique-backend/src/scripts/importStaffList.js'),'utf8');
test('staff onboarding writes only a hashed login credential in users table',()=>{
  assert.match(source,/bcrypt\.hash\(plainPassword, 10\)/);
  assert.match(source,/\$21,NULL,'teacher',\$23::jsonb,true/);
});
test('existing employee updates remove rather than retain legacy password',()=>{
  assert.match(source,/portal_password = NULL,/);
  assert.doesNotMatch(source,/portal_password\s*=\s*COALESCE/);
});
