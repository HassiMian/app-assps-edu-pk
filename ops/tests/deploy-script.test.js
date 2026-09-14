const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..', '..')
const deployScript = fs.readFileSync(path.join(root, 'ops/deploy-production.ps1'), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

test('production deploy npm script does not auto-confirm production execution', () => {
  assert.equal(packageJson.scripts['deploy:production'].includes('-Apply'), true)
  assert.equal(packageJson.scripts['deploy:production'].includes('-ConfirmProduction'), false)
})

test('deploy helper fails closed on native command failures', () => {
  assert.match(deployScript, /function Assert-NativeSuccess/)
  assert.match(deployScript, /Assert-NativeSuccess \$command/)
  assert.match(deployScript, /Assert-NativeSuccess "ssh \$HostSpec"/)
  assert.match(deployScript, /Assert-NativeSuccess "scp \$localPath"/)
})

test('deploy helper requires explicit host and strict host key checking', () => {
  assert.doesNotMatch(deployScript, /root@187\.127\.121\.221/)
  assert.match(deployScript, /Refusing production deploy without ASSPS_DEPLOY_HOST/)
  assert.match(deployScript, /StrictHostKeyChecking=yes/)
  assert.doesNotMatch(deployScript, /StrictHostKeyChecking=no/)
})

test('backend deploy preflight requires production env and disabled auto migrations', () => {
  assert.match(deployScript, /\^NODE_ENV=production\$/)
  assert.match(deployScript, /\^AUTO_MIGRATE_ON_BOOT=false\$/)
})
