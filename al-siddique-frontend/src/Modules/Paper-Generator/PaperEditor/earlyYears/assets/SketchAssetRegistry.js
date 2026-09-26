// SketchAssetRegistry.js — Reusable print-safe SVG line-art asset registry for Early Years papers
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

/**
 * Builtin Line-Art SVG Assets
 * Clean black stroke, transparent/white fill, photocopy-safe, scalable, no external URLs or scripts.
 */
export const BUILTIN_SKETCHES = {
  // 1. Chicken
  'sketch.chicken.v1': {
    id: 'sketch.chicken.v1',
    name: 'chicken',
    altText: 'Line drawing of a chicken',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <ellipse cx="50" cy="58" rx="24" ry="20" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="68" cy="38" r="14" fill="#fff" stroke="#000" stroke-width="2.5" />
      <polygon points="82,38 94,42 82,46" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="72" cy="34" r="2.5" fill="#000" />
      <!-- Comb -->
      <path d="M 64 24 Q 68 18 72 24 Q 76 18 80 25" fill="#fff" stroke="#000" stroke-width="2" />
      <!-- Wing -->
      <path d="M 40 54 Q 52 46 58 58 Q 50 68 40 54 Z" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Tail feathers -->
      <path d="M 26 52 C 16 44 14 30 22 24 C 26 34 28 44 26 52 Z" fill="#fff" stroke="#000" stroke-width="2.2" />
      <path d="M 28 56 C 20 50 18 38 26 34" fill="#fff" stroke="#000" stroke-width="2" />
      <!-- Legs -->
      <line x1="44" y1="78" x2="42" y2="92" stroke="#000" stroke-width="2.5" />
      <line x1="42" y1="92" x2="34" y2="94" stroke="#000" stroke-width="2.2" />
      <line x1="42" y1="92" x2="44" y2="95" stroke="#000" stroke-width="2.2" />
      <line x1="56" y1="78" x2="56" y2="92" stroke="#000" stroke-width="2.5" />
      <line x1="56" y1="92" x2="48" y2="94" stroke="#000" stroke-width="2.2" />
      <line x1="56" y1="92" x2="58" y2="95" stroke="#000" stroke-width="2.2" />
    `
  },

  // 2. Hand Fan (پنکھا)
  'sketch.hand-fan.v1': {
    id: 'sketch.hand-fan.v1',
    name: 'hand-fan',
    altText: 'Line drawing of a traditional hand fan',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Handle -->
      <line x1="50" y1="65" x2="50" y2="96" stroke="#000" stroke-width="4" stroke-linecap="round" />
      <!-- Fan blade / leaf -->
      <rect x="25" y="16" width="50" height="48" rx="6" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Pattern ribs -->
      <line x1="25" y1="28" x2="75" y2="28" stroke="#000" stroke-width="1.8" />
      <line x1="25" y1="40" x2="75" y2="40" stroke="#000" stroke-width="1.8" />
      <line x1="25" y1="52" x2="75" y2="52" stroke="#000" stroke-width="1.8" />
      <line x1="38" y1="16" x2="38" y2="64" stroke="#000" stroke-width="1.8" />
      <line x1="50" y1="16" x2="50" y2="64" stroke="#000" stroke-width="2.2" />
      <line x1="62" y1="16" x2="62" y2="64" stroke="#000" stroke-width="1.8" />
      <!-- Frill border -->
      <path d="M 25 16 Q 30 10 35 16 Q 40 10 45 16 Q 50 10 55 16 Q 60 10 65 16 Q 70 10 75 16" fill="none" stroke="#000" stroke-width="2" />
    `
  },

  // 3. Tomato (ٹماٹر)
  'sketch.tomato.v1': {
    id: 'sketch.tomato.v1',
    name: 'tomato',
    altText: 'Line drawing of a tomato',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Tomato Body -->
      <path d="M 50 30 C 26 26 14 42 16 62 C 18 82 36 90 50 90 C 64 90 82 82 84 62 C 86 42 74 26 50 30 Z" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Stem -->
      <path d="M 50 30 L 50 14 Q 54 10 58 12" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" />
      <!-- Leaves / Sepals -->
      <path d="M 50 30 L 40 22 M 50 30 L 60 22 M 50 30 L 32 32 M 50 30 L 68 32 M 50 30 L 50 38" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" />
    `
  },

  // 4. Pencil (پنسل)
  'sketch.pencil.v1': {
    id: 'sketch.pencil.v1',
    name: 'pencil',
    altText: 'Line drawing of a pencil',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Pencil Body (angled) -->
      <polygon points="20,80 72,28 82,38 30,90" fill="#fff" stroke="#000" stroke-width="2.5" />
      <line x1="25" y1="85" x2="77" y2="33" stroke="#000" stroke-width="1.8" />
      <!-- Tip -->
      <polygon points="20,80 30,90 10,95" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Lead tip -->
      <polygon points="15,87 20,92 10,95" fill="#000" stroke="#000" stroke-width="1" />
      <!-- Eraser & collar -->
      <rect x="75" y="21" width="14" height="14" transform="rotate(45 82 28)" fill="#fff" stroke="#000" stroke-width="2" rx="3" />
    `
  },

  // 5. Mango (آم)
  'sketch.mango.v1': {
    id: 'sketch.mango.v1',
    name: 'mango',
    altText: 'Line drawing of a mango',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Mango outline with characteristic curved beak -->
      <path d="M 48 24 C 64 24 84 36 82 58 C 80 82 56 90 42 88 C 26 86 18 72 20 54 C 22 36 34 24 48 24 Z" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Stem -->
      <path d="M 48 24 L 46 12" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" />
      <!-- Leaf -->
      <path d="M 46 18 C 34 16 30 26 24 28 C 34 32 40 28 46 18 Z" fill="#fff" stroke="#000" stroke-width="2" />
    `
  },

  // 6. Grapes (انگور)
  'sketch.grapes.v1': {
    id: 'sketch.grapes.v1',
    name: 'grapes',
    altText: 'Line drawing of a bunch of grapes',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Stem & vine -->
      <path d="M 50 18 Q 50 10 56 8" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" />
      <path d="M 50 18 C 40 12 30 18 34 26 C 42 26 48 22 50 18 Z" fill="#fff" stroke="#000" stroke-width="2" />
      <!-- Row 1 (top) -->
      <circle cx="40" cy="30" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="60" cy="30" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Row 2 -->
      <circle cx="32" cy="46" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="50" cy="46" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="68" cy="46" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Row 3 -->
      <circle cx="42" cy="62" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="60" cy="62" r="10" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Row 4 -->
      <circle cx="50" cy="78" r="9" fill="#fff" stroke="#000" stroke-width="2.2" />
    `
  },

  // 7. Butterfly (تتلی)
  'sketch.butterfly.v1': {
    id: 'sketch.butterfly.v1',
    name: 'butterfly',
    altText: 'Line drawing of a butterfly',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Body & Head -->
      <ellipse cx="50" cy="54" rx="4" ry="22" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="50" cy="28" r="5" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Antennae -->
      <path d="M 48 24 Q 40 14 36 16" fill="none" stroke="#000" stroke-width="2" />
      <path d="M 52 24 Q 60 14 64 16" fill="none" stroke="#000" stroke-width="2" />
      <!-- Left Upper Wing -->
      <path d="M 46 40 C 26 20 12 34 16 54 C 20 66 46 54 46 54 Z" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Left Lower Wing -->
      <path d="M 46 56 C 26 62 24 78 36 84 C 44 86 48 70 48 70 Z" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Right Upper Wing -->
      <path d="M 54 40 C 74 20 88 34 84 54 C 80 66 54 54 54 54 Z" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Right Lower Wing -->
      <path d="M 54 56 C 74 62 76 78 64 84 C 56 86 52 70 52 70 Z" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Wing spots for coloring -->
      <circle cx="28" cy="44" r="5" fill="none" stroke="#000" stroke-width="1.8" />
      <circle cx="72" cy="44" r="5" fill="none" stroke="#000" stroke-width="1.8" />
    `
  },

  // 8. Cricket Bat (بلا)
  'sketch.cricket-bat.v1': {
    id: 'sketch.cricket-bat.v1',
    name: 'cricket-bat',
    altText: 'Line drawing of a cricket bat',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Handle -->
      <rect x="46" y="10" width="8" height="28" rx="3" fill="#fff" stroke="#000" stroke-width="2.2" />
      <line x1="46" y1="18" x2="54" y2="18" stroke="#000" stroke-width="1.5" />
      <line x1="46" y1="26" x2="54" y2="26" stroke="#000" stroke-width="1.5" />
      <!-- Shoulders & Blade -->
      <path d="M 46 38 C 38 42 38 48 38 52 L 38 88 Q 38 94 50 94 Q 62 94 62 88 L 62 52 C 62 48 62 42 54 38 Z" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Spine crease -->
      <line x1="50" y1="46" x2="50" y2="88" stroke="#000" stroke-width="1.8" />
    `
  },

  // 9. Fish
  'sketch.fish.v1': {
    id: 'sketch.fish.v1',
    name: 'fish',
    altText: 'Line drawing of a fish',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Body -->
      <path d="M 85 50 C 70 26 30 26 15 50 C 30 74 70 74 85 50 Z" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Tail fin -->
      <polygon points="18,50 6,32 10,50 6,68" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Eye -->
      <circle cx="72" cy="46" r="3" fill="#000" />
      <!-- Gill line -->
      <path d="M 64 38 C 58 44 58 56 64 62" fill="none" stroke="#000" stroke-width="2" />
      <!-- Fins -->
      <path d="M 48 33 Q 54 22 62 30" fill="none" stroke="#000" stroke-width="2" />
      <path d="M 48 67 Q 54 78 62 70" fill="none" stroke="#000" stroke-width="2" />
    `
  },

  // 10. Mouse
  'sketch.mouse.v1': {
    id: 'sketch.mouse.v1',
    name: 'mouse',
    altText: 'Line drawing of a little mouse',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Body -->
      <ellipse cx="50" cy="62" rx="26" ry="18" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Head / Snout pointing right -->
      <polygon points="68,52 92,66 68,72" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Nose & Eye -->
      <circle cx="92" cy="66" r="2.5" fill="#000" />
      <circle cx="76" cy="58" r="2" fill="#000" />
      <!-- Large Ears -->
      <circle cx="62" cy="42" r="11" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="50" cy="40" r="9" fill="#fff" stroke="#000" stroke-width="2" />
      <!-- Whiskers -->
      <line x1="84" y1="64" x2="96" y2="58" stroke="#000" stroke-width="1.5" />
      <line x1="84" y1="68" x2="96" y2="74" stroke="#000" stroke-width="1.5" />
      <!-- Tail -->
      <path d="M 24 64 C 14 62 10 50 16 42 Q 20 36 18 30" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" />
    `
  },

  // 11. Apple
  'sketch.apple.v1': {
    id: 'sketch.apple.v1',
    name: 'apple',
    altText: 'Line drawing of an apple',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Apple lobes -->
      <path d="M 50 34 C 44 26 26 24 18 42 C 10 60 22 84 42 88 C 48 89 50 86 50 86 C 50 86 52 89 58 88 C 78 84 90 60 82 42 C 74 24 56 26 50 34 Z" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Stem -->
      <path d="M 50 34 Q 52 20 60 16" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" />
      <!-- Leaf -->
      <path d="M 54 24 C 64 20 72 26 70 30 C 62 30 56 26 54 24 Z" fill="#fff" stroke="#000" stroke-width="2" />
    `
  },

  // 12. Banana
  'sketch.banana.v1': {
    id: 'sketch.banana.v1',
    name: 'banana',
    altText: 'Line drawing of a banana',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Curved banana body -->
      <path d="M 20 74 C 36 86 66 84 84 56 C 88 50 88 44 86 42 C 84 40 78 44 74 48 C 58 70 36 72 24 64 L 20 74 Z" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Stem and tip -->
      <rect x="83" y="38" width="6" height="6" fill="#000" />
      <circle cx="21" cy="70" r="2.5" fill="#000" />
      <!-- Ridge line -->
      <path d="M 22 68 C 40 76 64 72 80 50" fill="none" stroke="#000" stroke-width="1.8" />
    `
  },

  // 13. Lion
  'sketch.lion.v1': {
    id: 'sketch.lion.v1',
    name: 'lion',
    altText: 'Line drawing of a lion head with mane',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Mane -->
      <circle cx="50" cy="50" r="38" fill="#fff" stroke="#000" stroke-width="2.5" stroke-dasharray="8, 3" />
      <!-- Head -->
      <circle cx="50" cy="50" r="24" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Ears -->
      <circle cx="34" cy="30" r="7" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="66" cy="30" r="7" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Eyes -->
      <circle cx="42" cy="46" r="3" fill="#000" />
      <circle cx="58" cy="46" r="3" fill="#000" />
      <!-- Nose & Mouth -->
      <polygon points="50,54 45,50 55,50" fill="#000" />
      <path d="M 45 56 Q 50 62 55 56" fill="none" stroke="#000" stroke-width="2" />
      <!-- Whiskers -->
      <line x1="36" y1="56" x2="24" y2="54" stroke="#000" stroke-width="1.8" />
      <line x1="36" y1="60" x2="24" y2="62" stroke="#000" stroke-width="1.8" />
      <line x1="64" y1="56" x2="76" y2="54" stroke="#000" stroke-width="1.8" />
      <line x1="64" y1="60" x2="76" y2="62" stroke="#000" stroke-width="1.8" />
    `
  },

  // 14. Flower
  'sketch.flower.v1': {
    id: 'sketch.flower.v1',
    name: 'flower',
    altText: 'Line drawing of a flower',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Stem -->
      <line x1="50" y1="50" x2="50" y2="92" stroke="#000" stroke-width="3" stroke-linecap="round" />
      <!-- Leaves -->
      <path d="M 50 70 C 38 66 36 78 50 78 Z" fill="#fff" stroke="#000" stroke-width="2" />
      <path d="M 50 62 C 62 58 64 70 50 70 Z" fill="#fff" stroke="#000" stroke-width="2" />
      <!-- Petals -->
      <circle cx="50" cy="26" r="11" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="70" cy="38" r="11" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="64" cy="60" r="11" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="36" cy="60" r="11" fill="#fff" stroke="#000" stroke-width="2.2" />
      <circle cx="30" cy="38" r="11" fill="#fff" stroke="#000" stroke-width="2.2" />
      <!-- Center -->
      <circle cx="50" cy="46" r="11" fill="#fff" stroke="#000" stroke-width="2.5" />
    `
  },

  // 15. Doll
  'sketch.doll.v1': {
    id: 'sketch.doll.v1',
    name: 'doll',
    altText: 'Line drawing of a simple ragdoll',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Head & Hair -->
      <circle cx="50" cy="28" r="14" fill="#fff" stroke="#000" stroke-width="2.2" />
      <path d="M 36 24 Q 50 14 64 24" fill="none" stroke="#000" stroke-width="2" />
      <circle cx="45" cy="26" r="2" fill="#000" />
      <circle cx="55" cy="26" r="2" fill="#000" />
      <path d="M 46 34 Q 50 38 54 34" fill="none" stroke="#000" stroke-width="1.8" />
      <!-- Dress -->
      <polygon points="50,42 28,78 72,78" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Arms -->
      <line x1="44" y1="46" x2="24" y2="58" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="56" y1="46" x2="76" y2="58" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <!-- Legs -->
      <line x1="42" y1="78" x2="42" y2="94" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="58" y1="78" x2="58" y2="94" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
    `
  },

  // 16. Kite
  'sketch.kite.v1': {
    id: 'sketch.kite.v1',
    name: 'kite',
    altText: 'Line drawing of a kite',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Diamond body -->
      <polygon points="50,12 84,48 50,84 16,48" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Cross spars -->
      <line x1="50" y1="12" x2="50" y2="84" stroke="#000" stroke-width="2" />
      <path d="M 16 48 Q 50 36 84 48" fill="none" stroke="#000" stroke-width="2" />
      <!-- Tail -->
      <path d="M 50 84 Q 58 92 52 98" fill="none" stroke="#000" stroke-width="2" />
      <polygon points="54,92 58,90 56,95" fill="#000" />
    `
  },

  // 17. Caterpillar
  'sketch.caterpillar.v1': {
    id: 'sketch.caterpillar.v1',
    name: 'caterpillar',
    altText: 'Line drawing of a 10-segmented caterpillar for number tracing',
    viewBox: '0 0 500 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <!-- Head on right -->
      <circle cx="465" cy="50" r="26" fill="#fff" stroke="#000" stroke-width="3" />
      <!-- Antennae -->
      <path d="M 470 24 Q 482 10 490 12" fill="none" stroke="#000" stroke-width="2.5" />
      <circle cx="490" cy="12" r="3" fill="#000" />
      <path d="M 458 24 Q 450 10 442 12" fill="none" stroke="#000" stroke-width="2.5" />
      <circle cx="442" cy="12" r="3" fill="#000" />
      <!-- Eyes & Smile -->
      <circle cx="475" cy="44" r="3.5" fill="#000" />
      <path d="M 466 58 Q 476 66 482 58" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <!-- 10 Body segments: 1 to 10 from left to right -->
      <circle cx="35" cy="50" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="75" cy="46" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="115" cy="52" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="155" cy="46" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="195" cy="52" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="235" cy="46" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="275" cy="52" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="315" cy="46" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="355" cy="52" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="395" cy="46" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <circle cx="435" cy="50" r="22" fill="#fff" stroke="#000" stroke-width="2.5" />
      <!-- Little feet -->
      <line x1="35" y1="72" x2="33" y2="82" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="75" y1="68" x2="73" y2="78" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="115" y1="74" x2="113" y2="84" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="155" y1="68" x2="153" y2="78" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="195" y1="74" x2="193" y2="84" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="235" y1="68" x2="233" y2="78" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="275" y1="74" x2="273" y2="84" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="315" y1="68" x2="313" y2="78" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="355" y1="74" x2="353" y2="84" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
      <line x1="395" y1="68" x2="393" y2="78" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
    `
  },

  // 18. Shape: Square
  'shape.square.v1': {
    id: 'shape.square.v1',
    name: 'square',
    altText: 'Geometric square line art',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <rect x="15" y="15" width="70" height="70" fill="#fff" stroke="#000" stroke-width="2.5" />
    `,
    dottedSvgContent: `
      <rect x="15" y="15" width="70" height="70" fill="#fff" stroke="#000" stroke-width="2.5" stroke-dasharray="6, 5" />
    `
  },

  // 19. Shape: Triangle
  'shape.triangle.v1': {
    id: 'shape.triangle.v1',
    name: 'triangle',
    altText: 'Geometric triangle line art',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <polygon points="50,15 88,82 12,82" fill="#fff" stroke="#000" stroke-width="2.5" />
    `
  },

  // 20. Shape: Arrow
  'shape.arrow.v1': {
    id: 'shape.arrow.v1',
    name: 'arrow',
    altText: 'Geometric arrow line art',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <polygon points="15,40 55,40 55,22 88,50 55,78 55,60 15,60" fill="#fff" stroke="#000" stroke-width="2.5" />
    `
  },

  // 21. Shape: Circle
  'shape.circle.v1': {
    id: 'shape.circle.v1',
    name: 'circle',
    altText: 'Geometric circle line art',
    viewBox: '0 0 100 100',
    source: 'BUILTIN',
    printSafe: true,
    svgContent: `
      <circle cx="50" cy="50" r="36" fill="#fff" stroke="#000" stroke-width="2.5" />
    `
  }
}

