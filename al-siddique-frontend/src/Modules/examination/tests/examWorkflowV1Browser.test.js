import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const port = 5237
let server, browser, context, page
let savedResults = []
let examCreateCalls = 0
let resultPostCalls = 0
let lastPayload = null

const exam = { id:9, school_id:1, name:'First Term Exam', type:'TE', class:'All Classes', session:'2026-2027', total_marks:100, pass_marks:33 }
const enrollments = [
  { id:1, class_name:'One', section:'Blue' },
  { id:2, class_name:'One', section:'Yellow' },
  { id:3, class_name:'Two', section:'Orange' },
]
const subjects = [
  { id:101, class_name:'One', section:'Blue', subject:'English', exam_date:'2026-09-28', paper_time:'10:00 AM - 12:00 PM', total_marks:null, pass_marks:null, sort_order:1 },
  { id:102, class_name:'One', section:'Blue', subject:'Mathematics', exam_date:'2026-09-30', paper_time:'10:00 AM - 12:00 PM', total_marks:null, pass_marks:null, sort_order:2 },
  { id:103, class_name:'One', section:'Yellow', subject:'English', exam_date:'2026-09-28', paper_time:'10:00 AM - 12:00 PM', total_marks:null, pass_marks:null, pass_percentage:null, sort_order:1 },
  { id:104, class_name:'One', section:'Yellow', subject:'Mathematics', exam_date:'2026-09-30', paper_time:'10:00 AM - 12:00 PM', total_marks:null, pass_marks:null, sort_order:2 },
  { id:201, class_name:'Two', section:'Orange', subject:'English', exam_date:'2026-09-29', paper_time:'10:00 AM - 12:00 PM', total_marks:null, pass_marks:null, sort_order:1 },
]
const rosters = {
  'One|Blue': [
    { id:11, name:'Blue Student One', gr_number:'GR-B1', father_name:'Father B1', class:'One', section:'Blue', roll_number:'1' },
  ],
  'One|Yellow': [
    { id:21, name:'Yellow Student One', gr_number:'GR-Y1', father_name:'Father Y1', class:'One', section:'Yellow', roll_number:'1' },
    { id:22, name:'Yellow Student Two', gr_number:'GR-Y2', father_name:'Father Y2', class:'One', section:'Yellow', roll_number:'2' },
  ],
  'Two|Orange': [
    { id:31, name:'Orange Student One', gr_number:'GR-O1', father_name:'Father O1', class:'Two', section:'Orange', roll_number:'1' },
  ],
}

before(async () => {
  const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  ].find(fs.existsSync)
  server = await createServer({ root, server:{ port, strictPort:true } })
  await server.listen()
  browser = await chromium.launch({ headless:true, executablePath, args:['--no-sandbox'] })
  context = await browser.newContext({ viewport:{ width:1440, height:980 } })

  await context.route('**/api/settings/public*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ success:true, data:{} }) }))
  await context.route('**/api/exams', async route => {
    const request = route.request()
    if (request.method() === 'GET') {
      return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ success:true, data:[exam] }) })
    }
    if (request.method() === 'POST') examCreateCalls += 1
    return route.fulfill({ status:500, contentType:'application/json', body:JSON.stringify({ success:false, message:'Marks screen must not create exams' }) })
  })
  await context.route('**/api/exams/9/setup', route => route.fulfill({
    status:200, contentType:'application/json',
    body:JSON.stringify({ success:true, data:{ exam, enrollments, subjects } })
  }))
  await context.route(/\/api\/exams\/9\/roster.*/, route => {
    const url = new URL(route.request().url())
    const key = `${url.searchParams.get('class')}|${url.searchParams.get('section') || ''}`
    const data = rosters[key] || []
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ success:true, count:data.length, data }) })
  })
  await context.route('**/api/exams/results/9', route => route.fulfill({
    status:200, contentType:'application/json',
    body:JSON.stringify({ success:true, data:savedResults })
  }))
  await context.route('**/api/exams/results', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    resultPostCalls += 1
    lastPayload = route.request().postDataJSON()
    const selected = subjects.find(s => s.class_name === 'One' && s.section === 'Yellow' && s.subject === lastPayload.results?.[0]?.subject)
    if (selected && lastPayload.results?.length) {
      selected.total_marks = lastPayload.results[0].total_marks
      selected.pass_marks = lastPayload.results[0].pass_marks
      selected.pass_percentage = lastPayload.results[0].pass_percentage ?? null
    }
    savedResults = (lastPayload.results || []).map((row,index) => ({
      id:500+index,
      ...row,
      class: row.student_id >= 20 && row.student_id < 30 ? 'One' : 'One',
      section: row.student_id >= 20 && row.student_id < 30 ? 'Yellow' : 'Blue',
      name: row.student_id === 21 ? 'Yellow Student One' : row.student_id === 22 ? 'Yellow Student Two' : 'Blue Student One',
      father_name:'Parent',
      gr_number:`GR-${row.student_id}`,
    }))
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ success:true, message:'saved', count:savedResults.length }) })
  })
  page = await context.newPage()
})

