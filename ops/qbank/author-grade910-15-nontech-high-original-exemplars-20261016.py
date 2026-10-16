#!/usr/bin/env python3
"""15 original, CURRENT-revision pinned, unapproved Grade 9/10 scholarly answer exemplars.

Not official textbook exercises. No AI faculty impersonation, Paper Studio imports,
source-page certification or production DB writes.
"""
from __future__ import annotations
import collections,hashlib,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SEED=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
PUBLIC=ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=ROOT/'docs/question-bank/ASSPS_GRADE910_15_NONTECH_ORIGINAL_HIGH_PRIORITY_UNAPPROVED_EXEMPLARS_20261016.json'
DATA={
'X-PAK-UR-C01-L01':("""پاکستان کے قیام کے پس منظر میں مذہبی شناخت، سماجی حالات اور سیاسی حقوق ایک دوسرے سے جڑے ہوئے تھے۔ برصغیر کے مسلمانوں کے لیے اسلامی اقدار کے مطابق اجتماعی زندگی کی خواہش کے ساتھ اپنی تہذیبی شناخت کا تحفظ بھی اہم تھا۔ تعلیم، روزگار اور نمائندگی سے متعلق خدشات نے اس احساس کو مزید مضبوط کیا کہ ان کے مفادات کا مؤثر سیاسی تحفظ ضروری ہے۔ مسلم لیگ کی سیاسی جدوجہد نے ان مطالبات کو منظم صورت دی۔ اس طرح مذہبی اور تہذیبی پہچان، سماجی و معاشی تحفظ اور نمائندہ سیاسی نظام کی بحث ایک دوسرے پر اثر انداز ہوئی۔ الگ وطن کا مطالبہ اسی تاریخی و سیاسی تناظر میں سمجھا جاتا ہے۔""",
['مذہبی و تہذیبی شناخت کی توضیح','سماجی تحفظ کا تعلق','معاشی و تعلیمی مفادات','سیاسی نمائندگی اور مسلم لیگ','عوامل کا مربوط تاریخی نتیجہ']),
'X-PAK-UR-C03-L01':("""آزادی کے بعد پاکستان نے ابتدا میں گورنمنٹ آف انڈیا ایکٹ 1935 کو ضروری ترامیم کے ساتھ عبوری آئینی بنیاد کے طور پر استعمال کیا۔ دستور ساز اسمبلی نے 12 مارچ 1949 کو قراردادِ مقاصد منظور کی جس نے آئین سازی کے بنیادی اصول واضح کیے۔ ملک کا پہلا باقاعدہ آئین 23 مارچ 1956 کو نافذ ہوا اور اس نے پارلیمانی نظام اختیار کیا۔ اکتوبر 1958 میں یہ آئین منسوخ ہوا۔ 1962 کا آئین صدارتی طرز حکومت پر مبنی تھا اور 1969 میں ختم ہوا۔ 1971 کے سیاسی واقعات کے بعد 1972 میں عبوری آئین بنا۔ قومی اسمبلی نے اپریل 1973 میں نئے آئین کو منظور کیا، جو 14 اگست 1973 کو نافذ ہوا۔ اس نے وفاقی پارلیمانی نظام اور دو ایوانی مقننہ کی بنیاد فراہم کی۔""",
['آزادی کے بعد عبوری آئینی بندوبست','1949 قراردادِ مقاصد کا درست مقام','1956 اور 1962 کے مختلف حکومتی نظام','1971–72 سیاسی و عبوری تبدیلیاں','1973 کا پارلیمانی و وفاقی آئین']),
'X-PAK-UR-C04-L01':("""پاکستان کی زمینی ساخت میں شمالی پہاڑی علاقے، مغربی سطح مرتفع اور دریائے سندھ کا وسیع میدانی نظام شامل ہیں۔ پہاڑی علاقوں میں ڈھلوان، موسم اور آمدورفت کی دشواری آبادی کی تقسیم پر اثر ڈالتی ہے، جبکہ میدانی علاقوں کی نسبتاً ہموار زمین شہروں، سڑکوں اور کھیتی باڑی کو سہولت دیتی ہے۔ دریائے سندھ اور اس کی معاون ندیاں زرعی آب پاشی اور بعض توانائی منصوبوں کے لیے اہم ہیں۔ مختلف علاقوں کی بارش، درجہ حرارت اور خشک سالی پانی اور فصلوں کی دستیابی بدلتی ہے۔ جہاں مناسب پانی، روزگار اور رسائی میسر ہوں وہاں آبادی اور معاشی سرگرمیاں نسبتاً زیادہ مرتکز ہو سکتی ہیں۔ اس لیے جغرافیہ، آب و ہوا اور معاشی منصوبہ بندی کو ایک ساتھ سمجھنا ضروری ہے۔""",
['پہاڑوں اور سطح مرتفع کا اثر','دریائے سندھ اور آب پاشی','آب و ہوا کا علاقائی فرق','آبادی اور آمدورفت پر اثر','جغرافیہ اور معاشی سرگرمیوں کا باہمی تعلق']),
'X-PAK-UR-C05-L01':("""پاکستان کے خارجی تعلقات پر اس کی جغرافیائی حیثیت، قومی سلامتی، تجارت اور بین الاقوامی ادارے اثر انداز ہوتے ہیں۔ ہمسایہ ممالک اور علاقائی راستوں کے باعث سرحدی تعاون، نقل و حمل اور تجارت اہم موضوعات بنتے ہیں۔ سلامتی کے تقاضے سفارتی ترجیحات اور علاقائی مذاکرات پر اثر ڈالتے ہیں۔ تجارتی روابط سے منڈیوں، سرمایہ کاری اور توانائی کے مواقع پیدا ہوتے ہیں، جبکہ معاشی ضرورتیں سفارتی فیصلوں میں بھی شامل رہتی ہیں۔ اقوام متحدہ اور دیگر کثیر ملکی فورمز کے ذریعے پاکستان مشترکہ مسائل پر مکالمہ اور تعاون کرتا ہے۔ مؤثر خارجہ پالیسی کو ان عناصر میں توازن رکھ کر پرامن تعلقات، خودمختاری اور عوامی خوشحالی کے مقاصد حاصل کرنے کی کوشش کرنی چاہیے۔""",
['جغرافیائی محل وقوع کا اثر','سلامتی اور سفارتی ترجیحات','تجارت اور معاشی مفاد','عالمی اداروں میں تعاون','توازن، امن اور خودمختاری کا نتیجہ']),
'X-PAK-UR-C06-L01':("""پاکستان کی معیشت میں زراعت خوراک، خام مال اور دیہی روزگار فراہم کرتی ہے۔ صنعت زرعی اور دوسری خام اشیا کو مفید مصنوعات میں تبدیل کر کے ہنر، پیداوار اور تجارت کو بڑھاتی ہے۔ خدمات کے شعبے میں تعلیم، صحت، بینکاری، تجارت اور مواصلات شامل ہیں، جو دیگر شعبوں کے لیے ضروری سہولتیں مہیا کرتے ہیں۔ توانائی کی قابل اعتماد فراہمی کھیتوں کی آب پاشی، کارخانوں کی مشینوں اور کاروباری خدمات سب کے لیے اہم ہے۔ اگر بجلی، پانی، نقل و حمل اور تربیت میں رکاوٹیں ہوں تو پیداواری لاگت بڑھ سکتی ہے۔ ان شعبوں کے باہمی ربط، وسائل کے مناسب استعمال اور بنیادی ڈھانچے کی بہتری سے پائیدار معاشی ترقی کے مواقع پیدا ہوتے ہیں۔""",
['زراعت اور خام مال کا کردار','صنعت اور روزگار','خدمات کے شعبے کی مثالیں','توانائی و بنیادی ڈھانچہ','شعبوں کا ربط اور پیداواری صلاحیت']),
'X-PAK-UR-C07-L01':("""آبادی میں اضافہ ملک کو زیادہ کام کرنے والے افراد، صارفین اور نئی صلاحیتیں فراہم کر سکتا ہے، بشرطیکہ تعلیم اور روزگار کے مواقع بھی بڑھیں۔ دوسری جانب تیزی سے بڑھتی آبادی پانی، رہائش، ٹرانسپورٹ، صحت اور تعلیمی سہولتوں پر دباؤ ڈال سکتی ہے۔ شہروں کی جانب نقل مکانی میں رہائشی منصوبہ بندی اور شہری خدمات کی ضرورت مزید بڑھتی ہے۔ پاکستان کا لسانی اور ثقافتی تنوع فن، ادب، دستکاری اور باہمی سیکھنے کے مواقع پیدا کرتا ہے۔ تاہم تعصب اور عدم مساوات سماجی تعاون کو کمزور کر سکتے ہیں۔ مناسب منصوبہ بندی، سب کے لیے تعلیم، احترام اور یکساں مواقع آبادی اور ثقافتی تنوع کو مثبت اجتماعی قوت میں بدل سکتے ہیں۔""",
['آبادی کے معاشی مواقع','وسائل اور خدمات پر دباؤ','شہری آبادی اور منصوبہ بندی','ثقافتی تنوع کے فائدے','شمولیت اور مساوی مواقع']),
'X-PAK-UR-C08-L01':("""خواتین کے بااختیار ہونے کے لیے معیاری تعلیم، قانونی حقوق کا احترام، معاشی مواقع اور سماجی تعاون باہمی طور پر ضروری ہیں۔ تعلیم معلومات، فیصلہ سازی اور نئی مہارتیں حاصل کرنے میں مدد دیتی ہے۔ قانونی آگاہی اور منصفانہ عمل سے حقوق کے تحفظ اور امتیاز کی شکایت کے مؤثر حل کی بنیاد بنتی ہے۔ ملازمت، کاروبار اور ہنر سیکھنے کے مواقع مالی خودمختاری اور معاشرے میں بامعنی شرکت بڑھا سکتے ہیں۔ خاندان، تعلیمی ادارے اور معاشرہ محفوظ اور احترام پر مبنی ماحول فراہم کر کے اس عمل کو مضبوط بناتے ہیں۔ جب ان تمام پہلوؤں کو ساتھ فروغ دیا جائے تو خواتین کی صلاحیتیں گھر، مقامی برادری اور قومی ترقی میں بہتر حصہ ڈال سکتی ہیں۔""",
['تعلیم اور مہارتوں کی اہمیت','قانونی حقوق و منصفانہ عمل','روزگار یا کاروبار کے مواقع','خاندان و معاشرے کا تعاون','قومی و اجتماعی فائدے']),
'X-URDU-GR-ESS01':("""محنت کامیابی کی کنجی ہے۔ انسان جب کسی مقصد کے لیے مستقل کوشش کرتا ہے تو اپنی صلاحیتوں کو نکھارتا اور مشکلات کا سامنا کرنا سیکھتا ہے۔ صرف خواہش کرنا کافی نہیں؛ کام کے لیے وقت مقرر کرنا، غلطیوں سے سبق لینا اور روزانہ قدم آگے بڑھانا ضروری ہے۔ مثال کے طور پر ایک طالب علم مشکل مضمون کو چھوٹے حصوں میں تقسیم کرکے باقاعدگی سے مشق کرے تو اس کی سمجھ بہتر ہوتی ہے۔ اسی طرح ایک کسان زمین کی دیکھ بھال، مناسب منصوبہ بندی اور مسلسل کوشش سے اپنی فصل کا معیار بہتر بنانے کی کوشش کرتا ہے۔ محنت کے ساتھ درست رہنمائی، دیانت داری اور صبر بھی اہم ہیں۔ کامیابی ہمیشہ فوری نہیں ملتی، مگر کوشش انسان کو پہلے سے زیادہ قابل اور ذمہ دار بناتی ہے۔""",
['واضح تمہید و موضوع','محنت کی وجہ اور اہمیت','طالب علم کی عملی مثال','دوسری مربوط مثال','متوازن نتیجہ اور رواں اردو']),
'X-URDU-GR-ESS02':("""علی: تم روزانہ سوشل میڈیا پر کتنی دیر گزارتے ہو؟ بلال: پہلے بہت وقت ضائع ہوتا تھا، اب پڑھائی کے بعد محدود وقت مقرر کرتا ہوں۔ علی: کیا وہاں ملنے والی ہر خبر درست ہوتی ہے؟ بلال: نہیں، میں اہم معلومات کو معتبر ذرائع سے تصدیق کیے بغیر آگے نہیں بھیجتا۔ علی: ذاتی معلومات اور تصویروں کا کیا خیال رکھتے ہو؟ بلال: اپنی اور دوسروں کی رازداری کا احترام کرتا ہوں، اور غیر ضروری تفصیلات عام نہیں کرتا۔ علی: تو کیا اس کا کوئی اچھا استعمال بھی ہے؟ بلال: ہاں، تعلیمی لیکچر، کتابوں کے بارے میں گفتگو اور گروپ مطالعہ میں مدد مل سکتی ہے۔ علی: اچھا مشورہ ہے؛ ہم وقت کی حد رکھیں گے اور ذمہ داری سے استعمال کریں گے۔""",
['دو کرداروں کی واضح باری','مقررہ وقت کی حد','معلومات کی تصدیق','رازداری اور احترام','تعلیمی فائدہ اور فطری اختتام']),
'IX-URDU-GR-ESS01':("""ایک گاؤں میں بارش کے بعد راستے پر پانی جمع ہو گیا۔ بچے اسکول جانے کے لیے اسی راستے سے گزرتے تھے، مگر ہر شخص اکیلا کوشش کر کے واپس آ جاتا تھا۔ ایک دن چار دوستوں نے بڑوں سے مشورہ کیا اور مل کر محفوظ متبادل راستہ صاف کرنے کا منصوبہ بنایا۔ کسی نے جھاڑیاں ہٹانے میں مدد دی، کسی نے ضرورت کے مطابق اوزار جمع کیے اور کچھ لوگوں نے بزرگوں کی رہنمائی میں راستے کی صفائی کی۔ سب نے اپنی طاقت اور وقت کے مطابق حصہ ڈالا۔ کام مکمل ہونے پر بچے دوبارہ آسانی سے اسکول پہنچنے لگے۔ گاؤں والوں نے محسوس کیا کہ جو مسئلہ ایک فرد کے لیے مشکل تھا، وہ باہمی تعاون سے حل ہو گیا۔ واقعی اتحاد میں برکت ہے۔""",
['کہانی کا واضح آغاز','مشترکہ مسئلے کا بیان','باہمی تعاون کے کردار','مسئلے کا مناسب حل','اتحاد کا نتیجہ اور رواں انداز']),
'IX-URDU-GR-ESS02':("""طالب علم: السلام علیکم، استاد محترم! میں اکثر کلاس میں چند منٹ دیر سے پہنچتا ہوں۔ استاد: وعلیکم السلام! تمہیں کیا لگتا ہے، اس سے کیا نقصان ہوتا ہے؟ طالب علم: سبق کا آغاز رہ جاتا ہے اور دوسرے کام بھی جلدی میں کرنے پڑتے ہیں۔ استاد: درست کہا۔ وقت کی پابندی انسان کو ذمہ داری اور نظم سکھاتی ہے۔ طالب علم: میں اپنی عادت کیسے بہتر بنا سکتا ہوں؟ استاد: رات ہی بستہ تیار کر لو، مناسب وقت پر آرام کرو اور صبح روانگی کے لیے اضافی وقت رکھو۔ طالب علم: میں روزانہ اپنا معمول لکھ کر بھی جانچوں گا۔ استاد: یہ اچھا طریقہ ہے۔ مستقل کوشش کرو اور ضرورت ہو تو گھر والوں سے مدد لو۔ طالب علم: شکریہ سر! میں کل سے وقت پر آنے کی کوشش کروں گا۔""",
['دونوں کرداروں کی واضح گفتگو','دیر کا حقیقی مسئلہ','وقت کی پابندی کی اہمیت','عملی اور محفوظ مشورے','قدرتی اختتام اور اردو روانی']),
'IX-MATH-C08-L01':("""For logical statements p and q, the conjunction p ∧ q is true exactly when both individual statements are true. List all four possible assignments for p and q without omitting or repeating any combination. When p = true and q = true, p ∧ q = true. When p = true and q = false, the conjunction is false. When p = false and q = true, it is also false. When both statements are false, the conjunction remains false. Thus the four rows in order are (T,T,T), (T,F,F), (F,T,F), and (F,F,F), where the last value is the conjunction. This rule distinguishes AND from OR and from implication. A correct truth table includes both input columns and the p ∧ q result column.""",
['چاروں possible truth assignments','p اور q دونوں درست ہوں تو نتیجہ T','p درست اور q غلط ہوں تو نتیجہ F','p غلط اور q درست ہوں تو نتیجہ F','FF پر نتیجہ F اور درست table']),
'IX-MATH-UR-C08-L01':("""منطقی بیانات p اور q کے لیے conjunction یعنی p ∧ q صرف اسی وقت درست ہوتا ہے جب دونوں بیانات درست ہوں۔ مکمل truth table بنانے کے لیے p اور q کی چاروں ممکنہ حالتیں الگ قطاروں میں لکھتے ہیں۔ پہلی قطار میں p درست اور q درست ہو تو نتیجہ بھی درست ہے۔ دوسری قطار میں p درست اور q غلط ہو تو نتیجہ غلط ہوگا۔ تیسری قطار میں p غلط اور q درست ہو تو نتیجہ پھر غلط ہے۔ چوتھی قطار میں دونوں غلط ہوں تو conjunction بھی غلط ہے۔ اس ترتیب سے جدول کی قطاریں T,T,T؛ T,F,F؛ F,T,F؛ اور F,F,F بنتی ہیں۔ یہ AND کی منطقی تعریف ہے؛ اسے OR کے قاعدے سے نہیں ملانا چاہیے۔""",
['p اور q کی تمام حالتیں','دونوں بیانات درست ہوں تو TT پر T','دوسرا بیان غلط ہو تو TF پر F','پہلا بیان غلط ہو تو FT پر F','FF نتیجہ F اور درست منطقی وجہ']),
'IX-MATH-UR-C11-L01':("""فرض کریں AB ایک خطی قطعہ ہے۔ اس کے دونوں سروں A اور B سے ایک ہی رداس لے کر قطعے کے اوپر اور نیچے قوسیں کھینچیں؛ رداس AB کی نصف لمبائی سے زیادہ ہونا چاہیے تاکہ قوسیں دونوں طرف مل سکیں۔ اوپر والے تقاطع کو P اور نیچے والے کو Q نام دیں۔ اب P اور Q کو سیدھی لکیر سے ملائیں۔ حاصل شدہ لکیر AB کو ایک نقطہ M پر کاٹے گی۔ چونکہ P سے A اور B تک فاصلے برابر ہیں اور Q سے بھی A اور B تک فاصلے برابر ہیں، اس لیے دونوں تقاطعی نقطے عمودی نصف کرنے والی لکیر پر آتے ہیں۔ نتیجتاً PMQ لکیر AB پر عمود ہے اور AM = MB؛ یوں M اس کا وسطی نقطہ ہے۔""",
['یکساں رداس اور نصف سے زیادہ شرط','دونوں سروں سے دو جانب قوسیں','بالائی و زیریں تقاطع','تقاطع ملانے کا مرحلہ','برابری اور عمودی نصف کرنے کی دلیل']),
'IX-PHY-UR-C09-L01':("""سائنسی تحقیق کا آغاز کسی مشاہدے یا سوال سے ہو سکتا ہے۔ محقق مشاہدات کی بنیاد پر ایک قابلِ آزمائش مفروضہ یعنی hypothesis قائم کرتا ہے، پھر اس کو پرکھنے کے لیے منظم تجربہ یا دوسرے مناسب طریقوں سے شواہد جمع کرتا ہے۔ تجربے میں متعلقہ عوامل کو جہاں ممکن ہو کنٹرول کرنا اور نتائج درست انداز سے درج کرنا ضروری ہوتا ہے۔ جمع شدہ اعداد و مشاہدات کی مدد سے یہ دیکھا جاتا ہے کہ مفروضے کو کس حد تک تائید یا تردید ملتی ہے۔ اگر نئے شواہد پہلے نتیجے سے مختلف ہوں تو وضاحت یا مفروضے میں ترمیم کی جاتی ہے۔ سائنسی علم اسی قابلِ جانچ، تنقیدی اور شواہد پر مبنی عمل سے مضبوط ہوتا ہے؛ یہ مراحل ہمیشہ ایک ہی سخت ترتیب تک محدود نہیں۔""",
['مشاہدہ اور سوال','قابلِ آزمائش مفروضہ','منظم تحقیق اور کنٹرول','شواہد سے منطقی نتیجہ','نئے شواہد پر نظرثانی'])}
CONSTITUTION_PRIMARY_EVIDENCE={
 'X-PAK-UR-C03-L01':[
  'https://na.gov.pk/en/content.php/content.php?id=75',
  'https://senate.gov.pk/en/essence.php?catid=4&cattitle=About&id=1098&subcatid=138']}
