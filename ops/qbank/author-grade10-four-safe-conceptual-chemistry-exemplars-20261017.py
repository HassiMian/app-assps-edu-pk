#!/usr/bin/env python3
"""Four conceptual Grade X Chemistry original exemplars, nonprocedural and unapproved.

Do not provide experimental conditions, quantities, solvents, apparatus, timings,
consumption or actionable alcohol/laboratory-preparation sequences.
"""
import collections,hashlib,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SEED=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
PUB=ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=ROOT/'docs/question-bank/ASSPS_GRADE10_FOUR_CHEMISTRY_NONPROCEDURAL_UNAPPROVED_EXEMPLARS_20261017.json'
ANS={
'X-CHEM-C23-L01':(
"""Ethanol is an alcohol containing a hydroxyl group and is a flammable liquid. At the level of chemical principles, its formation is associated with biological conversion of carbohydrates or industrial conversion of suitable carbon-based feedstocks. Those categories explain the underlying chemistry without giving an experimental preparation procedure. Its polarity helps explain its mixing with water. As an organic compound, it can undergo combustion, while oxidation changes its functional-group chemistry and can lead toward carboxylic acids. Ethanol has industrial roles as a solvent and as a chemical feedstock. Its flammability and health risks require appropriate regulated handling rather than unsupervised experimentation or consumption.""",
['Identify ethanol as an alcohol and its functional group',
 'Differentiate broad biological and industrial chemical concepts without protocols',
 'Connect water miscibility with molecular polarity',
 'Explain combustion and oxidation only at conceptual reaction-class level',
 'Recognize industrial use alongside flammability and health hazards']),
'X-CHEM-UR-C18-L01':(
"""حل پذیر اور غیر حل پذیر نمکیات کی پہچان پانی میں ان کی حل پذیری سے کی جاتی ہے، مگر یہ خاصیت درجہ حرارت اور نمک کی نوعیت سے بھی متعلق ہو سکتی ہے۔ نظریاتی طور پر تیزاب اور مناسب اساس یا دوسرے عامل کے درمیان نیوٹرلائزیشن سے نمک بننے کا تصور سمجھا جاتا ہے۔ دوسری طرف دو آبی محلولوں کے تعامل میں غیر حل پذیر نمک بننے کو ترسیب کہتے ہیں۔ یوں حل پذیر نمک اور غیر حل پذیر نمک کے لیے کیمیائی اصول مختلف ہو سکتے ہیں۔ علیحدگی، صفائی اور خالص مادے کی جانچ کے تصورات اس فرق کو سمجھنے میں مدد دیتے ہیں۔ کسی عملی طریقے کے انتخاب سے پہلے مادوں کے خطرات، درست علمی سیاق اور استاد کی نگرانی ضروری ہیں۔""",
['حل پذیری کی درست سائنسی تعریف',
 'نیوٹرلائزیشن اور نمک بننے کا بنیادی تصور',
 'غیر حل پذیر نمک کے لیے ترسیب کے اصول کی وضاحت',
 'خالص مادے اور علیحدگی کی نظریاتی ضرورت',
 'حفاظتی حدود اور ماہر استاد کی نگرانی']),
'X-CHEM-UR-C23-L01':(
"""ایتھانول ایک نامیاتی الکحل ہے جس میں ہائیڈروکسل گروہ ہوتا ہے۔ اس کی تشکیل کو حیاتیاتی طور پر کاربوہائیڈریٹس کی تبدیلی اور صنعتی خام مادوں کی کیمیائی تبدیلی جیسے وسیع سائنسی تصورات سے سمجھا جا سکتا ہے؛ یہ کسی عملی تیاری کی ہدایت نہیں۔ مالیکیول کی قطبیت پانی کے ساتھ امتزاج کی خاصیت سمجھانے میں مدد دیتی ہے۔ احتراق ایک عمومی تعامل ہے جبکہ تکسید کے ذریعے فنکشنل گروہ میں تبدیلی اور بعض صورتوں میں کاربوکسلک ایسڈ کی طرف پیش رفت کا تصور واضح ہوتا ہے۔ صنعت میں اسے محلل یا دوسرے کیمیائی مادوں کے لیے خام مال کے طور پر استعمال کیا جاتا ہے۔ چونکہ یہ آتش گیر اور صحت کے لحاظ سے خطرہ رکھتا ہے، اس لیے غیر نگرانی شدہ تجربات یا استعمال مناسب نہیں۔""",
['ایتھانول اور ہائیڈروکسل گروہ کا تعارف',
 'حیاتیاتی اور صنعتی تشکیل کی غیر عملی درجہ بندی',
 'قطبیت اور پانی سے متعلق خاصیت',
 'احتراق اور تکسید کی کیمیائی نوعیت',
 'صنعتی مقصد اور آتش گیری کا محفوظ تناظر']),
'X-CHEM-UR-C24-L01':(
"""کاربوکسلک ایسڈ میں کاربوکسل گروہ موجود ہوتا ہے اور اس کی تیزابی خاصیت کئی قسم کے تعاملات کو سمجھاتی ہے۔ کسی مناسب دھات کے ساتھ ردعمل کے عمومی تصور میں نمک اور ہائیڈروجن گیس کی تشکیل شامل ہو سکتی ہے۔ اساس کے ساتھ نیوٹرلائزیشن نمک اور پانی سے متعلق ہے۔ کاربونیٹ کے ساتھ تعامل کی خاص علامت نمک کے علاوہ کاربن ڈائی آکسائیڈ اور پانی بننے کا تصور ہے۔ الکحل کے ساتھ ایسٹریفیکیشن میں ایسٹر اور پانی کی پیداوار کا عمومی کیمیائی ربط دیکھا جاتا ہے۔ ان چار مثالوں میں فعال گروہوں، بننے والے مادوں اور ردعمل کی اقسام کا موازنہ بنیادی علمی مقصد ہے؛ انہیں لیبارٹری ترکیب یا عملی تجربے کی ہدایات نہیں سمجھنا چاہیے۔""",
['کاربوکسلک ایسڈ اور اس کے فعال گروہ کی شناخت',
 'دھات کے ساتھ عمومی نمک اور ہائیڈروجن کا تصور',
 'اساس کے ساتھ نیوٹرلائزیشن کی وضاحت',
 'کاربونیٹ اور گیس پیدا ہونے کی نظریاتی وضاحت',
 'الکحل کے ساتھ ایسٹریفیکیشن کا غیر عملی تقابل'])}
