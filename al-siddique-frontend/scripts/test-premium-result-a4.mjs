import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const vite = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'})
const browser = await chromium.launch({headless:true,args:['--no-sandbox']})
try {
 const m = await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const logo = 'data:image/svg+xml;base64,' + readFileSync('public/school-logo.svg').toString('base64')
 const names = ['English Language','Mathematics','General Science','Urdu','Islamiyat','Computer Science','Social Studies','General Knowledge','Physics','Chemistry']
 if (process.env.RESULT_EXTRA_SUBJECTS === '1') names.push('Economics','Civics')
 const marks = names.map((subject,i) => ({subject, marks_obtained: 65 + 2*i, total_marks:100}))
 const base = {student:{name:'Muhammad Test Student',fatherName:'Test Father',className:'Nine',rollNo:'009'}, exam:{name:'First Term',total_marks:100,session:'2026–2027'}, studentMarks:marks, school:{name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',logo,address:'Sharif Chowk, Rayya Khas, Narowal'}, options:{...m.DEFAULT_RESULT_OPTIONS}}
 const page = await browser.newPage({viewport:{width:1200,height:1400}})
 await page.emulateMedia({media:'print'})
 for (const id of ['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier']) {
  const data = m.buildResultCardData({...base,options:{...base.options,template:id}})
  const markup = renderToStaticMarkup(createElement(m.ResultCardPreview,{data}))
  await page.setContent('<!doctype html><html><head><meta charset="UTF-8"><style>'+m.resultCardPrintCss+'</style></head><body>'+markup+'</body></html>')
  const box = await page.evaluate(() => {
   const root = document.querySelector('.result-card-a4')
   const footer = document.querySelector('.rc-footer')
   return {height:root.clientHeight,scrollHeight:root.scrollHeight,footerBottom:footer.getBoundingClientRect().bottom-root.getBoundingClientRect().top,chartCount:document.querySelectorAll('.premium-bar-item').length}
  })
  console.log('A4 METRICS', id, JSON.stringify(box))
  if (process.env.RESULT_DIAG === '1') console.log('BLOCKS', await page.evaluate(() => {
   const r = document.querySelector('.result-card-a4').getBoundingClientRect()
   return ['.premium-topline','.rc-standard-header','.rc-student-info','.rc-marks-table','.premium-analytics','.rc-remarks','.rc-footer'].map(k => {
    const e=document.querySelector(k); const b=e?.getBoundingClientRect(); return [k, b && Math.round(b.top-r.top), b && Math.round(b.height)]
   })
  }))
  if (process.env.RESULT_DIAG !== '1') {
  assert.equal(box.chartCount, names.length, id+' must show all subjects')
  assert.ok(box.footerBottom <= box.height, id+' must fit footer onto first A4 page '+JSON.stringify(box))
  assert.ok(box.scrollHeight <= box.height + 2, id+' must not clip page '+JSON.stringify(box))
  }
  await page.screenshot({path:'/tmp/assps-premium-'+id+'-20261009.png'})
  const pdf=await page.pdf({path:'/tmp/assps-premium-'+id+'-20261009.pdf',format:'A4',printBackground:true,preferCSSPageSize:true})
  const pdfPages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  assert.equal(pdfPages,1,id+' must print precisely one A4 PDF page')
  if (process.env.RESULT_DIAG !== '1') console.log('A4 CHROMIUM PASS',id,JSON.stringify(box))
 }
 await page.close()
} finally {
 await browser.close()
 await vite.close()
}
