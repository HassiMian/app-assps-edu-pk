// usePaperStore.js — Al Siddique Smart School OS
import { useState, useEffect } from 'react'
import { resolveAssetUrl } from '../../services/api'
import { classLevelLabel, classLevelsMatch, normalizeClassLevel } from '../../services/useAcademicStore'
import { getTenantStorageItem, setTenantStorageItem } from '../../services/tenantStorage'

const STORE_KEY = 'al_siddique_paper_store'
const NOTIFICATIONS_KEY = 'saas_admin_notifications'
const STORE_SYNC_EVENT = 'al_siddique_paper_store_updated'


const SUBJECT_CATEGORY_MAP = {
 urdu: ['mcq', 'wahid_jama', 'mutradif', 'mutzad', 'sentence_correction', 'sentence_usage', 'alfaz_maani', 'comprehension', 'essay', 'letter', 'muhawara', 'grammar'],
 english: ['mcq', 'true_false', 'fill', 'translation', 'essay', 'letter', 'comprehension', 'sentence_correction', 'sentence_usage', 'grammar'],
 default: ['mcq', 'short', 'long', 'diagram', 'numerical', 'definition', 'columns', 'true_false', 'fill']
}

function getFilteredTypes(subjectName, allTypes) {
 if (!subjectName) return allTypes;
 const s = String(subjectName).toLowerCase().trim();
 let keys = SUBJECT_CATEGORY_MAP.default;
 if (s.includes('urdu')) keys = SUBJECT_CATEGORY_MAP.urdu;
 else if (s.includes('english')) keys = SUBJECT_CATEGORY_MAP.english;
 else if (s === 'math' || s === 'mathematics' || s === 'science' || s === 'computer' || s === 'physics' || s === 'chemistry' || s === 'biology' || s === 'islamiat' || s.includes('studies')) {
 keys = SUBJECT_CATEGORY_MAP.default;
 }
 return allTypes.filter(t => keys.includes(t.value));
}

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

const defaultStore = {
 subjects: [],
 questions: [],
 savedPapers: [],
 questionTypes: [
 //  Core objective types 
 { value: 'mcq', label: 'MCQ', labelUrdu: 'کثیر الانتخاب', marks: 1 },
 { value: 'true_false', label: 'True / False', labelUrdu: 'درست / غلط', marks: 1 },
 { value: 'fill', label: 'Fill in Blanks', labelUrdu: 'خالی جگہ پُر کریں', marks: 1 },
 { value: 'columns', label: 'Match Columns', labelUrdu: 'کالم ملائیں', marks: 3 },
 //  Core subjective types 
 { value: 'short', label: 'Short Question', labelUrdu: 'مختصر سوالات', marks: 2 },
 { value: 'long', label: 'Long Question', labelUrdu: 'تفصیلی سوالات', marks: 5 },
 { value: 'definition', label: 'Definition', labelUrdu: 'تعریف', marks: 2 },
 //  Science / Math 
 { value: 'numerical', label: 'Numerical', labelUrdu: 'عددی سوال', marks: 3 },
 { value: 'diagram', label: 'Diagram / Drawing', labelUrdu: 'خاکہ', marks: 5 },
 //  Urdu Grammar 
 { value: 'wahid_jama', label: 'Wahid / Jama', labelUrdu: 'واحد جمع', marks: 3 },
 { value: 'mutradif', label: 'Mutradif (Synonym)', labelUrdu: 'مترادف', marks: 2 },
 { value: 'mutzad', label: 'Mutzad (Antonym)', labelUrdu: 'متضاد', marks: 2 },
 { value: 'alfaz_maani', label: "Alfaz ke Ma'ani", labelUrdu: 'الفاظ کے معنی', marks: 2 },
 { value: 'sentence_correction', label: 'Sentence Correction', labelUrdu: 'جملوں کی درستگی', marks: 2 },
 { value: 'sentence_usage', label: 'Sentence Usage', labelUrdu: 'جملوں کا استعمال', marks: 3 },
 { value: 'comprehension', label: 'Comprehension (Tafheem)', labelUrdu: 'تفہیم', marks: 10 },
 { value: 'translation', label: 'Translation', labelUrdu: 'ترجمہ', marks: 3 },
 { value: 'essay', label: 'Essay (Mazmoon)', labelUrdu: 'مضمون', marks: 15 },
 { value: 'letter', label: 'Letter / Application', labelUrdu: 'خط / درخواست', marks: 10 },
 { value: 'muhawara', label: 'Muhawara / Zarb ul Misal', labelUrdu: 'محاورے / ضرب الامثال', marks: 3 },
 { value: 'grammar', label: 'Grammar', labelUrdu: 'قواعد', marks: 2 },
 ],
 paperSettings: {
 schoolName: 'Al Siddique Scholars Public School',
 schoolUrdu: 'الصدیق اسکالرز پبلک اسکول',
 address: 'Sharif Chowk, Rayya Khas, Narowal',
 schoolCode: '',
 logo: null,
 urduFont: 'Noto Nastaliq Urdu',
 examYear: '2026-2027',
 geminiModel: 'gemini-2.5-flash',
 principalName: '',
 principalSignature: '',
 phone: '',
 email: '',
 showUrduHeader: true,
 showUrduOnLogin: false,
 moduleAccess: {},
 schoolAccess: [],
 superappModules: {},
 },
}

