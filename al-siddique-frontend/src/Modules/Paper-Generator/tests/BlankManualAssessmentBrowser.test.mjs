import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
test('blank user-authored assessment can type its first question without question bank', {timeout:45000},async()=>{
 const vite=await createServer({root,server:{port:5881,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const context=await browser.newContext()
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:5881/paper-workspace-test.html?new')
  await page.locator('[data-create-paper-home]').waitFor({timeout:14000})
  await page.locator('[data-creation-option="blank"]').click()
  await page.getByLabel('Blank paper class').selectOption('7')
  await page.getByLabel('Blank paper subject').fill('Science')
  await page.getByLabel('Assessment type').selectOption('Weekly Assessment')
  await page.getByLabel('Assessment scope').fill('Chapter 3')
  await page.getByLabel('Paper Name (optional)').fill('Synthetic QA — no live saves')
  await page.getByLabel('Blank paper total marks').fill('10')
  await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
  await page.locator('#paper-canvas').waitFor({timeout:14000})
  await page.getByRole('button',{name:/Type First Question/}).click()
  await page.getByLabel('Selected question heading').fill('Q1. Answer briefly. (10)')
  await page.getByLabel('Selected question content').fill('What is a molecule?')
  assert.match(await page.getByLabel('Selected question content').inputValue(),/molecule/)
  console.log('USER_AUTHORED_BLANK_MANUAL_QUESTION_BROWSER PASS')
  await context.close()
 }finally{await browser.close();await vite.close()}
})
