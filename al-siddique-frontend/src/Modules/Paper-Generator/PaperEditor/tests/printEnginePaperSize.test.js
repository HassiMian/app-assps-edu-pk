import test from 'node:test'
import assert from 'node:assert/strict'
import { executePaperPrint } from '../printing/PrintEngine.js'

function capturePrint(isHalf, { missingContentDocument = false } = {}) {
  const previousDocument = globalThis.document
  const previousSetTimeout = globalThis.setTimeout
  const calls = { html: '', appended: null, timers: [], removed: false, printed: false }
  const contentDocument = missingContentDocument ? null : {
    open() {},
    write(value) { calls.html = value },
    close() {},
  }
  const iframe = {
    id: '', style: {}, contentDocument,
    contentWindow: { focus() {}, print() { calls.printed = true } },
    remove() { calls.removed = true },
  }
  globalThis.document = {
    getElementById() { return null },
    createElement(tag) { assert.equal(tag, 'iframe'); return iframe },
    body: { appendChild(frame) { calls.appended = frame } },
  }
  globalThis.setTimeout = callback => { calls.timers.push(callback); return calls.timers.length }
  try {
    calls.result = executePaperPrint({ outerHTML: '<article class="paper-document-surface">سوال Question 1</article>' }, { isHalf })
    if (calls.timers.length) calls.timers[0]()
    return { ...calls, css: iframe.style.cssText }
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
    globalThis.setTimeout = previousSetTimeout
  }
}

test('default paper prints A4 with 8 mm margins and no missing content', () => {
  const output = capturePrint(false)
  assert.equal(output.result, true)
  assert.match(output.css, /width:210mm;height:297mm/)
  assert.match(output.html, /size:\s*A4 portrait/)
  assert.match(output.html, /margin:\s*8mm/)
  assert.match(output.html, /سوال Question 1/)
  assert.equal(output.printed, true)
})

test('selected half-size paper prints actual A5 geometry rather than silently A4', () => {
  const output = capturePrint(true)
  assert.equal(output.result, true)
  assert.match(output.css, /width:148mm;height:210mm/)
  assert.match(output.html, /size:\s*A5 portrait/)
  assert.match(output.html, /margin:\s*6mm/)
  assert.equal(output.printed, true)
})

test('unavailable iframe document fails closed and removes the frame', () => {
  const output = capturePrint(false, { missingContentDocument: true })
  assert.equal(output.result, false)
  assert.equal(output.removed, true)
  assert.equal(output.printed, false)
})

test('missing paper node is refused without creating an iframe', () => {
  assert.equal(executePaperPrint(null, { isHalf: true }), false)
})
