import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {resultCardPrintCss as legacyCss} from './resultCardTemplates'
import {ResultCardPreview} from './premiumResultCardTemplates'

export const resultCardPrintCss = legacyCss + `
/* Premium A4 foundations: subtle borders, larger branding, minimal ink */
 .premium-card { --navy:#19364D; --silver:#DDE5EB; --accent:#2E7B9D; border:0.2mm solid #E0E8EE; padding:11mm 12mm; color:#19364D; }
 .premium-card .premium-topline { display:flex; justify-content:space-between; gap:2mm; margin-bottom:5mm; padding-bottom:2mm; border-bottom:0.2mm solid #DBE5EB; font-size:7pt; font-weight:700; letter-spacing:1px; color:var(--accent); }
 .premium-card .rc-standard-header { align-items:center; gap:4mm; margin-bottom:5mm; }
 .premium-card .rc-urdu-title { direction:rtl; unicode-bidi:isolate; align-self:stretch; text-align:center; line-height:1.65; font-size:10.2pt; margin-bottom:1mm; overflow:visible; }
 .premium-card .rc-header-center { align-items:flex-start; text-align:left; }
 .premium-card .rc-header-logo { width:26mm; height:26mm; background:transparent; }
 .premium-card .rc-header-logo img { background:transparent; object-fit:contain; border:0; }
 .premium-card .rc-school-name { font-size:19pt; letter-spacing:0; line-height:1.05; }
 .premium-card .rc-school-name .rc-brand-sub { font-size:0.67em; margin-top:1mm; }
 .premium-card .rc-school-address { font-size:7pt; margin:2mm 0 0; color:#53697A; }
 .premium-card .rc-urdu-title { font-size:10pt; }
 .premium-card .rc-report-title { font-size:8pt; letter-spacing:1px; padding:0; border-radius:0; color:var(--accent); background:transparent; box-shadow:none; margin-top:2mm; }
 .premium-card .rc-header-photo .rc-photo { background:#F8FAFB; border:0.2mm solid #D8E2EB; border-radius:1mm; }
 .premium-card .rc-student-info { gap:1.3mm; margin-bottom:4mm; }
 .premium-card .rc-student-info div { background:transparent; border:0; border-bottom:0.2mm solid #DBE5EB; padding:1.6mm 1mm; min-height:8.5mm; }
 .premium-card .rc-student-info span { font-size:6.2pt; color:#62788A; }
 .premium-card .rc-student-info strong { font-size:8.5pt; color:#1F4057; }
 .premium-card .rc-marks-table { border-collapse:collapse; margin-bottom:4mm; }
 .premium-card .rc-marks-table th { background:#F0F5F8; color:#243E52; border:0; border-top:0.3mm solid #C5D7E2; border-bottom:0.25mm solid #C5D7E2; padding:2.3mm 0.9mm; font-size:7pt; font-weight:750; }
 .premium-card .rc-marks-table td { background:transparent !important; border:0; border-bottom:0.2mm solid #E0E8ED; padding:2mm 0.85mm; font-size:7.5pt; color:#243E52; }
 .premium-card .rc-marks-table .total-row td { background:#F2F7F9 !important; border-top:0.3mm solid #BDCFDA; font-weight:800; }
 .premium-card .rc-marks-table th:first-child, .premium-card .rc-marks-table td:first-child { width:28mm; }
 .premium-card .rc-remarks { background:transparent; border:0; border-left:0.7mm solid var(--accent); padding:1.7mm 3mm; margin-bottom:3mm; min-height:10mm; }
 .premium-card .rc-footer { color:#455F72; }
 .premium-card .premium-analytics { display:grid; grid-template-columns:1.5fr 0.85fr; gap:3mm; margin:0 0 4mm; }
 .premium-card .premium-analytics.premium-reverse { grid-template-columns:0.85fr 1.5fr; }
 .premium-card .rc-chart-card { border:0.2mm solid #D9E4EB; background:transparent; min-height:36mm; padding:3mm; }
 .premium-card .rc-chart-card h3 { margin:0 0 3mm; font-size:7.5pt; color:#274154; letter-spacing:0.5px; text-transform:uppercase; }
 .premium-card .premium-bar-list { display:flex; flex-direction:column; gap:1.6mm; }
 .premium-card .premium-bar-item { display:grid; grid-template-columns:minmax(17mm,34mm) minmax(13mm,1fr) 9mm; align-items:center; gap:2mm; font-size:7pt; line-height:1.2; }
 .premium-card .premium-bar-name { overflow-wrap:anywhere; }
 .premium-card .premium-bar-track { display:block; height:1.65mm; background:#E5EDF2; border-radius:2mm; overflow:hidden; }
 .premium-card .premium-bar-fill { display:block; height:100%; background:var(--accent); border-radius:2mm; }
 .premium-card .premium-bar-item b { text-align:right; font-variant-numeric:tabular-nums; font-size:7pt; }
 .premium-card .premium-summary-chart { text-align:center; }
 .premium-card .premium-donut { display:block; width:33mm; height:33mm; margin:0 auto; max-width:100%; }
 .premium-card .premium-donut-value { font-size:6.5px; font-weight:800; fill:#223E53; }
 .premium-card .premium-donut-label { font-size:2.8px; fill:#718494; }
 .premium-card .premium-chart-caption { font-size:6.8pt; color:#607484; margin:1mm auto 0; }
 .premium-signature { --accent:#356F95; font-family:Georgia,'Times New Roman',serif; }
 .premium-signature .rc-school-name, .premium-signature .rc-marks-table, .premium-signature .rc-student-info, .premium-signature .premium-analytics { font-family:Arial,Helvetica,sans-serif; }
 .premium-signature .premium-topline { border-bottom:0.3mm solid #B7C9D6; }
 .premium-swiss { --accent:#1674D0; --navy:#183B5D; font-family:Arial,Helvetica,sans-serif; border-left:1.6mm solid #1674D0; }
 .premium-swiss .rc-school-name { font-size:20pt; }
 .premium-swiss .premium-topline { border-bottom:0.6mm solid var(--accent); }
 .premium-swiss-band { background:#F0F6FC; padding:1.7mm; margin:0.8mm 0 1.4mm; color:#24557C; font-size:7pt; font-weight:800; letter-spacing:0.5px; }
 .premium-swiss .premium-bar-track, .premium-swiss .premium-bar-fill { border-radius:0; }
 .premium-atelier { --accent:#168F9E; --navy:#1D4854; font-family:'Helvetica Neue',Arial,sans-serif; border-top:1mm solid #168F9E; }
 .premium-atelier .rc-standard-header { border-bottom:0.2mm solid #D5E5E8; padding-bottom:3mm; }
 .premium-atelier .rc-school-name { font-size:18pt; }
 .premium-atelier .rc-student-info div { background:#F3F8F8; border:0; padding:2mm; }
 .premium-atelier .rc-marks-table th { background:#EAF5F5; color:#20525B; }
 .premium-section-label { margin:1mm 0 2mm; font-size:7pt; font-weight:800; letter-spacing:1px; color:#247785; }
 /* Six independent premium editorial architectures — economical white-page ink */
 .premium-regal { --accent:#9D8250; --navy:#283950; font-family:Georgia,'Times New Roman',serif; border:0.25mm solid #C8B78B; border-top:0.75mm double #B29A63; }
 .premium-regal .rc-school-name { font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:18.4pt; letter-spacing:-.2px; }
 .premium-regal .rc-standard-header { border-bottom:0.25mm solid #CEBB90; padding-bottom:2mm; }
 .premium-regal .rc-marks-table th { background:#F9F6EF; border-color:#D1C5A8; }
 .premium-regal .rc-chart-card { border-color:#E5DCCA; }
 .premium-regal-crown,.premium-regal-heading { display:flex; justify-content:space-between; font-size:7.1pt; letter-spacing:1.1px; font-weight:700; color:#775F34; padding:1.3mm 1.5mm; }
 .premium-regal-crown { border-bottom:0.2mm solid #D9CBAB; margin-bottom:3mm; }
 .premium-regal-heading { border-left:0.9mm solid #AE925D; background:#FAF8F3; margin-bottom:2mm; }
 .premium-young { --accent:#189EA5; --navy:#19445E; font-family:Arial,Helvetica,sans-serif; border-top:1mm solid #4AB7C0; }
 .premium-young .rc-school-name { font-size:18.7pt; font-weight:850; }
 .premium-young .rc-report-title { color:#14848F; }
 .premium-young .rc-student-info div { background:#F5FBFB; border-radius:1.4mm; border:0.2mm solid #DAEBEC; }
 .premium-young .rc-marks-table th { background:#E9F7F6; }
 .premium-young .rc-chart-card { border-radius:2mm; border-color:#D4E9E9; }
 .premium-young .rc-student-info { margin-bottom:2mm; }
 .premium-young .rc-student-info div { min-height:6.8mm; padding:0.7mm 1mm; }
 .premium-young-tokens { display:flex; gap:2mm; margin-bottom:1.2mm; font-size:6pt; font-weight:800; letter-spacing:0.7px; }
 .premium-young-tokens span { padding:0.7mm 2.4mm; border-radius:4mm; border:0.2mm solid #D7E8E7; color:#2B8590; }
 .premium-young-tokens span:nth-child(2) { color:#C47E5F; border-color:#F0E2D7; }
 .premium-young-tokens span:nth-child(3) { color:#628E66; border-color:#D8E9DB; }
 .premium-young-section { margin:0.4mm 0 0.7mm; display:flex; gap:2.6mm; align-items:center; font-size:7.3pt; font-weight:800; color:#266D7F; }
 .premium-young-section b { padding:0.8mm 1.5mm; border:0.2mm solid #9FCED0; border-radius:1mm; }
 .premium-heritage { --accent:#3C7657; --navy:#234434; font-family:Georgia,'Times New Roman',serif; border:0.4mm double #99B5A0; }
 .premium-heritage .rc-school-name { font-family:Georgia,serif; font-size:18.5pt; color:#254B38; }
 .premium-heritage .rc-standard-header { justify-content:center; border-bottom:0.3mm double #9FB6A7; padding-bottom:2mm; }
 .premium-heritage .rc-marks-table th { background:#F1F7F2; color:#2A5840; border-color:#ABC3B2; }
 .premium-heritage .rc-chart-card { border:0; border-top:0.2mm solid #B8D2C2; }
 .premium-heritage-seal { display:flex; gap:3mm; justify-content:center; align-items:center; font-size:7.3pt; letter-spacing:1px; color:#507C5A; margin:0 0 2.5mm; }
 .premium-heritage-rule { font-size:7pt; font-weight:700; letter-spacing:0.7px; text-align:center; border-bottom:0.2mm solid #A5C0AE; padding:1mm; margin-bottom:2mm; color:#426B4D; }
 .premium-airframe { --accent:#368AAB; --navy:#254257; font-family:Arial,Helvetica,sans-serif; border-left:0.4mm solid #CFDFE9; border-top:0; }
 .premium-airframe .rc-standard-header { padding-left:3mm; border-left:1mm solid #368AAB; }
 .premium-airframe .rc-school-name { font-size:19.5pt; font-weight:900; letter-spacing:-0.45px; }
 .premium-airframe .rc-marks-table th { background:#F1F7FA; border-top:0; }
 .premium-airframe .premium-bar-fill { border-radius:0; }
 .premium-airframe-axis { display:flex; justify-content:space-between; border-bottom:0.2mm dashed #B4CAD5; font-size:6.6pt; color:#527F9D; letter-spacing:1.15px; margin-bottom:4mm; padding-bottom:1.5mm; }
 .premium-airframe-title { display:flex; justify-content:space-between; font-size:7.3pt; font-weight:800; letter-spacing:1.5px; color:#287C9A; margin:1.5mm 0 2mm; }
 .premium-airframe-title b { color:#AAC5D6; }
 .premium-ledger { --accent:#657488; --navy:#223244; font-family:'Helvetica Neue',Arial,sans-serif; border:0.2mm solid #BBC8D2; }
 .premium-ledger .rc-school-name { font-size:18.8pt; font-weight:900; color:#243A50; }
 .premium-ledger .rc-report-title { text-transform:uppercase; letter-spacing:1.4px; }
 .premium-ledger .rc-marks-table th { background:#EEF2F5; border-color:#BDCBD5; text-transform:uppercase; }
 .premium-ledger .rc-marks-table td { border-bottom:0.2mm dotted #C8D4DD; }
 .premium-ledger .rc-chart-card { border:0; border-left:0.3mm solid #BDCBD5; }
 .premium-ledger-top,.premium-ledger-overview { display:flex; justify-content:space-between; align-items:center; text-transform:uppercase; letter-spacing:0.75px; font-size:7pt; color:#5A6B79; }
 .premium-ledger-top { border-bottom:0.4mm solid #485D72; padding-bottom:2mm; margin-bottom:3mm; }
 .premium-ledger-overview { background:#F0F4F6; padding:1.7mm 2mm; margin:1mm 0 2mm; }
 .premium-dossier { --accent:#356E95; --navy:#193E5A; font-family:Arial,Helvetica,sans-serif; border:0.4mm solid #A5BFD1; }
 .premium-dossier .rc-school-name { font-size:18.7pt; font-weight:800; }
 .premium-dossier .rc-standard-header { background:#F8FAFC; border:0.2mm solid #E0E9F0; padding:1mm; }
 .premium-dossier .rc-marks-table th { background:#E8F2F8; color:#204F70; }
 .premium-dossier .rc-student-info div { border-left:0.5mm solid #B3CAD9; padding-left:2mm; }
 .premium-dossier .rc-chart-card { border:0.2mm dashed #B3C9D8; }
 .premium-dossier-top { display:flex; justify-content:space-between; border-bottom:0.55mm solid #376D91; padding-bottom:2mm; margin-bottom:3mm; letter-spacing:1px; font-size:7pt; color:#285C7C; }
 .premium-dossier-label { padding:0.65mm 1.5mm; margin:0.2mm 0 0.7mm; font-size:7pt; font-weight:800; letter-spacing:.9px; color:#305D7C; border-left:1mm solid #6394B4; background:#F1F7FB; }
 /* Long subject names (including RTL) need balanced density to avoid clipping.
    Keep ALL marks and analytics visible; never shrink the full A4 via CSS zoom. */
 .premium-card.premium-dense { padding:8mm 10mm; }
 .premium-card.premium-dense .rc-standard-header { margin-bottom:2.2mm; }
 .premium-card.premium-dense .rc-header-logo { width:22mm; height:22mm; }
 .premium-card.premium-dense .rc-school-name { font-size:16pt; }
 .premium-card.premium-dense .rc-student-info { margin-bottom:2mm; gap:0.5mm; }
 .premium-card.premium-dense .rc-student-info div { min-height:6.5mm; padding:0.65mm 1mm; }
 .premium-card.premium-dense .rc-marks-table { margin-bottom:2mm; table-layout:fixed; }
 .premium-card.premium-dense .rc-marks-table th:first-child,
 .premium-card.premium-dense .rc-marks-table td:first-child { width:48mm; overflow-wrap:anywhere; }
 .premium-card.premium-dense .rc-marks-table th { padding:0.75mm 0.5mm; font-size:6.1pt; line-height:1.08; }
 .premium-card.premium-dense .rc-marks-table td { padding:0.6mm 0.5mm; font-size:6.6pt; line-height:1.06; }
 .premium-card.premium-dense .premium-analytics { margin-bottom:1.7mm; gap:1.4mm; }
 .premium-card.premium-dense .rc-chart-card { padding:1.5mm; min-height:26mm; }
 .premium-card.premium-dense .rc-chart-card h3 { margin-bottom:1mm; font-size:6.8pt; }
 .premium-card.premium-dense .premium-bar-list { gap:0.38mm; }
 .premium-card.premium-dense .premium-bar-item { grid-template-columns:47mm minmax(12mm,1fr) 9mm; gap:0.8mm; font-size:6.1pt; line-height:1.06; }
 .premium-card.premium-dense .premium-bar-item b { font-size:6.2pt; }
 .premium-card.premium-dense .premium-donut { width:27mm; height:27mm; }
 .premium-card.premium-dense .premium-chart-caption { font-size:6.1pt; }
 .premium-card.premium-dense .rc-remarks { margin-bottom:1mm; padding:1mm 2mm; min-height:5mm; }
 .premium-card.premium-dense .rc-signatures { margin-bottom:0; padding:0 1mm; }
 .premium-card.premium-dense .rc-footer { padding-top:0; }
 .premium-card.premium-dense .rc-footer p { padding-top:0.7mm; }
 .premium-card.premium-dense .premium-topline,
 .premium-card.premium-dense .premium-regal-crown,
 .premium-card.premium-dense .premium-heritage-seal,
 .premium-card.premium-dense .premium-airframe-axis,
 .premium-card.premium-dense .premium-ledger-top,
 .premium-card.premium-dense .premium-dossier-top { margin-bottom:1mm; }
 .premium-card.premium-dense .premium-swiss-band,
 .premium-card.premium-dense .premium-section-label,
 .premium-card.premium-dense .premium-heritage-rule,
 .premium-card.premium-dense .premium-airframe-title,
 .premium-card.premium-dense .premium-ledger-overview,
 .premium-card.premium-dense .premium-dossier-label,
 .premium-card.premium-dense .premium-young-section { padding-top:0.5mm; padding-bottom:0.5mm; margin-top:0; margin-bottom:0.5mm; }
 /* Five simultaneous term columns: meaningful compact labels and readable cells. */
 .premium-card.premium-multi-term .rc-marks-table th { letter-spacing:0; overflow-wrap:anywhere; padding-inline:0.4mm; font-size:6.3pt; }
 .premium-card.premium-multi-term .rc-marks-table td { padding-inline:0.4mm; font-variant-numeric:tabular-nums; }
 .premium-card.premium-multi-term .rc-marks-table th:first-child,
 .premium-card.premium-multi-term .rc-marks-table td:first-child { width:31mm; }
 .premium-card.premium-multi-term.premium-dense .rc-marks-table th:first-child,
 .premium-card.premium-multi-term.premium-dense .rc-marks-table td:first-child { width:39mm; }
 /* Very large subject tables stay readable and complete; no content is hidden. */
 .premium-card.premium-ultra-dense { padding:6mm 8mm; }
 .premium-card.premium-ultra-dense .rc-standard-header { margin-bottom:1mm; gap:2mm; }
 .premium-card.premium-ultra-dense .rc-header-logo { width:16mm; height:16mm; }
 .premium-card.premium-ultra-dense .rc-photo { width:15mm; height:18mm; }
 .premium-card.premium-ultra-dense .rc-school-name { font-size:14.5pt; line-height:1.05; }
 .premium-card.premium-ultra-dense .rc-school-address { font-size:6.2pt; margin:1mm 0; }
 .premium-card.premium-ultra-dense .rc-report-title { font-size:7pt; padding:2px 9px; margin-top:0.5mm; }
 .premium-card.premium-ultra-dense .rc-student-info { margin-bottom:1mm; gap:0.25mm; }
 .premium-card.premium-ultra-dense .rc-student-info div { min-height:5.3mm; padding:0.4mm 0.8mm; }
 .premium-card.premium-ultra-dense .rc-student-info span { font-size:5.8pt; margin-bottom:0.3mm; }
 .premium-card.premium-ultra-dense .rc-student-info strong { font-size:7pt; line-height:1.05; }
 .premium-card.premium-ultra-dense .rc-marks-table { margin-bottom:1.2mm; }
 .premium-card.premium-ultra-dense .rc-marks-table th { font-size:6pt; padding:0.5mm 0.4mm; line-height:1; }
 .premium-card.premium-ultra-dense .rc-marks-table td { font-size:6.3pt; padding:0.3mm 0.4mm; line-height:1; }
 .premium-card.premium-ultra-dense .premium-analytics { margin-bottom:0.6mm; gap:0.8mm; }
 .premium-card.premium-ultra-dense .rc-chart-card { padding:0.7mm; min-height:20mm; }
 .premium-card.premium-ultra-dense .rc-chart-card h3 { font-size:6.2pt; margin-bottom:0.4mm; }
 .premium-card.premium-ultra-dense .premium-bar-list { gap:0.1mm; }
 .premium-card.premium-ultra-dense .premium-bar-item { font-size:5.9pt; grid-template-columns:47mm minmax(12mm,1fr) 8mm; gap:0.6mm; line-height:1.04; }
 .premium-card.premium-ultra-dense .premium-bar-item b { font-size:6pt; }
 .premium-card.premium-ultra-dense .premium-donut { width:24mm; height:24mm; }
 .premium-card.premium-ultra-dense .premium-chart-caption { font-size:5.9pt; line-height:1.1; }
 .premium-card.premium-ultra-dense .rc-remarks { padding:0.5mm 1mm; margin-bottom:0.7mm; }
 .premium-card.premium-ultra-dense .rc-remarks strong { font-size:7pt; }
 .premium-card.premium-ultra-dense .rc-remarks p { font-size:6.5pt; line-height:1.14; margin:0.4mm 0 0; }
 .premium-card.premium-ultra-dense .rc-signatures { gap:3mm; padding:0 2mm; margin-bottom:0.8mm; }
 .premium-card.premium-ultra-dense .rc-signatures span { font-size:7pt; padding-top:0.5mm; }
 .premium-card.premium-ultra-dense .rc-signatures span > div[style] { max-height:25px; }
 .premium-card.premium-ultra-dense .rc-footer p { font-size:6.1pt; padding-top:0.3mm; border-top-width:0.8mm; }
 /* Dense multi-subject A4: compact without removing labels or records */
 .premium-card .rc-marks-table td { padding:1.1mm 0.8mm; font-size:7.25pt; line-height:1.12; }
 .premium-card .rc-marks-table th { padding:1.35mm 0.8mm; line-height:1.12; }
 .premium-card .rc-student-info div { min-height:7.5mm; padding:1mm 1mm; }
 .premium-card .premium-bar-list { gap:0.95mm; }
 .premium-card .rc-attendance { margin-bottom:3mm; }
 .premium-card .rc-signatures { margin-bottom:2mm; padding:0 5mm; }
 .premium-card .rc-footer p { border-top:0.25mm solid #CDDDE6; padding-top:1.5mm; }

`

