#!/usr/bin/env python3
"""Author 14 original, unapproved, current-revision Urdu research explanations.
Grade IX Biology (8) and Grade X Computer Science (6); no database writes.
"""
from __future__ import annotations
import hashlib,importlib.util,json,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SOURCE_ROOT=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
DOCS=ROOT/'docs/question-bank'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUTPUT=DOCS/'ASSPS_GRADE9_BIOLOGY_8_AND_GRADE10_COMPUTER_6_URDU_UNAPPROVED_EXPLANATIONS_20261016.json'
FROZEN={
 'Biology':('9th','biology9UrduStarter2026.json','26784a13d6e22cb79c9fffb98b31c768e165a5999871b76bbecf61d6ef814d1f','pectaa-catalog-010'),
 'Computer Science':('10th','computer10UrduStarter2026.json','9268f2863ff830f4153df16c77ba6b36ff9ed49e5c648a0e25049b5ce458808a','pectaa-catalog-025'),
}
# Each entry is independently written as a conceptual explanation and a distinct
# five-point reviewer rubric, not quoted textbook exercise material.
DRAFTS={
 'IX-BIO-UR-C01-L01':(
 'حیاتیات کو مشترکہ یا collaborative science کہنا درست ہے کیونکہ جانداروں کے پیچیدہ مسائل کو سمجھنے کے لیے مختلف مہارتیں اور علوم اکٹھے کام کرتے ہیں۔ ایک محقق مشاہدات جمع کرتا ہے، دوسرا تجربے کا منصوبہ بناتا ہے، اور تیسرا اعداد و شمار کا تجزیہ کر سکتا ہے۔ کیمیا حیاتیاتی سالمات اور ان کے تعامل کی وضاحت میں مدد دیتی ہے، جبکہ طبیعیات روشنی، حرکت اور توانائی جیسے اصول فراہم کرتی ہے۔ کمپیوٹر سائنس بڑے حیاتیاتی ڈیٹا کی ترتیب اور تجزیے میں مفید ہے۔ جب محققین شواہد، طریقۂ کار اور نتائج دوسروں سے شیئر کرتے ہیں تو غلطیوں کی نشاندہی اور نتائج کی دوبارہ جانچ ممکن ہوتی ہے۔ اس طرح تعاون قابلِ اعتماد علم کو بڑھاتا ہے۔',
 ['مختلف محققین کا باہمی تعاون','مشاہدات اور تجربات کا اشتراک','کیمیا یا طبیعیات کے متعلقہ اصول','ڈیٹا تجزیے میں کمپیوٹر سائنس کا کردار','نتائج کی جانچ، شفافیت اور قابلِ اعتماد علم'],
 'https://openstax.org/books/biology-2e/pages/1-2-themes-and-concepts-of-biology'),
 'IX-BIO-UR-C02-L01':(
 'Biological diversity یا حیاتیاتی تنوع سے مراد ایک علاقے یا زمین پر پائی جانے والی انواع، جینیاتی فرق اور ماحولیاتی نظاموں کی گوناگونی ہے۔ مختلف جاندار خوراک کے جال میں اپنا کردار ادا کرتے ہیں؛ ایک اہم نوع کی کمی دوسرے جانداروں کو بھی متاثر کر سکتی ہے۔ تنوع کی وجہ سے بعض ماحولیاتی نظام تبدیلی یا بیماری کے بعد بہتر طور پر بحال ہو سکتے ہیں، اگرچہ یہ ضمانت نہیں ہے۔ پودوں، جانوروں اور خردنامیوں سے خوراک، ادویات اور دیگر وسائل حاصل ہوتے ہیں۔ اس لیے قدرتی رہائش گاہوں کا تحفظ، آلودگی میں کمی، غیر ضروری شکار سے گریز اور وسائل کا ذمہ دارانہ استعمال اہم اقدامات ہیں۔ مقامی انواع کا تحفظ انسانی بہبود سے بھی جڑا ہوا ہے۔',
 ['تنوع کی انواع، جینیات اور نظاموں والی تعریف','خوراک کے جال اور ماحولیاتی تعلقات','ماحولیاتی مزاحمت اور بحالی کی اہمیت','خوراک، ادویات اور انسانی فوائد','رہائش گاہ اور وسائل کے تحفظ کے مناسب طریقے'],
 'https://openstax.org/books/biology-2e/pages/47-2-the-importance-of-biodiversity-to-human-life'),
 'IX-BIO-UR-C03-L01':(
 'پودے اور جانور دونوں کے خلیے یوکاریوٹک ہوتے ہیں، اس لیے ان میں خلیاتی جھلی، سائٹوپلازم، مرکزہ، مائٹوکانڈریا اور رائبوسوم جیسے مشترک اجزا ملتے ہیں۔ خلیاتی جھلی مادوں کی آمدورفت کو منظم کرتی ہے، جبکہ مرکزہ میں جینیاتی معلومات موجود ہوتی ہیں۔ عام نباتاتی خلیے میں سیلولوز کی مضبوط خلیاتی دیوار اضافی سہارا دیتی ہے اور بڑی مرکزی ویکیول پانی کے توازن اور ساخت میں مدد دیتی ہے۔ سبز حصوں کے بہت سے نباتاتی خلیوں میں کلوروپلاسٹ روشنی سے خوراک بنانے کا عمل انجام دیتے ہیں، لیکن ہر نباتاتی خلیے میں کلوروپلاسٹ نہیں ہوتا۔ عام حیوانی خلیے میں سیلولوز کی دیوار اور کلوروپلاسٹ نہیں ہوتے، جبکہ ویکیول عموماً چھوٹی ہو سکتی ہے۔',
 ['دونوں خلیوں کی یوکاریوٹک اور مشترک ساخت','جھلی، مرکزے اور مشترک اعضا کے افعال','نباتاتی خلیے کی سیلولوز دیوار','بڑی مرکزی ویکیول اور کلوروپلاسٹ کی شرائط','حیوانی خلیے میں دیوار اور کلوروپلاسٹ کی عدم موجودگی'],
 'https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells'),
 'IX-BIO-UR-C04-L01':(
 'Mitosis خلیاتی تقسیم کا وہ عمل ہے جس میں مناسب تیاری اور جینیاتی مادے کی نقل کے بعد ایک جسمانی خلیے سے عموماً دو ایسے نئے خلیے بنتے ہیں جن میں کروموسوم کی تعداد برقرار رہتی ہے۔ جسم کی نشوونما کے دوران خلیوں کی تعداد بڑھنا اسی عمل کی اہم مثال ہے۔ جلد اور دوسرے بافتوں کے پرانے یا خراب خلیوں کی جگہ نئے خلیے بنانے میں بھی تقسیم اہم کردار ادا کرتی ہے۔ مختلف مراحل میں کروموسوم منظم ہوتے، الگ کیے جاتے اور دو نئے مرکزوں میں تقسیم ہوتے ہیں۔ اس کے بعد سائٹوپلازم کی تقسیم سے خلیے الگ ہو سکتے ہیں۔ درست کنٹرول نہ ہو تو بے قابو تقسیم بیماری سے منسلک ہو سکتی ہے؛ اس لیے نمو اور مرمت کے ساتھ تقسیم کی تنظیم بھی ضروری ہے۔',
 ['مائٹوسس کی تعریف اور دو نئے خلیوں کی تشکیل','کروموسوم کی تعداد برقرار رہنا','نمو کے لیے خلیوں کی تعداد میں اضافہ','بافتوں میں خراب خلیوں کا بدلنا','کروموسوم کی درست تقسیم اور اس کا کنٹرول'],
 'https://openstax.org/books/biology-2e/pages/10-2-the-cell-cycle'),
 'IX-BIO-UR-C05-L01':(
 'حیاتیاتی تنظیم میں خلیہ جاندار کی بنیادی ساختی اور عملی اکائی ہے۔ ملتے جلتے افعال ادا کرنے والے کئی مناسب خلیے اور ان کے درمیان موجود مادہ مل کر بافت یعنی tissue تشکیل دیتے ہیں۔ مختلف بافتیں مخصوص ترتیب سے مل کر عضو بناتی ہیں جس میں متعدد کام باہمی رابطے سے انجام پاتے ہیں۔ کئی متعلقہ اعضا جب مل کر کسی بڑے جسمانی کام کو مکمل کرتے ہیں تو انہیں organ system کہا جاتا ہے۔ اس ترتیب کو cell، tissue، organ اور organ system لکھا جا سکتا ہے۔ ہر اگلے درجے کی خصوصیات اس کے حصوں کے منظم تعامل سے پیدا ہوتی ہیں، اس لیے صرف اجزا کا تعداد میں بڑھ جانا زیادہ درجے کی مکمل تنظیم کو ظاہر نہیں کرتا۔',
 ['خلیے کو بنیادی ساختی اور عملی اکائی کہنا','بافت کی خلیوں سے تشکیل','مختلف بافتوں سے عضو کی تعمیر','متعلقہ اعضا سے organ system','ہر درجے میں اجزا کا منظم باہمی تعامل'],
 'https://openstax.org/books/anatomy-and-physiology-2e/pages/1-2-structural-organization-of-the-human-body'),
 'IX-BIO-UR-C06-L01':(
 'Carbohydrates بنیادی طور پر جسم کو توانائی مہیا کرنے اور بعض جانداروں میں ساخت بنانے میں مدد دیتے ہیں؛ گلوکوز فوری توانائی کا اہم ذریعہ ہے اور نشاستہ یا گلائیکوجن ذخیرے کی مثالیں ہیں۔ Proteins امینو ایسڈز سے بنتے ہیں اور خامروں، ساختی اجزا، نقل و حمل اور جسمانی دفاع سمیت مختلف افعال انجام دیتے ہیں۔ Lipids طویل مدتی توانائی کے ذخیرے، حرارت کے تحفظ اور خلیاتی جھلی کی تشکیل میں حصہ لیتے ہیں؛ بہت سی جھلیوں میں فاسفولیپڈ اہم ہوتے ہیں۔ Nucleic acids یعنی DNA اور RNA جینیاتی معلومات کے ذخیرے اور اظہار سے متعلق ہیں اور پروٹین بنانے کے عمل میں کردار ادا کرتے ہیں۔ چاروں اقسام ایک دوسرے کی جگہ ہر کام انجام نہیں دے سکتیں۔',
 ['کاربوہائیڈریٹس کی توانائی اور ساخت','پروٹین کے خامرے اور دیگر افعال','لپڈز کے ذخیرے اور جھلی میں کردار','DNA اور RNA کی جینیاتی ذمہ داری','چاروں اقسام کے افعال میں درست تقابل'],
 'https://openstax.org/books/biology-2e/pages/3-introduction'),
 'IX-BIO-UR-C07-L01':(
 'خامرے یا enzymes حیاتیاتی عمل انگیز ہوتے ہیں جو کئی کیمیائی تعاملات کی activation energy کم کرتے ہیں۔ ہر خامرے کے لیے درجہ حرارت اور pH کی ایک مناسب حد ہوتی ہے جہاں اس کی سرگرمی مؤثر رہتی ہے۔ درجہ حرارت بڑھنے سے ایک حد تک ذرات کی حرکت اور مناسب ٹکراؤ بڑھ سکتا ہے، لیکن بہت زیادہ حرارت بعض خامروں کی ساخت اور فعال مقام کو خراب کر دیتی ہے۔ بہت کم درجہ حرارت پر عموماً سرگرمی سست ہو جاتی ہے، ضروری نہیں کہ خامرہ مستقل طور پر ختم ہو جائے۔ pH میں بڑی تبدیلی فعال مقام کے چارج یا ساخت کو متاثر کر کے substrate کے ساتھ جڑنے اور تعامل کی رفتار کو کم کر سکتی ہے۔ مختلف خامروں کی بہترین شرائط ایک جیسی نہیں ہوتیں۔',
 ['خامروں کا activation energy گھٹانا','مناسب درجہ حرارت میں بہتر سرگرمی','زیادہ حرارت سے ساخت کا متاثر ہونا','کم درجہ حرارت سے رفتار میں کمی','pH کی تبدیلی اور مختلف خامروں کے مختلف optimum'],
 'https://openstax.org/books/biology-2e/pages/6-5-enzymes'),
 'IX-BIO-UR-C08-L01':(
 'جانداروں میں توانائی کی تبدیلی زندگی کے بنیادی عمل جاری رکھنے کے لیے ضروری ہے۔ سبز پودے روشنی کی توانائی کا کچھ حصہ photosynthesis کے ذریعے نامیاتی سالمات میں کیمیائی توانائی کی صورت میں محفوظ کرتے ہیں۔ جب خلیے خوراک کے سالمات کو مناسب میٹابولک راستوں میں توڑتے ہیں تو حاصل شدہ توانائی کا حصہ ATP بنانے میں استعمال کیا جا سکتا ہے۔ ATP سے توانائی منتقل ہو کر خلیاتی تعمیر، فعال نقل و حمل، حرکت اور دوسرے ضروری کاموں میں مدد دیتی ہے۔ توانائی پیدا یا فنا نہیں ہوتی بلکہ شکل بدلتی اور اردگرد میں حرارت کی صورت بھی منتقل ہو سکتی ہے۔ خوراک کے جال میں توانائی کی منتقلی کے ہر مرحلے پر قابلِ استعمال توانائی کم ہوتی جاتی ہے۔',
 ['روشنی سے کیمیائی توانائی میں تبدیلی','خوراک کے سالمات میں توانائی کا ذخیرہ','میٹابولزم اور ATP کا کردار','حرکت، تعمیر اور نقل و حمل میں استعمال','توانائی کے تحفظ اور حرارت کے اخراج کی وضاحت'],
 'https://openstax.org/books/biology-2e/pages/6-1-energy-and-metabolism'),
 'X-COMP-C01-L01':(
 'Operating system کمپیوٹر کے ہارڈویئر اور استعمال کرنے والی applications کے درمیان بنیادی رابطہ فراہم کرتا ہے۔ یہ CPU پر چلنے والے processes کو وقت اور وسائل دیتا ہے تاکہ متعدد کام مناسب ترتیب سے انجام پائیں۔ Memory management کے ذریعے پروگراموں کو درکار RAM کی نگرانی اور تخصیص ہوتی ہے۔ File management فائلوں اور فولڈروں کے نام، مقام اور رسائی کے اصول سنبھالتا ہے۔ Device management پرنٹر، کی بورڈ یا دوسرے آلات کے لیے مناسب drivers اور رابطے کو منظم کرتا ہے۔ User interface صارف کو گرافیکل یا کمانڈ طریقے سے نظام استعمال کرنے دیتا ہے۔ مزید یہ کہ اکاؤنٹس، اجازتیں اور سکیورٹی controls غیر متعلقہ صارفین کی رسائی محدود کرتے ہیں۔ اس طرح نظام محفوظ اور منظم کام کرنے میں مدد دیتا ہے۔',
 ['CPU اور process scheduling','RAM اور memory management','فائل اور فولڈر management','device drivers اور آلات کا انتظام','interface اور صارف/سکیورٹی permissions'],
 'https://www.ibm.com/think/topics/operating-systems'),
 'X-COMP-C02-L01':(
 'Computer خراب ہونے کے بعد recovery کی شروعات مسئلے کی علامات نوٹ کرنے سے ہوتی ہے، مثلاً system error یا boot failure۔ مزید نقصان سے بچنے کے لیے غیر ضروری تبدیلیاں روکیں اور ممکن ہو تو اہم فائلوں کا محفوظ backup چیک کریں۔ پہلے بجلی، cable اور عام hardware کی بنیادی خرابی کو سمجھیں، پھر سسٹم کے اپنے diagnostics اور logs سے وجہ معلوم کرنے کی کوشش کریں۔ اگر مسئلہ software سے متعلق ہو تو قابلِ اعتماد built-in recovery، Safe Mode یا پہلے سے دستیاب restore point مناسب صورت میں مدد دے سکتے ہیں۔ بحالی سے پہلے اصل ڈیٹا اور recovery کا ممکنہ اثر سمجھنا ضروری ہے۔ آخر میں فائلیں، پروگرام، security updates اور عمومی کارکردگی چیک کریں، اور خرابی اور اقدامات کا مختصر ریکارڈ محفوظ رکھیں۔',
 ['مسئلے کی شناخت اور علامات محفوظ کرنا','اہم ڈیٹا اور backup کی حفاظت','محفوظ built-in diagnostics','مناسب recovery طریقہ اور اس کے خطرات','بحالی کے بعد تصدیق اور دستاویز'],
 'https://www.nist.gov/publications/small-business-information-security-fundamentals'),
 'X-COMP-C03-L01':(
 'دو نمبروں کا مجموعہ دکھانے والے Python پروگرام کی planning میں پہلے واضح کیا جاتا ہے کہ صارف سے دو input values لینی ہیں۔ Input عموماً text کی شکل میں ملتا ہے، اس لیے عددی جمع کے لیے مناسب صورت میں int یا float کی conversion ضروری ہو سکتی ہے۔ پہلی اور دوسری قدر کو واضح نام والے variables میں محفوظ کریں۔ اس کے بعد addition operator کے ذریعے sum کا نتیجہ نکالیں اور print سے اسے صارف کو دکھائیں۔ منصوبے میں یہ بھی طے کریں کہ غیر عددی input آئے تو پروگرام مناسب پیغام دے یا دوبارہ درست value مانگے۔ Testing میں دو مثبت اعداد، صفر، منفی اعداد اور اعشاری اعداد کے الگ مثالیں دیکھنے سے منطقی اور conversion کی غلطیوں کی نشاندہی ہوتی ہے۔',
 ['دو عددی inputs کی وضاحت','مناسب variables اور numeric conversion','جمع کا درست عمل','print کے ذریعے نتیجہ','invalid input اور مختلف test cases'],
 'https://docs.python.org/3/tutorial/introduction.html'),
 'X-COMP-C04-L01':(
 'Student marks program میں conditional statements اور loops الگ لیکن باہمی مددگار کردار ادا کرتے ہیں۔ پہلے ہر طالب علم یا مضمون کے marks input لیے جاتے ہیں اور چیک کیا جاتا ہے کہ حاصل کردہ عدد مقررہ قابلِ قبول حد میں ہے۔ if، elif اور else سے طے کیا جا سکتا ہے کہ متعلقہ marks کے مطابق grade یا pass/fail فیصلہ کیا ہو، مگر grade boundaries پہلے سے واضح ہونی چاہییں۔ for loop سے متعدد مضامین یا طلبہ کی values پر ایک جیسا عمل دہرایا جا سکتا ہے۔ ہر بار نتیجہ محفوظ یا دکھایا جائے تاکہ طالب علم کی معلومات آپس میں خلط ملط نہ ہوں۔ پروگرام کو حدی values، غیر عددی input اور خالی entries کے ساتھ بھی test کرنا چاہیے۔',
 ['marks input اور جائز حدود','if/elif/else سے فیصلہ','واضح grade/pass قواعد','for loop سے متعدد records','درست output، validation اور testing'],
 'https://docs.python.org/3/tutorial/controlflow.html'),
 'X-COMP-C05-L01':(
 'Data science میں پہلا مرحلہ ایک قابلِ جواب سوال طے کرنا ہے، مثلاً کسی تعلیمی سرگرمی میں حاضری کے عمومی رجحان کو سمجھنا۔ اس کے بعد جائز، متعلقہ اور اجازت شدہ ذرائع سے مناسب data جمع کیا جاتا ہے۔ جمع شدہ معلومات میں missing values، duplicate entries اور غیر یکساں formats کو پہچان کر data cleaning اور organization کی جاتی ہے۔ پھر بنیادی summary، گروپ بندی یا دوسرے مناسب تجزیے سے patterns معلوم کیے جاتے ہیں۔ Charts یا tables نتائج سمجھنے میں مدد دیتے ہیں، لیکن visual display غلط وجہ و نتیجہ ثابت نہیں کرتا۔ آخر میں limitations، privacy اور ممکنہ bias واضح کرتے ہوئے نتائج پیش کیے جاتے ہیں۔ نئے شواہد آنے پر نتیجے کا دوبارہ جائزہ لیا جا سکتا ہے۔',
 ['مسئلے یا سوال کی تعریف','جائز data collection اور privacy','cleaning اور organization','analysis اور visualization','نتائج، limitations اور bias کا جائزہ'],
 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html'),
 'X-COMP-C08-L01':(
 'ذمہ دار digital venture کے لیے پہلے حقیقی صارف کی ضرورت یا مسئلہ واضح کیا جاتا ہے اور اس کا حل قابلِ آزمائش صورت میں بیان کیا جاتا ہے۔ اگلا مرحلہ target customers، value proposition اور دستیاب وقت، مہارت اور وسائل کی نشاندہی ہے۔ SWOT analysis میں strengths، weaknesses، opportunities اور threats کو حقیقت پسندانہ انداز میں دیکھا جا سکتا ہے۔ ابتدائی بجٹ، سروس کا معیار اور ممکنہ خطرات پہلے سے سوچنا بہتر ہے۔ Marketing میں سچی معلومات، واضح قیمت اور صارف کے احترام کو اہمیت دیں۔ ذاتی data کے لیے اجازت، مناسب حفاظت اور deletion policies اختیار کریں اور دوسروں کے copyrights یا trademarks کی خلاف ورزی نہ کریں۔ مفید KPIs، صارف کی feedback اور مسلسل اصلاح سے منصوبے کو بہتر بنایا جا سکتا ہے۔',
 ['ضرورت، صارف اور قدر کی تعریف','وسائل، بجٹ اور بنیادی SWOT','ذمہ دار marketing اور واضح شرائط','privacy اور دانش ورانہ ملکیت کا احترام','KPI، feedback اور iterative improvement'],
 'https://www.nist.gov/publications/small-business-information-security-fundamentals'),
}
def sha(b):return hashlib.sha256(b).hexdigest()
def build(rows_by_id,livehashes,eligibility):
 if len(DRAFTS)!=14 or len(set(DRAFTS))!=14:raise ValueError('SECOND_URDU_BATCH_EXPECTED_14')
 result=[]
 for id,(answer,points,url) in sorted(DRAFTS.items()):
  subject='Biology' if id.startswith('IX-BIO-UR-') else 'Computer Science' if id.startswith('X-COMP-') else None
  if subject is None:raise ValueError('UNEXPECTED_SECOND_URDU_ID')
  grade,filename,source_sha,catalog=FROZEN[subject]
  row=rows_by_id[id]
  risk=eligibility[id]
  if (str(row['grade'])!=grade or str(row['subject'])!=subject or str(row['medium'])!='Urdu'
     or row['type']!='long' or int(row['marks'])!=5
     or risk['priority']!='HIGH' or risk['currentLiveContentRevisionSha256']!=livehashes[id]):
    raise ValueError('SECOND_URDU_BATCH_NOT_HIGH_CURRENT_LONG')
  if len(answer.split())<70 or len(points)!=5 or len(set(points))!=5:
    raise ValueError('SECOND_URDU_ANSWER_DEPTH_OR_MARKS_INCOMPLETE')
  if sum(0x600<=ord(c)<=0x6ff for c in answer)<180:
    raise ValueError('SECOND_URDU_PROPOSAL_NOT_ACTUALLY_URDU')
  result.append({
   'questionId':id,'grade':grade,'subject':subject,'medium':'Urdu','marks':5,
   'sourceResearchFile':filename,'frozenOriginalResearchFileSha256':source_sha,
   'declaredSourceCatalogRecordIdUnverifiedForSchoolAdoption':catalog,
   'currentLiveFullContentRevisionSha256':livehashes[id],
   'storedChapterClassificationUnverified':row.get('chapter'),
   'independentlyAuthoredUrduExplanationCandidate':answer,
   'proposedFivePointMarkingCriteriaUrdu':points,
   'backgroundSubjectLearningReferenceUrl':url,
   'sourcePrintedTextbookPageOrExerciseVerified':False,
   'actualSchoolAdoptedEditionFor2026_27Verified':False,
   'independentlyQualifiedSubjectReviewed':False,'independentUrduLanguageReviewerApproved':False,
   'academicallyApproved':False,'publishedVerified':False,
   'paperStudioApprovedSelectable':False,
   'status':'RESEARCH_DRAFT_CURRENT_SHA_BOUND_STAFF_APPROVAL_PENDING'})
 return {
  'schema':'ASSPS_GRADE910_14_ORIGINAL_URDU_BIOLOGY9_COMPUTER10_EXPLANATIONS_V1',
  'candidateCount':14,'grade9BiologyUrduCount':8,'grade10ComputerUrduCount':6,
  'researchOnlyNotTextbookCopyrightReproduction':True,
  'originalSourceFileFingerprintsVerified':2,
  'actualSchoolTextbookAdoptionVerified':False,'sourceExercisePageVerified':False,
  'independentAcademicReviewCompleted':False,'independentUrduLanguageReviewCompleted':False,
  'academicallyApproved':False,'published':False,'paperStudioSelectable':False,
  'productionDatabaseWrites':0,'drafts':result}
def load_live():
 sp=importlib.util.spec_from_file_location('assps_readonly_grade910_14',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)
 rows=mod.read_live(); ledger=json.loads((STATE/'live-question-revisions.json').read_text())
 hashes={x['questionId']:x['revisionSha256'] for x in ledger['records']}
 if len(rows)!=2411 or len(hashes)!=2411 or ledger.get('revisions')!=2411:
  raise ValueError('SECOND_URDU_BATCH_CORPUS_DRIFT')
 byid={x['id']:x for x in rows}
 for id in DRAFTS:
  if mod.revision_sha(byid[id])!=hashes[id]:raise ValueError('SECOND_URDU_BATCH_LIVE_REVISION_DRIFT')
 original={}
 for subject,(grade,name,hash_,catalog) in FROZEN.items():
  b=(SOURCE_ROOT/name).read_bytes()
  if sha(b)!=hash_:raise ValueError('FROZEN_RESEARCH_FILE_SHA_DRIFT')
  content=json.loads(b)
  each={x['id']:x for x in content['drafts']}
  if len(each)!=len(content['drafts']):raise ValueError('FROZEN_RESEARCH_DUPLICATE_ID')
  for id,(answer,points,url) in DRAFTS.items():
   if (subject=='Biology' and not id.startswith('IX-BIO-UR-')) or (subject=='Computer Science' and not id.startswith('X-COMP-')):continue
   a=each[id]
   if (a['type']!='long' or a['marks']!=5
       or a['content']['ur']['stem']!=byid[id]['questionText']
       or a['content']['ur']['answer']!=byid[id]['answer']):
    raise ValueError('FROZEN_ORIGINAL_STEM_ANSWER_NO_LONGER_MATCHES_LIVE')
  original[subject]=content
 risk=json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())
 if risk.get('subjectiveRiskReviewCandidates')!=604:raise ValueError('HIGH_SOURCE_604_DRIFT')
 eligibility={x['questionId']:x for x in risk['records'] if x['priority']=='HIGH'}
 if not set(DRAFTS)<=set(eligibility):raise ValueError('NEW_URDU_HIGH_IDS_NOT_IN_ORIGINAL_ADVISORY')
 return byid,hashes,eligibility
def run():
 data=build(*load_live())
 raw=json.dumps(data,indent=2,sort_keys=True,ensure_ascii=False)+'\n'
 if len(sys.argv)==2 and sys.argv[1]=='--check':
  if not OUTPUT.exists() or OUTPUT.read_text()!=raw:
   raise ValueError('SECOND_URDU_RESEARCH_PACKET_MODIFIED_OR_UNGENERATED')
  print('FOURTEEN_NEW_URDU_RESEARCH_DRAFTS_ORIGINAL_SHA_LIVE_SHA_AND_CONTENT_PASS')
  return
 if len(sys.argv)!=1:raise ValueError('USE_NO_ARGUMENTS_OR_CHECK')
 OUTPUT.write_text(raw,encoding='utf8')
 print('14_INDEPENDENT_NEW_URDU_RESEARCH_ANSWERS_WRITTEN_UNAPPROVED')
if __name__=='__main__':run()
