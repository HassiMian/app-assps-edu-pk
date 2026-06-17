import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
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

    return `
      <tr style="border-bottom:1px solid #e8e8e8; background:#f7f7f7;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Monthly Fee ${ch.month||''} ${ch.year||''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${amt.toLocaleString()}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${disc||0}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${paidAmt?net.toLocaleString():0}</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">${net.toLocaleString()}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8; background:#fff;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Admission Fee</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${admFee?admFee.toLocaleString():'—'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">${admFee?admFee.toLocaleString():'—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8; background:#f7f7f7;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Other Fee</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">${othFee?othFee.toLocaleString():'—'}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">${othFee?othFee.toLocaleString():'—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #d4b84a; background:#fef8e0;">
        <td style="padding:4px 6px; color:#7a5c00; font-style:italic; font-size:10.5px;">Previous Month Fee</td>
        <td style="text-align:center; padding:4px 3px; color:#7a5c00; font-size:10.5px;">${hasPrev?prevFee.toLocaleString():'—'}</td>
        <td style="text-align:center; padding:4px 3px; color:#7a5c00; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; color:#7a5c00; font-size:10.5px;">0</td>
        <td style="text-align:center; padding:4px 3px; font-weight:800; color:#7a5c00; font-size:10.5px;">${hasPrev?prevFee.toLocaleString():'—'}</td>
      </tr>
      <tr style="border-top:2px solid ${theme.primaryColor}; background:#e4e4e4; font-weight:800;">
        <td style="padding:4px 6px; font-size:11.5px; color:#111;">Net Total</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${amt.toLocaleString()}</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${disc||0}</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${paidAmt?net.toLocaleString():0}</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">${net.toLocaleString()}</td>
      </tr>
    `
  }
}

