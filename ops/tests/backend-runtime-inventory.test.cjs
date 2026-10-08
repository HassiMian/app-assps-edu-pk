const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {inspectInventory} = require('../check-backend-runtime-inventory.cjs')

test('runtime inventory accepts exactly one approved difference, then zero postdeploy', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'assps-release-inventory-'))
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
  const install=path.join(root,'install')
  const runtime='src/services/papers/paperVaultRevisionV6D.js'
  const files=['al-siddique-backend/'+runtime,'al-siddique-backend/src/config/database.js',
    'al-siddique-backend/src/tests/example.test.js']
  for (const file of files) {
    const a=path.join(root,file),b=path.join(install,file.slice('al-siddique-backend/'.length))
    fs.mkdirSync(path.dirname(a),{recursive:true})
    fs.mkdirSync(path.dirname(b),{recursive:true})
    fs.writeFileSync(a,'expected')
    fs.writeFileSync(b,'expected')
  }
  fs.writeFileSync(path.join(install,runtime),'old')
  const approved=inspectInventory(root,install,files,[runtime])
  assert.equal(approved.safe,true)
  assert.equal(approved.matching,1)
  assert.equal(inspectInventory(root,install,files,[]).safe,false)
  fs.writeFileSync(path.join(install,runtime),'expected')
  assert.equal(inspectInventory(root,install,files,[]).safe,true)
  fs.rmSync(path.join(install,'src/config/database.js'))
  assert.equal(inspectInventory(root,install,files,[]).safe,false)
})