function loadStore() {
 try {
 const raw = getTenantStorageItem(STORE_KEY, { migrateLegacy: true })
 if (!raw) {
 saveStore(defaultStore)
 return defaultStore
 }
 const parsed = JSON.parse(raw)
 // Keep user data as-is; only seed if this is truly the very first run
 const subjects = Array.isArray(parsed.subjects)
 ? parsed.subjects.filter(subject => !String(subject?.id || '').startsWith('ss_'))
 : []
 const questions = Array.isArray(parsed.questions)
 ? parsed.questions.filter(question => !String(question?.id || '').startsWith('qs_') && !String(question?.subjectId || '').startsWith('ss_'))
 : []
 const now = Date.now()
 const savedPapers = Array.isArray(parsed.savedPapers)
 ? parsed.savedPapers.filter(p => !p.expiresAt || Number.isNaN(Date.parse(p.expiresAt)) || Date.parse(p.expiresAt) > now)
 : []
 const parsedQuestionTypes = Array.isArray(parsed.questionTypes) ? parsed.questionTypes : []
 // NOTE: We do NOT re-seed when questions.length === 0 anymore —
 // the user may have intentionally cleared the bank, or just saved 0 questions.
 // Re-seeding would destroy their work. First-run seeding happens above (no raw).
 // Merge: keep user-customised marks but add any brand-new types from defaultStore
  const uniqueParsedTypes = []
  const seenTypes = new Set()
  for (const t of parsedQuestionTypes) {
    if (t && t.value && !seenTypes.has(t.value)) {
      seenTypes.add(t.value)
      uniqueParsedTypes.push(t)
    }
  }

  const existingTypeValues = new Set(uniqueParsedTypes.map(t => t.value))
  const mergedTypes = [
  ...uniqueParsedTypes,
  ...defaultStore.questionTypes.filter(t => !existingTypeValues.has(t.value)),
  ]
 // Ensure every type has a labelUrdu field (older stores may lack it)
 mergedTypes.forEach(t => {
 if (!t.labelUrdu) {
 const def = defaultStore.questionTypes.find(d => d.value === t.value)
 if (def) t.labelUrdu = def.labelUrdu
 }
 })
 const { geminiApiKey: _legacyGeminiKey, ...persistedPaperSettings } = parsed.paperSettings || {}
 const safePaperSettings = {
 ...defaultStore.paperSettings,
 ...persistedPaperSettings,
 geminiModel: persistedPaperSettings.geminiModel || defaultStore.paperSettings.geminiModel,
 moduleAccess: persistedPaperSettings.moduleAccess || {},
 schoolAccess: Array.isArray(persistedPaperSettings.schoolAccess) ? persistedPaperSettings.schoolAccess : [],
 superappModules: persistedPaperSettings.superappModules || {},
 }
 return {
 ...defaultStore,
 ...parsed,
 subjects,
 questions,
 questionTypes: mergedTypes,
 savedPapers,
 paperSettings: safePaperSettings,
 }
 } catch { return defaultStore }
}

