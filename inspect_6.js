const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');
[19, 26, 28, 30, 38, 40].forEach(pNum => {
  const p = data.papers[pNum - 1];
  console.log(`=== Paper ${pNum}: ${p.name} (Cfg: ${p.config?.totalMarks}) ===`);
  p.official_section.forEach((s, i) => console.log(`  Sec ${i+1}: marks=${s.marks} heading="${s.heading}"`));
});
