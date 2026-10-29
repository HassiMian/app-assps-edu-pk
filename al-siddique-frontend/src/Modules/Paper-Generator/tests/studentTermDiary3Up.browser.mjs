// Optional real Chromium print-fit check; run with: node tests/studentTermDiary3Up.browser.mjs
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { buildStudentTermDiary3Up as build } from '../studentTermDiary3Up.js'
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
try {
  for (const [cls,section,subjectCount] of [['Starter','Green',4],['Mover','Purple',4],['Three','Red',6],['Six','Blue',6],['Seven','Blue',6]]) {
    const subjects=['English','Urdu','Mathematics','Science','Islamiyat','Social Studies'].slice(0,subjectCount)
    const termCoverageRows=subjects.map((subject,index)=>({subject,detail:index%2?'سوال جواب یاد کریں، کتاب اور کاپی کا کام صاف لکھیں، تمام مشقیں مکمل کریں۔':'Read the lessons carefully, complete exercises, write answers clearly and practise the classwork at home.'}))
    const students=Array.from({length:3},(_,i)=>({id:i+1,name:`Student ${i+1}`,father_name:'Father Name',class:cls,section,roll_number:'15',gr_number:'GR-2026-9999',is_active:true}))
    const {html}=build({students,plan:{planningType:'term',termCoverageRows,assessments:[]},classLevel:cls,section,schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',logoUrl:''})
    const page=await browser.newPage({viewport:{width:1150,height:840}})
    await page.setContent(html)
    const positions=await page.evaluate(()=>[...document.querySelectorAll('.card')].map(c=>{
      const card=c.getBoundingClientRect(), les=c.querySelector('.lessons').getBoundingClientRect(), a=c.querySelector('.assess').getBoundingClientRect(),n=c.querySelector('.note').getBoundingClientRect()
      return {cardEnd:card.bottom,lessonsEnd:les.bottom,assessBegin:a.top,assessmentEnd:a.bottom,noteStart:n.top,noteEnd:n.bottom,clipped:c.scrollHeight>c.clientHeight+1,cols:document.querySelectorAll('.card').length}
    }))
    assert.equal(positions.length,3)
    for(const p of positions) {assert.equal(p.cols,3);assert(!p.clipped,`${cls} card overflow`);assert(p.lessonsEnd<=p.assessBegin+1,`${cls} lesson overlaps assessment`);assert(p.assessmentEnd<=p.noteStart+1,`${cls} assessment overlaps note`);assert(p.noteEnd<=p.cardEnd+1,`${cls} note clipped`)}
    assert.equal(await page.locator('.sheet').count(),1)
    await page.close()
    console.log('PASS',cls,'3 portrait cards fit A4 landscape with ruled tables and no overlaps')
  }
} finally {await browser.close()}
