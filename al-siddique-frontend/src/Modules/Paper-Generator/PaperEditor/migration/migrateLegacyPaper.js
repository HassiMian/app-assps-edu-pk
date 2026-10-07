// migrateLegacyPaper.js — Backward-compatible Migration Adapter for Legacy Saved Papers
import { createPaperDocument, createPaperSection, createPaperQuestion } from '../core/PaperDocument.js'
import { isUrduText } from '../layouts/urduRtlEngine.js'

function parseOptionsFromContent(content = '') {
  const lines = String(content).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const pattern = /(?:^|\s)(?:\(([a-dA-Dا-د])\)|([a-dA-Dا-د])[.)])\s*/g
  for (const line of lines) {
    const matches = [...line.matchAll(pattern)]
    if (matches.length >= 2) {
      return matches.map((match, idx) => ({
        label: (match[1] || match[2]).toUpperCase(),
        text: line.slice(match.index + match[0].length, matches[idx + 1]?.index).trim(),
      }))
    }
  }
  return []
}

export function finiteNumberOr(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function migrateLegacyPaper(raw) {
  if (!raw || typeof raw !== 'object') {
    return createPaperDocument()
  }

  // If it's already a valid PaperDocument v2, return cloned copy with defaults ensured
  if (raw.schemaVersion === 2 && Array.isArray(raw.sections)) {
    return createPaperDocument(raw)
  }

  const legacySource = JSON.parse(JSON.stringify(raw))
  const config = raw.config || {}
  const isUrdu = config.language === 'urdu' || isUrduText(config.title || raw.name)

  const sections = []

  // Check Format 1: Official v12 / PTS Native v13
  const officialList = raw.official_section || raw.selectedQuestions?.official_section?.questions || raw.sections
  if (Array.isArray(officialList) && (raw.documentFormat === 'official-v12' || raw.documentFormat === 'pts-native-v13' || officialList[0]?.heading !== undefined)) {
    // Each item in officialList is a section or question
    officialList.forEach((item, index) => {
      const heading = item.heading || item.title || item.text || `Question ${index + 1}`
      const content = item.content || item.stemText || ''
      const marks = finiteNumberOr(item.marks, 0)
      const isMcqSection = item.type === 'mcq' || item.layoutPreset === 'mcq' || /(?:choose|mcq|معروضی|کثیر\s*الانتخاب)/i.test(heading)

      const parsedOptions = isMcqSection ? parseOptionsFromContent(content) : (item.options || [])

      const question = createPaperQuestion({
        id: item.id || `q_migrated_${index + 1}`,
        qNumber: index + 1,
        type: isMcqSection ? 'mcq' : (item.type || 'short'),
        marks,
        direction: isUrdu ? 'rtl' : 'auto',
        stemText: isMcqSection ? heading : (content || heading),
        stemUrdu: isUrdu ? (isMcqSection ? heading : (content || heading)) : '',
        options: parsedOptions,
        answerLines: finiteNumberOr(item.answerLines, 0),
        stemRich: item.richContent || null,
      })

      const sectionLayout = isMcqSection
        ? { layoutMode: 'compact-grid', columns: finiteNumberOr(item.mcqColumns, 4), borderStyle: 'box', direction: isUrdu ? 'rtl' : 'ltr' }
        : (item.layoutPreset === 'columns'
            ? { layoutMode: '2-column-balanced', columns: finiteNumberOr(item.columnCount, 2), borderStyle: 'none', direction: isUrdu ? 'rtl' : 'ltr' }
            : { layoutMode: '1-column', columns: 1, borderStyle: 'none', direction: isUrdu ? 'rtl' : 'ltr' })

      sections.push(createPaperSection({
        id: item.id ? `sec_${item.id}` : `sec_migrated_${index + 1}`,
        type: isMcqSection ? 'mcq' : 'official_section',
        sectionNumber: index + 1,
        title: heading,
        titleUrdu: isUrdu ? heading : '',
        totalMarks: marks,
        marksPerQuestion: marks,
        layout: sectionLayout,
        richContent: item.richContent || null,
        questions: [question],
      }))
    })
  } else {
    // Format 2: Category based (selectedMCQ, selectedShort, selectedLong, or selectedQuestions object)
    const mcqs = raw.selectedMCQ || raw.mcq || raw.selectedQuestions?.mcq?.questions || []
    const shorts = raw.selectedShort || raw.short || raw.selectedQuestions?.short?.questions || []
    const longs = raw.selectedLong || raw.long || raw.selectedQuestions?.long?.questions || []

    let sectionNum = 1

    if (mcqs.length > 0) {
      const rawMcqMarks = (raw.mcq_marks !== undefined && raw.mcq_marks !== null && raw.mcq_marks !== '')
        ? raw.mcq_marks
        : raw.selectedQuestions?.mcq?.marks
      const marksEach = finiteNumberOr(rawMcqMarks, 1)
      sections.push(createPaperSection({
        id: `sec_mcq_${Date.now()}`,
        type: 'mcq',
        sectionNumber: sectionNum++,
        title: 'Multiple Choice Questions',
        titleUrdu: 'حصہ معروضی',
        marksPerQuestion: marksEach,
        totalMarks: mcqs.length * marksEach,
        layout: {
          layoutMode: 'compact-grid',
          columns: 4,
          borderStyle: raw.editorSettings?.qBorderStyle === 'table' ? 'table' : (raw.editorSettings?.qBorderStyle === 'box' ? 'box' : 'box'),
          direction: isUrdu ? 'rtl' : 'auto',
        },
        questions: mcqs.map((q, idx) => createPaperQuestion({
          id: q.id || `mcq_${idx + 1}`,
          qNumber: idx + 1,
          type: 'mcq',
          marks: finiteNumberOr(q.marks, marksEach),
          direction: isUrdu ? 'rtl' : 'auto',
          stemText: q.en || q.text || '',
          stemUrdu: q.ur || q.textUrdu || '',
          options: (q.options || []).map((opt, oIdx) => ({
            label: opt.key || opt.label || String.fromCharCode(65 + oIdx),
            text: opt.en || opt.text || '',
            textUrdu: opt.ur || opt.textUrdu || '',
            isCorrect: Boolean(opt.correct),
          })),
        })),
      }))
    }

    if (shorts.length > 0) {
      const rawShortMarks = (raw.short_marks !== undefined && raw.short_marks !== null && raw.short_marks !== '')
        ? raw.short_marks
        : raw.selectedQuestions?.short?.marks
      const marksEach = finiteNumberOr(rawShortMarks, 2)
      sections.push(createPaperSection({
        id: `sec_short_${Date.now()}`,
        type: 'short',
        sectionNumber: sectionNum++,
        title: 'Short Questions',
        titleUrdu: 'مختصر سوالات',
        marksPerQuestion: marksEach,
        totalMarks: shorts.length * marksEach,
        layout: {
          layoutMode: '2-column-balanced',
          columns: 2,
          borderStyle: 'none',
          direction: isUrdu ? 'rtl' : 'auto',
        },
        questions: shorts.map((q, idx) => createPaperQuestion({
          id: q.id || `short_${idx + 1}`,
          qNumber: idx + 1,
          type: 'short',
          marks: finiteNumberOr(q.marks, marksEach),
          direction: isUrdu ? 'rtl' : 'auto',
          stemText: q.en || q.text || '',
          stemUrdu: q.ur || q.textUrdu || '',
        })),
      }))
    }

    if (longs.length > 0) {
      const rawLongMarks = (raw.long_marks !== undefined && raw.long_marks !== null && raw.long_marks !== '')
        ? raw.long_marks
        : raw.selectedQuestions?.long?.marks
      const marksEach = finiteNumberOr(rawLongMarks, 5)
      sections.push(createPaperSection({
        id: `sec_long_${Date.now()}`,
        type: 'long',
        sectionNumber: sectionNum++,
        title: 'Long Questions',
        titleUrdu: 'تفصیلی سوالات',
        marksPerQuestion: marksEach,
        totalMarks: longs.length * marksEach,
        layout: {
          layoutMode: '1-column',
          columns: 1,
          borderStyle: 'none',
          direction: isUrdu ? 'rtl' : 'auto',
        },
        questions: longs.map((q, idx) => createPaperQuestion({
          id: q.id || `long_${idx + 1}`,
          qNumber: idx + 1,
          type: 'long',
          marks: finiteNumberOr(q.marks, marksEach),
          direction: isUrdu ? 'rtl' : 'auto',
          stemText: q.en || q.text || '',
          stemUrdu: q.ur || q.textUrdu || '',
        })),
      }))
    }
  }

  // Resolve totalMarks without destructive falsy coercion
  let migratedTotalMarks = 0
  if (config.totalMarks !== undefined && config.totalMarks !== null && config.totalMarks !== '') {
    migratedTotalMarks = finiteNumberOr(config.totalMarks, 0)
  } else {
    // Config total is truly absent: retain deterministic section sum only if sections provide one
    const sectionSum = sections.reduce((sum, s) => sum + (s.totalMarks || 0), 0)
    migratedTotalMarks = sectionSum > 0 ? sectionSum : 0
  }

  return createPaperDocument({
    id: raw.id,
    name: raw.name,
    metadata: {
      title: config.title || raw.name || 'Assessment Paper',
      paperCode: config.paperCode || 'FT26',
      className: config.className || config.classLevel || 'Class 1',
      classLevel: config.classLevel || '1',
      subject: config.subject || config.subjectName || 'General',
      subjectName: config.subjectName || config.subject || 'General',
      examType: config.examType || 'First Term Examination 2026',
      session: config.session || '2026-2027',
      language: config.language || (isUrdu ? 'urdu' : 'english'),
      totalMarks: migratedTotalMarks,
      durationMinutes: finiteNumberOr(config.duration ?? config.durationMinutes, 60),
      timeAllowed: config.timeAllowed || 'As announced',
      examDate: config.examDate || '',
      instructions: config.instructions || '',
    },
    pageSetup: {
      pageSize: 'A4',
      orientation: 'portrait',
      printMode: raw.editorSettings?.printMode || 'a4',
      pageBorder: raw.editorSettings?.pageBorder || 'none',
      watermark: {
        enabled: Boolean(raw.editorSettings?.showWatermark),
        type: 'logo',
        opacity: Number(raw.editorSettings?.watermarkOpacity ?? 0.08),
        scale: Number(raw.editorSettings?.watermarkScale ?? 1.0),
        text: 'AL SIDDIQUE',
      },
    },
    templateId: raw.editorSettings?.template || raw.template || 'academic',
    printSettings: {
      printBubbleSheet: Boolean(raw.editorSettings?.printBubbleSheet || raw.printBubble),
      printAnswerKey: Boolean(raw.editorSettings?.printAnswerKey || raw.printAns),
      showSectionLines: raw.editorSettings?.showSectionLine !== false,
      showUrduHeaders: raw.editorSettings?.showUrduHeaders !== false,
    },
    sections,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    _legacySource: legacySource,
  })
}
