const fs = require('fs');
const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');

const plans = [];

data.papers.forEach((p, idx) => {
  const paperIndex = idx + 1;
  const cfg = Number(p.config?.totalMarks) || 0;
  const sections = p.official_section || [];
  const currentSum = sections.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
  
  const secPlans = sections.map((s, si) => {
    let heading = String(s.heading || '').trim();
    let content = String(s.content || '');
    let marks = Number(s.marks) || 0;
    let layoutPreset = s.layoutPreset || 'auto';
    let columnCount = s.columnCount || 2;

    // Detect layout preset
    if (/column|کالم|ملائیں/i.test(heading + content) && content.includes('|')) {
      layoutPreset = 'columns';
    } else if (/true|false|درست.*غلط|غلط.*درست|tick/i.test(heading)) {
      layoutPreset = 'true-false';
    } else if (/(?:choose|mcq|درست جواب|صحیح جواب)/i.test(heading)) {
      layoutPreset = 'mcq';
    }

    // Parse marks from heading like (10), (10x1=10), (5x2=10), (25)
    // Match pattern =NUM) or = NUM) or (NUM)
    const eqMatch = heading.match(/=\s*(\d+)\s*\)/);
    const parenMatch = heading.match(/\(\s*(\d+)\s*(?:marks?|نمبر)?\s*\)/i);
    const multMatch = heading.match(/\(\s*(\d+)\s*[×x*]\s*(\d+)\s*\)/i);

    let parsedMarks = marks;
    if (eqMatch) {
      parsedMarks = parseInt(eqMatch[1], 10);
    } else if (multMatch) {
      parsedMarks = parseInt(multMatch[1], 10) * parseInt(multMatch[2], 10);
    } else if (parenMatch) {
      parsedMarks = parseInt(parenMatch[1], 10);
    }

    return {
      secIndex: si + 1,
      oldHeading: heading,
      newHeading: heading,
      oldMarks: marks,
      parsedMarks,
      layoutPreset,
      contentPreview: content.slice(0, 50).replace(/\n/g, ' ')
    };
  });

  plans.push({
    paperIndex,
    name: p.name,
    cfg,
    currentSum,
    sections: secPlans
  });
});

fs.writeFileSync('proposed_repair_plan.json', JSON.stringify(plans, null, 2));

console.log('Proposed repair plan written to proposed_repair_plan.json');
