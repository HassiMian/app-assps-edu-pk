import { useEffect, useMemo, useState } from 'react'
import api from './api'

let academicSetupInflight = null

async function fetchAcademicSetup() {
  if (!academicSetupInflight) {
    academicSetupInflight = api.get('/api/academic/setup', { skipCache:true }).finally(() => {
      academicSetupInflight = null
    })
  }
  return academicSetupInflight
}

const EMPTY_ACADEMIC = Object.freeze({
  periodsPerDay: null,
  localities: [],
  classes: [],
  subjects: [],
  sessionStart: '',
  sessionEnd: '',
})

const CLASS_LEVEL_ALIASES = {
 starter: ['starter', 'playgroup', 'play-group', 'play group', 'pg'],
 mover: ['mover', 'nursery'],
 flyer: ['flyer', 'prep', 'kg'],
 '9': ['9', 'nine', 'class 9', 'pre-nine', 'pre nine', 'prenine', '10', 'ten', 'class 10'],
 'pre-nine': ['9', 'nine', 'class 9', 'pre-nine', 'pre nine', 'prenine', '10', 'ten', 'class 10'],
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
 '9': 'Nine',
 'pre-nine': 'Nine',
 hifaz: 'Hifaz Class',
}

export const CANONICAL_CLASS_ORDER = ['starter','mover','flyer','1','2','3','4','5','6','7','8','9','pre-nine','hifaz']

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


function normalizeServerAcademic(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    periodsPerDay: Number.isInteger(Number(source.periodsPerDay)) ? Number(source.periodsPerDay) : null,
    localities: Array.isArray(source.localities) ? source.localities : [],
    classes: Array.isArray(source.classes) ? source.classes : [],
    subjects: Array.isArray(source.subjects) ? source.subjects : [],
    sessionStart: source.sessionStart || '',
    sessionEnd: source.sessionEnd || '',
  }

}

export function resolveAcademicReadPayload(payload = {}) {
  const isConfigured = payload?.configured === true
  const source = isConfigured ? payload?.data : (payload?.defaults || EMPTY_ACADEMIC)
  return {
    configured: isConfigured,
    data: normalizeServerAcademic(source),
    defaults: isConfigured ? null : (payload?.defaults || null),
  }
}

export function useAcademicStore() {
  const [data, setData] = useState(EMPTY_ACADEMIC)
  const [defaults, setDefaults] = useState(null)
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refreshAcademic() {
    setLoading(true)
    setError('')
    try {
      const response = await fetchAcademicSetup()
      if (response.data?.success === false) throw new Error(response.data?.message || 'Academic setup could not be loaded.')
      const resolved = resolveAcademicReadPayload(response.data)
      setData(resolved.data)
      setConfigured(resolved.configured)
      setDefaults(resolved.defaults)
      return { success:true, configured:resolved.configured, data:resolved.data }
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Academic setup could not be loaded.'
      setData(EMPTY_ACADEMIC)
      setConfigured(false)
      setDefaults(null)
      setError(message)
      return { success:false, error:message }
    } finally {
      setLoading(false)
    }
  }

  async function updateAcademic(updates) {
    const candidate = {
      ...data,
      ...updates,
      classes: Array.isArray(updates?.classes) ? updates.classes : data.classes,
      subjects: Array.isArray(updates?.subjects) ? updates.subjects : data.subjects,
      localities: Array.isArray(updates?.localities) ? updates.localities : data.localities,
    }
    try {
      const response = await api.put('/api/academic/setup', candidate)
      if (response.data?.success === false || !response.data?.data) {
        throw new Error(response.data?.message || 'Academic setup could not be saved.')
      }
      const confirmed = normalizeServerAcademic(response.data.data)
      setData(confirmed)
      setConfigured(true)
      setDefaults(null)
      setError('')
      window.dispatchEvent(new CustomEvent('academic-setup:updated'))
      return { success:true, data:confirmed }
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Academic setup could not be saved.'
      setError(message)
      window.dispatchEvent(new CustomEvent('academic-setup:sync-error', { detail:{ message } }))
      return { success:false, error:message }
    }
  }

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (cancelled) return
      await refreshAcademic()
    }
    void hydrate()
    const handler = () => { if (!cancelled) void refreshAcademic() }
    window.addEventListener('academic-setup:refresh', handler)
    return () => {
      cancelled = true
      window.removeEventListener('academic-setup:refresh', handler)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeClasses = useMemo(() => data.classes.filter(c => c.active !== false), [data.classes])
  const classNames = useMemo(() => activeClasses.map(c => c.name), [activeClasses])
  const subjectNames = useMemo(() => data.subjects.map(s => s.name), [data.subjects])
  const periodsPerDay = Number.isInteger(Number(data.periodsPerDay))
    ? Math.min(12, Math.max(1, Number(data.periodsPerDay)))
    : 0
  const allSections = useMemo(() => ['All', ...new Set(activeClasses.flatMap(c => c.sections || []))], [activeClasses])

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
    localities: data.localities,
    classes: data.classes,
    activeClasses,
    subjects: data.subjects,
    classNames,
    subjectNames,
    periodsPerDay,
    sessionStart: data.sessionStart,
    sessionEnd: data.sessionEnd,
    allSections,
    subjectsForClass,
    sectionsForClass,
    updateAcademic,
    refreshAcademic,
    configured,
    defaults,
    loading,
    error,
  }
}
