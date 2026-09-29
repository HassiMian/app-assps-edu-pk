import { PAPER_TEMPLATES } from '../templates/paperTemplates.js'

const URDU_FONT = "'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif"

export const EARLY_YEARS_PREMIUM_TEMPLATES = [
  {
    id:'scholar-spark', label:'Scholar Spark', shortLabel:'Spark',
    desc:'ASSPS signature navy with sky highlights and premium learning-card structure',
    accent:'#123b67', accent2:'#38bdf8', accentSoft:'#eef8ff', pageTint:'#fbfdff', border:'#9fc4df',
    pagePattern:'constellation', headerStyle:'signature', motif:'stars', questionStyle:'card', labelShape:'pill',
    badgeBg:'#123b67', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true, recommendedFor:'starter'
  },
  {
    id:'sky-adventure', label:'Sky Adventure', shortLabel:'Sky',
    desc:'Airy blue worksheet with cloud-line geometry and generous child response space',
    accent:'#075985', accent2:'#0ea5e9', accentSoft:'#effaff', pageTint:'#fcfeff', border:'#99d5eb',
    pagePattern:'waves', headerStyle:'ribbon', motif:'clouds', questionStyle:'soft', labelShape:'rounded-square',
    badgeBg:'#075985', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true, recommendedFor:'starter'
  },
  {
    id:'mint-discovery-v2', label:'Mint Discovery', shortLabel:'Mint',
    desc:'Calm mint learning lab with subtle dot-grid paper and clean activity cards',
    accent:'#047857', accent2:'#34d399', accentSoft:'#ecfdf5', pageTint:'#fcfffd', border:'#9ad9c3',
    pagePattern:'micro-grid', headerStyle:'signature', motif:'dots', questionStyle:'side-accent', labelShape:'ticket',
    badgeBg:'#047857', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true, recommendedFor:'mover'
  },
  {
    id:'sunshine-studio', label:'Sunshine Studio', shortLabel:'Sunny',
    desc:'Warm gold learning sheet with restrained sunshine accents and premium white space',
    accent:'#9a6500', accent2:'#f5b82e', accentSoft:'#fff9e8', pageTint:'#fffefa', border:'#e4c879',
    pagePattern:'sun-lines', headerStyle:'ribbon', motif:'sun', questionStyle:'soft', labelShape:'pill',
    badgeBg:'#9a6500', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true, recommendedFor:'mover'
  },
  {
    id:'coral-creative', label:'Coral Creative', shortLabel:'Coral',
    desc:'Modern coral geometry for colouring, matching and visual language activities',
    accent:'#b4234b', accent2:'#fb7185', accentSoft:'#fff1f4', pageTint:'#fffdfd', border:'#efb6c3',
    pagePattern:'confetti', headerStyle:'editorial-kids', motif:'confetti', questionStyle:'card', labelShape:'rounded-square',
    badgeBg:'#b4234b', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true
  },
  {
    id:'violet-story-v2', label:'Violet Storybook', shortLabel:'Violet',
    desc:'Refined violet storybook styling for Flyer-level reading and writing papers',
    accent:'#5b21b6', accent2:'#a78bfa', accentSoft:'#f5f3ff', pageTint:'#fefeff', border:'#c8b8f4',
    pagePattern:'constellation', headerStyle:'story', motif:'stars', questionStyle:'side-accent', labelShape:'ticket',
    badgeBg:'#5b21b6', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true, recommendedFor:'flyer'
  },
  {
    id:'ferozi-learning-lab', label:'Ferozi Learning Lab', shortLabel:'Ferozi',
    desc:'ASSPS ferozi accent system with crisp laboratory-style learning panels',
    accent:'#0f766e', accent2:'#2dd4bf', accentSoft:'#ecfeff', pageTint:'#fcffff', border:'#99ddd7',
    pagePattern:'micro-grid', headerStyle:'signature', motif:'dots', questionStyle:'card', labelShape:'rounded-square',
    badgeBg:'#0f766e', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true, recommendedFor:'flyer'
  },
  {
    id:'pencil-paper', label:'Pencil & Paper', shortLabel:'Pencil',
    desc:'Low-ink premium monochrome worksheet inspired by high-end school stationery',
    accent:'#334155', accent2:'#94a3b8', accentSoft:'#f8fafc', pageTint:'#ffffff', border:'#cbd5e1',
    pagePattern:'notebook', headerStyle:'minimal-kids', motif:'classic', questionStyle:'underline', labelShape:'rounded-square',
    badgeBg:'#334155', badgeText:'#fff', fontFamily:"'Trebuchet MS','Segoe UI',sans-serif", urduFont:URDU_FONT,
    premiumEarlyYears:true
  },
]

export const EARLY_YEARS_TEMPLATE_OPTIONS = [
  ...EARLY_YEARS_PREMIUM_TEMPLATES,
  ...PAPER_TEMPLATES.map(template => ({
    ...template,
    id: 'workspace-' + template.id,
    workspaceTemplateId: template.id,
    label: 'Workspace · ' + template.label,
    shortLabel: template.label.replace(/\s+(Navy|Cyan|Fresh|Gold|Studio|Scholar|Monochrome|Slate)$/i, ''),
    pageTint:'#ffffff',
    accent2:template.border,
    motif:'classic',
    pagePattern:'none',
    questionStyle:'classic',
    labelShape:'classic',
    premiumEarlyYears:false,
    source:'paper-workspace',
  })),
]

const LEGACY_TEMPLATE_ID_MAP = {
  'little-scholars-navy':'scholar-spark',
  'sky-explorer':'sky-adventure',
  'mint-discovery':'mint-discovery-v2',
  'sunny-sprout':'sunshine-studio',
  'coral-play':'coral-creative',
  'violet-story':'violet-story-v2',
}

export function normalizeEarlyYearsTemplateId(templateId='scholar-spark') {
  const raw=String(templateId||'').trim()
  if(!raw) return 'scholar-spark'
  if(LEGACY_TEMPLATE_ID_MAP[raw]) return LEGACY_TEMPLATE_ID_MAP[raw]
  if(EARLY_YEARS_TEMPLATE_OPTIONS.some(template=>template.id===raw)) return raw
  if(PAPER_TEMPLATES.some(template=>template.id===raw)) return 'workspace-'+raw
  return 'scholar-spark'
}

export function getEarlyYearsTemplatePreset(templateId='scholar-spark') {
  const normalized=normalizeEarlyYearsTemplateId(templateId)
  return EARLY_YEARS_TEMPLATE_OPTIONS.find(template => template.id === normalized)
    || EARLY_YEARS_PREMIUM_TEMPLATES[0]
}

export function getDefaultEarlyYearsTemplateId(classStage='starter') {
  const stage=String(classStage||'').toLowerCase()
  if(stage==='mover') return 'mint-discovery-v2'
  if(stage==='flyer') return 'violet-story-v2'
  return 'scholar-spark'
}
