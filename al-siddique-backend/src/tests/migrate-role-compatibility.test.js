const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('main migration preserves every active application role including school_admin', () => {
  const migrate = fs.readFileSync(path.join(__dirname, '../config/migrate.js'), 'utf8')
  const subscription = fs.readFileSync(path.join(__dirname, '../config/subscription_migrate.js'), 'utf8')
  const requiredRoles = ['super_admin','school_admin','admin','principal','teacher','accountant','parent','student']
  const roleCheck = migrate.match(/users_role_check[\s\S]{0,400}?role IN \(([^)]+)\)/)
  assert.ok(roleCheck, 'users_role_check must be explicit in main migration')
  for (const role of requiredRoles) assert.match(roleCheck[1], new RegExp(`['\"]${role}['\"]`))
  const subscriptionCheck = subscription.match(/users_role_check[\s\S]{0,400}?role IN \(([^)]+)\)/)
  assert.ok(subscriptionCheck, 'subscription migration must expose the same role family')
  for (const role of requiredRoles) assert.match(subscriptionCheck[1], new RegExp(`['\"]${role}['\"]`))
})
