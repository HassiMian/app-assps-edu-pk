const https = require('https')

function request(method, url, headers = {}) {
  return new Promise((resolve) => {
    let completed = false
    let req = null
    const finish = result => {
      if (completed) return
      completed = true
      clearTimeout(deadline)
      resolve(result)
    }
    const deadline = setTimeout(() => {
      if (req) req.destroy(new Error('deadline exceeded'))
      else finish({ url, method, status: null, ok: false, error: 'deadline exceeded before request start' })
    }, 15000)
    try {
      req = https.request(url, { method, headers, timeout: 15000 }, (res) => {
        res.resume()
        res.on('end', () => finish({ url, method, status: res.statusCode, ok: true }))
        res.on('error', err => finish({ url, method, status: null, ok: false, error: err.message }))
      })
    } catch (err) {
      finish({ url, method, status: null, ok: false, error: err.message })
      return
    }
    req.on('timeout', () => {
      req.destroy(new Error('timeout'))
    })
    req.on('error', (err) => finish({ url, method, status: null, ok: false, error: err.message }))
    req.end()
  })
}

const checks = [
  { name: 'app frontend', method: 'GET', url: 'https://app.assps.edu.pk', expect: [200] },
  { name: 'api health', method: 'GET', url: 'https://api.assps.edu.pk/health', expect: [200] },
  { name: 'apex root redirect', method: 'GET', url: 'https://apex.assps.edu.pk', expect: [200, 307, 308] },
  { name: 'app students no token', method: 'GET', url: 'https://app.assps.edu.pk/api/students', expect: [401] },
  { name: 'api students no token', method: 'GET', url: 'https://api.assps.edu.pk/api/students', expect: [401] },
  { name: 'app fees no token', method: 'GET', url: 'https://app.assps.edu.pk/api/fees', expect: [401] },
  { name: 'api fees no token', method: 'GET', url: 'https://api.assps.edu.pk/api/fees', expect: [401] },
  { name: 'app notify no token', method: 'GET', url: 'https://app.assps.edu.pk/api/notify/inbox', expect: [401] },
  { name: 'api notify no token', method: 'GET', url: 'https://api.assps.edu.pk/api/notify/inbox', expect: [401] },
  { name: 'app students mock token', method: 'GET', url: 'https://app.assps.edu.pk/api/students', expect: [401], headers: { Authorization: 'Bearer mock-jwt-token' } },
  { name: 'api students mock token', method: 'GET', url: 'https://api.assps.edu.pk/api/students', expect: [401], headers: { Authorization: 'Bearer mock-jwt-token' } },
]

async function main() {
  const results = []
  for (const check of checks) {
    const result = await request(check.method, check.url, check.headers)
    const pass = result.ok && check.expect.includes(result.status)
    results.push({ ...check, ...result, pass })
    console.log(`${pass ? 'PASS' : 'FAIL'} ${check.name}: ${result.status || result.error}`)
  }

  const failed = results.filter(result => !result.pass)
  if (failed.length) {
    console.error(`Live route contract failed: ${failed.length} check(s).`)
    process.exit(1)
  }

  console.log('Live route contract passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
