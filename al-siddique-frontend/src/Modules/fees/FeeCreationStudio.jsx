import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, ChevronDown, Printer, UsersRound, School, UserRound, CheckCircle2 } from 'lucide-react'
import api from '../../services/api'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { renderVoucherCopyHtml } from './ViewChallans'

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
const TEMPLATE_OPTIONS=[
  {id:'classic',label:'Classic Replica',number:1},
  {id:'modern',label:'Ultra Modern',number:2},
  {id:'elegant',label:'Sleek Elegant',number:3},
]
const now=new Date()
now.setDate(1)
now.setMonth(now.getMonth()+1)
const money=x=>'Rs. '+Number(x||0).toLocaleString('en-PK',{maximumFractionDigits:2})
const panel={background:'#fff',border:'1px solid #e4eaf2',borderRadius:18,padding:20,boxShadow:'0 4px 20px rgba(25,47,76,.035)'}
const input={width:'100%',minHeight:42,padding:'9px 12px',border:'1px solid #d6e0ed',borderRadius:11,background:'#fff',color:'#18334f',outlineColor:'#2363b5',fontSize:13,boxSizing:'border-box'}
const label={fontSize:12,color:'#52657c',fontWeight:650,marginBottom:6,display:'block'}
const primary={padding:'11px 19px',minHeight:43,border:'none',borderRadius:12,background:'#153c68',color:'#fff',fontWeight:750,cursor:'pointer'}
const secondary={padding:'10px 16px',minHeight:43,border:'1px solid #dae4ef',borderRadius:12,background:'#fff',color:'#244462',fontWeight:700,cursor:'pointer'}
const scopes=[
  {id:'all',title:'All Classes',subtitle:'School-wide vouchers',Icon:School},
  {id:'class',title:'Class-wise',subtitle:'One class at a time',Icon:UsersRound},
  {id:'student',title:'One Student',subtitle:'Individual voucher',Icon:UserRound},
]
const numericText=value=>/^\d+(?:\.\d{1,2})?$/.test(String(value))
export default function FeeCreationStudio({students=[],classOptions=[],templateId='classic',onTemplateChange}){
  const navigate=useNavigate()
  const {paperSettings}=usePaperStore()
  const [scope,setScope]=useState('all')
  const [className,setClassName]=useState('')
  const [search,setSearch]=useState('')
  const [studentId,setStudentId]=useState('')
  const [month,setMonth]=useState(MONTHS[now.getMonth()])
  const [year,setYear]=useState(String(now.getFullYear()))
  const [dueDate,setDueDate]=useState('')
  const [examFee,setExamFee]=useState('0')
  const [paperFund,setPaperFund]=useState('0')
  const [otherFee,setOtherFee]=useState('0')
  const [showAdvanced,setShowAdvanced]=useState(false)
  const [preview,setPreview]=useState(null)
  const [templateOpen,setTemplateOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [done,setDone]=useState(null)
  const choices=useMemo(()=>students.filter(s=>{
    const term=search.trim().toLowerCase()
    if(!term)return true
    return [s.name,s.gr,s.father,s.class].some(x=>String(x||'').toLowerCase().includes(term))
  }).slice(0,80),[students,search])
  const key=JSON.stringify([scope,className,studentId,month,year,dueDate,examFee,paperFund,otherFee])
  const currentPreview=preview?.key===key?preview:null
  const payload=()=>({scope,class_name:className,student_id:studentId?Number(studentId):null,
    month,year:Number(year),due_date:dueDate,
    fees:{exam_fee:examFee,paper_fund:paperFund,other_fee:otherFee}})
  const validCharges=[examFee,paperFund,otherFee].every(numericText)&&[examFee,paperFund,otherFee].every(v=>Number(v)>=0&&Number(v)<=50000)
  const validSelection=(scope==='all'||(scope==='class'&&Boolean(className))||(scope==='student'&&Boolean(studentId)))&&validCharges
  const reset=()=>{setError('');setDone(null);setPreview(null)}
  const previewBatch=async()=>{
    if(!validSelection){setError('Select the required class/student and enter valid fees.');return}
    setBusy(true);setError('');setDone(null)
    try{
      const r=await api.post('/api/fees/batch/preview',payload())
      setPreview({...r.data,key})
    }catch(e){setError(e.response?.data?.message||'Could not preview vouchers. No records were changed.')}
    finally{setBusy(false)}
  }
  const createBatch=async()=>{
    if(!currentPreview||!validSelection){setError('Please refresh the preview.');return}
    setBusy(true);setError('')
    try{
      const r=await api.post('/api/fees/batch/generate',{...payload(),fingerprint:currentPreview.fingerprint})
      setDone(r.data)
      setPreview(null)
    }catch(e){setError(e.response?.data?.message||'Batch creation was safely cancelled. Refresh preview.')}
    finally{setBusy(false)}
  }
  const template=TEMPLATE_OPTIONS.find(t=>t.id===templateId)||TEMPLATE_OPTIONS[0]
  const sample=(currentPreview?.students||[]).find(s=>s.status==='ready')||currentPreview?.students?.[0]
  const firstStudent=students.find(s=>Number(s.id)===Number(studentId))||students[0]
  const doc={
    name:sample?.name||firstStudent?.name||'Sample Student',
    father_name:firstStudent?.father||'',
    gr_number:sample?.gr_number||firstStudent?.gr||'',
    class:sample?.class||firstStudent?.class||'',
    section:sample?.section||firstStudent?.section||'',
    month,year:Number(year),due_date:dueDate||year+'-'+String(MONTHS.indexOf(month)+1).padStart(2,'0')+'-10',
    monthly_fee:Number(sample?.monthly_fee||0),previous_arrears:Number(sample?.arrears||0),
    exam_fee:Number(examFee),other_fee:Number(otherFee),paper_fund:Number(paperFund),
    discount:Number(sample?.discount||0),amount:Number(sample?.total||0),
    gross_total:Number(sample?.total||0),remaining_balance:Number(sample?.total||0),
    status:'unpaid',challan_no:'TEMPLATE PREVIEW'
  }
  const school={name:paperSettings.schoolName,schoolName:paperSettings.schoolName,
    urdu:paperSettings.schoolUrdu,address:paperSettings.address,
    logo:paperSettings.logo,showUrduHeader:paperSettings.showUrduHeader}
  const previewDoc='<!doctype html><html><head><meta charset="utf-8"/><style>body{margin:12px;background:#f3f6fa;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body>'+renderVoucherCopyHtml(doc,'Parent Copy',school,template.number,true)+'</body></html>'
  return (
    <div style={{display:'grid',gap:16,color:'#223d59',maxWidth:1190,margin:'0 auto'}}>
      <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:16}}>
        <div>
          <h2 style={{fontSize:24,fontWeight:800,margin:0,color:'#163650'}}>Fee Voucher Studio</h2>
          <p style={{fontSize:13,color:'#62768b',margin:'7px 0 0'}}>Select who to bill. Arrears, discounts and previous challans are checked automatically.</p>
        </div>
        <button type="button" style={secondary} onClick={()=>navigate('/fees/challans')}><Printer size={15} style={{verticalAlign:'middle',marginRight:8}}/>View / Print Vouchers</button>
      </div>
      <div style={{...panel,padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}>
        {scopes.map(({id,title,subtitle,Icon})=>(
          <button type="button" key={id} onClick={()=>{setScope(id);reset()}}
            aria-pressed={scope===id} style={{display:'flex',alignItems:'center',gap:12,textAlign:'left',cursor:'pointer',padding:'13px 14px',
              borderRadius:12,background:scope===id?'#eaf2fa':'#fff',border:scope===id?'1.5px solid #49799e':'1px solid #e2e8ef',color:'#173c5f'}}>
            <Icon size={20}/><span><strong style={{display:'block',fontSize:14}}>{title}</strong><span style={{fontSize:11,color:'#718397'}}>{subtitle}</span></span>
          </button>
        ))}
      </div>
      <div style={panel}>
        <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:16}}>
          <strong style={{fontSize:15,color:'#193b59'}}>Billing details</strong>
          <span style={{fontSize:11,color:'#77899c'}}>Existing monthly vouchers will never be duplicated</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:12}}>
          {scope==='class'&&<div><label style={label}>Class</label><select style={input} value={className} onChange={e=>{setClassName(e.target.value);reset()}}>
            <option value="">Select class</option>{classOptions.map(c=><option key={c} value={c}>{c}</option>)}
          </select></div>}
          {scope==='student'&&<div style={{gridColumn:'1 / -1'}}>
            <label style={label}>Student name / GR number</label>
            <input style={{...input,marginBottom:7}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, father or GR number"/>
            <select style={input} value={studentId} onChange={e=>{setStudentId(e.target.value);reset()}}>
              <option value="">Select student</option>{choices.map(s=><option key={s.id} value={s.id}>{s.name} · {s.class} · {s.gr}</option>)}
            </select>
          </div>}
          <div><label style={label}>Billing month</label><select style={input} value={month} onChange={e=>{setMonth(e.target.value);reset()}}>{MONTHS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><label style={label}>Year</label><select style={input} value={year} onChange={e=>{setYear(e.target.value);reset()}}>{[2025,2026,2027,2028,2029].map(y=><option key={y}>{y}</option>)}</select></div>
          <div><label style={label}>Due date <span style={{fontWeight:400}}>(default 10th)</span></label><input style={input} type="date" value={dueDate} onChange={e=>{setDueDate(e.target.value);reset()}}/></div>
          <div><label style={label}>Examination fee (optional)</label><input style={input} type="number" min="0" max="50000" step="1" value={examFee} onChange={e=>{setExamFee(e.target.value);reset()}}/></div>
        </div>
        <button type="button" style={{...secondary,minHeight:34,marginTop:12,padding:'7px 13px',fontSize:12}} onClick={()=>setShowAdvanced(x=>!x)}>
          Extra fee heads <ChevronDown size={13} style={{verticalAlign:'middle',marginLeft:6,transform:showAdvanced?'rotate(180deg)':undefined}}/>
        </button>
        {showAdvanced&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginTop:12}}>
          <div><label style={label}>New paper fund (do not repeat old dues)</label><input style={input} type="number" min="0" max="50000" value={paperFund} onChange={e=>{setPaperFund(e.target.value);reset()}}/></div>
          <div><label style={label}>Other charges</label><input style={input} type="number" min="0" max="50000" value={otherFee} onChange={e=>{setOtherFee(e.target.value);reset()}}/></div>
        </div>}
        <div style={{marginTop:17,display:'flex',flexWrap:'wrap',gap:10,justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <select style={{...input,minWidth:174}} aria-label="Voucher template" value={templateId} onChange={e=>onTemplateChange?.(e.target.value)}>
              {TEMPLATE_OPTIONS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button type="button" style={secondary} onClick={()=>setTemplateOpen(true)}><Eye size={15} style={{verticalAlign:'middle',marginRight:7}}/>Preview Template</button>
          </div>
          <button type="button" style={primary} disabled={!validSelection||busy} onClick={previewBatch}>{busy?'Checking...':'Review Vouchers'}</button>
        </div>
      </div>
      {error&&<div role="alert" style={{padding:12,border:'1px solid #e6b9b9',borderRadius:11,color:'#9e3131',background:'#fff9f9',fontSize:13}}>{error}</div>}
      {done&&<div style={panel} role="status">
        <CheckCircle2 size={18} style={{verticalAlign:'middle',color:'#137b59',marginRight:9}}/>
        <strong>{done.created} voucher(s) saved.</strong>
        <span style={{marginLeft:10,fontSize:12,color:'#66798d'}}>Existing vouchers were preserved. No payments were recorded.</span>
        <div style={{marginTop:14}}><button style={primary} type="button" onClick={()=>navigate('/fees/challans')}>Open Print View</button></div>
      </div>}
      {currentPreview&&<div style={panel}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <strong style={{fontSize:16}}>Preview before generating</strong>
          <span style={{fontSize:12,color:'#63788e'}}>{month} {year}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(125px,1fr))',gap:10,margin:'15px 0'}}>
          {[
            ['Will create',currentPreview.summary.ready],
            ['Already created',currentPreview.summary.existing],
            ['Needs review',currentPreview.summary.held],
            ['New payable',money(currentPreview.summary.due_total)],
            ['Carried arrears',money(currentPreview.summary.arrears)],
          ].map(([name,val])=><div key={name} style={{padding:12,borderRadius:11,background:'#f5f8fc',border:'1px solid #e9eff6'}}>
            <div style={{fontSize:11,color:'#6c8093'}}>{name}</div><strong style={{display:'block',fontSize:18,color:'#1b3d5b',marginTop:6}}>{val}</strong>
          </div>)}
        </div>
        <div style={{maxHeight:290,overflow:'auto',border:'1px solid #e5edf4',borderRadius:11}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead style={{position:'sticky',top:0,background:'#edf3f9'}}>
              <tr>{['Student / Class','Monthly','Previous arrears','Discount','Total','Status'].map(x=><th key={x} style={{padding:10,textAlign:'left',whiteSpace:'nowrap'}}>{x}</th>)}</tr>
            </thead>
            <tbody>{currentPreview.students.slice(0,80).map(s=><tr key={s.student_id} style={{borderTop:'1px solid #e8eef5'}}>
              <td style={{padding:10}}><strong>{s.name}</strong><div style={{color:'#798a9d',fontSize:11}}>{s.class} · {s.gr_number}</div></td>
              <td style={{padding:10}}>{money(s.monthly_fee)}</td><td style={{padding:10}}>{money(s.arrears)}</td>
              <td style={{padding:10}}>{money(s.discount)}</td><td style={{padding:10,fontWeight:700}}>{money(s.total)}</td>
              <td style={{padding:10}}>{s.status==='ready'?'Ready':s.status==='existing'?'Already exists':s.reason.replaceAll('_',' ')}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {currentPreview.students.length>80&&<div style={{fontSize:11,color:'#718397',marginTop:7}}>Showing first 80 of {currentPreview.students.length} students. All records are checked for generation.</div>}
        <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:17}}>
          <span style={{fontSize:12,color:'#63788e'}}>Only {currentPreview.summary.ready} new vouchers will be created. Existing and held invoices will not be changed.</span>
          {currentPreview.summary.ready>0?<button style={primary} type="button" onClick={createBatch} disabled={busy}>{busy?'Saving...':'Generate '+currentPreview.summary.ready+' Vouchers'}</button>
            :<button style={secondary} type="button" onClick={()=>navigate('/fees/challans')}>View Existing Vouchers</button>}
        </div>
      </div>}
      {templateOpen&&<div role="dialog" aria-modal="true" aria-label="Fee voucher template preview" style={{position:'fixed',inset:0,zIndex:10001,background:'rgba(16,37,56,.55)',display:'grid',placeItems:'center',padding:16}}>
        <div style={{background:'#fff',borderRadius:18,width:'min(760px,95vw)',maxHeight:'94vh',padding:16,display:'grid',gap:12,boxShadow:'0 24px 80px #102a4355'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong style={{color:'#163d5f'}}>Template preview · {template.label}</strong><button type="button" style={secondary} onClick={()=>setTemplateOpen(false)}>Close</button></div>
          <iframe title="Voucher layout preview" sandbox="" srcDoc={previewDoc} style={{border:'1px solid #d8e4ef',borderRadius:10,width:'100%',height:'min(70vh,650px)',background:'#fff'}}/>
          <span style={{fontSize:11,color:'#788ba0'}}>Preview only. No voucher created and no printing started.</span>
        </div>
      </div>}
    </div>
  )
}
