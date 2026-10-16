#!/usr/bin/env python3
"""Original conceptual Grade X Urdu Chemistry 10 answers, 3 specialist-held: never executable lab guides.
Exact frozen question/answer and 2411-row live SHA; reviewer-only research proposals.
"""
from __future__ import annotations
import hashlib, importlib.util, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry10UrduStarter2026.json'
SOURCE_SHA='5c89d545299e106ef13671202f72c920a03669e59123dfd296a283f9e97b6da3'
OUT=ROOT/'docs/question-bank/ASSPS_GRADE10_CHEMISTRY_URDU_10_SAFE_UNAPPROVED_CONCEPTUAL_EXPLANATIONS_20261016.json'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
# Original explanations. Five grading points each; avoid operational chemical
# preparation, temperatures, quantities, mixing, practical extraction or consumption.
DRAFTS={
14:(
'Heating curve کسی مادے کو دی جانے والی حرارتی توانائی اور اس کے درجہ حرارت کے تعلق کی تصویر پیش کرتی ہے۔ جب مادہ ایک ہی حالت میں ہو تو درجہ حرارت بڑھنے سے ذرات کی اوسط حرکی توانائی عموماً بڑھتی ہے۔ حالت تبدیل ہونے کے دوران، خالص مادے کے مناسب مستقل دباؤ پر درجہ حرارت کچھ دیر تقریباً مستقل رہ سکتا ہے، اگرچہ توانائی فراہم ہوتی رہتی ہے۔ یہ توانائی ذرات کے باہمی تعامل اور ترتیب کو بدلنے میں صرف ہوتی ہے؛ اس لیے اسے latent heat سے متعلق سمجھا جاتا ہے۔ تبدیلی مکمل ہونے کے بعد مزید توانائی کے ساتھ درجہ حرارت دوبارہ بڑھ سکتا ہے۔ ذرّاتی نظریہ منحنی خط کے چڑھتے اور ہموار حصوں کی الگ تشریح دیتا ہے۔',
['منحنی خط کی توانائی اور درجہ حرارت والی تعریف','ایک حالت میں حرکی توانائی اور درجہ حرارت','حالت کی تبدیلی کے دوران تقریباً ہموار حصہ','بین الذرات قوتوں اور latent heat کا کردار','حالت کی تبدیلی مکمل ہونے پر نئی ڈھلوان'],
'https://openstax.org/books/chemistry-2e/pages/10-3-phase-transitions'),
15:(
'Mass-to-mass stoichiometry میں متوازن کیمیائی مساوات سے مختلف مادوں کی مقداری نسبت سمجھی جاتی ہے۔ مساوات کا متوازن ہونا اس لیے ضروری ہے کہ دونوں طرف ہر عنصر کے ایٹموں کی تعداد برقرار رہے۔ کسی معلوم مادے کی کمیت اور اس کے molar mass کے تعلق سے mole کی مقدار سمجھی جاتی ہے، پھر مساوات کے coefficients مطلوبہ مادے کے mole سے نسبت ظاہر کرتے ہیں۔ مطلوبہ مادے کے molar mass سے متعلقہ کمیت معلوم کرنے کا اصول سامنے آتا ہے۔ یونٹس کے درست استعمال اور مناسب significant figures کے ذریعے جواب کی معقولیت جانچی جاتی ہے۔ اگر کوئی reactant محدود مقدار میں دستیاب ہو تو limiting reactant کے اثر کو نظر انداز نہیں کرنا چاہیے۔ یہ ایک ریاضیاتی خاکہ ہے، تجرباتی تیاری کی ہدایات نہیں۔',
['مساوات کی درست متوازن صورت','کمیت، molar mass اور moles کا تعلق','coefficients سے mole ratio','مطلوبہ کمیت اور یونٹس کی تصدیق','limiting reactant اور significant figures کا دھیان'],
'https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry'),
16:(
'Redox میں oxidation اور reduction ایک دوسرے سے مربوط تبدیلیاں ہیں۔ الیکٹرانوں کی حقیقی منتقلی والی صورت میں oxidation سے مراد الیکٹران کا ضائع ہونا اور reduction سے مراد الیکٹران حاصل کرنا ہے۔ oxidation number میں اضافہ بھی oxidation کی علامت ہو سکتا ہے، جبکہ اس میں کمی reduction سے وابستہ ہے۔ الیکٹروکیمیائی نظام میں anode وہ جگہ ہے جہاں oxidation اور cathode وہ جگہ ہے جہاں reduction ہوتی ہے؛ یہ تعریف ہر ایسے نظام میں برقرار رہتی ہے۔ Galvanic cell کی مثال میں الیکٹران بیرونی راستے سے anode کی جانب سے cathode کی طرف حرکت کرتے ہیں، مگر الیکٹرو لائٹ کے اندر آئن چارج کے توازن میں کردار ادا کرتے ہیں۔ مثبت یا منفی electrode کی علامت ہر قسم کے cell میں یکساں نہیں ہوتی۔',
['الیکٹران ضائع ہونے کو oxidation سمجھنا','الیکٹران حاصل کرنے کو reduction سمجھنا','oxidation number کی تبدیلی','anode اور cathode کی عمل کے مطابق تعریف','galvanic electron flow اور charge balance'],
'https://openstax.org/books/chemistry-2e/pages/17-2-galvanic-cells'),
17:(
'Collision theory کے مطابق کیمیائی تبدیلی کے لیے مناسب ذرات کا مؤثر ٹکراؤ ضروری ہے، یعنی ٹکراؤ میں کافی توانائی اور مناسب رخ ہونا چاہیے۔ مناسب ردعمل میں reactants کی concentration بڑھنے سے فی حجم ذرات کی تعداد اور ممکنہ ٹکراؤ عموماً زیادہ ہوتے ہیں۔ درجہ حرارت بڑھنے سے ذرات کی توانائی کی تقسیم بدلتی ہے اور زیادہ ٹکراؤ activation energy کی شرط پوری کر سکتے ہیں۔ ٹھوس مادے کی سطح زیادہ دستیاب ہونے پر دوسرے reactant سے رابطہ بڑھ سکتا ہے، اس لیے بعض heterogeneous reactions تیز ہوتے ہیں۔ Catalyst ایک متبادل کم activation-energy راستہ مہیا کر سکتا ہے، مگر ردعمل کے توازن کی آخری کیفیت اس سے نہیں بدلتی۔ یہ عمومی اصول مخصوص reaction اور حالات کے مطابق جانچے جاتے ہیں۔',
['مؤثر ٹکراؤ میں توانائی اور سمت','concentration اور collision frequency','temperature اور activation-energy threshold','surface area اور رابطے کی دستیابی','catalyst اور متبادل کم activation energy راستہ'],
'https://openstax.org/books/chemistry-2e/pages/12-5-collision-theory'),
19:(
'نائٹروجن کے مرکبات زندگی اور صنعت دونوں میں اہم ہیں۔ نائٹروجن پودوں کی پروٹین اور دیگر حیاتیاتی سالمات کی تشکیل کے لیے ضروری عنصر ہے، جبکہ مناسب nitrogen fertilizers فصلوں کی پیداوار میں مدد دے سکتے ہیں۔ ضرورت سے زیادہ غذائی نمکیات پانی کے ذخائر میں eutrophication جیسے مسائل پیدا کر سکتے ہیں۔ Nitrogen oxides بعض اخراجی ذرائع سے فضا میں آ کر ہوا کے معیار اور تیزابی بارش کی تشکیل پر اثر ڈالتے ہیں۔ Sulphur حیاتیاتی پروٹین کے بعض اجزا میں پایا جاتا ہے اور اس کے صنعتی مرکبات مختلف مفید کاموں میں استعمال ہوتے ہیں۔ تاہم sulphur dioxide فضا میں تبدیلیوں کے بعد acid deposition اور سانس کی صحت کے مسائل سے جڑ سکتی ہے۔ ذمہ دارانہ اخراج کی نگرانی اور آلودگی میں کمی بنیادی ماحولیاتی ضرورت ہے۔',
['نائٹروجن کا حیاتیاتی کردار','fertilizers کا مفید اور ممکنہ نقصان دہ اثر','nitrogen oxides اور فضائی آلودگی','سلفر مرکبات کے مفید کردار','sulphur dioxide اور acid deposition'],
'https://www.epa.gov/acidrain/what-acid-rain'),
20:(
'پینے کے پانی کو آلودہ کرنے والے ذرائع میں نامناسب نکاسی، زرعی بہاؤ، بعض صنعتی اخراج اور جراثیمی آلودگی شامل ہو سکتے ہیں۔ گدلا پن، بیماری پھیلانے والے خردنامیوں اور گھلے ہوئے مضر مادوں کی نوعیت ایک دوسرے سے مختلف ہوتی ہے، اس لیے ہر مسئلے کا حل بھی ایک جیسا نہیں۔ پانی کی عمومی صفائی کے نظاموں میں ذرات کی ابتدائی علیحدگی، filtration کے اصول اور جراثیم میں کمی کے لیے مناسب disinfection کے تصورات استعمال ہوتے ہیں۔ تاہم عام فلٹریشن ہر حل شدہ زہریلے کیمیائی مادے کو لازماً نہیں ہٹاتی۔ قابلِ اعتماد معیار کے لیے مسلسل سائنسی testing، متعلقہ معیار کی پابندی اور ماخذ پر آلودگی روکنا ضروری ہے۔ کسی خاص پانی کو محفوظ قرار دینے کے لیے مجاز مقامی معیار اور حقیقی ٹیسٹ شواہد چاہیے۔',
['آلودگی کے مختلف ذرائع','جراثیمی اور کیمیائی آلودگی کا فرق','sedimentation اور filtration کے تصورات','disinfection کی محدودیت','water quality monitoring اور source prevention'],
'https://www.who.int/publications/i/item/9789240121225'),
21:(
'Organic compounds کی شناخت میں functional group، homologous series اور structural formulae مختلف مگر ایک دوسرے سے متعلق کردار ادا کرتے ہیں۔ Functional group سالمے کا وہ مخصوص حصہ ہے جو کئی کیمیائی خصوصیات اور reactions سے متعلق ہوتا ہے، جیسے alcohol میں hydroxyl گروہ۔ Homologous series ایسے متعلقہ مرکبات کا خاندان ہے جن کا بنیادی functional group اور عمومی ساختی سلسلہ ملتا جلتا ہوتا ہے، جبکہ پے در پے ارکان میں اکثر CH₂ کا فرق ہوتا ہے۔ Structural formula ایٹموں کے جوڑنے اور bonds کی ترتیب ظاہر کرتا ہے، اس لیے ایک ہی molecular formula والے بعض isomers بھی واضح ہوتے ہیں۔ Functional group کے ساتھ carbon skeleton کی ساخت بھی properties پر اثر ڈال سکتی ہے۔ محض نام دیکھنے کے بجائے formula اور group دونوں سے درست classification کی جاتی ہے۔',
['functional group کی تعریف','homologous series کا تعلق','پے در پے ارکان میں CH₂ فرق','structural formula اور isomerism','خصوصیات میں functional group اور structure کا اثر'],
'https://openstax.org/books/chemistry-2e/pages/20-2-alcohols-and-ethers'),
22:(
'Alkanes saturated hydrocarbons ہیں جن کے carbon-carbon روابط میں عام طور پر صرف single bonds ہوتے ہیں، جبکہ alkenes میں کم از کم ایک carbon-carbon double bond موجود ہوتا ہے اور وہ unsaturated شمار ہوتے ہیں۔ Double bond میں اضافی pi bond بعض addition reactions کو ممکن بناتا ہے، اس لیے سادہ alkenes کی نمایاں reactivity alkanes سے مختلف ہوتی ہے۔ Alkanes کے لیے بعض حالات میں substitution کا تصور اہم ہے، جبکہ alkenes کی مثالوں میں addition ایک خاص reaction class ہے۔ دونوں قسم کے مرکبات combustion کے ساتھ بھی منسلک ہو سکتے ہیں؛ ان کی ساخت اور reaction conditions نتائج کو متاثر کرتی ہیں۔ عمومی formulae اور chain length سے properties کے رجحان سمجھنے میں مدد ملتی ہے، مگر ہر alkene لازماً ہر alkane سے زیادہ reactive نہیں ہوتا۔',
['alkane میں single bonds اور saturation','alkene میں double bond اور unsaturation','pi bond کا ساختی اثر','substitution اور addition کا تصور','reactivity اور conditions کے بارے میں غیر مطلق تقابل'],
'https://openstax.org/books/chemistry-2e/pages/20-1-hydrocarbons'),
25:(
'Carbohydrates عموماً توانائی اور بعض ساختی کاموں میں مدد دینے والے حیاتیاتی مرکبات ہیں، جن میں سادہ sugars سے بننے والے بڑے polysaccharides بھی شامل ہوتے ہیں۔ Proteins امینو ایسڈز کی زنجیروں سے بنتے ہیں اور خامروں، ساخت، نقل و حمل اور دفاع سمیت کئی کام انجام دیتے ہیں۔ Lipids میں چکنائیاں اور phospholipids جیسے مرکبات آتے ہیں؛ ان کے کردار توانائی کے ذخیرے اور cell membranes سے جڑے ہیں، اگرچہ ان کی ساخت ایک ہی طرح کی polymer chain نہیں ہوتی۔ Nucleic acids یعنی DNA اور RNA nucleotides سے متعلق مالیکیول ہیں، جو وراثتی معلومات کے ذخیرے اور اظہار میں کردار رکھتے ہیں۔ ان چار گروہوں کے building units، bonds اور افعال الگ ہیں، اس لیے صرف توانائی فراہم کرنا ان سب کی مکمل تعریف نہیں۔',
['carbohydrate کی بنیادی اکائیاں اور کردار','protein میں amino acids اور enzymes','lipids میں membranes اور storage','nucleic acids میں nucleotides اور heredity','چاروں کی ساخت و افعال کا متوازن تقابل'],
'https://openstax.org/books/biology-2e/pages/3-1-synthesis-of-biological-macromolecules'),
26:(
'Monomer نسبتاً چھوٹی بنیادی اکائی ہے جس سے مناسب کیمیائی تعلق کے ذریعے بڑے polymer molecules بن سکتے ہیں۔ Polymerization کئی monomer اکائیوں کے جڑ کر ایک بڑی زنجیر یا network بننے کا مجموعی تصور ہے۔ Repeating unit وہ بار بار آنے والا ساختی حصہ ہوتا ہے جسے polymer کی نمائندہ شکل میں دکھایا جاتا ہے۔ Chain length، branching اور intermolecular interactions مواد کی مضبوطی، flexibility اور دوسری خصوصیات پر اثر ڈال سکتے ہیں۔ Polymers گھریلو، طبی اور صنعتی اشیا میں مفید ہو سکتے ہیں، لیکن ہر polymer یکساں آسانی سے recycle نہیں ہوتا۔ ذمہ دارانہ انتظام میں غیر ضروری استعمال کم کرنا، ممکنہ reuse، مقامی قابلِ عمل recycling systems اور مناسب disposal کے اصول شامل ہیں تاکہ آلودگی اور کچرے کو کم کیا جا سکے۔',
['monomer اور polymer کی تعریف','polymerization کا تصور','repeating unit کی ساخت','properties میں chain structure کا کردار','reduce، reuse اور مناسب disposal کی حقیقت پسندانہ وضاحت'],
'https://openstax.org/books/chemistry-2e/pages/20-1-hydrocarbons')
}
def sha(b):return hashlib.sha256(b).hexdigest()
def build(real,hashes,risks):
 if len(DRAFTS)!=10:raise ValueError('CHEMISTRY_URDU_TEN_EXPECTED')
 final=[]
 for chapter,(answer,criteria,reference) in sorted(DRAFTS.items()):
  id=f'X-CHEM-UR-C{chapter:02d}-L01'
  q=real.get(id);risk=risks.get(id)
  if (not isinstance(q,dict) or not isinstance(risk,dict)
      or q.get('grade')!='10th' or q.get('subject')!='Chemistry'
      or q.get('medium')!='Urdu' or q.get('type')!='long'
      or q.get('marks')!=5 or str(q.get('chapter'))!=str(chapter)
      or risk.get('priority')!='HIGH'
      or risk.get('currentLiveContentRevisionSha256')!=hashes.get(id)):
   raise ValueError('NEW_CHEMISTRY_URDU_QUESTION_NOT_VALID_HIGH_CURRENT_REVISION')
  if len(answer.split())<65 or len(criteria)!=5 or len(set(criteria))!=5 or sum('\u0600'<=x<='\u06ff' for x in answer)<130:
   raise ValueError('CHEMISTRY_URDU_CONCEPTUAL_RESEARCH_ANSWER_INCOMPLETE')
  final.append({'questionId':id,'grade':'10th','subject':'Chemistry','medium':'Urdu',
   'marks':5,'storedChapterNumberNotVerifiedTextbookEdition':chapter,
   'originalFrozenSourceFilename':SOURCE.name,'originalFrozenResearchSourceSha256':SOURCE_SHA,
   'liveFullQuestionContentRevisionSha256':hashes[id],
   'originalConceptualExplanationCandidateUrdu':answer,
   'proposedFiveIndependentAssessmentPointsUrdu':criteria,
   'nonSchoolOfficialBackgroundScienceReference':reference,
   'operationalHazardousLabInstructionsProvided':False,
   'independentChemistryTeacherReviewed':False,'independentUrduLanguageReviewed':False,
   'school2026To2027BookAdoptionVerified':False,'actualSourceExercisePageVerified':False,
   'approved':False,'published':False,'paperStudioVerifiedSelectable':False,
   'status':'ORIGINAL_RESEARCH_DRAFT_EXACT_CURRENT_REVISION_AWAIT_AUTHENTIC_REVIEW'})
 return {'schema':'ASSPS_GRADE10_CHEMISTRY_10_SAFE_CONCEPTUAL_URDU_ANSWERS_V1',
   'candidateCount':10,'sourceFrozenResearchSha256':SOURCE_SHA,
   'subject':'Chemistry','grade':'10th','medium':'Urdu',
   'actualSchoolAdoptedTextbookVerified':False,'sourceExercisePageCorroborated':False,
   'qualifiedIndependentChemistryAndUrduReviewCompleted':False,
   'academicApproval':False,'published':False,'paperStudioVerifiedSelectable':False,
   'productionDatabaseWrites':0,'originalConceptualAnswersNotOperationalPreparationGuides':True,
   'specialistHeldNoAIExplanatoryAnswerQuestionIds':['X-CHEM-UR-C18-L01','X-CHEM-UR-C23-L01','X-CHEM-UR-C24-L01'],
   'drafts':final}
