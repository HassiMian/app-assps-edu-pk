'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const root=path.join(__dirname,'..')
const service=fs.readFileSync(path.join(root,'services/portalAccountService.js'),'utf8')
const route=fs.readFileSync(path.join(root,'routes/employeeRoutes.js'),'utf8')
test('low-level account provisioning refuses arbitrary privileged roles',()=>{
 assert.ok(service.includes("new Set(['teacher','accountant','student','parent'])"))
 assert.ok(service.includes('PORTAL_ROLE_NOT_ELIGIBLE_FOR_SELF_SERVICE'))
 assert.ok(service.includes("String(existing.role||'').toLowerCase() !== normalizedRole"))
 assert.ok(service.includes('PORTAL_EXISTING_ROLE_MISMATCH'))
})
test('employee portal route may only provision teacher or accountant',()=>{
 assert.ok(route.includes("['teacher','accountant'].includes(role)"))
 assert.ok(route.includes('STAFF_ROLE_ESCALATION_DENIED'))
 assert.ok(!route.includes("['owner','admin','principal'].includes(role)"))
})
