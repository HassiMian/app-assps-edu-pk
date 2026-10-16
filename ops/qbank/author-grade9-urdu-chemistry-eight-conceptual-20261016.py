#!/usr/bin/env python3
"""8 Grade IX Urdu Chemistry original conceptual answer candidates, no lab instructions."""
from __future__ import annotations
import hashlib,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry9UrduStarter2026.json'
SRC_SHA='0993bd684e10497b63e0792a23698046470c9433bca944b06e71f5849ef54cc5'
OUT=ROOT/'docs/question-bank/ASSPS_GRADE9_CHEMISTRY_URDU_8_ORIGINAL_CONCEPTUAL_EXPLANATIONS_20261016.json'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
ANS={
2:("""Atomic number کسی عنصر کے ایٹم کے مرکزے میں پروٹونوں کی تعداد ہے اور اسے عموماً Z سے ظاہر کرتے ہیں۔ اسی عدد کی بنیاد پر عنصر کی شناخت ہوتی ہے؛ اس لیے مختلف عناصر کے atomic number الگ ہوتے ہیں۔ Mass number، جسے A کہا جاتا ہے، مرکزے میں موجود پروٹون اور نیوٹران کی مجموعی تعداد ہے۔ کسی مخصوص isotope کے لیے نیوٹرانوں کی تعداد A سے Z منفی کرنے پر معلوم ہوتی ہے۔ Neutral atom میں منفی چارج والے الیکٹرانوں کی تعداد پروٹونوں کے برابر ہوتی ہے، لیکن ion بننے پر یہ تعداد بدل سکتی ہے۔ ایک ہی عنصر کے isotopes میں Z ایک جیسا اور نیوٹرانوں کی تعداد مختلف ہو سکتی ہے۔""",
['atomic number کی درست تعریف','mass number کی درست تعریف','A اور Z سے نیوٹرانوں کا تعلق','neutral atom کے electrons کا تقابل','isotopes اور ions میں درست فرق']),
3:("""Chemical bonding ایٹموں کے درمیان وہ تعامل ہے جس سے نسبتاً مستحکم ساختیں بن سکتی ہیں۔ Ionic bonding میں عموماً electron transfer کے بعد مخالف چارج والے ions کے درمیان electrostatic attraction اہم ہوتی ہے۔ اس کے برعکس covalent bonding میں دو ایٹم الیکٹرانوں کے ایک یا زیادہ جوڑے مشترک طور پر استعمال کرتے ہیں۔ Ionic compounds میں عام طور پر crystal lattice بنتی ہے، جبکہ covalent مادے الگ سالمات یا وسیع covalent networks بھی بنا سکتے ہیں۔ دونوں اقسام کی physical properties ایک جیسی نہیں ہوتیں؛ مثال کے طور پر پانی میں حل پذیری اور برقی موصلیت کا انحصار مجموعی ساخت پر بھی ہے۔ Bonding کی دونوں وضاحتیں بنیادی نمونے ہیں، ہر مرکب کو سخت دو خانوں میں رکھنا ہمیشہ ممکن نہیں ہوتا۔""",
['ionic electron transfer اور ions','electrostatic attraction کا کردار','covalent shared electron pairs','crystal lattice اور molecular/network structures','properties کی غیر مطلق، ساخت پر مبنی وضاحت']),
5:("""Exothermic اور endothermic عمل میں بنیادی فرق نظام اور اس کے گردوپیش کے درمیان توانائی کے تبادلے کی سمت ہے۔ Exothermic reaction کی صورت میں نظام سے حرارت باہر منتقل ہوتی ہے اور مستقل دباؤ پر enthalpy change کا اشارہ عموماً منفی ہوتا ہے۔ Endothermic reaction بیرونی ماحول سے حرارت جذب کرتی ہے اور enthalpy change عموماً مثبت ہوتا ہے۔ کچھ reactions میں bonds توڑنے کے لیے توانائی درکار ہوتی ہے، جبکہ نئے bonds بننے سے توانائی خارج ہو سکتی ہے؛ کل تبدیلی انہی حصوں کے مجموعے پر منحصر ہے۔ Heat release یا absorption کو reaction کی رفتار کے برابر نہیں سمجھنا چاہیے، کیونکہ تیز اور سست reactions دونوں کسی بھی energy class میں آ سکتی ہیں۔""",
['نظام اور ماحول کی توانائی کی سمت','exothermic حرارت اور منفی enthalpy','endothermic جذب اور مثبت enthalpy','bonds کے ٹوٹنے اور بننے کی توانائی','energy change اور reaction rate میں فرق']),
6:("""Chemical equilibrium اس وقت پیدا ہوتا ہے جب reversible reaction میں آگے اور پیچھے کے تعاملات کی رفتاریں برابر ہوں، لہٰذا مجموعی concentrations بظاہر مستقل رہتی ہیں۔ یہ حالت جامد نہیں ہوتی؛ microscopic سطح پر دونوں directions میں تعامل جاری رہ سکتا ہے۔ Le Chatelier کے اصول کے مطابق مناسب concentration تبدیلی پر نظام ایسی طرف adjust ہو سکتا ہے جو اس تبدیلی کے اثر کو کم کرے۔ کسی reactant کی مقدار بدلنے سے متعلق reaction quotient میں فرق پیدا ہو سکتا ہے۔ Temperature کا اثر الگ نوعیت رکھتا ہے، کیونکہ یہ equilibrium constant بھی بدل سکتا ہے: حرارت جذب کرنے والی سمت بلند temperature پر عموماً زیادہ favor ہوتی ہے۔ Catalyst equilibrium کی آخری position نہیں بدلتا؛ صرف اسے حاصل کرنے کی رفتار متاثر کر سکتا ہے۔""",
['dynamic equilibrium میں دونوں برابر رفتاریں','concentration کی تبدیلی پر ممکنہ shift','reaction quotient کا تصور','temperature اور endothermic direction','catalyst کا rate اور equilibrium پر مختلف اثر']),
7:("""Acids اور bases کی وضاحت مختلف نظریات سے کی جاتی ہے۔ Arrhenius کے aqueous تصور میں acid محلول میں hydrogen-ion سے متعلق acidity بڑھاتا ہے، جبکہ base hydroxide-ion سے متعلق basicity بڑھاتی ہے۔ Brønsted–Lowry نظریہ میں acid proton donor اور base proton acceptor ہے۔ پانی میں pH، hydrogen-ion activity سے متعلق ایک logarithmic پیمانہ ہے؛ مناسب حالات میں کم pH زیادہ acidic اور زیادہ pH زیادہ basic رویہ ظاہر کرتا ہے۔ Neutral water کے لیے تقریباً سات کا عدد عام درجہ حرارت کی مثال ہے، لیکن pH کی درست neutral value temperature کے ساتھ بدل سکتی ہے۔ تیزابی یا بنیادی مادوں کی خصوصیات صرف ظاہری شکل سے معلوم کرنا محفوظ یا معتبر طریقہ نہیں ہے۔""",
['aqueous acids کی بنیادی خصوصیت','bases کی بنیادی خصوصیت','proton donor/acceptor میں فرق','pH کی logarithmic اور نسبتی نوعیت','neutral pH temperature dependence']),
8:("""Periodic table میں elements کو بڑھتے ہوئے atomic number کے مطابق رکھا جاتا ہے۔ ایک vertical group میں موجود بہت سے main-group عناصر کے بیرونی الیکٹرانوں کا انداز ملتا جلتا ہوتا ہے، جس سے ان کے bonding اور reactivity کے کئی رجحانات میں مشابہت دیکھی جا سکتی ہے۔ Horizontal period میں electronic shells کی ترتیب اور effective nuclear attraction بدلتے ہیں، اس لیے atomic radius اور ionisation energy جیسے خواص میں عمومی trends مل سکتے ہیں۔ مثلاً period میں بائیں سے دائیں عام طور پر atomic radius گھٹنے کا رجحان دکھاتا ہے، مگر ہر property میں exceptions ممکن ہیں۔ کسی عنصر کی درست پیش گوئی کے لیے group، period اور electron configuration تینوں کو مدنظر رکھنا چاہیے۔""",
['atomic number کے مطابق ترتیب','group کی vertical تعریف','period کی horizontal تعریف','valence electrons اور chemical similarity','periodic trends، configuration اور exceptions']),
11:("""Alkanes اور alkenes دونوں hydrocarbons ہیں یعنی ان میں بنیادی طور پر carbon اور hydrogen کے ایٹم ہوتے ہیں۔ عام کھلی زنجیر والے alkanes saturated compounds ہوتے ہیں جن میں carbon-carbon کے single bonds پائے جاتے ہیں۔ اسی طرح سادہ open-chain alkenes میں کم از کم ایک carbon-carbon double bond موجود ہوتا ہے، جس کی وجہ سے انہیں unsaturated کہا جاتا ہے۔ Alkenes کا pi bond بعض addition reactions کی صلاحیت پیدا کرتا ہے، جبکہ alkanes کے متعلقہ مباحث میں substitution اہم reaction class ہو سکتی ہے۔ ان کی reactivity کا تقابل ہمیشہ structures اور conditions کے ساتھ کیا جانا چاہیے؛ یہ کہنا کہ ہر alkene ہر alkane سے لازماً زیادہ reactive ہوگا ایک غیر ضروری تعمیم ہے۔""",
['hydrocarbon کی تعریف','alkanes میں saturation اور single bonds','alkenes میں double bond اور pi bond','addition اور substitution کے تصورات','reactivity میں conditions اور exceptions']),
12:("""ایک اچھا experimental data table نتائج کو اس انداز میں منظم کرتا ہے کہ دوسرے لوگ بھی انہیں سمجھ سکیں۔ جدول میں واضح title، الگ column headings اور درست units ہونی چاہییں۔ یکساں نوعیت کی measurements کو مناسب significant figures کے ساتھ لکھنا ضروری ہے، اور خام observations کو غلط انداز میں round نہیں کرنا چاہیے۔ Graph میں independent variable عموماً horizontal محور اور dependent variable vertical محور پر دکھایا جاتا ہے، لیکن انتخاب تحقیق کے design سے مطابقت رکھنا چاہیے۔ دونوں axes کے labels، units، مناسب scale اور data points واضح ہوں۔ Graph کے رجحان کی تشریح کرتے ہوئے correlation کو خودبخود causation نہیں کہنا چاہیے، اور anomalous points کو بغیر وضاحت کے حذف نہیں کرنا چاہیے۔""",
['جدول کا عنوان، headings اور units','درست significant figures','independent/dependent variables کی شناخت','محوروں کی labels اور scale','anomalies اور correlation کی محتاط تشریح'])
}
def sha(b):return hashlib.sha256(b).hexdigest()
def build(live,hashes,review):
 if len(ANS)!=8:raise ValueError('GRADE9_CHEM_8_MISSING')
 a=[]
 for ch,(answer,criteria) in sorted(ANS.items()):
  id=f'IX-CHEM-UR-C{ch:02d}-L01'
  row=live[id];risk=review[id]
  if (row.get('grade')!='9th' or row.get('subject')!='Chemistry'
      or row.get('medium')!='Urdu' or row.get('type')!='long'
      or row.get('marks')!=5 or str(row.get('chapter'))!=str(ch)
      or risk.get('priority')!='HIGH'
      or risk.get('currentLiveContentRevisionSha256')!=hashes.get(id)):
   raise ValueError('GRADE9_CHEM_8_NOT_CURRENT_HIGH_LONG_REVISION')
  if len(answer.split())<75 or len(criteria)!=5 or len(set(criteria))!=5:
   raise ValueError('GRADE9_CHEM_8_CONCEPTUAL_ANSWER_TOO_SHALLOW')
  a.append({'questionId':id,'grade':'9th','subject':'Chemistry','medium':'Urdu',
   'questionType':'long','marks':5,'storedChapterClaimNotVerifiedSchoolEdition':ch,
   'originalAuthoringFile':SRC.name,'frozenResearchSourceSha256':SRC_SHA,
   'currentFullQuestionRevisionSha256':hashes[id],
   'newOriginalUrduConceptualExplanation':answer,'proposedFivePointReviewRubric':criteria,
   'independentQualifiedChemistryReviewed':False,'independentUrduReviewed':False,
   'sourcePrintedExercisePageVerified':False,'schoolSessionTextbookEditionAuthenticated':False,
   'published':False,'academicallyApproved':False,'paperStudioVerifiedSelectable':False,
   'hazardousPreparationProcedureIncluded':False,
   'state':'RESEARCH_CANDIDATE_EXACT_REVISION_NOT_ACADEMICALLY_APPROVED'})
 return {'schema':'ASSPS_GRADE9_URDU_CHEMISTRY_8_UNAPPROVED_CONCEPTUAL_ANSWERS_V1',
  'candidateCount':8,'frozenResearchSourceSha256':SRC_SHA,
  'liveSchool1RevisionsChecked':2411,'grade':'9th','medium':'Urdu','subject':'Chemistry',
  'productionDatabaseWrites':0,'academicApproved':False,'published':False,
  'paperStudioVerifiedSelectable':False,'independentReviewerAuthenticated':False,
  'officialSchoolTextbookAdoptionVerified':False,'exactExercisePageVerified':False,
  'rows':a}
