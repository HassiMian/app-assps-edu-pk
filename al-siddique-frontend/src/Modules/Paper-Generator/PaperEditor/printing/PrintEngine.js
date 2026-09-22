// PrintEngine.js — Deterministic A4 Print & PDF Engine for ASSPS Paper Generator

export function executePaperPrint(paperNode, { isHalf = false } = {}) {
  if (!paperNode) return false

  // Create isolated hidden iframe
  const existingFrame = document.getElementById('__print_frame')
  if (existingFrame) existingFrame.remove()

  const frame = document.createElement('iframe')
  frame.id = '__print_frame'
  frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;visibility:hidden;'
  document.body.appendChild(frame)

  const doc = frame.contentDocument
  if (!doc) return false

  const pageCss = `
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: inherit;
    }
    .paper-document-surface {
      width: 100% !important;
      min-height: auto !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 4mm !important;
      border-top-width: 4px !important;
    }
    button, input, textarea, select, .no-print, [data-edit-control] {
      display: none !important;
    }
    table {
      break-inside: avoid;
    }
    section {
      break-inside: auto;
    }
  `

  doc.open()
  doc.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Assessment Paper</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
  <style>${pageCss}</style>
</head>
<body>
  ${paperNode.outerHTML}
</body>
</html>`)
  doc.close()

  setTimeout(() => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch (err) {
      console.error('Print failed:', err)
    } finally {
      setTimeout(() => frame.remove(), 2500)
    }
  }, 600)

  return true
}
