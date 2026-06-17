
# CR80 portrait = 54mm wide, 85.6mm tall
# Layout budget:
#   Header   = 18mm  (logo left + school name centered, both prominent)
#   Main     = fills the rest
#   Footer   = 6mm   (absolute, at bottom)

NEW_CSS = r'''function idCardPrintCss(opts) {
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

    /* ── BASE CARD ── */
    .id-card{width:var(--card-w);height:var(--card-h);border-radius:var(--radius);overflow:hidden;position:relative;font-family:'DM Sans',Arial,sans-serif;display:flex;flex-direction:column;break-inside:avoid;background:#fff;border:.3mm solid #B8C8D8;box-shadow:0 2mm 8mm rgba(15,23,42,.28),inset 0 .25mm 0 rgba(255,255,255,.7)}
    .id-card::after{content:"";position:absolute;inset:.5mm;border-radius:calc(var(--radius) - .5mm);border:.15mm solid rgba(255,255,255,.45);pointer-events:none;z-index:8}
    .design-arc,.design-ribbon,.hologram,.id-topline,.security-strip{position:absolute;pointer-events:none}
    .id-card.front header,.id-card.front main,.id-card.front footer{position:relative;z-index:4}
    .id-card.back>*:not(.design-arc):not(.design-ribbon){position:relative;z-index:4}
    .smart-chip,.hologram{display:none}

    /* ── UNIVERSAL HEADER (all templates) ──
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

    /* ── SHARED PHOTO ── */
    .photo{object-fit:cover;background:#E8EEF8}
    .photo-fallback{display:flex;align-items:center;justify-content:center;font-weight:900;font-size:7mm;color:#13224A;background:linear-gradient(145deg,#E8EEF8,#F0F4FB)}

    /* ── GRADE BADGE ── */
    .grade-badge{font-size:2mm;font-weight:900;border-radius:99mm;padding:.8mm 2mm;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:30mm;background:#FF7900;color:#fff;border:.25mm solid rgba(255,255,255,.5);box-shadow:0 .6mm 1.5mm rgba(0,0,0,.25);display:inline-block;margin-top:1.2mm}

    /* ── SHARED DATA SECTION ── */
    .data-section h3{font-size:3.6mm;font-weight:950;line-height:1.05;margin-bottom:.5mm;color:#13224A}
    .data-section p{font-size:2.1mm;margin-bottom:1.2mm;color:#556070;font-weight:700}
    .field-grid{display:grid;gap:.9mm}
    .field-grid div{background:rgba(255,255,255,.94);border:.18mm solid #dde4ee;border-radius:1.3mm;padding:.7mm .9mm;min-width:0;box-shadow:0 .4mm 1mm rgba(15,23,42,.07)}
    .field-grid label{display:block;font-size:1.35mm;text-transform:uppercase;font-weight:900;letter-spacing:.1mm;color:#6070A0;margin-bottom:.25mm;line-height:1}
    .field-grid b{display:block;font-size:1.9mm;font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0F172A}

    /* ── SHARED FOOTER (absolute, always at bottom) ── */
    .id-card.front footer{position:absolute;left:3mm;right:3mm;bottom:2mm;height:5.5mm;display:flex;align-items:center;gap:1.5mm;padding:0;background:transparent;z-index:7;border:none}
    .barcode-wrap{display:block;flex:1;min-width:0;height:5mm;padding:.4mm .7mm;border-radius:.9mm;background:rgba(255,255,255,.96);border:.18mm solid rgba(19,34,74,.2);overflow:hidden}
    .barcode-wrap svg{height:4mm!important;width:100%!important}
    .id-qr{width:6mm;height:6mm;flex:none;object-fit:contain;background:white;border:.2mm solid #13224A;border-radius:.8mm;padding:.3mm}
    .qr-fallback{display:flex;align-items:center;justify-content:center;color:#0B1F3A;font-size:1.8mm;font-weight:900}

    /* ── BACK CARD ── */
    .id-card.back{background:#fff;color:#16213F}
    .security-strip{height:5mm;flex-shrink:0;background:#13224A;border-bottom:.8mm solid #FF7900}
    .back-head{display:flex;align-items:center;gap:2mm;padding:2.5mm 3.5mm 1.5mm}
    .back-head strong{font-size:2.8mm;text-transform:uppercase;line-height:1.1}
    .back-head small{display:block;font-size:1.8mm;opacity:.65}
    .terms{padding:1mm 3.5mm 1.5mm}
    .terms h4{font-size:2.8mm;margin-bottom:1mm}
    .terms ul{padding-left:3.5mm}
    .terms li{font-size:1.9mm;line-height:1.4;margin-bottom:.6mm}
    .back-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.2mm 3mm;padding:1.5mm 3.5mm}
    .back-grid div{min-width:0}
    .back-grid label{display:block;font-size:1.4mm;opacity:.55;text-transform:uppercase;font-weight:900;letter-spacing:.1mm}
    .back-grid strong{display:block;font-size:2mm;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .back-bottom{margin-top:auto;display:flex;align-items:center;gap:2mm;padding:1.8mm 3.5mm}
    .contact-lines{flex:1;min-width:0}
    .contact-lines b,.contact-lines span{display:block;font-size:1.9mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .contact-lines span{opacity:.65;margin-top:.5mm}
    .signature{position:absolute;right:3.5mm;bottom:10mm;text-align:center}
    .signature img{width:20mm;max-height:8mm;object-fit:contain;display:block;margin:0 auto .8mm}
    .signature span{display:block;width:20mm;border-top:.25mm solid currentColor;margin-bottom:.8mm}
    .signature b{font-size:1.8mm}

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
}'''

with open('src/Modules/cards/CardsGeneratorModule.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('function idCardPrintCss(opts) {')
end = content.find('\nfunction chunkItems', start)

new_content = content[:start] + NEW_CSS.strip() + content[end:]

with open('src/Modules/cards/CardsGeneratorModule.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done. File size:', len(new_content))
