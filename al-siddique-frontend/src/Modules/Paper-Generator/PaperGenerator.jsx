// PaperGenerator.jsx — ASSPS teacher Paper Studio router
import { lazy, Suspense, useState } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import './paperStudioShell.css'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { resolvePaperRoute } from './resolvePaperRoute.js'
import { createDuplicatePaperDraft } from './paperCreationDraft.js'
import { loadAssessmentPaper } from './AssessmentStudio/core/assessmentPersistence.js'
import { mergeServerDocumentIntoLocalPaper } from './AssessmentStudio/core/manualAssessmentDocument.js'

const SavedPapersTab = lazy(() => import('./SavedPapersTab'))
const LessonPlanModule = lazy(() => import('./LessonPlanModule'))
const PTSPaperGenerator = lazy(() => import('./PTSPaperGenerator'))
const BoardPaperGenerator = lazy(() => import('./BoardPaperGenerator'))
const QuestionBank = lazy(() => import('./QuestionBank'))
const DailyDiaryFeature = lazy(() => import('./DailyDiaryFeature'))
const PaperEditorRouter = lazy(() => import('./PaperEditor/editorV2/PaperEditorRouter'))
const EarlyYearsStudio = lazy(() => import('./PaperEditor/earlyYears/EarlyYearsStudio'))

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
  return (
    <button type="button" aria-current={active ? 'page' : undefined}
      className={active ? 'studio-nav-tab studio-nav-tab-active' : 'studio-nav-tab'}
      onClick={onClick}>
      {children}
    </button>
  )
}

export default function PaperGenerator() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme: studioTheme } = useTheme()
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

  const handleLoadPaper = async (paper, targetTab = null) => {
    let resolvedPaper = paper
    if (paper?.userAuthored && (paper.serverPaperId || paper.canonicalDocument?.id)) {
      try {
        const server = await loadAssessmentPaper(paper.serverPaperId || paper.canonicalDocument.id)
        if (server?.document_json) resolvedPaper = mergeServerDocumentIntoLocalPaper(paper, server.document_json, server)
      } catch (error) {
        const retryable = !error?.response || error.response.status === 408 || error.response.status === 429 || error.response.status >= 500
        resolvedPaper = { ...paper, persistenceMode:retryable ? 'DEGRADED_OFFLINE' : (paper.persistenceMode || 'LOCAL_RECOVERY'), serverReopenError:error?.response?.status || 'NETWORK' }
      }
    }
    setLoadedSavedPaper(resolvedPaper)
    setModuleTab(resolvePaperRoute(resolvedPaper, targetTab, {
      officialCanonicalCanary,
      forceOfficialLegacyRoute,
    }))
  }

  const returnToSource = () => setModuleTab(loadedSavedPaper?.sourceTab || 'saved')

  const ModuleWrap = ({ children }) => (
    <div
      className={moduleTab === 'early_years' ? 'assps-paper-studio paper-generator-module-wrap early-years-module-wrap' : 'assps-paper-studio paper-generator-module-wrap'}
      data-studio-theme={studioTheme}
      style={moduleTab === 'early_years'
        ? { height:'calc(100dvh - 78px)', minHeight:0, width:'100%', background:studioTheme==='light'?'#f3f7fb':'#0c2038', display:'flex', flexDirection:'column', overflow:'hidden' }
        : { minHeight:'100vh', width:'100%', background:studioTheme==='light'?'#f3f7fb':'#0c2038' }
      }
    >
      <header className="assps-studio-header no-print" style={{display:moduleTab==='early_years'?'none':undefined,padding:'28px 26px 20px',background:studioTheme==='light'?'#ffffff':'#112c47',borderBottom:'1px solid '+C.border}}>
        <div style={{color:studioTheme==='light'?'#007d88':'#4ccbc6',fontSize:11,letterSpacing:1.6,fontWeight:850}}>ASSPS / ACADEMICS / ASSESSMENT STUDIO</div>
        <h1 style={{fontSize:34,letterSpacing:-1.1,fontWeight:800,margin:'9px 0 5px',color:studioTheme==='light'?'#123451':'#ecf6ff'}}>Paper Studio</h1>
        <p style={{fontSize:13,margin:0,color:studioTheme==='light'?'#62758a':'#b3cadd'}}>Create, organize and print school assessments in one connected workspace.</p>
      </header>
      <div
        className='assps-studio-navigation paper-generator-module-tabs no-print'
        style={{
          padding:'10px 24px',
          display:'flex',
          flexWrap:'wrap',
          gap:8,
          borderBottom:'1px solid '+C.border,
          background:studioTheme==='light'?'#ffffff':'#112c47',
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
    return <ModuleWrap><PTSPaperGenerator key={loadedSavedPaper?.id || (loadedSavedPaper?.creationMethod==='duplicate' ? `copy-${loadedSavedPaper.duplicateOf}` : 'new-paper')} loadedPaper={loadedSavedPaper} onOpenSaved={()=>setModuleTab('saved')} onOpenEarlyYears={()=>setModuleTab('early_years')} onReturnToSource={returnToSource}/></ModuleWrap>
  }
  if (moduleTab === 'saved') {
    return <ModuleWrap><SavedPapersTab onLoadPaper={handleLoadPaper} onDuplicatePaper={handleDuplicatePaper}/></ModuleWrap>
  }
  if (moduleTab === 'bank') {
    return <ModuleWrap><QuestionBank/></ModuleWrap>
  }
  if (moduleTab === 'early_years') {
    return <ModuleWrap><EarlyYearsStudio initialPaperId={loadedSavedPaper?.id || 'ey-starter-english-2026'} onReturnToSource={returnToSource}/></ModuleWrap>
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