function saveStore(data) {
  const storage = getStorage()
  if (!storage) return false
  try { 
    setTenantStorageItem(STORE_KEY, JSON.stringify(data)) 
    return true
  } catch (e) {
    console.error('Failed to save to local storage:', e)
    if (e.name === 'QuotaExceededError') {
      alert('Storage limit reached! Please delete some saved papers, questions, or remove large logos in settings to free up space.')
    } else {
      alert('Error saving data: ' + e.message)
    }
    return false
  }
}

function normalizeBackendSettings(data = {}) {
 const brandingConfig = data.branding_config && typeof data.branding_config === 'object'
 ? data.branding_config
 : data.brandingConfig && typeof data.brandingConfig === 'object'
 ? data.brandingConfig
 : {}

 return {
  schoolCode: data.school_code || data.schoolCode || '',
  schoolName: data.school_name || data.schoolName || '',
  schoolUrdu: data.school_urdu || data.schoolUrdu || '',
  address: data.school_address || data.address || '',
  logo: resolveAssetUrl(data.school_logo || data.logo || null),
  principalName: data.principal_name || data.principalName || '',
  phone: data.school_phone || data.phone || '',
  email: data.school_email || data.email || '',
  examYear: data.academic_year || data.examYear || '',
  showUrduOnLogin: Boolean(data.show_urdu_on_login ?? data.showUrduOnLogin ?? false),
  moduleAccess: data.module_access && typeof data.module_access === 'object'
   ? data.module_access
   : data.moduleAccess && typeof data.moduleAccess === 'object'
   ? data.moduleAccess
   : {},
  schoolAccess: Array.isArray(data.school_access)
   ? data.school_access
   : Array.isArray(data.schoolAccess)
   ? data.schoolAccess
   : [],
  superappModules: data.superapp_modules && typeof data.superapp_modules === 'object'
   ? data.superapp_modules
   : data.superappModules && typeof data.superappModules === 'object'
   ? data.superappModules
   : {},
  brandingConfig: {
   ...brandingConfig,
   loginBackground: resolveAssetUrl(brandingConfig.loginBackground || brandingConfig.login_background || null),
  },
 }
}

function mergePaperSettings(baseSettings = {}, backendSettings = {}) {
 const next = {
  ...baseSettings,
  ...backendSettings,
  moduleAccess: backendSettings.moduleAccess && typeof backendSettings.moduleAccess === 'object'
   ? backendSettings.moduleAccess
   : baseSettings.moduleAccess || {},
  schoolAccess: Array.isArray(backendSettings.schoolAccess)
   ? backendSettings.schoolAccess
   : Array.isArray(baseSettings.schoolAccess)
   ? baseSettings.schoolAccess
   : [],
  superappModules: backendSettings.superappModules && typeof backendSettings.superappModules === 'object'
   ? backendSettings.superappModules
   : baseSettings.superappModules || {},
  brandingConfig: backendSettings.brandingConfig && typeof backendSettings.brandingConfig === 'object'
   ? backendSettings.brandingConfig
   : baseSettings.brandingConfig || {},
 }

 if (backendSettings.showUrduOnLogin !== undefined) {
  next.showUrduOnLogin = backendSettings.showUrduOnLogin
 }

 return next
}

let backendSettingsHydrationPromise = null
let backendSettingsFingerprint = ''

function getBackendSettingsFingerprint(settings = {}) {
 const brandingConfig = settings.brandingConfig || {}
 return JSON.stringify({
  schoolCode: settings.schoolCode || '',
  schoolName: settings.schoolName || '',
  schoolUrdu: settings.schoolUrdu || '',
  address: settings.address || '',
  logo: settings.logo ? '[set]' : '',
  principalName: settings.principalName || '',
  phone: settings.phone || '',
  email: settings.email || '',
  examYear: settings.examYear || '',
  showUrduOnLogin: Boolean(settings.showUrduOnLogin),
  moduleAccess: settings.moduleAccess || {},
  schoolAccessCount: Array.isArray(settings.schoolAccess) ? settings.schoolAccess.length : 0,
  superappModules: settings.superappModules || {},
  brandingConfig,
 })
}

