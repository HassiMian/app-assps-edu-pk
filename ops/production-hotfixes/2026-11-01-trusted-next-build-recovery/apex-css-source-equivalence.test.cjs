'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const dir=__dirname
const css=fs.readFileSync(path.join(dir,'source/apex.global.css'),'utf8')
const patch=fs.readFileSync(path.join(dir,'apex-import-global-css.patch'),'utf8')
test('new CSS remains the exact wrapper-removal from original deployed CSS',()=>{
 const old=fs.readFileSync('/var/www/apex-connect/src/app/apex/apex.module.css','utf8')
 const originalHash=crypto.createHash('sha256').update(old).digest('hex')
 assert.equal(originalHash,'456a5e639b8ea95c8c5611e1b31d6ea9295c70616d09abb43c850d10b6c3bfd2')
 assert.equal(css,old.replace(/:global\(([^()]+)\)/g,(_,inner)=>inner))
})
test('page changes solely to global import',()=>{
 assert.match(patch,/apex\.global\.css/)
 assert.match(patch,/apex\.module\.css/)
})
