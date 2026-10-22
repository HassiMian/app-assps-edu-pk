'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const root=path.join(__dirname,'..')
const src=relative=>fs.readFileSync(path.resolve(root,relative),'utf8')
test('school-bound owner can see standard school admin and principal modules',()=>{
 const files=[
  'routes/paperStudioRoutes.js','routes/classEightPromotionPreflightRoutes.js',
  'routes/timetableReferenceRoutes.js','routes/schoolDocumentStudioRoutes.js',
  'routes/schoolAcademicApprovalCore.js','services/paperStudioProjectionService.js',
  'services/assessmentPrintJobs.js']
 for(const name of files){
  const text=src(name)
  assert.ok(text.includes("'owner'"),name+' must recognize Owner')
 }
 const roleUI=[
  '../../al-siddique-frontend/src/App.jsx',
  '../../al-siddique-frontend/src/components/Layout/sidebar.jsx',
  '../../al-siddique-frontend/src/services/permissions.js']
 for(const name of roleUI){
  const text=fs.readFileSync(path.resolve(root,name),'utf8')
  assert.ok(text.includes("'owner'"),name+' owner display')
 }
})
test('owner does not inherit cross-school platform super-admin or raw staff password reset',()=>{
 const auth=src('routes/authRoutes.js')
 assert.ok(auth.includes("req.user?.role !== 'super_admin' && req.user?.role !== 'admin'"))
 const mid=src('middleware/auth.js')
 assert.ok(mid.includes("const isSuperAdmin = role === 'super_admin' || role === 'platform_owner'"))
 assert.ok(!mid.includes("const isSuperAdmin = role === 'owner'"))
})
