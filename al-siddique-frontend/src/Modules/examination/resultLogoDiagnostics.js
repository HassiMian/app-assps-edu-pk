// Browser-safe preflight only. A PNG/WebP suffix does not prove alpha pixels;
// authoritative verification requires inspecting the actual binary asset.
export function getResultLogoDiagnostic(value) {
  const src = typeof value === 'string' ? value.trim() : ''
  if (!src) return 'Official school emblem is not configured for this result card.'
  if (/^data:image\/jpe?g[;,]/i.test(src) || /\.jpe?g(?:[?#]|$)/i.test(src)) {
    return 'Current school emblem is JPEG, which cannot contain transparency. Configure an approved transparent PNG/WebP or SVG in school paper settings.'
  }
  return ''
}
