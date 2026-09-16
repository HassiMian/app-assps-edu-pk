import { renderCanonicalFeeVoucherCopyHtml, renderCanonicalFeeVoucherHtml } from '../../services/canonicalDocumentTemplates';
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useFamilyStore } from '../../services/useFamilyStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'

const STATUSES = ['All', 'paid', 'unpaid', 'partial']

const badgeStyle = (status) => {
 const base = {
 display: 'inline-flex',
 alignItems: 'center',
 justifyContent: 'center',
 minWidth: 58,
 padding: '4px 10px',
 borderRadius: 999,
 fontSize: 11,
 fontWeight: 800,
 lineHeight: 1,
 textTransform: 'uppercase',
 letterSpacing: 0.35,
 border: '1px solid transparent',
 }
 if (status === 'paid') return { ...base, background: 'rgba(48,209,88,0.12)', color: C.green, borderColor: 'rgba(48,209,88,0.24)' }
 if (status === 'partial') return { ...base, background: 'rgba(200,153,26,0.12)', color: C.gold, borderColor: 'rgba(200,153,26,0.24)' }
 return { ...base, background: 'rgba(255,55,95,0.12)', color: C.red, borderColor: 'rgba(255,55,95,0.24)' }
}

const tableActionButton = {
 minHeight: 38,
 padding: '8px 13px',
 borderRadius: 12,
 fontSize: 12,
 fontWeight: 800,
 lineHeight: 1,
 letterSpacing: 0,
 boxShadow: 'none',
 whiteSpace: 'nowrap',
}

const payActionButton = {
 ...tableActionButton,
 minWidth: 104,
 border: '1px solid rgba(200,153,26,0.34)',
 background: 'linear-gradient(135deg,#D9A813,#F2C43B)',
 color: '#071e34',
}

function feeParts(challan = {}, discountOverride) {
 const monthly = Number(challan.monthly_fee ?? challan.amount ?? 0)
 const arrears = Number(challan.previous_arrears ?? challan.prev_month_fee ?? 0)
 const discount = Number(discountOverride ?? challan.discount ?? 0)
 const gross = Number(challan.gross_total ?? Math.max(0, monthly + arrears - discount))
 const paid = Number(challan.paid_amount ?? 0)
 const remaining = Number(challan.remaining_balance ?? Math.max(0, gross - paid))
 return { monthly, arrears, discount, gross, paid, remaining }
}

const NOTICE_TEXT = 'Please ensure that the fee is paid by the due date to avoid any late charges. Retain the receipt after making the payment for future reference. Payments can be made online or at the school\'s designated counters. For any questions or assistance, feel free to contact the school office.'

// Helper to get templates themes
export function getTemplateTheme(templateId) {
  let primaryColor = '#0a1628'
  let secondaryColor = '#c8991a'
  let headerBg = '#0a1628'
  let headerText = '#e8c87a'
  let schoolNameColor = '#0a1628'
  let tableHeaderBg = '#e0e0e0'
  let tableHeaderColor = '#000'
  let outerBorderColor = '#0a1628'
  let cardBg = '#fff'
  let fontFam = 'Arial, sans-serif'
  let stampStyle = 'border:2.5px solid rgba(150,60,60,0.25); color:rgba(150,60,60,0.28); font-weight:900;'

  if (templateId === 2) {
    primaryColor = '#1e1b4b'
    secondaryColor = '#b45309'
    headerBg = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
    headerText = '#fef08a'
    schoolNameColor = '#1e1b4b'
    tableHeaderBg = '#f1f5f9'
    tableHeaderColor = '#1e293b'
    outerBorderColor = '#312e81'
    fontFam = "'Georgia', serif"
    stampStyle = 'border:2.5px dashed rgba(220,38,38,0.38); color:rgba(220,38,38,0.42); font-weight:900; font-family:sans-serif;'
  } else if (templateId === 3) {
    primaryColor = '#333333'
    secondaryColor = '#666666'
    headerBg = '#f3f4f6'
    headerText = '#111111'
    schoolNameColor = '#111111'
    tableHeaderBg = '#f3f4f6'
    tableHeaderColor = '#111111'
    outerBorderColor = '#666666'
    fontFam = "'Courier New', Courier, monospace"
    stampStyle = 'border:1.5px solid #999; color:#999; font-style:italic; font-weight:900; font-family:sans-serif;'
  }
  return { primaryColor, secondaryColor, headerBg, headerText, schoolNameColor, tableHeaderBg, tableHeaderColor, outerBorderColor, cardBg, fontFam, stampStyle }
}

// Generate the table rows dynamically based on preview vs database properties
function renderDynamicFeeRows(ch, theme) {
  if (ch.feeHeads && Array.isArray(ch.feeHeads)) {
    // Preview format
    let rowsHtml = ''
    ch.feeHeads.forEach((head, index) => {
      const isEven = index % 2 === 0
      rowsHtml += `
        <tr style="border-bottom:1px solid #e8e8e8; background:${isEven ? '#f7f7f7' : '#fff'};">
          <td style="padding:4px 6px; font-size:10.5px; color:#263238; font-weight:650;">${head.name}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px;">Rs. ${head.amount.toLocaleString()}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
          <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">Rs. ${head.amount.toLocaleString()}</td>
        </tr>
      `
    })

    if (ch.discount > 0) {
      rowsHtml += `
        <tr style="border-bottom:1px solid #e8e8e8; background:#fff;">
          <td style="padding:4px 6px; font-size:10.5px; color:#e74c3c; font-weight:700;">Discount</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#e74c3c;">—</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#e74c3c;">Rs. ${ch.discount.toLocaleString()}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#e74c3c;">—</td>
          <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px; color:#e74c3c;">- Rs. ${ch.discount.toLocaleString()}</td>
        </tr>
      `
    }

    if (ch.lateFee > 0) {
      rowsHtml += `
        <tr style="border-bottom:1px solid #e8e8e8; background:#fff;">
          <td style="padding:4px 6px; font-size:10.5px; color:#ff8c00; font-weight:700;">Late Fee</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#ff8c00;">Rs. ${ch.lateFee.toLocaleString()}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#ff8c00;">—</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#ff8c00;">—</td>
          <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px; color:#ff8c00;">+ Rs. ${ch.lateFee.toLocaleString()}</td>
        </tr>
      `
    }

    rowsHtml += `
      <tr style="border-top:2px solid ${theme.primaryColor}; background:#e4e4e4; font-weight:800;">
        <td style="padding:4px 6px; font-size:11.5px; color:#111;">Net Total</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">—</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">—</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">—</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">Rs. ${ch.total.toLocaleString()}</td>
      </tr>
    `
    return rowsHtml
  } else {
    // Database format
    const { monthly: amt, arrears: prevFee, discount: disc, gross: net, paid: paidAmt, remaining: rem } = feeParts(ch)
    const admFee = Number(ch.admission_fee || 0)
    const othFee = Number(ch.other_fee || 0)
    const hasPrev = prevFee > 0
    const totalGross = amt + prevFee + admFee + othFee
    const monthlyNet = Math.max(0, amt - disc)

    return `
      <tr style="border-bottom:1px solid #e8e8e8; background:#f7f7f7;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Monthly Fee ${ch.month||''} ${ch.year||''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${amt.toLocaleString()}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${disc > 0 ? disc.toLocaleString() : '0'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${paidAmt > 0 ? Math.min(paidAmt, monthlyNet).toLocaleString() : '0'}</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">${monthlyNet.toLocaleString()}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8; background:#fff;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Admission Fee</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${admFee ? admFee.toLocaleString() : '—'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">${admFee ? admFee.toLocaleString() : '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8; background:#f7f7f7;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Other Fee</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${othFee ? othFee.toLocaleString() : '—'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">${othFee ? othFee.toLocaleString() : '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #d4b84a; background:#fef8e0;">
        <td style="padding:4px 6px; color:#7a5c00; font-style:italic; font-size:10.5px; font-weight:600;">Previous Arrears / Balance</td>
        <td style="text-align:center; padding:4px 3px; color:#7a5c00; font-size:10.5px;">${hasPrev ? prevFee.toLocaleString() : '—'}</td>
        <td style="text-align:center; padding:4px 3px; color:#7a5c00; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; color:#7a5c00; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; color:#7a5c00; font-size:10.5px;">${hasPrev ? prevFee.toLocaleString() : '—'}</td>
      </tr>
      <tr style="border-top:2px solid ${theme.primaryColor}; background:#e4e4e4; font-weight:800;">
        <td style="padding:4px 6px; font-size:11.5px; color:#111;">Net Total</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${totalGross.toLocaleString()}</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${disc > 0 ? disc.toLocaleString() : '0'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${paidAmt > 0 ? paidAmt.toLocaleString() : '0'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${net.toLocaleString()}</td>
      </tr>
    `
  }
}

