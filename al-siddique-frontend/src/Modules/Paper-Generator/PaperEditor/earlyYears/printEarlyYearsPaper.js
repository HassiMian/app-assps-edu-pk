// printEarlyYearsPaper.js — Bulletproof isolated iframe print engine for Early Years Worksheets
// Enforces 4mm page margins to prevent driver validation crashes on office printers (RICOH MP C307, Samsung, etc.)

export async function printEarlyYearsPaper(paper = null) {
  const sheet = document.querySelector('.early-years-sheet-a4')
  if (!sheet) {
    window.print()
    return
  }

  // Remove existing print frame if any
  const oldIframe = document.getElementById('__ey_print_frame')
  if (oldIframe) oldIframe.remove()

  const iframe = document.createElement('iframe')
  iframe.id = '__ey_print_frame'
  iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:210mm;height:297mm;border:0;background:white;z-index:-1000'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  const printable = sheet.cloneNode(true)

  // Remove any scripts, iframes, buttons, forms, and no-print elements
  printable.querySelectorAll('script,iframe,object,embed,form,button').forEach(n => n.remove())
  printable.querySelectorAll('.no-print').forEach(n => n.remove())
  printable.querySelectorAll('*').forEach(n => {
    for (const attr of [...n.attributes]) {
      if (/^on/i.test(attr.name) || ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value))) {
        n.removeAttribute(attr.name)
      }
    }
    n.removeAttribute('contenteditable')
  })

  // Normalize styles on the cloned root sheet so it fills A4 printable canvas safely
  printable.style.zoom = '1'
  printable.style.transform = 'none'
  printable.style.boxShadow = 'none'
  printable.style.margin = '0 auto'
  printable.style.width = '100%'
  printable.style.maxWidth = '202mm'

  // Inherit CSS custom properties from parent viewport if present
  const viewport = sheet.closest('.early-years-paper-viewport')
  if (viewport) {
    const vars = ['--ey-accent', '--ey-accent-2', '--ey-border', '--ey-soft', '--ey-page-background']
    vars.forEach(v => {
      const val = viewport.style.getPropertyValue(v)
      if (val) printable.style.setProperty(v, val)
    })
  }

  const isUrdu = paper?.language === 'urdu' || paper?.subject === 'urdu' || printable.getAttribute('dir') === 'rtl'
  const title = (paper?.title || 'Early Years Worksheet') + ' - ' + (paper?.subjectDisplayName || paper?.subject || 'Al Siddique Scholars')

  doc.open()
  doc.write(`<!DOCTYPE html>
<html lang="${isUrdu ? 'ur' : 'en'}" dir="${isUrdu ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    @font-face {
      font-family: 'ASSPS Jameel Noori';
      src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Kasheeda');
      font-style: normal;
      font-weight: 400;
      font-display: block;
    }
    @font-face {
      font-family: 'Jameel Noori Nastaleeq';
      src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Kasheeda');
      font-style: normal;
      font-weight: 400;
      font-display: block;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      width: 100% !important;
      height: auto !important;
    }
    @page {
      size: A4 portrait;
      margin: 4mm;
    }
    .early-years-sheet-a4 {
      display: block !important;
      width: 100% !important;
      max-width: 202mm !important;
      min-height: 289mm !important;
      height: auto !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      zoom: 1 !important;
      transform: none !important;
      overflow: visible !important;
      background: #ffffff !important;
      color: #111827 !important;
      box-sizing: border-box !important;
      padding: 5mm 6mm !important;
      border: 1px solid var(--ey-border, #9eb6cf) !important;
      border-radius: 2px !important;
      page-break-after: auto !important;
    }
    .early-years-sheet-a4[data-premium-early-years="true"] {
      outline: 1px solid color-mix(in srgb, var(--ey-border, #9eb6cf) 65%, transparent);
      outline-offset: -4px;
    }
    .early-years-sheet-a4[data-premium-early-years="true"] .counting-cell,
    .early-years-sheet-a4[data-premium-early-years="true"] .num-cell,
    .early-years-sheet-a4[data-premium-early-years="true"] .missing-cell {
      border-color: var(--ey-border, #9eb6cf) !important;
    }
    .early-years-sheet-a4[data-premium-early-years="true"] .early-years-question-body svg {
      color: var(--ey-accent, #123b67);
    }
    .early-years-questions-container {
      position: relative;
      display: block;
    }
    .early-years-question-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 6px !important;
    }
    .early-years-question-block > div:first-child {
      margin-bottom: 3px !important;
      padding-bottom: 2px !important;
    }
    .early-years-worksheet-header {
      margin-bottom: 6px !important;
      padding: 5px 8px !important;
    }
    .early-years-sketch {
      max-width: 28mm !important;
      max-height: 28mm !important;
    }
    .early-years-colouring-area {
      padding: 5px 4px !important;
    }
    .early-years-picture-coloring-block,
    .early-years-circle-choice-sketches,
    .early-years-trace-glyph-grid {
      gap: 4px !important;
      margin-top: 4px !important;
      margin-bottom: 4px !important;
    }
    .early-years-trace-glyph-grid > div {
      min-height: 48px !important;
      padding: 3px 2px !important;
    }
    .early-years-trace-glyph-grid > div > div:first-child {
      font-size: 24pt !important;
      padding-bottom: 1px !important;
    }
    .early-years-counting-grid {
      gap: 3px !important;
      margin: 4px 0 !important;
    }
    .early-years-counting-grid .counting-cell {
      height: 9mm !important;
      min-height: 28px !important;
      border-radius: 4px !important;
      padding: 1px 3px !important;
    }
    .early-years-alphabet-writing-area {
      margin: 3px 0 !important;
      padding: 3px 6px !important;
    }
    .early-years-handwriting-lines {
      margin: 4px 0 !important;
      gap: 7mm !important;
    }
    .early-years-matching-columns {
      margin: 4px 0 !important;
      gap: 4px !important;
    }
    .early-years-matching-columns > div {
      min-height: 12mm !important;
      padding: 2px 4px !important;
    }
    .early-years-footer {
      margin-top: 6px !important;
      padding-top: 3px !important;
      font-size: 8pt !important;
      color: #444 !important;
    }
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  ${printable.outerHTML}
</body>
</html>`)
  doc.close()

  try {
    if (doc.fonts) {
      if (isUrdu) {
        await Promise.race([
          Promise.all([
            doc.fonts.load("18px 'Jameel Noori Nastaleeq'"),
            doc.fonts.load("18px 'ASSPS Jameel Noori'"),
            doc.fonts.load("18px 'Noto Nastaliq Urdu'"),
            doc.fonts.ready,
          ]),
          new Promise(resolve => setTimeout(resolve, 2000)),
        ])
      } else {
        await Promise.race([
          doc.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 1000)),
        ])
      }
    }
  } catch (err) {
    console.warn('Font load warning in EY print:', err)
  }

  // Allow 150ms for layout to settle cleanly in iframe
  await new Promise(resolve => setTimeout(resolve, 150))

  try {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  } catch (e) {
    console.error('EY iframe print failed, falling back to window.print():', e)
    window.print()
  }

  // Retain iframe for 3 minutes (180s) to give Chrome print preview and spooler adequate time
  setTimeout(() => {
    if (document.body.contains(iframe)) iframe.remove()
  }, 180000)
}
