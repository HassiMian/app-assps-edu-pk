const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Starting Phase 1 Repairs on', data.papers.length, 'papers...');

data.papers.forEach((p, pIdx) => {
  const paperNum = pIdx + 1;
  const isUrdu = p.config?.language === 'urdu';

  // 1. Clean sections: remove any section with empty heading and only markdown heading "# Section"
  p.official_section = (p.official_section || []).filter(s => {
    const heading = String(s.heading || '').trim();
    const content = String(s.content || '').trim();
    if (!heading && /^#\s*Section/i.test(content)) {
      return false; // strip dummy section
    }
    return true;
  });

  // 2. Paper-specific repairs
  switch (paperNum) {
    case 2: // Class 1 Countdown (Mathematics) - Total 50
      p.config.totalMarks = 50;
      p.official_section.forEach(s => { s.marks = 10; });
      break;

    case 4: // Class 2 Urdu - Total 80
      p.config.totalMarks = 80;
      break;

    case 5: // Class 2 English - Total 80
      p.config.totalMarks = 80;
      break;

    case 6: // Class 2 Islamiyat - Total 50
      p.config.totalMarks = 50;
      break;

    case 9: // Class 3 Urdu - Total 85
      p.config.totalMarks = 85;
      break;

    case 10: // Class 3 Science - Total 60
      p.config.totalMarks = 60;
      break;

    case 11: // Class 3 Social Studies - Total 50
      p.config.totalMarks = 50;
      break;

    case 13: // Class 3 Islamiyat - Total 60
      p.config.totalMarks = 60;
      break;

    case 14: // Class 4 English - Total 65
      p.config.totalMarks = 65;
      break;

    case 16: // Class 4 Islamiyat - Total 45
      p.config.totalMarks = 45;
      break;

    case 19: // Class 4 Mathematics - Total 60
      p.config.totalMarks = 60;
      if (p.official_section[1]) p.official_section[1].marks = 16;
      if (p.official_section[2]) p.official_section[2].marks = 14;
      if (p.official_section[3]) p.official_section[3].marks = 20;
      break;

    case 24: // Class 5 Mathematics - Total 60
      p.config.totalMarks = 60;
      if (p.official_section[0]) p.official_section[0].marks = 15;
      if (p.official_section[1]) p.official_section[1].marks = 16;
      if (p.official_section[2]) p.official_section[2].marks = 16;
      if (p.official_section[3]) p.official_section[3].marks = 13;
      break;

    case 25: // Class 5 English - Total 75
      p.config.totalMarks = 75;
      const marks25 = [10, 15, 10, 10, 10, 5, 10, 5];
      p.official_section.forEach((s, idx) => {
        s.marks = marks25[idx] || 5;
      });
      break;

    case 26: // Class 5 Islamiyat Ver B - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 10;
      if (p.official_section[2]) p.official_section[2].marks = 10;
      if (p.official_section[3]) p.official_section[3].marks = 10;
      if (p.official_section[4]) p.official_section[4].marks = 10;
      break;

    case 27: // Class 6 Science - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 10;
      if (p.official_section[2]) p.official_section[2].marks = 20;
      if (p.official_section[3]) p.official_section[3].marks = 10;
      break;

    case 28: // Class 6 Mathematics - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 5;
      if (p.official_section[1]) p.official_section[1].marks = 5;
      if (p.official_section[2]) p.official_section[2].marks = 20;
      if (p.official_section[3]) p.official_section[3].marks = 20;
      break;

    case 29: // Class 6 Islamiyat - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 5;
      if (p.official_section[1]) p.official_section[1].marks = 15;
      if (p.official_section[2]) p.official_section[2].marks = 15;
      if (p.official_section[3]) p.official_section[3].marks = 15;
      break;

    case 30: // Class 6 Urdu - Total 75
      p.config.totalMarks = 75;
      // Adjust slightly: Q2 10, Q3 10 gives exact 75
      if (p.official_section[1]) p.official_section[1].marks = 10; // خالی جگہ
      if (p.official_section[2]) p.official_section[2].marks = 10; // الفاظ جملے
      break;

    case 31: // Class 6 English - Total 75
      p.config.totalMarks = 75;
      const marks31 = [10, 5, 5, 10, 15, 10, 10, 10];
      p.official_section.forEach((s, idx) => {
        s.marks = marks31[idx] || 10;
      });
      break;

    case 33: // Class 7 Social Studies - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 15;
      if (p.official_section[2]) p.official_section[2].marks = 15;
      if (p.official_section[3]) p.official_section[3].marks = 10;
      break;

    case 34: // Class 7 Mathematics - Total 60
      p.config.totalMarks = 60;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 16;
      if (p.official_section[2]) p.official_section[2].marks = 14;
      if (p.official_section[3]) p.official_section[3].marks = 20;
      break;

    case 35: // Class 7 English - Total 75
      p.config.totalMarks = 75;
      const marks35 = [15, 5, 10, 5, 10, 10, 5, 5, 10];
      p.official_section.forEach((s, idx) => {
        s.marks = marks35[idx] || 5;
      });
      break;

    case 36: // Class 8 Social Studies - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 20;
      if (p.official_section[2]) p.official_section[2].marks = 20;
      break;

    case 37: // Class 8 Islamiyat - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 12;
      if (p.official_section[2]) p.official_section[2].marks = 10;
      if (p.official_section[3]) p.official_section[3].marks = 8;
      if (p.official_section[4]) p.official_section[4].marks = 10;
      break;

    case 38: // Class 8 Tarjuma-tul-Quran - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 10;
      if (p.official_section[2]) p.official_section[2].marks = 10;
      if (p.official_section[3]) p.official_section[3].marks = 10;
      if (p.official_section[4]) p.official_section[4].marks = 10;
      break;

    case 39: // Class 8 Computer - Total 50
      p.config.totalMarks = 50;
      if (p.official_section[0]) p.official_section[0].marks = 5;
      if (p.official_section[1]) p.official_section[1].marks = 20;
      if (p.official_section[2]) p.official_section[2].marks = 20;
      if (p.official_section[3]) p.official_section[3].marks = 5;
      break;

    case 40: // Class 8 Mathematics - Total 60
      p.config.totalMarks = 60;
      if (p.official_section[0]) p.official_section[0].marks = 10;
      if (p.official_section[1]) p.official_section[1].marks = 30;
      if (p.official_section[2]) p.official_section[2].marks = 20;
      break;

    case 41: // Class 8 English - Total 75
      p.config.totalMarks = 75;
      const marks41 = [10, 5, 15, 5, 10, 10, 10, 10];
      p.official_section.forEach((s, idx) => {
        s.marks = marks41[idx] || 10;
        // Clean embedded # Section B
        if (s.content && s.content.includes('# Section B')) {
          s.content = s.content.replace(/#\s*Section\s*B/gi, '').trim();
        }
      });
      break;
  }

  // 3. Normalize Headings, Question Serials, Layout Presets
  p.official_section.forEach((s, sIdx) => {
    s.sourceOrder = sIdx + 1;
    let heading = String(s.heading || '').trim();
    let content = String(s.content || '');

    // Layout presets detection
    if (/column|کالم|ملائیں/i.test(heading + content) && content.includes('|')) {
      s.layoutPreset = 'columns';
      s.columnCount = 2;
    } else if (/true\s*(?:or|\/)?\s*false|درست.*غلط|غلط.*درست|tick the true/i.test(heading)) {
      s.layoutPreset = 'true-false';
    } else if (/(?:choose|mcq|درست جواب|صحیح جواب)/i.test(heading)) {
      s.layoutPreset = 'mcq';
    }

    // Standardize Question serial numbering prefix in heading if missing
    const hasSerial = /^(?:Q(?:uestion)?\s*\d+|سوال(?:\s+نمبر)?\s*\d+)/i.test(heading);
    if (!hasSerial && heading) {
      if (isUrdu) {
        s.heading = `سوال نمبر ${sIdx + 1}: ${heading}`;
      } else {
        s.heading = `Q${sIdx + 1}. ${heading}`;
      }
    }
  });

  // 4. Synchronize selectedQuestions.official_section
  if (!p.selectedQuestions) p.selectedQuestions = {};
  p.selectedQuestions.official_section = {
    questions: p.official_section,
    marks: Number(p.config.totalMarks) || 0
  };
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Phase 1 Repairs successfully applied to official-first-term-2026-v12.json!');
