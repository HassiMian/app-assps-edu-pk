'use strict'

// ASSPS / Core: grade bands with integer boundaries represent whole percentage
// points (e.g. 80-89 means [80,90), not [80,89] of raw fractional scores).
// Decimal-defined policy boundaries retain exact fractional semantics.
// This pure helper performs no DB writes, policy approval, or score mutation.
function selectGradeBand(percentage, bands) {
  if (typeof percentage !== 'number' || !Number.isFinite(percentage) ||
      percentage < 0 || percentage > 100 || !Array.isArray(bands) || !bands.length) return null

  const valid = bands.every(b => b && typeof b.from === 'number' &&
    typeof b.to === 'number' && Number.isFinite(b.from) && Number.isFinite(b.to) &&
    b.from >= 0 && b.to <= 100 && b.from <= b.to && typeof b.label === 'string')
  if (!valid) return null

  const useWholePercentagePoints = bands.every(b =>
    Number.isInteger(b.from) && Number.isInteger(b.to))
  const comparison = useWholePercentagePoints ? Math.floor(percentage) : percentage
  const matches = bands.filter(b => comparison >= b.from && comparison <= b.to)
  // Ambiguous or incomplete policies must never silently produce a grade.
  return matches.length === 1 ? matches[0] : null
}
module.exports = { selectGradeBand }
