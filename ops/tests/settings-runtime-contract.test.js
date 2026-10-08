const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const source = fs.readFileSync(path.join(root, 'al-siddique-frontend/src/Modules/settings/SettingsModule.jsx'), 'utf8')

test('settings module renders lucide forwardRef icons as React elements', () => {
  assert.doesNotMatch(source, /typeof\s+ModIcon\s*===\s*['"]function['"]\s*\?/)
  assert.match(source, /ModIcon\s*\?\s*<ModIcon\s+size=\{18\}\s*\/>\s*:\s*null/)
})