// Unified function to render one copy of the voucher (occupies 100% width and height of container)
export function renderVoucherCopyHtml(ch, label, school, templateId, isCompact = false) {
  const theme = getTemplateTheme(templateId)
  const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  
  // Handle different property naming (database vs preview)
  const dueDateVal = ch.due_date || ch.dueDate
  const dueDate = dueDateVal
    ? new Date(dueDateVal).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
    : today

  const sn = school.name || school.schoolName || 'Al Siddique Scholars Public School'
  const sa = school.address || ''
  const sl = school.logo || ''

  const grVal = ch.gr_number || ch.gr || '—'
  const nameVal = ch.name || ch.student || '—'
  const fatherVal = ch.father_name || ch.father || '—'
  const voucherNoVal = ch.challan_no || ch.voucherNo || '—'
  const classVal = ch.class || '—'
  const sectionVal = ch.section || '—'

  const { gross: net, remaining: rem } = feeParts(ch)
  const netTotalVal = ch.total !== undefined ? ch.total : net
  const paidVal = ch.status === 'paid' || ch.status === 'Paid' ? netTotalVal : (ch.paid_amount || 0)
  const remVal = ch.status === 'paid' || ch.status === 'Paid' ? 0 : (ch.remaining_balance !== undefined ? ch.remaining_balance : netTotalVal)

  const logoImg = sl
    ? `<img src="${sl}" style="height:36px;width:36px;object-fit:contain;display:block">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:${theme.primaryColor};display:flex;align-items:center;justify-content:center;font-weight:900;color:${theme.secondaryColor};font-size:16px;font-family:sans-serif">A</div>`

  const feeRows = renderDynamicFeeRows(ch, theme)

  return `
    <div style="width:100%; height:100%; box-sizing:border-box; border:1.8px solid ${theme.outerBorderColor}; border-radius:6px; font-family:${theme.fontFam}; display:flex; flex-direction:column; overflow:hidden; background:${theme.cardBg}; padding:8px 10px; justify-content:flex-start; page-break-inside:avoid; position:relative;">
      
      <!-- Top Label Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${theme.primaryColor}; padding-bottom:2px; margin-bottom:3px;">
        <div style="font-weight:700; font-size:10px; color:${theme.secondaryColor}; letter-spacing:0.5px; text-transform:uppercase;">${label}</div>
        <div style="font-weight:700; font-size:10px; color:${theme.primaryColor};">No: <span style="color:${theme.secondaryColor}">${voucherNoVal}</span></div>
      </div>
      
      <!-- School Branding Header -->
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px; justify-content:center;">
        <div style="flex:0 0 auto;">${logoImg}</div>
        <div style="flex:1; text-align:center;">
          <div style="font-weight:800; font-size:15px; color:${theme.schoolNameColor}; line-height:1.2; margin:0; padding:0;">${sn}</div>
          <div style="font-size:9px; color:#555; line-height:1.2; margin-top:1px;">${sa}</div>
        </div>
        <div style="flex:0 0 auto;">${logoImg}</div>
      </div>
      
      <!-- Voucher Sub-Header -->
      <div style="background:${theme.headerBg}; color:${theme.headerText}; text-align:center; padding:2px; font-weight:700; font-size:12px; letter-spacing:1.5px; border-radius:4px; margin-bottom:4px;">
        FEE VOUCHER
      </div>

      <!-- Student Details Section (Vertical stack layout for narrow columns) -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-size:11px; line-height:1.3;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:2px; color:#555; font-weight:500; width:32%;">Student:</td>
          <td style="padding:2px; font-weight:700; color:#000; width:68%; text-transform:capitalize;">${nameVal}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:2px; color:#555; font-weight:500;">Father:</td>
          <td style="padding:2px; font-weight:700; color:#000; text-transform:capitalize;">${fatherVal}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:2px; color:#555; font-weight:500;">Class / Sec:</td>
          <td style="padding:2px; font-weight:700; color:#000;">${classVal} (${sectionVal})</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:2px; color:#555; font-weight:500;">GR Number:</td>
          <td style="padding:2px; font-weight:700; color:${theme.secondaryColor};">${grVal}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:2px; color:#555; font-weight:500;">Due Date:</td>
          <td style="padding:2px; font-weight:700; color:#c0392b;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding:2px; color:#555; font-weight:500;">Print Date:</td>
          <td style="padding:2px; font-weight:700; color:#555;">${today}</td>
        </tr>
      </table>

      <!-- Fee Table -->
      <table style="width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:4px;">
        <thead>
          <tr style="background:${theme.tableHeaderBg}; color:${theme.tableHeaderColor}; border-top:1.5px solid ${theme.primaryColor}; border-bottom:1.5px solid ${theme.primaryColor}; font-weight:700;">
            <th style="text-align:left; padding:4px 6px;">Particulars</th>
            <th style="text-align:center; padding:4px 2px; width:18%;">Gross</th>
            <th style="text-align:center; padding:4px 2px; width:12%;">Disc</th>
            <th style="text-align:center; padding:4px 2px; width:14%;">Paid</th>
            <th style="text-align:center; padding:4px 2px; width:16%;">Net</th>
          </tr>
        </thead>
        <tbody>
          ${feeRows}
        </tbody>
      </table>

      <!-- Totals & Notes Sections (Stacked vertically) -->
      <div style="display:flex; flex-direction:column; gap:3px; margin-bottom:4px;">
        <!-- Totals (11.5px bold) -->
        <div style="display:flex; flex-direction:column; gap:2px; font-size:11.5px; font-weight:700; background:#f9f9f9; padding:4px 6px; border-radius:4px; border:1px solid #ddd;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#555;">Paid Amount:</span>
            <span style="color:${(ch.status==='paid' || ch.status==='Paid')?'#27ae60':'#333'}">Rs. ${paidVal.toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-top:1px solid #eee; padding-top:2px;">
            <span>Remaining:</span>
            <span style="color:${remVal===0?'#27ae60':'#c0392b'}">${remVal===0?'PAID':'Rs. '+remVal.toLocaleString()}</span>
          </div>
        </div>
        
        <!-- Notes (9.5px readable - height auto so it NEVER cuts off) -->
        <div style="font-size:9.5px; font-weight:700; line-height:1.25; color:#555; text-align:justify; border:1px solid #ddd; padding:4px; border-radius:4px; background:#fff; height:auto; overflow:visible;">
          ${NOTICE_TEXT}
        </div>
      </div>

      <!-- Signatures & Stamps Footer -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px; border-top:1px solid #eee; margin-top:auto;">
        <div style="text-align:center; width:75px;">
          <div style="border-top:1px solid #333; margin-top:6px; margin-bottom:1px;"></div>
          <span style="font-size:10px; font-weight:700; color:#555;">Depositor</span>
        </div>
        <div style="text-align:center;">
          <div style="display:inline-block; border-radius:4px; padding:2px 8px; transform:rotate(-5deg); font-size:9.5px; font-weight:800; letter-spacing:1px; line-height:1; ${theme.stampStyle}">STAMP</div>
        </div>
        <div style="text-align:center; width:75px;">
          <div style="border-top:1px solid #333; margin-top:6px; margin-bottom:1px;"></div>
          <span style="font-size:10px; font-weight:700; color:#555;">Cashier</span>
        </div>
      </div>

    </div>
  `
}

