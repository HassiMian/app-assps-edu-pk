// al-siddique-backend/src/tests/dashboard-concurrency.test.js
// GATE F: Committed Dashboard Concurrency & Connection Pool Load Test

const assert = require('assert')
const http = require('http')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY_MIN_32_CHARS'
const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000'

function singleDashboardRequest(token) {
  return new Promise((resolve) => {
    const start = performance.now()
    const url = new URL('/api/dashboard/stats', BASE_URL)
    const options = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        const duration = performance.now() - start
        let json = null
        try { json = JSON.parse(data) } catch (_) {}
        const is5xx = res.statusCode >= 500 && res.statusCode < 600
        const isPoolTimeout = (data && data.includes('Connection terminated') || (json && json.message && json.message.includes('timeout')))
        const isValid = res.statusCode === 200 && json?.success === true && typeof json?.data?.stats?.totalStudents === 'number'

        resolve({
          statusCode: res.statusCode,
          duration,
          isValid,
          is5xx,
          isPoolTimeout
        })
      })
    })

    req.on('timeout', () => {
      req.destroy()
      const duration = performance.now() - start
      resolve({ statusCode: 504, duration, isValid: false, is5xx: true, isPoolTimeout: true })
    })

    req.on('error', (err) => {
      const duration = performance.now() - start
      resolve({ statusCode: 500, duration, isValid: false, is5xx: true, isPoolTimeout: false, error: err.message })
    })

    req.end()
  })
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, max: 0 }
  const sorted = [...latencies].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  const max = sorted[sorted.length - 1]
  return {
    p50: parseFloat(p50.toFixed(2)),
    p95: parseFloat(p95.toFixed(2)),
    max: parseFloat(max.toFixed(2))
  }
}

async function runConcurrencyStage(concurrency, token) {
  const promises = []
  for (let i = 0; i < concurrency; i++) {
    promises.push(singleDashboardRequest(token))
  }
  const results = await Promise.all(promises)

  const validCount = results.filter(r => r.isValid).length
  const poolTimeouts = results.filter(r => r.isPoolTimeout).length
  const count5xx = results.filter(r => r.is5xx).length
  const latencies = results.map(r => r.duration)
  const { p50, p95, max } = calculatePercentiles(latencies)
  const successRate = (validCount / concurrency) * 100

  return {
    concurrency,
    total: concurrency,
    validCount,
    successRate: parseFloat(successRate.toFixed(2)),
    p50,
    p95,
    max,
    poolTimeouts,
    count5xx
  }
}

async function runDashboardConcurrencySuite() {
  console.log('=================================================================')
  console.log('GATE F: DASHBOARD CONCURRENCY & DB POOL BENCHMARK')
  console.log('=================================================================')

  const token = jwt.sign(
    { id: 1, email: 'admin@alsiddique.edu.pk', role: 'admin', school_id: 1, tenant_id: 'school_1' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  // Warmup single request
  console.log('Warming up endpoint...')
  const warmup = await singleDashboardRequest(token)
  assert.ok(warmup.isValid, 'Warmup request must succeed with 200 OK')
  console.log(`Warmup successful (${warmup.duration.toFixed(2)}ms)`)

  const concurrencyLevels = [1, 5, 10, 20]
  const report = []

  for (const n of concurrencyLevels) {
    console.log(`\nTesting ${n} concurrent dashboard request(s)...`)
    const result = await runConcurrencyStage(n, token)
    report.push(result)
    console.log(`  -> Success Rate: ${result.successRate}% (${result.validCount}/${result.total})`)
    console.log(`  -> Latency: p50 = ${result.p50}ms | p95 = ${result.p95}ms | max = ${result.max}ms`)
    console.log(`  -> Pool Timeouts: ${result.poolTimeouts} | 5xx Errors: ${result.count5xx}`)

    // Brief cooldown between bursts
    await new Promise(r => setTimeout(r, 400))
  }

  console.log('\n=================================================================')
  console.log('BENCHMARK SUMMARY RESULTS TABLE:')
  console.log('=================================================================')
  console.table(report.map(r => ({
    'Concurrent Req': r.concurrency,
    'Success Rate (%)': `${r.successRate}%`,
    'p50 Latency (ms)': r.p50,
    'p95 Latency (ms)': r.p95,
    'Max Latency (ms)': r.max,
    'Pool Timeouts': r.poolTimeouts,
    'HTTP 5xx Count': r.count5xx
  })))

  // Acceptance Criteria verification
  const stage20 = report.find(r => r.concurrency === 20)
  assert.ok(stage20, '20-concurrency stage must have executed')
  assert.strictEqual(stage20.successRate, 100, 'Acceptance: 20 concurrent dashboard requests must have 100% valid responses')
  assert.strictEqual(stage20.poolTimeouts, 0, 'Acceptance: zero pool timeouts under 20 concurrent requests')
  assert.strictEqual(stage20.count5xx, 0, 'Acceptance: zero 5xx caused by DB pool starvation')

  console.log('>> ACCEPTANCE VERIFIED: 20 concurrent requests achieved 100% valid responses with 0 pool timeouts and 0 5xx errors!')
  console.log('=================================================================\n')
  return report
}

if (require.main === module) {
  runDashboardConcurrencySuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('CONCURRENCY TEST FAILED:', err)
      process.exit(1)
    })
}

module.exports = { runDashboardConcurrencySuite }
