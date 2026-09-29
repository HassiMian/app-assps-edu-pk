import { PAPER_TEMPLATES } from '../templates/paperTemplates.js'

const URDU_FONT = "'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif"

export const EARLY_YEARS_PREMIUM_TEMPLATES = [
  {
    id: 'little-scholars-navy',
    label: 'Little Scholars Navy',
    shortLabel: 'Scholars',
    desc: 'ASSPS navy with sky-blue child-friendly accents',
    accent: '#123b67',
    accent2: '#38bdf8',
    accentSoft: '#eef8ff',
    pageTint: '#fbfdff',
    border: '#9fc4df',
    headerStyle: 'storybook',
    motif: 'stars',
    badgeBg: '#123b67',
    badgeText: '#ffffff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    urduFont: URDU_FONT,
    premiumEarlyYears: true,
  },
  {
    id: 'sky-explorer',
    label: 'Sky Explorer',
    shortLabel: 'Sky',
    desc: 'Bright sky palette with clean explorer-style lines',
    accent: '#075985',
    accent2: '#0ea5e9',
    accentSoft: '#f0f9ff',
    pageTint: '#fcfeff',
    border: '#9bd5eb',
    headerStyle: 'storybook',
    motif: 'clouds',
    badgeBg: '#075985',
    badgeText: '#ffffff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    urduFont: URDU_FONT,
    premiumEarlyYears: true,
  },
  {
    id: 'mint-discovery',
    label: 'Mint Discovery',
    shortLabel: 'Mint',
    desc: 'Fresh mint details for a calm playful worksheet',
    accent: '#047857',
    accent2: '#34d399',
    accentSoft: '#ecfdf5',
    pageTint: '#fcfffd',
    border: '#9ad9c3',
    headerStyle: 'storybook',
    motif: 'dots',
    badgeBg: '#047857',
    badgeText: '#ffffff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    urduFont: URDU_FONT,
    premiumEarlyYears: true,
  },
  {
    id: 'sunny-sprout',
    label: 'Sunny Sprout',
    shortLabel: 'Sunny',
    desc: 'Warm sunshine accents without heavy colour fill',
    accent: '#a16207',
    accent2: '#f59e0b',
    accentSoft: '#fffbeb',
    pageTint: '#fffefa',
    border: '#e7c778',
    headerStyle: 'storybook',
    motif: 'sun',
    badgeBg: '#a16207',
    badgeText: '#ffffff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    urduFont: URDU_FONT,
    premiumEarlyYears: true,
  },
  {
    id: 'coral-play',
    label: 'Coral Play',
    shortLabel: 'Coral',
    desc: 'Soft coral geometry with a cheerful modern look',
    accent: '#be123c',
    accent2: '#fb7185',
    accentSoft: '#fff1f2',
    pageTint: '#fffdfd',
    border: '#f5b7c2',
    headerStyle: 'storybook',
    motif: 'confetti',
    badgeBg: '#be123c',
    badgeText: '#ffffff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    urduFont: URDU_FONT,
    premiumEarlyYears: true,
  },
  {
    id: 'violet-story',
    label: 'Violet Storybook',
    shortLabel: 'Violet',
    desc: 'Storybook violet details with polished school styling',
    accent: '#6d28d9',
    accent2: '#a78bfa',
    accentSoft: '#f5f3ff',
    pageTint: '#fefeff',
    border: '#c8b8f4',
    headerStyle: 'storybook',
    motif: 'stars',
    badgeBg: '#6d28d9',
    badgeText: '#ffffff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    urduFont: URDU_FONT,
    premiumEarlyYears: true,
  },
]

export const EARLY_YEARS_TEMPLATE_OPTIONS = [
  ...EARLY_YEARS_PREMIUM_TEMPLATES,
  ...PAPER_TEMPLATES.map(template => ({
    ...template,
    shortLabel: template.label.replace(/\s+(Navy|Cyan|Fresh|Gold|Studio|Scholar|Monochrome|Slate)$/i, ''),
    pageTint: '#ffffff',
    accent2: template.border,
    motif: 'classic',
    premiumEarlyYears: false,
    source: 'paper-workspace',
  })),
]

export function getEarlyYearsTemplatePreset(templateId = 'little-scholars-navy') {
  return EARLY_YEARS_TEMPLATE_OPTIONS.find(template => template.id === templateId) || EARLY_YEARS_PREMIUM_TEMPLATES[0]
}

export function getDefaultEarlyYearsTemplateId(classStage = 'starter') {
  const stage = String(classStage || '').toLowerCase()
  if (stage === 'mover') return 'mint-discovery'
  if (stage === 'flyer') return 'violet-story'
  return 'little-scholars-navy'
}
