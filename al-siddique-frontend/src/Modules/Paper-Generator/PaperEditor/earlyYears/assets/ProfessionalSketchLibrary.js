// ProfessionalSketchLibrary.js — consistent print-safe line art for ASSPS Early Years
// Geometry only; asset IDs stay stable so existing papers and overlays keep working.

const S = '#111827'
const base = (body) => `
  <g fill="#fff" stroke="${S}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </g>
`
const solid = (body) => `<g fill="${S}" stroke="none">${body}</g>`

export const PROFESSIONAL_SKETCH_OVERRIDES = {
  'sketch.apple.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M50 33 C43 25 31 24 23 30 C13 37 13 53 18 67 C23 81 33 89 44 88 C47 88 49 86 50 84 C51 86 53 88 57 88 C69 89 79 80 83 66 C88 51 86 38 77 31 C68 24 57 25 50 33 Z"/>
      <path d="M49 34 C49 25 52 18 59 13" fill="none" stroke-width="3"/>
      <path d="M55 22 C64 16 73 18 77 24 C69 29 61 29 55 22 Z"/>
      <path d="M34 40 C39 36 44 35 48 37" fill="none" stroke-width="1.5" opacity=".45"/>
    `) + solid(`<ellipse cx="58.5" cy="13.5" rx="1.8" ry="1.8"/>`)
  },

  'sketch.mango.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M47 23 C61 20 76 28 82 41 C90 59 79 78 63 87 C52 93 37 90 28 82 C17 72 16 57 21 45 C26 34 35 27 47 23 Z"/>
      <path d="M28 82 C32 84 35 86 36 91 C41 88 44 85 46 82" fill="none"/>
      <path d="M48 24 C48 18 49 13 52 9" fill="none" stroke-width="3"/>
      <path d="M51 17 C62 12 72 16 76 23 C66 28 57 25 51 17 Z"/>
      <path d="M31 45 C36 34 47 29 58 30" fill="none" stroke-width="1.5" opacity=".42"/>
    `)
  },

  'sketch.grapes.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M50 23 C48 16 52 10 58 8" fill="none" stroke-width="3"/>
      <path d="M48 22 C37 14 27 17 24 28 C35 31 43 28 48 22 Z"/>
      <ellipse cx="40" cy="31" rx="9.5" ry="10.5"/>
      <ellipse cx="58" cy="31" rx="9.5" ry="10.5"/>
      <ellipse cx="31" cy="47" rx="9.5" ry="10.5"/>
      <ellipse cx="49" cy="47" rx="9.5" ry="10.5"/>
      <ellipse cx="67" cy="47" rx="9.5" ry="10.5"/>
      <ellipse cx="39" cy="63" rx="9.5" ry="10.5"/>
      <ellipse cx="57" cy="63" rx="9.5" ry="10.5"/>
      <ellipse cx="48" cy="79" rx="9" ry="10"/>
      <path d="M31 42 C34 38 37 37 40 37 M58 58 C61 54 64 53 67 54" fill="none" stroke-width="1.4" opacity=".38"/>
    `)
  },

  'sketch.banana.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M18 67 C31 81 52 87 68 79 C80 73 88 61 90 48 C91 42 89 38 85 36 C81 38 78 42 76 47 C72 58 64 66 54 69 C42 73 30 69 23 61 Z"/>
      <path d="M24 62 C36 68 49 68 60 62 C69 57 76 49 80 40" fill="none" stroke-width="1.7"/>
      <path d="M85 36 L87 29 L92 30 L91 38" />
      <path d="M18 67 L15 73 L21 76 L24 70" />
      <path d="M33 73 C44 78 56 77 66 72" fill="none" stroke-width="1.3" opacity=".35"/>
    `)
  },

  'sketch.tomato.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M50 31 C42 25 30 27 22 34 C12 43 13 60 20 72 C27 84 39 89 50 87 C61 89 73 84 80 72 C87 60 88 43 78 34 C70 27 58 25 50 31 Z"/>
      <path d="M50 30 L50 17 C52 13 55 11 59 11" fill="none" stroke-width="3"/>
      <path d="M50 31 L38 25 L43 35 L31 36 L43 41 L50 34 L57 41 L69 36 L57 35 L62 25 Z"/>
      <path d="M28 46 C34 39 41 37 47 39" fill="none" stroke-width="1.4" opacity=".35"/>
    `)
  },

  'sketch.chicken.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M27 59 C25 45 34 34 48 33 C57 31 65 35 70 42 C74 47 75 54 73 61 C69 73 57 80 43 78 C34 77 29 70 27 59 Z"/>
      <path d="M66 43 C63 34 66 26 74 23 C82 20 89 26 88 34 C87 42 80 47 72 46"/>
      <path d="M88 32 L97 36 L88 40 Z"/>
      <path d="M71 23 C71 18 75 16 78 20 C78 15 83 15 84 20 C86 17 90 19 88 24" />
      <path d="M31 47 C22 39 18 30 20 22 C27 26 31 33 32 41 C26 35 24 29 26 23" />
      <path d="M41 48 C50 42 60 47 61 57 C55 65 45 65 39 57 Z"/>
      <path d="M42 77 L40 90 M56 78 L56 91 M40 90 L34 93 M40 90 L45 94 M56 91 L50 94 M56 91 L62 94" fill="none"/>
    `) + solid(`<circle cx="79" cy="31" r="2.2"/>`)
  },

  'sketch.hand-fan.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M50 60 C31 60 18 49 17 34 C31 21 69 21 83 34 C82 49 69 60 50 60 Z"/>
      <path d="M50 60 L50 94" fill="none" stroke-width="4"/>
      <path d="M50 58 L26 35 M50 58 L36 29 M50 58 L50 26 M50 58 L64 29 M50 58 L74 35" fill="none" stroke-width="1.7"/>
      <path d="M21 41 C36 36 64 36 79 41" fill="none" stroke-width="1.4"/>
      <path d="M46 94 L54 94" fill="none" stroke-width="4"/>
    `)
  },

  'sketch.pencil.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M17 79 L70 26 L83 39 L30 92 Z"/>
      <path d="M17 79 L11 96 L30 92 Z"/>
      <path d="M70 26 L77 19 C80 16 84 16 87 19 L90 22 C93 25 93 29 90 32 L83 39 Z"/>
      <path d="M22 83 L75 30 M28 89 L81 36" fill="none" stroke-width="1.4"/>
      <path d="M11 96 L19 91" fill="none" stroke-width="3"/>
    `)
  },

  'sketch.fish.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M20 50 C31 31 53 25 72 34 C80 38 86 44 89 50 C86 56 80 62 72 66 C53 75 31 69 20 50 Z"/>
      <path d="M21 50 L8 34 C6 32 6 38 8 50 C6 62 6 68 8 66 Z"/>
      <path d="M63 35 C58 41 57 58 63 65" fill="none"/>
      <path d="M48 31 C51 23 60 20 67 27 M49 69 C53 78 61 80 68 72" fill="none"/>
      <path d="M28 50 C36 44 44 44 50 50 C44 56 36 56 28 50 Z" fill="none" stroke-width="1.5" opacity=".55"/>
    `) + solid(`<circle cx="77" cy="45" r="2.4"/>`)
  },

  'sketch.mouse.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M22 65 C24 49 39 39 56 40 C70 41 81 50 84 61 C88 63 92 66 94 69 C88 74 81 76 73 76 L39 76 C29 75 23 72 22 65 Z"/>
      <circle cx="62" cy="40" r="10"/>
      <circle cx="48" cy="42" r="8"/>
      <path d="M84 61 C88 60 92 61 95 64" fill="none"/>
      <path d="M23 64 C13 63 8 56 10 47 C11 40 17 36 20 31 C23 26 20 21 17 19" fill="none" stroke-width="2.2"/>
      <path d="M82 68 L96 64 M82 71 L97 72" fill="none" stroke-width="1.4"/>
      <path d="M39 76 L37 85 M69 76 L71 85" fill="none"/>
    `) + solid(`<circle cx="75" cy="56" r="2.2"/><circle cx="94" cy="68" r="2.3"/>`)
  },

  'sketch.lion.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M50 11 C57 11 61 17 66 18 C72 15 78 18 80 24 C86 26 89 32 87 38 C92 42 92 49 89 53 C92 60 89 66 83 68 C82 76 76 80 69 79 C65 86 58 89 51 86 C44 90 36 87 33 81 C25 82 20 77 20 70 C13 67 11 60 15 54 C10 48 12 41 17 38 C14 31 18 25 24 23 C27 17 34 15 39 18 C42 14 45 11 50 11 Z"/>
      <path d="M33 36 C36 27 44 24 50 27 C57 23 66 27 69 36 L68 61 C65 72 58 78 50 78 C42 78 35 72 32 61 Z"/>
      <path d="M37 35 C33 29 28 32 30 39 M63 35 C67 29 72 32 70 39" fill="none"/>
      <path d="M44 54 L50 58 L56 54 L50 51 Z"/>
      <path d="M50 58 C48 63 44 65 40 63 M50 58 C52 63 56 65 60 63" fill="none"/>
      <path d="M38 58 L25 56 M38 62 L24 65 M62 58 L75 56 M62 62 L76 65" fill="none" stroke-width="1.4"/>
    `) + solid(`<circle cx="42" cy="45" r="2.3"/><circle cx="58" cy="45" r="2.3"/>`)
  },

  'sketch.flower.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <ellipse cx="50" cy="27" rx="11" ry="16"/>
      <ellipse cx="68" cy="41" rx="11" ry="16" transform="rotate(58 68 41)"/>
      <ellipse cx="61" cy="62" rx="11" ry="16" transform="rotate(125 61 62)"/>
      <ellipse cx="39" cy="62" rx="11" ry="16" transform="rotate(55 39 62)"/>
      <ellipse cx="32" cy="41" rx="11" ry="16" transform="rotate(122 32 41)"/>
      <circle cx="50" cy="47" r="12"/>
      <path d="M50 59 L50 92" fill="none" stroke-width="3"/>
      <path d="M50 73 C40 66 32 69 31 78 C39 82 46 79 50 73 Z"/>
      <path d="M50 81 C60 74 68 77 69 86 C60 89 54 87 50 81 Z"/>
    `)
  },

  'sketch.doll.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <circle cx="50" cy="26" r="14"/>
      <path d="M37 24 C39 12 61 12 64 25 C58 22 54 18 50 17 C46 20 41 22 37 24 Z"/>
      <path d="M44 34 C47 38 53 38 56 34" fill="none" stroke-width="1.5"/>
      <path d="M42 41 L58 41 L70 78 L30 78 Z"/>
      <path d="M42 46 L24 59 M58 46 L76 59 M24 59 L21 64 M76 59 L79 64" fill="none"/>
      <path d="M39 78 L38 94 M61 78 L62 94 M33 94 L42 94 M58 94 L67 94" fill="none"/>
      <path d="M34 68 C43 72 57 72 66 68" fill="none" stroke-width="1.5"/>
    `) + solid(`<circle cx="45" cy="27" r="1.8"/><circle cx="55" cy="27" r="1.8"/>`)
  },

  'sketch.kite.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M50 10 L84 45 L50 80 L16 45 Z"/>
      <path d="M50 10 L50 80 M16 45 C34 34 66 34 84 45" fill="none" stroke-width="1.8"/>
      <path d="M50 80 C62 87 43 92 55 98" fill="none" stroke-width="2"/>
      <path d="M53 87 L60 83 L61 91 Z M48 94 L41 90 L40 98 Z"/>
    `)
  },

  'sketch.cricket-bat.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <rect x="45" y="8" width="10" height="31" rx="4"/>
      <path d="M43 38 C37 43 35 49 35 57 L35 87 C35 92 40 95 50 95 C60 95 65 92 65 87 L65 57 C65 49 63 43 57 38 Z"/>
      <path d="M50 43 L50 89 M45 14 L55 14 M45 21 L55 21 M45 28 L55 28" fill="none" stroke-width="1.5"/>
      <path d="M39 88 C46 91 54 91 61 88" fill="none" stroke-width="1.4"/>
    `)
  },

  'sketch.butterfly.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <ellipse cx="50" cy="55" rx="5" ry="24"/>
      <circle cx="50" cy="27" r="5"/>
      <path d="M47 23 C41 13 35 12 32 16 M53 23 C59 13 65 12 68 16" fill="none" stroke-width="1.8"/>
      <path d="M45 40 C31 23 14 25 15 43 C16 57 29 61 44 54 Z"/>
      <path d="M44 56 C29 57 22 69 29 80 C36 88 45 76 47 68 Z"/>
      <path d="M55 40 C69 23 86 25 85 43 C84 57 71 61 56 54 Z"/>
      <path d="M56 56 C71 57 78 69 71 80 C64 88 55 76 53 68 Z"/>
      <path d="M25 40 C31 36 37 39 39 45 M75 40 C69 36 63 39 61 45" fill="none" stroke-width="1.5"/>
    `)
  },

  'sketch.caterpillar.v1': {
    qualityVersion: 'professional-v2',
    svgContent: base(`
      <path d="M31 59 C38 38 63 36 73 52 C82 35 108 36 116 53 C126 35 151 36 160 52 C170 34 196 36 204 53 C214 35 240 36 248 52 C258 34 284 36 292 53 C302 35 328 36 336 52 C346 34 372 36 380 53 C390 35 416 36 424 52"/>
      <circle cx="456" cy="52" r="29"/>
      <circle cx="31" cy="58" r="23"/><circle cx="73" cy="52" r="23"/><circle cx="116" cy="58" r="23"/>
      <circle cx="160" cy="52" r="23"/><circle cx="204" cy="58" r="23"/><circle cx="248" cy="52" r="23"/>
      <circle cx="292" cy="58" r="23"/><circle cx="336" cy="52" r="23"/><circle cx="380" cy="58" r="23"/><circle cx="423" cy="52" r="23"/>
      <path d="M448 25 C446 14 438 10 432 13 M465 25 C468 14 476 11 483 14" fill="none"/>
      <path d="M448 63 C455 69 464 68 469 61" fill="none" stroke-width="2"/>
      <path d="M31 80 L29 89 M73 74 L71 84 M116 80 L114 90 M160 74 L158 84 M204 80 L202 90 M248 74 L246 84 M292 80 L290 90 M336 74 L334 84 M380 80 L378 90 M423 74 L421 84" fill="none" stroke-width="2"/>
    `) + solid(`<circle cx="446" cy="46" r="2.5"/><circle cx="466" cy="46" r="2.5"/>`)
  }
}
