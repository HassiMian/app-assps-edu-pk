const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseStatus, categoryFor, deploymentImpact } = require('../release-candidate-manifest')

test('preserves leading status padding and the entire first filename', () => {
  assert.deepEqual(parseStatus(' M DEPLOYMENT.md\0?? runtime/a report.md\0'), [
    { status: 'M', file: 'DEPLOYMENT.md' },
    { status: '??', file: 'runtime/a report.md' },
  ])
})

test('handles rename records and unusual filenames without inventing files', () => {
  assert.deepEqual(parseStatus('R  new name.js\0old name.js\0 M line\nbreak.js\0'), [
    { status: 'R', file: 'new name.js', originalFile: 'old name.js' },
    { status: 'M', file: 'line\nbreak.js' },
  ])
  assert.deepEqual(parseStatus(''), [])
})

test('runtime reports are excluded and uncategorized code still requires review', () => {
  assert.equal(deploymentImpact(categoryFor('runtime/report.md')), 'DO_NOT_DEPLOY_ARTIFACT')
  for (const file of ['al-siddique-backend/src/server.js', 'al-siddique-backend/src/seed.js',
    'al-siddique-frontend/src/pages/LoginPage.jsx', 'unknown.js']) {
    assert.match(deploymentImpact(categoryFor(file)), /REQUIRES_REVIEW/)
  }
})
