import { useRef, useState } from 'react'
import api, { getAuthUser } from '../../services/api'
import index from './data/grade910AdoptionCatalogIndex.json'

const SHA = /^[0-9a-f]{64}$/
const checks = ['Curriculum and session','Actual book edition and exercise page','Question correctness','Answer and MCQ key','Marks and difficulty','English/Urdu correctness','Duplicates','Original source provenance']
const inputStyle = {width:'100%',boxSizing:'border-box',padding:9,border:'1px solid #8aa4bf',borderRadius:7}
const cardStyle={background:'#123b60',border:'1px solid #7b93ac',color:'#fff',padding:18,borderRadius:14,marginTop:14}
const titleStyle={fontWeight:700,fontSize:18}
async function digest(bytes) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('')
}
function SignatureCanvas({onDraw}) {
 const canvas = useRef(null)
 const down = useRef(false)
 const point=e=>{
  const rect=canvas.current.getBoundingClientRect()
  return [(e.clientX-rect.left)*canvas.current.width/rect.width,(e.clientY-rect.top)*canvas.current.height/rect.height]
 }
 const start=e=>{
  down.current=true
  canvas.current.setPointerCapture(e.pointerId)
  const context=canvas.current.getContext('2d')
  context.strokeStyle='#0b2440';context.lineWidth=2.5;context.lineCap='round'
  context.beginPath();context.moveTo(...point(e));context.lineTo(...point(e));context.stroke()
  onDraw('')
 }
 const move=e=>{if(!down.current)return;const c=canvas.current.getContext('2d');c.lineTo(...point(e));c.stroke()}
 const end=()=>{if(down.current){down.current=false;onDraw(canvas.current.toDataURL('image/png'))}}
 return <div>
  <canvas width={620} height={180} ref={canvas} aria-label="Draw personal signature"
   onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
   style={{background:'#fff',border:'2px dashed #a7c9d8',borderRadius:9,width:'100%',maxWidth:620,touchAction:'none'}}/>
  <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
   <button type="button" onClick={()=>{canvas.current.getContext('2d').clearRect(0,0,620,180);onDraw('')}}>Clear</button>
   <label>Or upload your own PNG (max 120 KB)
    <input type="file" accept="image/png" onChange={e=>{
     const f=e.target.files?.[0];e.target.value=''
     if(!f)return
     if(f.type!=='image/png'||f.size<30||f.size>120*1024){alert('Only private PNG files under 120 KB are accepted');return}
     const reader=new FileReader()
     reader.onload=()=>{const value=String(reader.result||'');if(value.startsWith('data:image/png;base64,'))onDraw(value)}
     reader.readAsDataURL(f)
    }}/>
   </label>
  </div>
 </div>
}

