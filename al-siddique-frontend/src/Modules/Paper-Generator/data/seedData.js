// seedData.js — Pakistan SNC Curriculum Sample Questions
// Injected once into localStorage when question bank is empty.

const NOW = '2026-01-01T00:00:00.000Z'

//  Subjects 
export const SEED_SUBJECTS = [
 { id: 'ss_math5', name: 'Mathematics', nameUrdu: 'ریاضی', publisher: 'SNC', classLevel: '5', cover: null, createdAt: NOW },
 { id: 'ss_eng5', name: 'English', nameUrdu: 'انگریزی', publisher: 'SNC', classLevel: '5', cover: null, createdAt: NOW },
 { id: 'ss_sci5', name: 'Science', nameUrdu: 'سائنس', publisher: 'SNC', classLevel: '5', cover: null, createdAt: NOW },
 { id: 'ss_urdu5', name: 'Urdu', nameUrdu: 'اردو', publisher: 'SNC', classLevel: '5', cover: null, createdAt: NOW },
 { id: 'ss_math8', name: 'Mathematics', nameUrdu: 'ریاضی', publisher: 'SNC', classLevel: '8', cover: null, createdAt: NOW },
 { id: 'ss_eng8', name: 'English', nameUrdu: 'انگریزی', publisher: 'SNC', classLevel: '8', cover: null, createdAt: NOW },
 { id: 'ss_urdu9', name: 'Urdu', nameUrdu: 'اردو', publisher: 'Punjab Board', classLevel: '9', cover: null, createdAt: NOW },
 { id: 'ss_math10', name: 'Mathematics', nameUrdu: 'ریاضی', publisher: 'SNC', classLevel: '10', cover: null, createdAt: NOW },
 { id: 'ss_phy10', name: 'Physics', nameUrdu: 'طبیعیات', publisher: 'SNC', classLevel: '10', cover: null, createdAt: NOW },
 { id: 'ss_chem10', name: 'Chemistry', nameUrdu: 'کیمیا', publisher: 'Punjab Board', classLevel: '10', cover: null, createdAt: NOW },
 { id: 'ss_isl5', name: 'Islamic Studies', nameUrdu: 'اسلامیات', publisher: 'SNC', classLevel: '5', cover: null, createdAt: NOW },
]

//  Questions 
let _id = 1
const q = (subjectId, type, text, textUrdu, opts, answer, marks, chapter, priority = 'exercise', extra = {}) => ({
 id: `qs_${_id++}`,
 subjectId, type, text, textUrdu,
 options: opts || [],
 answer: answer || '',
 marks: Number(marks) || 1,
 chapter, priority,
 structuredData: null,
 leftColumn: [],
 rightColumn: [],
 ...extra,
 createdAt: NOW,
})
const mcq = (sid, text, textUrdu, a, b, c, d, ans, chap, pri) => q(sid, 'mcq', text, textUrdu, [
 { label: 'A', text: a, textUrdu: '' },
 { label: 'B', text: b, textUrdu: '' },
 { label: 'C', text: c, textUrdu: '' },
 { label: 'D', text: d, textUrdu: '' },
], ans, 1, chap, pri)
const short = (sid, text, textUrdu, chap, marks = 2, pri = 'exercise') => q(sid, 'short', text, textUrdu, [], '', marks, chap, pri)
const long = (sid, text, textUrdu, chap, marks = 5, pri = 'exercise') => q(sid, 'long', text, textUrdu, [], '', marks, chap, pri)
const fill = (sid, textUrdu, ans, chap, marks = 1, pri = 'exercise') => q(sid, 'fill', '', textUrdu, [], ans, marks, chap, pri)
const tf = (sid, textUrdu, ans, chap, marks = 1, pri = 'exercise') => q(sid, 'true_false', '', textUrdu, [], ans, marks, chap, pri)
const defn = (sid, textUrdu, ans, chap, marks = 2, pri = 'exercise') => q(sid, 'definition', '', textUrdu, [], ans, marks, chap, pri)
const cols = (sid, chap, left, right, marks = 3, pri = 'exercise') => q(sid, 'columns', '', '', [], '', marks, chap, pri, { leftColumn: left, rightColumn: right })
const mutradif = (sid, word, ans, chap, pri = 'exercise') => q(sid, 'mutradif', '', word, [], ans, 2, chap, pri)
const mutzad = (sid, word, ans, chap, pri = 'exercise') => q(sid, 'mutzad', '', word, [], ans, 2, chap, pri)
const alfaz = (sid, word, ans, chap, pri = 'exercise') => q(sid, 'alfaz_maani', '', word, [], ans, 2, chap, pri)
const scorr = (sid, wrongSent, correctSent, chap, pri = 'exercise') => q(sid, 'sentence_correction', '', wrongSent, [], correctSent, 2, chap, pri)
const muhawara = (sid, idiom, meaning, chap, pri = 'exercise') => q(sid, 'muhawara', '', idiom, [], meaning, 3, chap, pri)
const translation = (sid, srcText, ans, chap, marks = 3, pri = 'exercise') => q(sid, 'translation', srcText, '', [], ans, marks, chap, pri)
const essay = (sid, topic, chap, marks = 15, pri = 'exercise') => q(sid, 'essay', '', topic, [], '', marks, chap, pri)
const letter = (sid, topic, chap, marks = 10, pri = 'exercise') => q(sid, 'letter', '', topic, [], '', marks, chap, pri)
const grammar_q = (sid, textUrdu, ans, chap, marks = 2, pri = 'exercise') => q(sid, 'grammar', '', textUrdu, [], ans, marks, chap, pri)
const wahid_jama = (sid, pairs, chap, marks = 3, pri = 'exercise') => q(sid, 'wahid_jama', '', '', [], '', marks, chap, pri, { structuredData: { pairs } })
const sent_usage = (sid, items, chap, marks = 3, pri = 'exercise') => q(sid, 'sentence_usage', '', '', [], '', marks, chap, pri, { structuredData: { items } })
const comp = (sid, passage, questions, chap, marks = 10, pri = 'exercise') => q(sid, 'comprehension', '', passage, [], '', marks, chap, pri, { structuredData: { questions } })
const numerical_q = (sid, textUrdu, formula, given, steps, ans, chap, marks = 3, pri = 'exercise') => q(sid, 'numerical', '', textUrdu, [], ans, marks, chap, pri, { structuredData: { formula, given, steps } })
const diagram_q = (sid, textUrdu, labels, instruction, chap, marks = 5, pri = 'exercise') => q(sid, 'diagram', '', textUrdu, [], '', marks, chap, pri, { structuredData: { labels, instruction } })

