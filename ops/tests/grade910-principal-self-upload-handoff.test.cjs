'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const root=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator')
const ui=fs.readFileSync(path.join(root,'Grade910WorkspaceApprovedInsert.jsx'),'utf8')
const signoff=fs.readFileSync(path.join(root,'Grade910HumanSignoff.jsx'),'utf8')
const service=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-backend/src/services/grade910HumanSignoffService.js'),'utf8')
test('canonical workspace exposes existing principal PERSONAL signature intake without teacher impersonation',()=>{
 assert.match(ui,/href="\/academic\/grade910-signoffs"/)
 assert.match(ui,/Teacher signatures remain pending/)
 assert.match(signoff,/role==='principal'\?\['book_adoption','principal_approval'\]/)
})
test('principal submission cannot itself authorize academic verified publication',()=>{
 assert.match(signoff,/academicallyApproved:false,paperStudioSelectable:false,published:false/)
 assert.match(service,/PENDING_SCHOOL_IDENTITY_VERIFICATION/)
 assert.doesNotMatch(ui,/academicallyApproved:true/)
})
