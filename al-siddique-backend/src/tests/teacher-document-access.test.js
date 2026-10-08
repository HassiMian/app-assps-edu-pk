const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { canAccessAuthoredDocument, isSchoolDocumentManager } = require('../services/teacherDocumentAccess')
const school1 = { school_id: 1, created_by: 71 }
const school2 = { school_id: 2, created_by: 71 }

test('a teacher can access their authored school document but not same-school peers', () => {
  assert.equal(canAccessAuthoredDocument({ role:'teacher', id:71 }, school1, 1), true)
  assert.equal(canAccessAuthoredDocument({ role:'teacher', id:72 }, school1, 1), false)
  assert.equal(canAccessAuthoredDocument({ role:'teacher', id:71 }, school2, 1), false)
  assert.equal(canAccessAuthoredDocument({ role:'teacher', id:71 }, { school_id:1, created_by:null }, 1), false)
  assert.equal(canAccessAuthoredDocument({ role:'teacher', id:'' }, school1, 1), false)
  assert.equal(canAccessAuthoredDocument({ role:'teacher', id:71 }, school1, null), false)
})

test('school management may review same-school legacy documents, never another school', () => {
  for (const role of ['admin', 'school_admin', 'principal']) {
    assert.equal(isSchoolDocumentManager({role}), true)
    assert.equal(canAccessAuthoredDocument({ role, id:80 }, { school_id:1, created_by:null }, 1), true)
    assert.equal(canAccessAuthoredDocument({ role, id:80 }, school2, 1), false)
  }
  assert.equal(canAccessAuthoredDocument({ role:'super_admin', id:80 }, school2, 1), true)
  assert.equal(canAccessAuthoredDocument({ role:'student', id:71 }, school1, 1), false)
})

test('Diary and Lesson Plan route SQL scopes list, writes and publication', () => {
  const routes = name => fs.readFileSync(path.join(__dirname,'../routes',name),'utf8')
  const diary = routes('dailyDiaryRoutes.js')
  const lesson = routes('lessonPlanRoutes.js')
  assert.match(diary, /school_id = \$1 AND created_by = \$2/)
  assert.match(diary, /WHERE id = \$13 AND school_id = \$14 AND \(\$15::boolean OR created_by = \$16\)/)
  assert.match(diary, /DELETE FROM daily_diaries WHERE id = \$1 AND school_id = \$2 AND \(\$3::boolean OR created_by = \$4\)/)
  assert.match(lesson, /sql \+= ` AND created_by=\$\$\{params.length\}`/)
  assert.match(lesson, /public_id=\$15 AND revision=\$16 AND \(\$17::boolean OR created_by=\$18\)/)
  assert.match(lesson, /LESSON_PLAN_SHARE_REVIEW_REQUIRED/)
  assert.match(lesson, /canAccessAuthoredDocument\(req.user, current.rows\[0\], schoolId\)/)
})