def source_module():
 f=ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py'
 spec=importlib.util.spec_from_file_location('assps_four_chemistry_school1_revisions',f)
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
def build(live,revision,risk,queue,frozen,*,answers=ANS):
 if (len(live)!=2411 or len(revision)!=2411 or len(risk)!=604
  or len(answers)!=4 or len(set(answers))!=4):
  raise ValueError('FOUR_CHEMISTRY_SOURCE_SCOPE_CHANGED')
 idx={r['id']:r for r in live};cache={};out=[];mediums=collections.Counter();revmod=source_module()
 for id,(answer,rubric) in answers.items():
  row=idx.get(id);frozenrow=frozen.get(id);riskrow=risk.get(id);prior=queue.get(id)
  if any(z is None for z in (row,frozenrow,riskrow,prior)):
   raise ValueError('CHEMISTRY_FOUR_MUST_EXIST_IN_UNLINKED_HIGH_RESEARCH_SCOPE')
  f=SEED/frozenrow['sourceFile']
  if not f.is_file() or f.is_symlink() or hashlib.sha256(f.read_bytes()).hexdigest()!=frozenrow['originalResearchFileSha256']:
   raise ValueError('FROZEN_ORIGINAL_CHEMISTRY_RESEARCH_FILE_SHA_DRIFT')
  if frozenrow['sourceFile'] not in cache:
   cache[frozenrow['sourceFile']]={x['id']:x for x in json.loads(f.read_text())['drafts']}
  original=cache[frozenrow['sourceFile']].get(id)
  language='en' if row['medium']=='english' else 'ur'
  source=(original or {}).get('content',{}).get(language,{})
  if (row['grade']!='10th' or row['subject']!='Chemistry'
      or row['medium'] not in ('english','Urdu') or row['type']!='long' or row['marks']!=5
      or (original or {}).get('type')!='long' or original['marks']!=5
      or source.get('stem')!=row['questionText'] or source.get('answer')!=row['answer']
      or revmod.revision_sha(row)!=revision.get(id)
      or riskrow['currentLiveContentRevisionSha256']!=revision.get(id)
      or riskrow['priority']!='HIGH' or prior['priority']!='HIGH'
      or prior['currentLiveRevisionSha256']!=revision.get(id)
      or prior.get('schoolStreamApplicability')!='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'
      or prior.get('academicallySelectable') is not False):
   raise ValueError('CHEMISTRY_FOUR_CURRENT_FULL_REVISION_FROZEN_ANSWER_MISMATCH')
  if not 80<=len(answer.split())<=180 or len(rubric)!=5 or any(len(x.strip())<17 for x in rubric):
   raise ValueError('CHEMISTRY_FOUR_NOT_SUBSTANTIVE_FIVE_MARK_RESEARCH')
  if any(x in answer.lower() for x in ('degrees c','°c','grams','millilit','hours','minutes','distillat','equipment list')):
   raise ValueError('CHEMISTRY_FOUR_RESEARCH_MUST_NOT_PROVIDE_EXPERIMENTAL_INSTRUCTIONS')
  mediums[row['medium']]+=1
  out.append({
   'questionId':id,'grade':'10th','subject':'Chemistry','medium':row['medium'],
   'questionType':'long','marks':5,'currentLiveFullRevisionSHA256':revision[id],
   'originalFrozenSourceFile':frozenrow['sourceFile'],'frozenResearchFileSHA256':frozenrow['originalResearchFileSha256'],
   'originalNonproceduralChemistryConceptualExemplarNotOfficialKey':answer,
   'fiveCriterionAcademicAndSafetyReviewRubricNotApprovedKey':rubric,
   'mayNotProvideLaboratoryOperatingParameters':True,'multipleCorrectStudentAnswersPermitted':True,
   'schoolSpecific2026To2027EditionAdopted':False,
   'originalPrintedTextbookExercisePageVerified':False,
   'independentChemistryFacultyRevisionApproval':False,
   'independentUrduReviewerApproval':False,
   'academicApproved':False,'paperStudioVerifiedSelectable':False,'productionDBWrites':0})
 if mediums!=collections.Counter({'english':1,'Urdu':3}):
  raise ValueError('EXACT_CHEMISTRY_FOUR_ENGLISH_1_URDU_3_REQUIRED')
 return {'schema':'ASSPS_GRADE10_FOUR_CHEMISTRY_CONCEPTUAL_RESEARCH_NONPROCEDURAL_UNAPPROVED_V1',
  'candidateCount':4,'school1LiveCurrentRevisionCount':2411,'school1DatabaseMutations':0,
  'laboratoryOperatingInstructionsIncluded':False,'falseAcademicReviewSignaturesCount':0,
  'verifiedSchoolAdoptedSourceExercisePages':0,'qualifiedSubjectApprovals':0,
  'qualifiedUrduReviews':0,'academicallyApproved':0,'paperStudioPublished':0,
  'answers':sorted(out,key=lambda x:x['questionId'])}
