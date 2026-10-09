'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname,'../routes/uploadStorageRoutes.js'),'utf8')
test('authenticated screenshot file gate uses lstat to reject symbolic links',async()=>{
  assert.match(source,/const stat = await fs\.promises\.lstat\(filePath\)/)
  assert.match(source,/!stat\.isFile\(\) \|\| stat\.isSymbolicLink\(\)/)
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-proof-symlink-'))
  try{
    const regular=path.join(dir,'proof.png')
    const linked=path.join(dir,'linked.png')
    fs.writeFileSync(regular,'SYNTHETIC_ONLY')
    fs.symlinkSync(regular,linked)
    const file=await fs.promises.lstat(regular)
    const symlink=await fs.promises.lstat(linked)
    assert.equal(file.isFile() && !file.isSymbolicLink(),true)
    assert.equal(symlink.isFile() && !symlink.isSymbolicLink(),false)
    assert.equal((await fs.promises.stat(linked)).isFile(),true)
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
