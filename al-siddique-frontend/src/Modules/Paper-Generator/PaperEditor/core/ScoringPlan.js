import { AttemptRule, AttemptRuleOrigin } from '../../PaperEditor/core/PaperDocumentV2.js'

const text = value => String(value ?? '').trim()

function integerOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function positiveMarksOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizedRule(section = {}) {
  const raw = text(section.attemptRule || section.scoringRule || section.choiceMode)
    .toUpperCase()
    .replace(/[ -]+/g, '_')
  if (raw === 'ATTEMPT_ANY' || raw === 'ANY') return AttemptRule.ATTEMPT_ANY
  if (raw === 'CHOICE_GROUP' || raw === 'OR' || raw === 'OR_CHOICE') return AttemptRule.CHOICE_GROUP
  if (raw === 'ALL') return AttemptRule.ALL

  const actual = integerOrNull(section.actualItemCount ?? section.availableItemCount ?? section.itemCount)
  const attempt = integerOrNull(section.attemptCount ?? section.requiredItemCount)
  if (actual && attempt && attempt < actual) return AttemptRule.ATTEMPT_ANY
  return AttemptRule.ALL
}

function normalizeChoiceMode(value, fallback = 'ALL') {
  const raw = text(value).toUpperCase().replace(/[ -]+/g, '_')
  if (raw === 'ATTEMPT_ANY' || raw === 'ANY') return 'ATTEMPT_ANY'
  if (raw === 'CHOICE_GROUP' || raw === 'OR' || raw === 'OR_CHOICE') return 'OR'
  if (raw === 'ALL') return 'ALL'
  return fallback
}

function resolveChoiceGroupNode(group = {}, path = 'choice') {
  const childrenInput = Array.isArray(group.children) ? group.children
    : Array.isArray(group.groups) ? group.groups
      : Array.isArray(group.options) ? group.options
        : []
  const mode = normalizeChoiceMode(group.mode || group.attemptRule || group.choiceMode)
  const explicitMaximum = positiveMarksOrNull(group.maximumObtainableMarks ?? group.maxObtainableMarks)
  const explicitAvailable = positiveMarksOrNull(group.listedPotentialItemMarksTotal ?? group.availableItemMarksTotal)
  const errors = []

  if (childrenInput.length) {
    const children = childrenInput.map((child, index) => resolveChoiceGroupNode(child, path + '.' + (index + 1)))
    for (const child of children) errors.push(...(child.errors || []))

    const availableItemCount = children.length
    let attemptCount = integerOrNull(group.attemptCount ?? group.requiredItemCount)
    if (mode === 'ALL') attemptCount = availableItemCount
    else if (mode === 'OR') attemptCount = attemptCount || 1
    else if (!attemptCount) errors.push(path + ': attempt count is required for ATTEMPT_ANY')

    if (attemptCount && attemptCount > availableItemCount) {
      errors.push(path + ': attempt count cannot exceed available alternatives')
    }

    const childMaxima = children.map(child => Number(child.maximumObtainableMarks) || 0)
    const childAvailable = children.map(child => Number(child.listedPotentialItemMarksTotal) || 0)
    const listedPotentialItemMarksTotal = explicitAvailable ?? childAvailable.reduce((sum, value) => sum + value, 0)

    let maximumObtainableMarks = explicitMaximum ?? 0
    if (!explicitMaximum) {
      if (mode === 'ALL') maximumObtainableMarks = childMaxima.reduce((sum, value) => sum + value, 0)
      else if (attemptCount && attemptCount <= availableItemCount) {
        maximumObtainableMarks = [...childMaxima].sort((a, b) => b - a).slice(0, attemptCount).reduce((sum, value) => sum + value, 0)
      }
    }
    if (!(maximumObtainableMarks > 0)) errors.push(path + ': maximum obtainable marks cannot be resolved')

    return {
      id: text(group.id) || path.replace(/[^a-z0-9_-]+/gi, '-'),
      mode,
      availableItemCount,
      attemptCount,
      marksPerItem: null,
      maximumObtainableMarks,
      listedPotentialItemMarksTotal,
      children,
      errors,
    }
  }

  let actualItemCount = integerOrNull(group.actualItemCount ?? group.availableItemCount ?? group.itemCount)
  let attemptCount = integerOrNull(group.attemptCount ?? group.requiredItemCount)
  const marksPerItem = positiveMarksOrNull(group.marksPerItem ?? group.itemMarks ?? group.eachMarks)

  if (mode === 'ALL') {
    actualItemCount = actualItemCount || 1
    attemptCount = actualItemCount
  } else {
    if (!actualItemCount) errors.push(path + ': available item count is required for ' + mode)
    if (!attemptCount) attemptCount = mode === 'OR' ? 1 : null
    if (!attemptCount) errors.push(path + ': attempt count is required for ' + mode)
    if (actualItemCount && attemptCount && attemptCount > actualItemCount) {
      errors.push(path + ': attempt count cannot exceed available item count')
    }
  }

  let maximumObtainableMarks = explicitMaximum ?? 0
  if (!explicitMaximum && marksPerItem && attemptCount && (!actualItemCount || attemptCount <= actualItemCount)) {
    maximumObtainableMarks = attemptCount * marksPerItem
  }
  if (!(maximumObtainableMarks > 0)) errors.push(path + ': maximum obtainable marks cannot be resolved')

  const listedPotentialItemMarksTotal = explicitAvailable
    ?? (marksPerItem && actualItemCount ? marksPerItem * actualItemCount : maximumObtainableMarks)

  return {
    id: text(group.id) || path.replace(/[^a-z0-9_-]+/gi, '-'),
    mode,
    availableItemCount: actualItemCount,
    attemptCount,
    marksPerItem,
    maximumObtainableMarks,
    listedPotentialItemMarksTotal,
    children: [],
    errors,
  }
}

