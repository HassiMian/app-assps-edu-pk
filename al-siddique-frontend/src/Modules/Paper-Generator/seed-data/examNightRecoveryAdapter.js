const roman = (n) => ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv'][n] || String(n + 1)

function renderSectionContent(section = {}) {
  const items = Array.isArray(section.items) ? section.items : []
  if (!items.length) return ''
  if (section.type === 'mcq') {
    return items.map((item, index) => {
      const stem = item?.stem ?? String(item ?? '')
      const options = Array.isArray(item?.options) ? item.options : []
      const optionText = options.map((opt, oi) => `(${String.fromCharCode(97 + oi)}) ${opt}`).join('    ')
      return `${roman(index)}. ${stem}${optionText ? `\n${optionText}` : ''}`
    }).join('\n\n')
  }
  return items.map((item, index) => {
    const text = typeof item === 'string' ? item : JSON.stringify(item)
    return /^(?:\d+|[a-z]|[ivxlcdm]+)[.)]\s+/i.test(text) ? text : `${roman(index)}. ${text}`
  }).join('\n')
}

export function buildRecoverySavedPapers(seed = {}) {
  const papers = Array.isArray(seed?.papers) ? seed.papers : []
  const now = new Date().toISOString()
  return papers.map((paper) => {
    const medium = paper.language === 'urdu' ? 'urdu' : 'english'
    const sections = (paper.sections || []).map((section, index) => ({
      id: `${paper.id}-section-${index + 1}`,
      type: 'official_section',
      medium,
      heading: section.heading || `Question ${index + 1}`,
      content: renderSectionContent(section),
      text: section.heading || `Question ${index + 1}`,
      textUrdu: medium === 'urdu' ? (section.heading || '') : '',
      marks: section.marks ?? null,
      sourceOrder: index + 1,
      priority: 'recovery',
    }))
    const totalMarks = Number(paper.totalMarks) || sections.reduce((sum, s) => sum + (Number(s.marks) || 0), 0)
    return {
      id: paper.id,
      name: `First Term Examination 2026 - Class ${paper.classLevel} - ${paper.subject}`,
      documentFormat: 'pts-native-v13',
      recoverySourceVersion: seed.package || 'ASSPS_EXAM_NIGHT_RECOVERY_SOURCE_V3',
      recoverySourceManaged: true,
      sourceNotes: paper.sourceNotes || [],
      config: {
        title: 'FIRST TERM EXAMINATION 2026',
        classLevel: String(paper.classLevel || ''),
        className: String(paper.classLevel || ''),
        subject: paper.subject || '',
        subjectName: paper.subject || '',
        examType: 'First Term Examination 2026',
        language: medium,
        totalMarks,
        session: '2026-2027',
        paperCode: `FT26-${paper.classLevel}-${String(paper.subject || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
        timeAllowed: paper.timeAllowed || '2 Hours',
        examDate: paper.examDate || '__________',
        instructions: paper.instructions || [],
      },
      official_section: sections,
      official_section_marks: totalMarks,
      selectedQuestions: { official_section: { questions: sections, marks: totalMarks } },
      editorSettings: {
        template: 'academic',
        fontFamily: medium === 'urdu' ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Times, serif",
        fontSize: 13,
        headingSize: 14,
      },
      createdAt: now,
      updatedAt: now,
    }
  })
}
