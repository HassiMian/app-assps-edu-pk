// PaperGenerator.jsx — ASSPS clean Paper Workspace router
import { lazy, Suspense, useEffect, useState } from 'react'
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
const DailyDiaryFeature = lazy(() => import('./DailyDiaryWorkspace'))
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
  return <button
    type="button"
    onClick={onClick}
    style={{
      background:active?'#0b2a4a':'#f7f9fc',
      color:active?'#fff':'#27425a',
      fontWeight:800,
      fontSize:12,
      padding:'9px 16px',
      borderRadius:9,
      border:active?'1px solid #0b2a4a':'1px solid #d9e4ee',
      boxShadow:active?'0 5px 14px rgba(11,42,74,.16)':'none',
      cursor:'pointer',
      whiteSpace:'nowrap',
      transition:'all .15s ease',
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
  const [diaryLaunch, setDiaryLaunch] = useState(null)

  useEffect(() => {
    const openLessonCards = event => {
      setDiaryLaunch({ ...(event?.detail || {}), nonce:Date.now() })
      setModuleTab('diary')
    }
    window.addEventListener('assps-open-diary-lesson-plan', openLessonCards)
    return () => window.removeEventListener('assps-open-diary-lesson-plan', openLessonCards)
  }, [])

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
      className={moduleTab === 'early_years' ? 'paper-generator-module-wrap early-years-module-wrap' : 'paper-generator-module-wrap'}
      style={moduleTab === 'early_years'
        ? { height:'calc(100dvh - 78px)', minHeight:0, width:'100%', background:'#071e34', display:'flex', flexDirection:'column', overflow:'hidden' }
        : { minHeight:'100vh', width:'100%', background:'#f4f7fb' }
      }
    >
      <div
        className={moduleTab === 'early_years' ? 'paper-generator-module-tabs no-print' : 'paper-generator-module-tabs'}
        style={{
          padding:'10px 18px',
          display:'flex',
          flexWrap:'wrap',
          gap:8,
          borderBottom:'1px solid #d9e4ee',
          background:'rgba(255,255,255,0.96)',
          boxShadow:'0 4px 16px rgba(15,43,70,.05)',
          position:'sticky',
          top:0,
          zIndex:30,
          flexShrink:0,
        }}
      >
        {MODULE_TABS.map(tab=><TabBtn key={tab.id} active={moduleTab===tab.id} onClick={()=>openModuleTab(tab)}>{tab.label}</TabBtn>)}
      </div>
      <Suspense fallback={<div style={{padding:40,color:'#526679'}}>Loading...</div>}>{children}</Suspense>
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
    return <ModuleWrap><EarlyYearsStudio initialPaperId={loadedSavedPaper?.id || 'ey-starter-english-2026'} onReturnToSource={returnToSource}/></ModuleWrap>
  }
  if (moduleTab === 'diary') {
    return <ModuleWrap><DailyDiaryFeature initialMode={diaryLaunch ? 'lesson' : 'diary'} initialLessonPlanId={diaryLaunch?.planId || ''} initialContext={diaryLaunch || null}/></ModuleWrap>
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
