import trusted from './composerTrustedSourceHashes.json'
import {CLASS_ORDER} from './composerReviewDomain.js'

const shaRe=/^[a-f0-9]{64}$/
const aliases={play:'Starter',playgroup:'Starter',starter:'Starter',
 nursery:'Mover',mover:'Mover',prep:'Flyer',flyer:'Flyer',
 one:'One',two:'Two',three:'Three',four:'Four',five:'Five',six:'Six',
 seven:'Seven',eight:'Eight',prenine:'Pre-Nine',preix:'Pre-Nine',
 '1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six','7':'Seven','8':'Eight'}
export const normalizeClass=name=>aliases[String(name||'').toLowerCase().replace(/^\s*(?:class|grade)\s+/,'').replace(/[^a-z0-9]/g,'')]||null
const sha256=async source=>{
  const bytes=new TextEncoder().encode(source)
  const digest=await crypto.subtle.digest('SHA-256',bytes)
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')
}
const IMAGE_TRANSCRIPT_SHA='c1a5ed12b5c73624f988c5fca45acab00370f79dba30459905d291349f785a59'
const IMAGE_SOURCE_SHA='53c56ed4acf6eb6d1fe3882c4314ef3e8d5c5682a641f5d07938e6d8a2efd7f6'
async function verifyClassOneImageReview(manifest){
 const extra=manifest.class_one_image_review
 if(extra===undefined)return {available:false}
 if(extra?.schema!=='assps.class_one.image_review.v1'||
    extra.source_image_sha256!==IMAGE_SOURCE_SHA||
    extra.transcript_sha256!==IMAGE_TRANSCRIPT_SHA||
    extra.review_state!=='VISUAL_TRANSCRIPTION_REQUIRES_INDEPENDENT_ACADEMIC_CONFIRMATION'||
    !Array.isArray(extra.weeks)||extra.weeks.length!==18)
   throw Error('Class One source image transcript is not the trusted review copy.')
 const digest=await sha256(JSON.stringify(extra.weeks))
 if(digest!==IMAGE_TRANSCRIPT_SHA)throw Error('Class One week table differs from the original provisional transcription.')
 const allowed=new Set(['English-A','Urdu-A','Mathematics','English-B','Urdu-B','Islamiyat','Science','Grammar','all'])
 for(let i=0;i<extra.weeks.length;i++){
  const row=extra.weeks[i],work=row?.work
  if(row?.week!==i+1||!/^202[67]-\d\d-\d\d$/.test(row.start)||
     !/^202[67]-\d\d-\d\d$/.test(row.end)||row.start>row.end||
     !work||typeof work!=='object'||Array.isArray(work))
    throw Error('Class One date/week sequence requires review.')
  for(const [subject,text] of Object.entries(work)){
   if(!allowed.has(subject)||typeof text!=='string'||!text.trim()||text.length>180)
    throw Error('Class One subject transcript contains an unknown source entry.')
  }
 }
 return {available:true,reviewState:extra.review_state}
}
export async function validateLocalComposerSource(manifest){
  if(!globalThis.crypto?.subtle)throw Error('Secure browser crypto verification is required.')
  if(!manifest||manifest.schema!=='assps.lesson_plan.review_import.v1'||
     manifest.source_zip_sha256!==trusted.sourceZipSha256 ||
     manifest.source_txt_sha256!==trusted.sourceTextSha256 ||
     !Array.isArray(manifest.candidates)||manifest.candidates.length!==59)
    throw Error('This is not the original verified ASSPS 59-group source manifest.')
  const seen=new Set(),byClass=new Set(),byHash=[]
  for(const candidate of manifest.candidates){
    const key=candidate.candidate_key
    if(typeof key!=='string'||seen.has(key)||!shaRe.test(trusted.candidateHashes[key]||'')){
      throw Error('Duplicate or unrecognized source entry.')
    }
    seen.add(key)
    if(candidate.school_id!==trusted.schoolId)throw Error('Wrong school source cannot be imported.')
    const klass=normalizeClass(candidate.proposed_class_level)
    const shown=normalizeClass(candidate.class_display)
    if(!CLASS_ORDER.includes(klass)||shown!==klass)throw Error('Incorrect class source mapping.')
    byClass.add(klass)
    const subject=candidate.source_subject_label
    if(typeof subject!=='string'||!subject.trim()||subject.length>100)throw Error('Invalid subject source mapping.')
    const ids=candidate.source_submissions,records=candidate.source_detail_records
    if(!Array.isArray(ids)||!ids.length||!Array.isArray(records)||records.length!==ids.length)
      throw Error('Original source reference count mismatch.')
    if(new Set(ids).size!==ids.length)throw Error('Duplicate original message reference.')
    const byId=new Map(records.map(item=>[item.source_id,item]))
    if(byId.size!==ids.length)throw Error('Conflicting original message reference.')
    const pieces=[]
    for(const id of ids){
      const src=byId.get(id)
      if(!src||!/^WA14-(L\d{1,5}|IMG-[a-zA-Z0-9-]{1,50})$/.test(id)||
        !shaRe.test(src.source_body_sha256||''))throw Error('Original evidence digest missing.')
      const fragments=src.source_excerpt_pieces||(id.startsWith('WA14-IMG-')?[]:null)
      if(!Array.isArray(fragments)||(!id.startsWith('WA14-IMG-')&&!fragments.length))
        throw Error('Original WhatsApp line evidence missing.')
      for(const item of fragments){
        if(!Number.isSafeInteger(item.source_start_line)||!Number.isSafeInteger(item.source_end_line)||
          item.source_end_line<item.source_start_line||typeof item.verbatim!=='string'||!item.verbatim.trim())
          throw Error('Original line evidence is incomplete.')
      }
      const excerptHash=await sha256(JSON.stringify(fragments.map(x=>[
        x.source_start_line,x.source_end_line,x.verbatim
      ])))
      pieces.push([id,src.source_body_sha256,excerptHash])
    }
    const digest=await sha256(JSON.stringify([trusted.schoolId,klass,subject.trim(),pieces]))
    if(digest!==trusted.candidateHashes[key])throw Error('Source content differs from the independently verified original: '+key)
    byHash.push([key,digest])
  }
  if(seen.size!==59||byClass.size!==12||
    !Array.isArray(manifest.unassigned_evidence)||
    manifest.unassigned_evidence.length!==1||
    manifest.unassigned_evidence[0]!=='WA14-L1719'){
    throw Error('Class or unassigned Islamiyat source coverage mismatch.')
  }
  const combined=await sha256(JSON.stringify([manifest.source_zip_sha256,manifest.source_txt_sha256,byHash]))
  if(combined!==trusted.trustedFullManifestHash)throw Error('Full original-source manifest order or provenance mismatch.')
  const proposals=manifest.local_review_proposals
  if(proposals!==undefined&&(!proposals||typeof proposals!=='object'||Array.isArray(proposals)))
    throw Error('Invalid saved review proposals.')
  const classOneImage=await verifyClassOneImageReview(manifest)
  return {verified:true,classes:byClass.size,candidates:seen.size,unassigned:1,classOneImage,
    digest:combined,proposals:proposals||{}}
}
