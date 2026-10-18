'use strict'

// Login and password-reset must never silently ignore a school selected by the
// caller. This pure validator does NOT authenticate users or issue privileges.
const ID_KEYS = Object.freeze(['school_id', 'schoolId'])
const CODE_KEYS = Object.freeze(['school_code', 'schoolCode'])
const own = (obj,key)=>Boolean(obj&&Object.prototype.hasOwnProperty.call(obj,key))
function provided(req,keys) {
  const values=[]
  for(const part of [req?.body,req?.query]) {
    for(const key of keys) if(own(part,key)) {
      const value=part[key]
      if(value===undefined||value===null||String(value).trim()==='') return {invalid:true,values:[]}
      if(typeof value!=='string'&&typeof value!=='number') return {invalid:true,values:[]}
      values.push(String(value).trim())
    }
  }
  return {invalid:false,values}
}
function checkExplicitSchoolLoginScope(req,resolvedSchool) {
  const ids=provided(req,ID_KEYS),codes=provided(req,CODE_KEYS)
  if(ids.invalid||codes.invalid) return {ok:false,code:'INVALID_SCHOOL_CONTEXT'}
  const specified=ids.values.length>0||codes.values.length>0
  if(!specified)return {ok:true,specified:false}
  const idNumbers=ids.values.map(x=>Number(x))
  if(idNumbers.some(n=>!Number.isSafeInteger(n)||n<1)||new Set(idNumbers).size>1)
    return {ok:false,code:'INVALID_SCHOOL_CONTEXT'}
  const normalizedCodes=codes.values.map(x=>x.toLowerCase())
  if(normalizedCodes.some(x=>x.length>80)||new Set(normalizedCodes).size>1)
    return {ok:false,code:'INVALID_SCHOOL_CONTEXT'}
  if(!resolvedSchool)return {ok:false,code:'SCHOOL_CONTEXT_UNAVAILABLE'}
  if(idNumbers.length&&Number(resolvedSchool.id)!==idNumbers[0])
    return {ok:false,code:'SCHOOL_CONTEXT_UNAVAILABLE'}
  if(normalizedCodes.length&&String(resolvedSchool.code||'').trim().toLowerCase()!==normalizedCodes[0])
    return {ok:false,code:'SCHOOL_CONTEXT_UNAVAILABLE'}
  return {ok:true,specified:true}
}
module.exports={checkExplicitSchoolLoginScope}
