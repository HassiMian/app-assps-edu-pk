const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const urls = require(path.join(root, 'al-siddique-backend/src/services/saasPublicUrls.js'))
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

test('production SaaS login URL is canonical HTTPS', () => {
  assert.equal(urls.DEFAULT_SAAS_LOGIN_URL, 'https://app.assps.edu.pk/login/saas')
  assert.equal(urls.resolveSaasLoginUrl({ NODE_ENV: 'production' }), urls.DEFAULT_SAAS_LOGIN_URL)
  assert.throws(() => urls.resolveSaasLoginUrl({ NODE_ENV: 'production', SAAS_LOGIN_URL: 'http://app.assps.edu.pk/login/saas' }), /HTTPS/)
  const route = read('al-siddique-backend/src/routes/subscriptionRoutes.js')
  assert.equal(route.includes('req.headers.host'), false)
  assert.equal(route.includes('req.secure'), false)
  assert.equal(route.includes('const loginUrl = resolveSaasLoginUrl()'), true)
})

test('subscription approval guards connection and rollback', () => {
  const route = read('al-siddique-backend/src/routes/subscriptionRoutes.js')
  assert.equal(route.includes('let client = null'), true)
  assert.equal(route.includes('client = await pool.connect()'), true)
  assert.equal(route.includes('if (client && transactionStarted)'), true)
  assert.equal(route.includes('if (client) client.release()'), true)
})

test('topbar distinguishes notification failure from empty inbox', () => {
  const topbar = read('al-siddique-frontend/src/components/Layout/topbar.jsx')
  assert.equal(topbar.includes("const [notifsError, setNotifsError] = useState('')"), true)
  assert.equal(topbar.includes('Notifications are currently unavailable.'), true)
  assert.equal(topbar.includes('Notification refresh failed. Showing previously loaded notifications.'), true)
  const failureStart = topbar.indexOf('Topbar notification inbox refresh failed')
  const failureEnd = topbar.indexOf('finally', failureStart)
  const failureBlock = topbar.slice(failureStart, failureEnd)
  assert.equal(failureBlock.includes('setNotifs([])'), false)
})
