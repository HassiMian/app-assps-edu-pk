// Full textbook coverage is the default; ALP is a separate verified selection lens.
export const SYLLABUS_MODES=Object.freeze(['full','alp']);
const has=v=>typeof v==='string'&&v.trim().length>0;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
export function syllabusSelectionErrors(q,{syllabusMode='full',examYear}={}){
 if(!SYLLABUS_MODES.includes(syllabusMode))return ['Unknown syllabus mode'];
 if(syllabusMode==='full')return [];
 const s=q?.syllabusScope||{},errors=[];
 if(!Number.isInteger(examYear)||examYear<2000)errors.push('ALP requires an explicit examination year');
 if(s.alpStatus!=='included')errors.push('Question is not verified as included in ALP');
 if(s.examYear!==examYear)errors.push('ALP examination year mismatch');
 if(!has(s.evidenceUrl)||!/^https:\/\//i.test(s.evidenceUrl)||!hash(s.evidenceSha256))
  errors.push('ALP evidence URL/checksum missing');
 if(q?.review?.checks?.syllabus!==true||!has(s.verifiedBy)||
    s.verifiedBy!==q?.review?.reviewers?.syllabus)
  errors.push('ALP eligibility is not independently reviewed');
 return errors;
}
export const matchesSyllabus=(q,selection={})=>syllabusSelectionErrors(q,selection).length===0;