def read():
 sp=importlib.util.spec_from_file_location('assps_ix_chem_live_read',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
 rows=m.read_live();led=json.loads((STATE/'live-question-revisions.json').read_text())
 hashes={r['questionId']:r['revisionSha256'] for r in led['records']}
 risks={r['questionId']:r for r in json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']}
 if len(rows)!=2411 or len(hashes)!=2411 or len(risks)!=604:
  raise ValueError('GRADE9_CHEM_SOURCE_SCOPE_DRIFT')
 live={r['id']:r for r in rows}
 frozen=SRC.read_bytes()
 if sha(frozen)!=SRC_SHA:raise ValueError('GRADE9_CHEM_ORIGINAL_FILE_SHA_CHANGED')
 orig={r['id']:r for r in json.loads(frozen)['drafts']}
 for ch in ANS:
  id=f'IX-CHEM-UR-C{ch:02d}-L01'
  r=orig[id];x=live[id]
  if (m.revision_sha(x)!=hashes.get(id) or r['type']!='long' or r['marks']!=5
      or r['content']['ur']['stem']!=x['questionText']
      or r['content']['ur']['answer']!=x['answer']):
   raise ValueError('GRADE9_CHEM_ORIGINAL_STEM_ANSWER_OR_CURRENT_SHA_DRIFT')
 return live,hashes,risks
def main():
 a=build(*read())
 raw=json.dumps(a,ensure_ascii=False,indent=2,sort_keys=True)+'\n'
 if len(sys.argv)==2 and sys.argv[1]=='--check':
  if not OUT.exists() or OUT.read_text()!=raw:raise ValueError('GRADE9_CHEM_DRAFT_NOT_REPRODUCIBLE')
  print('GRADE9_URDU_CHEM_EIGHT_ORIGINAL_SHA_LIVE_REVISION_MATCH_NO_APPROVAL')
 elif len(sys.argv)==1:
  OUT.write_text(raw,encoding='utf8')
  print('EIGHT_GRADE9_URDU_CHEM_CONCEPTUAL_CANDIDATES_CREATED_UNAPPROVED')
 else:raise ValueError('ONLY_NONE_OR_CHECK')
if __name__=='__main__':main()