def original_module():
 p=ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py'
 spec=importlib.util.spec_from_file_location('revision_grade910_nontech15',p)
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 return m
def build(live,orig,risks,revmap,queue,*,answers=DATA):
 if len(answers)!=15 or len(set(answers))!=15:raise ValueError('EXACT_15_DISTINCT_ORIGINAL_ANSWERS_REQUIRED')
 if len(live)!=2411 or len(revmap)!=2411 or len(risks)!=604:raise ValueError('CURRENT_SCHOOL1_BANK_RISK_OR_REVISION_DRIFT')
 idx={r['id']:r for r in live}
 if len(idx)!=2411:raise ValueError('DUPLICATE_CURRENT_LIVE_QID')
 risks={r['questionId']:r for r in risks}
 original={r['questionId']:r for r in orig}
 queue={r['questionId']:r for r in queue}
 sha=hashlib.sha256
 packets={}
 counts=collections.Counter()
 result=[]
 for id,(answer,rubric) in answers.items():
  actual=idx.get(id);r=original.get(id);risk=risks.get(id);pending=queue.get(id)
  if any(z is None for z in (actual,r,risk,pending)):raise ValueError('ORIGINAL_UNLINKED_HIGH_REVISION_NOT_FOUND_'+id)
  filename=r['sourceFile'];f=SEED/filename
  if not f.exists() or f.is_symlink() or sha(f.read_bytes()).hexdigest()!=r['originalResearchFileSha256']:
   raise ValueError('EXACT_FROZEN_SOURCE_DOCUMENT_BYTES_CHANGED_'+id)
  if filename not in packets:
   packets[filename]={row['id']:row for row in json.loads(f.read_text())['drafts']}
  frozen=packets[filename].get(id)
  grade=actual['grade'];subject=actual['subject'];medium=actual['medium'];typ=actual['type']
  lang='ur' if medium=='Urdu' else 'en'
  c=frozen.get('content',{}).get(lang,{}) if frozen else {}
  if (grade not in ('9th','10th') or subject not in ('Pakistan Studies','Mathematics','Physics','Urdu')
      or typ not in ('long','essay') or actual['marks']!=5
      or c.get('stem')!=actual['questionText'] or c.get('answer')!=actual['answer']
      or frozen.get('marks')!=actual['marks'] or frozen.get('type')!=typ
      or risk['priority']!='HIGH' or risk['grade']!=grade
      or risk['medium']!=medium or risk['subject']!=subject
      or risk['currentLiveContentRevisionSha256']!=revmap[id]
      or pending['currentLiveRevisionSha256']!=revmap[id]
      or pending.get('academicallySelectable') is not False
      or pending.get('schoolStreamApplicability')!='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'):
   raise ValueError('FROZEN_ORIGINAL_LIVE_CURRENT_ACADEMIC_REVIEW_NOT_BOUND_'+id)
  if (not isinstance(answer,str) or not 65<=len(answer.split())<=190
      or len(rubric)!=5 or any(not isinstance(v,str) or len(v.strip())<12 for v in rubric)
      or any('http' in v for v in rubric)
      or not (id.startswith('IX-') or id.startswith('X-'))):
   raise ValueError('UNSAFE_OR_SHALLOW_5_MARK_ORIGINAL_ANSWER_'+id)
  counts[(grade,subject,medium,typ)]+=1
  result.append({
   'questionId':id,'grade':grade,'subject':subject,'medium':medium,'questionType':typ,
   'marks':actual['marks'],'originalAuthoredQuestionType':frozen['type'],
   'originalResearchSourceFile':filename,'originalResearchFileSHA256':r['originalResearchFileSha256'],
   'currentLiveFullRevisionSha256':revmap[id],
   'independentOriginalIllustrativeExemplarNotUniqueModelKey':answer,
   'fivePointReviewRubricNotApprovedAnswerKey':rubric,
   'alternateAccurateStudentAnswersPermitted':True,
   'referenceFactCheckOfficialParliamentaryLinks':CONSTITUTION_PRIMARY_EVIDENCE.get(id,[]),
   'sourceCatalogReferenceIsNotSchoolBookAdoption':r.get('sourceCatalogId'),
   'school2026To2027BookAdoptionAuthenticated':False,
   'specificPrintedTextbookExercisePageAuthenticated':False,
   'qualifiedSubjectIndependentTeacherApproval':False,
   'qualifiedUrduLanguageTeacherApproval':False,
   'academicApproved':False,'paperStudioVerifiedSelectable':False,
   'productionSchoolQuestionDatabaseWrites':0})
 if counts!=collections.Counter({
  ('10th','Pakistan Studies','Urdu','long'):7,
  ('10th','Urdu','Urdu','essay'):2,
  ('9th','Urdu','Urdu','essay'):2,
  ('9th','Mathematics','english','long'):1,
  ('9th','Mathematics','Urdu','long'):2,
  ('9th','Physics','Urdu','long'):1}):
  raise ValueError('UNAUTHORIZED_HIGH_PRIORITY_GRADE_SUBJECT_COHORT')
 result.sort(key=lambda x:x['questionId'])
 return {'schema':'ASSPS_GRADE910_15_CONVENTIONAL_HIGH_UNAPPROVED_ORIGINAL_EXEMPLARS_V1',
  'candidateCount':15,'linkedCurrentSchool1QuestionRevisions':15,
  'sourceSchool1LiveRecordsReadOnly':2411,
  'originalSubjectsAndGrades':dict(sorted((str(k),v) for k,v in counts.items())),
  'highPriorityNewExplanationsNotSchoolApproved':15,
  'preserveExistingApprovedQuestionIdsCount':0,
  'independentQualifiedSubjectApprovalCount':0,'actualSchoolTextbookAdoptionVerified':False,
  'originalExercisePageVerified':False,
  'paperStudioVerifiedPublication':False,'productionDatabaseWrites':0,
  'answers':result}