//  Fee Challan Print — A4 Landscape, 3-per-page
export function printChallan(challan, school, templateId = 1, copies = 3) {
  const LABELS = ['Student Copy', 'Institute Copy', 'Bank Copy'].slice(0, copies)

  const printPageSize = 'A4 landscape'
  const printMargin = '2mm 3mm'
  const bodyDimensions = 'width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box;'

  const html = `<!DOCTYPE html><html><head><title>Fee Voucher — ${challan.challan_no||''}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    @page { size:${printPageSize}; margin:${printMargin}; }
    body { background:#fff; font-family: Arial, sans-serif; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
  </head><body>
  <div style="${bodyDimensions}">
    ${LABELS.map((label, index) => `
      <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
        ${renderVoucherCopyHtml(challan, label, school, templateId)}
      </div>
      ${(copies === 3 && index < 2) ? '<div style="border-left:1.5px dashed #ccc; width:1px; margin:0 2mm; height:204mm;"></div>' : ''}
    `).join('')}
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),500);</script></body></html>`

  const w = window.open('', '_blank', 'width=1200,height=900')
  w.document.write(html)
  w.document.close()
}

export function printCompactBatch(challans, school) {
  const batchVouchers = challans.map((ch) => {
    return renderVoucherCopyHtml(ch, 'Student Copy', school, 1)
  })

  const pages = []
  for (let i = 0; i < batchVouchers.length; i += 3) {
    const group = batchVouchers.slice(i, i + 3)
    pages.push(`
      <div style="width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box; page-break-after:always;">
        ${group.map((v, index) => `
          <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
            ${v}
          </div>
          ${index < group.length - 1 ? '<div style="border-left:1.5px dashed #ccc; width:1px; margin:0 2mm; height:204mm;"></div>' : ''}
        `).join('')}
      </div>
    `)
  }

  const html = `<!DOCTYPE html><html><head><title>Fee Vouchers — 3 per Page</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    @page { size:A4 landscape; margin:2mm 3mm; }
    body { background:#fff; font-family: Arial, sans-serif; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
  </head><body>
    ${pages.join('')}
    <script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
  </body></html>`

  const w = window.open('', '_blank', 'width=1200,height=900')
  w.document.write(html)
  w.document.close()
}

export function printBatchChallans(challans, school, templateId = 1) {
  const LABELS = ['Student Copy', 'Institute Copy', 'Bank Copy']

  const pages = challans.map(ch => `
    <div style="width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box; page-break-after:always;">
      ${LABELS.map((label, index) => `
        <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
          ${renderVoucherCopyHtml(ch, label, school, templateId)}
        </div>
        ${index < 2 ? '<div style="border-left:1.5px dashed #ccc; width:1px; margin:0 2mm; height:204mm;"></div>' : ''}
      `).join('')}
    </div>
  `).join('')

  const html = `<!DOCTYPE html><html><head><title>Batch Fee Vouchers</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    @page { size:A4 landscape; margin:2mm 3mm; }
    body { background:#fff; font-family: Arial, sans-serif; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
  </head><body>
    ${pages}
    <script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
  </body></html>`

  const w = window.open('', '_blank', 'width=1200,height=900')
  w.document.write(html)
  w.document.close()
}

const money = (value) => Number(value || 0).toLocaleString()
const netPayable = (challan, discountOverride) =>
 feeParts(challan, discountOverride).gross

