/**
 * JARVIS 4.1 & ASSPS SCHOOL SAAS — CANONICAL DOCUMENT TEMPLATES (Frontend Service)
 *
 * Single source of truth for all visual document templates:
 * - Official Admission Form (A4 Portrait, navy/gold double border, bilingual header, photo box, signatures)
 * - Official Fee Voucher (A4 Landscape, 3 copies: Student Copy, Institute Copy, Bank Copy)
 */

import { CANONICAL_SCHOOL_IDENTITY } from './canonicalSchoolIdentity';

export const NOTICE_TEXT = "Please ensure that the fee is paid by the due date to avoid any late charges. Retain the receipt after making the payment for future reference. Payments can be made online or at the school's designated counters. For any questions or assistance, feel free to contact the school office.";

export function getTemplateTheme(templateId = 1) {
  let primaryColor = '#0a1628';
  let secondaryColor = '#c8991a';
  let headerBg = '#0a1628';
  let headerText = '#e8c87a';
  let schoolNameColor = '#0a1628';
  let tableHeaderBg = '#e0e0e0';
  let tableHeaderColor = '#000';
  let outerBorderColor = '#0a1628';
  let cardBg = '#fff';
  let fontFam = 'Arial, sans-serif';
  let stampStyle = 'border:2.5px solid rgba(150,60,60,0.25); color:rgba(150,60,60,0.28); font-weight:900;';

  if (templateId === 2) {
    primaryColor = '#1e1b4b';
    secondaryColor = '#b45309';
    headerBg = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
    headerText = '#fef08a';
    schoolNameColor = '#1e1b4b';
    tableHeaderBg = '#f1f5f9';
    tableHeaderColor = '#1e293b';
    outerBorderColor = '#312e81';
    fontFam = "'Georgia', serif";
    stampStyle = 'border:2.5px dashed rgba(220,38,38,0.38); color:rgba(220,38,38,0.42); font-weight:900; font-family:sans-serif;';
  } else if (templateId === 3) {
    primaryColor = '#333333';
    secondaryColor = '#666666';
    headerBg = '#f3f4f6';
    headerText = '#111111';
    schoolNameColor = '#111111';
    tableHeaderBg = '#f3f4f6';
    tableHeaderColor = '#111111';
    outerBorderColor = '#666666';
    fontFam = "'Courier New', Courier, monospace";
    stampStyle = 'border:1.5px solid #999; color:#999; font-style:italic; font-weight:900; font-family:sans-serif;';
  }
  return { primaryColor, secondaryColor, headerBg, headerText, schoolNameColor, tableHeaderBg, tableHeaderColor, outerBorderColor, cardBg, fontFam, stampStyle };
}

export function feeParts(challan = {}, discountOverride) {
  const monthly = Number(challan.monthly_fee ?? challan.amount ?? 0);
  const arrears = Number(challan.previous_arrears ?? challan.prev_month_fee ?? 0);
  const discount = Number(discountOverride ?? challan.discount ?? 0);
  const gross = Number(challan.gross_total ?? Math.max(0, monthly + arrears - discount));
  const paid = Number(challan.paid_amount ?? 0);
  const remaining = Number(challan.remaining_balance ?? Math.max(0, gross - paid));
  return { monthly, arrears, discount, gross, paid, remaining };
}