beforeEach(async () => {
  savedResults = []
  subjects.forEach(row => { row.total_marks = null; row.pass_marks = null; row.pass_percentage = null })
  examCreateCalls = 0
  resultPostCalls = 0
  lastPayload = null
  await page.goto('about:blank')
  await page.goto(`http://localhost:${port}/exam-workflow-v1-test.html`, { waitUntil:'domcontentloaded' })
  await page.getByText('Marks Entry', { exact:true }).waitFor({ state:'visible', timeout:15000 })
})

after(async () => {
  await context?.close()
  await browser?.close()
  await server?.close()
})

test('marks workflow uses exact exam setup, actual sections and scheduled subjects', async () => {
  const examSelect = page.locator('select').nth(0)
  await page.waitForFunction(() => document.querySelectorAll('select')[0]?.value === '9')
  assert.equal(await examSelect.inputValue(), '9')
  assert.match(await examSelect.locator('option:checked').textContent(), /First Term Exam/)

  const classSelect = page.locator('select').nth(1)
  await page.waitForFunction(() => document.querySelectorAll('select')[1]?.value === 'One')
  assert.deepEqual(await classSelect.locator('option').allTextContents(), ['Select class','One','Two'])
  assert.equal((await classSelect.locator('option').allTextContents()).includes('Nine'), false)

  const sectionSelect = page.locator('select').nth(2)
  await sectionSelect.selectOption('Yellow')
  await page.getByText('Yellow Student One', { exact:true }).waitFor({ state:'visible' })

  const subjectSelect = page.locator('select').nth(3)
  assert.equal(await subjectSelect.inputValue(), '103')
  assert.match(await subjectSelect.locator('option:checked').textContent(), /English.*28 Sep(?:t)? 2026/)

  assert.equal(await page.getByText('Yellow Student Two', { exact:true }).count(), 1)
  assert.equal(examCreateCalls, 0)
})

test('successful quiet roster reload clears a stale empty-section error', async () => {
  const originalBlue = rosters['One|Blue']
  try {
    rosters['One|Blue'] = []
    await page.getByRole('button', { name:/Refresh Students/ }).click()
    await page.getByText(/No active students are registered in One - Blue/).waitFor({ state:'visible' })

    await page.locator('select').nth(2).selectOption('Yellow')
    await page.getByText('Yellow Student One', { exact:true }).waitFor({ state:'visible' })
    assert.equal(await page.getByText(/No active students are registered in One - Blue/).count(), 0)
  } finally {
    rosters['One|Blue'] = originalBlue
  }
})

test('marks save is one batch and is re-fetched for verification; MarksSheet never creates exam', async () => {
  const sectionSelect = page.locator('select').nth(2)
  await sectionSelect.selectOption('Yellow')
  await page.getByText('Yellow Student Two', { exact:true }).waitFor()

  const numberInputs = page.locator('input[type="number"]')
  await numberInputs.nth(0).fill('50')
  assert.equal(await page.getByRole('spinbutton', { name:'Passing Marks' }).inputValue(), '17')
  assert.equal(await page.getByRole('spinbutton', { name:'Passing Marks' }).isDisabled(), true)
  await page.getByLabel('Marks for Yellow Student One').fill('45')
  await page.getByLabel('Marks for Yellow Student Two').fill('40')

  await page.getByRole('button', { name:/Save All Marks/ }).click()
  await page.getByText(/Saved and verified marks for 2 student/).waitFor({ state:'visible', timeout:10000 })

  assert.equal(resultPostCalls, 1)
  assert.equal(examCreateCalls, 0)
  assert.equal(lastPayload.results.length, 2)
  assert.deepEqual(lastPayload.results.map(row => [row.exam_id,row.student_id,row.subject,row.marks_obtained,row.total_marks,row.pass_marks]), [
    [9,21,'English',45,50,17],
    [9,22,'English',40,50,17],
  ])
})

