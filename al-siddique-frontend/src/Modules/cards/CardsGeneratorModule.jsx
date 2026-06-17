import { useState, useEffect } from 'react'
import { useStudentStore } from '../../services/useStudentStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import api from '../../services/api'
import QRCode from 'qrcode'

//  Constants 
// Removed hardcoded CLASSES and SECTIONS
const DEFAULT_SCHOOL_NAME = 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'

//  Barcode Generator (SVG inline) 
function genBarcode(text, color = '#000', bh = 22) {
 const str = (text || 'GR0000').toUpperCase().replace(/[^A-Z0-9.-]/g,'').slice(0,18)
 const rects = []
 let x = 0
 const bar = w => { rects.push(`<rect x="${x}" y="0" width="${w}" height="${bh}" fill="${color}"/>`); x += w }
 const gap = w => { x += w }
 bar(3); gap(1); bar(1); gap(1); bar(3); gap(3)
 for (const ch of str) {
 const v = ch.charCodeAt(0)
 for (let b = 7; b >= 0; b--) { bar((v >> b & 1) ? 3 : 1); gap(1) }
 gap(2)
 }
 bar(3); gap(1); bar(1); gap(1); bar(3)
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${bh}" preserveAspectRatio="none" style="display:block;width:100%;height:${bh}px">${rects.join('')}</svg>`
}

const ID_TEMPLATES = [
 { id:'corporate', label:'Executive Ivory', sub:'Warm ivory + navy credential', c1:'#FFFDF8', c2:'#B9965A' },
 { id:'university', label:'University Pro', sub:'Reference style orange photo rail', c1:'#13224A', c2:'#F97316' },
 { id:'executive', label:'Abstract Curve', sub:'Curved navy/orange profile', c1:'#0F1B3D', c2:'#FF7A00' },
 { id:'school', label:'Prestige Badge', sub:'Clean crest layout + readable data', c1:'#F8FAFC', c2:'#0F1B3D' },
 { id:'minimal', label:'Modern White', sub:'Clean white with bold accents', c1:'#FFFFFF', c2:'#13224A' },
]

const RESULT_TEMPLATES = [
 { id:'royal', label:'Royal Academic', sub:'Ivory - burgundy line - antique gold', c1:'#FFF9EF', c2:'#B9965A' },
 { id:'digital', label:'Modern Digital', sub:'Pearl - slate - calm teal data-viz', c1:'#F4F8FA', c2:'#5EA8A7' },
 { id:'classic', label:'Classic Formal', sub:'Warm paper - royal blue accents', c1:'#FAF7F0', c2:'#527AA3' },
 { id:'vibrant', label:'Vibrant Excellence', sub:'Soft coral - mint - sunshine accents', c1:'#FFF6F1', c2:'#8BCFC3' },
]

const CARD_SIZES = [
 { id:'cr80', label:'CR80 Standard', desc:'85.6 x 54 mm', note:'Enterprise ID card standard', baseW:85.6, baseH:54 },
]

const C = {
 bg:'#071e34', card:'rgba(11,44,77,0.92)', gold:'#C8991A', goldL:'#e8b420',
 silver:'#C0C8D8', muted:'#8892A4', green:'#30D158', red:'#FF375F',
 blue:'#0A84FF', border:'rgba(148,163,184,0.18)',
}

const PIE_PALETTE = ['#FF6B35', '#4ECDC4', '#F7C948', '#FF375F', '#2E7D32', '#673AB7', '#1976D2', '#E91E63', '#009688', '#FF9800']

//  SVG Donut Chart 
function buildDonutSVG(subjects, marksBySubject, totalPerSub, bgColor = '#fff') {
 const outerR = 88, innerR = 52, cx = 100, cy = 100
 const vals = subjects.map(s => Math.max(0, Number(marksBySubject[s] || 0)))
 const total = vals.reduce((a, b) => a + b, 0)
 const maxTotal = subjects.length * totalPerSub
 const overallPct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0

 if (!total) return `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#eee"/><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${bgColor}"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="#aaa">N/A</text></svg>`

 let angle = -Math.PI / 2
 let paths = ''
 vals.forEach((val, i) => {
 if (!val) return
 const sweep = (val / total) * 2 * Math.PI
 const x1 = cx + outerR * Math.cos(angle), y1 = cy + outerR * Math.sin(angle)
 const xi1 = cx + innerR * Math.cos(angle), yi1 = cy + innerR * Math.sin(angle)
 angle += sweep
 const x2 = cx + outerR * Math.cos(angle), y2 = cy + outerR * Math.sin(angle)
 const xi2 = cx + innerR * Math.cos(angle), yi2 = cy + innerR * Math.sin(angle)
 const large = sweep > Math.PI ? 1 : 0
 const col = PIE_PALETTE[i % PIE_PALETTE.length]
 paths += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${outerR},${outerR} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi2.toFixed(1)},${yi2.toFixed(1)} A${innerR},${innerR} 0 ${large},0 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z" fill="${col}" stroke="${bgColor}" stroke-width="2"/>`
 })

 return `<svg width="200" height="200" viewBox="0 0 200 200">
 ${paths}
 <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${bgColor}"/>
 <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="22" font-weight="900" fill="#333" font-family="Arial">${overallPct}%</text>
 <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="11" fill="#666" font-family="Arial">Overall</text>
 <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="10" fill="#999" font-family="Arial">${total}/${maxTotal}</text>
 </svg>`
}

//  HTML Bar Chart 
function buildColumnsHtml(subjects, marksBySubject, totalPerSub, style = 'light') {
 const textColor = '#334155'
 const gridColor = '#E5EAF0'
 return `<div style="height:190px;display:flex;align-items:flex-end;gap:10px;padding:16px 10px 8px;border-radius:12px;background:linear-gradient(180deg,transparent 0,transparent 24%,${gridColor} 25%,transparent 26%,transparent 49%,${gridColor} 50%,transparent 51%,transparent 74%,${gridColor} 75%,transparent 76%)">
 ${subjects.map((sub, i) => {
 const val = Number(marksBySubject[sub] || 0)
 const pct = totalPerSub > 0 ? Math.min(100, Math.round((val / totalPerSub) * 100)) : 0
 const col = PIE_PALETTE[i % PIE_PALETTE.length]
 return `<div style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px">
 <div style="font-size:10px;font-weight:800;color:${col}">${pct}%</div>
 <div style="width:70%;height:${Math.max(8, pct)}%;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,${col},${col}cc);box-shadow:0 5px 14px ${col}33"></div>
 <div style="font-size:9px;font-weight:700;color:${textColor};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52px">${sub}</div>
 </div>`
 }).join('')}
 </div>`
}

//  ID Card HTML Generators 
function esc(v) {
  return String(v || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]))
}

function imageValue(value) {
 if (!value) return ''
 if (typeof value === 'string') return value
 if (typeof value === 'object') {
 return value.url || value.src || value.path || value.preview || value.file_url || value.secure_url || ''
 }
 return ''
}

function normalizeAssetUrl(value) {
 const raw = imageValue(value).trim()
 if (!raw) return ''
 if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw
 try {
 return new URL(raw, window.location.origin).href
 } catch {
 return raw
 }
}

function firstAsset(...values) {
 for (const value of values) {
 const src = normalizeAssetUrl(value)
 if (src) return src
 }
 return ''
}

function normalizeIdOptions(opts = {}) {
 if (typeof opts === 'string') return { size: opts, orientation: opts === 'cr80p' ? 'portrait' : 'landscape', pageOrientation: 'portrait', template: 'corporate', cardOptions: {} }
 return {
 size: opts.size || 'cr80',
 orientation: opts.orientation || (opts.size === 'cr80p' ? 'portrait' : 'portrait'),
 pageOrientation: opts.pageOrientation || 'portrait',
 template: opts.template || 'corporate',
 doubleSided: Boolean(opts.doubleSided),
 cardOptions: {
 primaryColor: opts.cardOptions?.primaryColor || '#0B1F3A',
 secondaryColor: opts.cardOptions?.secondaryColor || '#C8D2E3',
 textColor: opts.cardOptions?.textColor || '#FFFFFF',
 borderRadius: Number(opts.cardOptions?.borderRadius ?? 4),
 photoShape: opts.cardOptions?.photoShape || 'rounded',
 showBarcode: true,
 showQr: opts.cardOptions?.showQr === true,
 showSignature: opts.cardOptions?.showSignature !== false,
 backgroundPattern: opts.cardOptions?.backgroundPattern !== false,
 },
 cardsPerPage: opts.cardsPerPage ? Number(opts.cardsPerPage) : null,
 }
}

function cardDims(opts) {
 const o = normalizeIdOptions(opts)
 const size = CARD_SIZES.find(s => s.id === o.size) || CARD_SIZES[0]
 return o.orientation === 'portrait'
 ? { w: size.baseH, h: size.baseW, label: `${size.baseH} x ${size.baseW} mm` }
 : { w: size.baseW, h: size.baseH, label: `${size.baseW} x ${size.baseH} mm` }
}

function a4Layout(opts) {
 const o = normalizeIdOptions(opts)
 const { w, h } = cardDims(o)
 const pageW = o.pageOrientation === 'landscape' ? 297 : 210
 const pageH = o.pageOrientation === 'landscape' ? 210 : 297
 const margin = 8
 const gap = 3

 // Explicit col×row layouts for each desired cardsPerPage count
 // For CR80 portrait (54×85.6mm) on A4 portrait (210×297mm):
 // 3 cols → 3×54=162mm + gaps+margin OK; 2 rows → 2×85.6=171.2mm + margins OK
 // 8 = 2 cols × 4 rows: 2×54=108mm wide, 4×85.6=342.4mm — too tall!
 // Better 8 = 4 cols × 2 rows on landscape, OR 2×4 on portrait with smaller cards
 // Use 2×4 for portrait (342mm too tall), so force 4×2 landscape OR just allow 6 max portrait
 // Safe portrait layouts (A4 210×297, card 54×85.6):
 // max cols = floor((210-16+3)/(54+3)) = floor(197/57) = 3
 // max rows = floor((297-16+3)/(85.6+3)) = floor(284/88.6) = 3
 // max = 3×3 = 9
 const LAYOUTS = {
 1: [1, 1],
 2: [2, 1],
 3: [3, 1],
 4: [2, 2],
 6: [3, 2],
 8: [3, 3], // treated as 9 slots, 8 will fill 8 of them
 9: [3, 3],
 }

 let cols, rows
 const requested = Number(o.cardsPerPage)
 if (requested && LAYOUTS[requested]) {
 const [c, r] = LAYOUTS[requested]
 const isPortraitCard = h >= w
 const isPortraitPage = pageH >= pageW
 if (isPortraitCard === isPortraitPage) {
 cols = c; rows = r
 } else {
 cols = r; rows = c
 }
 } else {
 // Auto: fit as many as possible
 const usableW = pageW - margin * 2
 const usableH = pageH - margin * 2
 cols = Math.max(1, Math.floor((usableW + gap) / (w + gap)))
 rows = Math.max(1, Math.floor((usableH + gap) / (h + gap)))
 }

 return { pageW, pageH, margin, gap, cols, rows, perPage: cols * rows, cardW: w, cardH: h }
}


function initials(name) {
 return String(name || 'ID').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'ID'
}

function schoolNameLines(name) {
 const clean = String(name || DEFAULT_SCHOOL_NAME).toUpperCase().replace(/\s+/g, ' ').trim()
 if (clean.includes('SCHOLARS PUBLIC SCHOOL')) {
 return ['AL SIDDIQUE', 'SCHOLARS PUBLIC SCHOOL']
 }
 const parts = clean.split(' ')
 const mid = Math.max(1, Math.ceil(parts.length / 2))
 return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')].filter(Boolean)
}

function schoolNameHtml(name) {
 const [top, bottom = ''] = schoolNameLines(name)
 return `<span class="brand-line brand-line-main">${esc(top)}</span>${bottom ? `<span class="brand-line brand-line-sub">${esc(bottom)}</span>` : ''}`
}

function personData(item, kind, school) {
 const isEmp = kind === 'employee'
 const id = isEmp ? (item.emp_id || `EMP-${String(item.id || '').padStart(3, '0')}`) : (item.gr_number || item.gr || String(item.id || 'GR-0000'))
 return {
 kindLabel: isEmp ? 'STAFF ID' : 'STUDENT ID',
 idLabel: isEmp ? 'Employee ID' : 'Roll / GR No',
 name: item.name || (isEmp ? 'Employee Name' : 'Student Name'),
 father: item.father_name || item.father || 'Father Name',
 group: isEmp ? (item.department || 'Department') : (item.class || 'Class'),
 groupLabel: isEmp ? 'Department' : 'Class',
 role: isEmp ? (item.designation || 'Staff Member') : `Section ${item.section || '-'}`,
 phone: item.phone || item.parent_phone || item.contact || item.whatsapp || '-',
 address: item.address || school.address || '-',
 blood: item.blood_group || item.bloodGroup || '-',
 session: item.session || '2026-27',
 validity: item.valid_till || item.expiryDate || '31-03-2027',
 issue: item.issueDate || new Date().toLocaleDateString('en-GB'),
 photo: firstAsset(
 item.photo,
 item.image,
 item.profile_photo,
 item.profilePhoto,
 item.profileImage,
 item.profile_image,
 item.photo_url,
 item.photoUrl,
 item.image_url,
 item.imageUrl,
 item.avatar,
 item.avatar_url,
 item.picture,
 item.picture_url,
 item.employee_photo,
 item.employeePhoto,
 item.staff_photo,
 item.staffPhoto,
 item.thumbnail
 ),
 id,
 }
}

function qrBox(qrUrl, data, opts) {
 if (!opts.cardOptions.showQr) return ''
 return qrUrl
 ? `<img class="id-qr" src="${qrUrl}" alt="QR" />`
 : `<div class="id-qr qr-fallback">QR</div>`
}

