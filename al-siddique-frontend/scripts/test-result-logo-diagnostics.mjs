import assert from 'node:assert/strict'
import { getResultLogoDiagnostic } from '../src/Modules/examination/resultLogoDiagnostics.js'
assert.match(getResultLogoDiagnostic(''),/not configured/)
assert.match(getResultLogoDiagnostic('/uploads/schoollogo.JPG?version=2'),/JPEG/)
assert.match(getResultLogoDiagnostic('data:image/jpeg;base64,xxxx'),/JPEG/)
assert.equal(getResultLogoDiagnostic('https://api.assps.edu.pk/uploads/emblem.png'),'')
assert.equal(getResultLogoDiagnostic('data:image/png;base64,AAAA'),'')
assert.equal(getResultLogoDiagnostic('/school-logo.svg'),'')
assert.equal(getResultLogoDiagnostic('/emblem.webp'),'')
console.log('RESULT_LOGO_DIAGNOSTICS 7/7 PASS (format check; alpha verification remains required)')
