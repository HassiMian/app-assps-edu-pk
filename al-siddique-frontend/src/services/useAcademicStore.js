import { useState, useEffect } from 'react'
import api from './api'

const AK = 'al_siddique_academic'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

const DEFAULT_ACADEMIC = {
 localities: ['Rayya Khas', 'Tharpal Sharif', 'Garoowal', 'Matteke', 'Fattoke', 'Jeewan Bhinder', 'Kulla Mandiala', 'Baddomalhi', 'Narowal', 'Lahore'],
 classes: [
 { level: 'starter', name: 'Starter', active: true, sections: ['Blue'] },
 { level: 'mover', name: 'Mover', active: true, sections: ['Blue'] },
 { level: 'flyer', name: 'Flyer', active: true, sections: ['Blue'] },
 { level: '1', name: 'One', active: true, sections: ['Blue'] },
 { level: '2', name: 'Two', active: true, sections: ['Blue'] },
 { level: '3', name: 'Three', active: true, sections: ['Blue'] },
 { level: '4', name: 'Four', active: true, sections: ['Blue'] },
 { level: '5', name: 'Five', active: true, sections: ['Blue'] },
 { level: '6', name: 'Six', active: true, sections: ['Blue'] },
 { level: '7', name: 'Seven', active: true, sections: ['Blue'] },
 { level: '8', name: 'Eight', active: true, sections: ['Blue'] },
 { level: 'pre-nine', name: 'Pre Nine', active: true, sections: ['Fatima','Usman','Blue'] },
 { level: 'hifaz', name: 'Hifaz Class', active: true, sections: ['Abubakar'] },
 ],
 subjects: [
 { id: 'sb1', name: 'Mathematics', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine'] },
 { id: 'sb2', name: 'English', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine'] },
 { id: 'sb3', name: 'Urdu', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine'] },
 { id: 'sb4', name: 'Science', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8'] },
 { id: 'sb5', name: 'Islamiyat', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine'] },
 { id: 'sb6', name: 'Social Studies', classes: ['1','2','3','4','5','6','7','8'] },
 { id: 'sb7', name: 'Computer', classes: ['5','6','7','8','pre-nine'] },
 { id: 'sb8', name: 'Physics', classes: ['pre-nine'] },
 { id: 'sb9', name: 'Chemistry', classes: ['pre-nine'] },
 { id: 'sb10', name: 'Biology', classes: ['pre-nine'] },
 { id: 'sb11', name: 'General Science', classes: ['pre-nine'] },
 { id: 'sb12', name: 'Quran / Nazra', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine','hifaz'] },
 { id: 'sb13', name: 'General Knowledge', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8'] },
 { id: 'sb14', name: 'GK', classes: ['starter','mover','flyer','1','2','3','4','5','6','7','8'] },
 ],
}

const CLASS_LEVEL_ALIASES = {
 starter: ['starter', 'playgroup', 'play-group', 'play group', 'pg'],
 mover: ['mover', 'nursery'],
 flyer: ['flyer', 'prep', 'kg'],
 'pre-nine': ['pre-nine', 'pre nine', 'prenine', '9', '10', 'nine', 'ten', 'class 9', 'class 10'],
 hifaz: ['hifaz', 'hifaz class', 'hifz'],
}

const CLASS_LEVEL_LABELS = {
 starter: 'Starter',
 mover: 'Mover',
 flyer: 'Flyer',
 '1': 'One',
 '2': 'Two',
 '3': 'Three',
 '4': 'Four',
 '5': 'Five',
 '6': 'Six',
 '7': 'Seven',
 '8': 'Eight',
 'pre-nine': 'Pre Nine',
 hifaz: 'Hifaz Class',
}

export const CANONICAL_CLASS_ORDER = ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine','hifaz']

function cleanClassLevel(value) {
 return String(value || '').trim().toLowerCase()
}

export function normalizeClassLevel(value) {
 const clean = cleanClassLevel(value)
 if (!clean) return ''
 const classNumber = clean.match(/^class\s+([1-8])$/)
 if (classNumber) return classNumber[1]
 const byLabel = Object.entries(CLASS_LEVEL_LABELS).find(([, label]) => cleanClassLevel(label) === clean)
 if (byLabel) return byLabel[0]
 const aliasHit = Object.entries(CLASS_LEVEL_ALIASES).find(([, aliases]) => aliases.includes(clean))
 if (aliasHit) return aliasHit[0]
 return clean
}

export function equivalentClassLevels(value) {
 const canonical = normalizeClassLevel(value)
 if (!canonical) return []
 return [...new Set([canonical, ...(CLASS_LEVEL_ALIASES[canonical] || [])].map(normalizeClassLevel).filter(Boolean))]
}

export function classLevelsMatch(a, b) {
 if (!a || !b) return true
 const left = equivalentClassLevels(a)
 const right = equivalentClassLevels(b)
 return left.some(level => right.includes(level))
}

export function classLevelLabel(value) {
 const canonical = normalizeClassLevel(value)
 return CLASS_LEVEL_LABELS[canonical] || String(value || '')
}

export function sortClassLevels(levels = []) {
 return [...levels].sort((a, b) => {
 const ia = CANONICAL_CLASS_ORDER.indexOf(normalizeClassLevel(a))
 const ib = CANONICAL_CLASS_ORDER.indexOf(normalizeClassLevel(b))
 const sa = ia === -1 ? 999 : ia
 const sb = ib === -1 ? 999 : ib
 return sa - sb || String(a).localeCompare(String(b))
 })
}

const REAL_CLASS_NAMES = DEFAULT_ACADEMIC.classes.map(cls => cls.name)

function isLegacyDefaultClass(cls) {
 const name = String(cls?.name || '')
 return !REAL_CLASS_NAMES.includes(name) || ['Nursery', 'KG', 'Play Group', 'Prep'].includes(name) || /^Class\s+\d+$/i.test(name)
}

function mergeByName(defaultItems, savedItems = []) {
  if (Array.isArray(savedItems) && savedItems.length > 0) {
    return savedItems.map((item, idx) => ({
      level: String(item.level || `c_${idx + 1}`),
      name: String(item.name || `Class ${idx + 1}`).trim(),
      active: item.active !== false,
      sections: Array.isArray(item.sections) && item.sections.length > 0 ? item.sections : ['Blue'],
    }))
  }
  return defaultItems
}

function load() {
 try {
 const raw = getStorage()?.getItem(AK)
 if (!raw) return DEFAULT_ACADEMIC
 const saved = JSON.parse(raw)
 const localities = Array.isArray(saved.localities) ? [...new Set([...DEFAULT_ACADEMIC.localities, ...saved.localities])] : DEFAULT_ACADEMIC.localities
 const classes = Array.isArray(saved.classes) ? mergeByName(DEFAULT_ACADEMIC.classes, saved.classes) : DEFAULT_ACADEMIC.classes
 const subjects = Array.isArray(saved.subjects) ? saved.subjects : DEFAULT_ACADEMIC.subjects
 return {
 localities,
 classes,
 subjects,
 }
 } catch { return DEFAULT_ACADEMIC }
}

function normalizeApiClass(item, index) {
 const name = String(item?.name || item?.class_name || item?.label || '').trim()
 if (!name) return null
 const level = normalizeClassLevel(item?.level || item?.class_level || item?.id || name || index)
 const sections = Array.isArray(item?.sections)
 ? item.sections
 : item?.section
 ? [item.section]
 : item?.section_name
 ? [item.section_name]
 : []

 return {
 level: level || String(index + 1),
 name,
 active: item?.active !== false,
 sections,
 }
}

function mergeLiveAcademic(localData, liveClasses) {
  if (!Array.isArray(liveClasses) || !liveClasses.length) return localData

  const baseClasses = Array.isArray(localData.classes) ? [...localData.classes] : []
  liveClasses.forEach((item, index) => {
    const normalized = normalizeApiClass(item, index)
    if (!normalized) return
    const match = baseClasses.find(c => String(c.level) === String(normalized.level) || c.name.toLowerCase() === normalized.name.toLowerCase())
    if (match) {
      match.sections = [...new Set([...(match.sections || []), ...(normalized.sections || [])])]
    }
  })

  return { ...localData, classes: baseClasses }
}

function classesFromStudents(students = []) {
 const classMap = new Map()
 students.forEach((student, index) => {
 const rawClass = student?.class || student?.class_name || student?.className || student?.class_level || student?.grade
 const name = String(rawClass || '').trim()
 if (!name) return
 const level = normalizeClassLevel(name) || String(index + 1)
 const section = String(student?.section || student?.section_name || '').trim()
 const key = `${level}:${name}`.toLowerCase()
 const existing = classMap.get(key) || { level, name: classLevelLabel(level) || name, active: true, sections: [] }
 if (section && !existing.sections.includes(section)) existing.sections.push(section)
 classMap.set(key, existing)
 })
 return Array.from(classMap.values())
}

export function useAcademicStore() {
 const [data, setData] = useState(load)

  function updateAcademic(updates) {
    setData(prev => {
      const next = {
        ...prev,
        ...updates,
        classes: Array.isArray(updates.classes) ? updates.classes : prev.classes,
      }
      const storage = getStorage()
      try { storage?.setItem(AK, JSON.stringify(next)) } catch {}
      window.dispatchEvent(new Event('storage'))
      return next
    })
  }

 useEffect(() => {
 let cancelled = false

 async function hydrate() {
 const localData = load()
 if (!cancelled) setData(localData)
 try {
 const response = await api.get('/api/students')
 const students = Array.isArray(response.data?.data) ? response.data.data : []
 const derivedClasses = classesFromStudents(students)
 if (!cancelled) setData(mergeLiveAcademic(localData, derivedClasses))
 } catch {
 if (!cancelled) setData(localData)
 }
 }

 void hydrate()

 const handler = () => {
 void hydrate()
 }
 window.addEventListener('storage', handler)
 return () => {
 cancelled = true
 window.removeEventListener('storage', handler)
 }
 }, [])

 const activeClasses = data.classes.filter(c => c.active)
 
 // Convenient arrays for dropdowns and UI components
 const classNames = activeClasses.map(c => c.name)
 const subjectNames = data.subjects.map(s => s.name)
 const allSections = ['All', ...new Set(activeClasses.flatMap(c => c.sections || []))]

 function subjectsForClass(classIdentifier) {
 if (!classIdentifier) return subjectNames
 const targetClass = data.classes.find(c => String(c.level) === String(classIdentifier) || c.name === classIdentifier)
 const levelToSearch = targetClass ? String(targetClass.level) : String(classIdentifier)
 const compatibleLevels = equivalentClassLevels(levelToSearch)
 
 const matched = data.subjects
 .filter(s => (Array.isArray(s.classes) ? s.classes : []).some(level => compatibleLevels.includes(normalizeClassLevel(level))))
 .map(s => s.name)
 
 return matched.length > 0 ? matched : subjectNames
 }

 function sectionsForClass(className) {
 const target = activeClasses.find(c => c.name === className)
 return target?.sections?.length ? target.sections : []
 }

 return { 
 localities: data.localities || [],
 classes: data.classes, 
 activeClasses, 
 subjects: data.subjects, 
 classNames,
 subjectNames,
 allSections,
 subjectsForClass,
 sectionsForClass,
 updateAcademic
 }
}
