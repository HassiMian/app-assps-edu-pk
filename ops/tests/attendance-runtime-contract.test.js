const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const source = fs.readFileSync(path.join(root, 'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx'), 'utf8')

test('attendance mark-tab icon is explicitly imported from lucide-react', () => {
  assert.match(source, /import\s*\{[\s\S]*?\bCheckCircle2\b[\s\S]*?\}\s*from\s*["']lucide-react["']/)
  assert.match(source, /key:\s*["']mark["'][\s\S]*?icon:\s*CheckCircle2/)
})