function photoBox(data, opts) {
 const cls = opts.cardOptions.photoShape === 'circle' ? 'photo circle' : 'photo'
 return data.photo
 ? `<img class="${cls}" src="${esc(data.photo)}" alt="Photo" />`
 : `<div class="${cls} photo-fallback">${esc(initials(data.name))}</div>`
}

function logoBox(school) {
 const sN = (school.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase()
 const logo = normalizeAssetUrl(school.logo)
 return logo
 ? `<img class="school-logo" src="${esc(logo)}" alt="Logo" />`
 : `<div class="school-logo logo-fallback">${esc(sN.charAt(0))}</div>`
}

function chipHtml() {
 return `<div class="smart-chip"><span></span><span></span><span></span><span></span></div>`
}

function renderIdCard(item, kind, side, template, school, optsArg = {}, qrUrl = '') {
 const opts = normalizeIdOptions({ ...optsArg, template })
 const dim = cardDims(opts)
 const d = personData(item, kind, school)
 const schoolName = (school.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase()
 const brandName = schoolNameHtml(schoolName)
 const style = `--card-w:${dim.w}mm;--card-h:${dim.h}mm;--primary:${opts.cardOptions.primaryColor};--secondary:${opts.cardOptions.secondaryColor};--text:${opts.cardOptions.textColor};--radius:${opts.cardOptions.borderRadius}mm;`
 const barcode = `<div class="barcode-wrap">${genBarcode(d.id, '#102A4C', 20)}</div>`
 const qr = qrBox(qrUrl, d, opts)
 const principalSignature = normalizeAssetUrl(school.principalSignature)
 const signature = opts.cardOptions.showSignature ? `<div class="signature">${principalSignature ? `<img src="${esc(principalSignature)}" alt="Principal Signature" />` : '<span></span>'}<b>Principal Signature</b></div>` : ''
 const pattern = opts.cardOptions.backgroundPattern ? ' with-pattern' : ''

 if (side === 'back') {
 return `<div class="id-card ${opts.orientation} tpl-${template} back${pattern}" style="${style}">
 <div class="design-arc arc-one"></div>
 <div class="design-arc arc-two"></div>
 <div class="design-ribbon"></div>
 <div class="security-strip"></div>
 <div class="back-head" style="background:#13224A; color:#fff; padding:1.8mm 2.5mm; display:flex; align-items:center; gap:2.5mm; height:18mm; flex-shrink:0;">
 ${logoBox(school)}
 <div class="school-block" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
 ${schoolNameHtml(school.name || school.schoolName || DEFAULT_SCHOOL_NAME)}
 </div>
 </div>
 <div class="terms" style="padding:4mm 5mm 0;">
 <h4 style="font-size:3mm; margin-bottom:1.5mm; color:#13224A; border-bottom:1px solid #ddd; padding-bottom:1mm;">Terms & Conditions</h4>
 <ul style="font-size:2.2mm; line-height:1.4; color:#555; padding-left:3.5mm;">
 <li>This card is school property and must be carried on campus.</li>
 <li>If found, please return it to the school office immediately.</li>
 <li>Misuse must be reported to administration.</li>
 </ul>
 </div>
 <div class="back-grid" style="margin:auto 0; padding:0 5mm;">
 <div><label>Emergency</label><strong>${esc(d.phone)}</strong></div>
 <div><label>Issue Date</label><strong>${esc(d.issue)}</strong></div>
 <div><label>Valid Until</label><strong>${esc(d.validity)}</strong></div>
 <div><label>Blood Group</label><strong>${esc(d.blood)}</strong></div>
 </div>
 <div class="back-bottom" style="margin-top:auto; padding:2mm 5mm 4mm; border-top:1px solid #eee; display:flex; align-items:flex-end; justify-content:space-between; gap:3mm; position:relative;">
 <div class="contact-lines" style="flex:1;">
 <b style="font-size:2.2mm; display:block; margin-bottom:1mm; color:#333;">${esc(school.address || d.address)}</b>
 <span style="font-size:2.1mm; color:#666;">${esc(school.phone || d.phone)}</span>
 </div>
 <div style="flex-shrink:0; width:15mm;">${qr || barcode}</div>
 ${signature ? `<div style="position:absolute; right:5mm; bottom:14mm; transform:scale(0.8); transform-origin:bottom right;">${signature}</div>` : ''}
 </div>
 </div>`
 }

 return `<div class="id-card ${opts.orientation} tpl-${template} front${pattern}" style="${style}">
 <div class="design-arc arc-one"></div>
 <div class="design-arc arc-two"></div>
 <div class="design-ribbon"></div>
 <div class="hologram"></div>
 <div class="id-topline"></div>
 <header>
 ${logoBox(school)}
 <div class="school-block"><strong>${brandName}</strong></div>
 </header>
 <main>
 <section class="photo-section">
 ${photoBox(d, opts)}
 <div class="grade-badge">${esc(d.group)}</div>
 </section>
 <section class="data-section">
 <h3>${esc(d.name)}</h3>
 <p>${esc(d.role)}</p>
 <div class="field-grid">
 <div><label>${esc(d.idLabel)}</label><b>${esc(d.id)}</b></div>
 <div><label>${esc(d.groupLabel)}</label><b>${esc(d.group)}</b></div>
 <div><label>Father Name</label><b>${esc(d.father)}</b></div>
 <div><label>Contact</label><b>${esc(d.phone)}</b></div>
 <div><label>Session</label><b>${esc(d.session)}</b></div>
 <div><label>Blood</label><b>${esc(d.blood)}</b></div>
 </div>
 </section>
 </main>
 <footer>
 ${chipHtml()}
 ${barcode}
 ${qr}
 </footer>
 </div>`
}

function buildIdFront(s, tpl, school, opts = {}, qrUrl = '') {
 return renderIdCard(s, 'student', 'front', tpl, school, opts, qrUrl)
}

function buildIdBack(s, tpl, school, opts = {}, qrUrl = '') {
 return renderIdCard(s, 'student', 'back', tpl, school, opts, qrUrl)
}

function buildEmployeeCardFront(emp, tpl, school, opts = {}, qrUrl = '') {
 return renderIdCard(emp, 'employee', 'front', tpl, school, opts, qrUrl)
}

function buildEmployeeCardBack(emp, tpl, school, opts = {}, qrUrl = '') {
 return renderIdCard(emp, 'employee', 'back', tpl, school, opts, qrUrl)
}

function idCardPrintCss(opts) {
 const o = normalizeIdOptions(opts)
 const l = a4Layout(o)
 return `
 *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-rendering:geometricPrecision}
 html,body{background:#eef2f7;font-family:'DM Sans',Arial,sans-serif;color:#071e34}
 @page{size:A4 ${o.pageOrientation};margin:0}
 @media print{body{background:white}.no-print{display:none!important}.print-page{break-after:page;box-shadow:none!important;margin:0!important}.print-page:last-child{break-after:auto}}
 .no-print{padding:12px 20px;background:#071e34;border-bottom:2px solid #C8991A;display:flex;gap:16px;align-items:center;position:sticky;top:0;z-index:10}
 .print-page{width:${l.pageW}mm;height:${l.pageH}mm;padding:${l.margin}mm;background:white;display:grid;grid-template-columns:repeat(${l.cols},${l.cardW}mm);grid-template-rows:repeat(${l.rows},${l.cardH}mm);gap:${l.gap}mm;align-content:center;justify-content:center;box-shadow:0 12px 34px rgba(15,23,42,.18);margin:12px auto;overflow:hidden}
 .slot{width:${l.cardW}mm;height:${l.cardH}mm;display:flex;align-items:center;justify-content:center;break-inside:avoid;page-break-inside:avoid}

 /*  BASE CARD  */
 .id-card{width:var(--card-w);height:var(--card-h);border-radius:var(--radius);overflow:hidden;position:relative;font-family:'DM Sans',Arial,sans-serif;display:flex;flex-direction:column;break-inside:avoid;background:#fff;border:.3mm solid #B8C8D8;box-shadow:0 2mm 8mm rgba(15,23,42,.28),inset 0 .25mm 0 rgba(255,255,255,.7)}
 .id-card::after{content:"";position:absolute;inset:.5mm;border-radius:calc(var(--radius) - .5mm);border:.15mm solid rgba(255,255,255,.45);pointer-events:none;z-index:8}
 .design-arc,.design-ribbon,.hologram,.id-topline,.security-strip{position:absolute;pointer-events:none}
 .id-card.front header,.id-card.front main,.id-card.front footer{position:relative;z-index:4}
 .id-card.back>*:not(.design-arc):not(.design-ribbon){position:relative;z-index:4}
 .smart-chip,.hologram{display:none}

 /*  UNIVERSAL HEADER (all templates) 
 18mm tall | navy bg | logo LEFT (fixed 12mm) | school name CENTERED in remaining space */
 .id-card.front header{
 height:18mm;flex-shrink:0;
 display:flex;align-items:center;gap:2.5mm;
 padding:1.8mm 2.5mm;
 background:#13224A;
 z-index:6;
 }
 .school-logo{
 width:12mm;height:12mm;
 flex:none;border-radius:50%;
 background:white;padding:.55mm;
 border:.35mm solid rgba(255,200,80,.7);
 object-fit:contain;
 box-shadow:0 .8mm 2mm rgba(0,0,0,.35),0 0 0 .5mm rgba(255,200,80,.25);
 flex-shrink:0;
 }
 .logo-fallback{display:flex;align-items:center;justify-content:center;font-size:5mm;font-weight:900;color:#13224A}
 .school-block{
 flex:1;min-width:0;
 display:flex;flex-direction:column;
 align-items:center;justify-content:center;
 text-align:center;
 }
 .school-block small{display:none}
 .id-card.front header em{display:none}
 .brand-line{display:block;text-transform:uppercase;font-weight:950;line-height:1.1;letter-spacing:.22mm}
 .brand-line-main{
 font-size:3.2mm;
 color:#FFCD60;
 letter-spacing:.28mm;
 text-shadow:0 .3mm .8mm rgba(0,0,0,.4);
 }
 .brand-line-sub{
 font-size:2.1mm;
 color:rgba(255,255,255,.92);
 letter-spacing:.14mm;
 margin-top:.35mm;
 font-weight:800;
 }

 /*  SHARED PHOTO  */
 .photo{object-fit:cover;background:#E8EEF8}
 .photo-fallback{display:flex;align-items:center;justify-content:center;font-weight:900;font-size:7mm;color:#13224A;background:linear-gradient(145deg,#E8EEF8,#F0F4FB)}

 /*  GRADE BADGE  */
 .grade-badge{font-size:2mm;font-weight:900;border-radius:99mm;padding:.8mm 2mm;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:30mm;background:#FF7900;color:#fff;border:.25mm solid rgba(255,255,255,.5);box-shadow:0 .6mm 1.5mm rgba(0,0,0,.25);display:inline-block;margin-top:1.2mm}

 /*  SHARED DATA SECTION  */
 .data-section h3{font-size:3.6mm;font-weight:950;line-height:1.05;margin-bottom:.5mm;color:#13224A}
 .data-section p{font-size:2.1mm;margin-bottom:1.2mm;color:#556070;font-weight:700}
 .field-grid{display:grid;gap:.9mm}
 .field-grid div{background:rgba(255,255,255,.94);border:.18mm solid #dde4ee;border-radius:1.3mm;padding:.7mm .9mm;min-width:0;box-shadow:0 .4mm 1mm rgba(15,23,42,.07)}
 .field-grid label{display:block;font-size:1.35mm;text-transform:uppercase;font-weight:900;letter-spacing:.1mm;color:#6070A0;margin-bottom:.25mm;line-height:1}
 .field-grid b{display:block;font-size:1.9mm;font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0F172A}

 /*  SHARED FOOTER (absolute, always at bottom)  */
 .id-card.front footer{position:absolute;left:3mm;right:3mm;bottom:2mm;height:5.5mm;display:flex;align-items:center;gap:1.5mm;padding:0;background:transparent;z-index:7;border:none}
 .barcode-wrap{display:block;flex:1;min-width:0;height:5mm;padding:.4mm .7mm;border-radius:.9mm;background:rgba(255,255,255,.96);border:.18mm solid rgba(19,34,74,.2);overflow:hidden}
 .barcode-wrap svg{height:4mm!important;width:100%!important}
 .id-qr{width:6mm;height:6mm;flex:none;object-fit:contain;background:white;border:.2mm solid #13224A;border-radius:.8mm;padding:.3mm}
 .qr-fallback{display:flex;align-items:center;justify-content:center;color:#0B1F3A;font-size:1.8mm;font-weight:900}

 /*  BACK CARD  */
 .id-card.back{background:#fff;color:#16213F}
 .security-strip{height:5mm;flex-shrink:0;background:#13224A;border-bottom:.8mm solid #FF7900}
 .back-head{display:flex;align-items:center;gap:2.5mm;padding:1.8mm 2.5mm;background:#13224A;flex-shrink:0;height:18mm}
 .back-head .school-logo{width:12mm!important;height:12mm!important;border:.35mm solid rgba(255,200,80,.7)!important;background:white!important;flex-shrink:0}
 .back-head .school-block{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
 .back-head .brand-line-main{color:#FFCD60;font-size:3mm}
 .back-head .brand-line-sub{color:#fff;font-size:2mm}
 .terms{padding:2mm 5mm 1mm}
 .terms h4{font-size:3.2mm;font-weight:800;color:#13224A;margin-bottom:1mm;text-transform:uppercase;letter-spacing:.3mm;border-bottom:1px solid #eee;padding-bottom:.5mm}
 .terms ul{padding-left:4mm;color:#475569;font-size:2.4mm;line-height:1.4}
 .back-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm;padding:0 5mm;margin:2mm 0}
 .back-grid label{display:block;font-size:1.8mm;font-weight:700;color:#94A3B8;text-transform:uppercase;margin-bottom:.3mm}
 .back-grid strong{display:block;font-size:2.4mm;color:#1E293B;font-weight:800}
 .back-bottom{margin-top:auto;display:flex;align-items:center;gap:2mm;padding:1.8mm 3.5mm}
 .contact-lines{flex:1;min-width:0}
 .contact-lines b,.contact-lines span{display:block;font-size:1.9mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .contact-lines span{opacity:.65;margin-top:.5mm}
 .signature{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm}
 .signature img{height:7.5mm;width:auto;mix-blend-mode:multiply;filter:contrast(1.2)}
 .signature b{font-size:1.8mm;color:#64748B;text-transform:uppercase;letter-spacing:.4mm}
 .signature span{height:6mm;width:15mm;border-bottom:.2mm solid #CBD5E1}

 /* ============================================================
 TPL 1: CORPORATE — Executive Ivory
 Navy header (full width) | Left orange photo rail | Right data
 ============================================================ */
 .tpl-corporate.front{background:linear-gradient(180deg,#FFFDF8,#F5EFE5);border-color:#D8C6A4}
 .tpl-corporate.front header{background:linear-gradient(135deg,#13224A,#1C3368)}
 .tpl-corporate.front .id-topline{left:0;right:0;top:0;height:1mm;background:#FF7900;z-index:9}
 .tpl-corporate.front .design-ribbon{left:0;right:0;bottom:0;height:4.5mm;background:#13224A;border-top:.6mm solid #B9965A;z-index:2}
 .tpl-corporate.front main{flex:1;display:grid;grid-template-columns:15mm 1fr;gap:0;padding:0 2.5mm 7mm 0;overflow:hidden}
 .tpl-corporate.front .photo-section{background:linear-gradient(180deg,#FF7900 0%,#E55A00 100%);display:flex;flex-direction:column;align-items:center;padding:2.5mm 1mm;gap:1.5mm}
 .tpl-corporate.front .photo{width:13mm!important;height:16mm!important;border-radius:2mm!important;border:.7mm solid rgba(255,255,255,.9)!important;box-shadow:0 1mm 2.5mm rgba(0,0,0,.3)}
 .tpl-corporate.front .photo-fallback{width:13mm!important;height:16mm!important;border-radius:2mm!important;font-size:4.5mm!important;background:#fff!important;color:#E55A00!important}
 .tpl-corporate.front .grade-badge{font-size:1.6mm!important;padding:.6mm 1.2mm!important;max-width:13mm;background:#13224A!important;border-color:rgba(255,255,255,.4)!important}
 .tpl-corporate.front .data-section{padding:2.5mm 0 0 2.5mm;display:flex;flex-direction:column}
 .tpl-corporate.front .data-section h3{font-size:3.2mm;color:#13224A;text-align:left}
 .tpl-corporate.front .data-section p{font-size:1.85mm;text-align:left;color:#556070}
 .tpl-corporate.front .field-grid{grid-template-columns:1fr;gap:.7mm;flex:1}
 .tpl-corporate.front .field-grid div{background:rgba(255,253,248,.96);border-color:#E0CCA8}
 .tpl-corporate.front footer{left:15.5mm!important;right:2.5mm!important;bottom:5.5mm!important;height:5mm!important}

 /* ============================================================
 TPL 2: UNIVERSITY — University Pro
 Navy header (full width) | Left orange rail + photo | Right data
 ============================================================ */
 .tpl-university.front{background:#FFFFFF;border-color:#C0D0E0}
 .tpl-university.front header{background:linear-gradient(135deg,#13224A,#1C3368)}
 .tpl-university.front .id-topline{left:0;right:0;top:0;height:1mm;background:#FF7900;z-index:9}
 .tpl-university.front main{flex:1;display:grid;grid-template-columns:16mm 1fr;gap:0;padding:0 2.5mm 7mm 0;overflow:hidden}
 .tpl-university.front .photo-section{background:linear-gradient(180deg,#FF7900 0%,#CC4400 100%);display:flex;flex-direction:column;align-items:center;padding:2.5mm 1mm;gap:1.5mm}
 .tpl-university.front .photo{width:14mm!important;height:17mm!important;border-radius:1.8mm!important;border:.7mm solid rgba(255,255,255,.9)!important;box-shadow:0 1mm 2.5mm rgba(0,0,0,.3)}
 .tpl-university.front .photo-fallback{width:14mm!important;height:17mm!important;border-radius:1.8mm!important;font-size:5mm!important;background:#fff!important;color:#CC4400!important}
 .tpl-university.front .grade-badge{font-size:1.6mm!important;padding:.6mm 1.2mm!important;max-width:14mm;background:#13224A!important;border-color:rgba(255,255,255,.4)!important}
 .tpl-university.front .data-section{padding:2.5mm 0 0 2.5mm;display:flex;flex-direction:column}
 .tpl-university.front .data-section h3{font-size:3.2mm;color:#13224A;text-align:left}
 .tpl-university.front .data-section p{font-size:1.85mm;text-align:left;color:#556070}
 .tpl-university.front .field-grid{grid-template-columns:1fr;gap:.7mm;flex:1}
 .tpl-university.front footer{left:17mm!important;right:2.5mm!important;bottom:1.5mm!important}
 .tpl-university.back{background:#fff;color:#13224A}

 /* ============================================================
 TPL 3: EXECUTIVE — Abstract Curve
 Navy arcs in top-left | Header full-width | Centered circle photo
 THEN name + role BELOW photo (no overlap) | compact field grid
 ============================================================ */
 .tpl-executive.front{background:#fff;border-color:#C0CDD8}
 .tpl-executive.front .arc-one{left:-22mm;top:-30mm;width:72mm;height:64mm;border-radius:50%;background:#13224A;z-index:0}
 .tpl-executive.front .arc-two{left:-12mm;top:-14mm;width:58mm;height:54mm;border-radius:50%;border:2.5mm solid #FF7900;border-right-color:transparent;border-bottom-color:transparent;transform:rotate(-18deg);z-index:1}
 .tpl-executive.front header{background:transparent;height:18mm;z-index:6;padding:1.8mm 2.5mm}
 .tpl-executive.front .school-logo{border-color:rgba(255,200,80,.9)!important;background:rgba(255,255,255,.95)!important;z-index:7}
 .tpl-executive.front .school-block{z-index:7}
 .tpl-executive.front main{
 flex:1;display:flex;flex-direction:column;align-items:center;
 padding:1.5mm 3.5mm 7.5mm;gap:0;overflow:hidden;
 }
 .tpl-executive.front .photo-section{
 display:flex;flex-direction:column;align-items:center;gap:0;
 margin-bottom:1.5mm;
 }
 .tpl-executive.front .photo{
 width:24mm!important;height:24mm!important;
 border-radius:50%!important;
 border:1.8mm solid #13224A!important;
 box-shadow:0 1.5mm 4mm rgba(15,23,42,.35);
 }
 .tpl-executive.front .photo-fallback{width:24mm!important;height:24mm!important;border-radius:50%!important;font-size:8mm!important;color:#13224A!important;background:#E8EEF8!important}
 .tpl-executive.front .grade-badge{font-size:1.8mm!important;margin-top:1mm;background:#FF7900!important;color:#fff!important}
 .tpl-executive.front .data-section{
 width:100%;
 background:rgba(255,255,255,.97);
 border:.2mm solid #dde4ee;border-radius:2mm;
 padding:1.8mm 2.5mm;
 box-shadow:0 .8mm 2.5mm rgba(15,23,42,.1);
 flex:1;display:flex;flex-direction:column;
 }
 .tpl-executive.front .data-section h3{text-align:center;color:#13224A;font-size:3.4mm}
 .tpl-executive.front .data-section p{text-align:center;color:#556070;font-size:2mm;margin-bottom:1mm}
 .tpl-executive.front .field-grid{grid-template-columns:1fr 1fr;gap:.8mm;flex:1}
 .tpl-executive.front footer{left:3mm!important;right:3mm!important;bottom:2mm!important}
 .tpl-executive.back .arc-one{right:-22mm;top:-28mm;width:68mm;height:56mm;border-radius:50%;background:#13224A}
 .tpl-executive.back .arc-two{left:-14mm;bottom:-14mm;width:58mm;height:30mm;border-radius:50% 50% 0 0;background:#FF7900}

 /* ============================================================
 TPL 4: SCHOOL — Prestige Badge
 Navy header | Centered circle photo | White data panel below
 ============================================================ */
 .tpl-school.front{background:linear-gradient(180deg,#F8FAFC,#fff);border-color:#C0CDD8}
 .tpl-school.front .arc-one{right:-15mm;top:-15mm;width:38mm;height:38mm;border-radius:50%;background:#13224A;z-index:0}
 .tpl-school.front .arc-two{left:-12mm;bottom:-14mm;width:40mm;height:40mm;border-radius:50%;border:2mm solid #B9965A;background:transparent;z-index:1}
 .tpl-school.front header{background:linear-gradient(135deg,#13224A,#1C3368);z-index:6}
 .tpl-school.front .school-logo{border-color:rgba(185,150,90,.8)!important}
 .tpl-school.front main{
 flex:1;display:flex;flex-direction:column;align-items:center;
 padding:2mm 3.5mm 7.5mm;gap:0;overflow:hidden;
 }
 .tpl-school.front .photo-section{
 display:flex;flex-direction:column;align-items:center;gap:0;
 margin-bottom:1.5mm;
 }
 .tpl-school.front .photo{
 width:24mm!important;height:24mm!important;
 border-radius:50%!important;border:.9mm solid #B9965A!important;
 box-shadow:0 1.5mm 4mm rgba(15,23,42,.28);
 }
 .tpl-school.front .photo-fallback{width:24mm!important;height:24mm!important;border-radius:50%!important;font-size:8mm!important;color:#13224A!important;background:#E8EEF8!important}
 .tpl-school.front .grade-badge{font-size:1.8mm!important;margin-top:1mm;background:#13224A!important;color:#fff!important;border-color:rgba(185,150,90,.6)!important}
 .tpl-school.front .data-section{
 width:100%;
 background:rgba(255,255,255,.97);
 border-radius:2mm;padding:1.8mm 2.5mm;
 box-shadow:0 .6mm 2mm rgba(0,0,0,.14);
 border:.18mm solid #E0E8F0;
 flex:1;display:flex;flex-direction:column;
 }
 .tpl-school.front .data-section h3{text-align:center;color:#13224A;font-size:3.4mm}
 .tpl-school.front .data-section p{text-align:center;color:#556070;font-size:2mm;margin-bottom:1mm}
 .tpl-school.front .field-grid{grid-template-columns:1fr 1fr;gap:.8mm;flex:1}
 .tpl-school.front footer{left:3mm!important;right:3mm!important;bottom:2mm!important}
 .tpl-school.back{background:#fff;color:#13224A}

 /* ============================================================
 TPL 5: MINIMAL — Modern White
 White header | Side dark accent | Photo left | Data right
 ============================================================ */
 .tpl-minimal.front{background:linear-gradient(90deg,#fff 60%,#F2F5FA 60%);border-color:#D0D8E8}
 .tpl-minimal.front::before{content:"";position:absolute;right:0;top:0;bottom:0;width:7mm;background:#13224A;z-index:0}
 .tpl-minimal.front header{
 background:#13224A;
 border-bottom:.4mm solid #FF7900;
 z-index:6;
 }
 .tpl-minimal.front .brand-line-main{color:#FFCD60}
 .tpl-minimal.front .brand-line-sub{color:rgba(255,255,255,.88)}
 .tpl-minimal.front main{
 flex:1;display:grid;grid-template-columns:22mm 1fr;gap:2.5mm;
 padding:3mm 9mm 7.5mm 3mm;overflow:hidden;
 }
 .tpl-minimal.front .photo-section{display:flex;flex-direction:column;align-items:center;gap:1.5mm}
 .tpl-minimal.front .photo{
 width:18mm!important;height:22mm!important;
 border-radius:2.5mm!important;border:.8mm solid #FF7900!important;
 box-shadow:0 1mm 2.5mm rgba(15,23,42,.2);
 }
 .tpl-minimal.front .photo-fallback{width:18mm!important;height:22mm!important;border-radius:2.5mm!important;font-size:6mm!important;color:#13224A!important;background:#E8EEF8!important}
 .tpl-minimal.front .grade-badge{font-size:1.8mm!important;max-width:18mm;background:#FF7900!important;color:#fff!important}
 .tpl-minimal.front .data-section{display:flex;flex-direction:column}
 .tpl-minimal.front .data-section h3{text-align:left;color:#13224A;font-size:3.2mm;background:rgba(255,255,255,.88);border-radius:1.2mm;padding:.5mm .9mm;display:inline-block}
 .tpl-minimal.front .data-section p{text-align:left;color:#556070;font-size:1.9mm}
 .tpl-minimal.front .field-grid{grid-template-columns:1fr;gap:.8mm}
 .tpl-minimal.front footer{left:3mm!important;right:8.5mm!important;bottom:2mm!important}
 `
}
function chunkItems(items, size) {
 const chunks = []
 for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
 return chunks
}

function buildPrintPage(items, side, opts, school, buildFront, buildBack, qrUrls = {}) {
 const content = items.map(item => {
 if (!item) return `<div class="slot"></div>`
 const id = item.id || item.emp_id || item.gr_number
 const card = side === 'front'
 ? buildFront(item, opts.template, school, opts, qrUrls[id] || '')
 : buildBack(item, opts.template, school, opts, qrUrls[id] || '')
 return `<div class="slot">${card}</div>`
 }).join('')
 return `<section class="print-page ${side}">${content}</section>`
}

function reorderForBackside(pageItems, layout) {
 const { cols } = layout
 const newPage = []
 for (let i = 0; i < pageItems.length; i += cols) {
 const row = pageItems.slice(i, i + cols)
 while (row.length < cols) row.push(null) // pad with empty slots if needed
 newPage.push(...row.reverse())
 }
 return newPage
}

function openIdPrintWindow(items, opts, school, buildFront, buildBack, title, win = null) {
 const o = normalizeIdOptions(opts)
 const layout = a4Layout(o)
 const pages = chunkItems(items, layout.perPage)
 const html = pages.map(page => {
 const front = buildPrintPage(page, 'front', o, school, buildFront, buildBack, o.qrUrls || {})
 const back = o.doubleSided ? buildPrintPage(reorderForBackside(page, layout), 'back', o, school, buildFront, buildBack, o.qrUrls || {}) : ''
 return `${front}${back}`
 }).join('')
 const w = win || window.open('', '_blank', 'width=1100,height=780')
 w.document.open();
 w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><base href="${esc(window.location.origin)}/"><title>${esc(title)}</title><style>${idCardPrintCss(o)}</style></head><body>
 <div class="no-print"><span style="font-size:14px;font-weight:800;color:#C8991A">${esc(title)}</span><span style="font-size:12px;color:#C0C8D8">${items.length} cards · CR80 · ${o.orientation} · A4 ${o.pageOrientation} · ${layout.cols}x${layout.rows} per page · ${o.doubleSided ? 'double-sided aligned' : 'single-sided'}</span><button onclick="window.print()" style="margin-left:auto;padding:8px 20px;background:linear-gradient(135deg,#C8991A,#e8b420);color:#071e34;border:none;border-radius:7px;cursor:pointer;font-weight:800;font-size:13px">Print / Save PDF</button></div>
 ${html}
 </body></html>`)
 w.document.close()
}

function printCards(items, opts, school, buildFront, buildBack, title = 'ID Cards', win = null) {
 const backBuilder = buildBack || buildEmployeeCardBack
 openIdPrintWindow(items, opts, school, buildFront, backBuilder, title, win)
}

async function printIdCards(students, opts, school, win = null) {
 const o = normalizeIdOptions(opts)
 const qrUrls = {}
 if (o.cardOptions.showQr) {
 await Promise.all(students.map(async s => {
 const key = s.gr_number || s.gr || String(s.id)
 try { qrUrls[s.id] = await QRCode.toDataURL(key, { width: 180, margin: 0, color: { dark: '#0B1F3A', light: '#FFFFFF' } }) }
 catch { qrUrls[s.id] = '' }
 }))
 }
 openIdPrintWindow(students, { ...o, qrUrls }, school, buildIdFront, buildIdBack, 'Student ID Cards', win)
}
function printResultCard(student, exam, results, template, school) {
 if (!student || !results.length) { alert('Select a student and ensure marks are entered.'); return }

 const sN = (school.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase()
 const sUrdu = school.showUrduHeader === false ? '' : (school.schoolUrdu || sN)
 const sNameTitle = schoolNameHtml(sN)
 const sAddr = school.address || 'School Address'
 const sPh = school.phone || '-'
 const sLogo = school.logo || ''

 const subjects = results.map(r => r.subject)
 const marksBySubject = {}
 results.forEach(r => { marksBySubject[r.subject] = r.marks_obtained })
 const totalPerSub = exam?.total_marks || 100
 const passMark = exam?.pass_marks || 33

 const obtained = results.reduce((s, r) => s + Number(r.marks_obtained || 0), 0)
 const possible = results.length * totalPerSub
 const pct = possible > 0 ? Math.round((obtained / possible) * 100) : 0
 const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F'
 const passed = results.every(r => Number(r.marks_obtained || 0) >= passMark)
 const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

 const logoTag = sLogo ? `<img src="${sLogo}" style="height:60px;object-fit:contain;border-radius:6px">` : `<div style="width:60px;height:60px;border-radius:50%;background:#fff;border:1px solid #D9DEE8;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#243041">${sN.charAt(0)}</div>`

 const marksTableRows = results.map((r, i) => {
 const m = Number(r.marks_obtained || 0)
 const rp = Math.round((m / totalPerSub) * 100)
 const rg = rp >= 90 ? 'A+' : rp >= 80 ? 'A' : rp >= 70 ? 'B' : rp >= 60 ? 'C' : rp >= 50 ? 'D' : 'F'
 const col = PIE_PALETTE[i % PIE_PALETTE.length]
 return { i: i+1, sub: r.subject, total: totalPerSub, obtained: m, pct: rp, grade: rg, pass: m >= passMark, col }
 })

 const pieSVG = buildDonutSVG(subjects, marksBySubject, totalPerSub,
 template === 'digital' ? '#071e34' : template === 'classic' ? '#f5f0e8' : template === 'vibrant' ? 'transparent' : '#fff')
 const columnsHtml = buildColumnsHtml(subjects, marksBySubject, totalPerSub,
 template === 'digital' ? 'light' : 'light')
 const pieLegend = subjects.map((s, i) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;font-size:11px"><div style="width:12px;height:12px;border-radius:3px;background:${PIE_PALETTE[i % PIE_PALETTE.length]};flex-shrink:0"></div><span>${s}</span><span style="margin-left:auto;font-weight:700">${marksBySubject[s] || 0}</span></div>`).join('')

 let html

 //  Template: Royal Academic 
 if (template === 'royal') {
 const tableRows = marksTableRows.map(r => `
 <tr style="background:${r.i%2===0?'#fdf8f0':'#fff'}">
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5">${r.i}</td>
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5;font-weight:600">${r.sub}</td>
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5;text-align:center">${r.total}</td>
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5;text-align:center;font-weight:800;color:${r.pass?'#2e7d32':'#c62828'}">${r.obtained}</td>
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5;text-align:center">${r.pct}%</td>
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5;text-align:center">
 <span style="background:${r.col};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${r.grade}</span>
 </td>
 <td style="padding:8px 12px;border-bottom:1px solid #e8d9b5;text-align:center;font-weight:700;color:${r.pass?'#2e7d32':'#c62828'}">${r.pass?'Pass':'Fail'}</td>
 </tr>`).join('')

 html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Result Card - ${student.name}</title>
 <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{width:210mm;min-height:297mm;background:white;font-family:'Playfair Display',Georgia,serif;color:#1a0a00;print-color-adjust:exact;-webkit-print-color-adjust:exact}
 @page{size:A4 portrait;margin:0}
 @media print{body{margin:0}}
 .page{width:210mm;min-height:297mm;display:flex;flex-direction:column}
 </style></head><body>
 <div class="page">
 <!-- Header -->
 <div style="background:#FFF9EF;padding:20px 30px;position:relative;overflow:hidden;border-bottom:2px solid #D8C6A4">
 <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#7B3448,#B9965A,#7B3448)"></div>
 <div style="display:flex;align-items:center;gap:16px;position:relative">
 ${logoTag}
 <div style="flex:1;text-align:center">
 ${sUrdu ? `<div style="font-family:'Noto Nastaliq Urdu',serif;font-size:22px;direction:rtl;color:#7B3448;margin-bottom:4px">${sUrdu}</div>` : ''}
 <h1 style="color:#243041;font-size:22px;font-weight:900;letter-spacing:0.5px;margin:0">${sNameTitle}</h1>
 <p style="color:#6B7280;font-size:12px;margin:5px 0 0">${sAddr} - ${sPh}</p>
 </div>
 <div style="text-align:center;background:white;border:1.5px solid #D8C6A4;border-radius:10px;padding:10px 16px;box-shadow:0 6px 18px rgba(36,48,65,0.06)">
 <div style="color:#7B3448;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Result Card</div>
 <div style="color:#243041;font-size:14px;font-weight:700;margin-top:3px">${exam?.name || ''}</div>
 </div>
 </div>
 <div style="margin-top:14px;height:1px;background:linear-gradient(90deg,transparent,#B9965A,transparent)"></div>
 </div>

 <!-- Student Info -->
 <div style="padding:16px 30px;background:#fdf8f0;border-bottom:2px solid #e8d9b5">
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px">
 ${[['Student Name', student.name],['Father Name', student.father_name||'-'],['Class', exam?.class||'-'],['Session','2026-2027'],['GR Number',student.gr_number||'-'],['Date',today],['Total Subjects',results.length],['Exam Type',exam?.type||'-']].map(([l,v])=>`<div style="background:white;border:1px solid #e8d9b5;border-radius:8px;padding:10px 12px"><div style="font-size:9px;color:#8B6914;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:4px">${l}</div><div style="font-size:13px;font-weight:700;color:#1a0a00">${v}</div></div>`).join('')}
 </div>
 </div>

 <!-- Marks Table -->
 <div style="padding:16px 30px">
 <div style="font-size:11px;color:#8B6914;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px">Academic Performance</div>
 <table style="width:100%;border-collapse:collapse;box-shadow:0 2px 10px rgba(74,14,46,0.08);border-radius:10px;overflow:hidden">
 <thead>
 <tr style="background:linear-gradient(90deg,#4A0E2E,#6B1540)">
 ${['#','Subject','Total Marks','Obtained','Percentage','Grade','Result'].map(h=>`<th style="padding:10px 12px;text-align:${h==='Subject'?'left':'center'};color:#e8b420;font-size:11px;letter-spacing:0.5px;font-weight:700">${h}</th>`).join('')}
 </tr>
 </thead>
 <tbody>${tableRows}</tbody>
 <tfoot>
 <tr style="background:#4A0E2E">
 <td colspan="2" style="padding:10px 12px;color:#e8b420;font-weight:800;font-size:13px">GRAND TOTAL</td>
 <td style="padding:10px 12px;text-align:center;color:#e8b420;font-weight:700">${possible}</td>
 <td style="padding:10px 12px;text-align:center;color:white;font-weight:900;font-size:14px">${obtained}</td>
 <td style="padding:10px 12px;text-align:center;color:white;font-weight:700">${pct}%</td>
 <td style="padding:10px 12px;text-align:center"><span style="background:#C8991A;color:white;padding:3px 10px;border-radius:12px;font-weight:800">${grade}</span></td>
 <td style="padding:10px 12px;text-align:center;color:${passed?'#4CAF50':'#FF375F'};font-weight:800;font-size:13px">${passed?'PASS':'FAIL'}</td>
 </tr>
 </tfoot>
 </table>
 </div>

 <!-- Charts -->
 <div style="padding:0 30px 16px;display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start">
 <div style="text-align:center">
 <div style="font-size:10px;color:#8B6914;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px">Performance Chart</div>
 ${pieSVG}
 <div style="margin-top:8px">${pieLegend}</div>
 </div>
 <div>
 <div style="font-size:10px;color:#8B6914;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:12px">Subject-wise Columns</div>
 ${columnsHtml}
 </div>
 </div>

 <!-- Footer -->
 <div style="margin-top:auto;padding:16px 30px;background:#fdf8f0;border-top:2px solid #e8d9b5">
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center">
 ${['Class Teacher','Examination Controller','Principal'].map(t => {
 const sig = (t === 'Principal' && school.principalSignature) ? `<img src="${school.principalSignature}" style="height:34px;width:auto;display:block;margin:0 auto -10px;mix-blend-mode:multiply">` : "";
 return `<div>${sig}<div style="border-top:1.5px solid #4A0E2E;padding-top:6px;font-size:11px;font-weight:600;color:#4A0E2E">${t}</div></div>`;
 }).join('')}
 </div>
 <div style="text-align:center;margin-top:12px;font-size:9px;color:#8B6914">This result card is issued by ${sN} - Generated: ${today}</div>
 </div>
 </div>
 <scr`+`ipt>window.onload=()=>setTimeout(()=>window.print(),800)</scr`+`ipt></body></html>`

 //  Template: Modern Digital 
 } else if (template === 'digital') {
 const tableRows = marksTableRows.map(r => `
 <tr style="border-bottom:1px solid rgba(0,245,255,0.08)">
 <td style="padding:9px 14px;color:#8892A4;font-size:12px">${r.i}</td>
 <td style="padding:9px 14px;color:#C0C8D8;font-weight:600">${r.sub}</td>
 <td style="padding:9px 14px;text-align:center;color:#8892A4">${r.total}</td>
 <td style="padding:9px 14px;text-align:center;color:${r.pass?'#00F5FF':'#FF375F'};font-weight:800;font-size:14px">${r.obtained}</td>
 <td style="padding:9px 14px;text-align:center;color:#C0C8D8">${r.pct}%</td>
 <td style="padding:9px 14px;text-align:center"><span style="background:${r.col}22;color:${r.col};border:1px solid ${r.col}44;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${r.grade}</span></td>
 <td style="padding:9px 14px;text-align:center;color:${r.pass?'#30D158':'#FF375F'};font-weight:700">${r.pass?'Pass':'Fail'}</td>
 </tr>`).join('')

 html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Result Card - ${student.name}</title>
 <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{width:210mm;min-height:297mm;background:#F4F8FA;font-family:'DM Sans',Arial,sans-serif;color:#243041;print-color-adjust:exact;-webkit-print-color-adjust:exact}
 @page{size:A4 portrait;margin:0}
 @media print{body{margin:0}}
 </style></head><body>
 <div style="width:210mm;min-height:297mm;display:flex;flex-direction:column;background:#F4F8FA">
 <!-- Header -->
 <div style="background:#FFFFFF;padding:22px 28px;border-bottom:2px solid #B8CFCE;position:relative;overflow:hidden">
 <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#5EA8A7,#8B95A8,#5EA8A7)"></div>
 <div style="display:flex;align-items:center;gap:16px">
 ${logoTag}
 <div style="flex:1">
 ${sUrdu ? `<div style="font-family:'Noto Nastaliq Urdu',serif;font-size:18px;direction:rtl;color:#5EA8A7;margin-bottom:3px">${sUrdu}</div>` : ''}
 <h1 style="color:#243041;font-size:20px;font-weight:900;margin:0">${sNameTitle}</h1>
 <p style="color:#6B7280;font-size:11px;margin:4px 0 0">${sAddr} - ${sPh}</p>
 </div>
 <div style="text-align:center;background:#F4F8FA;border:1px solid #B8CFCE;border-radius:12px;padding:12px 18px">
 <div style="color:#5EA8A7;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Result Card</div>
 <div style="color:#243041;font-size:13px;font-weight:700;margin-top:4px">${exam?.name || ''}</div>
 <div style="color:#6B7280;font-size:10px;margin-top:3px">${today}</div>
 </div>
 </div>
 </div>

 <!-- Student Info Bar -->
 <div style="background:rgba(0,245,255,0.04);border-bottom:1px solid rgba(0,245,255,0.1);padding:14px 28px">
 <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
 ${[['Student',student.name],['Father',student.father_name||'-'],['Class',exam?.class||'-'],['GR No',student.gr_number||'-'],['Session','2026-2027'],['Exam',exam?.type||'-'],['Subjects',results.length],['Date',today]].map(([l,v])=>`<div style="background:rgba(255,255,255,0.7);border:1px solid #B8CFCE;border-radius:8px;padding:8px 12px"><div style="font-size:9px;color:#5EA8A7;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">${l}</div><div style="font-size:12px;font-weight:700;color:#243041">${v}</div></div>`).join('')}
 </div>
 </div>

 <!-- Marks Table -->
 <div style="padding:16px 28px">
 <div style="font-size:10px;color:#5EA8A7;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:10px">Academic Results</div>
 <table style="width:100%;border-collapse:collapse;background:rgba(15,23,42,0.46);border-radius:10px;overflow:hidden;border:1px solid rgba(0,245,255,0.1)">
 <thead>
 <tr style="background:rgba(0,245,255,0.08);border-bottom:1px solid rgba(0,245,255,0.2)">
 ${['#','Subject','Total','Obtained','Percentage','Grade','Result'].map(h=>`<th style="padding:10px 14px;text-align:${h==='Subject'?'left':'center'};color:#00F5FF;font-size:10px;letter-spacing:1px;font-weight:700;text-transform:uppercase">${h}</th>`).join('')}
 </tr>
 </thead>
 <tbody>${tableRows}</tbody>
 <tfoot>
 <tr style="background:rgba(0,245,255,0.06);border-top:1px solid rgba(0,245,255,0.2)">
 <td colspan="2" style="padding:10px 14px;color:#00F5FF;font-weight:800">TOTAL</td>
 <td style="padding:10px 14px;text-align:center;color:#8892A4">${possible}</td>
 <td style="padding:10px 14px;text-align:center;color:#00F5FF;font-weight:900;font-size:16px">${obtained}</td>
 <td style="padding:10px 14px;text-align:center;color:white;font-weight:700">${pct}%</td>
 <td style="padding:10px 14px;text-align:center"><span style="background:rgba(200,153,26,0.2);color:#C8991A;border:1px solid rgba(200,153,26,0.4);padding:3px 12px;border-radius:20px;font-weight:800">${grade}</span></td>
 <td style="padding:10px 14px;text-align:center;color:${passed?'#30D158':'#FF375F'};font-weight:800;font-size:13px">${passed?'PASS':'FAIL'}</td>
 </tr>
 </tfoot>
 </table>
 </div>

 <!-- Charts Row -->
 <div style="padding:0 28px 16px;display:grid;grid-template-columns:210px 1fr;gap:20px">
 <div style="background:rgba(11,44,77,0.92);border:1px solid rgba(0,245,255,0.1);border-radius:12px;padding:14px;text-align:center">
 <div style="font-size:9px;color:#00F5FF;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:10px">Performance</div>
 ${pieSVG}
 <div style="margin-top:8px">${pieLegend}</div>
 </div>
 <div style="background:rgba(11,44,77,0.92);border:1px solid rgba(0,245,255,0.1);border-radius:12px;padding:14px">
 <div style="font-size:9px;color:#5EA8A7;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:14px">Subject Columns</div>
 ${columnsHtml}
 </div>
 </div>

 <!-- Footer -->
 <div style="margin-top:auto;padding:16px 28px;background:rgba(0,245,255,0.04);border-top:1px solid rgba(0,245,255,0.1)">
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center">
 ${['Class Teacher','Controller of Exams','Principal'].map(t => {
 const sig = (t === 'Principal' && school.principalSignature) ? `<img src="${school.principalSignature}" style="height:34px;width:auto;display:block;margin:0 auto -10px;mix-blend-mode:multiply">` : "";
 return `<div>${sig}<div style="border-top:1px solid rgba(0,245,255,0.3);padding-top:6px;font-size:11px;color:#8892A4">${t}</div></div>`;
 }).join('')}
 </div>
 <div style="text-align:center;margin-top:10px;font-size:9px;color:rgba(136,146,164,0.8)">${sN} - Result Card - Generated ${today}</div>
 </div>
 </div>
 <scr`+`ipt>window.onload=()=>setTimeout(()=>window.print(),800)</scr`+`ipt></body></html>`

 //  Template: Classic Formal 
 } else if (template === 'classic') {
 const tableRows = marksTableRows.map(r => `
 <tr style="background:${r.i%2===0?'#eef2ff':'#fff'}">
 <td style="padding:8px 12px;border:1px solid #c5cde8">${r.i}</td>
 <td style="padding:8px 12px;border:1px solid #c5cde8;font-weight:600">${r.sub}</td>
 <td style="padding:8px 12px;border:1px solid #c5cde8;text-align:center">${r.total}</td>
 <td style="padding:8px 12px;border:1px solid #c5cde8;text-align:center;font-weight:700;color:${r.pass?'#1565C0':'#c62828'}">${r.obtained}</td>
 <td style="padding:8px 12px;border:1px solid #c5cde8;text-align:center">${r.pct}%</td>
 <td style="padding:8px 12px;border:1px solid #c5cde8;text-align:center"><span style="background:${r.col};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${r.grade}</span></td>
 <td style="padding:8px 12px;border:1px solid #c5cde8;text-align:center;color:${r.pass?'#2e7d32':'#c62828'};font-weight:600">${r.pass?'Pass':'Fail'}</td>
 </tr>`).join('')

 html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Result Card - ${student.name}</title>
 <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{width:210mm;min-height:297mm;background:#f5f0e8;font-family:'DM Sans',Arial,sans-serif;color:#1a1a2e}
 @page{size:A4 portrait;margin:0}
 @media print{body{margin:0}}
 </style></head><body>
 <div style="width:210mm;min-height:297mm;background:#f5f0e8;display:flex;flex-direction:column">
 <!-- Header -->
 <div style="background:#FFFFFF;padding:20px 28px;text-align:center;border-bottom:2px solid #B7C7D8;position:relative">
 <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#527AA3,#D8A047,#527AA3)"></div>
 <div style="display:flex;align-items:center;justify-content:center;gap:14px">
 ${logoTag}
 <div>
 ${sUrdu ? `<div style="font-family:'Noto Nastaliq Urdu',serif;font-size:18px;direction:rtl;color:#527AA3;margin-bottom:2px">${sUrdu}</div>` : ''}
 <h1 style="color:#243041;font-size:20px;font-weight:900;margin:0">${sNameTitle}</h1>
 <p style="color:#6B7280;font-size:11px;margin:4px 0 0">${sAddr} - Tel: ${sPh}</p>
 </div>
 </div>
 <div style="margin-top:12px;background:#FAF7F0;border:1px solid #D8C6A4;border-radius:6px;padding:6px;display:inline-block;min-width:160px">
 <div style="color:#527AA3;font-size:14px;font-weight:700">RESULT CARD - ${exam?.name || ''}</div>
 </div>
 </div>

 <!-- Student Info -->
 <div style="padding:14px 28px;background:#fff;border-bottom:2px solid #1565C0">
 <table style="width:100%;border-collapse:collapse">
 <tr>
 ${[['Student Name',student.name],['Father Name',student.father_name||'-'],['Class/Section',exam?.class||'-'],['GR Number',student.gr_number||'-']].map(([l,v])=>`<td style="padding:6px 10px;font-size:12px"><span style="font-weight:600;color:#1565C0">${l}:</span> ${v}</td>`).join('')}
 </tr>
 <tr>
 ${[['Session','2026-2027'],['Exam Type',exam?.type||'-'],['Result Date',today],['Total Subjects',results.length]].map(([l,v])=>`<td style="padding:6px 10px;font-size:12px"><span style="font-weight:600;color:#1565C0">${l}:</span> ${v}</td>`).join('')}
 </tr>
 </table>
 </div>

 <!-- Marks Table -->
 <div style="padding:14px 28px">
 <table style="width:100%;border-collapse:collapse;border:1px solid #c5cde8">
 <thead>
 <tr style="background:#1565C0">
 ${['S.No','Subject','Total Marks','Obtained Marks','Percentage','Grade','Result'].map(h=>`<th style="padding:9px 12px;text-align:${h==='Subject'?'left':'center'};color:white;font-size:11px;font-weight:700">${h}</th>`).join('')}
 </tr>
 </thead>
 <tbody>${tableRows}</tbody>
 <tfoot>
 <tr style="background:#e3f2fd;font-weight:700">
 <td colspan="2" style="padding:9px 12px;border:1px solid #c5cde8;color:#1565C0;font-weight:800">TOTAL</td>
 <td style="padding:9px 12px;border:1px solid #c5cde8;text-align:center">${possible}</td>
 <td style="padding:9px 12px;border:1px solid #c5cde8;text-align:center;color:#1565C0;font-weight:900;font-size:15px">${obtained}</td>
 <td style="padding:9px 12px;border:1px solid #c5cde8;text-align:center">${pct}%</td>
 <td style="padding:9px 12px;border:1px solid #c5cde8;text-align:center"><span style="background:#1565C0;color:white;padding:3px 10px;border-radius:4px;font-weight:800">${grade}</span></td>
 <td style="padding:9px 12px;border:1px solid #c5cde8;text-align:center;color:${passed?'#2e7d32':'#c62828'};font-weight:800">${passed?'PASS':'FAIL'}</td>
 </tr>
 </tfoot>
 </table>
 </div>

 <!-- Charts -->
 <div style="padding:0 28px 14px;display:grid;grid-template-columns:210px 1fr;gap:20px">
 <div style="background:white;border:1px solid #c5cde8;border-radius:8px;padding:12px;text-align:center">
 <div style="font-size:10px;color:#1565C0;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Result Overview</div>
 ${pieSVG}
 <div style="margin-top:8px;font-size:11px">${pieLegend}</div>
 </div>
 <div style="background:white;border:1px solid #c5cde8;border-radius:8px;padding:12px">
 <div style="font-size:10px;color:#1565C0;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Subject-wise Columns</div>
 ${columnsHtml}
 </div>
 </div>

 <!-- Remarks & Footer -->
 <div style="margin-top:auto;padding:14px 28px;background:#fff;border-top:2px solid #1565C0">
 <div style="background:#e3f2fd;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1565C0">
 <strong>Remarks:</strong> <em>Student has shown ${pct>=70?'excellent':pct>=50?'satisfactory':'below average'} performance. ${pct>=50?'Keep up the good work and strive for excellence.':'More effort and dedication is required in studies.'}</em>
 </div>
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center">
 ${['Class Teacher','Examination Controller','Principal'].map(t => {
 const sig = (t === 'Principal' && school.principalSignature) ? `<img src="${school.principalSignature}" style="height:34px;width:auto;display:block;margin:0 auto -10px;mix-blend-mode:multiply">` : "";
 return `<div>${sig}<div style="border-top:2px solid #1565C0;padding-top:6px;font-size:11px;font-weight:600;color:#1565C0">${t}</div></div>`;
 }).join('')}
 </div>
 <div style="text-align:center;margin-top:10px;font-size:9px;color:#8892A4">${sN} - This result card is an official document - ${today}</div>
 </div>
 </div>
 <scr`+`ipt>window.onload=()=>setTimeout(()=>window.print(),800)</scr`+`ipt></body></html>`

 //  Template: Vibrant Excellence 
 } else {
 const tableRows = marksTableRows.map(r => `
 <tr style="background:${r.col}18">
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);color:#666">${r.i}</td>
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);font-weight:700;color:#222">${r.sub}</td>
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);text-align:center;color:#555">${r.total}</td>
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);text-align:center;font-weight:900;font-size:15px;color:${r.col}">${r.obtained}</td>
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);text-align:center">${r.pct}%</td>
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);text-align:center"><span style="background:${r.col};color:white;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:800">${r.grade}</span></td>
 <td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.15);text-align:center;font-weight:700;color:${r.pass?'#2e7d32':'#c62828'}">${r.pass?'Pass':'Fail'}</td>
 </tr>`).join('')

 html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Result Card - ${student.name}</title>
 <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{width:210mm;min-height:297mm;background:white;font-family:'DM Sans',Arial,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}
 @page{size:A4 portrait;margin:0}
 @media print{body{margin:0}}
 </style></head><body>
 <div style="width:210mm;min-height:297mm;background:white;display:flex;flex-direction:column">
 <!-- Header -->
 <div style="background:#FFF8F3;padding:22px 28px;position:relative;overflow:hidden;border-bottom:2px solid #F1D0C4">
 <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#C9867D,#D8A047,#8BCFC3)"></div>
 <div style="display:flex;align-items:center;gap:16px;position:relative">
 ${logoTag}
 <div style="flex:1;text-align:center">
 ${sUrdu ? `<div style="font-family:'Noto Nastaliq Urdu',serif;font-size:18px;direction:rtl;color:#C9867D;margin-bottom:2px">${sUrdu}</div>` : ''}
 <h1 style="color:#243041;font-size:22px;font-weight:900;margin:0">${sNameTitle}</h1>
 <p style="color:#6B7280;font-size:11px;margin:4px 0 0">${sAddr} - ${sPh}</p>
 </div>
 <div style="background:white;border-radius:14px;padding:12px 18px;text-align:center;border:1px solid #F1D0C4;box-shadow:0 6px 18px rgba(36,48,65,0.06)">
 <div style="color:#C9867D;font-size:11px;font-weight:700;letter-spacing:1px">RESULT CARD</div>
 <div style="color:#243041;font-size:14px;font-weight:900;margin-top:4px">${exam?.name || ''}</div>
 <div style="background:${passed?'#E8F5EE':'#FCECEC'};color:${passed?'#2e7d32':'#c62828'};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:800;margin-top:6px">${passed?'PASS':'FAIL'}</div>
 </div>
 </div>
 </div>

 <!-- Student Info Colorful Cards -->
 <div style="padding:14px 28px;background:#fafafa;border-bottom:1px solid #eee">
 <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
 ${[['Student',student.name,'#C9867D'],['Father',student.father_name||'-','#8BCFC3'],['Class',exam?.class||'-','#8EB6D8'],['GR No',student.gr_number||'-','#D8A047'],['Session','2026-2027','#A987C6'],['Exam',exam?.type||'-','#7DA58A'],['Subjects',results.length,'#C9867D'],['Date',today,'#8EB6D8']].map(([l,v,c])=>`<div style="background:${c}18;border-left:3px solid ${c};border-radius:8px;padding:8px 12px"><div style="font-size:10px;color:${c};font-weight:700;margin-bottom:3px">${l}</div><div style="font-size:12px;font-weight:700;color:#333">${v}</div></div>`).join('')}
 </div>
 </div>

 <!-- Marks Table -->
 <div style="padding:14px 28px">
 <div style="font-size:11px;font-weight:800;color:#C9867D;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Academic Performance</div>
 <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
 <thead>
 <tr style="background:linear-gradient(90deg,#FF6B35,#F7C948,#4ECDC4)">
 ${['#','Subject','Total','Obtained','Percentage','Grade','Result'].map(h=>`<th style="padding:10px 12px;text-align:${h==='Subject'?'left':'center'};color:white;font-size:11px;font-weight:800">${h}</th>`).join('')}
 </tr>
 </thead>
 <tbody>${tableRows}</tbody>
 <tfoot>
 <tr style="background:linear-gradient(90deg,#FF6B3522,#F7C94822,#4ECDC422)">
 <td colspan="2" style="padding:10px 12px;font-weight:900;color:#FF6B35;font-size:13px">GRAND TOTAL</td>
 <td style="padding:10px 12px;text-align:center;color:#666">${possible}</td>
 <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:16px;color:#FF6B35">${obtained}</td>
 <td style="padding:10px 12px;text-align:center;font-weight:700">${pct}%</td>
 <td style="padding:10px 12px;text-align:center"><span style="background:linear-gradient(135deg,#FF6B35,#F7C948);color:white;padding:3px 12px;border-radius:20px;font-weight:800">${grade}</span></td>
 <td style="padding:10px 12px;text-align:center;color:${passed?'#2e7d32':'#c62828'};font-weight:900;font-size:14px">${passed?'PASS':'FAIL'}</td>
 </tr>
 </tfoot>
 </table>
 </div>

 <!-- Charts -->
 <div style="padding:0 28px 14px;display:grid;grid-template-columns:210px 1fr;gap:20px">
 <div style="background:linear-gradient(135deg,#FF6B3512,#4ECDC412);border:1px solid #FF6B3530;border-radius:12px;padding:14px;text-align:center">
 <div style="font-size:10px;font-weight:800;color:#FF6B35;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Performance Chart</div>
 ${pieSVG}
 <div style="margin-top:8px">${pieLegend}</div>
 </div>
 <div style="background:linear-gradient(135deg,#4ECDC412,#45B7D112);border:1px solid #4ECDC430;border-radius:12px;padding:14px">
 <div style="font-size:10px;font-weight:800;color:#4ECDC4;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Subject Columns</div>
 ${columnsHtml}
 </div>
 </div>

 <!-- Footer -->
 <div style="margin-top:auto;padding:16px 28px;background:linear-gradient(90deg,#FF6B3510,#4ECDC410);border-top:3px solid transparent;border-image:linear-gradient(90deg,#FF6B35,#F7C948,#4ECDC4) 1">
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center">
 ${['Class Teacher','Examination Controller','Principal'].map((t,i) => {
 const sig = (t === 'Principal' && school.principalSignature) ? `<img src="${school.principalSignature}" style="height:34px;width:auto;display:block;margin:0 auto -10px;mix-blend-mode:multiply">` : "";
 const c = ['#FF6B35','#F7C948','#4ECDC4'][i];
 return `<div>${sig}<div style="border-top:2px solid ${c};padding-top:6px;font-size:11px;font-weight:700;color:${c}">${t}</div></div>`;
 }).join('')}
 </div>
 <div style="text-align:center;margin-top:10px;font-size:9px;color:#999">${sN} - Generated ${today}</div>
 </div>
 </div>
 <scr`+`ipt>window.onload=()=>setTimeout(()=>window.print(),800)</scr`+`ipt></body></html>`
 }

 const w = window.open('', '_blank', 'width=960,height=760')
 w.document.write(html)
 w.document.close()
}

