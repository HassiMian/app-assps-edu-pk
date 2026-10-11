// Historical unused Question Bank UI helpers preserved for future workflow reference.
export const TYPE_GROUP_COLOR = {
 objective: '#0A84FF',
 subjective: '#30D158',
 science: '#64D2FF',
 urdu: '#BF5AF2',
 english: '#FF9F0A',
}

export const AI_MESSAGES = [
 'Analyzing document structure...',
 'Reading all chapters and sections...',
 'Identifying MCQ questions...',
 'Extracting short answer questions...',
 'Finding fill-in-the-blank items...',
 'Detecting True/False statements...',
 'Processing match-the-column exercises...',
 'Classifying exercise vs past paper questions...',
 'Adding chapter and priority tags...',
 'Organizing final question bank...',
]

export function readFileAsBase64(file) {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = ev => resolve(ev.target.result.split(',')[1])
 reader.onerror = reject
 reader.readAsDataURL(file)
 })
}

export function readFileAsText(file) {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = ev => resolve(ev.target.result)
 reader.onerror = reject
 reader.readAsText(file)
 })
}