// Unified function to render one copy of the voucher (occupies 100% width and height of container)
export function renderVoucherCopyHtml(ch, label, school = {}, templateId = 1, isCompact = false) {
  return renderCanonicalFeeVoucherCopyHtml(ch, label, school, templateId);
}

export function renderAndPrintHtml(html, title = 'Fee Vouchers', existingWindow = null) {
  // Method 1: Blob URL (fastest & most reliable across all modern browsers)
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)

    if (existingWindow && !existingWindow.closed) {
      existingWindow.location.href = blobUrl
      existingWindow.focus()
      return
    }

    const win = window.open(blobUrl, '_blank')
    if (win) {
      win.focus()
      return
    }
  } catch (err) {
    console.warn('Blob window.open failed:', err)
  }

  // Method 2: Direct window.open and document.write fallback
  try {
    const win = window.open('', '_blank')
    if (win && win.document) {
      win.document.open()
      win.document.write(html)
      win.document.close()
      try { win.document.title = title } catch(t) {}
      win.focus()
      return
    }
  } catch (err) {
    console.warn('Direct document.write fallback failed:', err)
  }

  // Method 3: Iframe print fallback (if window.open was blocked)
  try {
    let iframe = document.getElementById('apex-print-frame')
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'apex-print-frame'
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = '1000px'
      iframe.style.height = '1000px'
      iframe.style.border = 'none'
      iframe.style.zIndex = '-1000'
      document.body.appendChild(iframe)
    }

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    iframe.src = URL.createObjectURL(blob)
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
        } catch (err) {
          console.error('Iframe print error:', err)
        }
      }, 400)
    }
  } catch (e) {
    console.error('All print methods failed:', e)
  }
}