test('client rejects out-of-range mark before API mutation', async () => {
  await page.locator('select').nth(2).selectOption('Yellow')
  await page.getByText('Yellow Student One', { exact:true }).waitFor()
  const numberInputs = page.locator('input[type="number"]')
  await numberInputs.nth(0).fill('50')
  assert.equal(await page.getByRole('spinbutton', { name:'Passing Marks' }).inputValue(), '17')
  await page.getByLabel('Marks for Yellow Student One').fill('55')
  await page.getByRole('button', { name:/Save All Marks/ }).click()
  await page.getByText(/Invalid marks for Yellow Student One/).waitFor()
  assert.equal(resultPostCalls, 0)
  assert.equal(examCreateCalls, 0)
})

test('unconfigured First Term paper requires actual total and calculates 33% pass for all subjects', async () => {
  await page.locator('select').nth(2).selectOption('Yellow')
  await page.getByText('Yellow Student One', { exact:true }).waitFor({ state:'visible' })

  const total = page.getByRole('spinbutton', { name:'Total Marks' })
  const passing = page.getByRole('spinbutton', { name:'Passing Marks' })
  const mark = page.getByLabel('Marks for Yellow Student One')
  assert.equal(await total.inputValue(), '')
  assert.equal(await passing.inputValue(), '')
  assert.equal(await mark.isDisabled(), true)
  assert.equal(await page.getByText(/Paper marks are not configured/).count(), 1)

  await page.getByRole('button', { name:/Save All Marks/ }).click()
  await page.getByText(/Set the actual total marks/).waitFor()
  assert.equal(resultPostCalls, 0)

  await total.fill('50')
  assert.equal(await passing.inputValue(), '17')
  assert.equal(await passing.isDisabled(), true)
  assert.equal(await page.getByRole('spinbutton', { name:'Passing Percentage' }).inputValue(), '33')
  assert.equal(await mark.isEnabled(), true)
  await total.fill('60')
  assert.equal(await passing.inputValue(), '20')
  await total.fill('75')
  assert.equal(await passing.inputValue(), '25')
  assert.equal(resultPostCalls, 0)
})

test('operator can choose paper-specific passing percentage instead of compulsory 33%, and reload persists selection', async () => {
  await page.locator('select').nth(2).selectOption('Yellow')
  await page.getByText('Yellow Student One', { exact:true }).waitFor({ state:'visible' })

  const total = page.getByRole('spinbutton', { name:'Total Marks' })
  const percentage = page.getByRole('spinbutton', { name:'Passing Percentage' })
  const passing = page.getByRole('spinbutton', { name:'Passing Marks' })

  assert.equal(await percentage.inputValue(), '33')
  await total.fill('50')
  assert.equal(await passing.inputValue(), '17')

  await percentage.fill('40')
  assert.equal(await passing.inputValue(), '20')
  await page.getByLabel('Marks for Yellow Student One').fill('25')
  await page.getByRole('button', { name:/Save All Marks/ }).click()
  await page.getByText(/Saved and verified marks for 1 student/).waitFor({ state:'visible' })

  assert.equal(resultPostCalls, 1)
  assert.equal(lastPayload.results[0].pass_percentage, 40)
  assert.equal(lastPayload.results[0].pass_marks, 20)
  assert.equal(lastPayload.results[0].total_marks, 50)

  await page.reload({ waitUntil:'domcontentloaded' })
  await page.getByText('Marks Entry', { exact:true }).waitFor({ state:'visible' })
  await page.locator('select').nth(2).selectOption('Yellow')
  await page.getByText('Yellow Student One', { exact:true }).waitFor({ state:'visible' })
  assert.equal(await percentage.inputValue(), '40')
  assert.equal(await percentage.isDisabled(), true, 'saved paper scheme is locked after its first real save')
  assert.equal(await passing.inputValue(), '20')
  assert.equal(await total.inputValue(), '50')
  assert.equal(await page.getByLabel('Marks for Yellow Student One').inputValue(), '25')
  assert.equal(examCreateCalls, 0)
})

test('blank or invalid passing percentage never permits a marks save', async () => {
  await page.locator('select').nth(2).selectOption('Yellow')
  await page.getByText('Yellow Student One', { exact:true }).waitFor({ state:'visible' })
  await page.getByRole('spinbutton', { name:'Total Marks' }).fill('50')
  const percentage = page.getByRole('spinbutton', { name:'Passing Percentage' })
  for (const invalid of ['', '0', '101', '33.333']) {
    await percentage.fill(invalid)
    assert.equal(await page.getByLabel('Marks for Yellow Student One').isDisabled(), true)
    await page.getByRole('button', { name:/Save All Marks/ }).click()
    await page.getByText(/Choose a passing percentage between 1 and 100/).waitFor({ state:'visible' })
    assert.equal(resultPostCalls, 0)
  }
})
