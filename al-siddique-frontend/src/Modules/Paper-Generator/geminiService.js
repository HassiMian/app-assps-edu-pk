import api from '../../services/api'

// geminiService.js — frontend wrapper around the backend AI pipeline
export const MODEL_OPTIONS = [
 { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Stable)', free: true },
 { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: false },
 { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true },
 { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Free & Fast)', free: true },
]

export const DEFAULT_MODEL = 'gemini-2.5-flash'

export function normalizePreferredModel(model) {
 const value = String(model || '').trim()
 return MODEL_OPTIONS.some(option => option.id === value) ? value : DEFAULT_MODEL
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function normalizeQuestionItem(q = {}, fallbackType = 'short') {
 return {
 id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
 type: q.type || fallbackType,
 text: q.text || q.question || '',
 textUrdu: q.textUrdu || q.ur || '',
 options: Array.isArray(q.options) ? q.options.map(o => ({
 label: o.label || '',
 text: o.text || o.en || '',
 textUrdu: o.textUrdu || o.ur || '',
 })) : [],
 answer: q.answer || '',
 marks: Number(q.marks || (fallbackType === 'mcq' ? 1 : fallbackType === 'short' ? 2 : 5)),
 chapter: q.chapter || '',
 priority: q.priority || 'exercise',
 difficulty: q.difficulty || 'medium',
 language: q.language || 'mixed',
 sourcePage: q.sourcePage || '',
 confidence: Number.isFinite(Number(q.confidence)) ? Number(q.confidence) : 0,
 }
}

function normalizeQuestionList(list = []) {
 return Array.isArray(list) ? list.map(q => normalizeQuestionItem(q, q.type || 'short')) : []
}

function normalizeScannerResult(result = {}) {
 const sections = Array.isArray(result.sections) ? result.sections : []
 const legacy = { mcq: [], short: [], long: [] }

 sections.forEach(section => {
 const bucket = section.type === 'mcq' ? 'mcq' : section.type === 'long' ? 'long' : 'short'
 ;(section.questions || []).forEach(q => {
 const normalized = normalizeQuestionItem(q, bucket)
 legacy[bucket].push({
 ...normalized,
 marks: Number(normalized.marks || (bucket === 'mcq' ? 1 : bucket === 'short' ? 2 : 5)),
 })
 })
 })

 if (!sections.length) {
 legacy.mcq = normalizeQuestionList(result.mcq || [])
 legacy.short = normalizeQuestionList(result.short || [])
 legacy.long = normalizeQuestionList(result.long || [])
 }

 return {
 ...result,
 sections,
 warnings: Array.isArray(result.warnings) ? result.warnings : [],
 mcq: legacy.mcq,
 short: legacy.short,
 long: legacy.long,
 }
}

async function waitForJob(jobId, onProgress, timeoutMs = 10 * 60 * 1000) {
 const startedAt = Date.now()
 let delay = 800

 while (Date.now() - startedAt < timeoutMs) {
 const { data } = await api.get(`/api/paper/jobs/${jobId}`)
 const job = data?.job || data
 if (job?.status === 'completed') return job
 if (job?.status === 'failed') {
 throw new Error(job.error?.message || job.message || 'AI job failed.')
 }

 onProgress?.(job?.message || 'Processing...', Number(job?.progress || 0))
 await sleep(delay)
 delay = Math.min(Math.round(delay * 1.25), 2500)
 }

 throw new Error('AI job timed out. Please retry.')
}

async function postWithFallback(paths, body, options = {}) {
 let lastError = null
 for (const path of paths) {
 try {
 return await api.post(path, body, options)
 } catch (error) {
 lastError = error
 const status = error?.response?.status
 if (status && status !== 404) break
 }
 }
 throw lastError || new Error('Request failed.')
}

function toFormData(fields = {}, files = []) {
 const form = new FormData()
 Object.entries(fields).forEach(([key, value]) => {
 if (value === undefined || value === null || value === '') return
 form.append(key, String(value))
 })
 ;(Array.isArray(files) ? files : [files]).filter(Boolean).forEach((file) => {
 form.append('files', file, file.name || 'upload')
 })
 return form
}

export async function scanHandwrittenPaper(config, imageFiles, onProgress, preferredModel = DEFAULT_MODEL) {
 const model = normalizePreferredModel(preferredModel)
 onProgress?.('Preparing image files...', 10)

 const form = toFormData({
 classLevel: config?.classLevel || '',
 class: config?.classLevel || '',
 subject: config?.subject || '',
 examType: config?.examType || '',
 language: config?.language || 'mixed',
 paperTitle: config?.paperTitle || '',
 chapterNumber: config?.chapterNumber || '',
 chapterName: config?.chapterName || '',
 preferredModel: model,
 model,
 }, imageFiles)

 const { data } = await api.post('/api/paper/scan-handwritten', form)
 if (data?.jobId) {
 const job = await waitForJob(data.jobId, onProgress)
 return normalizeScannerResult(job?.result || {})
 }

 return normalizeScannerResult(data?.job?.result || data?.result || data || {})
}

export async function extractQuestionsFromFile(config, file, pastedText, onProgress, preferredModel = DEFAULT_MODEL) {
 const model = normalizePreferredModel(preferredModel)
 const subject = config?.subject || ''
 const classLevel = config?.classLevel || ''
 const medium = config?.medium || 'english'
 const chapterNumber = config?.chapterNumber || ''
 const chapterName = config?.chapterName || ''

 if (file && String(file.name || '').toLowerCase().endsWith('.txt')) {
 const text = await file.text()
 return extractQuestionsFromFile(config, null, text, onProgress, model)
 }

 const body = {
 subject,
 classLevel,
 medium,
 chapterNumber,
 chapterName,
 defaultCategory: config?.defaultCategory || '',
 questionTypes: config?.questionTypes || [],
 structureMode: config?.structureMode || 'standard',
 preferredModel: model,
 model,
 }

 if (file) {
 onProgress?.('Uploading file to the AI queue...', 10)
 const form = toFormData(body, file)
 const { data } = await api.post('/api/paper/extract-questions', form)
 if (data?.jobId) {
 const job = await waitForJob(data.jobId, onProgress)
 if (job?.result?.structureMode === 'board_pattern') return job.result;
 return normalizeQuestionList(job?.result?.questions || job?.result || [])
 }
 if (data?.job?.result?.structureMode === 'board_pattern' || data?.result?.structureMode === 'board_pattern') return data?.job?.result || data?.result;
 return normalizeQuestionList(data?.job?.result?.questions || data?.result?.questions || data?.questions || [])
 }

 if (pastedText && String(pastedText).trim()) {
 onProgress?.('Submitting pasted text to the AI queue...', 10)
 const { data } = await api.post('/api/paper/extract-questions', {
 ...body,
 text: String(pastedText).trim(),
 })
 if (data?.jobId) {
 const job = await waitForJob(data.jobId, onProgress)
 if (job?.result?.structureMode === 'board_pattern') return job.result;
 return normalizeQuestionList(job?.result?.questions || job?.result || [])
 }
 if (data?.job?.result?.structureMode === 'board_pattern' || data?.result?.structureMode === 'board_pattern') return data?.job?.result || data?.result;
 return normalizeQuestionList(data?.job?.result?.questions || data?.result?.questions || data?.questions || [])
 }

 return []
}

export async function generateWithGemini(config, preferredModel = DEFAULT_MODEL) {
 const model = normalizePreferredModel(preferredModel)
 const { data } = await api.post('/api/paper/generate', {
 class: config?.classLevel || '',
 subject: config?.subject || '',
 chapters: config?.chapters || [],
 mcqCount: Number(config?.mcqCount || 0),
 shortCount: Number(config?.shortCount || 0),
 longCount: Number(config?.longCount || 0),
 categories: config?.categories || [],
 instructions: config?.instructions || '',
 language: config?.medium || 'english',
 preferredModel: model,
 })
 const result = {
 mcq: normalizeQuestionList(data?.mcq || data?.result?.mcq || []),
 short: normalizeQuestionList(data?.short || data?.result?.short || []),
 long: normalizeQuestionList(data?.long || data?.result?.long || []),
 }
 ;(config?.categories || []).forEach(cat => {
 const id = cat.id || cat.value
 if (!id || result[id]) return
 const section = Array.isArray(data?.sections) ? data.sections.find(s => s.type === id) : null
 result[id] = normalizeQuestionList(data?.[id] || data?.result?.[id] || section?.questions || [])
 })

 return {
 result,
 model: data?.model || model,
 }
}

export async function getAiConfig() {
 const { data } = await api.get('/api/paper/ai/config')
 return data
}

export async function testAiConnection(preferredModel = DEFAULT_MODEL) {
 const { data } = await postWithFallback([
 '/api/paper/ai/test-key',
 '/api/paper/test-key',
 '/api/admin/paper/ai/test-key',
 ], {
 preferredModel: normalizePreferredModel(preferredModel),
 })
 return {
 success: true,
 message: data?.message || 'Connected successfully!',
 model: data?.model || normalizePreferredModel(preferredModel),
 }
}

export async function getPaperAiJobs(limit = 6) {
 const { data } = await api.get('/api/paper/jobs', {
 params: { limit: Math.max(1, Math.min(Number(limit || 6), 100)) },
 })
 return {
 jobs: Array.isArray(data?.jobs) ? data.jobs : [],
 count: Number(data?.count || 0),
 }
}

export async function retryPaperAiJob(jobId) {
 const { data } = await api.post(`/api/paper/jobs/${jobId}/retry`)
 return data?.job || null
}

export async function cancelPaperAiJob(jobId) {
 const { data } = await api.post(`/api/paper/jobs/${jobId}/cancel`)
 return data?.job || null
}

export async function deletePaperAiJob(jobId) {
 const { data } = await api.delete(`/api/paper/jobs/${jobId}`)
 return data?.job || null
}

export async function clearPaperAiJobs() {
 const { data } = await api.delete('/api/paper/jobs')
 return data || null
}

export async function clearPaperAiQueueEvents() {
 const { data } = await api.delete('/api/paper/jobs/events')
 return data || null
}

export async function getPaperAiQueueState() {
 const { data } = await api.get('/api/paper/jobs/queue/state')
 return data || null
}

export async function getPaperAiQueueEvents(limit = 10) {
 const { data } = await api.get('/api/paper/jobs/events', { params: { limit } })
 return data || null
}

export async function pausePaperAiQueue() {
 const { data } = await api.post('/api/paper/jobs/queue/pause')
 return data || null
}

export async function resumePaperAiQueue() {
 const { data } = await api.post('/api/paper/jobs/queue/resume')
 return data || null
}
