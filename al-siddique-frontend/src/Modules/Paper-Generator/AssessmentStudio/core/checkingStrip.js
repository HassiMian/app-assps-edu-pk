import { resolveSectionTotalMarks } from '../../paperSystemRules.js'

const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0

export function buildCheckingStripModel({paper={},config={}}={}) {
  const canonical=paper.canonicalDocument
  if(canonical?.sections?.length){
    const entries=canonical.sections.map((section,index)=>({
      questionInstanceId:String(section.id||`section-${index+1}`),
      label:`Q${index+1}`,
      maximumMarks:finite(section.authoritativeSectionTotal??section.operationalSectionTotal),
    }))
    return {
      enabled:Boolean(paper.userAuthored || config.showCheckingStrip),
      entries,
      maximumMarks:finite(canonical.scoringPlan?.maximumObtainableMarks)||entries.reduce((s,x)=>s+x.maximumMarks,0),
    }
  }
  const sections=Array.isArray(paper.official_section)?paper.official_section:[]
  const entries=sections.map((section,index)=>({
    questionInstanceId:String(section.id||`section-${index+1}`),
    label:`Q${index+1}`,
    maximumMarks:finite(resolveSectionTotalMarks(section)),
  }))
  return {
    enabled:Boolean(paper.userAuthored || config.showCheckingStrip),
    entries,
    maximumMarks:finite(config.totalMarks)||entries.reduce((s,x)=>s+x.maximumMarks,0),
  }
}
