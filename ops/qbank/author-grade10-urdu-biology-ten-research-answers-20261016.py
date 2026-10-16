#!/usr/bin/env python3
"""Independently authored Urdu-medium Grade X biology supplemental research.

Builds 10 DRAFT-ONLY explanatory texts for previously unlinked long answers.
All ten source IDs are frozen to exact existing original author file SHA and current
School1 full question revision; does NOT modify School1 or approve any answer.
"""
from __future__ import annotations
import hashlib,importlib.util,json,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology10UrduStarter2026.json'
EXPECTED_SOURCE_SHA='91182fae98e3e7ec18077cac805292a67c47ecc28c84f2d81543037aacc9b266'
OUT=ROOT/'docs/question-bank/ASSPS_BIOLOGY10_URDU_TEN_HIGH_PRIORITY_CONCEPTUAL_ANSWER_RESEARCH_20261016.json'
QUEUE=Path('/var/lib/assps-grade910-sourceclaims/live-existing-answer-proposal-crosswalk-20261016.json')
ROOT_RECEIPT=Path('/var/lib/assps-grade910-sourceclaims/live-question-revisions.json')
PROPOSALS={
'X-BIO-UR-C01-L01':(
'ہضم کا عمل منہ میں خوراک کے داخل ہونے سے شروع ہوتا ہے۔ دانت خوراک کو چھوٹے ٹکڑوں میں تقسیم کرتے ہیں، جبکہ لعاب میں موجود ایمائلیز نشاستے کے ہضم کا آغاز کرتا ہے۔ غذائی نالی کی لہردار عضلاتی حرکت خوراک کو معدے تک پہنچاتی ہے۔ معدے میں تیزاب اور پیپسن پروٹین کے ہضم میں مدد دیتے ہیں اور خوراک نیم مائع صورت اختیار کرتی ہے۔ چھوٹی آنت میں لبلبے کے خامرے مزید ہضم کرتے ہیں، جبکہ جگر سے بننے والا صفرا چکنائی کے قطرے چھوٹے کرتا ہے؛ صفرا خود خامرہ نہیں ہے۔ چھوٹی آنت کی باریک ابھری ہوئی ساختیں غذائی اجزا کو خون یا لمف میں جذب کرنے میں مدد دیتی ہیں۔',
['منہ، دانت اور لعاب کی ابتدائی کارروائی','غذائی نالی کی لہردار حرکت','معدے میں تیزابی ماحول اور پروٹین کا ہضم','صفرا اور لبلبے کے خامروں کا درست الگ کردار','چھوٹی آنت میں ہضم کی تکمیل اور جذب'],
'https://openstax.org/books/biology-2e/pages/34-1-digestive-systems'),
'X-BIO-UR-C02-L01':(
'سانس اندر لیتے وقت ڈایافرام سکڑ کر نسبتاً چپٹا اور نیچے ہوتا ہے، جبکہ پسلیوں کے درمیان بیرونی عضلات پسلیوں کو اوپر اور باہر اٹھاتے ہیں۔ اس سے سینے کے اندر موجود گنجائش بڑھتی ہے اور پھیپھڑوں کی ہوا کا دباؤ بیرونی فضائی دباؤ سے عارضی طور پر کم ہو جاتا ہے؛ لہٰذا ہوا اندر داخل ہوتی ہے۔ عام آرام دہ سانس باہر نکالنے کے دوران ڈایافرام اور متعلقہ عضلات ڈھیلے پڑتے ہیں، پسلیاں اپنی پہلی حالت کی طرف آتی ہیں اور پھیپھڑے لچک کے باعث سکڑتے ہیں۔ سینے کی گنجائش کم اور پھیپھڑوں کے اندر ہوا کا دباؤ بیرونی دباؤ سے زیادہ ہو جاتا ہے، جس سے ہوا باہر نکلتی ہے۔',
['ڈایافرام کا سکڑنا اور نیچے ہونا','پسلیوں کی اوپر اور باہر حرکت','حجم بڑھنے سے اندرونی دباؤ کم اور ہوا اندر','عام اخراج میں عضلات کا آرام اور لچک','حجم کم ہونے سے دباؤ بڑھنا اور ہوا باہر'],
'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing'),
'X-BIO-UR-C03-L01':(
'انسانوں میں خون کی دوہری گردش سے مراد یہ ہے کہ ایک مکمل دور میں خون دل سے دو الگ راستوں پر گزرتا ہے۔ پھیپھڑوں والی گردش میں آکسیجن کی کمی والا خون دائیں بطین سے پلمونری شریان کے ذریعے پھیپھڑوں میں جاتا ہے؛ وہاں گیسوں کا تبادلہ ہوتا ہے اور آکسیجن والا خون پلمونری وریدوں کے ذریعے بائیں دہلیز میں آتا ہے۔ جسمانی گردش میں بایاں بطین آکسیجن والا خون بڑی شریان کے راستے جسم کے اعضا تک پہنچاتا ہے اور واپس آنے والا خون بڑی وریدوں کے ذریعے دائیں دہلیز تک آتا ہے۔ دونوں راستوں کی علیحدگی آکسیجن کی مؤثر فراہمی اور جسمانی گردش کے لیے مناسب نسبتاً زیادہ دباؤ برقرار رکھنے میں مدد دیتی ہے۔',
['دوہری گردش کی تعریف','دائیں بطین سے پھیپھڑوں کا درست راستہ','پھیپھڑوں سے بائیں دہلیز کی واپسی','بائیں بطین سے جسم اور دائیں دہلیز کی واپسی','دونوں راستوں میں گیسوں کے تبادلے اور دباؤ کا فرق'],
'https://openstax.org/books/biology-2e/pages/40-chapter-summary'),
'X-BIO-UR-C04-L01':(
'نیفرون گردے کی عملی اکائی ہے۔ اس کے آغاز میں گلومیرولس کی باریک نالیوں سے دباؤ کے سبب پانی اور چھوٹے محلول باؤمن کیپسول میں چھن کر آتے ہیں، جبکہ صحت مند حالت میں زیادہ تر خون کے خلیے اور بڑے پروٹین خون ہی میں رہتے ہیں۔ اس فلٹریٹ سے قریبی نالی میں گلوکوز، امینو ایسڈ، بہت سے نمکیات اور پانی کا بڑا حصہ دوبارہ خون میں جذب ہو جاتا ہے۔ بعد کے حصوں میں جسم کی ضرورت کے مطابق پانی اور آئنوں کے جذب میں مزید تبدیلی ہوتی ہے، جبکہ منتخب فاضل مادے نالی میں خارج کیے جاتے ہیں۔ بچا ہوا مائع جمع کرنے والی نالیوں سے گردے کی حوض نما جگہ اور پھر یوریٹر کے راستے مثانے کی طرف جاتا ہے۔',
['گلومیرولس میں دباؤ کے تحت فلٹریشن','باؤمن کیپسول میں چھوٹے اجزا کا آنا','مفید مادوں اور پانی کا انتخابی دوبارہ جذب','بعد کی نالیوں میں آئنوں کی تنظیم اور سیکریشن','جمع کرنے والی نالی سے یوریٹر تک راستہ'],
'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-6-tubular-reabsorption'),
'X-BIO-UR-C05-L01':(
'اعصابی اور ہارمونی نظام جسم کے اعضا کے کام کو باہم مربوط رکھتے ہیں۔ کسی تبدیلی کو محسوس کرنے والے ریسپٹر سے اعصابی پیغام مرکزی اعصابی نظام تک پہنچتا ہے، جہاں اس کی بنیاد پر عضلات یا غدود کو فوری ردعمل کا پیغام دیا جا سکتا ہے۔ اعصابی پیغامات عموماً تیز اور نسبتاً مختصر اثر رکھتے ہیں۔ اینڈوکرائن غدود ہارمون خون میں خارج کرتے ہیں جو مناسب ریسپٹر والے ہدفی خلیوں پر اثر انداز ہوتے ہیں؛ یہ ردعمل اکثر نسبتاً سست مگر دیرپا ہوتا ہے۔ مثال کے طور پر جسم میں خون کی شکر کی تنظیم میں انسولین جبکہ ہنگامی صورتحال میں تیز ردعمل میں اعصاب اور مخصوص ہارمون شامل ہو سکتے ہیں۔ دونوں نظام مل کر جسم کے اندرونی توازن کو برقرار رکھتے ہیں۔',
['ریسپٹر اور اعصابی پیغام','مرکزی اعصابی نظام اور فوری ردعمل','ہارمون کا خون کے ذریعے ہدفی خلیوں تک پہنچنا','رفتار اور اثر کے دورانیے کا تقابل','ہومیوسٹیسس میں مشترکہ کردار'],
'https://openstax.org/books/biology-2e/pages/37-5-endocrine-glands'),
'X-BIO-UR-C06-L01':(
'جینیاتی مادے کی مقدار نسلوں میں متوازن رکھنے کے لیے تولیدی خلیے بننے کا عمل اہم ہے۔ میوسس تقسیم کے ذریعے کروموسوم کے ایک مجموعے والے ہیپلوئڈ تولیدی خلیے بنتے ہیں اور ان میں جینیاتی تنوع بھی پیدا ہو سکتا ہے۔ فرٹیلائزیشن کے وقت دو موزوں ہیپلوئڈ تولیدی خلیے مل کر ڈِپلوئڈ زائیگوٹ بناتے ہیں، جس میں کروموسوم کے دو مجموعے ہوتے ہیں۔ زائیگوٹ بعد میں مائٹوسس تقسیموں کے ذریعے متعدد خلیے بناتا ہے؛ اس ابتدائی عمل کو کلیویج کہا جاتا ہے۔ خلیوں کی تعداد بڑھنے اور بعد میں مختلف کاموں کے لیے ان کی تخصیص سے ابتدائی جنینی نشوونما کا آغاز ہوتا ہے۔ یوں میوسس، فرٹیلائزیشن اور مائٹوسس کے کردار ایک دوسرے سے مختلف ہیں۔',
['میوسس سے ہیپلوئڈ خلیوں کی تشکیل','جینیاتی تنوع کی بنیادی اہمیت','فرٹیلائزیشن سے ڈِپلوئڈ زائیگوٹ','مائٹوسس اور کلیویج سے خلیوں میں اضافہ','ابتدائی نشوونما اور خلیوں کی تخصیص'],
'https://openstax.org/books/biology-2e/pages/43-6-fertilization-and-early-embryonic-development'),
'X-BIO-UR-C07-L01':(
'کروموسوم خلیے کے اندر جینیاتی معلومات کا منظم پیکج ہوتا ہے، جس میں ڈی این اے پروٹینوں کے ساتھ موجود ہوتا ہے۔ ڈی این اے کی ترتیب کے مخصوص حصے جین کہلاتے ہیں جو عملی سالمات بنانے یا ان کی مقدار منظم کرنے کی معلومات فراہم کرتے ہیں۔ ایک ہی جین کی مختلف وراثتی صورتوں کو ایلیل کہتے ہیں؛ دو مماثل کروموسوم پر ان کی جگہ عموماً ایک ہی لوکس ہوتی ہے۔ کسی صفت سے متعلق ایلیلوں کی ترکیب جینو ٹائپ اور ظاہر ہونے والی قابلِ مشاہدہ صفت فینو ٹائپ کہلاتی ہے۔ فینو ٹائپ پر جینو ٹائپ کے ساتھ ماحول کا اثر بھی ہو سکتا ہے، اس لیے ہر صفت کا اظہار لازماً ایک جیسا نہیں ہوتا۔',
['کروموسوم میں ڈی این اے کا کردار','جین کو ڈی این اے کی مخصوص ترتیب سمجھانا','ایلیل اور لوکس کا درست تعلق','جینو ٹائپ کی تعریف','فینو ٹائپ اور ماحولیاتی اثر'],
'https://openstax.org/books/biology-2e/pages/12-2-characteristics-and-traits'),
'X-BIO-UR-C08-L01':(
'بایوٹیکنالوجی میں حیاتیاتی خلیوں، سالمات یا ان کی صلاحیتوں کو مفید مصنوعات اور خدمات کے لیے استعمال کیا جاتا ہے۔ زراعت میں بیماری یا ماحولیاتی دباؤ کے مقابل بہتر فصلوں کی تیاری اس کی ایک مثال ہے۔ طب میں مخصوص ادویات جیسے انسولین کی پیداوار، تشخیصی ٹیسٹ اور بعض ویکسینوں کی تیاری میں اس سے مدد ملتی ہے۔ صنعت میں خردنامیوں کے ذریعے تخمیر، خامروں کی پیداوار اور بعض حیاتیاتی ایندھن تیار کیے جاتے ہیں۔ تاہم حیاتیاتی تحفظ، ماحول اور غیر مطلوب اثرات کا جائزہ ضروری ہے۔ جینیاتی معلومات کی رازداری اور نئی ٹیکنالوجی تک منصفانہ رسائی بھی اہم اخلاقی معاملات ہیں۔ ہر اطلاق کو مناسب جانچ اور ضابطوں کے تحت استعمال کرنا چاہیے۔',
['زراعت میں ایک درست اطلاق','طب میں درست اطلاق','صنعت میں درست اطلاق','حیاتیاتی تحفظ اور ماحول سے متعلق خدشہ','رازداری یا منصفانہ رسائی کا اخلاقی مسئلہ'],
'https://openstax.org/books/biology-2e/pages/17-1-biotechnology'),
'X-BIO-UR-C09-L01':(
'جسم کے دفاع کا پہلا مرحلہ جلد، مخاطی جھلیاں اور دیگر قدرتی رکاوٹیں ہیں جو بہت سے جراثیم کے داخلے کو مشکل بناتی ہیں۔ اگر جراثیم داخل ہو جائیں تو غیر مخصوص مدافعتی خلیے، مثلاً بعض سفید خون کے خلیے، انہیں پہچان کر ختم کرنے میں مدد دیتے ہیں۔ مخصوص مدافعتی ردعمل میں لیمفوسائٹس شامل ہوتے ہیں؛ بی خلیوں سے بننے والی اینٹی باڈیز مخصوص اینٹی جن سے وابستہ ہو سکتی ہیں، جبکہ بعض ٹی خلیے متاثرہ خلیوں کے خلاف کام کرتے ہیں۔ مدافعتی یادداشت آئندہ اسی جرثومے کے مقابل زیادہ مؤثر ردعمل میں مدد دیتی ہے۔ ویکسین جسم کو مناسب اینٹی جن سے محفوظ انداز میں متعارف کرا کر حفاظتی مدافعت پیدا کرنے میں مدد دیتی ہے، مگر کوئی ویکسین ہر حالت میں مکمل تحفظ کی ضمانت نہیں۔',
['جلد اور مخاطی جھلیوں کی رکاوٹ','غیر مخصوص مدافعتی خلیے','مخصوص لیمفوسائٹس اور اینٹی باڈیز','مدافعتی یادداشت','ویکسین کا حفاظتی اصول اور محدودیت'],
'https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html'),
'X-BIO-UR-C10-L01':(
'ارتقا کے مطالعے میں مختلف قسم کے آزاد شواہد کو ملا کر جانداروں کی تاریخ اور مشترک آبائی رشتوں کا اندازہ لگایا جاتا ہے۔ فوسلز مختلف ارضی زمانوں میں موجود انواع اور ان میں تبدیلیوں کا ریکارڈ دیتے ہیں۔ تقابلی تشریح الاعضا میں ایسے اعضا کی بنیادی ساخت کی مماثلت، جیسے کئی فقاری جانوروں کے اگلے بازو، مشترک نسب کی طرف اشارہ کرتی ہے۔ جنینی نشوونما کے بعض مشترک مراحل بھی رشتوں کو سمجھنے میں مدد دیتے ہیں۔ ڈی این اے اور پروٹین کی ترتیب کی مماثلت جانداروں کے جینیاتی تعلق کا مزید ثبوت فراہم کرتی ہے۔ مختلف خطوں میں انواع کی تقسیم، یعنی بایوجیوگرافی، بھی تاریخی تبدیلیوں اور جغرافیائی علیحدگی سے مطابقت رکھ سکتی ہے۔',
['فوسل ریکارڈ کی وضاحت','ہم ساخت اعضا کا تقابلی ثبوت','جنینی نشوونما میں مماثلت','ڈی این اے یا پروٹین کی مماثلت','بایوجیوگرافی اور جغرافیائی تقسیم'],
'https://openstax.org/books/biology-2e/pages/18-1-understanding-evolution'),
}
def sha(buf):return hashlib.sha256(buf).hexdigest()
def load_current():
  spec=importlib.util.spec_from_file_location('assps_biology_urdu_original_live',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
  m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  live={r['id']:r for r in m.read_live()}
  ledger=json.loads(ROOT_RECEIPT.read_text()); hashes={x['questionId']:x['revisionSha256'] for x in ledger['records']}
  # The independent immutable 604-risk ledger, NOT the subsequently
  # reduced 440 backlog, is the input source of truth for these ten IDs.
  # Otherwise a successfully consumed draft would disappear from its own
  # verification inputs, causing a circular false-negative.
  queue=json.loads(Path('/var/lib/assps-grade910-sourceclaims/subjective-answer-depth-risk-20261016.json').read_text())['records']
  eligible={x['questionId']:x for x in queue if x['priority']=='HIGH' and x['grade']=='10th' and x['subject']=='Biology' and x['medium']=='Urdu' and x['type']=='long'}
  if len(live)!=2411 or len(hashes)!=2411 or set(PROPOSALS)!=set(eligible) or len(PROPOSALS)!=10:raise ValueError('UNLINKED_BIOLOGY_RESEARCH_SCOPE_DRIFT')
  for id in PROPOSALS:
    if m.revision_sha(live[id])!=hashes[id] or eligible[id]['currentLiveContentRevisionSha256']!=hashes[id]:
      raise ValueError('SOURCE_QUESTION_REVISION_CHANGED')
    if live[id]['type']!='long' or live[id]['marks']!=5:raise ValueError('MISMATCHED_LONG_5_MARK_TYPE')
  source_bytes=SOURCE.read_bytes()
  if sha(source_bytes)!=EXPECTED_SOURCE_SHA:raise ValueError('ORIGINAL_SOURCE_FILE_CHANGED')
  frozen=json.loads(source_bytes)
  frozen_by_id={x['id']:x for x in frozen.get('drafts',[])}
  if len(frozen_by_id)!=len(frozen.get('drafts',[])):raise ValueError('FROZEN_ORIGINAL_QUESTION_DUPLICATED')
  for id in PROPOSALS:
    original=frozen_by_id.get(id)
    original_text=(original or {}).get('content',{}).get('ur',{})
    if (not isinstance(original_text,dict)
        or original_text.get('stem')!=live[id]['questionText']
        or original_text.get('answer')!=live[id]['answer']
        or original.get('marks')!=5
        or original.get('type')!='long'):
      raise ValueError('FROZEN_RESEARCH_SOURCE_AND_CURRENT_STEM_ANSWER_MISMATCH')
  return live,hashes
def build(live,hashes):
   rows=[]
   for id in sorted(PROPOSALS):
      answer,points,url=PROPOSALS[id]
      if len(points)!=5 or len(set(points))!=5 or len(answer.split())<65:
         raise ValueError('DRAFT_ANSWER_NOT_COMPLETE_5_MARKS')
      row=live[id]
      rows.append({'questionId':id,'grade':10,'subject':'Biology','medium':'Urdu',
       'currentLiveRevisionSha256':hashes[id],'originalSchoolAuthoringFile':SOURCE.name,
       'originalSourceFileSha256':EXPECTED_SOURCE_SHA,
       'storedResearchChapterNumberUnverified':row['chapter'],'marks':5,
       'newIndependentResearchAnswerUrdu':answer,'proposedFiveSeparateMarkingCriteriaUrdu':points,
       'backgroundFactualReferenceUrl':url,
       'sourcePageOrExerciseIndependentlyVerified':False,
       'school2026To2027EditionAdoptionAuthenticated':False,
       'independentSubjectTeacherReviewed':False,'independentUrduLanguageReviewed':False,
       'academicApproved':False,'published':False,'paperStudioVerifiedSelectable':False,
       'publicationDecision':'CANDIDATE_RESEARCH_HOLD_NEEDS_REVISION_SPECIFIC_FACULTY_REVIEW'})
   return {'schema':'ASSPS_BIOLOGY_X_URDU_TEN_LONG_ORIGINAL_RESEARCH_ANSWERS_V1',
    'intent':'Ten original supplementary explanations, not copied school book exercise and not independently certified by a teacher.',
    'candidateCount':10,'grade':10,'subject':'Biology','medium':'Urdu',
    'originalFrozenSourceSha256':EXPECTED_SOURCE_SHA,
    'actualSchoolTextbookAdoptionVerified':False,'exactOriginalExercisePageVerified':False,
    'independentQualifiedSubjectReviewed':False,'independentUrduReviewed':False,
    'academicallyApproved':False,'publishedVerified':False,'productionDatabaseWrites':0,
    'newAnswers':rows}
def run():
   live,hashes=load_current()
   data=build(live,hashes)
   payload=json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
   if len(sys.argv)==2 and sys.argv[1]=='--check':
      if not OUT.exists() or OUT.read_text()!=payload:raise ValueError('RESEARCH_DRAFT_PACKET_CHANGED')
      print('TEN_URDU_BIOLOGY_DRAFT_ORIGINAL_SHA_LIVE_REVISION_AND_CONTENT_PASS')
      return
   if len(sys.argv)>1:raise ValueError('USE_NO_ARGS_OR_CHECK')
   OUT.write_text(payload,encoding='utf8')
   print('TEN_URDU_BIOLOGY_RESEARCH_PROPOSALS_CREATED_NOT_APPROVED')
if __name__=='__main__':run()
