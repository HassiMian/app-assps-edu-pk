const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-backend/src/routes/feeRoutes.js'), 'utf8')

test('bulk challan generation fails closed when class monthly fee is not configured', () => {
  assert.match(source, /if \(Number\(configuredMonthly \|\| 0\) <= 0\)/)
  assert.match(source, /code: 'FEE_CLASS_RATE_NOT_CONFIGURED'/)
  assert.match(source, /positive monthly fee must be configured for this class and academic session/i)
})