// Fee Challan Print — A4 Landscape, 3-per-page
export function printChallan(challan, school = {}, templateId = 1, copies = 3, printWin = null) {
  if (!challan) {
    alert('No challan selected to print.')
    return
  }
  const LABELS = ['Student Copy', 'Institute Copy', 'Bank Copy'].slice(0, copies)

  const printPageSize = 'A4 landscape'
  const printMargin = '2mm 3mm'
  const bodyDimensions = 'width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box;'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee Voucher — ${challan.challan_no || challan.name || ''}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    @page { size:${printPageSize}; margin:${printMargin}; }
    body { background:#f3f4f6; font-family: Arial, sans-serif; padding:10px; margin:0; }
    @media print {
      body { background:#fff; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position:sticky; top:0; z-index:99999; background:#0B2C4D; color:#fff; padding:10px 20px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; font-family:sans-serif; border:1px solid rgba(200,153,26,0.3);">
    <div style="display:flex; align-items:center; gap:12px;">
      <strong style="color:#C8991A; font-size:15px;">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</strong>
      <span style="font-size:13px; color:#C0C8D8;">• Voucher: ${challan.challan_no || challan.name || 'Single Voucher'}</span>
    </div>
    <div style="display:flex; gap:10px;">
      <button onclick="window.print()" style="background:linear-gradient(135deg,#D9A813,#F2C43B); color:#071e34; font-weight:800; border:none; padding:8px 20px; border-radius:8px; cursor:pointer; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">🖨️ Print Voucher</button>
      <button onclick="window.close()" style="background:rgba(255,255,255,0.15); color:#fff; font-weight:600; border:1px solid rgba(255,255,255,0.2); padding:8px 14px; border-radius:8px; cursor:pointer; font-size:13px;">Close</button>
    </div>
  </div>

  <div style="${bodyDimensions}; margin: 0 auto; background:#fff;">
    ${LABELS.map((label, index) => `
      <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
        ${renderVoucherCopyHtml(challan, label, school, templateId)}
      </div>
      ${(copies === 3 && index < 2) ? '<div style="border-left:1.5px dashed #ccc; width:1px; margin:0 2mm; height:204mm;"></div>' : ''}
    `).join('')}
  </div>

  <script>
    function triggerPrint() {
      try { window.focus(); window.print(); } catch(e) {}
    }
    if (document.readyState === 'complete') {
      setTimeout(triggerPrint, 350);
    } else {
      window.addEventListener('load', function() {
        setTimeout(triggerPrint, 350);
      });
      setTimeout(triggerPrint, 1200);
    }
  </script>
</body>
</html>`

  renderAndPrintHtml(html, `Fee Voucher — ${challan.challan_no || challan.name || ''}`, printWin)
}

export function printCompactBatch(challans, school = {}, printWin = null) {
  if (!challans || !challans.length) {
    alert('No challans available to print.')
    return
  }
  const batchVouchers = challans.map((ch) => {
    return renderVoucherCopyHtml(ch, 'Student Copy', school, 1)
  })

  const pages = []
  for (let i = 0; i < batchVouchers.length; i += 3) {
    const group = batchVouchers.slice(i, i + 3)
    pages.push(`
      <div class="voucher-page" style="width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box; page-break-after:always; break-after:page; page-break-inside:avoid; break-inside:avoid; margin:0 auto 10mm; background:#fff;">
        ${group.map((v, index) => `
          <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
            ${v}
          </div>
          ${index < group.length - 1 ? '<div style="border-left:1.5px dashed #ccc; width:1px; margin:0 2mm; height:204mm;"></div>' : ''}
        `).join('')}
      </div>
    `)
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee Vouchers — (${challans.length} Compact Vouchers)</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    @page { size:A4 landscape; margin:2mm 3mm; }
    body { background:#f3f4f6; font-family: Arial, sans-serif; padding:10px; margin:0; }
    @media print {
      body { background:#fff; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .no-print { display:none !important; }
      .voucher-page { margin-bottom:0 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position:sticky; top:0; z-index:99999; background:#0B2C4D; color:#fff; padding:10px 20px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; font-family:sans-serif; border:1px solid rgba(200,153,26,0.3);">
    <div style="display:flex; align-items:center; gap:12px;">
      <strong style="color:#C8991A; font-size:15px;">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</strong>
      <span style="font-size:13px; color:#C0C8D8;">• Batch of ${challans.length} Compact Vouchers Ready</span>
    </div>
    <div style="display:flex; gap:10px;">
      <button onclick="window.print()" style="background:linear-gradient(135deg,#D9A813,#F2C43B); color:#071e34; font-weight:800; border:none; padding:8px 20px; border-radius:8px; cursor:pointer; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">🖨️ Print All (${challans.length})</button>
      <button onclick="window.close()" style="background:rgba(255,255,255,0.15); color:#fff; font-weight:600; border:1px solid rgba(255,255,255,0.2); padding:8px 14px; border-radius:8px; cursor:pointer; font-size:13px;">Close</button>
    </div>
  </div>

  ${pages.join('')}

  <script>
    function triggerPrint() {
      try { window.focus(); window.print(); } catch(e) {}
    }
    if (document.readyState === 'complete') {
      setTimeout(triggerPrint, 400);
    } else {
      window.addEventListener('load', function() {
        setTimeout(triggerPrint, 400);
      });
      setTimeout(triggerPrint, 1400);
    }
  </script>
</body>
</html>`

  renderAndPrintHtml(html, `Fee Vouchers — (${challans.length} Compact Vouchers)`, printWin)
}

export function printBatchChallans(challans, school = {}, templateId = 1, printWin = null) {
  if (!challans || !challans.length) {
    alert('No challans available to print.')
    return
  }

  const LABELS = ['Student Copy', 'Institute Copy', 'Bank Copy']

  const pages = challans.map(ch => `
    <div class="voucher-page" style="width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box; page-break-after:always; break-after:page; page-break-inside:avoid; break-inside:avoid; margin:0 auto 10mm; background:#fff;">
      ${LABELS.map((label, index) => `
        <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
          ${renderVoucherCopyHtml(ch, label, school, templateId)}
        </div>
        ${index < 2 ? '<div style="border-left:1.5px dashed #ccc; width:1px; margin:0 2mm; height:204mm;"></div>' : ''}
      `).join('')}
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Batch Fee Vouchers — (${challans.length} Students)</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    @page { size:A4 landscape; margin:2mm 3mm; }
    body { background:#f3f4f6; font-family: Arial, sans-serif; padding:10px; margin:0; }
    @media print {
      body { background:#fff; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .no-print { display:none !important; }
      .voucher-page { margin-bottom:0 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position:sticky; top:0; z-index:99999; background:#0B2C4D; color:#fff; padding:12px 24px; border-radius:8px; box-shadow:0 6px 24px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; font-family:sans-serif; border:1px solid rgba(200,153,26,0.3);">
    <div style="display:flex; align-items:center; gap:14px;">
      <strong style="color:#C8991A; font-size:16px; letter-spacing:0.5px;">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</strong>
      <span style="font-size:13px; color:#C0C8D8;">• Batch Print: <strong>${challans.length} Students</strong> (${challans.length * 3} Vouchers)</span>
    </div>
    <div style="display:flex; gap:12px;">
      <button onclick="window.print()" style="background:linear-gradient(135deg,#D9A813,#F2C43B); color:#071e34; font-weight:800; border:none; padding:9px 24px; border-radius:8px; cursor:pointer; font-size:14px; box-shadow:0 3px 10px rgba(0,0,0,0.35);">🖨️ Print All Vouchers (${challans.length})</button>
      <button onclick="window.close()" style="background:rgba(255,255,255,0.15); color:#fff; font-weight:600; border:1px solid rgba(255,255,255,0.25); padding:9px 16px; border-radius:8px; cursor:pointer; font-size:13px;">Close</button>
    </div>
  </div>

  ${pages}

  <script>
    function triggerPrint() {
      try { window.focus(); window.print(); } catch(e) {}
    }
    if (document.readyState === 'complete') {
      setTimeout(triggerPrint, 450);
    } else {
      window.addEventListener('load', function() {
        setTimeout(triggerPrint, 450);
      });
      setTimeout(triggerPrint, 1500);
    }
  </script>
</body>
</html>`

  renderAndPrintHtml(html, `Batch Fee Vouchers — (${challans.length} Students)`, printWin)
}

const money = (value) => Number(value || 0).toLocaleString()
const netPayable = (challan, discountOverride) =>
 feeParts(challan, discountOverride).gross

export default function ViewChallans() {
 const navigate = useNavigate()
 const [challans, setChallans] = useState([])
 const [loading, setLoading] = useState(true)
 const MONTH_OPTIONS = ['September', 'August', 'July', 'June', 'May', 'All Months']
 const YEAR_OPTIONS = ['2026', '2027', 'All Years']

 const [selectedStatus, setSelectedStatus] = useState('All')
 const [selectedClass, setSelectedClass] = useState('All Classes')
 const [selectedMonth, setSelectedMonth] = useState('September')
 const [selectedYear, setSelectedYear] = useState('2026')
 const [search, setSearch] = useState('')
 const [paymentChallan, setPaymentChallan] = useState(null)
 const [paymentForm, setPaymentForm] = useState({ discount: 0, paid_amount: 0, payment_mode: 'cash', payment_note: '' })
 const [paymentError, setPaymentError] = useState('')
 const [paying, setPaying] = useState(false)
 const [editChallan, setEditChallan] = useState(null)
 const [editForm, setEditForm] = useState({ challan_no: '', month: '', year: '', monthly_fee: 0, previous_arrears: 0, discount: 0, due_date: '' })
 const [editError, setEditError] = useState('')
 const [savingEdit, setSavingEdit] = useState(false)
 const [printDdOpen, setPrintDdOpen] = useState(false)
 const [printMenuPos, setPrintMenuPos] = useState({ top: 0, right: 0 })
 const [classView, setClassView] = useState(false)
 const [openActionId, setOpenActionId] = useState(null)
 const [actionMenuPos, setActionMenuPos] = useState({ top:0, right:0 })
 const [actionMenuItems, setActionMenuItems] = useState([])
 const actionBtnRefs = useRef({})
 const printDdRef = useRef()
 const printDdButtonRef = useRef()
 const { paperSettings } = usePaperStore()
 const { families, getFamilyForStudent } = useFamilyStore()
 const { classNames } = useAcademicStore()
 const classOptions = ['All Classes', ...(classNames?.length ? classNames : ['Starter'])]
 const branding = useTenantBranding()

 const school = {
   name: branding?.schoolName || paperSettings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
   schoolName: branding?.schoolName || paperSettings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
   urdu: paperSettings?.schoolUrdu || '',
   address: branding?.address || paperSettings?.address || paperSettings?.schoolAddress || 'Sharif Chowk, Rayya Khas, Narowal',
   phone: paperSettings?.phone || '03001291959',
   logo: branding?.logoUrl || paperSettings?.logo || '',
   showUrduHeader: paperSettings?.showUrduHeader || false,
 }

 const load = () => {
   setLoading(true)
   const params = {}
   if (selectedStatus !== 'All') params.status = selectedStatus
   if (selectedClass !== 'All Classes') params.class = selectedClass
   if (selectedMonth !== 'All Months') params.month = selectedMonth
   if (selectedYear !== 'All Years') params.year = selectedYear
   api.get('/api/fees', { params })
     .then(r => setChallans(r.data.data || []))
     .catch(() => setChallans([]))
     .finally(() => setLoading(false))
 }

 useEffect(() => { load() }, [selectedStatus, selectedClass, selectedMonth, selectedYear])

 const syncPrintMenuPosition = () => {
 const rect = printDdButtonRef.current?.getBoundingClientRect()
 if (!rect) return
 setPrintMenuPos({
 top: Math.min(rect.bottom + 8, window.innerHeight - 24),
 right: Math.max(16, window.innerWidth - rect.right),
 })
 }

 const togglePrintDropdown = () => {
 syncPrintMenuPosition()
 setPrintDdOpen(open => !open)
 }

 useEffect(() => {
 if (!printDdOpen) return
 syncPrintMenuPosition()
 window.addEventListener('resize', syncPrintMenuPosition)
 window.addEventListener('scroll', syncPrintMenuPosition, true)
 return () => {
window.removeEventListener('resize', syncPrintMenuPosition)
 window.removeEventListener('scroll', syncPrintMenuPosition, true)
 }
 }, [printDdOpen])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest?.('.print-dd-menu') || e.target.closest?.('.print-dd-btn') || printDdRef.current?.contains(e.target) || printDdButtonRef.current?.contains(e.target)) return
      setPrintDdOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

 // Close action dropdown on outside click
 useEffect(() => {
 const close = (e) => {
 if (!e.target.closest('.action-dd-wrap')) setOpenActionId(null)
 }
 document.addEventListener('mousedown', close)
 return () => document.removeEventListener('mousedown', close)
 }, [])

 const openActionMenu = (e, item) => {
 e.stopPropagation()
 if (openActionId === item.id) { setOpenActionId(null); return }
 const btn = actionBtnRefs.current[item.id]
 if (!btn) return
 const rect = btn.getBoundingClientRect()
 const spaceBelow = window.innerHeight - rect.bottom
 const menuH = 220
 const top = spaceBelow < menuH + 12 ? rect.top - menuH - 4 : rect.bottom + 4
 setActionMenuPos({ top, right: window.innerWidth - rect.right })
 setActionMenuItems([
 { label:'Edit Challan / Fee', fn:()=>{ openEdit(item); setOpenActionId(null) } },
 { label:'Mark as Unpaid', fn:()=>{ api.put(`/api/fees/${item.id}/pay`,{paid_amount:0,discount:0,payment_note:'Reverted'}).then(load).catch(()=>{}); setOpenActionId(null) } },
 { label:'View Fee History', fn:()=>{ alert('Fee history coming soon'); setOpenActionId(null) } },
 { label:'One Student (1 Copy)', fn:()=>{ printChallan(item,school,1,1); setOpenActionId(null) } },
 { label:'One Student (3 Copies)', fn:()=>{ printChallan(item,school,1,3); setOpenActionId(null) } },
 { label:'Print (Simple)', fn:()=>{ printChallan(item,school,3,3); setOpenActionId(null) } },
 { label:'Print (Premium)', fn:()=>{ printChallan(item,school,2,3); setOpenActionId(null) } },
 ])
 setOpenActionId(item.id)
 }

 const toInputDate = (value) => {
 if (!value) return ''
 const date = new Date(value)
 if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
 return date.toISOString().slice(0, 10)
 }

 const openEdit = (challan) => {
 setEditChallan(challan)
 setEditForm({
 challan_no: challan.challan_no || '',
 month: challan.month || '',
 year: challan.year || new Date().getFullYear(),
 monthly_fee: feeParts(challan).monthly,
 previous_arrears: feeParts(challan).arrears,
 discount: Number(challan.discount || 0),
 due_date: toInputDate(challan.due_date),
 })
 setEditError('')
 }

 const closeEdit = () => {
 if (savingEdit) return
 setEditChallan(null)
 setEditError('')
 }

 const saveEdit = async () => {
 if (!editChallan) return
 const monthlyFee = Math.max(0, Number(editForm.monthly_fee || 0))
 const arrears = Math.max(0, Number(editForm.previous_arrears || 0))
 const discount = Math.max(0, Number(editForm.discount || 0))
 if (!editForm.challan_no.trim()) {
 setEditError('Challan number is required.')
 return
 }
 if (!editForm.month.trim()) {
 setEditError('Month is required.')
 return
 }
 if (!Number(editForm.year)) {
 setEditError('Year is required.')
 return
 }
 if (discount > monthlyFee + arrears) {
 setEditError('Discount cannot exceed monthly fee plus arrears.')
 return
 }
 setSavingEdit(true)
 try {
 await api.put(`/api/fees/${editChallan.id}`, {
 challan_no: editForm.challan_no.trim(),
 month: editForm.month.trim(),
 year: Number(editForm.year),
 monthly_fee: monthlyFee,
 amount: monthlyFee,
 previous_arrears: arrears,
 discount,
 due_date: editForm.due_date || null,
 })
 setEditChallan(null)
 load()
 } catch (err) {
 setEditError(err.response?.data?.message || 'Challan could not be updated. Please try again.')
 } finally {
 setSavingEdit(false)
 }
 }

 const openPayment = (challan) => {
 const discount = Number(challan.discount || 0)
 const alreadyPaid = Number(challan.paid_amount || 0)
 const remaining = Math.max(0, netPayable(challan, discount) - alreadyPaid)
 setPaymentChallan(challan)
 setPaymentForm({
 discount,
 paid_amount: remaining,
 payment_mode: challan.payment_mode || 'cash',
 payment_note: challan.payment_note || '',
 })
 setPaymentError('')
 }

 const closePayment = () => {
 if (paying) return
 setPaymentChallan(null)
 setPaymentError('')
 }

 const savePayment = async () => {
 if (!paymentChallan) return
 const discount = Math.max(0, Number(paymentForm.discount || 0))
 const payable = netPayable(paymentChallan, discount)
 const receivedNow = Math.max(0, Number(paymentForm.paid_amount || 0))
 const paid = Math.min(payable, Number(paymentChallan.paid_amount || 0) + receivedNow)

 const baseBeforeDiscount = feeParts(paymentChallan, 0).monthly + feeParts(paymentChallan, 0).arrears
 if (discount > baseBeforeDiscount) {
 setPaymentError('Discount cannot exceed the total challan amount.')
 return
 }
 if (receivedNow > Math.max(0, payable - Number(paymentChallan.paid_amount || 0))) {
 setPaymentError('Received amount cannot exceed the remaining balance.')
 return
 }

 setPaying(true)
 try {
 await api.put(`/api/fees/${paymentChallan.id}/pay`, {
 paid_amount: paid,
 discount,
 payment_mode: paymentForm.payment_mode,
 payment_note: paymentForm.payment_note,
 })
 setPaymentChallan(null)
 load()
 } catch (err) {
 setPaymentError(err.response?.data?.message || 'Payment could not be saved. Please try again.')
 } finally {
 setPaying(false)
 }
 }

 const filtered = challans.filter(c => {
 if (!search) return true
 const q = search.toLowerCase()
 const fam = getFamilyForStudent(c.student_id)
 return [c.name, c.gr_number, c.challan_no, fam?.code, fam?.fatherName].some(v => v?.toLowerCase().includes(q))
 })

 const paymentPayable = paymentChallan ? netPayable(paymentChallan, paymentForm.discount) : 0
const paymentAlreadyPaid = Number(paymentChallan?.paid_amount || 0)
 const paymentRemaining = Math.max(0, paymentPayable - paymentAlreadyPaid - Number(paymentForm.paid_amount || 0))

 return (
 <div style={{ minHeight:'100vh', padding:24, background:'#071e34', color:C.silver }}>
 <div style={{ width:'100%', maxWidth:1520, margin:'0 auto', display:'grid', gap:24 }}>

 {/* Header */}
  <div className="super-module-card" style={{ ...card, display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:16, alignItems:'center', position:'relative', zIndex:50 }}>
    <div>
      <h1 style={sectionHeader}>View Challans</h1>
      <p style={{ color:C.muted, marginTop:8 }}>Browse fee vouchers, receive full or partial payments, and apply discounts.</p>
    </div>
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
      <button type="button" onClick={()=>setClassView(v=>!v)} style={{ ...btnSecondary, fontSize:13, borderColor: classView ? '#C8991A' : undefined, color: classView ? '#C8991A' : undefined }}>
        {classView ? 'List View' : 'Class Wise View'}
      </button>

      {/* Quick Direct 1-Click Batch Print Button */}
      <button
        type="button"
        onClick={() => {
          if (!filtered.length) { alert('No challans found in current view.'); return }
          printBatchChallans(filtered, school, 1)
        }}
        style={{
          ...btnPrimary,
          background: 'linear-gradient(135deg,#D9A813,#F2C43B)',
          color: '#071e34',
          fontWeight: 800,
          fontSize: 13,
          boxShadow: '0 3px 12px rgba(217,168,19,0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        🖨️ Batch Print ({filtered.length})
      </button>

      {/* Print Vouchers Dropdown */}
      <div style={{ position:'relative' }}>
        <button ref={printDdButtonRef} type="button" className="print-dd-btn" onClick={togglePrintDropdown} style={{ ...btnSecondary, fontSize:13 }}>
          More Print Options ▾
        </button>
        {printDdOpen && createPortal(
          <div ref={printDdRef} className="print-dd-menu" style={{ position:'fixed', right:printMenuPos.right, top:printMenuPos.top, background:'#0B2C4D', border:'1px solid rgba(200,153,26,0.25)', borderRadius:12, zIndex:10000, width:'min(320px, calc(100vw - 32px))', maxHeight:`min(520px, calc(100vh - ${printMenuPos.top + 16}px))`, boxShadow:'0 18px 48px rgba(0,0,0,0.55)', overflowY:'auto', overflowX:'hidden' }}>
            <div style={{ padding:'8px 18px 4px', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Template 1 — Classic Bank</div>
            {[
              { label:'Single Student (Classic)', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printChallan(filtered[0],school,1,3) } },
              { label:'Batch Print (Classic)', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printBatchChallans(filtered,school,1) } },
            ].map(item=>(
              <button
                key={item.label}
                type="button"
                onClick={(e)=>{
                  e.stopPropagation()
                  item.fn()
                  setPrintDdOpen(false)
                }}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 18px', cursor:'pointer', background:'transparent', border:'none', color:'#C0C8D8', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)', fontFamily:'inherit' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.14)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {item.label}
              </button>
            ))}
            <div style={{ padding:'8px 18px 4px', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>Template 2 — Modern Premium</div>
            {[
              { label:'Single Student (Premium)', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printChallan(filtered[0],school,2,3) } },
              { label:'Batch Print (Premium)', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printBatchChallans(filtered,school,2) } },
            ].map(item=>(
              <button
                key={item.label}
                type="button"
                onClick={(e)=>{
                  e.stopPropagation()
                  item.fn()
                  setPrintDdOpen(false)
                }}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 18px', cursor:'pointer', background:'transparent', border:'none', color:'#C0C8D8', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)', fontFamily:'inherit' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.14)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {item.label}
              </button>
            ))}
            <div style={{ padding:'8px 18px 4px', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>Template 3 — Simple Compact</div>
            {[
              { label:'Single Student (Simple)', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printChallan(filtered[0],school,3,3) } },
              { label:'Batch Print (Simple)', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printBatchChallans(filtered,school,3) } },
              { label:'Compact 3-in-1 Batch', fn:()=>{ if(!filtered.length){ alert('No challans in current view.'); return } printCompactBatch(filtered,school) } },
            ].map(item=>(
              <button
                key={item.label}
                type="button"
                onClick={(e)=>{
                  e.stopPropagation()
                  item.fn()
                  setPrintDdOpen(false)
                }}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 18px', cursor:'pointer', background:'transparent', border:'none', color:'#C0C8D8', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)', fontFamily:'inherit' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.14)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  </div>

 {/* Filters */}
 <div className="super-module-card" style={{ ...card, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:14, alignItems:'end', position:'relative', zIndex:40 }}>
 <div>
 <label style={labelStyle}>Search</label>
 <input style={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search voucher, student or GR"/>
 </div>
 <div>
 <label style={labelStyle}>Billing Month</label>
 <select style={select} value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
 {MONTH_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Year</label>
 <select style={select} value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>
 {YEAR_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Class</label>
 <select style={select} value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
 {classOptions.map(v=><option key={v}>{v}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Status</label>
 <select style={select} value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)}>
 {STATUSES.map(v=><option key={v} value={v}>{v==='All'?'All':v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
 </select>
 </div>
 </div>

 {/* Class Wise View */}
 {classView && (() => {
 const byClass = {}
 challans.forEach(ch => {
 const cls = ch.class || 'Unknown'
 if (!byClass[cls]) byClass[cls] = { total:0, paid:0, unpaid:0, totalAmt:0, paidAmt:0 }
 byClass[cls].total++
 byClass[cls].totalAmt += netPayable(ch)
 if (ch.status==='paid') { byClass[cls].paid++; byClass[cls].paidAmt += Number(ch.paid_amount || netPayable(ch)) }
 else byClass[cls].unpaid++
 })
 const entries = Object.entries(byClass).sort(([a],[b])=>a.localeCompare(b))
 return (
 <div className="super-module-card" style={{ ...card, overflowX:'auto' }}>
 <div style={{ color:'#C8991A', fontWeight:800, fontSize:15, marginBottom:16 }}> Challans by Class</div>
 <table className="challans-table" style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ borderBottom:'1px solid rgba(200,153,26,0.2)' }}>
 {['Class','Total Challans','Paid','Unpaid','Total Amount','Paid Amount','Pending'].map(h=>(
 <th key={h} style={{ padding:'12px 14px', textAlign:'left', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {entries.map(([cls,d],i)=>(
 <tr key={cls} style={{ borderBottom:'1px solid rgba(200,153,26,0.06)', background:i%2===0?'transparent':'rgba(11,44,77,0.2)' }}>
 <td style={{ padding:'12px 14px', color:'#C8991A', fontWeight:700 }}>{cls}</td>
 <td style={{ padding:'12px 14px', color:'#C0C8D8', fontWeight:700 }}>{d.total}</td>
 <td style={{ padding:'12px 14px' }}><span style={{ padding:'3px 10px', borderRadius:20, background:'rgba(48,209,88,0.1)', color:'#30D158', fontWeight:600, fontSize:12 }}>{d.paid}</span></td>
 <td style={{ padding:'12px 14px' }}><span style={{ padding:'3px 10px', borderRadius:20, background:'rgba(255,55,95,0.1)', color:'#FF375F', fontWeight:600, fontSize:12 }}>{d.unpaid}</span></td>
 <td style={{ padding:'12px 14px', color:'#C0C8D8' }}>Rs. {d.totalAmt.toLocaleString()}</td>
 <td style={{ padding:'12px 14px', color:'#30D158', fontWeight:700 }}>Rs. {d.paidAmt.toLocaleString()}</td>
 <td style={{ padding:'12px 14px', color:'#FF375F', fontWeight:700 }}>Rs. {(d.totalAmt-d.paidAmt).toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )
 })()}

 {/* Table */}
 <div className="super-module-card" style={{ ...card, overflowX:'auto', position:'relative', zIndex:30 }}>
 {loading ? (
 <div style={{ padding:40, textAlign:'center', color:C.muted }}>Loading challans…</div>
 ) : (
 <table className="challans-table" style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ borderBottom:`1px solid ${C.border}` }}>
 {['GR. No','Student / Father','Family Code','Class/Sec','Challan / Month','Monthly Fee','Total','Pay Fee','Status','Action'].map(h=>(
 <th key={h} style={{ padding:'10px 12px', fontSize:11, color:C.muted, textAlign:'left', textTransform:'uppercase', letterSpacing:0.06, whiteSpace:'nowrap' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {filtered.map((item, i) => (
 <tr key={item.id} style={{ background:i%2===0?'transparent':'rgba(11,44,77,0.2)', verticalAlign:'middle' }}>
 <td style={{ padding:'10px 12px', color:C.gold, fontWeight:700, fontSize:12 }}>{item.gr_number || '—'}</td>
 <td style={{ padding:'10px 12px' }}>
 <div
 style={{ color:C.silver, fontWeight:700, fontSize:13, cursor:'pointer', textDecoration:'underline', textDecorationColor:'rgba(10,132,255,0.4)' }}
 onClick={()=>navigate(`/students?view=${item.student_id}`)}
 onMouseEnter={e=>e.currentTarget.style.color='#0A84FF'}
 onMouseLeave={e=>e.currentTarget.style.color=C.silver}
 >{item.name || '—'}</div>
 <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{item.father_name || '—'}</div>
 </td>
 <td style={{ padding:'10px 12px' }}>
  {(() => {
   // Use DB family_code first (from challan join), then fall back to local store
   const dbFamilyCode = item.family_code
   const fam = getFamilyForStudent(item.student_id)
   const familyCode = dbFamilyCode || fam?.code
   const siblingCount = fam?.students?.length
   if (!familyCode) return <span style={{ color:C.muted }}>—</span>
   return (
    <div
     style={{ display:'flex', flexDirection:'column', gap:2, cursor:'pointer' }}
     onClick={() => navigate(`/families?code=${familyCode}`)}
     title={`Click to view family ${familyCode}`}
    >
     <div style={{
      color:C.gold, fontWeight:700, fontSize:12,
      textDecoration:'underline', textDecorationColor:'rgba(200,153,26,0.4)'
     }}
     onMouseEnter={e => e.currentTarget.style.color='#e8b420'}
     onMouseLeave={e => e.currentTarget.style.color=C.gold}
     >{familyCode}</div>
     {siblingCount > 0 && <div style={{ color:C.muted, fontSize:10 }}>{siblingCount} children</div>}
    </div>
   )
  })()}
 </td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ color:C.silver, fontSize:12 }}>{item.class || '—'}</div>
 <div style={{ color:C.muted, fontSize:11 }}>{item.section || '—'}</div>
 </td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ color:C.gold, fontWeight:800, fontSize:12 }}>{item.challan_no || '—'}</div>
 <div style={{ color:C.muted, fontSize:11 }}>{item.month} {item.year}</div>
 </td>
 <td style={{ padding:'10px 12px', color:C.silver, fontSize:12 }}>
 <div>Rs. {money(feeParts(item).monthly)}</div>
 {feeParts(item).arrears > 0 && <div style={{ color:C.muted, fontSize:10, marginTop:2 }}>Arrears: {money(feeParts(item).arrears)}</div>}
 </td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ color:C.silver, fontWeight:700, fontSize:12 }}>Rs. {money(netPayable(item))}</div>
 {Number(item.discount||0) > 0 && <div style={{ color:C.green, fontSize:10, marginTop:2 }}>Disc: {money(item.discount)}</div>}
 </td>
 <td style={{ padding:'10px 12px' }}>
 {item.status === 'paid'
 ? <div style={{ color:C.green, fontWeight:700, fontSize:12 }}> {money(item.paid_amount || netPayable(item))}</div>
 : <button
     type="button"
     style={{ ...payActionButton, ...tableActionButton, minWidth:80, cursor:'pointer', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}
     onClick={(e) => {
       e.preventDefault()
       e.stopPropagation()
       openPayment(item)
     }}
   >
     {item.status === 'partial' ? 'Partially Pay' : 'Pay Now'}
   </button>
 }
 </td>
 <td style={{ padding:'10px 12px' }}>
 <span style={{ padding:'5px 10px', borderRadius:12, fontWeight:700, fontSize:11, ...badgeStyle(item.status) }}>{item.status}</span>
 </td>
 <td style={{ padding:'10px 12px' }}>
 <button
 className="action-dd-wrap"
 ref={el => { actionBtnRefs.current[item.id] = el }}
 onClick={(e) => openActionMenu(e, item)}
 style={{ ...tableActionButton, background:'#C8991A', color:'#071e34', border:'none', cursor:'pointer', minWidth:72 }}
 >Action </button>
 </td>
 </tr>
 ))}
 {filtered.length===0 && (
 <tr><td colSpan={10} style={{ padding:28, textAlign:'center', color:C.muted }}>No challans found.</td></tr>
 )}
 </tbody>
 </table>
 )}
 </div>
 </div>

 {/* Action dropdown rendered via portal so it's never clipped by table overflow */}
 {openActionId && createPortal(
 <div
 onClick={() => setOpenActionId(null)}
 style={{ position:'fixed', inset:0, zIndex:9000 }}
 >
 <div
 className="action-dd-wrap"
 onClick={e => e.stopPropagation()}
 style={{
 position:'fixed',
 top: actionMenuPos.top,
 right: actionMenuPos.right,
 background:'#0B2C4D',
 border:'1px solid rgba(200,153,26,0.3)',
 borderRadius:10,
 zIndex:9001,
 minWidth:210,
 boxShadow:'0 16px 48px rgba(0,0,0,0.6)',
 overflow:'hidden',
 }}
 >
 {actionMenuItems.map((a, idx) => (
 <div
 key={idx}
 onClick={a.fn}
 style={{ padding:'10px 18px', cursor:'pointer', fontSize:13, color:'#C0C8D8', borderBottom:'1px solid rgba(255,255,255,0.05)', userSelect:'none' }}
 onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,153,26,0.14)'}
 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
 >{a.label}</div>
 ))}
 </div>
 </div>,
 document.body
 )}

 {editChallan && typeof document !== 'undefined' && createPortal(
 <div style={{
 position:'fixed', inset:0, zIndex:10000, background:'rgba(2,12,24,0.78)', backdropFilter:'blur(10px)',
 display:'flex', alignItems:'center', justifyContent:'center', padding:16,
 }}>
 <div className="super-module-card" style={{ ...card, width:'min(760px, 100%)', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 30px 90px rgba(0,0,0,0.65)' }}>
 <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', marginBottom:18 }}>
 <div>
 <div style={{ color:C.gold, fontWeight:900, fontSize:22 }}>Edit Challan & Monthly Fee</div>
 <div style={{ color:C.muted, marginTop:6 }}>{editChallan.name || 'Student'} - {editChallan.gr_number || 'No GR'}</div>
 </div>
 <button onClick={closeEdit} style={{ ...btnSecondary, padding:'8px 12px' }}>Close</button>
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:14 }}>
 <div>
 <label style={labelStyle}>Challan Number</label>
 <input
 style={input}
 value={editForm.challan_no}
 onChange={e=>setEditForm(f=>({ ...f, challan_no:e.target.value }))}
 placeholder="CH-0001"
 />
 </div>
 <div>
 <label style={labelStyle}>Due Date</label>
 <input
 style={input}
 type="date"
 value={editForm.due_date}
 onChange={e=>setEditForm(f=>({ ...f, due_date:e.target.value }))}
 />
 </div>
 <div>
 <label style={labelStyle}>Month</label>
 <input
 style={input}
 value={editForm.month}
 onChange={e=>setEditForm(f=>({ ...f, month:e.target.value }))}
 placeholder="June"
 />
 </div>
 <div>
 <label style={labelStyle}>Year</label>
 <input
 style={input}
 type="number"
 value={editForm.year}
 onChange={e=>setEditForm(f=>({ ...f, year:e.target.value }))}
 placeholder="2026"
 />
 </div>
 <div>
 <label style={labelStyle}>Monthly Fee</label>
 <input
 style={input}
 type="number"
 min="0"
 value={editForm.monthly_fee}
 onChange={e=>setEditForm(f=>({ ...f, monthly_fee:e.target.value }))}
 />
 </div>
 <div>
 <label style={labelStyle}>Previous Arrears</label>
 <input
 style={input}
 type="number"
 min="0"
 value={editForm.previous_arrears}
 onChange={e=>setEditForm(f=>({ ...f, previous_arrears:e.target.value }))}
 />
 </div>
 <div>
 <label style={labelStyle}>Discount</label>
 <input
 style={input}
 type="number"
 min="0"
 value={editForm.discount}
 onChange={e=>setEditForm(f=>({ ...f, discount:e.target.value }))}
 />
 </div>
 <div>
 <label style={labelStyle}>New Net Total</label>
 <div style={{ ...input, display:'flex', alignItems:'center', color:C.gold, fontWeight:900 }}>
 Rs. {money(Math.max(0, Number(editForm.monthly_fee || 0) + Number(editForm.previous_arrears || 0) - Number(editForm.discount || 0)))}
 </div>
 </div>
 </div>

 {editError && (
 <div style={{ marginTop:14, color:C.red, background:'rgba(255,55,95,0.1)', border:'1px solid rgba(255,55,95,0.25)', borderRadius:12, padding:'10px 12px', fontWeight:700 }}>
 {editError}
 </div>
 )}

 <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, flexWrap:'wrap' }}>
 <button onClick={closeEdit} style={btnSecondary} disabled={savingEdit}>Cancel</button>
 <button onClick={saveEdit} style={btnPrimary} disabled={savingEdit}>
 {savingEdit ? 'Saving...' : 'Save Challan Changes'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {paymentChallan && typeof document !== 'undefined' && createPortal(
 <div style={{
 position:'fixed', inset:0, zIndex:10000, background:'rgba(2,12,24,0.78)', backdropFilter:'blur(10px)',
 display:'flex', alignItems:'center', justifyContent:'center', padding:16,
 }}>
 <div className="super-module-card" style={{ ...card, width:'min(760px, 100%)', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 30px 90px rgba(0,0,0,0.65)' }}>
 <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', marginBottom:18 }}>
 <div>
 <div style={{ color:C.gold, fontWeight:900, fontSize:22 }}>Receive Fee Payment</div>
 <div style={{ color:C.muted, marginTop:6 }}>Voucher {paymentChallan.challan_no} - {paymentChallan.month} {paymentChallan.year}</div>
 </div>
 <button onClick={closePayment} style={{ ...btnSecondary, padding:'8px 12px' }}>Close</button>
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12, marginBottom:16 }}>
 {[
 ['Student', paymentChallan.name || '—'],
 ['Father', paymentChallan.father_name || '—'],
 ['GR No', paymentChallan.gr_number || '—'],
 ['Class', `${paymentChallan.class || '—'} / ${paymentChallan.section || '—'}`],
 ].map(([k, v]) => (
 <div key={k} style={{ background:'rgba(11,44,77,0.38)', border:`1px solid ${C.border}`, borderRadius:12, padding:12 }}>
 <div style={{ color:C.muted, fontSize:11, textTransform:'uppercase', fontWeight:800, marginBottom:5 }}>{k}</div>
 <div style={{ color:C.silver, fontWeight:800 }}>{v}</div>
 </div>
 ))}
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10, marginBottom:18 }}>
 <div style={{ background:'rgba(15,23,42,0.62)', border:`1px solid ${C.border}`, borderRadius:12, padding:12 }}>
 <div style={{ color:C.muted, fontSize:11, fontWeight:800 }}>Gross Fee</div>
 <div style={{ color:C.silver, fontWeight:900, marginTop:6 }}>Rs. {money(paymentChallan.amount)}</div>
 </div>
 <div style={{ background:'rgba(48,209,88,0.09)', border:'1px solid rgba(48,209,88,0.22)', borderRadius:12, padding:12 }}>
 <div style={{ color:C.green, fontSize:11, fontWeight:800 }}>Discount</div>
 <div style={{ color:C.green, fontWeight:900, marginTop:6 }}>Rs. {money(paymentForm.discount)}</div>
 </div>
 <div style={{ background:'rgba(200,153,26,0.09)', border:'1px solid rgba(200,153,26,0.22)', borderRadius:12, padding:12 }}>
 <div style={{ color:C.gold, fontSize:11, fontWeight:800 }}>Net Payable</div>
 <div style={{ color:C.gold, fontWeight:900, marginTop:6 }}>Rs. {money(paymentPayable)}</div>
 </div>
 <div style={{ background:'rgba(255,55,95,0.09)', border:'1px solid rgba(255,55,95,0.2)', borderRadius:12, padding:12 }}>
 <div style={{ color:C.red, fontSize:11, fontWeight:800 }}>Remaining</div>
 <div style={{ color:paymentRemaining === 0 ? C.green : C.red, fontWeight:900, marginTop:6 }}>Rs. {money(paymentRemaining)}</div>
 </div>
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div>
 <label style={labelStyle}>Discount</label>
 <input
 style={input}
 type="number"
 min="0"
 value={paymentForm.discount}
 onChange={e=>setPaymentForm(f=>({ ...f, discount:e.target.value }))}
 placeholder="0"
 />
 </div>
 <div>
 <label style={labelStyle}>Payment Mode</label>
 <select style={select} value={paymentForm.payment_mode} onChange={e=>setPaymentForm(f=>({ ...f, payment_mode:e.target.value }))}>
 <option value="cash">Cash</option>
 <option value="online">Online</option>
 <option value="jazzcash">JazzCash</option>
 <option value="easypaisa">EasyPaisa</option>
 </select>
 </div>
 <div>
 <label style={labelStyle}>Amount Receiving Now</label>
 <input
 style={input}
 type="number"
 min="0"
 max={paymentPayable}
 value={paymentForm.paid_amount}
 onChange={e=>setPaymentForm(f=>({ ...f, paid_amount:e.target.value }))}
 placeholder="Enter paid amount"
 />
 <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
 <button type="button" style={{ ...btnSecondary, padding:'7px 10px', fontSize:12 }} onClick={()=>setPaymentForm(f=>({ ...f, paid_amount:Math.max(0, paymentPayable - paymentAlreadyPaid) }))}>Full Pay</button>
 <button type="button" style={{ ...btnSecondary, padding:'7px 10px', fontSize:12 }} onClick={()=>setPaymentForm(f=>({ ...f, paid_amount:Math.max(0, paymentPayable - paymentAlreadyPaid) }))}>Remaining Only</button>
 </div>
 </div>
 <div>
 <label style={labelStyle}>Already Paid</label>
 <div style={{ ...input, display:'flex', alignItems:'center', color:C.muted }}>Rs. {money(paymentAlreadyPaid)}</div>
 </div>
 <div style={{ gridColumn:'1 / -1' }}>
 <label style={labelStyle}>Payment Note</label>
 <input
 style={input}
 value={paymentForm.payment_note}
 onChange={e=>setPaymentForm(f=>({ ...f, payment_note:e.target.value }))}
 placeholder="Optional note, receipt reference, or discount reason"
 />
 </div>
 </div>

 {paymentError && (
 <div style={{ marginTop:14, color:C.red, background:'rgba(255,55,95,0.1)', border:'1px solid rgba(255,55,95,0.25)', borderRadius:12, padding:'10px 12px', fontWeight:700 }}>
 {paymentError}
 </div>
 )}

 <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, flexWrap:'wrap' }}>
 <button onClick={closePayment} style={btnSecondary} disabled={paying}>Cancel</button>
 <button onClick={savePayment} style={btnPrimary} disabled={paying}>
 {paying ? 'Saving...' : paymentRemaining === 0 ? 'Save Full Payment' : 'Save Partial Payment'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </div>
)
}