export function renderDynamicFeeRows(ch, theme) {
  if (ch.feeHeads && Array.isArray(ch.feeHeads)) {
    let rowsHtml = '';
    ch.feeHeads.forEach((head, index) => {
      const isEven = index % 2 === 0;
      rowsHtml += `
        <tr style="border-bottom:1px solid #e8e8e8; background:${isEven ? '#f7f7f7' : '#fff'};">
          <td style="padding:4px 6px; font-size:10.5px; color:#263238; font-weight:650;">${head.name}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px;">Rs. ${Number(head.amount || 0).toLocaleString()}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px;">0</td>
          <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px;">Rs. ${Number(head.amount || 0).toLocaleString()}</td>
        </tr>
      `;
    });

    if (ch.discount > 0) {
      rowsHtml += `
        <tr style="border-bottom:1px solid #e8e8e8; background:#fff;">
          <td style="padding:4px 6px; font-size:10.5px; color:#e74c3c; font-weight:700;">Discount</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#e74c3c;">—</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#e74c3c;">Rs. ${Number(ch.discount).toLocaleString()}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#e74c3c;">—</td>
          <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px; color:#e74c3c;">- Rs. ${Number(ch.discount).toLocaleString()}</td>
        </tr>
      `;
    }

    if (ch.lateFee > 0) {
      rowsHtml += `
        <tr style="border-bottom:1px solid #e8e8e8; background:#fff;">
          <td style="padding:4px 6px; font-size:10.5px; color:#ff8c00; font-weight:700;">Late Fee</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#ff8c00;">Rs. ${Number(ch.lateFee).toLocaleString()}</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#ff8c00;">—</td>
          <td style="text-align:center; padding:4px 3px; font-size:10.5px; color:#ff8c00;">—</td>
          <td style="text-align:center; padding:4px 3px; font-weight:800; font-size:10.5px; color:#ff8c00;">+ Rs. ${Number(ch.lateFee).toLocaleString()}</td>
        </tr>
      `;
    }

    rowsHtml += `
      <tr style="border-top:2px solid ${theme.primaryColor}; background:#e4e4e4; font-weight:800;">
        <td style="padding:4px 6px; font-size:11.5px; color:#111;">Net Total</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">—</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">—</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">—</td>
        <td style="text-align:center; padding:4px 3px; font-size:11.5px; color:#111;">Rs. ${Number(ch.total || 0).toLocaleString()}</td>
      </tr>
    `;
    return rowsHtml;
  } else {
    const { monthly: amt, arrears: prevFee, discount: disc, gross: net, paid: paidAmt } = feeParts(ch);
    const admFee = Number(ch.admission_fee || 0);
    const othFee = Number(ch.other_fee || 0);
    const hasPrev = prevFee > 0;
    const totalGross = amt + prevFee + admFee + othFee;
    const monthlyNet = Math.max(0, amt - disc);

    return `
      <tr style="border-bottom:1px solid #e8e8e8; background:#f7f7f7;">
        <td style="padding:4px 6px; font-size:10.5px; color:#263238;">Monthly Fee ${ch.month || ''} ${ch.year || ''}</td>
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
    `;
  }
}

/**
 * 1. Single Copy Fee Voucher HTML Renderer (Exact match to School SaaS)
 */