def load_current():
 sp=importlib.util.spec_from_file_location('assps_live_reader_for_chemistry',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
 live=m.read_live()
 if len(live)!=2411:raise ValueError('LIVE_BANK_2411_SCOPE_CHANGED')
 real={x['id']:x for x in live}
 led=json.loads((STATE/'live-question-revisions.json').read_text())
 hashes={x['questionId']:x['revisionSha256'] for x in led['records']}
 risk=json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())
 eligible={x['questionId']:x for x in risk['records']}
 if len(hashes)!=2411 or len(eligible)!=604:raise ValueError('LIVE_LEDGER_OR_RISK_SCOPE_DRIFT')
 if sha(SOURCE.read_bytes())!=SOURCE_SHA:raise ValueError('IMMUTABLE_CHEMISTRY_SOURCE_SHA_CHANGED')
 frozen=json.loads(SOURCE.read_text())
 old={x['id']:x for x in frozen['drafts']}
 if len(old)!=len(frozen['drafts']):raise ValueError('ORIGINAL_CHEMISTRY_RESEARCH_ID_DUPLICATED')
 for ch in DRAFTS:
  id=f'X-CHEM-UR-C{ch:02d}-L01'
  if (id not in real or m.revision_sha(real[id])!=hashes.get(id)
      or id not in old or old[id]['type']!='long' or old[id]['marks']!=5
      or old[id]['content']['ur']['stem']!=real[id]['questionText']
      or old[id]['content']['ur']['answer']!=real[id]['answer']):
   raise ValueError('ORIGINAL_CHEMISTRY_STEM_OR_CURRENT_SHA_DRIFT')
 return real,hashes,eligible
def run():
 data=build(*load_current())
 serialized=json.dumps(data,ensure_ascii=False,indent=2,sort_keys=True)+'\n'
 if len(sys.argv)==2 and sys.argv[1]=='--check':
  if not OUT.exists() or OUT.read_text()!=serialized:raise ValueError('CHEMISTRY_CONCEPTUAL_PACKET_TAMPERED')
  print('10_SAFE_ORIGINAL_URDU_CHEMISTRY_QUESTION_SHA_CONTENT_PASS')
 elif len(sys.argv)==1:
  OUT.write_text(serialized,encoding='utf8')
  print('10_SAFE_ORIGINAL_URDU_CHEMISTRY_RESEARCH_ANSWERS_CREATED_NOT_APPROVED')
 else:raise ValueError('USE_CHECK_OR_NO_ARGUMENTS')
if __name__=='__main__':run()
