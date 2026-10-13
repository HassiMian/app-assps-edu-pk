import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ESLint } from 'eslint'
const root = new URL('../src/Modules/employees/EmployeesModule.jsx', import.meta.url)
const styles = new URL('../src/Modules/moduleStyles.js', import.meta.url)
const code = readFileSync(root,'utf8')
const styleCode = readFileSync(styles,'utf8')
test('employees Credentials and Login Access module imports missing React hook and both shared button styles', () => {
  assert.match(code, /import\s*\{[^}]*\buseCallback\b[^}]*\}\s*from\s*['"]react['"]/)
  assert.match(code,/import\s*\{[^}]*\bbtnPrimary\b[^}]*\bbtnSecondary\b[^}]*\}\s*from\s*['"]\.\.\/moduleStyles['"]/)
  assert.match(styleCode,/export const btnPrimary\s*=/)
  assert.match(styleCode,/export const btnSecondary\s*=/)
  assert.match(code,/Teacher Defaults/)
  assert.match(code,/Create Access/)
  assert.match(code,/Save Permissions/)
})
test('employees source contains zero undefined identifiers in ESLint static analysis', async () => {
  const eslint = new ESLint({cwd:new URL('..',import.meta.url).pathname})
  const [result] = await eslint.lintFiles([root.pathname])
  assert.ok(result)
  const unknown = result.messages.filter(x=>x.ruleId==='no-undef')
  assert.deepEqual(unknown.map(x=>`${x.line}: ${x.message}`),[])
})