export default function Grade910HumanSignoff() {
 const actor=getAuthUser()||{}, role=String(actor.role||'').toLowerCase()
 const permitted=['principal','teacher','admin','school_admin'].includes(role)
 const [action,setAction]=useState(role==='teacher'?'subject_review':'book_adoption')
 const [catalogId,setCatalogId]=useState(index.rows[0].catalogId)
 const [decision,setDecision]=useState('needs-evidence')
 const [printedEdition,setPrintedEdition]=useState('')
 const [questionId,setQuestionId]=useState('')
 const [questionHash,setQuestionHash]=useState('')
 const [answerHash,setAnswerHash]=useState('')
 const [evidenceHash,setEvidenceHash]=useState('')
 const [evidenceFileName,setEvidenceFileName]=useState('')
 const [teacherReceipt,setTeacherReceipt]=useState('')
 const [reviewChecks,setReviewChecks]=useState([])
 const [signature,setSignature]=useState('')
 const [confirmed,setConfirmed]=useState(false)
 const [message,setMessage]=useState('')
 const source=index.rows.find(x=>x.catalogId===catalogId)||index.rows[0]
 const actions=role==='principal'?['book_adoption','principal_approval']:
  role==='admin'||role==='school_admin'?['book_adoption']:['subject_review','urdu_review']
 const mode=actions.includes(action)?action:actions[0]
 const isBook=mode==='book_adoption',isTeacher=mode==='subject_review'||mode==='urdu_review'
 const confirmAndExport=async()=>{
  const signedAt=new Date().toISOString()
  setMessage('')
  if(!permitted||!actor.id||!confirmed){setMessage('Use your own authenticated school teacher, Principal or admin account and accept the declaration.');return}
  if(!signature.startsWith('data:image/png;base64,')){setMessage('Draw or upload your OWN signature.');return}
  const bytes=Uint8Array.from(atob(signature.split(',')[1]),c=>c.charCodeAt(0))
  if(bytes.length>120*1024){setMessage('Signature must be under 120 KB.');return}
  if(isBook&&decision==='adopted'&&(!printedEdition.trim()||!SHA.test(evidenceHash))){setMessage('Adopted textbook needs actual edition and physical evidence SHA-256.');return}
  if(!isBook&&(!questionId.trim()||!SHA.test(questionHash)||!SHA.test(answerHash)||!SHA.test(evidenceHash))){setMessage('Original ID, question SHA, answer SHA, and evidence SHA are mandatory.');return}
  if(isTeacher&&reviewChecks.length!==checks.length){setMessage('Personally complete all eight academic checks.');return}
  if(mode==='urdu_review'&&source.medium==='English'){setMessage('Urdu-review role cannot silently change a source marked English.');return}
  if(mode==='principal_approval'&&!SHA.test(teacherReceipt)){setMessage('Independent teacher review receipt SHA is mandatory.');return}
  const packet={
   schemaVersion:'assps-grade910-human-claim-with-signature-v1', schoolCode:'ASSPS',
   academicSession:'2026-27', intendedBoardExamYear:2027,
   actorClaim:{userId:String(actor.id),role}, personallySignedAt:signedAt,
   action:mode,
   sourceCatalogRecordId:source.catalogId,sourcePdfSha256:source.sourcePdfSha256,
   originalQuestionRevisionSetSha256:source.originalQuestionRevisionSetSha256,
   sourceGradeUnassigned:source.grade===0,
   subject:source.subject,grade:source.grade,medium:source.medium,
   bookDecision:isBook?decision:null,printedEdition:isBook?printedEdition.trim():null,
   originalQuestionId:isBook?null:questionId.trim(),
   finalQuestionRevisionSha256:isBook?null:questionHash,
   finalAnswerRevisionSha256:isBook?null:answerHash,
   independentTeacherReceiptSha256:mode==='principal_approval'?teacherReceipt:null,
   supportingEvidenceSha256:evidenceHash||null,
   completedReviewChecks:isTeacher?[...reviewChecks].sort():[],
   handwriting:{mimeType:'image/png',sha256:await digest(bytes),imageDataUrl:signature},
   signerDeclaration:'I personally reviewed this source and evidence and signed with my own hand.',
   verificationStatus:'UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION',
   academicallyApproved:false,paperStudioSelectable:false,published:false
  }
  try {
   const receipt=await api.post('/api/grade910-signoffs/submissions', packet)
   if(!receipt?.data?.success||!receipt.data.data?.id)throw Error('No receipt')
   setMessage('Secure server receipt #'+receipt.data.data.id+' stored. Academic status: pending independent verification.')
  } catch {
   setMessage('Secure upload failed: NO server receipt. Nothing has been academically approved or published.')
   return
  }
  // Private signature data stays encrypted on the school server; no automatic browser download.


 }
 const label=(title,value,fn,placeholder='')=><label style={{display:'block',marginTop:12}}>{title}
  <input style={inputStyle} value={value} onChange={e=>fn(e.target.value)} placeholder={placeholder}/>
 </label>

 return <main style={{maxWidth:960,padding:24,margin:'auto',color:'#102f50'}}>
  <h1>Grade IX–X · Teacher / Principal Signatures</h1>
  {(role==='admin'||role==='school_admin')&&<p role="status"><strong>School administrator account:</strong> You may personally sign and submit only a pending textbook-adoption evidence claim as yourself. This is not a Principal signature, independent teacher review, or final academic approval. The actual Principal must use their own authenticated role to certify Principal-only decisions.</p>}
  <p>This workspace lets real school staff prepare their own evidence. Handwriting alone does not verify legal identity or academic correctness. Every submission remains held until the independent school-review chain authenticates its actor and the exact question/answer revisions.</p>
  <section style={cardStyle}>
   <div style={titleStyle}>1. Staff identity and source</div>
   <p>Signed-in account ID: {String(actor.id||'missing')}. Account role: {role||'missing'}.</p>
   {!permitted&&<p role="alert">An authenticated school staff account with the correct signoff permissions is required.</p>}
   <label>Signoff type
    <select style={inputStyle} value={mode} onChange={e=>{setAction(e.target.value);setSignature('');setConfirmed(false)}}>
     {actions.map(x=><option value={x} key={x}>{x.replaceAll('_',' ')}</option>)}
    </select>
   </label>
   <label>Original catalog source
    <select style={inputStyle} value={catalogId} onChange={e=>setCatalogId(e.target.value)}>
     {index.rows.map(x=><option key={x.catalogId} value={x.catalogId}>{x.grade||'IX/X'} · {x.subject} · {x.medium} · {x.catalogId}</option>)}
    </select>
   </label>
   <p style={{fontSize:13}}>Publisher edition: {source.editionLabel} · original research candidates: {source.originalCandidateCount}. Edition is not proof of actual ASSPS adoption. Original catalog PDF SHA-256: {source.sourcePdfSha256}</p>
  </section>
  <section style={cardStyle}>
   <div style={titleStyle}>2. Review and supporting evidence</div>
   {isBook?<><label>Actual school decision
     <select style={inputStyle} value={decision} onChange={e=>setDecision(e.target.value)}>
      <option value="needs-evidence">Undecided · needs evidence</option>
      <option value="adopted">Adopted at ASSPS — physical proof required</option>
      <option value="not-adopted">Not adopted at ASSPS</option>
     </select></label>
     {label('Actual printed edition (for adoption)',printedEdition,setPrintedEdition)}
    </>:<>
     {label('Stable original question ID',questionId,setQuestionId)}
     {label('Exact final question SHA-256',questionHash,setQuestionHash)}
     {label('Exact final answer / MCQ key SHA-256',answerHash,setAnswerHash)}
     {mode==='principal_approval'&&label('Independent teacher review receipt SHA-256',teacherReceipt,setTeacherReceipt)}
    </>}
   <label style={{display:'block',marginTop:10}}>Select your actual supporting evidence file to calculate its SHA-256 locally (optional PDF/PNG/JPG, up to 15 MB)
    <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
      style={{display:'block',marginTop:5}}
      onChange={async e=>{
       const file=e.target.files?.[0];e.target.value=''
       if(!file)return
       if(file.size<1||file.size>15*1024*1024||
         !['application/pdf','image/png','image/jpeg'].includes(file.type)){
        setMessage('Evidence must be your own genuine PDF/PNG/JPG file under 15 MB.')
        return
       }
       try{
        const hashed=await digest(await file.arrayBuffer())
        setEvidenceHash(hashed);setEvidenceFileName(file.name)
        setMessage('Computed evidence SHA-256 from the selected file. Keep the original evidence file available for authorized school verification. Its contents are NOT automatically uploaded.')
       }catch{setMessage('Could not calculate evidence hash. Please select the file again.')}
      }}/>
   </label>
   {evidenceFileName&&<p style={{fontSize:12}}>Evidence used for digest: {evidenceFileName} (file contents remain on your device)</p>}
   {label('Physical evidence object SHA-256 (real bytes, not a guessed reference)',evidenceHash,setEvidenceHash)}
   {isTeacher&&<><h3>Independent academic checks (personally verified)</h3>
    {checks.map(c=><label key={c} style={{display:'block',padding:4}}>
     <input type="checkbox" checked={reviewChecks.includes(c)} onChange={e=>setReviewChecks(v=>e.target.checked?[...v,c]:v.filter(x=>x!==c))}/> {c}
    </label>)}
   </>}
  </section>
  <section style={cardStyle}>
   <div style={titleStyle}>3. Add your personal signature</div>
   <p>Use mouse, stylus, finger or your own uploaded PNG. No AI-generated signatures, copied teacher signatures or delegated signatures.</p>
   <SignatureCanvas onDraw={setSignature}/>
   <label style={{display:'block',marginTop:14}}>
    <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I am the actual named staff account holder, have personally verified the stated information, and understand this file is evidence pending verification—not approval.
   </label>
   <button type="button" onClick={confirmAndExport} disabled={!permitted} style={{padding:'12px 22px',marginTop:15,border:0,borderRadius:9,background:'#0a84ce',color:'#fff',fontWeight:700}}>
     Upload personal signoff securely
   </button>
   {message&&<p role="status">{message}</p>}
   <p style={{fontSize:13}}>Sensitive signature files are kept on the signer's device for controlled upload; never post signatures in school groups or public issues. No production database publication is performed by this screen.</p>
  </section>
 </main>
}
