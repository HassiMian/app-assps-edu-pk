const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

test('Lesson Planning cognitive endpoints stay behind lesson-plan auth/RLS router', () => {
  const route = read('al-siddique-backend/src/routes/lessonPlanRoutes.js')
  assert.match(route, /router\.use\(protect, canManageLessonPlans\)/)
  assert.match(route, /router\.get\('\/planner\/context'/)
  assert.match(route, /router\.post\('\/planner\/parse'/)
  assert.match(route, /router\.post\('\/planner\/generate'/)
  assert.match(route, /withTenantTransaction\(req, schoolId/)
  assert.match(route, /set_config\('app\.tenant_id'/)
})

test('Daily Diary accepts requested dynamic A4 card counts', () => {
  const route = read('al-siddique-backend/src/routes/dailyDiaryRoutes.js')
  assert.match(route, /\[2, 3, 4, 5, 6, 8, 10, 12, 14\]\.includes\(slipsPerPage\)/)
  const workspace = read('al-siddique-frontend/src/Modules/Paper-Generator/DailyDiaryWorkspace.jsx')
  assert.match(workspace, /const CARD_COUNTS = \[2,3,4,5,6,8,10\]/)
  assert.match(workspace, /data-student-card/)
  assert.match(workspace, /data-a4-page/)
})

test('Lesson Plans and Daily Diary share canonical LessonPlanDocument domain', () => {
  const module = read('al-siddique-frontend/src/Modules/Paper-Generator/LessonPlanModule.jsx')
  const workspace = read('al-siddique-frontend/src/Modules/Paper-Generator/LessonPlanningWorkspace.jsx')
  const diary = read('al-siddique-frontend/src/Modules/Paper-Generator/DailyDiaryWorkspace.jsx')
  assert.match(module, /LessonPlanningWorkspace/)
  assert.match(workspace, /toLessonPlanPersistencePayload/)
  assert.match(diary, /deriveDiaryRowsFromLessonPlan/)
  assert.match(diary, /parseLessonPlanningText/)
})

test('Paper Generator shell uses modern Diary workspace without replacing Paper Workspace core', () => {
  const shell = read('al-siddique-frontend/src/Modules/Paper-Generator/PaperGenerator.jsx')
  assert.match(shell, /lazy\(\(\) => import\('\.\/DailyDiaryWorkspace'\)\)/)
  assert.match(shell, /PTSPaperGenerator/)
  assert.match(shell, /PaperEditorRouter/)
  assert.match(shell, /assps-open-diary-lesson-plan/)
})
