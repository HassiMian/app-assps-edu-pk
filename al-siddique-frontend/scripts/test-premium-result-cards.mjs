import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
 const m = {
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardData.js'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardPrint.js'),
 }
 const opts = { ...m.DEFAULT_RESULT_OPTIONS, gradeBands: [{ from: 0, to: 39, label: 'F' }, { from: 40, to: 100, label: 'A' }] }
 const base = { student: { name: 'Test Student', className: 'Six' }, exam: { name: 'First Term', total_marks: 100 }, school: { name: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL' } }
 const one = m.buildResultCardData({ ...base, options:{...opts,template:'signature-editorial'}, studentMarks: [{ subject: 'Computer', marks_obtained: 0, grade: 'A+' }] })
 assert.equal(one.result.totalMarks, 100, 'Unentered four term columns must not inflate denominator to 500')
 assert.equal(one.result.obtainedMarks, 0, 'Real zero is distinct from absent marks')
 assert.equal(one.result.grade, 'F', 'Stale stored A+ must not override computed grade')
 assert.equal(one.result.subjects[0].secondTermMarks, null)
 console.log('PASS zero-score vs missing terms, marks denominator, grade calculation')
 const mixed = m.buildResultCardData({ ...base, options:{...opts,template:'signature-editorial'}, studentMarks: [{ subject: 'English Language', marks_obtained: 92 }, { subject: 'Science', marks_obtained: null }] })
 assert.equal(mixed.result.totalMarks, 100, 'Pending subjects must not contaminate recorded totals')
 assert.equal(mixed.result.percentage, null, 'Missing subject must never manufacture an official overall grade')
 assert.equal(mixed.result.subjects[1].percentage, null)
 assert.equal(mixed.result.pendingCount,1)
 console.log('PASS pending marks and weighted totals')
 const mismatchedTerm = m.buildResultCardData({ ...base, studentMarks:[{subject:'English',marks_obtained:90}], options:{...opts,template:'signature-editorial',autoTermColumns:false,includeFirstTerm:false,includeSecondTerm:true,includeAssessment:false,includeThirdTerm:false,includeFinalTerm:false} })
 assert.equal(mismatchedTerm.result.percentage,null,'A first-term result must not leak into second term selection')
 const explicitZero=m.buildResultCardData({...base,studentMarks:[{subject:'English',firstTermMarks:0}],options:{...opts,template:'signature-editorial'}})
 assert.equal(explicitZero.result.percentage,0,'Explicit zero is a scored result, not missing')
 console.log('PASS selected-term isolation and explicit zero')
 const invalid = m.buildResultCardData({...base,studentMarks:[{subject:'English',marks_obtained:125,total_marks:100}],options:{...opts,template:'signature-editorial'}})
 assert.equal(invalid.result.percentage,null,'Out-of-range scores must not become fabricated percentages')
 assert.equal(invalid.result.totalMarks,0,'Invalid scores cannot pollute class totals')
 const noMax = m.buildResultCardData({...base,exam:{name:'First Term'},studentMarks:[{subject:'Science',marks_obtained:24}],options:{...opts,template:'signature-editorial'}})
 assert.equal(noMax.result.percentage,null,'Unknown max must not silently default to 100')
 console.log('PASS invalid-score and unknown-maximum fail-closed')
 const ids = ['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier']
 for (const id of ids) {
  const data = { ...mixed, options: { ...mixed.options, template: id } }
  const html = renderToStaticMarkup(createElement(m.ResultCardPreview, { data }))
  assert.ok(html.includes('premium-card'), id)
  assert.ok(html.includes('premium-donut'), id)
  assert.ok(html.includes('premium-bar-item'), id)
  assert.ok(html.includes('English Language'), id)
  assert.ok(html.includes('Science'), id)
  assert.ok(html.includes('92'),id)
  assert.ok(html.includes('—'), 'Pending data must have dash')
  console.log('PASS rendered flagship', id, html.length)
 }
 const reference = renderToStaticMarkup(createElement(m.ResultCardPreview, { data: { ...one, options: { ...one.options, template: 'reference' } } }))
 assert.ok(reference.includes('template-reference'), 'Reference Clone preserved')
 assert.ok(m.resultCardPrintCss.includes('.premium-card .premium-donut'), 'Print CSS shares preview visual rules')
 console.log('PASS legacy reference preserved / shared print styling')
 const selector = renderToStaticMarkup(createElement(m.ResultCardTemplateSelector,{value:'signature-editorial',onChange:()=>{}}))
 assert.ok(selector.includes('aria-pressed="true"') && selector.includes('Signature Editorial'))
 assert.ok(selector.includes('Reference Clone') && selector.includes('Minimal Corporate'))
 assert.equal((selector.match(/premium-featured-tile/g)||[]).length,9,'Exactly nine premium thumbnails')
 const mandatory = renderToStaticMarkup(createElement(m.ResultCardPreview,{data:{...mixed,options:{...mixed.options,template:'data-atelier',includeCharts:false,orientation:'landscape'}}}))
 assert.ok(mandatory.includes('premium-donut') && mandatory.includes('premium-bar-item'),'Mandatory premium analytics cannot be hidden')
 assert.ok(!mandatory.includes('result-card-a4 landscape'),'Uncertified landscape cannot be selected silently')
 const legacy = await vite.ssrLoadModule('/src/Modules/examination/resultCardTemplates.jsx')
 const legacyArgs = {...base,studentMarks:[{subject:'Computer',marks_obtained:0}],options:opts}
 assert.deepEqual(m.buildResultCardData(legacyArgs),legacy.buildResultCardData(legacyArgs),'Legacy templates retain protected data conversion')
 console.log('PASS protected legacy delegation byte-compatible')
 const toolbar = renderToStaticMarkup(createElement(m.ResultCardPrintToolbar,{options:{...opts,template:'signature-editorial'},setOptions:()=>{},onPrint:()=>{},onExportPdf:()=>{}}))
 assert.ok(toolbar.includes('print-certified') && toolbar.includes('Both analytics charts are included on every card'))
 assert.ok(!toolbar.includes('A4 Landscape'))
 console.log('PASS premium selector, locked analytics and A4-only toolbar')
} finally {
 await vite.close()
}
