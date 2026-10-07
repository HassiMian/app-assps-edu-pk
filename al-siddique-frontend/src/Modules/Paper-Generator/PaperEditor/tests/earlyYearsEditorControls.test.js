// earlyYearsEditorControls.test.js — Verifies sketch upload validation, MIME checking, and sanitization
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSketchUploadPayload } from '../earlyYears/upload/uploadSketchValidator.js'

test('EY-UPLOAD 1: Valid SVG upload succeeds with complete metadata', () => {
  const payload = {
    fileName: 'apple_sketch.svg',
    mimeType: 'image/svg+xml',
    fileSizeBytes: 1024,
    textPayload: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="#000" fill="#fff" /></svg>'
  }

  const result = validateSketchUploadPayload(payload)
  assert.equal(result.valid, true)
  assert.ok(result.metadata)
  assert.ok(result.metadata.assetId.startsWith('user.upload.apple_sketch.'))
  assert.equal(result.metadata.source, 'USER_UPLOAD')
  assert.equal(result.metadata.mimeType, 'image/svg+xml')
  assert.equal(result.metadata.width, 100)
  assert.equal(result.metadata.height, 100)
  assert.equal(result.metadata.aspectRatio, 1)
  assert.equal(result.metadata.printMode, 'photocopy-safe')
  assert.equal(result.metadata.objectFit, 'contain')
})

test('EY-UPLOAD 2: Valid PNG and WebP payloads are accepted', () => {
  const pngPayload = {
    fileName: 'drawing.png',
    mimeType: 'image/png',
    fileSizeBytes: 50000,
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }

  const resPng = validateSketchUploadPayload(pngPayload)
  assert.equal(resPng.valid, true)
  assert.equal(resPng.metadata.mimeType, 'image/png')

  const webpPayload = {
    fileName: 'drawing.webp',
    mimeType: 'image/webp',
    fileSizeBytes: 30000,
    dataUrl: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
  }

  const resWebp = validateSketchUploadPayload(webpPayload)
  assert.equal(resWebp.valid, true)
  assert.equal(resWebp.metadata.mimeType, 'image/webp')
})

test('EY-UPLOAD 3: Rejects forbidden file types (HTML, EXE, PDF, TXT)', () => {
  const badTypes = [
    { name: 'app.exe', type: 'application/x-msdownload' },
    { name: 'document.pdf', type: 'application/pdf' },
    { name: 'page.html', type: 'text/html' },
    { name: 'notes.txt', type: 'text/plain' }
  ]

  for (const item of badTypes) {
    const res = validateSketchUploadPayload({
      fileName: item.name,
      mimeType: item.type,
      fileSizeBytes: 500
    })
    assert.equal(res.valid, false)
    assert.ok(res.errors.some((e) => e.includes('Invalid file type')))
  }
})

test('EY-UPLOAD 4: Rejects files exceeding 2MB threshold', () => {
  const oversized = {
    fileName: 'huge.png',
    mimeType: 'image/png',
    fileSizeBytes: 3 * 1024 * 1024 // 3MB
  }

  const res = validateSketchUploadPayload(oversized)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('exceeds 2MB limit')))
})

test('EY-UPLOAD 5: Strips and rejects XSS attack vectors in SVG text', () => {
  const xssPayload = {
    fileName: 'exploit.svg',
    mimeType: 'image/svg+xml',
    fileSizeBytes: 1000,
    textPayload: '<svg><circle cx="10" cy="10" r="5" /><script>window.location="http://attacker.com"</script></svg>'
  }

  const res = validateSketchUploadPayload(xssPayload)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('Security validation error')))
})