export const SEED_QUESTIONS = [

 // 
 // MATHEMATICS — CLASS 5
 // 

 // Chapter: Fractions
 mcq('ss_math5','What is 1/2 + 1/4?','½ + ¼ = ?','3/4','1/4','1/6','2/3','A','Fractions','exercise'),
 mcq('ss_math5','Which fraction is equivalent to 2/4?','2/4 کے برابر کون سی کسر ہے؟','1/2','1/4','3/4','1/3','A','Fractions','exercise'),
 mcq('ss_math5','What is 3/5 of 25?','25 کا 3/5 کیا ہے؟','15','10','20','12','A','Fractions','exercise'),
 mcq('ss_math5','3/4 - 1/4 = ?','3/4 - 1/4 = ?','1/2','2/4','1','3/8','A','Fractions','exercise'),
 mcq('ss_math5','Which is the largest fraction: 1/2, 1/3, 1/4, 1/6?','سب سے بڑی کسر کون سی ہے؟','1/2','1/3','1/4','1/6','A','Fractions','exercise'),
 mcq('ss_math5','A proper fraction has numerator:','مناسب کسر میں صورہ ہوتا ہے:','less than denominator','equal to denominator','greater than denominator','zero','A','Fractions','exercise'),
 short('ss_math5','Add 2/5 and 3/10. Write your working.','2/5 اور 3/10 جمع کریں۔ حل لکھیں۔','Fractions',2,'exercise'),
 short('ss_math5','Arrange these fractions in ascending order: 3/4, 1/2, 2/3, 1/4','ان کسروں کو چھوٹے سے بڑے ترتیب میں لکھیں: 3/4، 1/2، 2/3، 1/4','Fractions',2,'exercise'),
 short('ss_math5','A pizza is cut into 8 equal slices. Ali ate 3 slices. What fraction did he eat?','پیزا 8 برابر ٹکڑوں میں کاٹا گیا۔ علی نے 3 ٹکڑے کھائے۔ اس نے کتنا حصہ کھایا؟','Fractions',2,'exercise'),
 long('ss_math5','Explain the difference between proper, improper and mixed fractions with two examples each. Then solve: 2¼ + 1½','صحیح، غیر صحیح اور ملی کسر کا فرق دو مثالوں سے بیان کریں۔ پھر حل کریں: 2¼ + 1½','Fractions',5,'exercise'),

 // Chapter: Decimals
 mcq('ss_math5','0.5 is equal to:','0.5 برابر ہے:','1/2','1/4','1/5','5/100','A','Decimals','exercise'),
 mcq('ss_math5','What is 1.25 + 2.75?','1.25 + 2.75 = ?','4.00','3.00','4.50','3.50','A','Decimals','exercise'),
 mcq('ss_math5','Which decimal is greatest: 0.3, 0.03, 0.30, 0.003?','سب سے بڑا عشاریہ کون سا ہے؟','0.3','0.03','0.003','0.30','A','Decimals','exercise'),
 mcq('ss_math5','5.6 × 10 = ?','5.6 × 10 = ?','56','0.56','5.60','560','A','Decimals','past'),
 short('ss_math5','Convert 3/4 to decimal. Show your method.','3/4 کو عشاریہ میں بدلیں۔ طریقہ لکھیں۔','Decimals',2,'exercise'),
 short('ss_math5','A shopkeeper sold cloth for Rs. 125.50. He received Rs. 200. Find the change.','دکاندار نے کپڑا 125.50 روپے میں بیچا۔ اسے 200 روپے ملے۔ واپسی رقم نکالیں۔','Decimals',2,'exercise'),
 long('ss_math5','Solve: (a) 12.5 × 4.2 (b) 36.8 ÷ 8 (c) Round 7.456 to the nearest tenth','حل کریں: (a) 12.5 × 4.2 (b) 36.8 ÷ 8 (c) 7.456 کو قریبی دسواں حصہ تک پورا کریں','Decimals',5,'exercise'),

 // Chapter: Multiplication & Division
 mcq('ss_math5','456 × 12 = ?','456 × 12 = ?','5472','5270','4572','5742','A','Multiplication','exercise'),
 mcq('ss_math5','840 ÷ 24 = ?','840 ÷ 24 = ?','35','30','40','45','A','Division','exercise'),
 mcq('ss_math5','What is the product of 25 and 40?','25 اور 40 کا حاصل ضرب کیا ہے؟','1000','800','900','1200','A','Multiplication','exercise'),
 mcq('ss_math5','If 7 × __ = 63, what is the missing number?','7 × __ = 63, لاپتہ نمبر کیا ہے؟','9','7','8','6','A','Multiplication','exercise'),
 short('ss_math5','A school has 48 students in each class. There are 12 classes. How many students are there in total?','ایک اسکول میں ہر کلاس میں 48 طلبہ ہیں۔ 12 کلاسیں ہیں۔ کل طلبہ کتنے ہیں؟','Multiplication',2,'exercise'),
 short('ss_math5','Divide 1260 equally among 36 students. How much does each get?','1260 کو 36 طلبہ میں برابر تقسیم کریں۔ ہر ایک کو کتنا ملے گا؟','Division',2,'exercise'),
 long('ss_math5','A factory produces 1250 items per day. (a) How many items in 28 days? (b) If packed in boxes of 25, how many boxes needed?','ایک فیکٹری روزانہ 1250 اشیاء بناتی ہے۔ (a) 28 دنوں میں کتنی اشیاء؟ (b) 25 کے ڈبوں میں بھریں تو کتنے ڈبے چاہئیں؟','Multiplication',5,'exercise'),

 // 
 // ENGLISH — CLASS 5
 // 

 // Chapter: Grammar
 mcq('ss_eng5','Which word is a noun?','کون سا لفظ اسم ہے؟','Happiness','Run','Quickly','Beautiful','A','Grammar','exercise'),
 mcq('ss_eng5','Choose the correct article: __ apple a day keeps the doctor away.','صحیح آرٹیکل چنیں:','An','A','The','No article','A','Grammar','exercise'),
 mcq('ss_eng5','The plural of "child" is:','"child" کی جمع ہے:','Children','Childs','Childes','Childrens','A','Grammar','exercise'),
 mcq('ss_eng5','Which sentence is in Past Tense?','کون سا جملہ ماضی میں ہے؟','She went to school.','She goes to school.','She will go to school.','She is going to school.','A','Grammar','exercise'),
 mcq('ss_eng5','Choose the correct verb: The boys __ playing cricket.','صحیح فعل چنیں:','are','is','was','am','A','Grammar','exercise'),
 mcq('ss_eng5','An adjective describes a:','صفت بیان کرتی ہے:','noun','verb','adverb','conjunction','A','Grammar','exercise'),
 mcq('ss_eng5','The opposite of "beautiful" is:','"beautiful" کی ضد:','ugly','pretty','handsome','fair','A','Grammar','past'),
 short('ss_eng5','Write four sentences using the verb "have" in present, past, future, and present continuous tenses.','فعل "have" کو حال، ماضی، مستقبل اور جاری حال میں چار جملوں میں استعمال کریں۔','Grammar',2,'exercise'),
 short('ss_eng5','Underline the adjectives in these sentences: (a) The tall boy won the prize. (b) She has a beautiful house.','ان جملوں میں صفات کو خط کشی کریں۔','Grammar',2,'exercise'),
 short('ss_eng5','Write the plural of: ox, mouse, leaf, tooth, man','ان کی جمع لکھیں: ox, mouse, leaf, tooth, man','Grammar',2,'exercise'),
 long('ss_eng5','Write a paragraph of 8-10 sentences describing your school. Use at least 5 different adjectives and both past and present tenses.','اپنے اسکول کے بارے میں 8-10 جملوں کا پیراگراف لکھیں۔ کم از کم 5 صفات اور ماضی و حال دونوں زمانے استعمال کریں۔','Grammar',5,'exercise'),

 // Chapter: Comprehension
 mcq('ss_eng5','What does "comprehension" mean?','"comprehension" کا مطلب ہے:','understanding','writing','speaking','listening','A','Comprehension','exercise'),
 mcq('ss_eng5','A synonym of "brave" is:','"brave" کا ہم معنی:','courageous','coward','weak','fearful','A','Comprehension','exercise'),
 short('ss_eng5','Read the passage and answer: "Pakistan is a country in South Asia. It was founded in 1947. Its capital is Islamabad." — When was Pakistan founded?','گزرے ہوئے اقتباس کو پڑھ کر جواب دیں: پاکستان کب بنا؟','Comprehension',2,'exercise'),
 long('ss_eng5','Write a story of 10 sentences about a brave student who saved a friend from danger. Use dialogue in your story.','ایک بہادر طالب علم کے بارے میں 10 جملوں کی کہانی لکھیں جس نے دوست کو خطرے سے بچایا۔ مکالمہ استعمال کریں۔','Comprehension',5,'exercise'),

 // 
 // SCIENCE — CLASS 5
 // 

 mcq('ss_sci5','Which gas do plants absorb during photosynthesis?','پودے فوٹو سنتھیسز میں کون سی گیس جذب کرتے ہیں؟','Carbon dioxide','Oxygen','Nitrogen','Hydrogen','A','Plants','exercise'),
 mcq('ss_sci5','The process by which plants make their own food is called:','پودے اپنی خوراک بنانے کا عمل کہلاتا ہے:','Photosynthesis','Respiration','Digestion','Reproduction','A','Plants','exercise'),
 mcq('ss_sci5','Which part of the plant absorbs water from the soil?','پودے کا کون سا حصہ مٹی سے پانی جذب کرتا ہے؟','Roots','Leaves','Stem','Flowers','A','Plants','exercise'),
 mcq('ss_sci5','Water boils at:','پانی ابلتا ہے:','100°C','0°C','37°C','50°C','A','Matter','exercise'),
 mcq('ss_sci5','Which of these is a conductor of electricity?','کون سا بجلی کا موصل ہے؟','Copper','Wood','Plastic','Rubber','A','Matter','exercise'),
 mcq('ss_sci5','The heart pumps blood to:','دل خون پمپ کرتا ہے:','the whole body','only the brain','only the lungs','only the stomach','A','Animals','exercise'),
 mcq('ss_sci5','Which organ helps in breathing?','سانس لینے میں کون سا عضو مدد کرتا ہے؟','Lungs','Heart','Liver','Kidneys','A','Animals','exercise'),
 mcq('ss_sci5','Sound travels fastest through:','آواز سب سے تیز سفر کرتی ہے:','Solids','Liquids','Gases','Vacuum','A','Matter','past'),
 short('ss_sci5','What are the three states of matter? Give one example of each.','مادے کی تین حالتیں کیا ہیں؟ ہر ایک کی مثال دیں۔','Matter',2,'exercise'),
 short('ss_sci5','Explain how a plant makes its food through photosynthesis.','فوٹو سنتھیسز کے ذریعے پودا کیسے خوراک بناتا ہے؟ بیان کریں۔','Plants',2,'exercise'),
 short('ss_sci5','Name the main organs of the digestive system in order.','نظامِ ہضم کے اہم اعضاء ترتیب سے لکھیں۔','Animals',2,'exercise'),
 long('ss_sci5','Describe the water cycle in detail. Draw a labeled diagram and explain each stage: evaporation, condensation, precipitation, and collection.','آبی چکر کو تفصیل سے بیان کریں۔ ایک لیبل لگا خاکہ بنائیں اور ہر مرحلہ سمجھائیں: بخارات، کثافت، بارش، اور جمع۔','Matter',5,'exercise'),
 long('ss_sci5','Compare the life cycle of a butterfly and a frog. Write at least 4 stages for each with explanation.','تتلی اور مینڈک کا جیون چکر موازنہ کریں۔ ہر ایک کے کم از کم 4 مراحل وضاحت کے ساتھ لکھیں۔','Animals',5,'exercise'),

 // 
 // URDU — CLASS 5
 // 

 mcq('ss_urdu5','اسم کی کتنی اقسام ہیں؟','','تین','دو','چار','پانچ','A','قواعد','exercise'),
 mcq('ss_urdu5','فعل ماضی کی مثال کون سی ہے؟','','وہ گیا','وہ جاتا ہے','وہ جائے گا','وہ جا رہا ہے','A','قواعد','exercise'),
 mcq('ss_urdu5','"سورج" کا مترادف کون سا ہے؟','','"آفتاب"','"چاند"','"ستارہ"','"بادل"','A','الفاظ','exercise'),
 mcq('ss_urdu5','واحد "کتاب" کی جمع کیا ہے؟','','کتابیں','کتابوں','کتابیں','کتابی','A','قواعد','exercise'),
 mcq('ss_urdu5','ضمیر کسے کہتے ہیں؟','','اسم کی جگہ آنے والا لفظ','فعل کی جگہ آنے والا لفظ','صفت کی جگہ آنے والا لفظ','حرف کی جگہ آنے والا لفظ','A','قواعد','exercise'),
 mcq('ss_urdu5','خط کا اختتام کیسے ہوتا ہے؟','','دستخط سے','عنوان سے','تاریخ سے','موضوع سے','A','خط نویسی','exercise'),
 short('ss_urdu5','درج ذیل الفاظ کے مترادف لکھیں: پانی، آگ، دل، گھر','','الفاظ',2,'exercise'),
 short('ss_urdu5','کوئی پانچ جملے لکھیں جن میں اسم، فعل اور صفت استعمال ہو۔','','قواعد',2,'exercise'),
 short('ss_urdu5','اپنے والدین کو خط لکھیں جس میں اسکول کی خوشیوں کا ذکر ہو۔ (مختصر)','','خط نویسی',3,'exercise'),
 long('ss_urdu5','موضوع "میرا پیارا وطن پاکستان" پر 10 جملوں کی تقریر لکھیں۔ مقدمہ، موضوع اور خاتمہ ضرور شامل کریں۔','','تحریر',5,'exercise'),
 long('ss_urdu5','مندرجہ ذیل موضوع پر مضمون لکھیں: "سادہ زندگی بہترین زندگی" — کم از کم تین پیراگراف لازمی لکھیں۔','','تحریر',5,'exercise'),

 // 
 // MATHEMATICS — CLASS 8
 // 

 mcq('ss_math8','If x + 5 = 12, then x = ?','','7','17','6','8','A','Algebra','exercise'),
 mcq('ss_math8','2x - 3 = 7, then x = ?','','5','2','4','6','A','Algebra','exercise'),
 mcq('ss_math8','What is the area of a square with side 9 cm?','9 سینٹی میٹر سائیڈ کا مربع کا رقبہ؟','81 cm²','36 cm²','18 cm²','45 cm²','A','Geometry','exercise'),
 mcq('ss_math8','The sum of angles in a triangle is:','مثلث کے زاویوں کا مجموعہ:','180°','360°','90°','270°','A','Geometry','exercise'),
 mcq('ss_math8','In a right-angled triangle with legs 3 and 4, the hypotenuse is:','3 اور 4 والے قائم الزاویہ مثلث کا وتر:','5','7','6','8','A','Pythagoras','exercise'),
 mcq('ss_math8','Simplify: 3(x + 4) - 2x','','x + 12','5x + 12','x - 12','x + 4','A','Algebra','exercise'),
 mcq('ss_math8','A circle with radius 7 cm has area: (π = 22/7)','','154 cm²','44 cm²','49 cm²','22 cm²','A','Geometry','exercise'),
 mcq('ss_math8','LCM of 12 and 18 is:','12 اور 18 کا LCM:','36','24','72','18','A','Algebra','exercise'),
 mcq('ss_math8','If 5% of x = 20, then x = ?','','400','100','200','500','A','Percentage','past'),
 mcq('ss_math8','A rectangle has length 8 m and width 5 m. Its perimeter is:','','26 m','40 m','13 m','80 m','A','Geometry','exercise'),
 short('ss_math8','Solve: 3x + 7 = 22. Show all steps.','حل کریں: 3x + 7 = 22۔ تمام مراحل لکھیں۔','Algebra',2,'exercise'),
 short('ss_math8','Find the area and perimeter of a rectangle with length 15 cm and width 8 cm.','15 سینٹی میٹر لمبا اور 8 سینٹی میٹر چوڑا مستطیل کا رقبہ اور محیط نکالیں۔','Geometry',2,'exercise'),
 short('ss_math8','A shopkeeper bought goods for Rs. 4500 and sold for Rs. 5400. Find profit and profit percentage.','دکاندار نے 4500 روپے میں خریدا اور 5400 میں بیچا۔ نفع اور نفع فیصد نکالیں۔','Percentage',3,'exercise'),
 short('ss_math8','State Pythagoras theorem and verify it for a triangle with sides 5, 12, 13.','فیثاغورث قضیہ بیان کریں اور 5، 12، 13 سائیڈوں والے مثلث کے لیے ثابت کریں۔','Pythagoras',3,'exercise'),
 long('ss_math8','Solve these simultaneous equations: 2x + 3y = 13 and x - y = 1. Check your answer.','یہ بیک وقت مساوات حل کریں: 2x + 3y = 13 اور x - y = 1۔ جواب جانچیں۔','Algebra',5,'exercise'),
 long('ss_math8','The length of a rectangular field is twice its width. Its area is 288 m². Find length, width and perimeter.','ایک مستطیل کھیت کی لمبائی چوڑائی سے دگنی ہے۔ رقبہ 288 مربع میٹر ہے۔ لمبائی، چوڑائی اور محیط نکالیں۔','Geometry',5,'exercise'),
 long('ss_math8','A class of 40 students got these scores in a test (out of 50): 45,42,38,50,35,40,28,48,30,45,42,38,50,35,40,28,48,30,45,40. Calculate mean, median, and mode.','40 طلبہ کے نمبر: اوسط، وسطی اور کثیر نکالیں۔','Statistics',5,'past'),

 // 
 // ENGLISH — CLASS 8
 // 

 mcq('ss_eng8','The passive voice of "She writes a letter" is:','','A letter is written by her.','A letter was written by her.','A letter will be written by her.','A letter has been written by her.','A','Grammar','exercise'),
 mcq('ss_eng8','Choose the correct form: He has been reading __ two hours.','','for','since','from','during','A','Grammar','exercise'),
 mcq('ss_eng8','A word that joins clauses is called:','','Conjunction','Preposition','Interjection','Adverb','A','Grammar','exercise'),
 mcq('ss_eng8','The synonym of "enormous" is:','','"huge"','"tiny"','"average"','"ordinary"','A','Vocabulary','exercise'),
 mcq('ss_eng8','Which sentence contains a relative clause?','','The man who came yesterday is my uncle.','He is tall and handsome.','She sings and dances.','They ran but could not win.','A','Grammar','exercise'),
 short('ss_eng8','Change these sentences to passive voice: (a) The teacher corrects the papers. (b) They built this bridge in 2010.','ان جملوں کو مجہول میں بدلیں۔','Grammar',2,'exercise'),
 short('ss_eng8','Write an application to your Principal requesting three days leave for a family function.','خاندانی تقریب کے لیے تین دن کی چھٹی کے لیے پرنسپل کو درخواست لکھیں۔','Writing',3,'exercise'),
 long('ss_eng8','Write a letter to your friend describing your visit to a historical place. Include: where you went, what you saw, what you learned, and your experience (minimum 12 sentences).','کسی تاریخی جگہ کے سفر کے بارے میں دوست کو خط لکھیں۔ 12 جملے لازمی لکھیں۔','Writing',5,'exercise'),
 long('ss_eng8','Write an essay on "Importance of Education" with introduction, three body paragraphs and conclusion (minimum 15 sentences).','تعلیم کی اہمیت پر مضمون لکھیں جس میں مقدمہ، تین پیراگراف اور نتیجہ ہو۔ کم از کم 15 جملے۔','Writing',5,'exercise'),

 // 
 // MATHEMATICS — CLASS 10
 // 

 mcq('ss_math10','The roots of x² - 5x + 6 = 0 are:','x² - 5x + 6 = 0 کی جڑیں:','2 and 3','1 and 6','-2 and -3','4 and 1','A','Quadratic Equations','exercise'),
 mcq('ss_math10','For ax² + bx + c = 0, discriminant = 0 means:','ججبہ = 0 کا مطلب:','Two equal real roots','No real roots','Two different real roots','Complex roots','A','Quadratic Equations','exercise'),
 mcq('ss_math10','sin 30° = ?','sin 30° = ?','1/2','√3/2','1/√2','1','A','Trigonometry','exercise'),
 mcq('ss_math10','cos 60° = ?','cos 60° = ?','1/2','√3/2','0','1','A','Trigonometry','exercise'),
 mcq('ss_math10','If tan θ = 1, then θ = ?','','45°','30°','60°','90°','A','Trigonometry','exercise'),
 mcq('ss_math10','sin²θ + cos²θ = ?','','1','0','2','sinθ cosθ','A','Trigonometry','exercise'),
 mcq('ss_math10','The formula for quadratic roots is:','','x = (-b ± √(b²-4ac)) / 2a','x = (b ± √(b²-4ac)) / 2a','x = (-b ± √(b²+4ac)) / 2a','x = b / 2a','A','Quadratic Equations','exercise'),
 mcq('ss_math10','log 100 = ?','log 100 = ?','2','10','1','100','A','Logarithms','exercise'),
 mcq('ss_math10','log (m × n) = ?','','log m + log n','log m - log n','log m × log n','log m / log n','A','Logarithms','exercise'),
 mcq('ss_math10','A matrix with equal rows and columns is called:','','Square matrix','Row matrix','Column matrix','Zero matrix','A','Matrices','exercise'),
 mcq('ss_math10','If A = [1 2; 3 4], det(A) = ?','','−2','2','10','0','A','Matrices','exercise'),
 mcq('ss_math10','The value of n! (factorial) for n=5 is:','','120','24','60','720','A','Permutation','past'),
 short('ss_math10','Solve by factorization: x² + 7x + 12 = 0','فیکٹرائزیشن سے حل کریں: x² + 7x + 12 = 0','Quadratic Equations',2,'exercise'),
 short('ss_math10','Prove that sin²θ + cos²θ = 1','ثابت کریں: sin²θ + cos²θ = 1','Trigonometry',3,'exercise'),
 short('ss_math10','Evaluate: log 8 + log 125 − log 10 (without calculator)','لوگارتھم: log 8 + log 125 − log 10','Logarithms',3,'exercise'),
 short('ss_math10','Find the value of x: log₂(x) = 5','لوگارتھم حل کریں: log₂(x) = 5','Logarithms',2,'exercise'),
 short('ss_math10','A ladder 10m long leans against a wall. It makes 60° with the ground. Find the height on wall. (sin60° = √3/2)','10 میٹر سیڑھی دیوار سے 60° پر جھکی ہے۔ دیوار پر اونچائی نکالیں۔','Trigonometry',3,'exercise'),
 long('ss_math10','Solve the quadratic equation 2x² − 7x + 3 = 0 using (a) factorization (b) quadratic formula. Compare both results.','2x² − 7x + 3 = 0 کو (a) فیکٹرائزیشن (b) کوڈریٹک فارمولا سے حل کریں۔ نتائج موازنہ کریں۔','Quadratic Equations',8,'exercise'),
 long('ss_math10','From a point 50m away from a building, the angle of elevation of its top is 60°. Find the height of the building. Also find distance from top of building to observation point. (tan60° = √3, sin60° = √3/2)','50 میٹر دور سے عمارت کا زاویہ ارتفاع 60° ہے۔ عمارت کی اونچائی نکالیں۔','Trigonometry',8,'exercise'),
 long('ss_math10','If A = [2 1; 3 4] and B = [1 0; 2 3], find: (a) A + B (b) A × B (c) det(A) and det(B)','میٹرکس حساب: A + B، A × B، اور det(A) اور det(B) نکالیں۔','Matrices',8,'exercise'),

 // 
 // PHYSICS — CLASS 10
 // 

 mcq('ss_phy10','Newton\'s First Law is also called:','نیوٹن کا پہلا قانون کہلاتا ہے:','Law of Inertia','Law of Momentum','Law of Gravity','Law of Action','A','Newton\'s Laws','exercise'),
 mcq('ss_phy10','F = ma is Newton\'s:','F = ma نیوٹن کا:','Second Law','First Law','Third Law','Law of Gravity','A','Newton\'s Laws','exercise'),
 mcq('ss_phy10','The SI unit of force is:','قوت کی SI اکائی:','Newton','Joule','Watt','Pascal','A','Newton\'s Laws','exercise'),
 mcq('ss_phy10','Work = Force × ?','','Displacement','Time','Mass','Velocity','A','Work & Energy','exercise'),
 mcq('ss_phy10','The unit of power is:','طاقت کی اکائی:','Watt','Newton','Joule','Pascal','A','Work & Energy','exercise'),
 mcq('ss_phy10','Kinetic energy = ?','','½mv²','mv','mgh','mv²','A','Work & Energy','exercise'),
 mcq('ss_phy10','Speed of light in vacuum is approximately:','','3 × 10⁸ m/s','3 × 10⁶ m/s','3 × 10¹⁰ m/s','3 × 10⁴ m/s','A','Light','exercise'),
 mcq('ss_phy10','Which of these is not a vector quantity?','','Speed','Velocity','Force','Acceleration','A','Motion','exercise'),
 mcq('ss_phy10','Ohm\'s Law: V = ?','','IR','I/R','I²R','P/I','A','Electricity','exercise'),
 mcq('ss_phy10','The half-life of Carbon-14 is approximately:','','5730 years','1000 years','10000 years','500 years','A','Nuclear Physics','past'),
 short('ss_phy10','State Newton\'s three laws of motion with one example each.','نیوٹن کے حرکت کے تین قوانین مثال کے ساتھ بیان کریں۔','Newton\'s Laws',3,'exercise'),
 short('ss_phy10','A 5 kg object is pushed with force 20 N. Find its acceleration. (F = ma)','5 کلو گرام شے پر 20 N قوت لگائیں۔ اسراع نکالیں۔','Newton\'s Laws',2,'exercise'),
 short('ss_phy10','Differentiate between scalar and vector quantities. Give two examples of each.','اسکیلر اور ویکٹر مقداروں میں فرق بیان کریں۔ ہر ایک کی دو مثالیں دیں۔','Motion',3,'exercise'),
 short('ss_phy10','Define work, energy, and power. Write their SI units.','کام، توانائی اور طاقت کی تعریف لکھیں۔ SI اکائیاں لکھیں۔','Work & Energy',3,'exercise'),
 long('ss_phy10','A ball is thrown vertically upward with velocity 20 m/s. Find: (a) maximum height (b) time to reach max height (c) total time in air. (g = 10 m/s²)','20 m/s سے اوپر پھینکی گئی گیند کے لیے: (a) زیادہ سے زیادہ اونچائی (b) اوپر جانے کا وقت (c) کل وقت نکالیں۔','Motion',8,'exercise'),
 long('ss_phy10','Explain the principle of conservation of energy with a practical example of a falling object. Derive expressions for KE and PE at different heights.','توانائی کے تحفظ کے اصول کی وضاحت کریں۔ گرتی شے کی مثال سے KE اور PE نکالیں۔','Work & Energy',8,'exercise'),

 // 
 // ISLAMIC STUDIES — CLASS 5
 // 

 mcq('ss_isl5','اسلام کے پانچ ارکان میں پہلا رکن کون سا ہے؟','','کلمہ شہادت','نماز','روزہ','زکوٰۃ','A','ارکان اسلام','exercise'),
 mcq('ss_isl5','نماز دن میں کتنی بار پڑھی جاتی ہے؟','','پانچ','تین','چار','چھ','A','عبادات','exercise'),
 mcq('ss_isl5','رمضان المبارک سال کا کون سا مہینہ ہے؟','','نواں','آٹھواں','دسواں','ساتواں','A','عبادات','exercise'),
 mcq('ss_isl5','سب سے آخری نبی کون ہیں؟','','حضرت محمد ﷺ','حضرت عیسیٰ علیہ السلام','حضرت موسیٰ علیہ السلام','حضرت ابراہیم علیہ السلام','A','سیرت النبیؐ','exercise'),
 mcq('ss_isl5','قرآن مجید کتنے پاروں میں تقسیم ہے؟','','تیس','پچیس','بیس','چالیس','A','قرآن','exercise'),
 short('ss_isl5','نماز کی اہمیت اور اس کے فوائد کے بارے میں پانچ جملے لکھیں۔','','عبادات',2,'exercise'),
 short('ss_isl5','حضرت محمد ﷺ کی ولادت کب اور کہاں ہوئی؟ ان کے والدین کے نام لکھیں۔','','سیرت النبیؐ',3,'exercise'),
 long('ss_isl5','اسلام کے پانچ ارکان تفصیل سے لکھیں۔ ہر رکن کا مقصد اور اہمیت بیان کریں۔','','ارکان اسلام',5,'exercise'),

 // 
 // FILL IN BLANKS — Various Subjects
 // 

 fill('ss_sci5', 'پودے [blank] کے ذریعے اپنی خوراک بناتے ہیں۔', 'فوٹو سنتھیسز', 'Plants', 1, 'exercise'),
 fill('ss_sci5', 'پانی کا کیمیائی فارمولا [blank] ہے۔', 'H₂O', 'Matter', 1, 'exercise'),
 fill('ss_sci5', 'زمین سورج کے گرد [blank] دنوں میں چکر لگاتی ہے۔', '365', 'Solar System',1, 'exercise'),
 fill('ss_math5', 'مثلث کے تینوں زاویوں کا مجموعہ [blank] ڈگری ہوتا ہے۔', '180', 'Geometry', 1, 'exercise'),
 fill('ss_math5', '½ اور ¼ کا حاصل جمع [blank] ہے۔', '¾', 'Fractions', 1, 'exercise'),
 fill('ss_urdu5', 'اسم کی جگہ آنے والے لفظ کو [blank] کہتے ہیں۔', 'ضمیر', 'قواعد', 1, 'exercise'),
 fill('ss_urdu5', 'دو اسموں یا جملوں کو ملانے والے لفظ کو [blank] کہتے ہیں۔', 'حرفِ عطف', 'قواعد', 1, 'exercise'),
 fill('ss_isl5', 'قرآن مجید [blank] پاروں پر مشتمل ہے۔', 'تیس', 'قرآن', 1, 'exercise'),
 fill('ss_phy10', 'F = [blank] × a نیوٹن کا دوسرا قانون ہے۔', 'm', "Newton's Laws",1,'exercise'),
 fill('ss_phy10', 'برقی قوت اور کرنٹ کا تعلق V = [blank] ہے۔', 'IR', 'Electricity', 1, 'exercise'),

 // 
 // TRUE / FALSE
 // 

 tf('ss_sci5', 'پودے رات کو آکسیجن خارج کرتے ہیں۔', 'غلط', 'Plants', 1, 'exercise'),
 tf('ss_sci5', 'پانی کی تین حالتیں ہوتی ہیں: ٹھوس، مائع اور گیس۔', 'درست', 'Matter', 1, 'exercise'),
 tf('ss_math5', 'کسی مربع کے چاروں زاویے برابر ہوتے ہیں۔', 'درست', 'Geometry', 1, 'exercise'),
 tf('ss_math5', '0.5 اور ½ برابر نہیں ہیں۔', 'غلط', 'Decimals', 1, 'exercise'),
 tf('ss_urdu5', 'فعل جملے میں کام کرنے والے کو ظاہر کرتا ہے۔', 'غلط', 'قواعد', 1, 'exercise'),
 tf('ss_phy10', 'طاقت (Power) کی SI اکائی جول ہے۔', 'غلط', 'Work & Energy', 1, 'exercise'),
 tf('ss_phy10', 'نیوٹن کے تیسرے قانون کے مطابق ہر عمل کا برابر اور مخالف رد عمل ہوتا ہے۔', 'درست', "Newton's Laws", 1, 'exercise'),
 tf('ss_isl5', 'نماز اسلام کا دوسرا رکن ہے۔', 'درست', 'عبادات', 1, 'exercise'),
 tf('ss_math8', 'دو متوازی خطوط کبھی نہیں ملتے۔', 'درست', 'Geometry', 1, 'exercise'),

 // 
 // MATCH COLUMNS — Science & Mathematics
 // 

 cols('ss_sci5', 'Plants',
 ['کلوروفل', 'جڑیں', 'پتے', 'پھول', 'تنا'],
 ['پانی جذب کرتی ہیں', 'سبز رنگ دیتا ہے', 'فوٹو سنتھیسز کرتے ہیں', 'پودے کو سہارا دیتا ہے', 'بیج بناتے ہیں'],
 3, 'exercise'),

 cols('ss_sci5', 'Animals',
 ['دل', 'پھیپھڑے', 'گردے', 'جگر', 'دماغ'],
 ['خون صاف کرتے ہیں', 'خون پمپ کرتا ہے', 'سانس لیتے ہیں', 'سوچنے کا کام کرتا ہے', 'خوراک ہضم کرتا ہے'],
 3, 'exercise'),

 cols('ss_math5', 'Fractions',
 ['1/2', '1/4', '3/4', '2/5', '1/3'],
 ['0.50', '0.25', '0.75', '0.40', '0.33'],
 3, 'exercise'),

 cols('ss_math8', 'Geometry',
 ['مربع', 'مستطیل', 'مثلث', 'دائرہ', 'متوازی الاضلاع'],
 ['تین اضلاع', 'π r²', 'چار برابر اضلاع', 'چار ضلع — مخالف برابر', 'دو جوڑے متوازی اضلاع'],
 3, 'exercise'),

 cols('ss_phy10', "Newton's Laws",
 ['F = ma', 'ہر عمل کا رد عمل', 'جسم حرکت میں رہتا ہے', 'W = Fd', 'P = W/t'],
 ['طاقت', 'کام', 'قانونِ جمود', 'تیسرا قانون', 'دوسرا قانون'],
 3, 'exercise'),

 // 
 // DEFINITIONS
 // 

 defn('ss_sci5', 'فوٹو سنتھیسز کی تعریف لکھیں۔', 'وہ عمل جس میں پودے سورج کی روشنی، پانی اور کاربن ڈائی آکسائیڈ کی مدد سے اپنی خوراک بناتے ہیں۔', 'Plants', 2, 'exercise'),
 defn('ss_sci5', 'ہضم کی تعریف لکھیں۔', 'وہ عمل جس میں خوراک چھوٹے چھوٹے ذرات میں تبدیل ہو کر خون میں جذب ہو جاتی ہے۔', 'Animals', 2, 'exercise'),
 defn('ss_phy10', 'قوت (Force) کی تعریف لکھیں۔', 'وہ بیرونی اثر جو کسی جسم کی حرکت کی حالت کو تبدیل کرے یا کرنے کی کوشش کرے، قوت کہلاتا ہے۔', "Newton's Laws", 2, 'exercise'),
 defn('ss_phy10', 'طاقت (Power) کی تعریف لکھیں۔', 'ایک سیکنڈ میں کیے گئے کام کو طاقت کہتے ہیں۔ P = W/t', 'Work & Energy', 2, 'exercise'),
 defn('ss_math8', 'متوازی خطوط کی تعریف لکھیں۔', 'وہ خطوط جو ہمیشہ برابر فاصلے پر ہوں اور کبھی نہ ملیں، متوازی خطوط کہلاتے ہیں۔', 'Geometry', 2, 'exercise'),
 defn('ss_urdu5', 'اسم کی تعریف لکھیں۔', 'وہ لفظ جو کسی شخص، جگہ، چیز یا خیال کا نام ہو، اسم کہلاتا ہے۔', 'قواعد', 2, 'exercise'),

 // 
 // URDU CLASS 9 — Full Grammar Suite (Punjab Board)
 // 

 //  Wahid / Jama 
 wahid_jama('ss_urdu9', [
 { wahid: 'کتاب', jama: 'کتابیں' },
 { wahid: 'لڑکا', jama: 'لڑکے' },
 { wahid: 'پھول', jama: 'پھول / پھولوں' },
 { wahid: 'دروازہ', jama: 'دروازے' },
 { wahid: 'آنکھ', jama: 'آنکھیں' },
 ], 'قواعد', 3, 'exercise'),

 wahid_jama('ss_urdu9', [
 { wahid: 'استاد', jama: 'اساتذہ' },
 { wahid: 'طالب', jama: 'طلبہ' },
 { wahid: 'شہر', jama: 'شہر / شہروں' },
 { wahid: 'بات', jama: 'باتیں' },
 { wahid: 'بچہ', jama: 'بچے' },
 ], 'قواعد', 3, 'past'),

 wahid_jama('ss_urdu9', [
 { wahid: 'درخت', jama: 'درختوں' },
 { wahid: 'گھر', jama: 'گھر / گھروں' },
 { wahid: 'پتا', jama: 'پتے' },
 { wahid: 'ہاتھ', jama: 'ہاتھ / ہاتھوں' },
 { wahid: 'پانی', jama: 'پانی / پانیوں' },
 ], 'قواعد', 3, 'exercise'),

 //  Mutradif (Synonyms) 
 mutradif('ss_urdu9', 'آفتاب', 'سورج', 'الفاظ', 'exercise'),
 mutradif('ss_urdu9', 'دریا', 'ندی / نہر', 'الفاظ', 'exercise'),
 mutradif('ss_urdu9', 'خوشی', 'مسرت', 'الفاظ', 'exercise'),
 mutradif('ss_urdu9', 'غم', 'اندوہ', 'الفاظ', 'exercise'),
 mutradif('ss_urdu9', 'دوست', 'رفیق / یار', 'الفاظ', 'exercise'),
 mutradif('ss_urdu9', 'پانی', 'آب', 'الفاظ', 'exercise'),
 mutradif('ss_urdu9', 'آگ', 'نار / آتش', 'الفاظ', 'past'),
 mutradif('ss_urdu9', 'راستہ', 'سبیل / طریق','الفاظ', 'exercise'),

 //  Mutzad (Antonyms) 
 mutzad('ss_urdu9', 'روشنی', 'اندھیرا', 'الفاظ', 'exercise'),
 mutzad('ss_urdu9', 'امیر', 'غریب', 'الفاظ', 'exercise'),
 mutzad('ss_urdu9', 'خوبصورت', 'بدصورت', 'الفاظ', 'exercise'),
 mutzad('ss_urdu9', 'محنت', 'سستی', 'الفاظ', 'exercise'),
 mutzad('ss_urdu9', 'سچ', 'جھوٹ', 'الفاظ', 'exercise'),
 mutzad('ss_urdu9', 'پیار', 'نفرت', 'الفاظ', 'past'),
 mutzad('ss_urdu9', 'آسان', 'مشکل', 'الفاظ', 'exercise'),
 mutzad('ss_urdu9', 'گرمی', 'سردی', 'الفاظ', 'exercise'),

 //  Alfaz ke Maani (Word Meanings) 
 alfaz('ss_urdu9', 'مخلص', 'سچا دوست، وفادار', 'الفاظ', 'exercise'),
 alfaz('ss_urdu9', 'مسرت', 'خوشی، شادمانی', 'الفاظ', 'exercise'),
 alfaz('ss_urdu9', 'عزم', 'پکا ارادہ، حوصلہ', 'الفاظ', 'exercise'),
 alfaz('ss_urdu9', 'منزل', 'مقصد، جہاں پہنچنا ہو', 'الفاظ', 'past'),
 alfaz('ss_urdu9', 'قناعت', 'جو ملے اس پر خوش رہنا', 'الفاظ', 'exercise'),
 alfaz('ss_urdu9', 'ہمت', 'جرأت، دلیری', 'الفاظ', 'exercise'),

 //  Sentence Correction 
 scorr('ss_urdu9', 'وہ کل آئے گا تھا۔', 'وہ کل آئے گا۔', 'قواعد', 'exercise'),
 scorr('ss_urdu9', 'بچے نے کھانا کھایا تھیں۔', 'بچے نے کھانا کھایا۔', 'قواعد', 'exercise'),
 scorr('ss_urdu9', 'میں نے اپنے دوستوں سے ملا۔', 'میں اپنے دوستوں سے ملا۔', 'قواعد', 'exercise'),
 scorr('ss_urdu9', 'آپ بہت اچھا کتاب پڑھتے ہو۔', 'آپ بہت اچھی کتاب پڑھتے ہیں۔', 'قواعد', 'past'),
 scorr('ss_urdu9', 'لڑکیاں سکول جاتا ہے۔', 'لڑکیاں سکول جاتی ہیں۔', 'قواعد', 'exercise'),
 scorr('ss_urdu9', 'ہم نے بہت مزہ آئی۔', 'ہمیں بہت مزہ آیا۔', 'قواعد', 'exercise'),

 //  Sentence Usage 
 sent_usage('ss_urdu9', [
 { word: 'محنت', sentence: '' },
 { word: 'ہمت', sentence: '' },
 { word: 'خوشی', sentence: '' },
 { word: 'دوستی', sentence: '' },
 { word: 'علم', sentence: '' },
 ], 'الفاظ', 3, 'exercise'),

 sent_usage('ss_urdu9', [
 { word: 'وطن', sentence: '' },
 { word: 'امانت', sentence: '' },
 { word: 'صبر', sentence: '' },
 { word: 'عزم', sentence: '' },
 { word: 'محبت', sentence: '' },
 ], 'الفاظ', 3, 'past'),

 //  Muhawara / Zarb ul Misal 
 muhawara('ss_urdu9', 'آنکھیں کھلنا', 'سمجھ آنا، ہوش میں آنا', 'محاورے', 'exercise'),
 muhawara('ss_urdu9', 'آستین کا سانپ', 'قریبی دشمن', 'محاورے', 'exercise'),
 muhawara('ss_urdu9', 'اوس سے پیاس نہیں بجھتی', 'تھوڑی چیز سے بڑا کام نہیں ہوتا', 'محاورے', 'past'),
 muhawara('ss_urdu9', 'دال میں کالا', 'شک کی بات', 'محاورے', 'exercise'),
 muhawara('ss_urdu9', 'ہاتھ پاؤں پھولنا', 'ڈر جانا، گھبرا جانا', 'محاورے', 'exercise'),
 muhawara('ss_urdu9', 'دودھ کا دودھ پانی کا پانی', 'انصاف کرنا', 'محاورے', 'exercise'),
 muhawara('ss_urdu9', 'ناک میں دم کرنا', 'بہت تنگ کرنا', 'محاورے', 'past'),
 muhawara('ss_urdu9', 'بال کی کھال نکالنا', 'ہر بات میں عیب نکالنا', 'محاورے', 'exercise'),

 //  Comprehension (Urdu) 
 comp('ss_urdu9',
 'علم وہ روشنی ہے جو زندگی کی تاریکیوں کو دور کرتی ہے۔ ایک پڑھا لکھا انسان نہ صرف اپنی زندگی سنوارتا ہے بلکہ معاشرے کی بھی خدمت کرتا ہے۔ قرآن مجید میں بھی علم حاصل کرنے کا حکم دیا گیا ہے۔ پاکستان کے ہر بچے کو تعلیم حاصل کرنی چاہیے تاکہ ملک ترقی کر سکے۔ ایک تعلیم یافتہ قوم ہی اپنے حقوق کو پہچان سکتی ہے اور ملک کو آگے لے جا سکتی ہے۔',
 [
 { q: 'علم کو کیا کہا گیا ہے؟', marks: 2 },
 { q: 'پڑھا لکھا انسان کیا کرتا ہے؟', marks: 2 },
 { q: 'قرآن مجید میں علم کے بارے میں کیا فرمایا گیا ہے؟', marks: 2 },
 { q: '"تعلیم یافتہ" سے کیا مراد ہے؟', marks: 2 },
 { q: 'اس اقتباس کا مناسب عنوان لکھیں۔', marks: 2 },
 ],
 'تفہیم', 10, 'exercise'),

 comp('ss_urdu9',
 'پاکستان ایک خوبصورت ملک ہے۔ اس کی زمین زرخیز ہے اور یہاں چاروں موسم آتے ہیں۔ دریائے سندھ، دریائے چناب، دریائے راوی اور دیگر دریا ہماری زمینوں کو سیراب کرتے ہیں۔ پاکستان کے شمال میں دنیا کی بلند ترین پہاڑی چوٹیاں ہیں۔ K2 دنیا کی دوسری بلند ترین چوٹی ہے جو پاکستان میں واقع ہے۔ ہمیں اپنے ملک سے محبت کرنی چاہیے اور اسے آباد رکھنا چاہیے۔',
 [
 { q: 'پاکستان کیسا ملک ہے؟', marks: 2 },
 { q: 'پاکستان کے دریاؤں کے نام لکھیں۔', marks: 2 },
 { q: 'K2 کیا ہے اور کہاں ہے؟', marks: 2 },
 { q: '"زرخیز" کے معنی لکھیں۔', marks: 2 },
 { q: 'ہمیں اپنے ملک کے بارے میں کیا کرنا چاہیے؟', marks: 2 },
 ],
 'تفہیم', 10, 'past'),

 //  Translation 
 translation('ss_urdu9', 'Education is the key to success. A nation that invests in its youth invests in its future.', 'تعلیم کامیابی کی کنجی ہے۔ جو قوم اپنی نوجوان نسل پر سرمایہ کاری کرتی ہے، وہ اپنے مستقبل پر سرمایہ کاری کرتی ہے۔', 'ترجمہ', 3, 'exercise'),
 translation('ss_urdu9', 'Pakistan is a beautiful country with four seasons and fertile land.', 'پاکستان ایک خوبصورت ملک ہے جہاں چاروں موسم آتے ہیں اور زمین زرخیز ہے۔', 'ترجمہ', 3, 'exercise'),
 translation('ss_urdu9', 'Hard work and honesty are the two pillars of success in life.', 'محنت اور ایمانداری زندگی میں کامیابی کے دو ستون ہیں۔', 'ترجمہ', 3, 'past'),

 //  Essay 
 essay('ss_urdu9', 'محنت کا پھل', 'مضامین', 15, 'exercise'),
 essay('ss_urdu9', 'میرا پیارا وطن', 'مضامین', 15, 'exercise'),
 essay('ss_urdu9', 'تعلیم کی اہمیت', 'مضامین', 15, 'past'),
 essay('ss_urdu9', 'موسمِ بہار', 'مضامین', 15, 'exercise'),
 essay('ss_urdu9', 'صحت اور ورزش', 'مضامین', 15, 'exercise'),

 //  Letter / Application 
 letter('ss_urdu9', 'اپنے دوست کو خط لکھیں جس میں عید کی مبارکباد اور تعطیلات کا ذکر ہو۔', 'خط نویسی', 10, 'exercise'),
 letter('ss_urdu9', 'پرنسپل کو درخواست — بیماری کی وجہ سے تین روز کی چھٹی کے لیے۔', 'خط نویسی', 10, 'exercise'),
 letter('ss_urdu9', 'والدین کو خط — اسکول کی تعلیمی سرگرمیوں اور اپنی پڑھائی کے بارے میں۔', 'خط نویسی', 10, 'past'),

 //  Grammar Questions 
 grammar_q('ss_urdu9', 'درج ذیل جملوں میں اسم، فعل اور صفت کی نشاندہی کریں: (۱) احمد نے میٹھا آم کھایا۔ (۲) استاد نے اچھا سبق پڑھایا۔', 'جملہ ۱: احمد=اسم، کھایا=فعل، میٹھا=صفت۔ جملہ ۲: استاد=اسم، پڑھایا=فعل، اچھا=صفت۔', 'قواعد', 2, 'exercise'),
 grammar_q('ss_urdu9', 'اسم کی اقسام لکھ کر ہر قسم کی مثال دیں۔', 'اسمِ ذات (پاکستان)، اسمِ صفت (خوبصورت)، اسمِ ظرف (اوپر)، اسمِ آلہ (قلم)', 'قواعد', 2, 'exercise'),
 grammar_q('ss_urdu9', 'فعل ماضی، حال اور مستقبل کی مثالیں لکھیں۔', 'ماضی: وہ گیا، حال: وہ جاتا ہے، مستقبل: وہ جائے گا', 'قواعد', 2, 'past'),

 // 
 // NUMERICAL — Physics Class 10 & Chemistry Class 10
 // 

 numerical_q('ss_phy10',
 'ایک 3 کلو گرام کی چیز پر 15 نیوٹن کی قوت لگائی جائے۔ اسراع نکالیں۔',
 'F = ma → a = F/m',
 'F = 15 N, m = 3 kg',
 ['a = F ÷ m', 'a = 15 ÷ 3', 'a = 5 m/s²'],
 '5 m/s²',
 "Newton's Laws", 3, 'exercise'),

 numerical_q('ss_phy10',
 '20 کلوگرام وزنی پتھر 10 میٹر اونچائی سے گرتا ہے۔ زمین پر پہنچتے وقت رفتار نکالیں۔ (g = 10 m/s²)',
 'v² = u² + 2gh → v = √(2gh)',
 'u = 0, g = 10 m/s², h = 10 m',
 ['v² = 2 × 10 × 10', 'v² = 200', 'v = √200 ≈ 14.1 m/s'],
 '14.1 m/s',
 'Motion', 3, 'exercise'),

 numerical_q('ss_phy10',
 'ایک مزدور 500 نیوٹن کی قوت سے ڈبے کو 4 میٹر کھسکاتا ہے۔ کیا ہوا کام نکالیں۔',
 'W = F × d',
 'F = 500 N, d = 4 m',
 ['W = 500 × 4', 'W = 2000 J'],
 '2000 J',
 'Work & Energy', 2, 'exercise'),

 numerical_q('ss_phy10',
 'ایک مشین 600 جول کام 20 سیکنڈ میں کرتی ہے۔ طاقت نکالیں۔',
 'P = W / t',
 'W = 600 J, t = 20 s',
 ['P = 600 ÷ 20', 'P = 30 W'],
 '30 W',
 'Work & Energy', 2, 'past'),

 numerical_q('ss_chem10',
 '4 گرام NaOH کو 250 mL پانی میں حل کیا گیا۔ مولر غلظت نکالیں۔ (NaOH کا مولر ماس = 40 g/mol)',
 'M = moles / volume(L) → moles = mass / molar mass',
 'mass = 4 g, M.M. = 40 g/mol, V = 0.25 L',
 ['moles = 4 ÷ 40 = 0.1 mol', 'M = 0.1 ÷ 0.25', 'M = 0.4 mol/L'],
 '0.4 mol/L',
 'Solutions', 3, 'exercise'),

 numerical_q('ss_math10',
 'x² - 5x + 6 = 0 کو کوڈریٹک فارمولا سے حل کریں۔',
 'x = (−b ± √(b²−4ac)) / 2a',
 'a = 1, b = −5, c = 6',
 ['discriminant = 25 − 24 = 1', 'x = (5 ± 1) / 2', 'x = 3 یا x = 2'],
 'x = 2 یا x = 3',
 'Quadratic Equations', 3, 'exercise'),

 // 
 // DIAGRAM — Science & Physics
 // 

 diagram_q('ss_sci5',
 'پودے کا خاکہ بنائیں اور درج ذیل حصوں کو لیبل کریں۔',
 ['جڑ (Root)', 'تنا (Stem)', 'پتہ (Leaf)', 'پھول (Flower)', 'بیج (Seed)'],
 'ایک مکمل پودے کا خاکہ بنا کر تمام حصوں کو اردو اور انگریزی میں لیبل کریں۔',
 'Plants', 5, 'exercise'),

 diagram_q('ss_sci5',
 'آبی چکر کا خاکہ بنائیں اور مراحل نشان زد کریں۔',
 ['بخارات (Evaporation)', 'گھنا ہونا (Condensation)', 'بارش (Precipitation)', 'جمع ہونا (Collection)', 'بہاؤ (Surface Runoff)'],
 'آبی چکر کا مکمل خاکہ بنا کر تمام مراحل کو اردو اور انگریزی میں لیبل کریں۔',
 'Matter', 5, 'exercise'),

 diagram_q('ss_phy10',
 'برقی سرکٹ کا خاکہ بنائیں جس میں بیٹری، بلب، سوئچ اور تار شامل ہوں۔',
 ['بیٹری (Battery)', 'بلب (Bulb)', 'سوئچ (Switch)', 'تار (Wire)', 'آمیٹر (Ammeter)'],
 'ایک سادہ برقی سرکٹ کا مکمل خاکہ بنائیں اور تمام اجزاء کو لیبل کریں۔',
 'Electricity', 5, 'exercise'),

 diagram_q('ss_phy10',
 'نیوٹن کے قانون کی وضاحت کے لیے ایک متحرک گاڑی کا خاکہ بنائیں اور تمام قوتیں دکھائیں۔',
 ['قوتِ رگڑ (Friction)', 'اعمالی قوت (Applied Force)', 'وزن (Weight)', 'معمولی قوت (Normal Force)'],
 'گاڑی پر لگنے والی تمام قوتیں تیروں سے دکھائیں اور لیبل کریں۔',
 "Newton's Laws", 5, 'past'),

 diagram_q('ss_sci5',
 'انسانی آنکھ کا خاکہ بنائیں اور حصوں کے نام لکھیں۔',
 ['قرنیہ (Cornea)', 'عدسہ (Lens)', 'ریٹینا (Retina)', 'آپٹک اعصاب (Optic Nerve)', 'پتلی (Pupil)'],
 'انسانی آنکھ کا تفصیلی خاکہ بنائیں اور ہر حصے کا نام لکھیں۔',
 'Animals', 5, 'exercise'),
]
