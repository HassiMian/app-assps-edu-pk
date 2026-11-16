/**
 * Explicit, tenant-supplied academic grade bands. There is NO universal pass
 * threshold across schools. If the school cannot verify its band configuration,
 * a result remains unverified rather than being guessed from a hard-coded 50%.
 */
export function normalizeGradeBands(input) {
 if (!Array.isArray(input) || !input.length) return null
 const rows=input.map(row=>{
   const rawFrom=row?.from ?? row?.min_percentage
   const rawTo=row?.to ?? row?.max_percentage
   return {
    label:String(row?.label||'').trim(),
    from:rawFrom===null||rawFrom===undefined||rawFrom===''?NaN:Number(rawFrom),
    to:rawTo===null||rawTo===undefined||rawTo===''?NaN:Number(rawTo)
   }
 }).sort((a,b)=>a.from-b.from)
 if (rows.some(r=>!r.label || !Number.isSafeInteger(r.from) ||
     !Number.isSafeInteger(r.to) || r.from<0 || r.to>100 || r.from>r.to))return null
 if (rows[0].from!==0 || rows[rows.length-1].to!==100)return null
 for(let i=1;i<rows.length;i++)if(rows[i].from!==rows[i-1].to+1)return null
 const failed=rows.filter(r=>r.label.toUpperCase()==='F')
 if(failed.length!==1 || failed[0].from!==0 || failed[0].to>=100)return null
 return rows
}
export function gradeForPercentage(pct,bands){
 const rows=normalizeGradeBands(bands)
 if(pct===null || pct===undefined || pct==='')return null
 const score=Number(pct)
 if(!rows || !Number.isFinite(score) || score<0 || score>100)return null
 const whole=Math.floor(score)
 return rows.find(r=>whole>=r.from && whole<=r.to)?.label||null
}
export function passingThreshold(bands){
 const rows=normalizeGradeBands(bands)
 if(!rows)return null
 return rows.find(r=>r.label.toUpperCase()==='F').to+1
}
export function gradeDisagreesWithPolicy(recorded,pct,bands){
 const expected=gradeForPercentage(pct,bands)
 if(!expected)return null
 const existing=String(recorded||'').trim()
 if(!existing || existing==='—')return null
 return existing.toUpperCase()!==expected.toUpperCase()
}
/**
 * A teacher-facing print attempt can proceed only when the server returned an
 * explicit school policy and no saved subject grade contradicts that policy.
 * This does not replace independent roster or principal release approval.
 */
export function mayPrintUnderGradePolicy(cards,school){
 if(!school?.gradePolicyVerified || !normalizeGradeBands(school?.gradeBands))return false
 if(!Array.isArray(cards)||cards.length===0)return false
 return cards.every(card=>card?.result?.gradePolicyVerified===true &&
   card.result.gradeMismatchCount===0 &&
   Number.isFinite(Number(card.result.totalMarks)) &&
   Number(card.result.totalMarks)>0 &&
   card.result.obtainedMarks!==null &&
   card.result.obtainedMarks!==undefined &&
   Number.isFinite(Number(card.result.obtainedMarks)) &&
   Number(card.result.obtainedMarks)>=0 &&
   Number(card.result.obtainedMarks)<=Number(card.result.totalMarks))
}
