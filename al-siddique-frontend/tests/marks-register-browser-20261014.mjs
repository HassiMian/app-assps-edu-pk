import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const base = 'http://127.0.0.1:5184'
const user = { id: 1, role: 'principal', name: 'QA Principal', school_id: 1, account_type: 'staff' }
const exam = { id: 11, name: 'First Term Exam', class: 'All Classes', type: 'Term Exam', session: '2026-2027', total_marks: 100, pass_marks: 40, subject_offerings: [
  { exam_id: 11, class_name: 'Five', section: 'Purple', subject: 'English', total_marks:75, pass_marks:30 },
  { exam_id: 11, class_name: 'Five', section: 'Purple', subject: 'Science', total_marks:60, pass_marks:24 },
] }
const rows = [
  { id: 1, exam_id:11, student_id:100, name:'Alpha Student', student_class:'Five', student_section:'Purple', gr_number:'GR-A', subject:'English',marks_obtained:0,total_marks:75,pass_marks:30 },
  { id: 2, exam_id:11, student_id:100, name:'Alpha Student', student_class:'Five', student_section:'Purple', gr_number:'GR-A', subject:'Science',marks_obtained:54,total_marks:60,pass_marks:24 },
  { id: 3, exam_id:11, student_id:101, name:'Beta Student', student_class:'Five', student_section:'Blue', gr_number:'GR-B', subject:'English',marks_obtained:63,total_marks:75,pass_marks:30 },
  { id: 4, exam_id:11, student_id:102, name:'Gamma Student', student_class:'Six', student_section:'Purple', gr_number:'GR-C', subject:'English',marks_obtained:38,total_marks:60,pass_marks:24 },
]
const savedRows = rows.map(row=>({...row, student_name:row.name, class:row.student_class, section:row.student_section}))
const postPayloads = []
const browser = await chromium.launch({ headless: true, args:['--no-sandbox','--disable-dev-shm-usage'] })
try {
  const context = await browser.newContext({ viewport: {width:1440,height:920} })
  await context.addInitScript(() => {
    localStorage.setItem('al_siddique_token', 'QA_ONLY_MOCKED_TOKEN')
    localStorage.setItem('al_siddique_login_at', String(Date.now()))
  })
  await context.route('**/api/**', route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path === '/api/exams/results' && route.request().method() === 'POST') {
      const payload = JSON.parse(route.request().postData())
      postPayloads.push(payload)
      for (const mark of payload.results) {
        const original = savedRows.find(row=>row.exam_id===mark.exam_id && row.student_id===mark.student_id && row.subject===mark.subject)
        if (original) { original.marks_obtained=mark.marks_obtained;original.total_marks=mark.total_marks }
      }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,savedCount:payload.results.length})})
    }
    const data = path === '/api/auth/me'
      ? {success:true,user}
      : path === '/api/exams'
      ? {success:true,data:[exam]}
      : path === '/api/exams/results' || path === '/api/exams/results/11'
      ? {success:true,data:savedRows}
      : path === '/api/exams/grade-settings'
      ? {success:true,data: [{label:'A+',from:90,to:100},{label:'F',from:0,to:39}]}
      : {success:true,data:[]}
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror',err => errors.push(err.message))

  await page.goto(base + '/exams/marks/view', { waitUntil:'domcontentloaded' })
  await page.getByRole('heading', {name:'Saved Marks Control Center'}).waitFor({timeout:12000})
  await page.getByRole('row', {name:/Alpha Student/}).first().waitFor({timeout:12000})
  await page.getByRole('combobox', {name:'Class', exact:true}).selectOption('Five')
  await page.getByRole('combobox', {name:'Section', exact:true}).selectOption('Purple')
  const display = page.locator('table tbody')
  assert.equal(await display.locator('tr').count(),3)
  assert.equal(await display.getByText('Alpha Student').count(),2)
  assert.equal(await display.getByText('Gamma Student').count(),0)
  assert.equal(await display.getByText('Beta Student').count(),0)
  assert.match(await display.innerText(),/\b0\b/)
  assert.match(await display.innerText(),/\b75\b/)
  await page.getByRole('button',{name:'Edit Alpha Student English'}).click()
  const editInput = page.getByRole('textbox',{name:'Correct marks for Alpha Student English'})
  await editInput.fill('76')
  assert.equal(await page.getByRole('button',{name:'Save Correction'}).isDisabled(),true)
  await editInput.fill('42')
  assert.equal(await page.getByRole('button',{name:'Print Filtered List'}).isDisabled(),true)
  await page.getByRole('button',{name:'Save Correction'}).click()
  await page.getByRole('status').getByText(/Verified correction saved/).waitFor({timeout:12000})
  assert.equal(postPayloads.length,1)
  assert.deepEqual(postPayloads[0],{results:[{exam_id:11,student_id:100,subject:'English',marks_obtained:42,total_marks:75}]})
  assert.match(await display.innerText(),/\b42\b/)

  await page.getByRole('button',{name:'Edit Alpha Student English'}).click()
  await page.getByRole('textbox',{name:'Correct marks for Alpha Student English'}).fill('44')
  savedRows[0].marks_obtained=43 // Simulate another staff member saving during this edit.
  await page.getByRole('button',{name:'Save Correction'}).click()
  await page.getByRole('alert').getByText(/changed by another session/).waitFor({timeout:12000})
  assert.equal(postPayloads.length,1,'Concurrent correction must never submit another write')
  await page.getByRole('button',{name:'Cancel Edit'}).click()
  await page.getByRole('button',{name:'Reload Saved Marks'}).click()
  await page.getByRole('row',{name:/Alpha Student.*English/}).first().waitFor({timeout:12000})
  assert.match(await display.innerText(),/\b43\b/)

  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button',{name:'Print Filtered List'}).click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  const printText = await popup.locator('body').innerText()
  assert.match(printText,/Alpha Student/)
  assert.doesNotMatch(printText,/Gamma Student|Beta Student/)
  await popup.close()

  await page.goto(base + '/exams/results', {waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Print Whole Class'}).waitFor({timeout:12000})
  await page.getByRole('button',{name:'Print Whole Class'}).click()
  await page.locator('#result-cards-class-select').selectOption('Five')
  await page.locator('#result-cards-section-select').selectOption('Purple')
  await page.getByRole('button',{name:/Print Class .* Cards/}).waitFor({timeout:12000})
  assert.match(await page.locator('body').innerText(), /1 student result card/)
  await page.getByRole('button',{name:/Print Class .* Cards/}).click()
  assert.match(await page.locator('body').innerText(), /Alpha Student/)
  assert.equal(errors.length,0,errors.join('; '))

  // A teacher must not gain schoolwide read access via the new browser route.
  const teacherContext = await browser.newContext()
  await teacherContext.addInitScript(() => {
    localStorage.setItem('al_siddique_token','QA_ONLY_TEACHER_MOCK')
    localStorage.setItem('al_siddique_login_at', String(Date.now()))
  })
  let teacherResultsCalled = false
  await teacherContext.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/results')) teacherResultsCalled = true
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path === '/api/auth/me'
      ? {success:true,user:{...user,role:'teacher'}} : {success:true,data:[]})})
  })
  const teacherPage = await teacherContext.newPage()
  await teacherPage.goto(base + '/exams/marks/view', {waitUntil:'domcontentloaded'})
  await teacherPage.waitForTimeout(900)
  assert.equal(await teacherPage.getByRole('heading',{name:'Saved Marks Control Center'}).count(),0)
  assert.equal(teacherResultsCalled,false)
  await teacherContext.close()
  console.log('BROWSER_PASS: principal edit saved score, invalid guard, one-row POST, reload verification, concurrency refusal, scoped printing, class cards, teacher denied')
} finally {
  await browser.close()
}
