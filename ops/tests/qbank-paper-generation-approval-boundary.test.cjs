const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const root=path.resolve(__dirname,'../..')
const store=fs.readFileSync(path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js'),'utf8')
const sync=fs.readFileSync(path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/questionBankBackendSync.js'),'utf8')

test('paper generation selector excludes explicit provisional rows while review hydration may retain them',()=>{
  assert.match(sync,/export function isQuestionEligibleForPaper\(question\)/)
  assert.match(sync,/question\?\.isApproved !== false/)
  assert.match(sync,/question\?\.approvalStatus !== 'provisional'/)
  assert.match(store,/import \{ isQuestionEligibleForPaper, mergeBackendQuestionBankRows \} from '\.\/questionBankBackendSync\.js'/)
  const occurrences=(store.match(/if \(!isQuestionEligibleForPaper\(q\)\) return false/g)||[]).length
  assert.equal(occurrences,2,'generation question selector and chapter selector must both fail closed')
})
