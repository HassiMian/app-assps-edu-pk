// al-siddique-frontend/scripts/diagnose_network_failures.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE_URL = 'http://localhost:4178'
const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate => candidate && fs.existsSync(candidate))

const REAL_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBhbHNpZGRpcXVlLmVkdS5wayIsInJvbGUiOiJhZG1pbiIsInNjaG9vbF9pZCI6MSwiaWF0IjoxNzkwMDgxOTM4LCJleHAiOjE3OTA2ODY3Mzh9.9VK-Auc9f7l58DdjETdot-SJxEUwDoPBm3Xs2OOYrl4'
const REAL_USER = {
  id: 1,
  school_id: 1,
  tenant_id: 'assps',
  school_code: 'assps',
  name: 'Muhammad Haseeb Arshad',
  email: 'admin@alsiddique.edu.pk',
  role: 'admin',
  designation: 'Principal',
  mustChangePassword: false,
}

async function diagnose() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      cookies: [],
      origins: [{
        origin: BASE_URL,
        localStorage: [
          { name: 'al_siddique_token', value: REAL_JWT_TOKEN },
          { name: 'al_siddique_login_at', value: String(Date.now()) },
          { name: 'al_siddique_user', value: JSON.stringify(REAL_USER) }
        ]
      }]
    }
  })

  const page = await context.newPage()
  const requests = []

  page.on('request', (req) => {
    requests.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      status: null,
      errorText: null,
    })
  })

  page.on('requestfailed', (req) => {
    const found = requests.find(r => r.url === req.url() && r.status === null)
    if (found) {
      found.errorText = req.failure()?.errorText || 'FAILED'
    }
  })

  page.on('response', (res) => {
    const found = requests.find(r => r.url === res.url() && r.status === null)
    if (found) {
      found.status = res.status()
    }
  })

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 20000 }).catch(err => console.log('GOTO_ERR:', err.message))
  await page.waitForTimeout(3000)

  console.log('\n==================================================')
  console.log('COMPLETE REQUEST INVENTORY ON DASHBOARD LOAD')
  console.log('==================================================')
  console.log(`Total Requests: ${requests.length}`)
  
  const failed = requests.filter(r => (r.status && r.status >= 400) || r.errorText)
  console.log(`Total Failures: ${failed.length}`)

  console.log('\n--- DETAILED FAILURE BREAKDOWN ---')
  console.table(failed.map((f, i) => ({
    '#': i + 1,
    'Method': f.method,
    'Type': f.resourceType,
    'Status': f.status || 'FAILED',
    'Error': f.errorText || 'None',
    'URL': f.url
  })))

  console.log('\n--- ALL REQUESTS INVENTORY ---')
  console.table(requests.map((r, i) => ({
    '#': i + 1,
    'Method': r.method,
    'Type': r.resourceType,
    'Status': r.status,
    'URL': r.url.length > 70 ? r.url.substring(0, 67) + '...' : r.url
  })))

  await browser.close()
}

diagnose().catch(console.error)
