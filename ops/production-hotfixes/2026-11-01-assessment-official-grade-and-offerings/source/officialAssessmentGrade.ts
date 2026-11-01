/**
 * Read-only grade preview. Always use the authenticated school grade policy,
 * never historical 33%-pass / E-grade hardcoding.
 * Whole-number grade settings match the server's fractional floor semantics.
 */
export type OfficialBand = { label: string; from: number; to: number }
export type Offering = { class_name?: string; section?: string; subject?: string }
export type GradeSettingsResponse = { success?: boolean; configured?: boolean; data?: unknown }

export function verifiedBands(response: GradeSettingsResponse | null | undefined): OfficialBand[] {
  if (response?.success !== true || response.configured !== true || !Array.isArray(response.data)) return []
  const bands = response.data.map((raw: any) => ({
    label: String(raw?.label ?? '').trim(),
    from: Number(raw?.from), to: Number(raw?.to),
  }))
  if (bands.length === 0 || !bands.every((b: OfficialBand) =>
    b.label.length > 0 && Number.isInteger(b.from) && Number.isInteger(b.to) &&
    b.from >= 0 && b.to <= 100 && b.to >= b.from
  )) return []
  const coverage = new Array(101).fill(0)
  for (const band of bands) for (let value = band.from; value <= band.to; value++) coverage[value]++
  if (coverage.some(n => n !== 1)) return []
  return bands
}

export function officialGrade(obtained: number, maximum: number, bands: OfficialBand[]): string {
  if (!Number.isFinite(obtained) || !Number.isFinite(maximum) ||
      maximum <= 0 || obtained < 0 || obtained > maximum || !bands?.length) return ''
  const wholePercent = Math.floor((obtained / maximum) * 100)
  const matching = bands.filter(b => wholePercent >= b.from && wholePercent <= b.to)
  return matching.length === 1 ? matching[0].label : ''
}

function canonicalClass(value: string): string {
  const name = String(value || '').trim().toLowerCase().replace(/^class\s+/, '')
  const numeric: Record<string,string> = {
    '1':'one','2':'two','3':'three','4':'four','5':'five',
    '6':'six','7':'seven','8':'eight','9':'nine','10':'ten'
  }
  return numeric[name] || name
}

export function approvedAssessmentSubjects(
  exam: { type?: string; subject_offerings?: Offering[] } | null,
  className: string, section: string, teachingSubjects: string[]
): string[] {
  const assigned = [...new Set((teachingSubjects || []).map(x => String(x).trim()).filter(Boolean))]
  if (!exam || String(exam.type).trim().toUpperCase() !== 'AS') return assigned
  // The backend returns only genuinely Principal-approved offerings for AS.
  // If no verified offering exists, the picker must be empty, not teacher default.
  const allowed = (Array.isArray(exam.subject_offerings) ? exam.subject_offerings : [])
    .filter(o => canonicalClass(o.class_name || '') === canonicalClass(className))
    .filter(o => !String(o.section || '').trim() ||
      String(o.section).trim().toLowerCase() === String(section || '').trim().toLowerCase())
    .map(o => String(o.subject || '').trim().toLowerCase())
  const unique = new Set(allowed)
  return assigned.filter(x => unique.has(x.toLowerCase()))
}
