'use strict'
// PaperDocumentV2 USER_AUTHORED rich-heading persistence boundary.
// Mirrors the canonical editor's deliberately narrow permitted tag/style set.
// Inert JSON only; this guard never renders or modifies teacher content.
const TAGS = new Set(['span','b','strong','i','em','u','s','strike','sup','sub','br'])
const CSS = new Set(['font-weight','font-style','text-decoration','text-decoration-line',
  'font-family','font-size','color','background-color','vertical-align','display','transform'])
const OWN = Object.prototype.hasOwnProperty
function safeInlineHtml(value) {
  if (typeof value !== 'string' || value.length > 8192) return false
  if (/<\s*(?:!|\?|script|iframe|svg|math|style|img|object|embed|form|input|textarea)\b|\bon\w+\s*=|(?:javascript\s*:|expression\s*\(|url\s*\()/i.test(value)) return false
  for (const token of value.match(/<[^>]*>/g) || []) {
    const match = token.match(/^<\s*(\/?)\s*([a-z]+)([\s\S]*?)\s*\/?\s*>$/i)
    if (!match || !TAGS.has(match[2].toLowerCase())) return false
    const attrs = match[3] || ''
    if (match[1] && attrs.trim()) return false
    const remaining = attrs.replace(/\bstyle="([^"]*)"|\bdir="(?:ltr|rtl)"/gi, (_whole, style) => {
      if (style) for (const declaration of style.split(';').filter(Boolean)) {
        const colon = declaration.indexOf(':')
        if (colon < 1 || !CSS.has(declaration.slice(0,colon).trim().toLowerCase())) return 'UNSAFE'
      }
      return ''
    }).trim()
    if (remaining && remaining !== '/') return false
  }
  return !/[<>]/.test(value.replace(/<[^>]*>/g,''))
}
function validatePaperStudioInlineRichText(document) {
  if (!document || !Array.isArray(document.sections)) return null // base schema guard
  for (const [i, section] of document.sections.entries()) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) return `sections[${i}] must be an object`
    if (!OWN.call(section,'editorInlineRichText')) continue
    if (document.documentOrigin !== 'USER_AUTHORED') return `sections[${i}].editorInlineRichText requires USER_AUTHORED`
    const fields = section.editorInlineRichText
    if (!fields || typeof fields !== 'object' || Array.isArray(fields) ||
        Object.keys(fields).some(key => !['headingSerial','headingInstruction'].includes(key)))
      return `sections[${i}].editorInlineRichText contains unauthorized fields`
    for (const [key, html] of Object.entries(fields)) {
      if (!safeInlineHtml(html)) return `sections[${i}].editorInlineRichText.${key} is unsafe or oversized`
    }
  }
  return null
}
module.exports = {safeInlineHtml, validatePaperStudioInlineRichText}
