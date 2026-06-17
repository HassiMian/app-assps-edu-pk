const fs = require('fs')
const path = require('path')

const BASE_URL = process.env.AI_SMOKE_BASE_URL || 'http://localhost:3001'
const TOKEN = process.env.AI_SMOKE_TOKEN || ''
const MODE = process.env.AI_SMOKE_MODE || 'config'
const MODEL = process.env.AI_SMOKE_MODEL || 'gemini-2.5-flash'
const INPUT = process.env.AI_SMOKE_INPUT || ''

function log(title, value) {
  console.log(`\n=== ${title} ===`)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

function authHeaders(extra = {}) {
  const headers = { ...extra }
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
  return headers
}

async function readFileAsBlob(filePath) {
  const abs = path.resolve(filePath)
  const data = await fs.promises.readFile(abs)
  const ext = path.extname(abs).toLowerCase()
  const mime = ext === '.pdf'
    ? 'application/pdf'
    : ['.jpg', '.jpeg'].includes(ext)
      ? 'image/jpeg'
      : ext === '.png'
        ? 'image/png'
        : 'application/octet-stream'
  return new Blob([data], { type: mime })
}

async function postForm(url, fields = {}, files = []) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    form.append(key, String(value))
  })
  for (const filePath of files) {
    const blob = await readFileAsBlob(filePath)
    form.append('files', blob, path.basename(filePath))
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  if (!TOKEN) {
    console.warn('AI_SMOKE_TOKEN is not set. Protected AI routes will likely return 401.')
  }

  if (MODE === 'config') {
    const res = await fetch(`${BASE_URL}/api/paper/ai/config`, { headers: authHeaders() })
    const data = await res.json()
    log('AI Config', data)
    process.exit(res.ok ? 0 : 1)
  }

  if (MODE === 'jobs') {
    const url = new URL(`${BASE_URL}/api/paper/jobs`)
    if (INPUT) url.searchParams.set('limit', INPUT)
    const res = await fetch(url, { headers: authHeaders() })
    const data = await res.json()
    log('AI Jobs', data)
    process.exit(res.ok ? 0 : 1)
  }

  if (MODE === 'test-key') {
    const res = await fetch(`${BASE_URL}/api/paper/ai/test-key`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ preferredModel: MODEL }),
    })
    const data = await res.json()
    log('AI Test Key', data)
    process.exit(res.ok ? 0 : 1)
  }

  if (MODE === 'generate') {
    const res = await fetch(`${BASE_URL}/api/paper/generate`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        class: '9',
        subject: 'Science',
        chapters: ['Chapter 1'],
        mcqCount: 2,
        shortCount: 1,
        longCount: 1,
        language: 'english',
        preferredModel: MODEL,
      }),
    })
    const data = await res.json()
    log('AI Generate', data)
    process.exit(res.ok ? 0 : 1)
  }

  if (MODE === 'extract' || MODE === 'scan') {
    const files = INPUT.split(',').map(s => s.trim()).filter(Boolean)
    if (!files.length) {
      console.error('AI_SMOKE_INPUT must point to one or more files, separated by commas.')
      process.exit(1)
    }

    const endpoint = MODE === 'scan' ? '/api/paper/scan-handwritten' : '/api/paper/extract-questions'
    const fields = {
      subject: 'Science',
      classLevel: '9',
      medium: 'english',
      preferredModel: MODEL,
      model: MODEL,
    }
    const res = await postForm(`${BASE_URL}${endpoint}`, fields, files)
    log(`${MODE.toUpperCase()} submit`, res.data)
    if (!res.ok) process.exit(1)
    const jobId = res.data?.jobId
    if (!jobId) process.exit(0)

    for (let i = 0; i < 60; i += 1) {
      const jobRes = await fetch(`${BASE_URL}/api/paper/jobs/${jobId}`, { headers: authHeaders() })
      const jobData = await jobRes.json()
      log('Job Poll', jobData.job || jobData)
      if (jobData?.job?.status === 'completed') {
        process.exit(0)
      }
      if (jobData?.job?.status === 'failed') {
        process.exit(1)
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.error('Timed out waiting for the AI job.')
    process.exit(1)
  }

  console.error(`Unknown AI_SMOKE_MODE: ${MODE}`)
  process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
