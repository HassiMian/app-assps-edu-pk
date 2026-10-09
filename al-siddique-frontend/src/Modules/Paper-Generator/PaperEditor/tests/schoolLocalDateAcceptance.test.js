import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {createEmptyLessonPlanDocument,normalizeLessonPlanDocument} from '../../lessonPlanDomain.js'
import {currentSchoolDate} from '../../schoolCalendarDate.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5691

const fixedDateRun=(iso,fn)=>{
 const OriginalDate=globalThis.Date
 globalThis.Date=class FixedSchoolDate extends OriginalDate{
  constructor(...args){super(...(args.length?args:[iso]))}
  static now(){return +new OriginalDate(iso)}
 }
 try{return fn()}finally{globalThis.Date=OriginalDate}
}

test('new lesson plan uses Pakistan school calendar day at midnight not previous UTC date',()=>{
 const doc=fixedDateRun('2026-10-08T19:30:00.000Z',()=>createEmptyLessonPlanDocument())
 console.log('LESSON_DEFAULT_AT_PAKISTAN_MIDNIGHT',doc.startDate,doc.endDate)
 assert.equal(doc.startDate,'2026-10-09')
 assert.equal(doc.endDate,'2026-10-09')
 const legacy=fixedDateRun('2026-10-08T19:30:00.000Z',()=>normalizeLessonPlanDocument({subject:'Science',title:'Clouds'}))
 assert.equal(legacy.startDate,'2026-10-09')
 assert.equal(legacy.subjects[0].lessons[0].date,'2026-10-09')
})

test('Pakistan school-day rollover is exact at UTC+05:00 boundary and never uses laptop calendar',()=>{
 const cases=[
  ['2026-10-08T18:59:59.000Z','2026-10-08'],
  ['2026-10-08T19:00:00.000Z','2026-10-09'],
  ['2026-10-09T18:59:59.000Z','2026-10-09'],
  ['2026-10-09T19:00:00.000Z','2026-10-10'],
  ['2028-02-29T18:59:59.000Z','2028-02-29'],
  ['2028-02-29T19:00:00.000Z','2028-03-01'],
 ]
 for(const [utc,expected] of cases) assert.equal(currentSchoolDate(new Date(utc)),expected,utc)
})

test('session-selected date and explicit teacher date must never get rewritten',()=>{
 const plan=fixedDateRun('2026-10-08T19:30:00.000Z',()=>createEmptyLessonPlanDocument({startDate:'2026-09-15',endDate:'2026-09-20'}))
 assert.equal(plan.startDate,'2026-09-15');assert.equal(plan.endDate,'2026-09-20')
})

test('Daily Diary and Cognitive Lesson Planning screens show the same Pakistani school date',{timeout:130000},async t=>{
 const server=await createServer({root,server:{port:PORT,strictPort:true}});await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await server.close()})
 const ctx=await browser.newContext({timezoneId:'Asia/Karachi',viewport:{width:1440,height:900}})
 await ctx.clock.install({time:new Date('2026-10-08T19:30:00.000Z')})
 for(const [screen,selector,expected] of [
  ['daily-diary-workspace-test.html','[data-dd-date]','2026-10-09'],
  ['lesson-planning-workspace-test.html','input[type="date"]','2026-10-09'],
 ]){
  await t.test(screen,async()=>{
   const page=await ctx.newPage()
   try{
    await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
    await page.goto(`http://127.0.0.1:${PORT}/${screen}`,{waitUntil:'domcontentloaded',timeout:50000})
    const input=page.locator(selector).first();await input.waitFor({state:'visible',timeout:20000})
    const actual=await input.inputValue();console.log('SCHOOL_DATE_BROWSER',screen,actual)
    assert.equal(actual,expected)
   }finally{await page.close()}
  })
 }
 await ctx.close()
})
