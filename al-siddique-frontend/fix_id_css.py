
NEW_CSS_FUNC = r'''function idCardPrintCss(opts) {
  const o = normalizeIdOptions(opts)
  const l = a4Layout(o)
  return `
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-rendering:geometricPrecision}
    html,body{background:#eef2f7;font-family:'DM Sans',Arial,sans-serif;color:#071e34}
    @page{size:A4 ${o.pageOrientation};margin:0}
    @media print{body{background:white}.no-print{display:none!important}.print-page{box-shadow:none!important;margin:0!important;break-after:page}.print-page:last-child{break-after:auto}}
    .no-print{padding:12px 20px;background:#071e34;border-bottom:2px solid #C8991A;display:flex;gap:16px;align-items:center;position:sticky;top:0;z-index:10}
    .print-page{width:${l.pageW}mm;height:${l.pageH}mm;padding:${l.margin}mm;background:white;display:grid;grid-template-columns:repeat(${l.cols},${l.cardW}mm);grid-template-rows:repeat(${l.rows},${l.cardH}mm);gap:${l.gap}mm;align-content:center;justify-content:center;box-shadow:0 12px 34px rgba(15,23,42,.18);margin:12px auto;overflow:hidden}
    .slot{width:${l.cardW}mm;height:${l.cardH}mm;display:flex;align-items:center;justify-content:center;break-inside:avoid;page-break-inside:avoid}

    /* BASE CARD */
    .id-card{width:var(--card-w);height:var(--card-h);border-radius:var(--radius);overflow:hidden;position:relative;font-family:'DM Sans',Arial,sans-serif;display:flex;flex-direction:column;break-inside:avoid;background:#fff;border:.3mm solid #c8d3e2;box-shadow:0 2mm 6mm rgba(15,23,42,.22)}
    .id-card::after{content:"";position:absolute;inset:.6mm;border-radius:calc(var(--radius) - .6mm);border:.15mm solid rgba(255,255,255,.5);pointer-events:none;z-index:9}
    .design-arc,.design-ribbon,.hologram,.id-topline{position:absolute;pointer-events:none}
    .id-card.front header,.id-card.front main,.id-card.front footer{position:relative;z-index:3}
    .id-card.back>*:not(.design-arc):not(.design-ribbon){position:relative;z-index:3}
    .smart-chip{display:none}

    /* HEADER — school logo + name, shown on ALL templates */
    .id-card.front header{display:flex;align-items:center;gap:2mm;padding:2mm 3mm;flex-shrink:0;z-index:5}
    .school-logo{width:9.5mm;height:9.5mm;object-fit:contain;flex:none;border-radius:50%;background:white;padding:.55mm;border:.3mm solid rgba(255,255,255,.65);box-shadow:0 .8mm 2mm rgba(15,23,42,.18)}
    .logo-fallback{display:flex;align-items:center;justify-content:center;font-size:4mm;font-weight:900;color:#13224A}
    .school-block{flex:1;min-width:0}
    .school-block small{display:none}
    .id-card.front header em{display:none}
    .brand-line{display:block;text-transform:uppercase;font-weight:950;line-height:1.05;word-break:break-word}
    .brand-line-main{font-size:2mm;letter-spacing:.08mm}
    .brand-line-sub{font-size:1.65mm;letter-spacing:.05mm;opacity:.82}

    /* SHARED PHOTO */
    .photo{object-fit:cover;background:#E8EEF8;border:.8mm solid rgba(19,34,74,.3)}
    .photo-fallback{display:flex;align-items:center;justify-content:center;font-weight:900;font-size:6mm;color:#13224A;background:linear-gradient(145deg,#E8EEF8,#F0F4FB)}
    .grade-badge{font-size:1.85mm;font-weight:900;border-radius:99mm;padding:.7mm 1.5mm;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22mm}

    /* SHARED DATA SECTION */
    .data-section h3{font-size:3.4mm;font-weight:950;line-height:1.05;margin-bottom:.5mm}
    .data-section p{font-size:2mm;margin-bottom:1mm;opacity:.78}
    .field-grid{display:grid;gap:.85mm}
    .field-grid div{background:rgba(255,255,255,.94);border:.18mm solid #e1e7ef;border-radius:1.3mm;padding:.65mm .9mm;min-width:0;box-shadow:0 .5mm 1.2mm rgba(15,23,42,.07)}
    .field-grid label{display:block;font-size:1.3mm;text-transform:uppercase;font-weight:900;letter-spacing:.1mm;color:#5c6678;margin-bottom:.2mm;line-height:1}
    .field-grid b{display:block;font-size:1.85mm;font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0F172A}

    /* SHARED FOOTER */
    .id-card.front footer{position:absolute;left:3mm;right:3mm;bottom:2mm;height:5.5mm;display:flex;align-items:center;gap:1.5mm;padding:0;background:transparent;z-index:7;border:none}
    .barcode-wrap{display:block;flex:1;min-width:0;height:5mm;padding:.4mm .7mm;border-radius:.9mm;background:rgba(255,255,255,.95);border:.18mm solid rgba(19,34,74,.2);overflow:hidden}
    .barcode-wrap svg{height:4mm!important;width:100%!important}
    .id-qr{width:6mm;height:6mm;flex:none;object-fit:contain;background:white;border:.2mm solid #13224A;border-radius:.8mm;padding:.3mm}
    .qr-fallback{display:flex;align-items:center;justify-content:center;color:#0B1F3A;font-size:1.8mm;font-weight:900}

    /* BACK CARD */
    .id-card.back{background:#fff;color:#16213F}
    .security-strip{height:2mm;flex-shrink:0}
    .back-head{display:flex;align-items:center;gap:2mm;padding:3mm 4mm 1.5mm}
    .back-head strong{font-size:2.8mm;text-transform:uppercase;line-height:1.1}
    .back-head small{display:block;font-size:1.8mm;opacity:.62}
    .terms{padding:1mm 4mm 1.5mm}
    .terms h4{font-size:2.8mm;margin-bottom:1mm}
    .terms ul{padding-left:4mm}
    .terms li{font-size:1.9mm;line-height:1.4;margin-bottom:.6mm}
    .back-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.2mm 3mm;padding:1.5mm 4mm}
    .back-grid div{min-width:0}
    .back-grid label{display:block;font-size:1.4mm;opacity:.55;text-transform:uppercase;font-weight:900;letter-spacing:.1mm}
    .back-grid strong{display:block;font-size:2mm;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .back-bottom{margin-top:auto;display:flex;align-items:center;gap:2mm;padding:1.8mm 4mm}
    .contact-lines{flex:1;min-width:0}
    .contact-lines b,.contact-lines span{display:block;font-size:1.9mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .contact-lines span{opacity:.65;margin-top:.5mm}
    .signature{position:absolute;right:4mm;bottom:12mm;text-align:center}
    .signature img{width:22mm;max-height:8mm;object-fit:contain;display:block;margin:0 auto .8mm}
    .signature span{display:block;width:22mm;border-top:.26mm solid currentColor;margin-bottom:.8mm}
    .signature b{font-size:1.85mm}

    /* ============================================================
       TPL 1: CORPORATE — Executive Ivory (left navy strip + ivory body)
       School name shown HORIZONTAL at top in header
    ============================================================ */
    .tpl-corporate.front{background:linear-gradient(180deg,#FFFDF8,#F7F1E8);border-color:#D8C6A4}
    .tpl-corporate.front::before{content:"";position:absolute;left:0;top:0;bottom:0;width:13mm;background:linear-gradient(180deg,#13224A,#1A3060);z-index:0}
    .tpl-corporate.front .id-topline{left:0;right:0;top:0;height:1mm;background:#FF7900;z-index:4}
    .tpl-corporate.front .design-ribbon{left:0;right:0;bottom:0;height:5mm;background:#13224A;border-top:.7mm solid #B9965A;z-index:2}
    .tpl-corporate.front header{height:14mm;background:linear-gradient(90deg,#13224A 13mm,#F3E8D5 13mm);padding-left:14mm;color:#243041}
    .tpl-corporate.front .school-logo{background:rgba(255,255,255,.92)!important;border-color:rgba(185,150,90,.4)!important}
    .tpl-corporate.front .brand-line{color:#243041}
    .tpl-corporate.front .brand-line-main{font-size:2mm;color:#13224A}
    .tpl-corporate.front .brand-line-sub{font-size:1.6mm;color:#5a6070}
    .tpl-corporate.front main{flex:1;display:grid;grid-template-columns:14mm 1fr;gap:0;padding:2mm 3mm 7.5mm 0}
    .tpl-corporate.front .photo-section{background:linear-gradient(180deg,#FF7900,#E86A00);border-radius:0 0 8mm 0;padding:2mm 1mm 2.5mm;display:flex;flex-direction:column;align-items:center;gap:1.5mm;margin-left:0}
    .tpl-corporate.front .photo{width:12mm!important;height:15mm!important;border-radius:1.5mm!important;border-color:rgba(255,255,255,.85)!important}
    .tpl-corporate.front .photo-fallback{width:12mm!important;height:15mm!important;border-radius:1.5mm!important;font-size:4mm!important}
    .tpl-corporate.front .grade-badge{background:#13224A!important;color:#fff!important;font-size:1.5mm!important;max-width:12mm}
    .tpl-corporate.front .data-section{padding:0 0 0 2.5mm}
    .tpl-corporate.front .data-section h3{font-size:3.2mm;color:#13224A;margin-top:.5mm}
    .tpl-corporate.front .data-section p{font-size:1.85mm;color:#5a6070;opacity:1}
    .tpl-corporate.front .field-grid{grid-template-columns:1fr;gap:.75mm}
    .tpl-corporate.front .field-grid div{background:rgba(255,253,248,.95);border-color:#DDD0B8}
    .tpl-corporate.front footer{left:14mm!important;right:3mm!important;bottom:1.5mm!important}

    /* ============================================================
       TPL 2: UNIVERSITY — University Pro (orange photo rail on left)
       School name shown HORIZONTAL at top in navy header bar
    ============================================================ */
    .tpl-university.front{background:#fff;border-color:#CBD5E1}
    .tpl-university.front::before{content:"";position:absolute;left:0;top:0;bottom:0;width:16mm;background:#FF7900;z-index:0}
    .tpl-university.front::after{content:"";position:absolute;left:0;right:0;top:0;height:14mm;background:#13224A;z-index:1}
    .tpl-university.front header{height:14mm;padding:2mm 3mm 2mm 17.5mm;z-index:5;position:relative}
    .tpl-university.front .school-logo{background:rgba(255,255,255,.92)!important;border-color:rgba(255,121,0,.4)!important;z-index:5}
    .tpl-university.front .brand-line{color:#fff!important}
    .tpl-university.front .brand-line-main{font-size:2mm;color:#fff}
    .tpl-university.front .brand-line-sub{font-size:1.6mm;color:rgba(255,255,255,.82)}
    .tpl-university.front main{flex:1;display:grid;grid-template-columns:16mm 1fr;gap:0;padding:2mm 3mm 7.5mm 0}
    .tpl-university.front .photo-section{background:linear-gradient(180deg,#FF7900,#E86A00);display:flex;flex-direction:column;align-items:center;padding:2mm .5mm;gap:1.5mm;position:relative;z-index:3}
    .tpl-university.front .photo{width:13mm!important;height:16mm!important;border-radius:1.5mm!important;border-color:rgba(255,255,255,.9)!important}
    .tpl-university.front .photo-fallback{width:13mm!important;height:16mm!important;border-radius:1.5mm!important;font-size:4.5mm!important}
    .tpl-university.front .grade-badge{background:#13224A!important;color:#fff!important;font-size:1.5mm!important;max-width:14mm}
    .tpl-university.front .data-section{padding:0 0 0 2.5mm;z-index:3}
    .tpl-university.front .data-section h3{font-size:3.2mm;color:#13224A}
    .tpl-university.front .data-section p{font-size:1.85mm;color:#5a6070;opacity:1}
    .tpl-university.front .field-grid{grid-template-columns:1fr;gap:.75mm}
    .tpl-university.front footer{left:17mm!important;right:3mm!important;bottom:1.5mm!important}
    .tpl-university.back{background:#fff;color:#13224A}
    .tpl-university.back .security-strip{background:#13224A;border-bottom:.8mm solid #FF7900}

    /* ============================================================
       TPL 3: EXECUTIVE — Abstract Curve (navy arcs top-left)
       School name + logo in compact header, centered circle photo,
       ALL student fields visible below photo
    ============================================================ */
    .tpl-executive.front{background:#fff;border-color:#C8D3E2}
    .tpl-executive.front .arc-one{left:-20mm;top:-30mm;width:70mm;height:62mm;border-radius:50%;background:#13224A;z-index:0}
    .tpl-executive.front .arc-two{left:-10mm;top:-12mm;width:56mm;height:52mm;border-radius:50%;border:2.2mm solid #FF7900;border-right-color:transparent;border-bottom-color:transparent;transform:rotate(-18deg);z-index:1}
    .tpl-executive.front header{height:16mm;display:flex;align-items:center;gap:2mm;padding:2mm 3mm;z-index:5}
    .tpl-executive.front .school-logo{background:rgba(255,255,255,.95)!important;border-color:rgba(255,121,0,.5)!important}
    .tpl-executive.front .brand-line{color:#fff}
    .tpl-executive.front .brand-line-main{font-size:2mm;color:#fff}
    .tpl-executive.front .brand-line-sub{font-size:1.65mm;color:rgba(255,255,255,.8)}
    .tpl-executive.front main{flex:1;display:flex;flex-direction:column;align-items:center;padding:0 4mm 8mm;position:relative}
    .tpl-executive.front .photo-section{position:absolute;top:-7mm;left:50%;transform:translateX(-50%);z-index:6;display:flex;flex-direction:column;align-items:center;gap:1.5mm}
    .tpl-executive.front .photo{width:20mm!important;height:20mm!important;border-radius:50%!important;border:1.5mm solid #13224A!important;box-shadow:0 1mm 3mm rgba(15,23,42,.3)}
    .tpl-executive.front .photo-fallback{width:20mm!important;height:20mm!important;border-radius:50%!important;font-size:6.5mm!important}
    .tpl-executive.front .grade-badge{background:#FF7900!important;color:#fff!important;font-size:1.7mm!important;border:.3mm solid #fff!important;box-shadow:0 .6mm 1.5mm rgba(0,0,0,.2)}
    .tpl-executive.front .data-section{margin-top:15mm;width:100%;background:rgba(255,255,255,.95);border:.2mm solid #E2E8F0;border-radius:2mm;padding:2mm 2.5mm;box-shadow:0 .8mm 2.5mm rgba(15,23,42,.1)}
    .tpl-executive.front .data-section h3{text-align:center;color:#13224A;font-size:3.2mm}
    .tpl-executive.front .data-section p{text-align:center;color:#5a6070;opacity:1;font-size:1.85mm}
    .tpl-executive.front .field-grid{grid-template-columns:1fr 1fr;gap:.8mm}
    .tpl-executive.front footer{left:3.5mm!important;right:3.5mm!important;bottom:2mm!important}
    .tpl-executive.back .arc-one{right:-22mm;top:-28mm;width:70mm;height:56mm;border-radius:50%;background:#13224A}
    .tpl-executive.back .arc-two{left:-14mm;bottom:-14mm;width:60mm;height:30mm;border-radius:50% 50% 0 0;background:#FF7900}
    .tpl-executive.back .security-strip{background:#13224A;border-bottom:.8mm solid #FF7900;height:5mm}

    /* ============================================================
       TPL 4: SCHOOL — Prestige Badge (navy header bar + circle photo)
       School name HORIZONTAL in navy header bar
    ============================================================ */
    .tpl-school.front{background:linear-gradient(180deg,#F8FAFC,#fff);border-color:#C8D3E2}
    .tpl-school.front .arc-one{right:-14mm;top:-14mm;width:38mm;height:38mm;border-radius:50%;background:#13224A;z-index:0}
    .tpl-school.front .arc-two{left:-12mm;bottom:-14mm;width:40mm;height:40mm;border-radius:50%;border:2mm solid #B9965A;background:transparent;z-index:1}
    .tpl-school.front .design-ribbon{left:0;right:0;top:0;height:15mm;background:#13224A;border-bottom:.7mm solid #B9965A;z-index:0}
    .tpl-school.front header{height:15mm;display:flex;align-items:center;justify-content:center;gap:2mm;padding:1.5mm 3mm;z-index:5}
    .tpl-school.front .school-logo{background:rgba(255,255,255,.92)!important;border-color:rgba(185,150,90,.5)!important}
    .tpl-school.front .brand-line{color:#fff}
    .tpl-school.front .brand-line-main{font-size:1.95mm;color:#fff}
    .tpl-school.front .brand-line-sub{font-size:1.6mm;color:rgba(255,255,255,.8)}
    .tpl-school.front main{flex:1;display:flex;flex-direction:column;align-items:center;padding:2mm 3.5mm 8mm;gap:1.5mm}
    .tpl-school.front .photo-section{position:relative;display:flex;flex-direction:column;align-items:center;gap:0}
    .tpl-school.front .photo{width:20mm!important;height:20mm!important;border-radius:50%!important;border:.85mm solid #B9965A!important;box-shadow:0 1mm 3mm rgba(15,23,42,.22)}
    .tpl-school.front .photo-fallback{width:20mm!important;height:20mm!important;border-radius:50%!important;font-size:6.5mm!important}
    .tpl-school.front .grade-badge{background:#13224A!important;color:#fff!important;font-size:1.7mm!important;border:.3mm solid #B9965A!important;margin-top:.8mm}
    .tpl-school.front .data-section{width:100%;background:rgba(255,255,255,.96);border-radius:2mm;padding:2mm 2.5mm;box-shadow:0 .6mm 2mm rgba(0,0,0,.12);border:.18mm solid #E0E7F0}
    .tpl-school.front .data-section h3{text-align:center;color:#13224A;font-size:3.2mm}
    .tpl-school.front .data-section p{text-align:center;color:#5a6070;opacity:1;font-size:1.85mm}
    .tpl-school.front .field-grid{grid-template-columns:1fr 1fr;gap:.8mm}
    .tpl-school.front footer{left:3mm!important;right:3mm!important;bottom:1.8mm!important}
    .tpl-school.back{background:#fff;color:#13224A}
    .tpl-school.back .security-strip{background:#13224A;border-bottom:.8mm solid #B9965A;height:5mm}

    /* ============================================================
       TPL 5: MINIMAL — Modern White (clean layout, side accent)
       School name HORIZONTAL at top
    ============================================================ */
    .tpl-minimal.front{background:linear-gradient(90deg,#fff 62%,#F4F6FA 62%);border-color:#D9DEE8}
    .tpl-minimal.front::before{content:"";position:absolute;right:0;top:0;bottom:0;width:7mm;background:#13224A;z-index:0}
    .tpl-minimal.front .id-topline{left:0;right:0;top:0;height:1mm;background:#FF7900;z-index:4}
    .tpl-minimal.front header{height:14mm;display:flex;align-items:center;gap:2mm;padding:2mm 3.5mm;border-bottom:.3mm solid #E3E8F0;background:#fff}
    .tpl-minimal.front .school-logo{background:#fff!important;border-color:#D9DEE8!important}
    .tpl-minimal.front .brand-line{color:#0B1F3A}
    .tpl-minimal.front .brand-line-main{font-size:2mm;color:#13224A}
    .tpl-minimal.front .brand-line-sub{font-size:1.6mm;color:#5a6070}
    .tpl-minimal.front main{flex:1;display:grid;grid-template-columns:22mm 1fr;gap:2.5mm;padding:3mm 9mm 8mm 3.5mm}
    .tpl-minimal.front .photo-section{display:flex;flex-direction:column;align-items:center;gap:1.5mm}
    .tpl-minimal.front .photo{width:18mm!important;height:22mm!important;border-radius:2mm!important;border-color:#FF7900!important}
    .tpl-minimal.front .photo-fallback{width:18mm!important;height:22mm!important;border-radius:2mm!important;font-size:5.5mm!important}
    .tpl-minimal.front .grade-badge{background:#FF7900!important;color:#fff!important;max-width:18mm}
    .tpl-minimal.front .data-section{display:flex;flex-direction:column}
    .tpl-minimal.front .data-section h3{color:#13224A;font-size:3.2mm;background:rgba(255,255,255,.88);border-radius:1.2mm;padding:.5mm .9mm;display:inline-block}
    .tpl-minimal.front .data-section p{color:#5a6070;opacity:1;font-size:1.85mm}
    .tpl-minimal.front .field-grid{grid-template-columns:1fr;gap:.8mm}
    .tpl-minimal.front footer{left:3.5mm!important;right:8.5mm!important;bottom:2mm!important}
  `
}'''

with open('src/Modules/cards/CardsGeneratorModule.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('function idCardPrintCss(opts) {')
end = content.find('\nfunction chunkItems', start)

new_content = content[:start] + NEW_CSS_FUNC + content[end:]

with open('src/Modules/cards/CardsGeneratorModule.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done! File length:', len(new_content))
