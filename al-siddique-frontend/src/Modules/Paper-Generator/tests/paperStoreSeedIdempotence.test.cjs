const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const src = fs.readFileSync(path.join(__dirname, '../usePaperStore.js'), 'utf8')
const sliceFunction = (start, next) => {
  const at = src.indexOf('function ' + start + '(')
  const end = src.indexOf('function ' + next + '(', at + 1)
  assert.ok(at >= 0 && end > at, 'source function boundaries must exist')
  return src.slice(at, end)
}
const qVersion = 'class4-7-8-2026-06'
const recoveryVersion = 'ASSPS_EXAM_NIGHT_RECOVERY_SOURCE_V5_OCT02_URDU_REFRESH'

function recovery(seedRecords) {
  const context = {
    isAsspsTenantUser: () => true,
    examNightRecoverySeed: {},
    buildRecoverySavedPapers: () => seedRecords,
    EXAM_NIGHT_RECOVERY_SEED_VERSION: recoveryVersion,
    EXAM_NIGHT_FORCE_REFRESH_IDS: new Set(['rec-7']),
    Date, Set, Map, Array, String,
  }
  vm.runInNewContext(sliceFunction('withExamNightRecoverySeed', 'loadStore') + '\nthis.run = withExamNightRecoverySeed', context)
  return context.run
}

test('current question-bank seed preserves exactly the existing store reference', () => {
  const context = { isAsspsTenantUser: () => true, ASSPS_QBANK_SEED_VERSION: qVersion }
  vm.runInNewContext(sliceFunction('withAsspsQuestionBankSeed', 'withOfficialExamPaperSeed') + '\nthis.run = withAsspsQuestionBankSeed', context)
  const store = { seedInfo: { asspsQuestionBank: { version: qVersion } }, questions: [{id:'teacher-question'}] }
  assert.strictEqual(context.run(store), store)
})

test('current recovery seed never rewrites saved papers on a storage event', () => {
  const seed = [{ id:'rec-7', name:'Seed', body:'source text' }]
  const run = recovery(seed)
  const manual = { id:'rec-7', name:'Teacher revision', body:'principal edits', userEdited:true }
  const store = { savedPapers:[manual], seedInfo:{examNightRecovery:{version:recoveryVersion}} }
  assert.strictEqual(run(store), store)
  assert.strictEqual(run(store).savedPapers[0], manual)
})

test('a newer recovery seed preserves a manually edited working copy', () => {
  const run = recovery([{id:'rec-7',name:'Seed',body:'source'}])
  const manual = {id:'rec-7',name:'Teacher revision',body:'principal edits',paperSystem:{workingCopy:true}}
  const store = {savedPapers:[manual],seedInfo:{examNightRecovery:{version:'older'}}}
  const next = run(store)
  assert.strictEqual(next.savedPapers[0], manual)
  assert.equal(next.savedPapers[0].body, 'principal edits')
  assert.equal(next.seedInfo.examNightRecovery.version, recoveryVersion)
})

test('a recovery version bump refreshes only an unedited source record, then becomes stable', () => {
  const run = recovery([{id:'rec-7',name:'Seed',body:'new content'}])
  const store = {savedPapers:[{id:'rec-7',name:'Class 7 Urdu',body:'old content'}],seedInfo:{examNightRecovery:{version:'older'}}}
  const next = run(store)
  assert.equal(next.savedPapers[0].body, 'new content')
  assert.equal(next.savedPapers[0].name, 'Class 7 Urdu')
  assert.strictEqual(run(next), next)
})

test('missing recovery record inserts once, without refreshing current existing copies', () => {
  const run = recovery([{id:'rec-7',name:'Seed',body:'source'}, {id:'rec-3',name:'Math',body:'math'}])
  const manual = {id:'rec-7',name:'Working copy',body:'edited',userEdited:true}
  const store = {savedPapers:[manual],seedInfo:{examNightRecovery:{version:recoveryVersion}}}
  const next = run(store)
  assert.equal(next.savedPapers.length, 2)
  assert.strictEqual(next.savedPapers[1], manual)
  assert.strictEqual(run(next), next)
})

test('loading an unchanged stored dataset does not write localStorage again', () => {
  let writes = 0
  const store = {
    subjects:[], questions:[], savedPapers:[], questionTypes:[], paperSettings:{},
    seedInfo:{asspsQuestionBank:{version:qVersion},examNightRecovery:{version:recoveryVersion}},
  }
  const context = {
    STORE_KEY:'al_siddique_paper_store',
    getTenantStorageItem:()=>JSON.stringify(store),
    defaultStore:{paperSettings:{geminiModel:'local',moduleAccess:{},schoolAccess:[],superappModules:{}},questionTypes:[]},
    withAsspsQuestionBankSeed:value=>value,
    withOfficialExamPaperSeed:value=>value,
    withExamNightRecoverySeed:value=>value,
    saveStore:()=>{writes++},
    Date, Number, Set, Array, JSON,
  }
  vm.runInNewContext(sliceFunction('loadStore','saveStore') + '\nthis.run = loadStore', context)
  const loaded = context.run()
  assert.equal(writes, 0)
  assert.equal(loaded.seedInfo.examNightRecovery.version, recoveryVersion)
})
