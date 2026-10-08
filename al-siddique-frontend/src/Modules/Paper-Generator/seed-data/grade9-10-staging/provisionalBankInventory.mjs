// Read-only, reproducible inventory of Grade IX/X provisional starter drafts.
// This tool never imports, publishes, or changes production data.
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const sha256 = value => /^[a-f0-9]{64}$/i.test(String(value ?? ''));
const compareKeys = (a, b) => a.localeCompare(b);

export function inventoryDraftDocuments(documents = []) {
  const subjects = new Map();
  const seenIds = new Map();
  const seenStems = new Map();
  const collisions = [];
  const semanticDuplicates = [];
  const incomplete = [];
  let records = 0;
  let reviewApproved = 0;
  let sourceHashPresent = 0;
  let missingAnswers = 0;
  let missingPages = 0;
  let publicationAllowedFiles = 0;

  for (const {file, data} of documents) {
    if (data?.publicationAllowed === true || data?.liveImportAllowed === true) publicationAllowedFiles++;
    if (!Array.isArray(data?.drafts)) throw new Error('Missing drafts array in ' + file);
    for (const question of data.drafts) {
      records++;
      const id = question?.id;
      const curriculum = question?.curriculum || {};
      const grade = curriculum.grade;
      const subjectId = curriculum.subjectId;
      const medium = question?.medium;
      const edition = curriculum.edition;
      const chapter = question?.chapter?.number;
      const type = question?.type;
      const key = [grade, subjectId, edition, medium].join('|');
      if (!subjects.has(key)) subjects.set(key, {grade, subjectId, edition, medium, count: 0, chapters: new Set(), types: {}, approved: 0});
      const row = subjects.get(key);
      row.count++;
      if (Number.isInteger(chapter)) row.chapters.add(chapter);
      row.types[type] = (row.types[type] || 0) + 1;
      if (question?.review?.status === 'approved' && Object.values(question.review.checks || {}).every(Boolean)) {
        reviewApproved++;
        row.approved++;
      }
      if (sha256(question?.source?.pdfSha256)) sourceHashPresent++;
      if (!Number.isInteger(question?.source?.page)) missingPages++;
      if (!id || !subjectId || ![9, 10].includes(grade) || !Number.isInteger(chapter) || !type || !edition) {
        incomplete.push({file, id: id || null, reason: 'missing-cohort-or-question-metadata'});
      }
      if (id) {
        const prior = seenIds.get(id);
        if (prior) collisions.push({id, firstFile: prior, secondFile: file});
        else seenIds.set(id, file);
      }
      const content = question?.content || {};
      const languages = ['en', 'ur'].filter(lang => normalize(content[lang]?.stem));
      if (!languages.length) incomplete.push({file, id: id || null, reason: 'missing-stem'});
      for (const lang of languages) {
        const stemKey = [grade, subjectId, edition, chapter, type, lang, normalize(content[lang].stem)].join('|');
        const prior = seenStems.get(stemKey);
        if (prior && prior.id !== id) semanticDuplicates.push({language: lang, firstId: prior.id, secondId: id, firstFile: prior.file, secondFile: file});
        else if (!prior) seenStems.set(stemKey, {id, file});
      }
      const answerPresent = type === 'mcq'
        ? Boolean(question?.correctOptionId)
        : languages.some(lang => normalize(content[lang]?.answer) || normalize(content[lang]?.rubric))
          || Boolean(question?.answerKey || question?.rubric);
      if (!answerPresent) missingAnswers++;
    }
  }
  const byCohort = [...subjects.values()].map(row => ({...row, chapters: [...row.chapters].sort((a,b) => a-b)}))
    .sort((a,b) => a.grade-b.grade || compareKeys(a.subjectId,b.subjectId) || compareKeys(a.medium,b.medium));
  return {
    auditKind: 'PROVISIONAL_STARTER_INVENTORY_NOT_RELEASE_CERTIFICATION',
    scope: 'Starter2026 and Starters2026 files only; independent authoring queues are excluded',
    totals: {files: documents.length, records, cohorts: byCohort.length, reviewApproved, sourceHashPresent, missingPages, missingAnswers, publicationAllowedFiles, idCollisions: collisions.length, semanticDuplicates: semanticDuplicates.length, incompleteMetadata: incomplete.length},
    byCohort, collisions, semanticDuplicates, incomplete,
    releaseEligible: false,
    releaseGate: 'Textbook coverage, academic review, full answer verification, and Paper Generator import validation require separate evidence.'
  };
}

export function loadStarterDocuments(directory = dirname(fileURLToPath(import.meta.url))) {
  return readdirSync(directory).filter(name => /Starters?2026\.json$/.test(name)).sort()
    .map(file => ({file, data: JSON.parse(readFileSync(join(directory, file), 'utf8'))}));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = inventoryDraftDocuments(loadStarterDocuments());
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--strict') && (report.totals.idCollisions || report.totals.semanticDuplicates || report.totals.incompleteMetadata || report.totals.publicationAllowedFiles)) process.exitCode = 1;
}

