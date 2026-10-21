import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Only replace the import specifier; all logic comes from the production module.
const real = fileURLToPath(new URL('../../lessonPlanClient.js', import.meta.url))
const code = await fs.readFile(real, 'utf8')
assert.match(code, /import api from '\.\.\/\.\.\/services\/api'/)
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'assps-lesson-plan-ack-'))
await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}')
await fs.writeFile(path.join(dir, 'api.mjs'), 'export default globalThis.__asspsLessonMock')
await fs.writeFile(path.join(dir, 'client.mjs'), code.replace("import api from '../../services/api'", "import api from './api.mjs'"))
const oldMock = globalThis.__asspsLessonMock
globalThis.__asspsLessonMock = {
  post: async (_url, _body) => globalThis.__reply,
  put: async (_url, _body) => globalThis.__reply,
}
const { createLessonPlan, updateLessonPlan } = await import(pathToFileURL(path.join(dir, 'client.mjs')).href)
const plan = { id: 'school-1-plan-abc', serverRevision: 3, revision: 3 }
const valid = (id='school-1-plan-abc', serverRevision=4) => ({data:{success:true,data:{id,serverRevision,revision:serverRevision,subjects:[]}}})
for (const [name,response] of [
  ['HTTP 200 explicit failure', {data:{success:false,message:'Denied',data:[]}}],
  ['HTTP 200 empty payload', {data:{success:true,data:{}}}],
  ['HTTP 200 missing revision', {data:{success:true,data:{id:plan.id}}}],
  ['HTTP 200 zero revision', valid(plan.id,0)],
  ['HTTP 200 invalid fractional revision', valid(plan.id,1.5)],
]) {
  test('create rejects '+name, async()=>{globalThis.__reply=response;await assert.rejects(()=>createLessonPlan({title:'Draft'}))})
}
test('create accepts confirmed identity and positive revision',async()=>{globalThis.__reply=valid(plan.id,1);assert.equal((await createLessonPlan({title:'Draft'})).id,plan.id)})
test('update rejects stale revision',async()=>{globalThis.__reply=valid(plan.id,3);await assert.rejects(()=>updateLessonPlan(plan))})
test('update rejects changed identity',async()=>{globalThis.__reply=valid('other-tenant-plan',4);await assert.rejects(()=>updateLessonPlan(plan))})
test('update rejects explicit failure',async()=>{globalThis.__reply={data:{success:false,message:'Conflict',data:valid().data.data}};await assert.rejects(()=>updateLessonPlan(plan))})
test('update accepts server-incremented same identity',async()=>{globalThis.__reply=valid(plan.id,4);assert.equal((await updateLessonPlan(plan)).serverRevision,4)})
test('cleanup isolated mock fixture',async()=>{globalThis.__asspsLessonMock=oldMock;await fs.rm(dir,{recursive:true,force:true})})