export function resolveManualSectionScoring(section = {}, fallbackMarks = 0, index = 0) {
  const nestedChoiceGroups = Array.isArray(section.nestedChoiceGroups) ? section.nestedChoiceGroups
    : Array.isArray(section.choiceGroups) ? section.choiceGroups
      : []

  if (nestedChoiceGroups.length) {
    const sectionKey = text(section.id) || String(index + 1)
    const rootMode = normalizeChoiceMode(section.nestedChoiceMode || section.choiceMode || section.attemptRule, 'ALL')
    const root = resolveChoiceGroupNode({
      id: text(section.choiceGroupId) || 'choice-' + sectionKey,
      mode: rootMode,
      attemptCount: section.attemptCount,
      maximumObtainableMarks: section.maximumObtainableMarks ?? section.maxObtainableMarks,
      listedPotentialItemMarksTotal: section.listedPotentialItemMarksTotal,
      children: nestedChoiceGroups,
    }, 'Section ' + (index + 1))

    const attemptRule = root.mode === 'ATTEMPT_ANY'
      ? AttemptRule.ATTEMPT_ANY
      : root.mode === 'OR'
        ? AttemptRule.CHOICE_GROUP
        : AttemptRule.ALL

    return {
      attemptRule,
      attemptRuleOrigin: AttemptRuleOrigin.TEACHER_EXPLICIT,
      actualItemCount: root.availableItemCount,
      attemptCount: root.attemptCount,
      marksPerItem: null,
      maximumObtainableMarks: root.maximumObtainableMarks,
      listedPotentialItemMarksTotal: root.listedPotentialItemMarksTotal,
      choiceGroup: { ...root, sectionId: 'manual-section-' + sectionKey },
      errors: root.errors || [],
    }
  }

  const attemptRule = normalizedRule(section)
  let actualItemCount = integerOrNull(section.actualItemCount ?? section.availableItemCount ?? section.itemCount)
  let attemptCount = integerOrNull(section.attemptCount ?? section.requiredItemCount)
  const marksPerItem = positiveMarksOrNull(section.marksPerItem ?? section.itemMarks ?? section.eachMarks)
  const explicitMaximum = positiveMarksOrNull(section.maximumObtainableMarks ?? section.maxObtainableMarks)
  const safeFallback = Number.isFinite(Number(fallbackMarks)) ? Math.max(0, Number(fallbackMarks)) : 0
  const errors = []

  if (attemptRule === AttemptRule.ALL) {
    actualItemCount = actualItemCount || 1
    attemptCount = actualItemCount
    const maximumObtainableMarks = explicitMaximum ?? (safeFallback > 0 ? safeFallback : (marksPerItem ? actualItemCount * marksPerItem : 0))
    const listedPotentialItemMarksTotal = marksPerItem ? actualItemCount * marksPerItem : maximumObtainableMarks
    return {
      attemptRule,
      attemptRuleOrigin: AttemptRuleOrigin.TEACHER_EXPLICIT,
      actualItemCount,
      attemptCount,
      marksPerItem,
      maximumObtainableMarks,
      listedPotentialItemMarksTotal,
      choiceGroup: null,
      errors,
    }
  }

  if (!actualItemCount) errors.push('Section ' + (index + 1) + ': available item count is required for ' + attemptRule)
  if (!attemptCount) errors.push('Section ' + (index + 1) + ': attempt count is required for ' + attemptRule)
  if (actualItemCount && attemptCount && attemptCount > actualItemCount) {
    errors.push('Section ' + (index + 1) + ': attempt count cannot exceed available item count')
  }

  const canCompute = Boolean(actualItemCount && attemptCount && marksPerItem && attemptCount <= actualItemCount)
  const computedMaximum = canCompute ? attemptCount * marksPerItem : null
  if (explicitMaximum && computedMaximum !== null && explicitMaximum !== computedMaximum) {
    errors.push('Section ' + (index + 1) + ': explicit maximum marks conflict with attempt rule')
  }

  const maximumObtainableMarks = explicitMaximum ?? computedMaximum ?? (safeFallback > 0 ? safeFallback : 0)
  if (!(maximumObtainableMarks > 0)) {
    errors.push('Section ' + (index + 1) + ': maximum obtainable marks cannot be resolved')
  }
  if (!marksPerItem && !explicitMaximum) {
    errors.push('Section ' + (index + 1) + ': marks per item are required for choice-aware scoring')
  }

  const listedPotentialItemMarksTotal = actualItemCount && marksPerItem
    ? actualItemCount * marksPerItem
    : Math.max(safeFallback, maximumObtainableMarks)

  const mode = attemptRule === AttemptRule.CHOICE_GROUP ? 'OR' : 'ATTEMPT_ANY'
  const sectionKey = text(section.id) || String(index + 1)
  return {
    attemptRule,
    attemptRuleOrigin: AttemptRuleOrigin.TEACHER_EXPLICIT,
    actualItemCount,
    attemptCount,
    marksPerItem,
    maximumObtainableMarks,
    listedPotentialItemMarksTotal,
    choiceGroup: {
      id: text(section.choiceGroupId) || 'choice-' + sectionKey,
      sectionId: 'manual-section-' + sectionKey,
      mode,
      availableItemCount: actualItemCount,
      attemptCount,
      marksPerItem,
      maximumObtainableMarks,
      listedPotentialItemMarksTotal,
    },
    errors,
  }
}

