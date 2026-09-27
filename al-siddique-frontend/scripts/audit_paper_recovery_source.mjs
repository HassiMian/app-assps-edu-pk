import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inferOfficialSectionKind, parseMcqRows, extractMarksLabel } from '../src/Modules/Paper-Generator/officialSectionSemantics.js'
import { resolvePaperRoute, isUrduScriptPaper } from '../src/Modules/Paper-Generator/resolvePaperRoute.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/Modules/Paper-Generator/seed-data/official-first-term-2026-v13.json'),'utf8'))
const ey = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/Modules/Paper-Generator/PaperEditor/earlyYears/data/early-years-first-term-2026-source-v2.json'),'utf8'))
const report = { official:[], earlyYears:[], failures:[], summary:{} }

for (const paper of seed.papers) {
  const sections = paper.official_section || []
  const route = resolvePaperRoute(paper)
  const isUrdu = isUrduScriptPaper(paper)
  const kinds = {}
  let mcqSections = 0
  let mcqRows = 0
  let mcqParseFailures = 0
  let markers = 0
  let sourceOrderOk = true
  let priorOrder = -Infinity

  for (const [index, section] of sections.entries()) {
    const order = Number(section.sourceOrder ?? index)
    if (order < priorOrder) sourceOrderOk = false
    priorOrder = order
    const kind = inferOfficialSectionKind(section)
    kinds[kind] = (kinds[kind] || 0) + 1
    if (kind === 'marker') markers += 1
    if (kind === 'mcq') {
      mcqSections += 1
      const rows = parseMcqRows(section.content)
      mcqRows += rows.length
      if (!rows.length || rows.some(row => row.options.length < 2)) mcqParseFailures += 1
    }
  }
  const entry = {
    id:paper.id,
    classLevel:paper.config?.classLevel,
    subject:paper.config?.subject,
    language:paper.config?.language,
    isUrdu,
    route,
    sectionCount:sections.length,
    kinds,
    mcqSections,
    mcqRows,
    mcqParseFailures,
    markers,
    sourceOrderOk,
    totalMarks:paper.config?.totalMarks
  }
  report.official.push(entry)
  if (route !== 'build') report.failures.push(`${paper.id}: route ${route}, expected build`)
  if (!sourceOrderOk) report.failures.push(`${paper.id}: source order regression`)
  if (mcqParseFailures) report.failures.push(`${paper.id}: ${mcqParseFailures} MCQ section(s) failed semantic parse`)
}

for (const paper of ey.papers || []) {
  const route = resolvePaperRoute(paper)
  const qCount = (paper.questions || []).length
  report.earlyYears.push({ id:paper.id, className:paper.classDisplayName, subject:paper.subject, route, questionCount:qCount })
  if (route !== 'early_years') report.failures.push(`${paper.id}: route ${route}, expected early_years`)
}

report.summary = {
  officialCount:report.official.length,
  earlyYearsCount:report.earlyYears.length,
  officialBuildRoutes:report.official.filter(p=>p.route==='build').length,
  earlyYearsRoutes:report.earlyYears.filter(p=>p.route==='early_years').length,
  mcqSections:report.official.reduce((s,p)=>s+p.mcqSections,0),
  mcqRows:report.official.reduce((s,p)=>s+p.mcqRows,0),
  UrduPapers:report.official.filter(p=>p.isUrdu).length,
  failures:report.failures.length
}
const out = path.resolve(__dirname, '../../runtime/paper_recovery_source_audit.json')
fs.writeFileSync(out, JSON.stringify(report,null,2))
console.log(JSON.stringify(report.summary,null,2))
for (const p of report.official) {
  console.log(`${p.id} | route=${p.route} | rtl=${p.isUrdu} | sections=${p.sectionCount} | mcqSections=${p.mcqSections} | mcqRows=${p.mcqRows} | kinds=${JSON.stringify(p.kinds)}`)
}
for (const p of report.earlyYears) console.log(`${p.id} | route=${p.route} | q=${p.questionCount}`)
if (report.failures.length) {
  console.error('FAILURES:')
  report.failures.forEach(f=>console.error('-',f))
  process.exitCode = 1
} else {
  console.log('SOURCE AUDIT PASS')
}
