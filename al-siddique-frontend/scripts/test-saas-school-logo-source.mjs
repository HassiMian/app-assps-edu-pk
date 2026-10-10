import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try {
 const m={
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardData.js'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardPrint.js'),
 }
 const base={student:{name:'Synthetic Student'},exam:{name:'First Term',total_marks:100},studentMarks:[{subject:'Science',marks_obtained:85,total_marks:100}],options:{...m.DEFAULT_RESULT_OPTIONS,template:'signature-editorial'}}
 for(const [schoolLogo,expected] of [
  ['https://assets.example.test/tenant-one-crest.png','https://assets.example.test/tenant-one-crest.png'],
  ['/uploads/tenant-two-school.png','/api/uploads/tenant-two-school.png'],
  ['/api/uploads/school-logo.svg','/api/uploads/school-logo.svg']
 ]) {
  const data=m.buildResultCardData({...base,school:{name:'Test School',logo:schoolLogo}})
  const html=renderToStaticMarkup(createElement(m.ResultCardPreview,{data}))
  assert.ok(html.includes('src="'+expected+'"'), 'Original SaaS-configured logo must be used: '+expected)
  assert.ok(!html.includes('apex-logo.svg'), 'APEX product logo must never appear in school report card')
 }
 const missing=m.buildResultCardData({...base,school:{name:'Test School',logo:null}})
 const html=renderToStaticMarkup(createElement(m.ResultCardPreview,{data:missing}))
 assert.ok(!html.includes('school-logo.svg') && !html.includes('apex-logo.svg'),'Do not substitute any unapproved logo')
 console.log('SAAS_SCHOOL_LOGO_SOURCE 4/4 PASS: tenant settings used as-is; no generated/hardcoded crest')
} finally {await vite.close()}
