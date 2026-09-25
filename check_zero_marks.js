const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');
[30, 34, 40].forEach(idx => {
  const p = data.papers[idx];
  console.log(`=== Paper ${idx+1}: ${p.name} ===`);
  console.log('Keys:', Object.keys(p));
  console.log('official_section length:', p.official_section?.length);
  if (p.official_section) {
    p.official_section.forEach((s, si) => {
      console.log(`  Sec ${si+1}: heading="${s.heading}" marks=${s.marks}`);
      console.log(`  Content preview: ${String(s.content).slice(0, 100)}...`);
    });
  }
});
