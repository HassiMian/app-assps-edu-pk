
import React, {useState} from 'react'
import ReactDOM from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {ThemeProvider} from '@/context/ThemeContext.jsx'
import {AuthProvider} from '@/context/AuthContext.jsx'
import {TenantBrandingProvider} from '@/context/TenantBrandingContext.jsx'
import AppLayout from '@/components/Layout/AppLayout.jsx'
import SavedPapersVisualV14 from '../../SavedPapersVisualV14.jsx'
import NotificationModule from '@/Modules/notifications/NotificationModule.jsx'
import '@/index.css'

const initialPapers=[
 {id:'p1',name:'First Term Examination 2026 - Class 7 - Urdu',config:{classLevel:'7',subject:'Urdu',examType:'First Term Examination 2026'},createdAt:'2026-09-29T17:17:00Z',stats:{mcqCount:10,shortCount:10,longCount:2,totalMarks:75}},
 {id:'p2',name:'First Term Examination 2026 - Class 8 - Science',config:{classLevel:'8',subject:'Science',examType:'First Term Examination 2026'},createdAt:'2026-09-29T17:17:00Z',stats:{mcqCount:10,shortCount:14,longCount:2,totalMarks:50}},
 {id:'p3',name:'First Term Examination 2026 - Class 1 - English',config:{classLevel:'1',subject:'English',examType:'First Term Examination 2026'},createdAt:'2026-09-20T00:00:00Z',stats:{mcqCount:0,shortCount:2,longCount:1,totalMarks:50}},
 {id:'p4',name:'First Term Examination 2026 - Class 3 - Mathematics',config:{classLevel:'3',subject:'Mathematics',examType:'First Term Examination 2026'},createdAt:'2026-09-29T17:17:00Z',stats:{mcqCount:0,shortCount:0,longCount:0,totalMarks:60}},
]
function SavedPapersFixture(){
 const [savedPapers,setSavedPapers]=useState(initialPapers)
 const [renaming,setRenaming]=useState(null)
 const [renameVal,setRenameVal]=useState('')
 const [search,setSearch]=useState('')
 const [confirmDelete,setConfirmDelete]=useState(null)
 const filtered=savedPapers.filter(p=>[p.name,p.config.subject,p.config.classLevel].some(value=>String(value||'').toLowerCase().includes(search.toLowerCase())))
 const startRename=p=>{setRenaming(p.id);setRenameVal(p.name)}
 const submitRename=()=>{setSavedPapers(p=>p.map(row=>row.id===renaming?{...row,name:renameVal.trim()||row.name}:row));setRenaming(null)}
 return <SavedPapersVisualV14 savedPapers={savedPapers} filtered={filtered} search={search} setSearch={setSearch}
 categoryStats={paper=>paper.stats} fmtDate={date=>new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
 renaming={renaming} renameVal={renameVal} setRenameVal={setRenameVal} setRenaming={setRenaming}
 startRename={startRename} submitRename={submitRename} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
 deleteSavedPaper={id=>setSavedPapers(p=>p.filter(row=>row.id!==id))}
 onLoadPaper={(paper,mode)=>{window.__v14LoadAction={paperId:paper.id,mode:mode||'preview'}}}/>
}
ReactDOM.createRoot(document.getElementById('root')).render(
 <AuthProvider><TenantBrandingProvider><ThemeProvider><MemoryRouter initialEntries={['/paper-generator']}>
  <AppLayout><Routes><Route path="/paper-generator" element={<SavedPapersFixture/>}/><Route path="/notifications" element={<NotificationModule/>}/><Route path="*" element={<SavedPapersFixture/>}/></Routes></AppLayout>
 </MemoryRouter></ThemeProvider></TenantBrandingProvider></AuthProvider>
)
