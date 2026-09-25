const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 1. Paper 19: Class 4 Math (60)
const p19 = data.papers[18];
p19.config.totalMarks = 60;
p19.official_section[0].marks = 15;
p19.official_section[1].marks = 16;
p19.official_section[2].marks = 16;
p19.official_section[3].marks = 13;

// 2. Paper 26: Class 5 Islamiyat Ver B (50)
const p26 = data.papers[25];
p26.config.totalMarks = 50;
p26.official_section[0].marks = 10;
p26.official_section[1].marks = 10;
p26.official_section[2].marks = 10;
p26.official_section[3].marks = 4;
p26.official_section[4].marks = 8;
p26.official_section[5].marks = 8;

// 3. Paper 28: Class 6 Math (50)
const p28 = data.papers[27];
p28.config.totalMarks = 50;
p28.official_section = p28.official_section.filter(s => s.heading || (s.content && !s.content.includes('# Section')));
p28.official_section.forEach((s, idx) => {
  s.sourceOrder = idx + 1;
  if (/MCQ/i.test(s.heading)) s.marks = 5;
  else if (/Fill/i.test(s.heading)) s.marks = 5;
  else if (/Short/i.test(s.heading)) s.marks = 20;
  else if (/Long/i.test(s.heading)) s.marks = 20;
});

// 4. Paper 30: Class 6 Urdu (75)
const p30 = data.papers[29];
p30.config.totalMarks = 75;
p30.official_section = p30.official_section.filter(s => s.heading && s.heading.trim().length > 0);
p30.official_section.forEach((s, idx) => {
  s.sourceOrder = idx + 1;
  if (idx === 0) s.marks = 5;       // درست جواب
  else if (idx === 1) s.marks = 10;  // خالی جگہ
  else if (idx === 2) s.marks = 10;  // الفاظ جملے
  else if (idx === 3) s.marks = 5;   // غلط فقرات
  else if (idx === 4) s.marks = 5;   // واحد جمع
  else if (idx === 5) s.marks = 5;   // مذکر مونث
  else if (idx === 6) s.marks = 10;  // مختصر سوالات
  else if (idx === 7) s.marks = 5;   // اسم کی تعریف
  else if (idx === 8) s.marks = 10;  // درخواست
  else if (idx === 9) s.marks = 10;  // مضمون
});

// 5. Paper 38: Class 8 Tarjuma-tul-Quran (60)
const p38 = data.papers[37];
p38.config.totalMarks = 60;
p38.official_section.forEach(s => { s.marks = 10; });

// 6. Paper 40: Class 8 Math (60)
const p40 = data.papers[39];
p40.config.totalMarks = 60;
p40.official_section = p40.official_section.filter(s => s.heading && s.heading.trim().length > 0);
p40.official_section.forEach((s, idx) => {
  s.sourceOrder = idx + 1;
  if (/MCQ/i.test(s.heading)) s.marks = 10;
  else if (/Short/i.test(s.heading)) s.marks = 30;
  else if (/Long/i.test(s.heading)) s.marks = 20;
});

// Sync selectedQuestions across all 41 papers
data.papers.forEach(p => {
  p.selectedQuestions.official_section = {
    questions: p.official_section,
    marks: Number(p.config.totalMarks) || 0
  };
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Final precision pass complete!');
