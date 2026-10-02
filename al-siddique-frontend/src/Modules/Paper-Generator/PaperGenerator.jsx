// PaperGenerator.jsx — ASSPS clean Paper Workspace router
import { lazy, Suspense, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { resolvePaperRoute } from './resolvePaperRoute.js'
import { createDuplicatePaperDraft } from './paperCreationDraft.js'

const SavedPapersTab = lazy(() => import('./SavedPapersTab'))
const LessonPlanModule = lazy(() => import('./LessonPlanModule'))
const PTSPaperGenerator = lazy(() => import('./PTSPaperGenerator'))
const BoardPaperGenerator = lazy(() => import('./BoardPaperGenerator'))
const QuestionBank = lazy(() => import('./QuestionBank'))
const DailyDiaryFeature = lazy(() => import('./DailyDiaryFeature'))
const PaperEditorRouter = lazy(() => import('./PaperEditor/editorV2/PaperEditorRouter'))
const EarlyYearsWorksheetEditor = lazy(() => import('./PaperEditor/earlyYears/EarlyYearsWorksheetEditor'))

export { resolvePaperRoute }

const C = {
  gold:'#C8991A',
  goldL:'#e8b420',
  silver:'#C0C8D8',
  border:'rgba(148,163,184,0.18)',
}

const MODULE_TABS = [
  { id:'build', label:'Paper Workspace' },
  { id:'saved', label:'Saved Papers' },
  { id:'bank', label:'Question Bank' },
  { id:'early_years', label:'Pre Classes Papers' },
  { id:'diary', label:'Daily Diary' },
  { id:'lesson', label:'Lesson Plans' },
]

// Only compatibility routes still required by saved documents remain reachable.
// Old AI/manual/scan/notes/unified dashboard routes are intentionally retired from
// Paper Generator; their files remain in git history and can be restored if needed.
const COMPATIBILITY_TABS = new Set(['word_editor','board_pattern'])
const ROUTABLE_TAB_IDS = new Set([...MODULE_TABS.map(tab=>tab.id), ...COMPATIBILITY_TABS])

function TabBtn({ active, onClick, children }) {
  return <button
    type="button"
    onClick={onClick}
    style={{
      background:active?('linear-gradient(135deg,'+C.gold+','+C.goldL+')'):'rgba(15,23,42,0.46)',
      color:active?'#071e34':C.silver,
      fontWeight:700,
      fontSize:13,
      padding:'9px 20px',
      borderRadius:10,
      border:active?'none':('1px solid '+C.border),
      cursor:'pointer',
      whiteSpace:'nowrap',
    }}
  >{children}</button>
}

export default function PaperGenerator() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedTab = searchParams.get('tab')
  const officialCanonicalCanary = searchParams.get('canonicalCanary') === '1'
  const forceOfficialLegacyRoute = searchParams.get('canonicalLegacy') === '1'
  const initialTab = ROUTABLE_TAB_IDS.has(requestedTab) ? requestedTab : 'build'
  const [moduleTab, setModuleTab] = useState(initialTab)
  const [loadedSavedPaper, setLoadedSavedPaper] = useState(null)

  const openModuleTab = tab => {
    if (tab.path) navigate(tab.path)
    else {
      if (tab.id === 'build' && moduleTab !== 'build') setLoadedSavedPaper(null)
      setModuleTab(tab.id)
    }
  }

  const handleDuplicatePaper = paper => {
    setLoadedSavedPaper(createDuplicatePaperDraft(paper))
    setModuleTab('build')
  }

  const handleLoadPaper = (paper, targetTab = null) => {
    setLoadedSavedPaper(paper)
    setModuleTab(resolvePaperRoute(paper, targetTab, {
      officialCanonicalCanary,
      forceOfficialLegacyRoute,
    }))
  }

  const returnToSource = () => setModuleTab(loadedSavedPaper?.sourceTab || 'saved')

  const ModuleWrap = ({ children }) => (
    <div
      className={moduleTab === 'early_years' ? 'paper-generator-module-wrap early-years-module-wrap' : 'paper-generator-module-wrap'}
      style={moduleTab === 'early_years'
        ? { height:'calc(100dvh - 78px)', minHeight:0, width:'100%', background:'#071e34', display:'flex', flexDirection:'column', overflow:'hidden' }
        : { minHeight:'100vh', width:'100%', background:'#071e34' }
      }
    >
      <div
        className={moduleTab === 'early_years' ? 'paper-generator-module-tabs no-print' : 'paper-generator-module-tabs'}
        style={{
          padding:'10px 24px',
          display:'flex',
          flexWrap:'wrap',
          gap:8,
          borderBottom:'1px solid '+C.border,
          background:'rgba(7,25,48,0.98)',
          position:'sticky',
          top:0,
          zIndex:30,
          flexShrink:0,
        }}
      >
        {MODULE_TABS.map(tab=><TabBtn key={tab.id} active={moduleTab===tab.id} onClick={()=>openModuleTab(tab)}>{tab.label}</TabBtn>)}
      </div>
      <Suspense fallback={<div style={{padding:40,color:C.silver}}>Loading...</div>}>{children}</Suspense>
    </div>
  )

  if (moduleTab === 'build') {
    return <ModuleWrap><PTSPaperGenerator key={loadedSavedPaper?.id || (loadedSavedPaper?.creationMethod==='duplicate' ? `copy-${loadedSavedPaper.duplicateOf}` : 'new-paper')} loadedPaper={loadedSavedPaper} onOpenSaved={()=>setModuleTab('saved')} onReturnToSource={returnToSource}/></ModuleWrap>
  }
  if (moduleTab === 'saved') {
    return <ModuleWrap><SavedPapersTab onLoadPaper={handleLoadPaper} onDuplicatePaper={handleDuplicatePaper}/></ModuleWrap>
  }
  if (moduleTab === 'bank') {
    return <ModuleWrap><QuestionBank/></ModuleWrap>
  }
  if (moduleTab === 'early_years') {
    return <ModuleWrap><EarlyYearsWorksheetEditor initialPaperId={loadedSavedPaper?.id || 'ey-starter-english-2026'} onReturnToSource={returnToSource}/></ModuleWrap>
  }
  if (moduleTab === 'diary') {
    return <ModuleWrap><DailyDiaryFeature/></ModuleWrap>
  }
  if (moduleTab === 'lesson') {
    return <ModuleWrap><LessonPlanModule/></ModuleWrap>
  }

  // Compatibility only: these routes are not shown in normal Paper Generator navigation.
  if (moduleTab === 'word_editor') {
    return <ModuleWrap><PaperEditorRouter loadedPaper={loadedSavedPaper} onReturnToSource={returnToSource}/></ModuleWrap>
  }
  if (moduleTab === 'board_pattern') {
    return <ModuleWrap><BoardPaperGenerator loadedPaper={loadedSavedPaper} onReturnToSource={returnToSource}/></ModuleWrap>
  }

  return <ModuleWrap><PTSPaperGenerator loadedPaper={loadedSavedPaper} onReturnToSource={returnToSource}/></ModuleWrap>
}
