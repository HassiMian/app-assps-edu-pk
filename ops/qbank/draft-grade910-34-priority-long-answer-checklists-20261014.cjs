#!/usr/bin/env node
'use strict'
// Individually authored, item-specific rubric DRAFTS. No qualified human claim.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const V2=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_34_PRIORITY_LONG_ANSWER_SPECIFIC_DRAFTS_20261014.json')
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
const R={
'IX-AGRI-TECH-ENGLISH-C01-I03':[
'Agricultural production makes staple foods and other farm products available, supporting food supply.',
'Farming creates direct employment and income for farmers and agricultural workers.',
'Farm products provide raw materials for industries and work in transport, storage and trade.',
'Rural income and productive supply chains support markets and the national economy.'],
'IX-AGRI-TECH-ENGLISH-C03-I03':[
'Viable and healthy seed improves establishment and gives a more uniform crop.',
'Fertile, well-structured soil allows roots to obtain nutrients, oxygen and water.',
'Planned irrigation reduces water stress and avoids wasteful or harmful waterlogging.',
'Timely sowing, field monitoring and harvest help crops use the Kharif growing season effectively.'],
'IX-AGRI-TECH-ENGLISH-C09-I03':[
'Clean facilities and equipment reduce unwanted contamination of milk.',
'Healthy animals and appropriate veterinary care support safer quality of output.',
'Prompt cooling and suitable storage slow deterioration and maintain quality.',
'Quality checks, clean handling and traceability protect consumers and build trust.'],
'IX-AGRI-TECH-URDU-C01-I03':[
'زرعی پیداوار خوراک کی دستیابی میں مدد دیتی ہے اور غذائی تحفظ کو مضبوط بناتی ہے۔',
'کھیتی باڑی اور اس سے وابستہ سرگرمیاں دیہی روزگار اور آمدن پیدا کرتی ہیں۔',
'زرعی خام مال خوراک، کپڑے اور دوسری صنعتوں کو سہارا دیتا ہے۔',
'ذخیرہ کاری، نقل و حمل اور تجارت کی سرگرمیاں مقامی اور قومی معیشت سے جڑتی ہیں۔'],
'IX-AGRI-TECH-URDU-C02-I03':[
'فصل کا انتخاب موسم، مقامی آب و ہوا اور زمین کی حالت کے مطابق ہونا چاہیے۔',
'معیاری بیج اور مناسب وقت پر کاشت فصل کے بہتر آغاز میں مدد دیتے ہیں۔',
'آبپاشی کی منصوبہ بندی پانی کی ضروریات کو پورا اور ضیاع کم کرتی ہے۔',
'دستیاب محنت، بجٹ، منڈی اور محفوظ وسائل کے استعمال کو منصوبے میں شامل کیا جائے۔'],
'IX-AGRI-TECH-URDU-C03-I03':[
'صحت مند بیج اور موزوں موسم بہتر اگاؤ کے لیے اہم ہیں۔',
'زرخیز اور مناسب ساخت والی مٹی جڑوں کی نشوونما میں مدد دیتی ہے۔',
'بروقت آبپاشی پانی کی کمی اور ضیاع سے بچانے میں مددگار ہے۔',
'وقت پر کاشت اور فصل کی دیکھ بھال خریف کی پیداوار کو بہتر بنا سکتی ہے۔'],
'IX-AGRI-TECH-URDU-C04-I03':[
'فصلوں کی تبدیلی سے مختلف فصلوں کی غذائی ضروریات کا توازن قائم رکھنے میں مدد ملتی ہے۔',
'مخصوص فصل سے وابستہ بعض نقصان دہ عوامل کے مسلسل بڑھنے کا سلسلہ کم ہو سکتا ہے۔',
'پھلی دار فصلیں موزوں حالات میں زمین میں نائٹروجن کے نظام کو فائدہ دے سکتی ہیں۔',
'مختلف فصلوں کی منصوبہ بندی ایک ہی پیداوار پر انحصار اور موسمی خطرات کم کرتی ہے۔'],
'IX-AGRI-TECH-URDU-C09-I03':[
'دودھ کے حصول اور آلات کی صفائی آلودگی کے امکانات کم کرتی ہے۔',
'جانوروں کی صحت اور مناسب دیکھ بھال معیاری پیداوار میں مدد دیتی ہے۔',
'بروقت ٹھنڈا کرنا اور درست ذخیرہ کاری دودھ کے خراب ہونے کی رفتار کم کرتے ہیں۔',
'معیار کی نگرانی اور محفوظ ترسیل صارفین کے اعتماد کو مضبوط کرتی ہیں۔'],
'IX-BIO-UR-C05-L01':[
'خلیہ (Cell) زندگی کی بنیادی ساختی اور فعلی اکائی ہے۔',
'ایک جیسے یا ملتے جلتے کام کرنے والے خلیے مل کر بافت (Tissue) بناتے ہیں۔',
'مختلف بافتیں مل کر ایک مخصوص کام کرنے والا عضو (Organ) بناتی ہیں۔',
'متعلقہ اعضاء باہمی تعاون سے عضوی نظام (Organ system) بناتے ہیں۔'],
'IX-BIOLOGY-TECH-URDU-C04-L01':[
'مایٹوسس کے نتیجے میں عموماً دو جینیاتی طور پر یکساں دختر خلیے بنتے ہیں۔',
'جسم کی نشوونما کے لیے خلیوں کی تعداد بڑھنا ضروری ہوتا ہے۔',
'خراب یا پرانے خلیوں کی جگہ نئے خلیے بننے میں مایٹوسس مدد دیتا ہے۔',
'عام جسمانی خلیوں کی تقسیم میں کروموسوم کی تعداد برقرار رہتی ہے۔'],
'IX-BIOLOGY-TECH-URDU-C05-L01':[
'خلیہ زندگی کی بنیادی اکائی ہے۔',
'متعلقہ خلیے مل کر بافتیں بناتے ہیں۔',
'بافتوں کے تعاون سے مخصوص فعل رکھنے والے اعضاء بنتے ہیں۔',
'متعدد متعلقہ اعضاء مل کر عضوی نظام بناتے ہیں جو مشترکہ کام انجام دیتا ہے۔'],
'IX-CHEM-2025-C10-T4-02L':[
'Burning fossil fuels adds carbon dioxide and other greenhouse gases to the atmosphere.',
'Greenhouse gases absorb outgoing infrared radiation, contributing to warming.',
'Deforestation can reduce carbon uptake by photosynthesis and also release stored carbon.',
'Reducing emissions, using energy efficiently and conserving/restoring forests support mitigation.'],
'IX-CHEM-2025-C11-T1-02L':[
'Saturated hydrocarbons contain only single carbon-carbon bonds; alkanes are a common example.',
'Unsaturated hydrocarbons contain one or more carbon-carbon multiple bonds, such as alkene double bonds.',
'Bond structure influences characteristic reactions: alkenes often undergo addition reactions.',
'Give accurate examples and avoid assuming every saturated or unsaturated compound has one fixed reactivity under all conditions.'],
'IX-CHEMISTRY-TECH-URDU-C05-L01':[
'حرارت خارج کرنے والے عمل (Exothermic) میں توانائی گرد و پیش کو منتقل ہوتی ہے۔',
'حرارت جذب کرنے والے عمل (Endothermic) میں عمل گرد و پیش سے توانائی لیتا ہے۔',
'پہلے عمل میں ماحول گرم جبکہ دوسرے میں ٹھنڈا محسوس ہو سکتا ہے، حالات اہم ہیں۔',
'توانائی کے تبادلے کے اعتبار سے دونوں کے بنیادی فرق کو درست مثال کے ساتھ واضح کیا جائے۔'],
'IX-CHEMISTRY-TECH-URDU-C08-L01':[
'گروپ میں ایک جیسے بیرونی الیکٹرانوں کا نمونہ عمومی کیمیائی رویے میں مماثلت پیدا کرتا ہے۔',
'دور (Period) میں ایٹمی ساخت بتدریج بدلتی ہے، جس سے خصوصیات میں رجحانات نظر آتے ہیں۔',
'دھاتی کردار اور ایٹمی جسامت جیسے رجحانات سے بعض پیش گوئیاں کی جا سکتی ہیں۔',
'مخصوص عنصر کے لیے استثنا اور حالات کو دیکھے بغیر صرف گروپ نمبر سے ہر خاصیت قطعی نہ مانی جائے۔'],
'IX-CHEMISTRY-TECH-URDU-C09-L01':[
'گروپ 1 کے عناصر کے بیرونی خول میں عموماً ایک الیکٹران ہوتا ہے۔',
'یہ عموماً ایک الیکٹران کھو کر مثبت آئن بنانے کا رجحان رکھتے ہیں۔',
'گروپ 17 کے عناصر میں بیرونی الیکٹران کی تعداد سات ہوتی ہے۔',
'یہ الیکٹران حاصل یا شریک کر کے مستحکم بند بناتے ہیں؛ خصوصیات حالات کے ساتھ بدل سکتی ہیں۔'],
'IX-CHEMISTRY-TECH-URDU-C11-L01':[
'الکینز (Alkanes) میں کاربن کے درمیان صرف سنگل بانڈ ہوتے ہیں؛ یہ سیرشدہ ہوتے ہیں۔',
'الکینز (Alkenes) میں کم از کم ایک کاربن-کاربن ڈبل بانڈ ہوتا ہے؛ یہ غیرسیرشدہ ہیں۔',
'ڈبل بانڈ کی وجہ سے الکینز میں کئی اضافی (Addition) تعاملات کا رجحان پایا جاتا ہے۔',
'متعلقہ ساخت، بند کی نوعیت اور عام کیمیائی رویے کے فرق کو درست مثال سے واضح کیا جائے۔'],
'IX-COMP-U11-L01':[
'Privacy means collecting and sharing only appropriate personal information with consent.',
'Copyright means respecting creators’ rights and using licensed or appropriately attributed material.',
'Respectful online communication avoids bullying and harassment and considers others’ dignity.',
'Data security uses strong authentication and careful access to protect information.',
'Accessibility designs interfaces and content that people with different abilities can use.'],
'IX-COMPENT-TECH-URDU-C01-I03':[
'Input وہ معلومات یا سگنل ہیں جو نظام حاصل کرتا ہے۔',
'Processing میں معلومات کو طے شدہ اصولوں کے مطابق تبدیل یا جانچا جاتا ہے۔',
'Output نتیجہ ہوتا ہے جسے صارف یا دوسرا نظام استعمال کر سکتا ہے۔',
'Feedback نتائج کی معلومات دے کر کارکردگی بہتر کرنے میں مدد دیتا ہے۔'],
'IX-COMPENT-TECH-URDU-C03-I03':[
'منطقی گیٹ Boolean ان پٹ کو صفر اور ایک کی صورت میں لیتے ہیں۔',
'AND میں دونوں ان پٹ درست ہوں تو آؤٹ پٹ درست ہوتا ہے۔',
'OR میں کم از کم ایک ان پٹ درست ہو تو آؤٹ پٹ درست ہوتا ہے۔',
'NOT ان پٹ کی منطقی قدر کو الٹ دیتا ہے؛ گیٹس ملا کر فیصلے بنائے جاتے ہیں۔'],
'IX-COMPENT-TECH-URDU-C06-I03':[
'Decomposition میں بڑے مسئلے کو نسبتاً چھوٹے حصوں میں تقسیم کیا جاتا ہے۔',
'Pattern recognition بار بار آنے والے نمونوں کی شناخت کرتا ہے۔',
'Abstraction ضروری معلومات کو نمایاں اور غیرضروری تفصیل کو الگ کرتی ہے۔',
'Algorithm design مسئلہ حل کرنے کے واضح اور قابلِ عمل مراحل ترتیب دیتا ہے۔'],
'IX-COMPENT-TECH-URDU-C09-I03':[
'Privacy کے لیے ذاتی معلومات کی حفاظت اور مناسب اجازت ضروری ہے۔',
'Copyright دوسروں کی تخلیقی ملکیت اور درست استعمال کے اصولوں کا احترام ہے۔',
'Cyberbullying سے گریز اور احترام پر مبنی رابطہ محفوظ آن لائن ماحول بناتا ہے۔',
'اکاؤنٹ کے ذمہ دارانہ استعمال میں محفوظ لاگ اِن اور دوسروں کے حقوق کا لحاظ شامل ہے۔'],
'IX-GENSCI-TECH-ENGLISH-C04-I03':[
'A balanced diet supplies energy and nutrients needed for growth and normal function.',
'Hygiene helps reduce the spread of avoidable infections.',
'Regular appropriate activity supports cardiovascular, muscular and general health.',
'Sufficient rest and preventive care help recovery, monitoring and early risk reduction.'],
'IX-GENSCI-TECH-ENGLISH-C07-I03':[
'Wind, solar and similar renewable flows are replenished on relatively short timescales, although availability can fluctuate.',
'Coal and petroleum are finite fossil resources formed on geological timescales.',
'Environmental effects vary across technologies; compare emissions, habitat impacts and waste fairly.',
'Long-term sustainability depends on efficiency, storage, infrastructure and responsible resource management.'],
'IX-GENSCI-TECH-ENGLISH-C09-I03':[
'Relevant resistors limit current or divide voltage depending on circuit configuration.',
'Diodes allow current mainly in one direction under normal forward-bias conditions.',
'Transistors can function as electronic switches or amplifiers.',
'Integrated circuit behaviour depends on how components are connected and operated.'],
'IX-GENSCI-TECH-ENGLISH-C10-I03':[
'Scientific understanding enables applications such as health, communication and transport technologies.',
'Innovations can benefit society while creating privacy, environmental and fairness concerns.',
'Public needs and ethical evaluation can guide research priorities and responsible design.',
'Standards, education, transparent testing and proportionate regulation help manage risks.'],
'IX-GENSCI-TECH-URDU-C04-I03':[
'متوازن غذا جسم کو ضروری غذائی اجزاء اور توانائی فراہم کرتی ہے۔',
'صفائی ستھرائی بعض انفیکشن کے پھیلاؤ کو کم کرنے میں مدد دیتی ہے۔',
'مناسب ورزش جسمانی صحت اور روزمرہ فعالیت کے لیے فائدہ مند ہے۔',
'آرام اور احتیاطی نگہداشت بیماری کے خطرات کی بروقت شناخت میں مدد کرتی ہے۔'],
'IX-GENSCI-TECH-URDU-C07-I03':[
'قابلِ تجدید توانائی کے ذرائع قدرتی طور پر نسبتاً جلد بحال ہوتے ہیں، لیکن پیداوار موسم سے متاثر ہو سکتی ہے۔',
'غیرقابلِ تجدید ذرائع محدود ہیں اور ان کی تشکیل میں بہت طویل عرصہ لگتا ہے۔',
'ماحولیاتی اثرات میں اخراج، زمین کے استعمال اور باقیات کا درست تقابل ضروری ہے۔',
'دیرپا استعمال کے لیے توانائی کی بچت اور ذمہ دارانہ منصوبہ بندی اہم ہیں۔'],
'IX-GENSCI-TECH-URDU-C10-I03':[
'سائنسی علم سے نئی ٹیکنالوجی اور عملی سہولتیں پیدا ہو سکتی ہیں۔',
'سماجی فائدے کے ساتھ رازداری، ماحول اور انصاف جیسے مسائل بھی سامنے آ سکتے ہیں۔',
'عوامی ضروریات اور اخلاقی اصول تحقیق اور ڈیزائن کی ترجیحات طے کرنے میں مدد دیتے ہیں۔',
'شفاف جانچ، مناسب ضابطے اور تعلیم ذمہ دارانہ جدت کو سہارا دیتے ہیں۔'],
'IX-ISL-U06-L01':[
'علم حاصل کرنے اور اس پر عمل کرنے کی اہمیت کو زندگی کا حصہ بنایا جائے۔',
'اخلاص، صبر اور دیانت داری کے ذریعے ذاتی کردار بہتر بنایا جائے۔',
'عدل، حسنِ اخلاق اور دوسروں کے احترام کو عملی رویے میں اپنایا جائے۔',
'خدمتِ خلق اور معاشرتی بھلائی کے کاموں میں ذمہ داری سے حصہ لیا جائے۔',
'اختلاف میں حکمت اور اچھا طرزِ گفتگو اختیار کیا جائے۔'],
'IX-MATH-C08-L01':[
'For (p,q)=(True,True), p∧q is True.',
'For (True,False), conjunction is False.',
'For (False,True), conjunction is False.',
'For (False,False), conjunction is False.'],
'IX-MATH-UR-C08-L01':[
'p درست اور q درست ہو تو p∧q درست ہے۔',
'p درست اور q غلط ہو تو p∧q غلط ہے۔',
'p غلط اور q درست ہو تو p∧q غلط ہے۔',
'p غلط اور q غلط ہو تو p∧q غلط ہے۔'],
'X-BIO-2026-C05-B02-L01':[
'Nervous coordination generally uses electrical impulses and neurotransmitters; endocrine coordination uses chemical hormones.',
'Nervous signals move through neurons and synapses; hormones reach targets through the bloodstream.',
'Nervous responses are often rapid; endocrine responses often develop more slowly.',
'Nervous effects are often brief; hormonal effects may last longer.',
'Nervous pathways target connected cells, while hormones affect cells with appropriate receptors.'],
'X-PHY-C16-L03':[
'Ohm’s law gives current I = V/R = 9 V / 3 Ω = 3 A.',
'Electrical power is P = VI = 9 V × 3 A = 27 W.',
'Energy transferred in 10 s is E = Pt = 27 W × 10 s = 270 J.',
'The dimensional checks are V/Ω=A, VA=W and Ws=J.']
}
function draft(){
 const original=require('./verify-grade910-processed-correction-integrity-20261014.cjs').assess()
 if(original.originalsBoundToExactSourceBytesAndRevisionHash!==584)throw Error('ORIGINAL_HASH_UNVERIFIED')
 const flags=original.rows.filter(r=>r.signals.includes('LONG_REFERENCE_EXTREMELY_BRIEF'))
 if(flags.length!==34||Object.keys(R).length!==34)throw Error('LONG_34_SET_DRIFT')
 const index=new Map(flags.map(r=>[r.originalId,r]))
 const rows=Object.keys(R).sort().map(id=>{
  const bound=index.get(id),points=R[id]
  if(!bound||!Array.isArray(points)||points.length<4||points.some(p=>p.length<25))
   throw Error('INCOMPLETE_CONCEPT_SPECIFIC_RUBRIC:'+id)
  const originalReference=bound.originalReferenceAnswer
  const alreadySufficient=['IX-MATH-C08-L01','IX-MATH-UR-C08-L01','X-PHY-C16-L03'].includes(id)
  return{
   originalId:id,originalRevisionSha256:bound.originalRevisionSha256,
   originalSourceFileSha256:bound.sourceFileSha256,medium:bound.medium,type:bound.type,
   sourceOriginalReference:originalReference,
   sourceFlag:'LONG_REFERENCE_EXTREMELY_BRIEF',
   sourceFlagIsOnlyLengthHeuristic:true,
   substantiveDraftPoints:points,numberOfSpecificPoints:points.length,
   contentDraftKind:alreadySufficient?'EXISTING_REFERENCE_MAY_ALREADY_SUFFICE__REVIEW_REQUIRED':'NEW_TOPIC_SPECIFIC_AI_EXPLANATION_PROPOSAL',
   gradeSubjectQuestionMappingSourceCertified:false,
   humanTeacherChecked:false,answerCorrectnessCertified:false,
   actualTextbookEditionAndExerciseVerified:false,
   existingQuestionUnchanged:true,
   academicallyApproved:false,published:false
  }
 })
 return{
  schemaVersion:'assps-grade910-34-content-specific-long-answer-proposals-v1',
  longAnswerSignals:rows.length,contentSpecificAIDrafts:rows.length,
  referenceMayAlreadyBeSufficientButFlaggedOnlyByLength:rows.filter(r=>r.contentDraftKind.startsWith('EXISTING')).length,
  verifiedPublished:0,qualifiedTeacherReviewed:0,
  instruction:'Teacher must verify substance, edition, Urdu equivalence and mark allocation. These are new model-authored content-specific suggestions, not approved book answers.',
  rows
 }
}
function write(){
 const x=draft()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 return{drafts:x.rows.length,reviewFalsePositiveCandidates:x.referenceMayAlreadyBeSufficientButFlaggedOnlyByLength,sha256:sha(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={draft,write,OUT}
