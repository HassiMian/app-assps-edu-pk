import {buildGrade9CoreBlueprint} from './grade9PatternBlueprint.mjs';
import {buildGrade9LanguageBlueprint} from './grade9LanguagePatternBlueprint.mjs';
export const GRADE9_CORE_SUBJECTS=Object.freeze(['Physics','Chemistry','Biology','Mathematics','Computer Science & Entrepreneurship','Islamiat']);
export const GRADE9_LANGUAGE_SUBJECTS=Object.freeze(['English','Urdu']);
export const GRADE9_PATTERN_SUBJECTS=Object.freeze([...GRADE9_LANGUAGE_SUBJECTS,...GRADE9_CORE_SUBJECTS]);
export function buildGrade9PatternBlueprint({corePattern,languageHierarchy,subject}){
 if(GRADE9_CORE_SUBJECTS.includes(subject))return buildGrade9CoreBlueprint(corePattern,subject);
 if(GRADE9_LANGUAGE_SUBJECTS.includes(subject))return buildGrade9LanguageBlueprint(languageHierarchy,subject);
 return{valid:false,errors:['No verified Grade IX 2026 pattern registered for: '+subject]};
}
export function grade9PatternCoverage({corePattern,languageHierarchy}){
 const rows=GRADE9_PATTERN_SUBJECTS.map(subject=>{const b=buildGrade9PatternBlueprint({corePattern,languageHierarchy,subject});return{subject,valid:b.valid,totalMarks:b.totalMarks??null,source:b.authority?.sourceDocumentId||b.authority?.notification||null};});
 return{rows,verifiedCount:rows.filter(x=>x.valid).length,totalExpected:rows.length,complete:rows.every(x=>x.valid)};
}