export function buildManualScoringPlan(sectionScoring = [], configuredTotal = 0) {
  const choiceGroups = sectionScoring.map(item => item.choiceGroup).filter(Boolean)
  const errors = sectionScoring.flatMap(item => item.errors || [])
  const maximumObtainableMarks = sectionScoring.reduce((sum, item) => sum + (Number(item.maximumObtainableMarks) || 0), 0)
  const availableItemMarksTotal = sectionScoring.reduce((sum, item) => sum + (Number(item.listedPotentialItemMarksTotal) || 0), 0)
  const headerTotal = Number.isFinite(Number(configuredTotal)) ? Math.max(0, Number(configuredTotal)) : 0
  const hasExplicitTotal = headerTotal > 0
  const headerBalanced = hasExplicitTotal ? headerTotal === maximumObtainableMarks : maximumObtainableMarks > 0
  const balanced = headerBalanced && errors.length === 0

  return {
    version: 3,
    strategy: choiceGroups.length ? 'CHOICE_AWARE' : 'ALL_SECTIONS',
    maximumObtainableMarks,
    availableItemMarksTotal,
    questionMarksTotal: maximumObtainableMarks,
    headerTotal: hasExplicitTotal ? headerTotal : null,
    headerBalanced,
    balanced,
    choiceGroups,
    errors,
  }
}
