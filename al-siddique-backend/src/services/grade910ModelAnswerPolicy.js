'use strict'
// Pure policy shared by revision review and metadata-only content audit.
// A directive about marks alone is NOT a student-facing explanatory answer.
// No automatic rewrite or inference that non-flagged answers are correct.
const RUBRIC_DIRECTIVE=/^(?:award\s+(?:(?:\d+|one|two|three|four|five)\s+)?marks?\b|credit\s+marks?\b|marks?\s+for\b)/i
function rubricOnlyLongAnswer(type,answer){
 if(String(type??'').trim().toLowerCase()!=='long')return false
 return RUBRIC_DIRECTIVE.test(String(answer??'').normalize('NFKC').trim())
}
module.exports={rubricOnlyLongAnswer}
