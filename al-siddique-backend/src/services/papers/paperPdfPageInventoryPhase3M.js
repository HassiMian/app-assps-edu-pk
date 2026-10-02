// Phase3M DORMANT, OFFLINE native PDF page inventory. No parser dependency install.
// Requires explicitly trusted hash-pinned external pdfinfo tool; missing tool = NO PROOF.
// No route, production DB, original PDF modifications or approval side effects.
const fs=require('node:fs/promises')
const path=require('node:path')
const {createHash}=require('node:crypto')
const {execFile}=require('node:child_process')
const {promisify}=require('node:util')
const run=promisify(execFile)
const sha=b=>createHash('sha256').update(b).digest('hex')
const SHA=/^[a-f0-9]{64}$/u
const DEC='(-?\\d+(?:\\.\\d+)?)'
const isA4=(w,h)=>Number.isFinite(w)&&Number.isFinite(h)&&
 Math.abs(w-595.28)<5&&Math.abs(h-841.89)<5
const safeFile=async(file,maxBytes)=>{
 if(typeof file!=='string'||!path.isAbsolute(file))
  throw new Error('Explicit absolute local original PDF/inspector path required.')
 const real=await fs.realpath(file),before=await fs.lstat(file)
 if(real!==path.resolve(file)||!before.isFile()||before.isSymbolicLink()||
  before.nlink!==1||before.size<50||before.size>maxBytes)
  throw new Error('Refuse redirected, linked, missing, empty or oversized source.')
 return {real,before}
}
async function fileDigestStable(file,maxBytes){
 const initial=await safeFile(file,maxBytes)
 const bytes=await fs.readFile(file)
 const after=await fs.lstat(file)
 if(after.size!==initial.before.size||after.ino!==initial.before.ino||
  after.dev!==initial.before.dev||after.mtimeMs!==initial.before.mtimeMs||
  bytes.length!==after.size)
  throw new Error('Original source changed while inspected.')
 return {sha256:sha(bytes),stat:after,real:initial.real}
}
function parsePdfinfoA4PageInventory(stdout,{expectedPdfSha256,inspectorSha256}={}){
 if(typeof stdout!=='string'||stdout.length>256*1024||
  !SHA.test(expectedPdfSha256||'')||!SHA.test(inspectorSha256||''))
  throw new Error('Inspector output, actual original PDF SHA and pinned executable SHA required.')
 const lines=stdout.split(/\r?\n/u)
 const field=name=>{
  const matches=lines.filter(l=>l.startsWith(name+':'))
  if(matches.length!==1)throw new Error('PDF inspector missing or ambiguous '+name+' metadata.')
  return matches[0].slice(name.length+1).trim()
 }
 const countText=field('Pages')
 if(!/^[1-9]\d*$/u.test(countText))throw new Error('No trustworthy exact PDF page count.')
 const count=Number(countText)
 if(!Number.isSafeInteger(count)||count>32)
  throw new Error('Native PDF page count exceeds the supported explicit full visual inspection limit.')
 if(field('Encrypted')!=='no')throw new Error('Encrypted or unknown PDF cannot be blindly inspected.')
 if(lines.some(l=>/^JavaScript:\s*yes\s*$/iu.test(l)))
  throw new Error('Active PDF JavaScript not supported for original evidence.')
 const sizes=new Map(),media=new Map(),crop=new Map()
 const rxSize=new RegExp('^Page\\s+(\\d+)\\s+size:\\s*'+DEC+'\\s+x\\s+'+DEC+'\\s+pts\\b','iu')
 const rxMedia=new RegExp('^Page\\s+(\\d+)\\s+MediaBox:\\s*'+[DEC,DEC,DEC,DEC].join('\\s+')+'\\s*$','iu')
 const rxCrop=new RegExp('^Page\\s+(\\d+)\\s+CropBox:\\s*'+[DEC,DEC,DEC,DEC].join('\\s+')+'\\s*$','iu')
 const put=(map,m,label)=>{
  const id=Number(m[1])
  if(!Number.isSafeInteger(id)||id<1||id>count||map.has(id))
   throw new Error('Duplicate, out-of-range or invalid PDF '+label+' page index.')
  map.set(id,m.slice(2).map(Number))
 }
 for(const line of lines){
  const s=rxSize.exec(line),m=rxMedia.exec(line),c=rxCrop.exec(line)
  if(s)put(sizes,s,'size')
  else if(m)put(media,m,'MediaBox')
  else if(c)put(crop,c,'CropBox')
 }
 if(sizes.size!==count||media.size!==count||crop.size!==count)
  throw new Error('PDF inspector did not expose every native page size, MediaBox and CropBox.')
 const pages=[]
 for(let id=1;id<=count;id++){
  const [w,h]=sizes.get(id),[mx0,my0,mx1,my1]=media.get(id)
  const [cx0,cy0,cx1,cy1]=crop.get(id)
  if(!isA4(w,h)||!isA4(mx1-mx0,my1-my0)||
    !isA4(cx1-cx0,cy1-cy0)||
    [mx0,my0,mx1,my1].some((v,i)=>Math.abs(v-crop.get(id)[i])>=1))
   throw new Error('Original PDF page '+id+' is non-A4, cropped or geometrically inconsistent.')
  pages.push(Object.freeze({pageNumber:id,widthPt:w,heightPt:h,a4FullSheetVerified:true}))
 }
 return Object.freeze({
  status:'PDF_NATIVE_ALL_PAGES_A4_INDEPENDENTLY_INSPECTED',
  originalPdfSha256:expectedPdfSha256,inspectorExecutableSha256:inspectorSha256,
  verifiedPdfPageCount:count,pages:Object.freeze(pages),
  actualOriginalBrowserSelectionVerified:false,
  visualSemanticParityVerified:false,reviewerSignatureVerified:false,
  independentlyApproved:false,productionCutoverAllowed:false,sourceMutationAllowed:false,
 })
}
async function inspectOriginalNativePdf({nativePdfPath,expectedPrintSha256,
 inspectorExecutablePath,expectedInspectorSha256}={}){
 if(!SHA.test(expectedPrintSha256||'')||!SHA.test(expectedInspectorSha256||''))
  throw new Error('Exact Phase3K print SHA and independently approved inspector binary SHA required.')
 if(path.extname(nativePdfPath||'').toLowerCase()!=='.pdf'||
    path.extname(inspectorExecutablePath||'').toLowerCase()!=='.exe')
  throw new Error('Expected explicit local original PDF and inspected pdfinfo.exe binary.')
 const pdf=await fileDigestStable(nativePdfPath,24*1024*1024)
 if(pdf.sha256!==expectedPrintSha256)throw new Error('Inspector input is NOT the exact Phase3K native Print PDF.')
 const binary=await fileDigestStable(inspectorExecutablePath,100*1024*1024)
 if(binary.sha256!==expectedInspectorSha256)
  throw new Error('Unpinned or modified PDF inspector executable is refused.')
 // execFile: NO shell, no interpolated command; bounded time/memory. Never print
 // stdout contents (which could include original paper metadata such as title).
 const {stdout}=await run(binary.real,['-box','-f','1','-l','32',pdf.real],{
  windowsHide:true,shell:false,timeout:15000,maxBuffer:256*1024,
 })
 const proof=parsePdfinfoA4PageInventory(stdout,{expectedPdfSha256:pdf.sha256,
  inspectorSha256:binary.sha256})
 const pdfAfter=await fileDigestStable(nativePdfPath,24*1024*1024)
 const binaryAfter=await fileDigestStable(inspectorExecutablePath,100*1024*1024)
 if(pdfAfter.sha256!==pdf.sha256||binaryAfter.sha256!==binary.sha256||
  pdfAfter.stat.mtimeMs!==pdf.stat.mtimeMs||binaryAfter.stat.mtimeMs!==binary.stat.mtimeMs)
  throw new Error('PDF or inspector executable changed while verifying page inventory.')
 return proof
}
module.exports={parsePdfinfoA4PageInventory,inspectOriginalNativePdf}