def run():
 m=original_module();live=m.read_live()
 revmap={r['questionId']:r['revisionSha256'] for r in json.loads((STATE/'live-question-revisions.json').read_text())['records']}
 original=json.loads(PUBLIC.read_text())['rows']
 risks=json.loads((STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']
 queue=json.loads((STATE/'live-existing-answer-proposal-crosswalk-20261016.json').read_text())['unlinkedCurrentRevisionResearchQueue']
 # The original backlog is historical; after linking the 15 explanations the current
 # 372-item queue deliberately excludes them. Reconstruct their *review metadata*
 # only from immutable current risk/revision evidence, not any approval record.
 known={row['questionId'] for row in queue}
 riskindex={r['questionId']:r for r in risks}
 for id in DATA:
  if id not in known:
   prior=riskindex.get(id)
   if prior is None or prior['priority']!='HIGH' or prior['currentLiveContentRevisionSha256']!=revmap.get(id):
    raise ValueError('NO_CURRENT_UNAPPROVED_HIGH_RESEARCH_REVISION_FOR_'+id)
   queue.append({'questionId':id,'currentLiveRevisionSha256':revmap[id],
                 'academicallySelectable':False,
                 'schoolStreamApplicability':'SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'})
 for r in live:
  if r['id'] in DATA and m.revision_sha(r)!=revmap.get(r['id']):
   raise ValueError('QUESTION_FULL_REVISION_CHANGED_RE_REVIEW_REQUIRED_'+r['id'])
 return build(live,original,risks,revmap,queue)
def main():
 value=run();s=json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
 if sys.argv[1:]==['--check']:
  if not OUT.exists() or OUT.read_text()!=s:
   raise ValueError('CONVENTIONAL_15_ORIGINAL_EXEMPLARS_STALE')
  print('15_URDU_SOCIALSTUDIES_MATH_PHYSICS_CURRENT_REVISION_ORIGINAL_ONLY_NO_APPROVAL')
 elif len(sys.argv)==1:
  OUT.write_text(s)
  print('15_CONVENTIONAL_HIGH_RESEARCH_CANDIDATES_WRITTEN_NO_APPROVAL')
 else:raise ValueError('ONLY_NO_ARG_OR_CHECK')
if __name__=='__main__':main()