export function renderCanonicalFeeVoucherCopyHtml(ch, label, school = {}, templateId = 1) {
  const theme = getTemplateTheme(templateId);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const dueDateVal = ch.due_date || ch.dueDate;
  const dueDate = dueDateVal
    ? new Date(dueDateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : today;

  const sn = school?.name || school?.schoolName || CANONICAL_SCHOOL_IDENTITY.schoolName;
  const sa = school?.address || school?.schoolAddress || CANONICAL_SCHOOL_IDENTITY.address;
  const sl = school?.logo || school?.logoUrl || '';

  const grVal = ch.gr_number || ch.gr || '—';
  const nameVal = ch.name || ch.student || '—';
  const fatherVal = ch.father_name || ch.father || '—';
  const voucherNoVal = ch.challan_no || ch.voucherNo || ch.voucherNumber || '—';
  const classVal = ch.class || ch.className || '—';
  const sectionVal = ch.section || 'Blue';

  const { gross: net } = feeParts(ch);
  const netTotalVal = ch.total !== undefined ? ch.total : (ch.amountDue !== undefined ? ch.amountDue : net);
  const paidVal = (ch.status === 'paid' || ch.status === 'Paid') ? netTotalVal : (ch.paid_amount || 0);
  const remVal = (ch.status === 'paid' || ch.status === 'Paid') ? 0 : (ch.remaining_balance !== undefined ? ch.remaining_balance : netTotalVal);

  const logoImg = sl
    ? `<img src="${sl}" style="height:36px;width:36px;object-fit:contain;display:block">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:${theme.primaryColor};display:flex;align-items:center;justify-content:center;font-weight:900;color:${theme.secondaryColor};font-size:16px;font-family:sans-serif">A</div>`;

  const feeRows = renderDynamicFeeRows(ch, theme);

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

      <!-- Student Details Section -->
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

      <!-- Totals & Notes Sections -->
      <div style="display:flex; flex-direction:column; gap:3px; margin-bottom:4px;">
        <div style="display:flex; flex-direction:column; gap:2px; font-size:11.5px; font-weight:700; background:#f9f9f9; padding:4px 6px; border-radius:4px; border:1px solid #ddd;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#555;">Paid Amount:</span>
            <span style="color:${(ch.status === 'paid' || ch.status === 'Paid') ? '#27ae60' : '#333'}">Rs. ${paidVal.toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-top:1px solid #eee; padding-top:2px;">
            <span>Remaining:</span>
            <span style="color:${remVal === 0 ? '#27ae60' : '#c0392b'}">${remVal === 0 ? 'PAID' : 'Rs. ' + remVal.toLocaleString()}</span>
          </div>
        </div>

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
  `;
}

/**
 * 2. Full A4 Landscape 3-Copy Fee Voucher HTML Renderer (Exact match to School SaaS)
 */
export function renderCanonicalFeeVoucherHtml(challan, school = {}, options = {}) {
  const templateId = options.templateId || 1;
  const copies = options.copies || 3;
  const LABELS = ['Student Copy', 'Institute Copy', 'Bank Copy'].slice(0, copies);

  const printPageSize = 'A4 landscape';
  const printMargin = '2mm 3mm';
  const bodyDimensions = 'width:291mm; height:204mm; display:flex; flex-direction:row; gap:6px; box-sizing:border-box;';

  return `<!DOCTYPE html>
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
      <strong style="color:#C8991A; font-size:15px;">${school?.name || school?.schoolName || CANONICAL_SCHOOL_IDENTITY.schoolName}</strong>
      <span style="font-size:13px; color:#C0C8D8;">• Voucher: ${challan.challan_no || challan.name || 'Single Voucher'}</span>
    </div>
    <div style="display:flex; gap:10px;">
      <button onclick="window.print()" style="background:linear-gradient(135deg,#D9A813,#F2C43B); color:#071e34; font-weight:800; border:none; padding:8px 20px; border-radius:8px; cursor:pointer; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">ðŸ–¨ï¸ Print Voucher</button>
      <button onclick="window.close()" style="background:rgba(255,255,255,0.15); color:#fff; font-weight:600; border:1px solid rgba(255,255,255,0.2); padding:8px 14px; border-radius:8px; cursor:pointer; font-size:13px;">Close</button>
    </div>
  </div>

  <div style="${bodyDimensions}; margin: 0 auto; background:#fff;">
    ${LABELS.map((label, index) => `
      <div style="width:calc(33.33% - 4px); height:204mm; display:flex;">
        ${renderCanonicalFeeVoucherCopyHtml(challan, label, school, templateId)}
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
</html>`;
}

/**
 * 3. Official Institutional Admission Form HTML Renderer (Exact match to School SaaS)
 */
export function renderCanonicalAdmissionFormHtml(student, school = {}) {
  const sn = school.schoolName || school.name || CANONICAL_SCHOOL_IDENTITY.schoolName;
  const su = school.schoolUrdu || school.urduName || CANONICAL_SCHOOL_IDENTITY.urduName;
  const sa = school.address || school.location || CANONICAL_SCHOOL_IDENTITY.address;
  const sl = school.logo || school.photo || '';
  const showUrdu = school.showUrduHeader !== false;

  const logoHtml = sl
    ? `<img src="${sl}" style="height:85px;object-fit:contain;display:block;margin:0 auto 8px">`
    : `<div style="width:80px;height:80px;border-radius:50%;border:3px solid #071e34;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:28px;color:#071e34;background:#fff">A</div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admission Form - ${student.name || 'Candidate'}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
<style>
@page { size: A4 portrait; margin: 5mm; }
body{margin:0;padding:20px 40px;font-family:Arial,sans-serif;color:#000;line-height:1.6;background:#fff;}
@media print {
  body { padding: 10px 20px; }
  .no-print { display: none !important; }
}
.card{max-width:800px;margin:0 auto;border:2px solid #071e34;padding:30px;position:relative;min-height:270mm;box-sizing:border-box;}
.header{text-align:center;margin-bottom:25px;border-bottom:3px double #071e34;padding-bottom:15px}
.photo-box{position:absolute;right:30px;top:130px;width:120px;height:150px;border:1px solid #000;display:flex;align-items:center;justify-content:center;font-size:12px;background:#f9f9f9;text-align:center;}
h1{margin:10px 0 5px;font-size:24px;text-transform:uppercase;color:#071e34}
.urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:20px;direction:rtl;margin-bottom:8px}
.form-title{background:#071e34;color:#fff;padding:8px;text-align:center;font-weight:bold;font-size:18px;margin-bottom:25px;letter-spacing:2px}
.section{margin-bottom:22px}
.section-title{border-bottom:1px solid #071e34;font-weight:bold;margin-bottom:12px;color:#071e34;text-transform:uppercase;font-size:14px}
.row{display:flex;gap:20px;margin-bottom:12px}
.field{flex:1;border-bottom:1px solid #ddd;padding-bottom:4px}
.field label{font-size:11px;color:#666;display:block;font-weight:bold;text-transform:uppercase}
.field span{font-size:15px;font-weight:bold;color:#000}
.footer{margin-top:40px;display:flex;justify-content:space-between}
.sig{width:200px;text-align:center;border-top:1px solid #000;padding-top:8px;font-size:13px;font-weight:bold}
</style></head><body>
<div class="card">
<div class="header">
${logoHtml}
${showUrdu ? `<div class="urdu">${su}</div>` : ''}
<h1>${sn}</h1>
<div style="font-size:12px;color:#444">${sa}</div>
</div>

<div class="form-title">STUDENT ADMISSION FORM</div>

<div class="photo-box">
${student.photo ? `<img src="${student.photo}" style="width:100%;height:100%;object-fit:cover">` : 'Passport Size Photo'}
</div>

<div class="section">
<div class="section-title">Student Information</div>
<div class="row">
<div class="field"><label>Full Name</label><span>${student.name || '—'}</span></div>
<div class="field" style="max-width:200px"><label>GR Number</label><span>${student.gr_number || student.admissionNumber || '—'}</span></div>
</div>
<div class="row">
<div class="field"><label>Father / Guardian Name</label><span>${student.father_name || student.fatherName || '—'}</span></div>
<div class="field"><label>Date of Birth</label><span>${student.date_of_birth || student.dob || '—'}</span></div>
</div>
<div class="row">
<div class="field"><label>Class Admitted</label><span>${student.class || student.className || '—'}</span></div>
<div class="field"><label>Section</label><span>${student.section || 'Blue'}</span></div>
<div class="field"><label>Gender</label><span>${student.gender || 'Male'}</span></div>
</div>
</div>

<div class="section">
<div class="section-title">Contact & Address</div>
<div class="row">
<div class="field"><label>Parent Phone</label><span>${student.parent_phone || student.contact || '—'}</span></div>
<div class="field"><label>Address</label><span>${student.address || '—'}</span></div>
</div>
</div>

<div class="section" style="margin-top:30px">
<div class="section-title">Declaration</div>
<p style="font-size:12px;color:#333;text-align:justify">
I hereby declare that the information provided above is correct to the best of my knowledge.
I agree to abide by the rules and regulations of the institution as mentioned in the school policy.
I understand that the admission is subject to the verification of documents and clearance of dues.
</p>
</div>

<div class="footer">
<div class="sig">Parent / Guardian Signature</div>
<div class="sig">Principal / Office Incharge</div>
</div>

</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
}