//  Small UI Components 
const GCard = ({ children, style={} }) => (
 <div className="cards-panel" style={{ background:C.card, backdropFilter:'blur(20px)', border:`1px solid ${C.border}`, borderRadius:22, padding:24, boxShadow:'0 12px 32px rgba(7,30,52,0.28)', ...style }}>{children}</div>
)
const Lbl = ({ children }) => <label style={{ color:C.muted, fontSize:12, fontWeight:600, display:'block', marginBottom:6, letterSpacing:'0.06em' }}>{children}</label>
const Inp = ({ style={}, ...p }) => <input {...p} style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 13px', fontSize:14, outline:'none', boxSizing:'border-box', ...style }}/>
const Sel = ({ children, style={}, ...p }) => <select {...p} style={{ width:'100%', background:'#0a1e35', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 13px', fontSize:14, outline:'none', cursor:'pointer', boxSizing:'border-box', ...style }}>{children}</select>

function TemplateCard({ t, selected, onSelect }) {
 return (
 <div onClick={() => onSelect(t.id)} style={{ cursor:'pointer', border:`1.5px solid ${selected?C.gold:'rgba(192,200,216,0.2)'}`, borderRadius:12, overflow:'hidden', transition:'all 0.2s', background: selected?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.045)', boxShadow: selected?`0 8px 22px rgba(200,153,26,0.18)`:'' }}>
 <div className="cards-node" style={{ height:66, background:'#fff', display:'flex', alignItems:'center', gap:8, padding:'10px 12px', position:'relative', overflow:'hidden' }}>
 <div className="cards-node" style={{ position:'absolute', top:0, left:0, right:0, height:8, background:t.c1 }}/>
 <div className="cards-node" style={{ position:'absolute', bottom:0, left:0, right:0, height:6, background:t.c1 }}/>
 <div className="cards-node" style={{ position:'absolute', top:0, bottom:0, left:10, width:18, background:t.c2 }}/>
 <div className="cards-node" style={{ position:'absolute', right:-22, top:-22, width:76, height:76, borderRadius:'50%', border:`8px solid ${t.c2}`, borderRightColor:'transparent', borderBottomColor:'transparent', transform:'rotate(-18deg)', opacity:0.9 }}/>
 <div className="cards-node" style={{ width:20, height:26, borderRadius:4, background:'#E8EEF8', border:`2px solid ${t.c1}`, boxShadow:'0 2px 8px rgba(15,23,42,0.16)', zIndex:1, marginLeft:18 }}/>
 <div className="cards-node" style={{ flex:1, zIndex:1 }}>
 <div className="cards-node" style={{ height:5, background:t.c1, borderRadius:4, marginBottom:5, width:'72%' }}/>
 <div className="cards-node" style={{ height:4, background:'#A9B2C1', borderRadius:4, width:'52%' }}/>
 </div>
 <div className="cards-node" style={{ width:22, height:22, borderRadius:3, background:'#fff', border:`2px solid ${t.c1}`, zIndex:1 }}/>
 {selected && <div className="cards-node" style={{ position:'absolute', top:7, right:7, background:C.gold, borderRadius:'50%', width:17, height:17, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#071e34', fontWeight:900 }}>OK</div>}
 </div>
 <div className="cards-node" style={{ padding:'8px 12px' }}>
 <div className="cards-node" style={{ color: selected?C.gold:C.silver, fontWeight:700, fontSize:13 }}>{t.label}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, marginTop:2 }}>{t.sub}</div>
 </div>
 </div>
 )
}

function defaultIdCardOptions() {
 return {
 primaryColor: '#0B1F3A',
 secondaryColor: '#C8D2E3',
 textColor: '#FFFFFF',
 borderRadius: 4,
 photoShape: 'rounded',
 showBarcode: true,
 showQr: false,
 showSignature: true,
 backgroundPattern: true,
 }
}

function IdCardOptionsPanel({ orientation, setOrientation, pageOrientation, setPageOrientation, options, setOptions }) {
 const setOpt = (key, value) => setOptions(o => ({ ...o, [key]: value }))
 return (
 <div className="cards-node" style={{ display:'grid', gap:14 }}>
 <div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Orientation & A4 Layout</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
 {[['portrait','Portrait Card'],['landscape','Landscape Card']].map(([id,label]) => (
 <button key={id} onClick={() => setOrientation(id)} style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${orientation===id?C.gold:C.border}`, background:orientation===id?'rgba(200,153,26,0.12)':'rgba(15,23,42,0.38)', color:orientation===id?C.gold:C.silver, cursor:'pointer', fontWeight: 600 }}>{label}</button>
 ))}
 {[['portrait','A4 Portrait'],['landscape','A4 Landscape']].map(([id,label]) => (
 <button key={id} onClick={() => setPageOrientation(id)} style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${pageOrientation===id?C.blue:C.border}`, background:pageOrientation===id?'rgba(10,132,255,0.12)':'rgba(15,23,42,0.38)', color:pageOrientation===id?C.blue:C.silver, cursor:'pointer', fontWeight: 600 }}>{label}</button>
 ))}
 </div>
 </div>
 <div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Template Customization</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
 <div><Lbl>Primary</Lbl><Inp type="color" value={options.primaryColor} onChange={e=>setOpt('primaryColor', e.target.value)} style={{ height:42, padding:4 }} /></div>
 <div><Lbl>Secondary</Lbl><Inp type="color" value={options.secondaryColor} onChange={e=>setOpt('secondaryColor', e.target.value)} style={{ height:42, padding:4 }} /></div>
 <div><Lbl>Text</Lbl><Inp type="color" value={options.textColor} onChange={e=>setOpt('textColor', e.target.value)} style={{ height:42, padding:4 }} /></div>
 <div><Lbl>Radius</Lbl><Inp type="number" min="0" max="8" value={options.borderRadius} onChange={e=>setOpt('borderRadius', Number(e.target.value))} /></div>
 <div><Lbl>Photo Shape</Lbl><Sel value={options.photoShape} onChange={e=>setOpt('photoShape', e.target.value)}><option value="rounded">Rounded</option><option value="circle">Circle</option></Sel></div>
 <div><Lbl>Pattern</Lbl><Sel value={String(options.backgroundPattern)} onChange={e=>setOpt('backgroundPattern', e.target.value === 'true')}><option value="true">On</option><option value="false">Off</option></Sel></div>
 </div>
 <div className="cards-node" style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
 {[['showQr','QR Code'],['showSignature','Signature']].map(([key,label]) => (
 <button key={key} onClick={() => setOpt(key, !options[key])} style={{ padding:'8px 12px', borderRadius:20, border:`1px solid ${options[key]?C.green:C.border}`, background:options[key]?'rgba(48,209,88,0.12)':'rgba(15,23,42,0.38)', color:options[key]?C.green:C.muted, cursor:'pointer', fontWeight: 600, fontSize:12 }}>{label}: {options[key] ? 'On' : 'Off'}</button>
 ))}
 </div>
 </div>
 </div>
 )
}

//  Student ID Cards Tab 
function openLoadingPopup(title = 'Generating cards... Please wait...') {
 const win = window.open('', '_blank', 'width=1100,height=780')
 if (!win) return null
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
 <style>
 html,body{margin:0;height:100%;background:#071e34;color:#fff;font-family:Aptos,Segoe UI,Arial,sans-serif}
 body{display:grid;place-items:center}
 .shell{width:min(560px,92vw);padding:34px 28px;border-radius:24px;border:1px solid rgba(200,153,26,.24);background:linear-gradient(180deg,rgba(11,44,77,.98),rgba(7,30,52,.98));box-shadow:0 22px 48px rgba(0,0,0,.35);text-align:center}
 .title{font-size:28px;font-weight:600;letter-spacing:.01em;margin:0 0 10px;color:#fff}
 .sub{font-size:14px;color:rgba(192,200,216,.85);line-height:1.7}
 </style></head><body><div class="shell"><div class="title">${title}</div><div class="sub">We are preparing your cards in a live print window. This should only take a moment.</div></div></body></html>`)
 win.document.close()
 return win
}

function StudentIdTab({ school }) {
 const { students: raw } = useStudentStore()
 const { classNames, sectionsForClass } = useAcademicStore()
 const [mode, setMode] = useState('single') // 'single' | 'classwise'
 const [template, setTemplate] = useState('corporate')
 const [size, setSize] = useState('cr80')
 const [orientation,setOrientation]= useState('portrait')
 const [pageOrientation,setPageOrientation]= useState('portrait')
 const [doubleSided,setDoubleSided]= useState(false)
 const [cardOptions,setCardOptions]= useState(defaultIdCardOptions)
 const [cardsPerPage,setCardsPerPage]= useState('')
 const [studentId, setStudentId] = useState('')
 const [cls, setCls] = useState('Starter')
 const [sec, setSec] = useState('All')
 const [status, setStatus] = useState('')
 const classOptions = classNames?.length ? classNames : ['Starter']
 const sectionOptions = sectionsForClass?.(cls) || []
 const sectionSelectOptions = ['All', ...sectionOptions.filter(Boolean)]

 useEffect(() => {
 if (!classOptions.includes(cls)) setCls(classOptions[0] || 'Starter')
 }, [classOptions, cls])

 useEffect(() => {
 if (!sectionSelectOptions.includes(sec)) setSec('All')
 }, [sectionSelectOptions, sec])

 const allStudents = raw.map(s => ({
 ...s, name:s.name||'', gr_number:s.gr_number||s.gr||'', class:s.class||'',
 section:s.section||'', parent_phone:s.parent_phone||s.phone||s.whatsapp||'',
 father_name:s.father_name||s.father||'',
 }))

 const handleGenerate = async () => {
 let targets
 if (mode === 'single') {
 const q = (studentId || '').trim()
 const qNorm = q.toLowerCase().replace(/^gr-?/i, '')
 const found = allStudents.find(s => {
 const grNorm = (s.gr_number || '').toLowerCase().replace(/^gr-?/i, '')
 return (s.gr_number || '').toLowerCase() === q.toLowerCase() || grNorm === qNorm || String(s.id) === q
 })
 if (!found) { setStatus('Student not found. Check GR Number.'); return }
 targets = [found]
 } else {
 targets = allStudents.filter(s => s.class === cls && (sec === 'All' || s.section === sec))
 if (!targets.length) { setStatus('No students found for this class/section.'); return }
 }
 const win = openLoadingPopup('Generating cards... Please wait...')
 if (!win) {
 alert('Popup blocked! Please allow popups for this site to generate cards.')
 return
 }
 setStatus(`Generating ${targets.length} card(s)...`)
 try {
 await printIdCards(targets, { template, size, orientation, pageOrientation, doubleSided, cardOptions, cardsPerPage: cardsPerPage||null }, school, win)
 } catch (err) {
 try { win.close() } catch {}
 throw err
 }
 setTimeout(() => setStatus(''), 3000)
 }

 const sz = CARD_SIZES.find(s => s.id === size) || CARD_SIZES[0]

 return (
 <div className="cards-node" style={{ display:'grid', gap:24 }}>
 <GCard>
 <div className="cards-node" style={{ marginBottom:18 }}>
 <h3 style={{ color:C.gold, fontSize:17, margin:'0 0 4px', fontFamily:"'Playfair Display',serif" }}>Student ID Cards</h3>
 <p style={{ color:C.muted, fontSize:13, margin:0 }}>Generate single or class-wise ID cards in multiple sizes and designs.</p>
 </div>

 {/* Mode Toggle */}
 <div className="cards-node" style={{ display:'flex', gap:4, background:'rgba(7,30,52,0.5)', borderRadius:14, padding:4, width:'fit-content', marginBottom:20 }}>
 {[{id:'single',label:'Single Student'},{id:'classwise',label:'Class Wise'}].map(m=>(
 <button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:'8px 18px', borderRadius:12, border:'none', cursor:'pointer', fontWeight: 600, fontSize:13, background:mode===m.id?`linear-gradient(135deg,${C.gold},${C.goldL})`:'transparent', color:mode===m.id?'#071e34':C.muted, transition:'all 0.15s' }}>{m.label}</button>
 ))}
 </div>

 {/* Student / Class Input */}
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns: mode==='single' ? '1fr auto' : '1fr 1fr auto', gap:14, marginBottom:22, alignItems:'flex-end' }}>
 {mode === 'single' ? (
 <div><Lbl>GR Number / Student ID</Lbl><Inp value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Enter GR Number (e.g. GR-4005)"/></div>
 ) : (<>
 <div><Lbl>Class</Lbl><Sel value={cls} onChange={e=>setCls(e.target.value)}>{classOptions.map(c=><option key={c} style={{background:'#0a1e35',color:C.silver}}>{c}</option>)}</Sel></div>
 <div><Lbl>Section</Lbl><Sel value={sec} onChange={e=>setSec(e.target.value)}>{sectionSelectOptions.map(s=><option key={s} style={{background:'#0a1e35',color:C.silver}}>{s}</option>)}</Sel></div>
 </>)}
 <div className="cards-node" style={{ paddingBottom:1 }}>
 {mode === 'single' && <Lbl>&nbsp;</Lbl>}
 <div className="cards-node" style={{ color:C.muted, fontSize:12, marginBottom:6 }}>&nbsp;</div>
 <div className="cards-node" style={{ display:'flex', gap:8 }}>
 <button onClick={handleGenerate} style={{ padding:'10px 22px', border:'none', borderRadius:10, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap' }}>Generate &amp; Print</button>
 </div>
 </div>
 </div>
 {status && <div className="cards-node" style={{ color:status.includes('not found')||status.includes('No students')?C.red:C.green, fontWeight:600, fontSize:13, marginBottom:16 }}>{status}</div>}

 {/* Template Selection */}
 <div className="cards-node" style={{ marginBottom:20 }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Template Design</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, position:'relative' }}>
 {ID_TEMPLATES.map(t => <TemplateCard key={t.id} t={t} selected={template===t.id} onSelect={setTemplate}/>)}
 </div>
 </div>

 {/* Size & Options */}
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
 <div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Card Size</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
 {CARD_SIZES.map(s => (
 <div key={s.id} onClick={()=>setSize(s.id)} style={{ cursor:'pointer', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${size===s.id?C.gold:C.border}`, background:size===s.id?'rgba(200,153,26,0.1)':'rgba(15,23,42,0.38)', transition:'all 0.15s' }}>
 <div className="cards-node" style={{ color:size===s.id?C.gold:C.silver, fontWeight:700, fontSize:13 }}>{s.label}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, marginTop:2 }}>{s.desc}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:10, marginTop:1 }}>{s.note}</div>
 </div>
 ))}
 </div>
 </div>
 <div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Print Options</div>
 <div className="cards-node" style={{ display:'flex', flexDirection:'column', gap:10 }}>
 {[{id:false,label:'Single Sided',desc:'Front side only'},{id:true,label:'Double Sided',desc:'Front + Back - 2 pages'}].map(o=>(
 <div key={String(o.id)} onClick={()=>setDoubleSided(o.id)} style={{ cursor:'pointer', padding:'12px 16px', borderRadius:10, border:`1.5px solid ${doubleSided===o.id?C.gold:C.border}`, background:doubleSided===o.id?'rgba(200,153,26,0.1)':'rgba(15,23,42,0.38)', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}>
 <div className="cards-node" style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${doubleSided===o.id?C.gold:C.border}`, background:doubleSided===o.id?C.gold:'', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
 {doubleSided===o.id && <div className="cards-node" style={{ width:8, height:8, borderRadius:'50%', background:'#071e34' }}/>}
 </div>
 <div>
 <div className="cards-node" style={{ color:doubleSided===o.id?C.gold:C.silver, fontWeight:700, fontSize:13 }}>{o.label}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11 }}>{o.desc}</div>
 </div>
 </div>
 ))}
 {/* Cards per page selector */}
 <div className="cards-node" style={{ padding:'10px 14px', borderRadius:10, background:'rgba(15,23,42,0.5)', border:`1px solid ${C.border}` }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Cards per A4 Page</div>
 <div className="cards-node" style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
 {['Auto','1','2','3','4','6','8','9'].map(v=>(
 <button key={v} onClick={()=>setCardsPerPage(v==='Auto'?'':v)}
 style={{ padding:'6px 13px', borderRadius:8, border:`1.5px solid ${(v==='Auto'?'':v)===cardsPerPage?C.gold:C.border}`, background:(v==='Auto'?'':v)===cardsPerPage?'rgba(200,153,26,0.16)':'rgba(15,23,42,0.6)', color:(v==='Auto'?'':v)===cardsPerPage?C.gold:C.muted, fontWeight:700, fontSize:12, cursor:'pointer', minWidth:40, transition:'all .15s' }}
 >{v}</button>
 ))}
 </div>
 {doubleSided && <div className="cards-node" style={{ color:'#4CAF8B', fontSize:10, fontWeight:600 }}> Double-sided: each student's front &amp; back print on same page position.</div>}
 </div>
 <div className="cards-node" style={{ padding:'10px 14px', borderRadius:10, background:'rgba(10,132,255,0.08)', border:`1px solid rgba(10,132,255,0.2)` }}>
 <div className="cards-node" style={{ color:'#0A84FF', fontSize:11, fontWeight:600 }}>Current: {sz.label} - {sz.note}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, marginTop:3 }}>Print on A4 {pageOrientation}. Card orientation: {orientation}. Front/back positions remain mirrored.</div>
 </div>
 </div>
 </div>
 </div>
 <div className="cards-node" style={{ marginTop:16 }}>
 <IdCardOptionsPanel
 orientation={orientation}
 setOrientation={setOrientation}
 pageOrientation={pageOrientation}
 setPageOrientation={setPageOrientation}
 options={cardOptions}
 setOptions={setCardOptions}
 />
 </div>
 </GCard>
 </div>
 )
}

//  Result Cards Tab 
function ResultCardTab({ school }) {
 const [exams, setExams] = useState([])
 const [results, setResults] = useState([])
 const [selectedExam, setSelectedExam] = useState('')
 const [selectedStudent,setSelectedStudent]= useState('')
 const [template, setTemplate] = useState('royal')
 const [loading, setLoading] = useState(false)

 const loadResults = () => {
 if (!selectedExam) return
 setLoading(true); setResults([]); setSelectedStudent('')
 api.get(`/api/exams/results/${selectedExam}`)
 .then(r => {
 const list = r.data.data || []
 setResults(list)
 const ids = [...new Set(list.map(r => r.student_id))]
 if (ids.length) setSelectedStudent(String(ids[0]))
 }).catch(()=>setResults([])).finally(()=>setLoading(false))
 }

 useEffect(() => {
 api.get('/api/exams').then(r => { const l=r.data.data||[]; setExams(l); if(l.length) setSelectedExam(String(l[0].id)) }).catch(()=>{})
 }, [])

 const students = [...new Map(results.map(r => [r.student_id, { id:r.student_id, name:r.name, gr_number:r.gr_number, father_name:r.father_name }])).values()]
 const studentMarks = results.filter(r => String(r.student_id) === selectedStudent)
 const student = students.find(s => String(s.id) === selectedStudent)
 const exam = exams.find(e => String(e.id) === selectedExam)
 const obtained = studentMarks.reduce((s,r) => s + Number(r.marks_obtained||0), 0)
 const possible = studentMarks.length * (exam?.total_marks||100)
 const pct = possible > 0 ? Math.round((obtained/possible)*100) : 0
 const previewSubjects = studentMarks.map(r => r.subject)
 const previewMarks = studentMarks.reduce((acc, r) => ({ ...acc, [r.subject]: Number(r.marks_obtained || 0) }), {})
 const previewTotal = exam?.total_marks || 100
 const previewPie = studentMarks.length ? buildDonutSVG(previewSubjects, previewMarks, previewTotal, '#0f172a') : ''

 return (
 <div className="cards-node" style={{ display:'grid', gap:24 }}>
 <GCard>
 <h3 style={{ color:C.gold, fontSize:17, margin:'0 0 4px', fontFamily:"'Playfair Display',serif" }}>Result Cards</h3>
 <p style={{ color:C.muted, fontSize:13, margin:'0 0 20px' }}>4 world-class templates. A4 portrait with pie chart, bar chart &amp; signatures.</p>

 {/* Exam + Student */}
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:14, marginBottom:20, alignItems:'flex-end' }}>
 <div><Lbl>Select Exam</Lbl>
 <Sel value={selectedExam} onChange={e=>{setSelectedExam(e.target.value);setResults([]);setSelectedStudent('')}}>
 {exams.map(e=><option key={e.id} value={e.id} style={{background:'#0a1e35',color:C.silver}}>{e.name} ({e.class})</option>)}
 </Sel>
 </div>
 <div><Lbl>Select Student</Lbl>
 <Sel value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)} disabled={!students.length}>
 {students.length ? students.map(s=><option key={s.id} value={s.id} style={{background:'#0a1e35',color:C.silver}}>{s.name} ({s.gr_number})</option>)
 : <option style={{background:'#0a1e35',color:C.silver}}>Click Load first</option>}
 </Sel>
 </div>
 <div className="cards-node" style={{ display:'flex', gap:8 }}>
 <button onClick={loadResults} disabled={loading||!selectedExam} style={{ padding:'10px 18px', borderRadius:10, background:'rgba(10,132,255,0.2)', border:`1px solid rgba(10,132,255,0.3)`, color:'#0A84FF', fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap' }}>{loading?'Loading...':'Load'}</button>
 <button onClick={()=>printResultCard(student, exam, studentMarks, template, school)} disabled={!student||!studentMarks.length} style={{ padding:'10px 18px', border:'none', borderRadius:10, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap' }}>Print</button>
 </div>
 </div>

 {/* Template Selection */}
 <div className="cards-node" style={{ marginBottom:20 }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Template Design</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
 {RESULT_TEMPLATES.map(t => <TemplateCard key={t.id} t={t} selected={template===t.id} onSelect={setTemplate}/>)}
 </div>
 </div>

 {/* Preview */}
 {student && studentMarks.length > 0 && (
 <div className="cards-node" style={{ background:'rgba(15,23,42,0.46)', borderRadius:14, padding:20, border:`1px solid ${C.border}` }}>
 <div className="cards-node" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
 <div>
 <div className="cards-node" style={{ color:C.gold, fontSize:16, fontWeight:800 }}>{student.name}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:12, marginTop:3 }}>{exam?.name} - {exam?.class}</div>
 </div>
 <div className="cards-node" style={{ display:'flex', gap:12, alignItems:'center' }}>
 <div className="cards-node" style={{ textAlign:'center' }}>
 <div className="cards-node" style={{ color:pct>=50?C.green:C.red, fontSize:30, fontWeight:900 }}>{pct}%</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11 }}>{obtained}/{possible}</div>
 </div>
 <div className="cards-node" style={{ background:pct>=50?'rgba(48,209,88,0.12)':'rgba(255,55,95,0.12)', border:`1px solid ${pct>=50?C.green:C.red}`, borderRadius:8, padding:'6px 14px', color:pct>=50?C.green:C.red, fontWeight:800 }}>{pct>=50?'PASS':'FAIL'}</div>
 </div>
 </div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'230px 1fr', gap:16, marginBottom:16 }}>
 <div className="cards-node" style={{ background:'rgba(255,255,255,0.045)', border:`1px solid ${C.border}`, borderRadius:14, padding:14, textAlign:'center' }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Pie Chart</div>
 <div dangerouslySetInnerHTML={{ __html: previewPie }} />
 </div>
 <div className="cards-node" style={{ background:'rgba(255,255,255,0.045)', border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Subject Columns</div>
 <div className="cards-node" style={{ height:170, display:'flex', alignItems:'flex-end', gap:10, padding:'10px 4px 0' }}>
 {studentMarks.map((r,i) => {
 const m = Number(r.marks_obtained||0)
 const rp = Math.round((m/previewTotal)*100)
 const col = PIE_PALETTE[i%PIE_PALETTE.length]
 return (
 <div key={`${r.subject}-col`} className="cards-node" style={{ flex:1, minWidth:0, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
 <div className="cards-node" style={{ color:col, fontSize:11, fontWeight:900 }}>{rp}%</div>
 <div className="cards-node" style={{ width:'68%', height:`${Math.max(10, rp)}%`, borderRadius:'9px 9px 3px 3px', background:`linear-gradient(180deg,${col},${col}cc)`, boxShadow:`0 8px 18px ${col}33` }} />
 <div className="cards-node" style={{ color:C.silver, fontSize:10, fontWeight:700, maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.subject}</div>
 </div>
 )
 })}
 </div>
 </div>
 </div>
 <div className="cards-node" style={{ display:'grid', gap:8 }}>
 {studentMarks.map((r,i) => {
 const m = Number(r.marks_obtained||0)
 const rp = Math.round((m/(exam?.total_marks||100))*100)
 const col = PIE_PALETTE[i%PIE_PALETTE.length]
 return (
 <div key={r.subject} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'rgba(7,30,52,0.4)' }}>
 <div className="cards-node" style={{ width:12, height:12, borderRadius:3, background:col, flexShrink:0 }}/>
 <span style={{ color:C.silver, flex:1 }}>{r.subject}</span>
 <div className="cards-node" style={{ flex:2, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
 <div className="cards-node" style={{ height:'100%', width:`${rp}%`, background:col, borderRadius:3 }}/>
 </div>
 <span style={{ color:col, fontWeight:700, minWidth:50, textAlign:'right' }}>{m}/{exam?.total_marks||100}</span>
 </div>
 )
 })}
 </div>
 </div>
 )}
 {!student && !loading && <div className="cards-node" style={{ padding:40, textAlign:'center', color:C.muted }}>Select exam, click Load, then select student</div>}
 </GCard>
 </div>
 )
}

//  Employee ID Cards Tab 
function EmployeeIdTab({ school }) {
 const [employees, setEmployees] = useState([])
 const [loading, setLoading] = useState(false)
 const [mode, setMode] = useState('all')
 const [empId, setEmpId] = useState('')
 const [dept, setDept] = useState('')
 const [template, setTemplate] = useState('corporate')
 const [size, setSize] = useState('cr80')
 const [orientation, setOrientation] = useState('portrait')
 const [pageOrientation,setPageOrientation]= useState('portrait')
 const [doubleSided, setDoubleSided] = useState(false)
 const [cardOptions, setCardOptions] = useState(defaultIdCardOptions)
 const [cardsPerPage, setCardsPerPage] = useState('')
 const [status, setStatus] = useState('')

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setLoading(true)
 api.get('/api/employees')
 .then(r => { const list = r.data.data || r.data || []; setEmployees(list); if (list.length) setDept(list[0].department || '') })
 .catch(() => setEmployees([]))
 .finally(() => setLoading(false))
 }, [])

 const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]

 const handleGenerate = async () => {
 let targets
 if (mode === 'single') {
 const q = (empId || '').trim().toLowerCase()
 const found = employees.find(e => (e.emp_id || '').toLowerCase() === q || String(e.id) === q)
 if (!found) { setStatus('Employee not found. Check Employee ID.'); return }
 targets = [found]
 } else if (mode === 'department') {
 targets = employees.filter(e => e.department === dept)
 if (!targets.length) { setStatus('No employees found in this department.'); return }
 } else {
 targets = [...employees]
 if (!targets.length) { setStatus('No employees found.'); return }
 }
 const win = openLoadingPopup('Generating cards... Please wait...')
 if (!win) {
 alert('Popup blocked! Please allow popups for this site to generate cards.')
 return
 }
 setStatus(`Generating ${targets.length} card(s)...`)
 try {
 await printCards(targets, { template, size, orientation, pageOrientation, doubleSided, cardOptions, cardsPerPage: cardsPerPage||null }, school, buildEmployeeCardFront, buildEmployeeCardBack, 'Employee ID Cards', win)
 } catch (err) {
 try { win.close() } catch {}
 throw err
 }
 setTimeout(() => setStatus(''), 3000)
 }

 const sz = CARD_SIZES.find(s => s.id === size) || CARD_SIZES[0]

 return (
 <div className="cards-node" style={{ display:'grid', gap:24 }}>
 <GCard>
 <div className="cards-node" style={{ marginBottom:18 }}>
 <h3 style={{ color:C.gold, fontSize:17, margin:'0 0 4px', fontFamily:"'Playfair Display',serif" }}>Employee ID Cards</h3>
 <p style={{ color:C.muted, fontSize:13, margin:0 }}>Generate staff / teacher ID cards with QR codes for attendance marking.</p>
 </div>

 {/* Mode Toggle */}
 <div className="cards-node" style={{ display:'flex', gap:4, background:'rgba(7,30,52,0.5)', borderRadius:10, padding:4, width:'fit-content', marginBottom:20 }}>
 {[{id:'all',label:'All Staff'},{id:'single',label:'Single'},{id:'department',label:'Department'}].map(m=>(
 <button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontWeight: 600, fontSize:13, background:mode===m.id?`linear-gradient(135deg,${C.gold},${C.goldL})`:'transparent', color:mode===m.id?'#071e34':C.muted, transition:'all 0.15s' }}>{m.label}</button>
 ))}
 </div>

 {/* Input */}
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:14, marginBottom:22, alignItems:'flex-end' }}>
 {mode === 'single' && (
 <div><Lbl>Employee ID</Lbl><Inp value={empId} onChange={e=>setEmpId(e.target.value)} placeholder="e.g. EMP-001"/></div>
 )}
 {mode === 'department' && (
 <div><Lbl>Department</Lbl>
 <Sel value={dept} onChange={e=>setDept(e.target.value)}>
 {departments.length ? departments.map(d=><option key={d} style={{background:'#0a1e35',color:C.silver}}>{d}</option>) : <option style={{background:'#0a1e35',color:C.silver}}>No departments</option>}
 </Sel>
 </div>
 )}
 {mode === 'all' && (
 <div className="cards-node" style={{ padding:'10px 14px', borderRadius:10, background:'rgba(10,132,255,0.08)', border:`1px solid rgba(10,132,255,0.2)` }}>
 <div className="cards-node" style={{ color:'#0A84FF', fontSize:12, fontWeight:600 }}>{loading ? 'Loading employees...' : `${employees.length} employee(s) found`}</div>
 </div>
 )}
 <div>
 <button onClick={handleGenerate} disabled={loading} style={{ padding:'10px 22px', border:'none', borderRadius:10, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap' }}>Generate &amp; Print</button>
 </div>
 </div>
 {status && <div className="cards-node" style={{ color:status.includes('not found')||status.includes('No ')?C.red:C.green, fontWeight:600, fontSize:13, marginBottom:16 }}>{status}</div>}

 {/* Template */}
 <div className="cards-node" style={{ marginBottom:20 }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Template Design</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12 }}>
 {ID_TEMPLATES.map(t => <TemplateCard key={t.id} t={t} selected={template===t.id} onSelect={setTemplate}/>)}
 </div>
 </div>

 {/* Size & Options */}
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
 <div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Card Size</div>
 <div className="cards-node" style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
 {CARD_SIZES.map(s => (
 <div key={s.id} onClick={()=>setSize(s.id)} style={{ cursor:'pointer', padding:'10px 14px', borderRadius:12, border:`1.5px solid ${size===s.id?C.gold:C.border}`, background:size===s.id?'rgba(200,153,26,0.1)':'rgba(15,23,42,0.38)', transition:'all 0.15s' }}>
 <div className="cards-node" style={{ color:size===s.id?C.gold:C.silver, fontWeight:700, fontSize:13 }}>{s.label}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, marginTop:2 }}>{s.desc}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:10, marginTop:1 }}>{s.note}</div>
 </div>
 ))}
 </div>
 </div>
 <div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Print Options</div>
 <div className="cards-node" style={{ display:'flex', flexDirection:'column', gap:10 }}>
 {[{id:false,label:'Single Sided',desc:'Front side only'},{id:true,label:'Double Sided',desc:'Front + Back - 2 pages'}].map(o=>(
 <div key={String(o.id)} onClick={()=>setDoubleSided(o.id)} style={{ cursor:'pointer', padding:'12px 16px', borderRadius:12, border:`1.5px solid ${doubleSided===o.id?C.gold:C.border}`, background:doubleSided===o.id?'rgba(200,153,26,0.1)':'rgba(15,23,42,0.38)', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}>
 <div className="cards-node" style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${doubleSided===o.id?C.gold:C.border}`, background:doubleSided===o.id?C.gold:'', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
 {doubleSided===o.id && <div className="cards-node" style={{ width:8, height:8, borderRadius:'50%', background:'#071e34' }}/>}
 </div>
 <div>
 <div className="cards-node" style={{ color:doubleSided===o.id?C.gold:C.silver, fontWeight:700, fontSize:13 }}>{o.label}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11 }}>{o.desc}</div>
 </div>
 </div>
 ))}
 {/* Cards per page selector */}
 <div className="cards-node" style={{ padding:'10px 14px', borderRadius:12, background:'rgba(15,23,42,0.5)', border:`1px solid ${C.border}` }}>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Cards per A4 Page</div>
 <div className="cards-node" style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
 {['Auto','1','2','3','4','6','8','9'].map(v=>(
 <button key={v} onClick={()=>setCardsPerPage(v==='Auto'?'':v)}
 style={{ padding:'6px 13px', borderRadius:8, border:`1.5px solid ${(v==='Auto'?'':v)===cardsPerPage?C.gold:C.border}`, background:(v==='Auto'?'':v)===cardsPerPage?'rgba(200,153,26,0.16)':'rgba(15,23,42,0.6)', color:(v==='Auto'?'':v)===cardsPerPage?C.gold:C.muted, fontWeight:700, fontSize:12, cursor:'pointer', minWidth:40, transition:'all .15s' }}
 >{v}</button>
 ))}
 </div>
 {doubleSided && <div className="cards-node" style={{ color:'#4CAF8B', fontSize:10, fontWeight:600 }}> Double-sided: each employee's front &amp; back print on same page position.</div>}
 </div>
 <div className="cards-node" style={{ padding:'10px 14px', borderRadius:10, background:'rgba(10,132,255,0.08)', border:`1px solid rgba(10,132,255,0.2)` }}>
 <div className="cards-node" style={{ color:'#0A84FF', fontSize:11, fontWeight:600 }}>Current: {sz.label} - {sz.note}</div>
 <div className="cards-node" style={{ color:C.muted, fontSize:11, marginTop:3 }}>Print on A4 {pageOrientation}. Card orientation: {orientation}. Front/back positions remain mirrored.</div>
 </div>
 </div>
 </div>
 </div>
 <div className="cards-node" style={{ marginTop:16 }}>
 <IdCardOptionsPanel
 orientation={orientation}
 setOrientation={setOrientation}
 pageOrientation={pageOrientation}
 setPageOrientation={setPageOrientation}
 options={cardOptions}
 setOptions={setCardOptions}
 />
 </div>
 </GCard>
 </div>
 )
}

