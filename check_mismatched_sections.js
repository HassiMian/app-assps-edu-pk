const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');

[2, 4, 5, 6, 9, 10, 11, 13, 14, 16, 19, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 40, 41].forEach(paperIndex => {
  const p = data.papers[paperIndex - 1];
  console.log(`\n======================================================`);
  console.log(`Paper #${paperIndex}: ${p.name} (Configured Total: ${p.config?.totalMarks})`);
  (p.official_section || []).forEach((s, sIdx) => {
    console.log(`  Sec ${sIdx + 1}: [marks in JSON: ${s.marks}] Heading: "${s.heading}"`);
  });
});