def run():
 mod=source_module();live=mod.read_live()
 rev={r['questionId']:r['revisionSha256'] for r in json.loads((STATE/'live-question-revisions.json').read_text())['records']}
 risk={r['questionId']:r for r in json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']}
 queue={r['questionId']:r for r in json.loads((STATE/'live-existing-answer-proposal-crosswalk-20261016.json').read_text())['unlinkedCurrentRevisionResearchQueue']}
 # Existing four HIGH questions leave the unlinked queue after source-only linking.
 # Recover ONLY historical review metadata from immutable original risk and current SHA.
 for id in ANS:
  if id not in queue:
   prior=risk.get(id)
   if (prior is None or prior.get('priority')!='HIGH'
       or prior.get('currentLiveContentRevisionSha256')!=rev.get(id)):
    raise ValueError('CHEMISTRY_FOUR_PRIOR_HIGH_SHA_RESEARCH_NOT_RECOVERABLE')
   queue[id]={'questionId':id,'priority':'HIGH','currentLiveRevisionSha256':rev[id],
              'academicallySelectable':False,
              'schoolStreamApplicability':'SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'}
 frozen={r['questionId']:r for r in json.loads(PUB.read_text())['rows']}
 return build(live,rev,risk,queue,frozen)
def main():
 a=run();s=json.dumps(a,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
 if sys.argv[1:]==['--check']:
  if not OUT.exists() or OUT.read_text()!=s:raise ValueError('FOUR_CHEMISTRY_ORIGINAL_CURRENT_SHA_PACKET_STALE_OR_CHANGED')
  print('FOUR_GRADE10_CHEMISTRY_NONPROCEDURAL_ORIGINAL_CURRENT_SHA_UNAPPROVED')
 elif len(sys.argv)==1:
  OUT.write_text(s);print('FOUR_CHEMISTRY_RESEARCH_CANDIDATES_CREATED_NO_APPROVAL')
 else:raise ValueError('ONLY_APPLY_OR_CHECK')
if __name__=='__main__':main()
