import {buildGrade9CoreBlueprint} from './grade9PatternBlueprint.mjs';
import {buildGrade9LanguageBlueprint} from './grade9LanguagePatternBlueprint.mjs';
import {buildGrade9MatricTechBlueprint} from './grade9MatricTechPatternBlueprint.mjs';
export const GRADE9_CORE_SUBJECTS=Object.freeze(['Physics','Chemistry','Biology','Mathematics','Computer Science & Entrepreneurship','Islamiat']);
export const GRADE9_LANGUAGE_SUBJECTS=Object.freeze(['English','Urdu']);
export const GRADE9_PATTERN_SUBJECTS=Object.freeze([...GRADE9_LANGUAGE_SUBJECTS,...GRADE9_CORE_SUBJECTS]);
export const GRADE9_MATRIC_TECH_SUBJECTS=Object.freeze(['Health Sciences-Tech','Agriculture Sciences-Tech','Fashion Designing-Tech','Information & Communication Technologies-Tech','Communication Skills & Personal Grooming-Tech','Physics-Tech','Chemistry-Tech','Biology-Tech','General Science-Tech','Computer Science & Entrepreneurship-Tech']);
export function buildGrade9PatternBlueprint({corePattern,languageHierarchy,matricTechPattern,subject,curriculumTrack='MAINSTREAM'}){
 if(curriculumTrack==='MATRIC_TECH'){
  if(!GRADE9_MATRIC_TECH_SUBJECTS.includes(subject))return{valid:false,errors:['No verified Grade IX 2026 Matric-Tech pattern registered for: '+subject]};
  return buildGrade9MatricTechBlueprint(matricTechPattern,subject);
 }
 if(curriculumTrack!=='MAINSTREAM')return{valid:false,errors:['Unsupported Grade IX curriculum track: '+curriculumTrack]};
 if(GRADE9_CORE_SUBJECTS.includes(subject))return buildGrade9CoreBlueprint(corePattern,subject);
 if(GRADE9_LANGUAGE_SUBJECTS.includes(subject))return buildGrade9LanguageBlueprint(languageHierarchy,subject);
 return{valid:false,errors:['No verified Grade IX 2026 pattern registered for: '+subject]};
}
export function grade9PatternCoverage({corePattern,languageHierarchy,matricTechPattern=null,curriculumTrack='MAINSTREAM'}){
 const subjects=curriculumTrack==='MATRIC_TECH'?GRADE9_MATRIC_TECH_SUBJECTS:GRADE9_PATTERN_SUBJECTS;
 const rows=subjects.map(subject=>{const b=buildGrade9PatternBlueprint({corePattern,languageHierarchy,matricTechPattern,subject,curriculumTrack});return{curriculumTrack,subject,valid:b.valid,totalMarks:b.totalMarks??null,source:b.authority?.sourceDocumentId||b.authority?.notification||b.authority?.artifactSha256||null};});
 return{curriculumTrack,rows,verifiedCount:rows.filter(x=>x.valid).length,totalExpected:rows.length,complete:rows.every(x=>x.valid)};
}
export function grade9AllTrackPatternCoverage({corePattern,languageHierarchy,matricTechPattern}){
 const mainstream=grade9PatternCoverage({corePattern,languageHierarchy,matricTechPattern,curriculumTrack:'MAINSTREAM'});
 const matricTech=grade9PatternCoverage({corePattern,languageHierarchy,matricTechPattern,curriculumTrack:'MATRIC_TECH'});
 return{tracks:{MAINSTREAM:mainstream,MATRIC_TECH:matricTech},verifiedCount:mainstream.verifiedCount+matricTech.verifiedCount,totalExpected:mainstream.totalExpected+matricTech.totalExpected,complete:mainstream.complete&&matricTech.complete};
}