async function hydrateBackendSettings() {
 const storage = getStorage()
 if (!storage || typeof window === 'undefined') return null

 if (backendSettingsHydrationPromise) return backendSettingsHydrationPromise

 backendSettingsHydrationPromise = (async () => {
  try {
   const snapshots = []

   const publicRes = await window.fetch('/api/settings/public', {
    credentials: 'same-origin',
    cache: 'no-store',
   })
   if (publicRes.ok) {
    const publicJson = await publicRes.json()
    snapshots.push(normalizeBackendSettings(publicJson?.data || {}))
   }

   const token = storage.getItem('al_siddique_token')
   if (token) {
    const authRes = await window.fetch('/api/settings', {
     credentials: 'same-origin',
     cache: 'no-store',
     headers: {
      Authorization: `Bearer ${token}`,
     },
    })

    if (authRes.ok) {
     const authJson = await authRes.json()
     snapshots.push(normalizeBackendSettings(authJson?.data || {}))
    }
   }

   if (!snapshots.length) return null

   return snapshots.reduce((acc, snapshot) => ({
    ...acc,
    ...snapshot,
    moduleAccess: {
     ...(acc.moduleAccess || {}),
     ...(snapshot.moduleAccess || {}),
    },
    schoolAccess: Array.isArray(snapshot.schoolAccess) && snapshot.schoolAccess.length > 0
     ? snapshot.schoolAccess
     : acc.schoolAccess,
    superappModules: {
     ...(acc.superappModules || {}),
     ...(snapshot.superappModules || {}),
    },
    brandingConfig: {
     ...(acc.brandingConfig || {}),
     ...(snapshot.brandingConfig || {}),
    },
   }), {})
  } catch {
   return null
  } finally {
   backendSettingsHydrationPromise = null
  }
 })()

 return backendSettingsHydrationPromise
}

function applyBackendSettingsToStore(settings) {
 if (!settings) return false

 const fingerprint = getBackendSettingsFingerprint(settings)
 if (fingerprint === backendSettingsFingerprint) {
  return false
 }

 backendSettingsFingerprint = fingerprint

 const next = {
  ...globalStore,
  paperSettings: mergePaperSettings(globalStore.paperSettings || defaultStore.paperSettings, settings),
 }

 globalStore = next
 saveStore(next)
 emit()
 return true
}

