// SavedPapersTab.jsx — Al Siddique Smart School OS

import { useState } from 'react'
import SavedPapersVisualV14 from './SavedPapersVisualV14'
import { usePaperStore } from './usePaperStore'
import { useAuth } from '../../context/AuthContext'
import { inferOfficialSectionKind, countOfficialMcqs, countNumberedItems } from './officialSectionSemantics.js'

function fmtDate(iso) {
 try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
 catch { return iso }
}

function categoryStats(paper = {}) {
 if (paper.schemaVersion === 2 || paper.schemaVersion === '2') {
  const sections = paper.sections || []
  let mcqCount = 0, shortCount = 0, longCount = 0, totalQuestions = 0
  sections.forEach(s => {
   const count = (s.questions || []).length
   totalQuestions += count
   if (s.type === 'mcq') mcqCount += count
   else if (s.type === 'short') shortCount += count
   else if (s.type === 'long') longCount += count
  })
  return {
   mcqCount,
   shortCount,
   longCount,
   totalQuestions,
   totalMarks: Number(paper.metadata?.totalMarks) || 0,
  }
 }
 if (paper.documentFormat === 'official-v12' || paper.documentFormat === 'pts-native-v13') {
  const sections = paper.documentFormat === 'pts-native-v13'
   ? (paper.official_section || paper.selectedQuestions?.official_section?.questions || [])
   : (Array.isArray(paper.sections) ? paper.sections : [])
  const mcqCount = sections.reduce((sum, section) => sum + countOfficialMcqs(section), 0)
  const shortCount = sections.reduce((sum, section) => {
   if (inferOfficialSectionKind(section) !== 'short') return sum
   return sum + Math.max(1, countNumberedItems(section.content))
  }, 0)
  const longCount = sections.filter(section => inferOfficialSectionKind(section) === 'long').length
  const totalQuestions = sections.reduce((sum, section) => {
   const kind = inferOfficialSectionKind(section)
   if (kind === 'marker') return sum
   if (kind === 'mcq') return sum + Math.max(1, countOfficialMcqs(section))
   return sum + Math.max(1, countNumberedItems(section.content))
  }, 0)
  return {
   mcqCount,
   shortCount,
   longCount,
   totalQuestions,
   totalMarks: Number(paper.config?.totalMarks) || 0,
  }
 }
 const legacy = {
 mcq: paper.selectedMCQ || [],
 short: paper.selectedShort || [],
 long: paper.selectedLong || [],
 }
 const byType = { ...legacy }
 Object.entries(paper.selectedQuestions || {}).forEach(([type, payload]) => {
 const questions = Array.isArray(payload) ? payload : (Array.isArray(payload?.questions) ? payload.questions : [])
 if (questions.length) byType[type] = questions
 })
 const totalQuestions = Object.values(byType).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)
 const totalMarks = Object.entries(byType).reduce((sum, [type, list]) => {
 const payload = paper.selectedQuestions?.[type]
 const fallbackMarks = Number(payload?.marks) || (type === 'mcq' ? 1 : type === 'long' ? 5 : 2)
 return sum + (Array.isArray(list) ? list.reduce((inner, q) => inner + (Number(q?.marks) || fallbackMarks), 0) : 0)
 }, 0)
 return {
 mcqCount: legacy.mcq.length,
 shortCount: legacy.short.length,
 longCount: legacy.long.length,
 totalQuestions,
 totalMarks,
 }
}

export default function SavedPapersTab({ onLoadPaper }) {
 const { savedPapers, deleteSavedPaper, renameSavedPaper } = usePaperStore()
 const { isTeacher } = useAuth()
 const [renaming, setRenaming] = useState(null) // paper id
 const [renameVal, setRenameVal] = useState('')
 const [search, setSearch] = useState('')
 const [confirmDelete, setConfirmDelete] = useState(null)

 const filtered = savedPapers.filter(p => {
 // Role-based visibility
 if (isTeacher && p.teacherHidden) return false

 const nameMatch = !search || p.name?.toLowerCase()?.includes(search.toLowerCase())
 const subMatch = p.config?.subject?.toLowerCase()?.includes(search.toLowerCase())
 const clsMatch = p.config?.classLevel?.toLowerCase()?.includes(search.toLowerCase())
 return nameMatch || subMatch || clsMatch
 })

 function startRename(paper) {
 setRenaming(paper.id)
 setRenameVal(paper.name)
 }

 function submitRename() {
 if (renameVal.trim()) renameSavedPaper(renaming, renameVal.trim())
 setRenaming(null)
 }
 return <SavedPapersVisualV14
   savedPapers={savedPapers} filtered={filtered} search={search} setSearch={setSearch}
   categoryStats={categoryStats} fmtDate={fmtDate}
   renaming={renaming} renameVal={renameVal} setRenameVal={setRenameVal} setRenaming={setRenaming}
   startRename={startRename} submitRename={submitRename}
   confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
   deleteSavedPaper={deleteSavedPaper} onLoadPaper={onLoadPaper}
 />
}