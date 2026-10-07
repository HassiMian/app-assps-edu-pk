const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/Messages.jsx'), 'utf8')

test('message send does not silently swallow saved-draft cleanup failure', () => {
  assert.doesNotMatch(source, /api\.delete\('\/api\/notify\/message-draft'\)\.catch\(\(\) => \{\}\)/)
  assert.match(source, /let draftCleanupConfirmed = true/)
  assert.match(source, /Message sent but saved draft cleanup failed/)
  assert.match(source, /saved draft cleanup could not be confirmed\. Check the provider log before resending\./)
})
