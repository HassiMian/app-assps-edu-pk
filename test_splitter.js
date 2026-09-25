const fs = require('fs');

function parseAllMcqs(content = '') {
  const lines = String(content).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];
  const optionPattern = /(?:^|\s)(?:\(([a-dA-Dا-د])\)|([a-dA-Dا-د])[.)])\s*/g;

  let currentPrompt = '';
  let currentOptions = [];
  let currentQNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const qMatch = line.match(/^(\d+)[.)]\s*(.*)$/);
    const inlineMatches = [...line.matchAll(optionPattern)];

    if (qMatch) {
      if (currentPrompt) {
        questions.push({ qNumber: currentQNum, prompt: currentPrompt, options: currentOptions });
      }
      currentQNum = parseInt(qMatch[1], 10);
      if (inlineMatches.length >= 2) {
        currentPrompt = line.slice(qMatch[1].length + 1, inlineMatches[0].index).replace(/^[.)\s]+/, '').trim();
        currentOptions = inlineMatches.map((match, idx) => ({
          label: (match[1] || match[2]).toUpperCase(),
          text: line.slice(match.index + match[0].length, inlineMatches[idx + 1]?.index).trim(),
        }));
      } else {
        currentPrompt = qMatch[2].trim();
        currentOptions = [];
      }
    } else if (inlineMatches.length >= 2) {
      currentOptions = inlineMatches.map((match, idx) => ({
        label: (match[1] || match[2]).toUpperCase(),
        text: line.slice(match.index + match[0].length, inlineMatches[idx + 1]?.index).trim(),
      }));
    }
  }

  if (currentPrompt) {
    questions.push({ qNumber: currentQNum, prompt: currentPrompt, options: currentOptions });
  }

  return questions;
}

function parseNumberedSubQuestions(content = '') {
  const lines = String(content).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, idx) => {
    const match = line.match(/^(?:(\d+|[ivxlcdm]+|[a-d])\s*[.)]\s*)(.*)$/i);
    if (match) {
      items.push({ num: match[1], text: match[2].trim() });
    } else if (line.includes('__________') || line.includes('=')) {
      items.push({ num: String(idx + 1), text: line });
    }
  });
  return items;
}

// Test with Paper 39 (Class 8 Computer)
const data = require('./al-siddique-frontend/src/Modules/Paper-Generator/seed-data/official-first-term-2026-v12.json');
const p39_sec1 = data.papers[38].official_section[0]; // MCQs
console.log('Testing Paper 39 MCQ parsing:');
const mcqs = parseAllMcqs(p39_sec1.content);
console.log('Parsed MCQs count:', mcqs.length);
console.log(JSON.stringify(mcqs, null, 2));

const p39_sec2 = data.papers[38].official_section[1]; // Short
console.log('\nTesting Paper 39 Short parsing:');
const shorts = parseNumberedSubQuestions(p39_sec2.content);
console.log('Parsed Shorts count:', shorts.length);
console.log(JSON.stringify(shorts.slice(0, 3), null, 2));
