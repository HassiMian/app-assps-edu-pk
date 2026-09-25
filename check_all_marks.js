const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');

console.log('Index | Class | Subject | Lang | Configured Marks | Sum of Section Marks | Section Count');
console.log('-----------------------------------------------------------------------------------');
data.papers.forEach((p, idx) => {
  const sum = (p.official_section || []).reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
  const cfg = Number(p.config?.totalMarks) || 0;
  const match = sum === cfg ? '✅' : '❌';
  console.log(`${String(idx + 1).padStart(2)} | ${String(p.config?.classLevel).padEnd(5)} | ${String(p.config?.subject).padEnd(20)} | ${String(p.config?.language).padEnd(7)} | ${String(cfg).padStart(5)} | ${String(sum).padStart(5)} ${match} | ${p.official_section?.length || 0}`);
});
