const fs = require('fs');
const path = require('path');

const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');

const auditResults = [];

data.papers.forEach((p, pIdx) => {
  const paperReport = {
    index: pIdx + 1,
    id: p.id,
    name: p.name,
    class: p.config?.classLevel || p.config?.className,
    subject: p.config?.subject || p.config?.subjectName,
    language: p.config?.language,
    configuredTotalMarks: Number(p.config?.totalMarks) || 0,
    calculatedTotalMarks: 0,
    sectionCount: (p.official_section || []).length,
    issues: [],
    sectionsDetail: []
  };

  let sumMarks = 0;

  (p.official_section || []).forEach((s, sIdx) => {
    sumMarks += Number(s.marks) || 0;
    const heading = String(s.heading || '').trim();
    const content = String(s.content || '').trim();
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const secIssues = [];

    // 1. Heading Serial check
    const hasSerial = /^(?:Q(?:uestion)?\s*\d+|سوال(?:\s+نمبر)?\s*\d+)/i.test(heading);
    if (!hasSerial) {
      secIssues.push('Heading missing standard Q-serial prefix');
    }
    // Check double serial in heading
    if (/^(?:Q\d+\.\s*Q\d+|سوال\s*نمبر\s*\d+.*سوال\s*نمبر\s*\d+)/i.test(heading)) {
      secIssues.push('Duplicate serial in heading');
    }

    // 2. Marks check
    const headingMarksMatch = heading.match(/\(([^)]*\d+[^)]*)\)\s*$/);
    const headingMarksNum = headingMarksMatch ? parseInt(headingMarksMatch[1].replace(/\D/g, ''), 10) : null;
    if (headingMarksNum !== null && s.marks && headingMarksNum !== Number(s.marks)) {
      secIssues.push(`Marks mismatch: heading says ${headingMarksNum} but section.marks is ${s.marks}`);
    }

    // 3. Question structure detection
    let qType = 'plain_text';
    let subItemCount = 0;

    const isTable = lines.some(l => l.startsWith('|') && l.endsWith('|'));
    const isColumnMatch = isTable && /column|کالم|ملائیں/i.test(heading + content);
    const isTrueFalse = /true|false|درست.*غلط|غلط.*درست|tick/i.test(heading);
    const isVerticalMath = /sums?|addition|subtract|vertical|جمع|تفریق/i.test(heading) || lines.some(l => /^[+-]\s*\d+/.test(l));
    const hasNumberedItems = lines.filter(l => /^([0-9]+|[ivxlcdm]+|[a-d])\s*[.)]/i.test(l)).length;

    if (isColumnMatch) {
      qType = 'matching_columns';
      subItemCount = lines.filter(l => l.startsWith('|') && !l.includes('---') && !/column|کالم/i.test(l)).length;
    } else if (isTable) {
      qType = 'table_grid';
      subItemCount = lines.length;
    } else if (isTrueFalse) {
      qType = 'true_false';
      subItemCount = lines.length;
    } else if (isVerticalMath) {
      qType = 'vertical_math';
      subItemCount = lines.length;
    } else if (/(?:choose|mcq|درست جواب|صحیح جواب)/i.test(heading)) {
      qType = 'mcqs';
      subItemCount = hasNumberedItems || lines.length;
    } else if (hasNumberedItems > 1) {
      qType = 'numbered_subquestions';
      subItemCount = hasNumberedItems;
    } else if (lines.some(l => l.includes('___'))) {
      qType = 'fill_in_the_blanks';
      subItemCount = lines.length;
    } else {
      qType = 'single_open_question';
      subItemCount = 1;
    }

    // Check specific anomalies
    if (content.includes('__________') && lines.length === 1 && lines[0].split('___').length > 3) {
      secIssues.push('Multiple blanks packed on single line without line breaks');
    }

    // Check if lines have trailing/leading whitespace or misaligned numbers
    lines.forEach((line, lIdx) => {
      // Check if serial number is on one line and question text on next line
      if (/^[0-9]+[.)]$/.test(line)) {
        secIssues.push(`Line ${lIdx + 1}: isolated serial number without question text`);
      }
      // Check if underline is separated onto next line
      if (/^_{3,}$/.test(line)) {
        secIssues.push(`Line ${lIdx + 1}: isolated blank line under question stem`);
      }
    });

    if (secIssues.length) {
      paperReport.issues.push({ section: sIdx + 1, heading: heading.slice(0, 45), issues: secIssues });
    }

    paperReport.sectionsDetail.push({
      secNumber: sIdx + 1,
      heading,
      type: qType,
      marks: s.marks,
      subItemCount,
      lineCount: lines.length
    });
  });

  paperReport.calculatedTotalMarks = sumMarks;
  if (paperReport.configuredTotalMarks && sumMarks !== Number(paperReport.configuredTotalMarks)) {
    paperReport.issues.push({
      type: 'TOTAL_MARKS_MISMATCH',
      message: `Config totalMarks (${paperReport.configuredTotalMarks}) does not equal sum of section marks (${sumMarks})`
    });
  }

  auditResults.push(paperReport);
});

fs.writeFileSync('audit_41_papers_full.json', JSON.stringify(auditResults, null, 2));

console.log('=== AUDIT COMPLETE ===');
console.log('Total papers audited:', auditResults.length);
const papersWithIssues = auditResults.filter(p => p.issues.length > 0);
console.log('Papers with detected issues / anomalies:', papersWithIssues.length, 'out of', auditResults.length);

// Breakdown of issue types
let missingPrefixCount = 0;
let marksMismatchCount = 0;
let totalMarksMismatchCount = 0;
let formattingAnomalies = 0;

auditResults.forEach(p => {
  p.issues.forEach(iss => {
    if (iss.type === 'TOTAL_MARKS_MISMATCH') totalMarksMismatchCount++;
    else if (iss.issues) {
      iss.issues.forEach(sub => {
        if (sub.includes('missing standard Q-serial prefix')) missingPrefixCount++;
        else if (sub.includes('Marks mismatch')) marksMismatchCount++;
        else formattingAnomalies++;
      });
    }
  });
});

console.log('Issue breakdown:');
console.log(' - Missing standard Q-serial prefix:', missingPrefixCount);
console.log(' - Marks mismatch between heading & section data:', marksMismatchCount);
console.log(' - Total marks mismatch (config vs sum):', totalMarksMismatchCount);
console.log(' - Formatting / structural anomalies:', formattingAnomalies);
