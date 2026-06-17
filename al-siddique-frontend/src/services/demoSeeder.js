// demoSeeder.js — Al Siddique Smart School OS
import { getTenantStorageItem, removeTenantStorageItem, setTenantStorageItem } from './tenantStorage'

const STORE_KEY = 'al_siddique_paper_store'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

export function seedPaperStore() {
 const CURRENT_VERSION = 'v2_massive'
 const storage = getStorage()
 let existing = null
 let existingParsed = null
 try {
 existing = getTenantStorageItem(STORE_KEY, { migrateLegacy: true })
 } catch {
 existing = null
 }
 
 if (existing) {
 try {
 const parsed = JSON.parse(existing)
 existingParsed = parsed
 if (parsed.version === CURRENT_VERSION) return 
 } catch {
 try { removeTenantStorageItem(STORE_KEY) } catch {}
 }
 }

 console.log(' Seeding Version 2 Massive Demo Question Bank...')

 const demoData = {
 version: CURRENT_VERSION,
 subjects: [
 { id: 's1', name: 'Mathematics', nameUrdu: 'ریاضی', publisher: 'PTBB', classLevel: '9', createdAt: new Date().toISOString() },
 { id: 's2', name: 'Physics', nameUrdu: 'طبیعیات', publisher: 'PTBB', classLevel: '9', createdAt: new Date().toISOString() },
 { id: 's3', name: 'Chemistry', nameUrdu: 'کیمسٹری', publisher: 'PTBB', classLevel: '9', createdAt: new Date().toISOString() },
 { id: 's4', name: 'English', nameUrdu: 'انگریزی', publisher: 'PTBB', classLevel: '10', createdAt: new Date().toISOString() },
 { id: 's5', name: 'Urdu', nameUrdu: 'اردو', publisher: 'PTBB', classLevel: '10', createdAt: new Date().toISOString() },
 { id: 's6', name: 'Math', nameUrdu: 'ریاضی', publisher: 'SNC', classLevel: '1', createdAt: new Date().toISOString() },
 { id: 's7', name: 'English', nameUrdu: 'انگریزی', publisher: 'SNC', classLevel: '1', createdAt: new Date().toISOString() },
 { id: 's8', name: 'Urdu', nameUrdu: 'اردو', publisher: 'SNC', classLevel: '1', createdAt: new Date().toISOString() },
 { id: 's9', name: 'General Science', nameUrdu: 'سائنس', publisher: 'SNC', classLevel: '2', createdAt: new Date().toISOString() },
 { id: 's10', name: 'Mathematics', nameUrdu: 'ریاضی', publisher: 'SNC', classLevel: '3', createdAt: new Date().toISOString() },
 { id: 's11', name: 'Islamiyat', nameUrdu: 'اسلامیات', publisher: 'SNC', classLevel: '4', createdAt: new Date().toISOString() },
 { id: 's12', name: 'Social Studies', nameUrdu: 'معاشرتی علوم', publisher: 'SNC', classLevel: '5', createdAt: new Date().toISOString() },
 { id: 's13', name: 'General Science', nameUrdu: 'سائنس', publisher: 'PTBB', classLevel: '6', createdAt: new Date().toISOString() },
 { id: 's14', name: 'Mathematics', nameUrdu: 'ریاضی', publisher: 'PTBB', classLevel: '7', createdAt: new Date().toISOString() },
 { id: 's15', name: 'English', nameUrdu: 'انگریزی', publisher: 'PTBB', classLevel: '8', createdAt: new Date().toISOString() },
 ],
 questions: [
 // Maths 9 (s1)
 { id: 'mq1', subjectId: 's1', type: 'mcq', text: 'The order of matrix [2 1] is?', textUrdu: 'قالب [2 1] کا مرتبہ کیا ہے؟', options: [{label:'A',text:'1-by-1'},{label:'B',text:'1-by-2'},{label:'C',text:'2-by-1'},{label:'D',text:'2-by-2'}], answer: 'B', marks: 1, chapter: 'Chapter 1', priority: 'exercise' },
 { id: 'mq2', subjectId: 's1', type: 'mcq', text: 'Additive inverse of [-2] is?', textUrdu: '[-2] کا جمعی معکوس کیا ہے؟', options: [{label:'A',text:'[2]'},{label:'B',text:'[-2]'},{label:'C',text:'[0]'},{label:'D',text:'[1]'}], answer: 'A', marks: 1, chapter: 'Chapter 1', priority: 'past' },
 { id: 'mq3', subjectId: 's1', type: 'short', text: 'Define a Singular Matrix.', textUrdu: 'سنگولر قالب کی تعریف کریں۔', answer: 'A square matrix whose determinant is zero.', marks: 2, chapter: 'Chapter 1', priority: 'exercise' },
 { id: 'mq4', subjectId: 's1', type: 'long', text: 'Solve using Cramer\'s Rule: 2x+y=3, 6x+5y=1', textUrdu: 'کریمر کے قانون سے حل کریں: 2x+y=3, 6x+5y=1', marks: 8, chapter: 'Chapter 1', priority: 'past' },
 
 // Physics 9 (s2)
 { id: 'pq1', subjectId: 's2', type: 'mcq', text: 'Which is a base quantity?', textUrdu: 'بنیادی مقدار کونسی ہے؟', options: [{label:'A',text:'Speed'},{label:'B',text:'Force'},{label:'C',text:'Length'},{label:'D',text:'Work'}], answer: 'C', marks: 1, chapter: 'Chapter 1', priority: 'exercise' },
 { id: 'pq2', subjectId: 's2', type: 'short', text: 'Define Kinematics.', textUrdu: 'کائنی میٹکس کی تعریف کریں۔', answer: 'Study of motion without cause.', marks: 2, chapter: 'Chapter 2', priority: 'exercise' },

 // Chemistry 9 (s3)
 { id: 'cq1', subjectId: 's3', type: 'mcq', text: 'Symbol of Gold is?', textUrdu: 'گولڈ کی علامت کیا ہے؟', options: [{label:'A',text:'Gd'},{label:'B',text:'Au'},{label:'C',text:'Ag'},{label:'D',text:'Fe'}], answer: 'B', marks: 1, chapter: 'Chapter 1', priority: 'exercise' },

 // English 10 (s4)
 { id: 'eq1', subjectId: 's4', type: 'mcq', text: 'Hazrat Muhammad (SAW) is a perfect model of?', options: [{label:'A',text:'Justice'},{label:'B',text:'Cruelty'},{label:'C',text:'Anger'},{label:'D',text:'Fear'}], answer: 'A', marks: 1, chapter: 'Unit 1', priority: 'exercise' },

 // Class 1 Math (s6)
 { id: 'c1m1', subjectId: 's6', type: 'mcq', text: 'What comes after 9?', textUrdu: '9 کے بعد کیا آتا ہے؟', options: [{label:'A',text:'8'},{label:'B',text:'10'},{label:'C',text:'11'},{label:'D',text:'7'}], answer: 'B', marks: 1, chapter: 'Counting', priority: 'exercise' },
 { id: 'c1m2', subjectId: 's6', type: 'short', text: 'Write 5 in words.', textUrdu: '5 کو لفظوں میں لکھیں۔', answer: 'Five', marks: 2, chapter: 'Numbers', priority: 'exercise' },

 // Class 1 English (s7)
 { id: 'c1e1', subjectId: 's7', type: 'mcq', text: 'Which one is a vowel?', options: [{label:'A',text:'B'},{label:'B',text:'C'},{label:'C',text:'A'},{label:'D',text:'D'}], answer: 'C', marks: 1, chapter: 'Alphabets', priority: 'exercise' },

 // Class 1 Urdu (s8)
 { id: 'c1u1', subjectId: 's8', type: 'mcq', text: 'الف سے کیا بنتا ہے؟', options: [{label:'A',text:'انار'},{label:'B',text:'بکری'},{label:'C',text:'پنکھا'},{label:'D',text:'تالا'}], answer: 'A', marks: 1, chapter: 'حروف', priority: 'exercise' },

 // Class 2 Science (s9)
 { id: 'c2s1', subjectId: 's9', type: 'mcq', text: 'We see with our?', textUrdu: 'ہم کس سے دیکھتے ہیں؟', options: [{label:'A',text:'Ears'},{label:'B',text:'Eyes'},{label:'C',text:'Nose'},{label:'D',text:'Hands'}], answer: 'B', marks: 1, chapter: 'Senses', priority: 'exercise' },

 // Class 3 Math (s10)
 { id: 'c3m1', subjectId: 's10', type: 'mcq', text: '2 x 3 = ?', textUrdu: '2 x 3 کیا ہوتا ہے؟', options: [{label:'A',text:'5'},{label:'B',text:'6'},{label:'C',text:'7'},{label:'D',text:'8'}], answer: 'B', marks: 1, chapter: 'Multiplication', priority: 'exercise' },

 // Class 4 Islamiyat (s11)
 { id: 'c4i1', subjectId: 's11', type: 'mcq', text: 'اللہ ایک ہے، یہ عقیدہ کہلاتا ہے؟', options: [{label:'A',text:'توحید'},{label:'B',text:'رسالت'},{label:'C',text:'آخرت'},{label:'D',text:'ملائکہ'}], answer: 'A', marks: 1, chapter: 'عقائد', priority: 'exercise' },

 // Class 5 Social Studies (s12)
 { id: 'c5s1', subjectId: 's12', type: 'mcq', text: 'Capital of Pakistan is?', textUrdu: 'پاکستان کا دارالحکومت ہے؟', options: [{label:'A',text:'Lahore'},{label:'B',text:'Karachi'},{label:'C',text:'Islamabad'},{label:'D',text:'Peshawar'}], answer: 'C', marks: 1, chapter: 'Pakistan', priority: 'exercise' },

 // Class 6 Science (s13)
 { id: 'c6s1', subjectId: 's13', type: 'mcq', text: 'The structural unit of life is?', textUrdu: 'زندگی کی بنیادی اکائی ہے؟', options: [{label:'A',text:'Atom'},{label:'B',text:'Cell'},{label:'C',text:'Tissue'},{label:'D',text:'Organ'}], answer: 'B', marks: 1, chapter: 'Cell', priority: 'exercise' },

 // Class 7 Math (s14)
 { id: 'c7m1', subjectId: 's14', type: 'mcq', text: 'Solve: 5 + (-3) = ?', textUrdu: 'حل کریں: 5 + (-3) = ?', options: [{label:'A',text:'8'},{label:'B',text:'2'},{label:'C',text:'-2'},{label:'D',text:'15'}], answer: 'B', marks: 1, chapter: 'Integers', priority: 'exercise' },

 // Class 8 English (s15)
 { id: 'c8e1', subjectId: 's15', type: 'mcq', text: 'Opposite of "Happy" is?', options: [{label:'A',text:'Joyful'},{label:'B',text:'Sad'},{label:'C',text:'Angry'},{label:'D',text:'Kind'}], answer: 'B', marks: 1, chapter: 'Vocabulary', priority: 'exercise' },
 ],
 paperSettings: {
 schoolName: 'Al Siddique Scholars Public School',
 schoolUrdu: 'الصدیق اسکالرز پبلک اسکول',
 address: 'Sharif Chowk, Rayya Khas, Narowal',
 logo: null,
 urduFont: 'Noto Nastaliq Urdu',
 examYear: '2026-2027',
 principalName: 'Haseeb Arshad',
 phone: '0300-1291959',
 email: 'info@alsiddique.edu.pk',
 showUrduHeader: true
 }
 }

 if (existingParsed && typeof existingParsed === 'object') {
 const demoSubjectIds = new Set(demoData.subjects.map(subject => subject.id))
 const demoQuestionIds = new Set(demoData.questions.map(question => question.id))
 const savedPapers = Array.isArray(existingParsed.savedPapers) ? existingParsed.savedPapers : []
 const customSubjects = Array.isArray(existingParsed.subjects)
 ? existingParsed.subjects.filter(subject => subject?.id && !demoSubjectIds.has(subject.id))
 : []
 const customQuestions = Array.isArray(existingParsed.questions)
 ? existingParsed.questions.filter(question => question?.id && !demoQuestionIds.has(question.id))
 : []
 demoData.savedPapers = savedPapers
 demoData.subjects = [...demoData.subjects, ...customSubjects]
 demoData.questions = [...demoData.questions, ...customQuestions]
 demoData.paperSettings = {
 ...demoData.paperSettings,
 ...(existingParsed.paperSettings || {}),
 }
 }

 try { setTenantStorageItem(STORE_KEY, JSON.stringify(demoData)) } catch {}
 console.log(' Comprehensive Demo Question Bank Seeded!')
}