//  Main Module 
export default function CardsGeneratorModule() {
 const [tab, setTab] = useState('student-id')
 const { paperSettings } = usePaperStore()

 const school = {
 schoolName: (paperSettings.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase(),
 schoolUrdu: paperSettings.schoolUrdu || (paperSettings.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase(),
 address: paperSettings.address || '',
 phone: paperSettings.phone || '',
 logo: paperSettings.logo || paperSettings.schoolLogo || '',
 principalSignature: paperSettings.principalSignature || '',
 showUrduHeader: paperSettings.showUrduHeader !== false,
 }

 const TABS = [
 { id:'student-id', label:'Student ID Cards' },
 { id:'employee-id', label:'Employee ID Cards' },
 { id:'result-card', label:'Result Cards' },
 ]

 return (
 <div className="cards-node" style={{ minHeight:'100vh', background:C.bg, color:C.silver, padding:24, fontFamily:"var(--font-body, 'DM Sans', Arial, sans-serif)" }}>
 <div className="cards-node" style={{ maxWidth:1100, margin:'0 auto', display:'grid', gap:22 }}>

 {/* Header */}
 <GCard style={{ padding:'18px 24px', display:'flex', alignItems:'center', gap:16 }}>
 <div className="cards-node" style={{ width:50, height:50, borderRadius:15, background:'rgba(200,153,26,0.16)', border:`1px solid rgba(200,153,26,0.35)`, display:'grid', placeItems:'center', fontSize:20, color:C.gold, fontWeight:900 }}>ID</div>
 <div>
 <h1 style={{ margin:0, fontSize:24, color:'#fff', fontFamily:"'Playfair Display',serif", fontWeight:800 }}>Cards Generator</h1>
 <p style={{ margin:'4px 0 0', color:C.muted, fontSize:13 }}>World-class Student ID cards &amp; Result cards with live print preview</p>
 </div>
 </GCard>

 {/* Tabs */}
 <div className="cards-node" style={{ display:'flex', gap:8 }}>
 {TABS.map(t => (
 <button key={t.id} onClick={()=>setTab(t.id)} style={{
 padding:'11px 24px', borderRadius:12, border: tab===t.id?'none':`1px solid ${C.border}`, cursor:'pointer', fontWeight: 600, fontSize:14, transition:'all 0.18s',
 background: tab===t.id?`linear-gradient(135deg,${C.gold},${C.goldL})`:'rgba(15,23,42,0.46)',
 color: tab===t.id?'#071e34':C.silver,
 }}>{t.label}</button>
 ))}
 </div>

 {/* Content */}
 {tab === 'student-id' && <StudentIdTab school={school}/>}
 {tab === 'employee-id' && <EmployeeIdTab school={school}/>}
 {tab === 'result-card' && <ResultCardTab school={school}/>}
 </div>
 </div>
 )
}



