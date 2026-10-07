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

export function resolveManualSectionScoring(section = {}, fallbackMarks = 0, index = 0) {
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
    version: 2,
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
