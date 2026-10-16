#!/usr/bin/env python3
"""Ten Grade IX original ethical exemplars; no quotations, publisher copying, or human signoff."""
import collections,hashlib,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SEED=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
PUB=ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=ROOT/'docs/question-bank/ASSPS_GRADE9_ISLAMIAT_TARJUMA_10_ORIGINAL_UNAPPROVED_ETHICAL_EXEMPLARS_20261016.json'
ANS={
'IX-ISL-U02-L01':('''ایمان انسان میں مقصد اور اپنے عمل کی ذمہ داری کا احساس پیدا کرتا ہے۔ عبادات اس شعور کو عادت بنانے میں مدد دیتی ہیں۔ نماز کی پابندی سے وقت کی قدر اور نظم سیکھنے کا موقع ملتا ہے۔ زکوٰۃ کے ذریعے ضرورت مندوں کا خیال رکھنے اور معاشرتی تعاون کی اہمیت واضح ہوتی ہے۔ روزے کا تربیتی پہلو صبر اور ضبطِ نفس ہے۔ ان عبادات کی اخلاقی تاثیر اس وقت نظر آتی ہے جب انسان معاملات میں سچ بولے، امانت کا خیال رکھے اور دوسروں کے حقوق ادا کرے۔ اس طرح عبادات فرد کی تربیت اور معاشرے میں ہمدردی، اعتماد اور ذمہ داری پیدا کرنے سے مربوط ہیں۔''',
['ایمان اور مقصد کی وضاحت','نماز سے نظم و تعلق','زکوٰۃ اور سماجی تعاون','روزہ اور صبر و ضبط نفس','عملی اخلاق اور حقوق العباد']),
'IX-ISL-U05-L01':('''حسنِ معاملات کا مطلب یہ ہے کہ انسان دوسروں کے ساتھ دیانت اور انصاف سے پیش آئے۔ سچائی کی وجہ سے لوگ درست معلومات پر بھروسہ کر سکتے ہیں۔ گواہی دیتے وقت پسند یا ناپسند کے بجائے حقیقت بیان کرنا حقوق کی حفاظت کے لیے ضروری ہے۔ وعدہ پورا کرنے سے انسان قابل اعتماد بنتا ہے۔ حقوق العباد میں کسی کی عزت، مال اور جائز حق ضائع نہ کرنا شامل ہے۔ انصاف کا تقاضا ہے کہ ایک ہی اصول سب کے لیے اختیار کیا جائے۔ مثال کے طور پر کسی کی امانت واپس کرنا یا اختلاف میں سچی بات کہنا اچھے معاملات کی عملی صورتیں ہیں۔ یہ رویے تنازعات کم کر کے تعاون بڑھاتے ہیں۔''',
['حسن معاملات کی تعریف','سچائی اور معتبر گواہی','وعدے اور امانت کی پابندی','حقوق العباد اور منصفانہ فیصلہ','عملی مثال اور سماجی اعتماد']),
'IX-ISL-U06-L01':('''صحابہ، صحابیات اور اہل علم کی زندگیوں سے پانچ عمومی عملی سبق اخذ کیے جا سکتے ہیں۔ پہلا علم حاصل کرنے کی کوشش ہے، تاکہ فیصلے معتبر معلومات پر ہوں۔ دوسرا اخلاص ہے، یعنی خدمت میں اپنی شہرت کے بجائے فائدہ پیش نظر رکھنا۔ تیسرا صبر ہے، جس سے مشکلات کے باوجود مناسب کام جاری رکھا جاتا ہے۔ چوتھا عدل ہے، جو دوست اور مخالف سب کے جائز حقوق کے احترام کا تقاضا کرتا ہے۔ پانچواں حسن اخلاق ہے، یعنی نرم گفتگو، اختلاف میں تہذیب اور ضرورت مند کی مدد۔ طالب علم تحقیق، دیانت دارانہ کام، دوستوں کے احترام اور باہمی تعاون سے ان اصولوں پر عمل کر سکتا ہے۔''',
['علم کے حصول کا سبق','اخلاص اور خدمت','صبر اور ثابت قدمی','عدل اور حقوق کا احترام','حسن اخلاق اور عملی اطلاق']),
'IX-ISL-U07-L01':('''درست خود اعتمادی اپنی صلاحیت پہ بھروسے کے ساتھ غلطی تسلیم کرنے کا حوصلہ بھی ہے، اس لیے یہ غرور سے مختلف ہے۔ خود انحصاری کا مطلب اپنی ذمہ داری ادا کرنا اور منصوبہ بندی کے ساتھ کوشش کرنا ہے؛ ضرورت کے وقت مدد حاصل کرنا بھی مناسب ہے۔ جسمانی صحت کے لیے مناسب نیند، متوازن غذا، صفائی اور محفوظ معمول اہم ہیں۔ ذہنی آسودگی کے لیے آرام، وقت کی تنظیم اور قابل اعتماد لوگوں سے بات چیت فائدہ مند ہو سکتی ہے۔ موجودہ دور میں معلومات شیئر کرتے وقت سچائی اور رازداری کا خیال رکھنا بھی اخلاقی ذمہ داری ہے۔ یوں اعتماد، صحت اور اخلاق کو ایک دوسرے سے الگ نہیں سمجھنا چاہیے۔''',
['متوازن خود اعتمادی کی وضاحت','خود انحصاری اور مدد کا توازن','جسمانی صحت کے معمول','ذہنی آسودگی اور تعلقات','ڈیجیٹل ماحول میں اخلاقی ذمہ داری']),
'IX-TTQ-C04-L01':('''سورۃ الحج میں عبادت، اللہ کی اطاعت، تقویٰ اور اجتماعی بھلائی کے مضامین ملتے ہیں۔ حج اور قربانی کا تصور یاد دلاتا ہے کہ نیک عمل کی روح اخلاص اور ذمہ دارانہ نیت بھی ہے، صرف ظاہری صورت کافی نہیں۔ تقویٰ کا تعلق عام زندگی میں دیانت داری، انصاف اور دوسروں کے ساتھ خیر خواہی سے بھی جوڑا جا سکتا ہے۔ عبادت فرد میں عاجزی اور اپنے کردار پر غور کا جذبہ پیدا کرتی ہے۔ اس سبق کا عملی اظہار یہ ہے کہ انسان ضرورت مند کی مدد کرے، مشترکہ وسائل کا خیال رکھے اور کسی کے حق سے بے پروائی نہ کرے۔ یوں دینی عبادت اور معاشرتی اخلاق ایک دوسرے سے مربوط ہوتے ہیں۔''',
['عبادت اور اطاعت کا موضوع','قربانی کے ساتھ تقویٰ','نیت اور اخلاص کا تصور','اجتماعی ذمہ داری و ہمدردی','روزمرہ اخلاقی مثال']),
'IX-TTQ-C06-L01':('''سورۃ الشعراء میں انبیاء کی دعوت، مختلف قوموں کا ردعمل اور پیغام پہنچانے میں ثابت قدمی کے واقعات آتے ہیں۔ ان کے مطالعے سے سچائی اور اخلاقی ذمہ داری کی اہمیت سامنے آتی ہے۔ نیک مقصد اپنانے کے بعد اختلاف یا مشکل کا سامنا ہو سکتا ہے؛ ایسے میں حکمت، صبر اور مناسب گفتگو اہم ہوتے ہیں۔ محض کسی رائے کی مقبولیت اس کے درست ہونے کی کافی دلیل نہیں۔ طالب علم اس مضمون سے یہ سیکھ سکتا ہے کہ کوئی خبر آگے بڑھانے سے پہلے تصدیق کرے، اختلاف میں احترام برقرار رکھے اور دباؤ میں بھی جھوٹ سے بچے۔ اس طرح تاریخی واقعات سے عملی معاشرتی تربیت کا سبق ملتا ہے۔''',
['انبیاء کی دعوت کا مضمون','قوموں کے ردعمل کا ذکر','ثابت قدمی اور سچائی','حکمت اور احترام کی ضرورت','عملی زندگی میں حقائق کی تصدیق']),
'IX-TTQ-C09-L01':('''سورۃ العنکبوت ایمان کے ساتھ پیش آنے والی آزمائشوں، صبر اور ثابت قدمی کو نمایاں کرتی ہے۔ اس سے یہ مفہوم لیا جا سکتا ہے کہ درست کام کرنے والے کو بھی مشکل کا سامنا ہو سکتا ہے۔ ایسے وقت میں ذمہ دارانہ کوشش، مناسب مشورہ اور اللہ پر بھروسے کے ساتھ صبر اختیار کرنا اہم ہے۔ ایمان کو اچھے کردار، امانت داری اور دوسروں کے حقوق کے احترام سے بھی ظاہر ہونا چاہیے۔ مثال کے طور پر امتحان کی تیاری مشکل ہو تو طالب علم نقل کے بجائے مسلسل مشق، سوال پوچھنے اور استاد کی رہنمائی کا راستہ اختیار کر سکتا ہے۔ یوں صبر انسان کے اخلاق اور اجتماعی اعتماد کو مضبوط بناتا ہے۔''',
['ایمان اور آزمائش','صبر اور مستقل کوشش','ذمہ داری و امانت','مدد اور درست رہنمائی','تعلیم سے ایک اخلاقی مثال']),
'IX-TTQ-C11-L01':('''سورۃ لقمان میں حکمت، شکر، والدین کے ساتھ احترام اور اخلاقی تربیت اہم ہیں۔ حضرت لقمان کی نصیحتوں میں نماز، اچھائی کی تلقین اور مشکل میں صبر کا مضمون نمایاں ہوتا ہے۔ والدین سے حسن سلوک اور ان کی قدر گھر میں ذمہ دارانہ رویہ پیدا کرتے ہیں۔ دوسروں سے بات کرتے وقت نرمی اختیار کرنا اور تکبر سے بچنا معاشرتی تعلقات کو بہتر بناتا ہے۔ شکر کا عملی مطلب بھی یہ ہے کہ انسان دستیاب نعمتوں اور مواقع کا مناسب استعمال کرے۔ طالب علم گھر کے کام میں مدد دے، دوستوں کا احترام کرے اور غلطی پر معذرت کرنا سیکھے تو وہ ان اخلاقی تعلیمات کو روزمرہ کردار میں جگہ دیتا ہے۔''',
['حکمت اور شکر کا مضمون','والدین کا احترام','نماز اور صبر کی اہمیت','تکبر سے اجتناب اور نرم گفتگو','گھر اور اسکول میں عملی مثال']),
'IX-TTQ-C15-L01':('''سورۃ یٰسین میں رسالت، اللہ کی قدرت، دوبارہ زندہ کیے جانے اور اعمال کی جواب دہی کے مضامین ملتے ہیں۔ کائنات کی نشانیاں انسان کو غور و فکر کی دعوت دیتی ہیں۔ جواب دہی کا تصور اسے یاد دلاتا ہے کہ اپنے فائدے کے ساتھ دوسروں کے حقوق کا خیال رکھنا بھی ضروری ہے۔ سچ بولنا، امانت واپس کرنا اور وعدہ پورا کرنا ایسے عملی رویے ہیں جو ذمہ دار زندگی میں مدد دیتے ہیں۔ مثال کے طور پر امتحان میں اپنی محنت پر اعتماد رکھنا اور دوسروں کا کام اپنے نام سے پیش نہ کرنا دیانت داری ہے۔ اس طرح دینی عقیدہ فرد کو اخلاقی فیصلہ سازی سے جوڑ سکتا ہے۔''',
['رسالت کا درست ذکر','اللہ کی قدرت کی نشانیاں','قیامت اور جواب دہی','حقوق اور امانت داری','عملی تعلیمی مثال']),
'IX-TTQ-C16-L01':('''سورۃ الصافات میں اللہ کی وحدانیت، اس کی قدرت اور انبیاء کے واقعات سے رہنمائی کے موضوعات ملتے ہیں۔ انبیاء کی دعوت سے اطاعت، اخلاص اور مشکل وقت میں ثابت قدم رہنے کا سبق اخذ ہوتا ہے۔ توحید کا عقیدہ انسان کو اپنے اعمال اور نیت کا جائزہ لینے کی طرف متوجہ کرتا ہے۔ روزمرہ اخلاقی زندگی میں یہ تعلیم سچائی، انصاف اور خیر خواہی کی صورت اختیار کر سکتی ہے۔ مثال کے طور پر کسی ساتھی کا حق دبانے کے بجائے اس کے ساتھ منصفانہ برتاؤ کرنا اور اختلاف میں مناسب گفتگو اختیار کرنا ذمہ داری ہے۔ اس طرح عبادت، اچھے کردار اور معاشرتی تعاون کا باہمی ربط واضح ہوتا ہے۔''',
['توحید کا مضمون','انبیاء کی رہنمائی','اطاعت و ثابت قدمی','سچائی اور انصاف','روزمرہ ذمہ دارانہ مثال'])}
REFERENCES={'IX-TTQ-C04-L01':['https://quran.com/22/37'],'IX-TTQ-C06-L01':['https://quran.com/26'],'IX-TTQ-C09-L01':['https://quran.com/surah/al-ankabut/info'],'IX-TTQ-C11-L01':['https://quran.com/31/12-19'],'IX-TTQ-C15-L01':['https://quran.com/en/surah/yasin/info'],'IX-TTQ-C16-L01':['https://quran.com/37']}
def original_module():
 spec=importlib.util.spec_from_file_location('grade910_islamic_revision',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
def build(live,revision,risk,queue,orig,*,answers=ANS):
 if len(live)!=2411 or len(revision)!=2411 or len(risk)!=604 or len(answers)!=10 or len(set(answers))!=10:
  raise ValueError('TEN_ISLAMIC_ORIGINAL_CURRENT_LIVE_SCOPE_DRIFT')
 idx={r['id']:r for r in live}; cache={};out=[];subjects=collections.Counter();revmod=original_module()
 for qid,(answer,rubric) in answers.items():
  row=idx.get(qid);b=orig.get(qid);r=risk.get(qid);p=queue.get(qid)
  if any(x is None for x in (row,b,r,p)):raise ValueError('ISLAMIC_QUESTION_MISSING_FROM_CURRENT_RESEARCH_QUEUE')
  f=SEED/b['sourceFile']
  if not f.is_file() or f.is_symlink() or hashlib.sha256(f.read_bytes()).hexdigest()!=b['originalResearchFileSha256']:
   raise ValueError('ISLAMIC_FROZEN_FILE_SHA_DRIFT')
  if b['sourceFile'] not in cache:cache[b['sourceFile']]={x['id']:x for x in json.loads(f.read_text())['drafts']}
  old=cache[b['sourceFile']].get(qid);c=(old or {}).get('content',{}).get('ur',{})
  if (row['grade']!='9th' or row['medium']!='Urdu' or row['type']!='long' or row['marks']!=5
   or row['subject'] not in ('Islamiat','Tarjuma-tul-Quran') or old['marks']!=5 or old['type']!='long'
   or c.get('stem')!=row['questionText'] or c.get('answer')!=row['answer']
   or revmod.revision_sha(row)!=revision.get(qid) or r['currentLiveContentRevisionSha256']!=revision.get(qid)
   or r['priority']!='HIGH' or p['priority']!='HIGH' or p['currentLiveRevisionSha256']!=revision.get(qid)
   or p.get('schoolStreamApplicability')!='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'
   or p.get('academicallySelectable') is not False):
    raise ValueError('ISLAMIC_EXEMPLAR_INVALID_CURRENT_SHA_OR_FROZEN_QUESTION')
  if (not 70<=len(answer.split())<=160 or len(rubric)!=5 or any(len(x)<12 for x in rubric)
    or any(s in answer for s in ('عربی آیت کا ترجمہ:', 'حدیث نمبر:', 'لفظ بہ لفظ ترجمہ'))):
    raise ValueError('ISLAMIC_ANSWER_INCOMPLETE_OR_QUOTED_SOURCE')
  subjects[row['subject']]+=1
  out.append({'questionId':qid,'grade':'9th','subject':row['subject'],'medium':'Urdu','marks':5,
   'originalResearchFile':b['sourceFile'],'originalResearchFileSHA256':b['originalResearchFileSha256'],
   'currentLiveFullRevisionSha256':revision[qid],
   'newOriginalUrduIllustrativeEthicalExplanationNotOfficialTranslation':answer,
   'fivePointUnapprovedSubjectUrduReviewCriteria':rubric,
   'backgroundSurahThemeUrlsNotSchoolTextbookAdoption':REFERENCES.get(qid,[]),
   'multipleCorrectStudentAnswersPermitted':True,
   'noCopyrightedAyahTranslationOrHadithReproduced':True,
   'actualASSPSAdopted2026To2027BookVerified':False,'actualPrintedExercisePageVerified':False,
   'independentIslamicStudiesTeacherApproved':False,'independentUrduReviewerApproved':False,
   'academicallyApproved':False,'paperStudioVerifiedSelectable':False,'productionDatabaseWrites':0})
 if subjects!=collections.Counter({'Islamiat':4,'Tarjuma-tul-Quran':6}):
  raise ValueError('EXACT_FOUR_ISLAMIAT_AND_SIX_TARJUMA_IDS_REQUIRED')
 return {'schema':'ASSPS_GRADE9_ISLAMIC_ETHICS_TEN_ORIGINAL_UNAPPROVED_EXEMPLARS_V1',
  'candidateCount':10,'liveSchool1ReadOnlyCurrentRevisionCount':2411,
  'newIndependentOriginalIslamicEthicalResearchExemplars':10,
  'qualifiedIslamicAndUrduReviewerApprovals':0,'school2026_27TextbookAdoptionVerified':False,
  'printedExercisePageVerified':False,'publishedVerified':False,'productionDatabaseWrites':0,
  'answers':sorted(out,key=lambda x:x['questionId'])}
def run():
 m=original_module();live=m.read_live()
 rev={r['questionId']:r['revisionSha256'] for r in json.loads((STATE/'live-question-revisions.json').read_text())['records']}
 risk={r['questionId']:r for r in json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']}
 queue={r['questionId']:r for r in json.loads((STATE/'live-existing-answer-proposal-crosswalk-20261016.json').read_text())['unlinkedCurrentRevisionResearchQueue']}
 # A newly linked candidate vanishes from the current unlinked queue. Retain its
 # HIGH original risk evidence without fabricating an academic approval state.
 for id in ANS:
  if id not in queue:
   before=risk.get(id)
   if (before is None or before.get('priority')!='HIGH'
       or before.get('currentLiveContentRevisionSha256')!=rev.get(id)):
    raise ValueError('ISLAMIC_TEN_PRIOR_CURRENT_SHA_RISK_NOT_RECOVERABLE')
   queue[id]={'questionId':id,'priority':'HIGH','currentLiveRevisionSha256':rev[id],
              'academicallySelectable':False,
              'schoolStreamApplicability':'SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'}
 orig={r['questionId']:r for r in json.loads(PUB.read_text())['rows']}
 return build(live,rev,risk,queue,orig)
def main():
 a=run();text=json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
 if sys.argv[1:]==['--check']:
  if not OUT.exists() or OUT.read_text()!=text:raise ValueError('GRADE9_ISLAMIC_TEN_CURRENT_RESEARCH_CHANGED')
  print('TEN_ISLAMIC_GRADE9_URDU_ORIGINAL_RESEARCH_CURRENT_SHA_NO_APPROVAL')
 elif len(sys.argv)==1:
  OUT.write_text(text);print('TEN_GRADE9_ISLAMIC_CURRENT_REVISION_ORIGINAL_RESEARCH_CANDIDATES')
 else:raise ValueError('ONLY_NO_ARGUMENTS_OR_CHECK')
if __name__=='__main__':main()