/**
 * In-memory user uploaded sketch registry
 */
const userUploads = new Map()

/**
 * Validates SVG for security against script injections, events, external resources
 */
export function validateSketchSvg(svgString) {
  if (!svgString || typeof svgString !== 'string') {
    return { valid: false, error: 'SVG content must be a non-empty string' }
  }

  const forbiddenPatterns = [
    /<script/i,
    /<\/script>/i,
    /on\w+\s*=/i,          // onclick, onload, onerror, etc.
    /javascript:/i,
    /data:text\/html/i,
    /<foreignObject/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /xlink:href\s*=\s*["']http/i,
    /href\s*=\s*["']http/i
  ]

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(svgString)) {
      return { valid: false, error: `SVG contains forbidden security pattern: ${pattern.toString()}` }
    }
  }

  return { valid: true }
}

/**
 * Get sketch asset by ID (builtin or uploaded)
 */
export function getSketchAsset(assetId) {
  if (!assetId) return null
  return BUILTIN_SKETCHES[assetId] || userUploads.get(assetId) || null
}

/**
 * List all registered assets
 */
export function getAllSketchAssets() {
  return [...Object.values(BUILTIN_SKETCHES), ...Array.from(userUploads.values())]
}

/**
 * Register a validated user upload asset
 */
export function registerUserSketchAsset(asset) {
  if (!asset || !asset.assetId) {
    throw new Error('Asset must have an assetId')
  }

  if (asset.mimeType === 'image/svg+xml') {
    const val = validateSketchSvg(asset.svgContent)
    if (!val.valid) throw new Error(val.error)
  }

  const record = {
    id: asset.assetId,
    name: asset.name || asset.assetId,
    altText: asset.altText || `Session sketch: ${asset.name || asset.assetId}`,
    viewBox: asset.viewBox || '0 0 100 100',
    source: asset.source || 'USER_UPLOAD',
    mimeType: asset.mimeType || 'image/svg+xml',
    width: asset.width || 100,
    height: asset.height || 100,
    aspectRatio: asset.aspectRatio || 1,
    printSafe: true,
    svgContent: asset.svgContent || '',
    dataUrl: asset.dataUrl || null,
    isSession: true
  }

  userUploads.set(asset.assetId, record)
  return record
}

/**
 * registerSessionSketch — idempotent convenience alias for session-uploaded sketches.
 */
export function registerSessionSketch(uploadedAsset) {
  if (!uploadedAsset) return null
  const id = uploadedAsset.id || uploadedAsset.assetId
  if (id && userUploads.has(id)) {
    return userUploads.get(id)
  }
  return registerUserSketchAsset({ ...uploadedAsset, assetId: id })
}
