import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
 const m = await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const opts = { ...m.DEFAULT_RESULT_OPTIONS, gradeBands: [{ from: 0, to: 39, label: 'F' }, { from: 40, to: 100, label: 'A' }] }
 const base = { student: { name: 'Test Student', className: 'Six' }, exam: { name: 'First Term', total_marks: 100 }, school: { name: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL' } }
 const one = m.buildResultCardData({ ...base, options:{...opts,template:'signature-editorial'}, studentMarks: [{ subject: 'Computer', marks_obtained: 0, grade: 'A+' }] })
 assert.equal(one.result.totalMarks, 100, 'Unentered four term columns must not inflate denominator to 500')
 assert.equal(one.result.obtainedMarks, 0, 'Real zero is distinct from absent marks')
 assert.equal(one.result.grade, 'F', 'Stale stored A+ must not override computed grade')
 assert.equal(one.result.subjects[0].secondTermMarks, null)
 console.log('PASS zero-score vs missing terms, marks denominator, grade calculation')
 const mixed = m.buildResultCardData({ ...base, options:{...opts,template:'signature-editorial'}, studentMarks: [{ subject: 'English Language', marks_obtained: 92 }, { subject: 'Science', marks_obtained: null }] })
 assert.equal(mixed.result.totalMarks, 100, 'Pending subjects must not contaminate weighted percentages')
 assert.equal(mixed.result.percentage, 92)
 assert.equal(mixed.result.subjects[1].percentage, null)
 console.log('PASS pending marks and weighted totals')
 const mismatchedTerm = m.buildResultCardData({ ...base, studentMarks:[{subject:'English',marks_obtained:90}], options:{...opts,template:'signature-editorial',includeFirstTerm:false,includeSecondTerm:true,includeAssessment:false,includeThirdTerm:false,includeFinalTerm:false} })
 assert.equal(mismatchedTerm.result.percentage,null,'A first-term result must not leak into second term selection')
 const explicitZero=m.buildResultCardData({...base,studentMarks:[{subject:'English',firstTermMarks:0}],options:{...opts,template:'signature-editorial'}})
 assert.equal(explicitZero.result.percentage,0,'Explicit zero is a scored result, not missing')
 console.log('PASS selected-term isolation and explicit zero')
 const ids = ['signature-editorial','swiss-grid','data-atelier']
 for (const id of ids) {
  const data = { ...mixed, options: { ...mixed.options, template: id } }
  const html = renderToStaticMarkup(createElement(m.ResultCardPreview, { data }))
  assert.ok(html.includes('premium-card'), id)
  assert.ok(html.includes('premium-donut'), id)
  assert.ok(html.includes('premium-bar-item'), id)
  assert.ok(html.includes('English Language'), id)
  assert.ok(html.includes('Science'), id)
  assert.ok(html.includes('92%'), id)
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
 const mandatory = renderToStaticMarkup(createElement(m.ResultCardPreview,{data:{...mixed,options:{...mixed.options,template:'data-atelier',includeCharts:false,orientation:'landscape'}}}))
 assert.ok(mandatory.includes('premium-donut') && mandatory.includes('premium-bar-item'),'Mandatory premium analytics cannot be hidden')
 assert.ok(!mandatory.includes('result-card-a4 landscape'),'Uncertified landscape cannot be selected silently')
 const legacy = await vite.ssrLoadModule('/src/Modules/examination/resultCardTemplates.jsx')
 const legacyArgs = {...base,studentMarks:[{subject:'Computer',marks_obtained:0}],options:opts}
 assert.deepEqual(m.buildResultCardData(legacyArgs),legacy.buildResultCardData(legacyArgs),'Legacy templates retain protected data conversion')
 console.log('PASS protected legacy delegation byte-compatible')
 const toolbar = renderToStaticMarkup(createElement(m.ResultCardPrintToolbar,{options:{...opts,template:'signature-editorial'},setOptions:()=>{},onPrint:()=>{},onExportPdf:()=>{}}))
 assert.ok(toolbar.includes('print-certified') && toolbar.includes('always included'))
 assert.ok(!toolbar.includes('A4 Landscape'))
 console.log('PASS premium selector, locked analytics and A4-only toolbar')
} finally {
 await vite.close()
}