export function openResultPrintWindow(data, exportMode = false) {
 const cards = Array.isArray(data) ? data : [data]
 const first = cards[0]
 if (!first) return
 const pageRule = first.options.orientation === 'landscape'
 ? '@page { size: A4 landscape; margin: 0; }'
 : '@page { size: A4 portrait; margin: 0; }'
 const cardMarkup = cards.map(card => renderToStaticMarkup(createElement(ResultCardPreview, {data:card}))).join('')
 const title = cards.length > 1 ? `Result Cards - ${cards.length} Students` : `Result Card - ${first.student.name}`
 const batchCss = `
 .result-card-a4 { page-break-after: always; break-after: page; }
 .result-card-a4:last-child { page-break-after: auto; break-after: auto; }
 `
 const safeTitle = title.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
 // Document fonts and configured school emblems must resolve before invoking
 // browser printing. Never substitute a different organization's artwork.
 const printReadyScript = `<script>
 (function(){
  var finished=false, started=false;
  function blocked(message){
   if(finished)return;finished=true;
   var status=document.getElementById('result-print-status');
   status.textContent=message;status.style.display='block';
  }
  async function finish(){
   if(started||finished)return;started=true;
   try{if(document.fonts&&document.fonts.ready){
    await Promise.race([document.fonts.ready,new Promise(function(resolve){setTimeout(resolve,6000)})]);
   }}catch(e){}
   if(finished)return;
   var logos=Array.from(document.querySelectorAll('img[data-result-school-logo]'));
   if(logos.some(function(img){return !img.complete||img.naturalWidth===0;})){
    blocked('School logo could not load from SaaS settings. Check the configured logo link, then reopen the result card. Printing was paused to avoid incorrect cards.');
    return;
   }
   var cards=Array.from(document.querySelectorAll('.result-card-a4'));
   var badCard=cards.findIndex(function(card){
    if(card.scrollHeight>card.clientHeight+2||card.scrollWidth>card.clientWidth+2)return true;
    var footer=card.querySelector('.rc-footer');
    if(footer&&footer.getBoundingClientRect().bottom>card.getBoundingClientRect().bottom+1)return true;
    var fields=Array.from(card.querySelectorAll('.rc-marks-table th,.rc-marks-table td,.rc-student-info strong,.premium-bar-name,.rc-remarks p'));
    return fields.some(function(field){return field.scrollWidth>field.clientWidth+2||field.scrollHeight>field.clientHeight+2;});
   });
   if(badCard!==-1){
    blocked('Result card '+(badCard+1)+' exceeds its A4 print area. No content will be silently cropped. Reduce unusually long feedback or use fewer printed term columns, then reopen print.');
    return;
   }
   if(typeof window.print!=='function'){
    blocked('No system print service is available in this browser. Open the result card on a computer with a configured USB or network printer, or use a browser with Print support.');
    return;
   }
   // Browser/operating system owns the printer picker and driver; never hardcode
   // a school printer, fabricate a device list, or silently spool a job remotely.
   finished=true;window.focus();window.print();
  }
  var logoError='School logo could not load from SaaS settings. Check the configured logo link, then reopen the result card. Printing was paused to avoid incorrect cards.';
  Array.from(document.querySelectorAll('img[data-result-school-logo]')).forEach(function(img){
   if(img.complete&&img.naturalWidth===0)blocked(logoError);
   img.addEventListener('error',function(){blocked(logoError)},{once:true});
  });
  window.addEventListener('load',finish);
  if(document.readyState==='complete')setTimeout(finish,0);
  setTimeout(function(){blocked('Some result card assets are still loading. Verify the school logo in SaaS settings and retry opening print.');},9500);
 })();
 </script>`
 const html = `<!doctype html><html><head><meta charset="UTF-8"><title>${safeTitle}</title><style>${resultCardPrintCss.replace('@page { size: A4; margin: 0; }', pageRule)}${batchCss}#result-print-status{display:none;margin:12px;padding:12px;border:1px solid #B45309;color:#92400E;background:#FFFBEB;font:14px Arial,sans-serif;}@media print{#result-print-status{display:none!important}}</style></head><body><div id="result-print-status" role="alert"></div>${cardMarkup}${printReadyScript}</body></html>`
 const w = window.open('', '_blank', 'width=1100,height=900')
 if (!w) { window.alert('Your browser blocked the print window. Allow pop-ups for this SaaS site and retry.'); return false }
 w.document.write(html)
 w.document.close()
 if (exportMode) w.document.title = cards.length > 1 ? `Export PDF - ${cards.length} Result Cards` : `Export PDF - ${first.student.name}`
}
