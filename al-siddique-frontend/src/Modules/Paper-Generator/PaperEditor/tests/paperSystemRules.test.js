import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  normalizeOptionLabel,
  optionLabelParts,
  replaceQuestionSerial,
  replaceSectionMarks,
  resolveSectionTotalMarks,
  resolvePaperTotalMarks,
  buildMarksLedger,
  stampWorkingCopy,
  buildPaperRuleProfile,
  PAPER_LOCKED_HEADER_FIELDS,
  PAPER_EDITABLE_HEADER_FIELDS,
} from '../../paperSystemRules.js'
import { auditOfficialPaperForPrint } from '../../officialPaperRules.js'

test('marks formulas resolve to section totals, not per-item multipliers', () => {
  assert.equal(resolveSectionTotalMarks({ heading:'Q2. Short Questions (3×5=15)', marks:3 }), 15)
  assert.equal(resolveSectionTotalMarks({ heading:'سوال نمبر 4: جواب دیں۔ (2×5=10)', marks:2 }), 10)
  assert.equal(resolveSectionTotalMarks({ heading:'Q1. MCQs (10)', marks:1 }), 10)
})

test('Urdu option labels normalize to Urdu sequence with closing bracket token', () => {
  assert.equal(normalizeOptionLabel('A', 0, true), 'الف')
  assert.equal(normalizeOptionLabel('B', 1, true), 'ب')
  assert.deepEqual(optionLabelParts('A', 0, true), { label:'الف', closingBracket:')', direction:'rtl' })
})

test('question serial and marks are editable without duplicating old labels', () => {
  assert.equal(replaceQuestionSerial('سوال نمبر 8: فصلوں کی اقسام', 3, true), 'سوال نمبر 3: فصلوں کی اقسام')
  assert.equal(replaceQuestionSerial('Q8. Explain photosynthesis', 4, false), 'Q4. Explain photosynthesis')
  assert.equal(replaceSectionMarks('سوال نمبر 2: مختصر سوالات۔ (3×5=15)', 20, true), 'سوال نمبر 2: مختصر سوالات۔ (20 نمبر)')
})

test('Class 7 Social Studies uses the rule engine to reconcile 50 marks and principal corrections', () => {
  const data=JSON.parse(fs.readFileSync(new URL('../../seed-data/official-first-term-2026-v13.json', import.meta.url),'utf8'))
  const paper=data.papers.find(p=>p.id==='official-first-term-2026-class-7-social-studies')
  assert.ok(paper)
  assert.deepEqual(paper.official_section.map(resolveSectionTotalMarks), [10,15,15,10])
  assert.equal(resolvePaperTotalMarks(paper), 50)
  const audit=auditOfficialPaperForPrint(paper)
  assert.equal(audit.explicitSectionSum, 50)
  assert.equal(audit.blocked, false)
  const mcq=paper.official_section[0].content
  assert.match(mcq,/قشر الارض کی کتنی بڑی پلیٹیں ہیں/)
  assert.match(mcq,/ا\) 6\s+ب\) 7\s+ج\) 8/)
  assert.match(mcq,/فصلوں کی کتنی اقسام ہیں/)
  assert.match(mcq,/بین الاقوامی تجارت کن راستوں سے ہوتی ہے/)
})

test('system architecture locks only school name/logo and keeps paper metadata editable', () => {
  assert.deepEqual(PAPER_LOCKED_HEADER_FIELDS, ['schoolName','logo'])
  for (const field of ['title','examType','session','classLevel','className','subject','subjectName','paperCode','timeAllowed','totalMarks','examDate','language','address']) {
    assert.ok(PAPER_EDITABLE_HEADER_FIELDS.includes(field), field + ' should be editable')
  }
  const profile = buildPaperRuleProfile({ config:{ language:'urdu' }, official_section:[] })
  assert.equal(profile.direction, 'rtl')
  assert.equal(profile.presentation.questionHeading, 'right')
  assert.equal(profile.presentation.marksBadge, 'left')
  assert.equal(profile.sourcePolicy.sourceLocked, true)
  assert.equal(profile.sourcePolicy.editsGoToWorkingCopy, true)
})

test('marks ledger compares editable header total against resolved section totals', () => {
  const paper = {
    config:{ totalMarks:50 },
    official_section:[
      { heading:'سوال نمبر 1: درست جواب منتخب کریں۔ (10)', marks:10 },
      { heading:'سوال نمبر 2: مختصر سوالات۔ (3×5=15)', marks:3 },
      { heading:'سوال نمبر 3: مختصر سوالات۔ (3×5=15)', marks:3 },
      { heading:'سوال نمبر 4: تفصیلی سوالات۔ (2×5=10)', marks:2 },
    ]
  }
  const ledger = buildMarksLedger(paper)
  assert.deepEqual(ledger.sectionTotals,[10,15,15,10])
  assert.equal(ledger.questionTotal,50)
  assert.equal(ledger.headerTotal,50)
  assert.equal(ledger.balanced,true)
})

test('saving an official edit stamps a protected working copy instead of changing source policy', () => {
  const source={ id:'official-paper-1', config:{ totalMarks:50 } }
  const edited=stampWorkingCopy({ ...source, config:{ totalMarks:60 } }, source)
  assert.equal(edited.sourceLocked,true)
  assert.equal(edited.userEdited,true)
  assert.equal(edited.sourcePaperId,'official-paper-1')
  assert.equal(edited.paperSystem.workingCopy,true)
  assert.equal(edited.config.totalMarks,60)
})


test('paper workspace navigation exposes only the six supported modules', () => {
  const source=fs.readFileSync(new URL('../../PaperGenerator.jsx', import.meta.url),'utf8')
  const block=source.match(/const MODULE_TABS = \[([\s\S]*?)\]\s*\nconst LEGACY_COMPATIBILITY_TABS/)?.[1] || ''
  for (const label of ['Paper Workspace','Saved Papers','Question Bank','Pre Classes Papers','Daily Diary','Lesson Plans']) assert.equal(block.includes(label),true,label+' should be visible')
  for (const label of ['AI Generator','Manual Draft','Unified Paper Generator','Board Paper Mode','AI Scan','Notes Maker']) assert.equal(block.includes(label),false,label+' should be hidden from normal navigation')
})

test('official rule profile defines one consistent layout and no-silent-rewrite policy', () => {
  const profile=buildPaperRuleProfile({ config:{ language:'english' }, official_section:[] })
  assert.equal(profile.presentation.mcqLayout,'matrix-table')
  assert.equal(profile.presentation.shortLayout,'1-column')
  assert.equal(profile.presentation.pageBorder,'thin')
  assert.equal(profile.presentation.bodyFontSize,13)
  assert.equal(profile.presentation.headingFontSize,14)
  assert.equal(profile.contentPolicy.noSilentAcademicRewrite,true)
  assert.equal(profile.contentPolicy.explicitUserEditsOnly,true)
})