function normText(value) {
 return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function stringifyOptions(options = []) {
 return (options || [])
 .map(opt => {
 if (typeof opt === 'string') return opt
 if (!opt || typeof opt !== 'object') return ''
 return [opt.key, opt.label, opt.text, opt.textUrdu, opt.value].filter(Boolean).join('|')
 })
 .filter(Boolean)
 .join('||')
}

function questionFingerprint(question) {
 return [
 normText(question.subjectId),
 normText(question.type),
 normText(question.text),
 normText(question.textUrdu),
 stringifyOptions(question.options),
 normText(question.answer),
 normText(question.chapter),
 String(question.marks || ''),
 normText(question.medium),
 ].join('::')
}

function normalizeSubjectKey({ name = '', classLevel = '', publisher = '' }) {
 return [normText(name), normText(classLevel), normText(publisher)].join('::')
}

function readJson(key, fallback) {
 try {
 const raw = getStorage()?.getItem(key)
 return raw ? JSON.parse(raw) : fallback
 } catch {
 return fallback
 }
}

function estimatePrints(classLevel) {
 const storage = getStorage()
 try {
  const localStudents = JSON.parse(storage?.getItem('saas_students') || storage?.getItem('al_siddique_students') || '[]')
  if (Array.isArray(localStudents) && localStudents.length) {
   const target = normalizeClassLevel(classLevel)
   const count = localStudents.filter(s => normalizeClassLevel(s.class || s.classLevel || s.class_name) === target && String(s.status || 'Active').toLowerCase() !== 'inactive').length
   if (count > 0) return count
  }
 } catch {}
 const counts = { starter: 33, mover: 42, flyer: 29, '1': 34, '2': 34, '3': 33, '4': 21, '5': 22, '6': 19, '7': 18, '8': 13, 'pre-nine': 16, hifaz: 3 }
 return counts[normalizeClassLevel(classLevel)] || 30
}

function notifyPaperSaved(paper) {
 const className = paper.config?.classLevel ? classLevelLabel(paper.config.classLevel) : 'selected class'
 const prints = estimatePrints(paper.config?.classLevel)
 const notification = {
 id: Date.now(),
 type: 'success',
 icon: 'print',
 title: 'Paper Saved',
 message: `${paper.config?.subject || 'Paper'} ${paper.config?.examType || ''} paper saved for ${className}. ${prints} students in this class, please prepare ${prints} prints.`,
 body: `${paper.config?.subject || 'Paper'} ${paper.config?.examType || ''} saved for ${className}. ${prints} prints required.`,
 time: 'Just now',
 unread: true,
 paperId: paper.id,
 classLevel: paper.config?.classLevel || '',
 students: prints,
 printsRequired: prints,
 }
 const existing = readJson(NOTIFICATIONS_KEY, [])
 const storage = getStorage()
 try { storage?.setItem(NOTIFICATIONS_KEY, JSON.stringify([notification, ...existing])) } catch {}
 window.dispatchEvent(new StorageEvent('storage', { key: NOTIFICATIONS_KEY }))
}

let globalStore = null;
const listeners = new Set();

function emit() {
  listeners.forEach(l => l());
}

export function usePaperStore() {
  // Initialize global store on first use if null
  if (!globalStore) {
    globalStore = loadStore();
  }

  const [store, setStore] = useState(globalStore);

  useEffect(() => {
    const handler = () => setStore(globalStore);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  useEffect(() => {
    const storageHandler = (e) => {
      if (e.key === STORE_KEY || String(e.key || '').startsWith(`${STORE_KEY}__`) || e.key === null || e.key === 'al_siddique_token' || e.key === 'al_siddique_refresh_token' || e.key === 'al_siddique_user') {
        globalStore = loadStore();
        emit();
        if (e.key === 'al_siddique_token' || e.key === 'al_siddique_refresh_token' || e.key === 'al_siddique_user' || e.key === null) {
          hydrateBackendSettings().then(applyBackendSettingsToStore).catch(() => {})
        }
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => window.removeEventListener('storage', storageHandler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    hydrateBackendSettings()
      .then((settings) => {
        if (cancelled) return;
        applyBackendSettingsToStore(settings);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function update(updater) {
    const next = updater(globalStore);
    const success = saveStore(next);
    if (success) {
      globalStore = next;
      emit();
    }
    return success;
  }

 //  Subjects 
 function addSubject({ name, nameUrdu = '', publisher = '', cover = null, classLevel = '' }) {
 const subject = { id: `subj_${Date.now()}`, name, nameUrdu, publisher, cover, classLevel, createdAt: new Date().toISOString() }
 update(s => ({ ...s, subjects: [...s.subjects, subject] }))
 return subject
 }

 function findSubjectByIdentity({ name = '', classLevel = '', publisher = '' }) {
 const targetKey = normalizeSubjectKey({ name, classLevel, publisher })
 if (!targetKey.trim()) return null
 return globalStore.subjects.find(sub => normalizeSubjectKey({
 name: sub.name,
 classLevel: sub.classLevel,
 publisher: sub.publisher,
 }) === targetKey) || null
 }

 function ensureSubject({ name, nameUrdu = '', publisher = '', cover = null, classLevel = '' }) {
 const existing = findSubjectByIdentity({ name, classLevel, publisher })
 if (existing) return existing
 return addSubject({ name, nameUrdu, publisher, cover, classLevel })
 }

 function editSubject(id, changes) {
 update(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === id ? { ...sub, ...changes } : sub) }))
 }

 function deleteSubject(id) {
 update(s => ({ ...s, subjects: s.subjects.filter(sub => sub.id !== id), questions: s.questions.filter(q => q.subjectId !== id) }))
 }

  //  Questions 
  function addQuestion({ subjectId, type, medium = 'english', text = '', textUrdu = '', options = [], answer = '', marks = 1, chapter = '', priority = 'all', structuredData = null, leftColumn = [], rightColumn = [], topic = '' }) {
  const q = {
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  subjectId, type, medium, text, textUrdu, options, answer,
  marks: Number(marks), chapter, priority, topic,
  structuredData, leftColumn, rightColumn,
  createdAt: new Date().toISOString(),
  }
 update(s => ({ ...s, questions: [...s.questions, q] }))
 return q
 }

 function editQuestion(id, changes) {
 update(s => ({ ...s, questions: s.questions.map(q => q.id === id ? { ...q, ...changes } : q) }))
 }

 function deleteQuestion(id) {
 update(s => ({ ...s, questions: s.questions.filter(q => q.id !== id) }))
 }

 function importPaperQuestionsToBank({
 subjectId = '',
 subjectMeta = {},
 selectedMCQ = [],
 selectedShort = [],
 selectedLong = [],
 selectedQuestions = {},
 medium = 'english',
 chapter = '',
 source = 'paper',
 priority = 'exercise',
 } = {}) {
 const subject = subjectId
 ? globalStore.subjects.find(sub => sub.id === subjectId) || null
 : ensureSubject(subjectMeta)
 const resolvedSubjectId = subject?.id || subjectId || null
 if (!resolvedSubjectId) return { total: 0, mcq: 0, short: 0, long: 0, subject: null }

 const bucketsByType = new Map([
 ['mcq', { type: 'mcq', list: selectedMCQ, defaultMarks: 1 }],
 ['short', { type: 'short', list: selectedShort, defaultMarks: 2 }],
 ['long', { type: 'long', list: selectedLong, defaultMarks: 5 }],
 ])

 Object.entries(selectedQuestions || {}).forEach(([type, payload]) => {
 const questions = Array.isArray(payload) ? payload : (Array.isArray(payload?.questions) ? payload.questions : [])
 if (!questions.length) return
 const marks = Number(payload?.marks) || Number((globalStore.questionTypes || defaultStore.questionTypes).find(t => t.value === type)?.marks) || 1
 bucketsByType.set(type, { type, list: questions, defaultMarks: marks })
 })

 const buckets = Array.from(bucketsByType.values()).filter(bucket => Array.isArray(bucket.list) && bucket.list.length > 0)

 const legacyTypes = new Set(['mcq', 'short', 'long'])
 const summary = {
 total: 0,
 subject,
 }
 ;(globalStore.questionTypes || defaultStore.questionTypes).forEach(t => { summary[t.value] = 0 })
 legacyTypes.forEach(type => { if (summary[type] === undefined) summary[type] = 0 })

 /*
  Keep legacy mcq/short/long counters for older UI, while also importing
  every configured category used by AI Generator and Paper Studio.
 */

 const existingFingerprints = new Set(globalStore.questions.map(questionFingerprint))
 const imported = []

 buckets.forEach(({ type, list, defaultMarks }) => {
 (list || []).forEach(item => {
 const text = item?.text || item?.en || item?.question || ''
 const textUrdu = item?.textUrdu || item?.ur || item?.urdu || ''
 const options = Array.isArray(item?.options) ? item.options : []
 const leftColumn = Array.isArray(item?.leftColumn) ? item.leftColumn : []
 const rightColumn = Array.isArray(item?.rightColumn) ? item.rightColumn : []
 const normalized = {
 subjectId: resolvedSubjectId,
 type,
 medium: item?.medium || medium,
 text,
 textUrdu,
 options,
 answer: item?.answer || '',
 marks: Number(item?.marks) || defaultMarks,
 chapter: item?.chapter || chapter || '',
 priority: item?.priority || priority,
 structuredData: item?.structuredData || null,
 leftColumn,
 rightColumn,
 }
 const fingerprint = questionFingerprint(normalized)
 if (existingFingerprints.has(fingerprint)) return
 existingFingerprints.add(fingerprint)
 imported.push({
 id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
 ...normalized,
 source,
 createdAt: new Date().toISOString(),
 })
 summary.total += 1
 summary[type] = (summary[type] || 0) + 1
 })
 })

 if (!imported.length) return { ...summary, total: 0, mcq: 0, short: 0, long: 0, subject }

 update(s => ({ ...s, questions: [...s.questions, ...imported] }))

 return summary
 }

 function bulkAddQuestions(questionsList) {
 if (!questionsList || !questionsList.length) return []
 const imported = questionsList.map(q => ({
 id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
 ...q,
 createdAt: new Date().toISOString(),
 }))
 update(s => ({ ...s, questions: [...s.questions, ...imported] }))
 return imported
 }

 function bulkImportQuestions(subjectId, rawText, type = 'mcq', chapter = '', medium = 'english') {
 const blocks = rawText.split('---').map(b => b.trim()).filter(Boolean)
 const imported = []
 blocks.forEach(block => {
 const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
 const get = (prefix) => {
 const line = lines.find(l => l.startsWith(prefix + ':'))
 return line ? line.slice(prefix.length + 1).trim() : ''
 }
 const text = get('Q')
 if (!text) return
 // Parse columns: LEFT: a|b|c RIGHT: x|y|z
 let leftColumn = [], rightColumn = []
 if (type === 'columns') {
 const leftRaw = get('LEFT')
 const rightRaw = get('RIGHT')
 leftColumn = leftRaw ? leftRaw.split('|').map(s => s.trim()) : []
 rightColumn = rightRaw ? rightRaw.split('|').map(s => s.trim()) : []
 }
 imported.push({
 id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
 subjectId, type,
 medium: get('MEDIUM') || medium,
 text,
 textUrdu: get('UR'),
 marks: Number(get('MARKS')) || 1,
 answer: get('ANS'),
 chapter: get('CHAP') || chapter,
 priority: get('PRI') || 'all',
 options: type === 'mcq'
 ? ['A', 'B', 'C', 'D'].map(label => ({ label, text: get(label), textUrdu: get(`UR${label}`) })).filter(o => o.text || o.textUrdu)
 : [],
 leftColumn,
 rightColumn,
 createdAt: new Date().toISOString(),
 })
 })
 update(s => ({ ...s, questions: [...s.questions, ...imported] }))
 return imported.length
 }

 //  Question Types 
 function addQuestionType({ label, labelUrdu = '', marks = 1 }) {
 const value = label.toLowerCase().trim().replace(/\s+/g, '_')
 const type = { value, label, labelUrdu, marks: Number(marks) }
 update(s => ({ ...s, questionTypes: [...(s.questionTypes || defaultStore.questionTypes), type] }))
 return type
 }

 function editQuestionType(value, changes) {
 update(s => ({ ...s, questionTypes: (s.questionTypes || defaultStore.questionTypes).map(t => t.value === value ? { ...t, ...changes } : t) }))
 }

 function deleteQuestionType(value) {
 update(s => ({ ...s, questionTypes: (s.questionTypes || defaultStore.questionTypes).filter(t => t.value !== value) }))
 }

 //  Saved Papers 
 function savePaper({ name, config, selectedMCQ, selectedShort, selectedLong, selectedQuestions = {}, ...rest }) {
    const paper = {
      id: `paper_${Date.now()}`,
      name: name || `Paper ${new Date().toLocaleDateString('en-GB')}`,
      config,
      selectedMCQ, selectedShort, selectedLong,
      selectedQuestions,
      ...rest,
      createdAt: new Date().toISOString(),
    }
    const success = update(s => ({ ...s, savedPapers: [paper, ...s.savedPapers] }))
    if (success) {
      notifyPaperSaved(paper)
      return paper
    }
    return null
  }

 function deleteSavedPaper(id) {
 update(s => ({ ...s, savedPapers: s.savedPapers.filter(p => p.id !== id) }))
 }

 function renameSavedPaper(id, name) {
 update(s => ({ ...s, savedPapers: s.savedPapers.map(p => p.id === id ? { ...p, name } : p) }))
 }

 //  Paper Settings 
 function updatePaperSettings(changes) {
 update(s => ({ ...s, paperSettings: { ...s.paperSettings, ...changes } }))
 }

 function addSchoolAccess(entry) {
 const next = {
 id: `school_${Date.now()}`,
 schoolCode: '',
 schoolName: '',
 contact: '',
 active: true,
 moduleAccess: { ...defaultStore.paperSettings.moduleAccess },
 note: '',
 ...entry,
 moduleAccess: entry?.moduleAccess && typeof entry.moduleAccess === 'object'
 ? entry.moduleAccess
 : { ...defaultStore.paperSettings.moduleAccess },
 createdAt: new Date().toISOString(),
 }
 update(s => ({
 ...s,
 paperSettings: {
 ...s.paperSettings,
 schoolAccess: [next, ...(Array.isArray(s.paperSettings.schoolAccess) ? s.paperSettings.schoolAccess : [])],
 },
 }))
 return next
 }

 function updateSchoolAccess(id, changes) {
 update(s => ({
 ...s,
 paperSettings: {
 ...s.paperSettings,
 schoolAccess: (Array.isArray(s.paperSettings.schoolAccess) ? s.paperSettings.schoolAccess : []).map(item => (
 String(item.id) === String(id) ? { ...item, ...changes } : item
 )),
 },
 }))
 }

 function removeSchoolAccess(id) {
 update(s => ({
 ...s,
 paperSettings: {
 ...s.paperSettings,
 schoolAccess: (Array.isArray(s.paperSettings.schoolAccess) ? s.paperSettings.schoolAccess : []).filter(item => String(item.id) !== String(id)),
 },
 }))
 }

 //  Selectors 
 
 function getFilteredQuestionTypes(subjectName) {
 const allTypes = globalStore.questionTypes || defaultStore.questionTypes;
 return getFilteredTypes(subjectName, allTypes);
 }

 function getQuestionsForPaper({ subjectName, classLevel, type, chapters = [], priority = 'all' }) {
 return globalStore.questions.filter(q => {
 const sub = globalStore.subjects.find(s => s.id === q.subjectId)
 if (!sub) return false
 const nameMatch = sub.name.toLowerCase() === subjectName?.toLowerCase()
 const classMatch = !classLevel || !sub.classLevel || classLevelsMatch(sub.classLevel, classLevel)
 const typeMatch = !type || q.type === type
 const chapterMatch = !chapters.length || chapters.includes(q.chapter) || !q.chapter
 const priMatch = priority === 'all' || !q.priority || q.priority === 'all' || q.priority === priority
 return nameMatch && classMatch && typeMatch && chapterMatch && priMatch
 })
 }

 function getChaptersForSubject(subjectName, classLevel) {
 return [...new Set(
 store.questions
 .filter(q => {
 const sub = store.subjects.find(s => s.id === q.subjectId)
 return sub &&
 sub.name.toLowerCase() === subjectName?.toLowerCase() &&
 (!classLevel || classLevelsMatch(sub.classLevel, classLevel)) &&
 q.chapter
 })
 .map(q => q.chapter)
 )].filter(Boolean).sort()
 }

 function loadSampleData() {
 update(s => ({ ...s }))
 }

 return {
 subjects: store.subjects,
 questions: store.questions,
 savedPapers: store.savedPapers,
 paperSettings: store.paperSettings,
 questionTypes: store.questionTypes || defaultStore.questionTypes,
 addSubject, editSubject, deleteSubject,
 findSubjectByIdentity, ensureSubject,
 addQuestion, editQuestion, deleteQuestion, bulkImportQuestions, bulkAddQuestions,
 importPaperQuestionsToBank,
 addQuestionType, editQuestionType, deleteQuestionType,
 savePaper, deleteSavedPaper, renameSavedPaper,
 updatePaperSettings,
 addSchoolAccess,
 updateSchoolAccess,
 removeSchoolAccess,
 getQuestionsForPaper,
 getChaptersForSubject,
 getFilteredQuestionTypes,
 loadSampleData,
 }
}
