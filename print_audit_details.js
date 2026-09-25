const fs = require('fs');
const audit = JSON.parse(fs.readFileSync('audit_41_papers_full.json', 'utf8'));

audit.forEach(p => {
  if (p.issues.length > 0) {
    console.log('\n========================================');
    console.log(`[#${p.index}] ${p.name}`);
    console.log(`Class: ${p.class} | Subject: ${p.subject} | Lang: ${p.language} | Configured: ${p.configuredTotalMarks} | Calculated Sum: ${p.calculatedTotalMarks}`);
    p.issues.forEach(iss => {
      if (iss.type === 'TOTAL_MARKS_MISMATCH') {
        console.log(`   🚨 ${iss.message}`);
      } else {
        console.log(`   ⚠️ Section ${iss.section} (${iss.heading}):`);
        iss.issues.forEach(i => console.log(`       - ${i}`));
      }
    });
  }
});
