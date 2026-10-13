'use strict'

// Missing/pending/absent are NOT numeric zero. Never coerce null or empty to 0.
function parseExactMarksNumber(value) {
  if(typeof value==='number') return Number.isFinite(value)?value:NaN
  if(typeof value!=='string') return NaN
  const text=value.trim()
  if(!/^\d+(?:\.\d+)?$/.test(text)) return NaN
  const number=Number(text)
  return Number.isFinite(number)?number:NaN
}
module.exports={parseExactMarksNumber}