export default function ViewChallans() {
 const navigate = useNavigate()
 const [challans, setChallans] = useState([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [selectedStatus, setSelectedStatus] = useState('All')
 const [selectedClass, setSelectedClass] = useState('All Classes')
 const [paymentChallan, setPaymentChallan] = useState(null)
 const [paymentForm, setPaymentForm] = useState({ discount: 0, paid_amount: 0, payment_mode: 'cash', payment_note: '' })
 const [paymentError, setPaymentError] = useState('')
 const [paying, setPaying] = useState(false)
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

 const load = () => {
 setLoading(true)
 const params = {}
 if (selectedStatus !== 'All') params.status = selectedStatus
 if (selectedClass !== 'All Classes') params.class = selectedClass
 api.get('/api/fees', { params })
 .then(r => setChallans(r.data.data || []))
 .catch(() => setChallans([]))
 .finally(() => setLoading(false))
 }

 useEffect(() => { load() }, [selectedStatus, selectedClass])

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
 if (printDdRef.current?.contains(e.target) || printDdButtonRef.current?.contains(e.target)) return
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
 { label:'Mark as Unpaid', fn:()=>{ api.put(`/api/fees/${item.id}/pay`,{paid_amount:0,discount:0,payment_note:'Reverted'}).then(load).catch(()=>{}); setOpenActionId(null) } },
 { label:'View Fee History', fn:()=>{ alert('Fee history coming soon'); setOpenActionId(null) } },
 { label:'One Student (1 Copy)', fn:()=>{ printChallan(item,school,1,1); setOpenActionId(null) } },
 { label:'One Student (3 Copies)', fn:()=>{ printChallan(item,school,1,3); setOpenActionId(null) } },
 { label:'Print (Simple)', fn:()=>{ printChallan(item,school,3,3); setOpenActionId(null) } },
 { label:'Print (Premium)', fn:()=>{ printChallan(item,school,2,3); setOpenActionId(null) } },
 ])
 setOpenActionId(item.id)
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

 const school = {
 name: paperSettings.schoolName,
 urdu: paperSettings.schoolUrdu,
 address: paperSettings.address,
 phone: paperSettings.phone,
 logo: paperSettings.logo,
 showUrduHeader: paperSettings.showUrduHeader,
 }

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
 <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
 <button onClick={()=>setClassView(v=>!v)} style={{ ...btnSecondary, fontSize:13, borderColor: classView ? '#C8991A' : undefined, color: classView ? '#C8991A' : undefined }}>
  {classView ? 'List View' : 'Class Wise View'}
 </button>

 {/* Print Vouchers Dropdown */}
 <div style={{ position:'relative' }}>
 <button ref={printDdButtonRef} onClick={togglePrintDropdown} style={{ ...btnPrimary, fontSize:13 }}>
  Print Vouchers 
 </button>
 {printDdOpen && createPortal(
 <div ref={printDdRef} style={{ position:'fixed', right:printMenuPos.right, top:printMenuPos.top, background:'#0B2C4D', border:'1px solid rgba(200,153,26,0.25)', borderRadius:12, zIndex:10000, width:'min(320px, calc(100vw - 32px))', maxHeight:`min(520px, calc(100vh - ${printMenuPos.top + 16}px))`, boxShadow:'0 18px 48px rgba(0,0,0,0.55)', overflowY:'auto', overflowX:'hidden' }}>
 <div style={{ padding:'8px 18px 4px', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Template 1 — Classic Bank</div>
 {[
 { label:'Single Student (Classic)', fn:()=>{ if(filtered.length) printChallan(filtered[0],school,1); else alert('No challans'); setPrintDdOpen(false) } },
 { label:'Batch Print (Classic)', fn:()=>{ if(filtered.length) printBatchChallans(filtered,school,1); else alert('No challans'); setPrintDdOpen(false) } },
 ].map(item=>(
 <div key={item.label} onClick={item.fn} style={{ padding:'9px 18px', cursor:'pointer', color:'#C0C8D8', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)' }}
 onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.1)'}
 onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{item.label}</div>
 ))}
 <div style={{ padding:'8px 18px 4px', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>Template 2 — Modern Premium</div>
 {[
 { label:'Single Student (Premium)', fn:()=>{ if(filtered.length) printChallan(filtered[0],school,2); else alert('No challans'); setPrintDdOpen(false) } },
 { label:'Batch Print (Premium)', fn:()=>{ if(filtered.length) printBatchChallans(filtered,school,2); else alert('No challans'); setPrintDdOpen(false) } },
 ].map(item=>(
 <div key={item.label} onClick={item.fn} style={{ padding:'9px 18px', cursor:'pointer', color:'#C0C8D8', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)' }}
 onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.1)'}
 onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{item.label}</div>
 ))}
 <div style={{ padding:'8px 18px 4px', color:'#8892A4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>Template 3 — Simple Compact</div>
 {[
 { label:'Single Student (Simple)', fn:()=>{ if(filtered.length) printChallan(filtered[0],school,3); else alert('No challans'); setPrintDdOpen(false) } },
 { label:'Batch Print (Simple)', fn:()=>{ if(filtered.length) printBatchChallans(filtered,school,3); else alert('No challans'); setPrintDdOpen(false) } },
 ].map(item=>(
 <div key={item.label} onClick={item.fn} style={{ padding:'9px 18px', cursor:'pointer', color:'#C0C8D8', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)' }}
 onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.1)'}
 onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{item.label}</div>
 ))}
 </div>,
 document.body
 )}
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="super-module-card" style={{ ...card, display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr', gap:16, alignItems:'end', position:'relative', zIndex:40 }}>
 <div>
 <label style={labelStyle}>Search</label>
 <input style={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search voucher, student or GR"/>
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
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
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
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
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
 : <button style={{ ...payActionButton, ...tableActionButton, minWidth:80 }} onClick={()=>openPayment(item)}>
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

 {paymentChallan && (
 <div style={{
 position:'fixed', inset:0, zIndex:1000, background:'rgba(2,12,24,0.72)', backdropFilter:'blur(10px)',
 display:'flex', alignItems:'center', justifyContent:'center', padding:20,
 }}>
 <div className="super-module-card" style={{ ...card, width:'min(760px, 100%)', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 30px 90px rgba(0,0,0,0.55)' }}>
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

 <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:10, marginBottom:18 }}>
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
 </div>
 )}
 </div>
 )
}
