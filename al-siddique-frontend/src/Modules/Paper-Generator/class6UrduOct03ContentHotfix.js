// EMERGENCY 03-Oct-2026: content-only overlay for ONE official Class 6 Urdu paper.
// Original locked V13 teacher reference is NEVER rewritten. No layout/marks edits.
export const CLASS6_URDU_OCT03_ID='official-first-term-2026-class-6-urdu'
export const CLASS6_URDU_OCT03_VERSION='CLASS6_URDU_03OCT_CORRECTED_CONTENT_V1'
export const CLASS6_URDU_EXPECTED_REFERENCE_SHA='577aa9a758791bc380d888507574789da511b5ae16ccf0ce7daceb19d8596c59'
const EXPECTED_MARKS=[0,5,12,12,5,5,5,10,5,10,10]
export const CLASS6_URDU_OCT03_CONTENT=Object.freeze([
 '# حصہ الف - معروضی',
 [
  '1. مذہبی رواداری اور امن و امان کو فروغ ملا:',
  '   ا) میثاقِ مدینہ سے   ب) صلح جوئی سے   ج) اخوت سے   د) عبادت سے',
  '2. بیج سب سے پہلے کہاں جڑ پکڑتا ہے؟',
  '   ا) گھر میں   ب) کارخانے میں   ج) درخت پر   د) مٹی میں',
  '3. نوجوان نسل کسی بھی قوم کے لیے کیا حیثیت رکھتی ہے؟',
  '   ا) المیہ   ب) سرمایہ   ج) بوجھ   د) مسئلہ',
  '4. شکوہ، جوابِ شکوہ اور مسجدِ قرطبہ کس کی نظمیں ہیں؟',
  '   ا) فیض احمد فیض کی   ب) علامہ محمد اقبال کی   ج) مولانا حالی کی   د) حفیظ جالندھری کی',
  '5. میر باقر علی کیا تھے؟',
  '   ا) ریٹائرڈ صوبیدار   ب) ریٹائرڈ تھانے دار   ج) ریٹائرڈ چوکی دار   د) ریٹائرڈ پروفیسر',
 ].join('\n'),
 '1. خوش گوار ماحول __________ کے لیے مفید ہوتا ہے۔\n2. ہیضہ، ٹائیفائیڈ اور پولیو وغیرہ جیسی بیماریاں مختلف __________ کی وجہ سے پیدا ہوتی ہیں۔\n3. تحریکِ پاکستان ہماری تاریخ میں ایک اہم __________ کی حیثیت رکھتی ہے۔\n4. دنیا میں کامرانی، عزت اور نامداری کے لیے ہمیں __________ کرنی چاہیے۔\n5. میثاقِ مدینہ __________ ہم آہنگی کی بنیاد ہے۔',
 'احسن، اخوت، خندہ پیشانی، رواداری، ناگوار',
 '1. آج کی اخبار کہاں ہے؟\n2. اس کا ناک پتلا ہے۔\n3. ہر طرف گھاس ہی گھاس نظر آتا ہے۔\n4. آپ نے کب آنا ہے؟\n5. لڑکوں نے سیر کے لیے جانا ہے۔\n\n# حصہ ب - انشائیہ',
 'حاضر، متاثر، سامع، مقرر، فاتح',
 'شمع، ہوا، مرکز، عارضی، مصیبت، رائے، قطرہ، ہاتھ',
 '1. نظم "ہمدردی" سے کیا سبق ملتا ہے؟\n2. شاعرِ مشرق نوجوانوں میں کیا خصوصیات دیکھنا چاہتے تھے؟\n3. ہم 6 ستمبر کو کون سا دن مناتے ہیں؟\n4. شاعر نے اہلِ علم کے بارے میں کیا کہا ہے؟\n5. شاعر نے مزدوروں کو کس سے تشبیہ دی ہے؟',
 '', '', '',
])
const clone=v=>JSON.parse(JSON.stringify(v))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const isTarget=p=>p?.id===CLASS6_URDU_OCT03_ID&&
 String(p?.config?.classLevel||p?.config?.className)==='6'&&
 String(p?.config?.subject||p?.config?.subjectName||'').toLowerCase()==='urdu'&&
 Number(p?.config?.totalMarks)===75&&p.documentFormat==='pts-native-v13'
const exactShape=(items,original)=>
 Array.isArray(items)&&items.length===11&&items.every((s,i)=>
 s?.id===original[i]?.id&&s?.sourceOrder===original[i]?.sourceOrder&&
 Number(s?.marks)===EXPECTED_MARKS[i]&&s?.heading===original[i]?.heading&&
 s?.text===original[i]?.text&&s?.textUrdu===original[i]?.textUrdu&&
 (s.content===original[i].content||s.content===CLASS6_URDU_OCT03_CONTENT[i]))
export function applyClass6UrduOct03ContentCorrection(store,officialSeed){
 if(store?.seedInfo?.class6UrduOct03Content?.version===CLASS6_URDU_OCT03_VERSION)
  return store
 if(!Array.isArray(store?.savedPapers)||!Array.isArray(officialSeed?.papers))return store
 const reference=officialSeed.papers.find(p=>p?.id===CLASS6_URDU_OCT03_ID)
 const index=store.savedPapers.findIndex(isTarget)
 if(!reference||!isTarget(reference)||index<0||
  reference.sourceContentSha256!==CLASS6_URDU_EXPECTED_REFERENCE_SHA)return store
 const old=store.savedPapers[index]
 // A different active canonical working copy or rewritten question is NOT
 // silently overwritten; only exact source-native mirror content can change.
 if(old?.paperSystem?.workingCopy||old?.canonicalWorkingDraft?.payload||
  old?.sourceContentSha256!==CLASS6_URDU_EXPECTED_REFERENCE_SHA||
  !exactShape(old.official_section,reference.official_section)||
  !exactShape(old.selectedQuestions?.official_section?.questions,
   reference.selectedQuestions?.official_section?.questions))return store
 const next=clone(old)
 const replace=arr=>arr.map((section,i)=>({...section,
  content:CLASS6_URDU_OCT03_CONTENT[i]}))
 next.official_section=replace(old.official_section)
 next.selectedQuestions={
  ...old.selectedQuestions,
  official_section:{...old.selectedQuestions.official_section,
   questions:replace(old.selectedQuestions.official_section.questions)},
 }
 next.teacherContentCorrection={
  version:CLASS6_URDU_OCT03_VERSION,
  originalReferenceSha256:CLASS6_URDU_EXPECTED_REFERENCE_SHA,
  displayMarksSum:79,declaredHeaderMarks:75,
  marksMismatchPendingPrincipalDecision:true,
 }
 const savedPapers=[...store.savedPapers]
 savedPapers[index]=next
 const priorSaved=Array.isArray(store.paperContentHotfixBackups)?
  store.paperContentHotfixBackups:[]
 const needsBackup=!same(old.official_section,next.official_section)||
  !same(old.selectedQuestions,next.selectedQuestions)
 return {
  ...store,savedPapers,
  paperContentHotfixBackups:needsBackup?
   [...priorSaved,{targetId:CLASS6_URDU_OCT03_ID,version:CLASS6_URDU_OCT03_VERSION,
    originalPaper:clone(old)}]:priorSaved,
  seedInfo:{...(store.seedInfo||{}),class6UrduOct03Content:{
   version:CLASS6_URDU_OCT03_VERSION,targetId:CLASS6_URDU_OCT03_ID,
   contentOnly:true,originalReferencePreserved:true,
   originalTargetBackedUp:needsBackup,
   marksMismatchPendingPrincipalDecision:true,
  }},
 }
}
