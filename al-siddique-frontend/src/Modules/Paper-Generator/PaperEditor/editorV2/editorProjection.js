// Pure zero-dependency SHA-256 implementation for deterministic browser and Node compatibility
function pureSha256(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow; const maxWord = mathPow(2, 32); const lengthProperty = 'length';
  let i, j, result = ''; const words = []; const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = []; const k = []; let primeCounter = 0; const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16)); const oldHash = hash; hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const s1_ch = (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ((hash[4] & hash[5]) ^ (~hash[4] & hash[6]));
      const s0_maj = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]));
      const temp1 = (hash[7] + s1_ch + k[i] + w[i]) | 0;
      const temp2 = s0_maj | 0;
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (8 * b)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

export const SUPPORTED_FONTS = [
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Noto Nastaliq Urdu', value: "'Noto Nastaliq Urdu', serif" },
  { label: 'Jameel Noori Nastaleeq', value: "'Jameel Noori Nastaleeq', serif" },
]

export const SUPPORTED_SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36]
export const SUPPORTED_COLORS = ['#111827', '#374151', '#123b67', '#075985', '#06695b', '#9a6a00', '#b91c1c', '#7e22ce']
export const SUPPORTED_HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff']

const ALLOWED_BLOCKS = new Set(['doc', 'paragraph', 'heading', 'hardBreak'])
const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript', 'textStyle', 'highlight'])

const safeDirection = val => (val === 'rtl' || val === 'ltr' ? val : null)
const safeAlign = val => (['left', 'center', 'right', 'justify'].includes(val) ? val : null)
const safeFont = val => (SUPPORTED_FONTS.some(f => f.value === val) ? val : null)
const safeSize = val => {
  if (!val) return null
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
  return SUPPORTED_SIZES.includes(num) ? `${num}pt` : null
}
const safeColor = val => (SUPPORTED_COLORS.includes(val) ? val : null)
const safeHighlight = val => (SUPPORTED_HIGHLIGHTS.includes(val) ? val : null)

/**
 * Sanitizes an individual ProseMirror mark object.
 */
function cleanMark(mark) {
  if (!mark || typeof mark !== 'object' || !ALLOWED_MARKS.has(mark.type)) return null
  if (mark.type === 'textStyle') {
    const attrs = {
      fontFamily: safeFont(mark.attrs?.fontFamily),
      fontSize: safeSize(mark.attrs?.fontSize),
      color: safeColor(mark.attrs?.color),
    }
    return Object.values(attrs).some(Boolean) ? { type: 'textStyle', attrs } : null
  }
  if (mark.type === 'highlight') {
    const color = safeHighlight(mark.attrs?.color)
    return color ? { type: 'highlight', attrs: { color } } : null
  }
  return { type: mark.type }
}

/**
 * Sanitizes a ProseMirror node recursively.
 */
function cleanNode(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 32) return null
  if (node.type === 'text') {
    if (typeof node.text !== 'string') return null
    const marks = Array.isArray(node.marks) ? node.marks.map(cleanMark).filter(Boolean) : []
    return { type: 'text', text: node.text, ...(marks.length ? { marks } : {}) }
  }
  if (node.type === 'hardBreak') {
    return { type: 'hardBreak' }
  }
  if (!ALLOWED_BLOCKS.has(node.type)) return null

  const attrs = {}
  if (node.type === 'paragraph' || node.type === 'heading') {
    const dir = safeDirection(node.attrs?.dir)
    const textAlign = safeAlign(node.attrs?.textAlign)
    if (dir) attrs.dir = dir
    if (textAlign) attrs.textAlign = textAlign
    if (node.type === 'heading') {
      attrs.level = [1, 2, 3, 4].includes(node.attrs?.level) ? node.attrs.level : 2
    }
  }

  const children = Array.isArray(node.content)
    ? node.content.map(child => cleanNode(child, depth + 1)).filter(Boolean)
    : []

  return {
    type: node.type,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    ...(children.length ? { content: children } : {}),
  }
}

/**
 * Sanitizes a full Tiptap JSON document without arbitrary HTML injection.
 */
export function sanitizePaperRichText(value) {
  if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }
  const doc = cleanNode(value)
  return doc?.content?.length ? doc : { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * Pure function: canonical plaintext -> Tiptap ProseMirror Document JSON.
 * Preserves blank lines (each line is an individual paragraph).
 * Does NOT filter out empty lines!
 */
export function canonicalTextToTiptapDoc(text = '', direction = 'auto') {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = normalized.split('\n')
  const dir = safeDirection(direction)

  return {
    type: 'doc',
    content: lines.map(line => {
      const p = { type: 'paragraph' }
      if (dir) {
        p.attrs = { dir }
      }
      if (line.length > 0) {
        p.content = [{ type: 'text', text: line }]
      }
      return p
    }),
  }
}

/**
 * Pure function: extracts plaintext from a Tiptap Doc JSON with exact newline separation.
 * Preserves blank lines without trimming.
 */
export function extractPlainTextFromTiptap(tiptapDoc) {
  if (!tiptapDoc || !Array.isArray(tiptapDoc.content)) return ''

  const lines = tiptapDoc.content.map(block => {
    if (!block || !Array.isArray(block.content)) return ''
    return block.content
      .map(child => {
        if (child?.type === 'text' && typeof child.text === 'string') return child.text
        if (child?.type === 'hardBreak') return '\n'
        return ''
      })
      .join('')
  })

  return lines.join('\n')
}

/**
 * Deterministic JSON stringifier with sorted keys.
 */
export function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']'
  }
  const keys = Object.keys(obj).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

/**
 * Dirty State and Mutation Classification.
 * exact editor plaintext differs from baseline editor plaintext -> academicTextMutated = true
 * sanitized rich JSON differs from baseline rich JSON -> isDirty = true
 *
 * mutationState:
 * - if rich equal: 'PRISTINE'
 * - else if academicTextMutated: 'TEXT_CHANGED'
 * - else: 'FORMATTING_ONLY'
 *
 * No trim() allowed on equality check!
 */
export function computeFieldDirtyState(workingRich, baselineRich, workingPlainText, baselinePlainText) {
  const sanitizedWorking = sanitizePaperRichText(workingRich)
  const sanitizedBaseline = sanitizePaperRichText(baselineRich)

  const workingJsonStr = stableStringify(sanitizedWorking)
  const baselineJsonStr = stableStringify(sanitizedBaseline)

  const isDirty = workingJsonStr !== baselineJsonStr
  const academicTextMutated = String(workingPlainText ?? '') !== String(baselinePlainText ?? '')

  let mutationState = 'PRISTINE'
  if (isDirty) {
    if (academicTextMutated) {
      mutationState = 'TEXT_CHANGED'
    } else {
      mutationState = 'FORMATTING_ONLY'
    }
  }

  return {
    isDirty,
    academicTextMutated,
    mutationState,
    sanitizedWorking,
  }
}

/**
 * Generates a stable canonical baseline compatibility fingerprint.
 */
export function computeCanonicalFingerprint(canonicalDoc) {
  if (!canonicalDoc || typeof canonicalDoc !== 'object') {
    return '0000000000000000000000000000000000000000000000000000000000000000'
  }
  const parts = [
    canonicalDoc.id || '',
    canonicalDoc.sourceIdentity?.sourceDatasetByteSha256 || '',
    canonicalDoc.sourceIdentity?.normalizationManifestByteSha256 || '',
    canonicalDoc.sourceIdentity?.sourceDatasetVersion || '',
    canonicalDoc.schemaVersion || 3,
  ].join('::')

  return pureSha256(parts)
}
