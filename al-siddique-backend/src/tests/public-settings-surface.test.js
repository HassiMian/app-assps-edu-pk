const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'settingsRoutes.js'), 'utf8')
const start = source.indexOf("router.get('/public'")
const end = source.indexOf('module.exports = router', start)
const publicRoute = source.slice(start, end)

test('public settings exposes branding identity without internal entitlement metadata', () => {
  assert.ok(start >= 0 && end > start, 'public settings route must exist')
  assert.match(publicRoute, /branding_config/)
  assert.match(publicRoute, /school_name/)
  assert.doesNotMatch(publicRoute, /subscription_plan/)
  assert.doesNotMatch(publicRoute, /feature_flags/)
  assert.doesNotMatch(publicRoute, /superapp_modules/)
})
