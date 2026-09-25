import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import PaperEditorRouter from '../editorV2/PaperEditorRouter.jsx'
import canonicalCorpusData from '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json'
import v13DatasetData from '../../seed-data/official-first-term-2026-v13.json'
import '../editorV2/canonicalEditor.css'
import '@/index.css'

const canonicalDocs = canonicalCorpusData.documents
const v13Papers = v13DatasetData.papers

function B3HarnessApp() {
  const [paper, setPaper] = useState(null)

  useEffect(() => {
    window.__B3_LOAD_PAPER__ = (type) => {
      if (type === 'canonical-english') {
        setPaper(canonicalDocs[0])
      } else if (type === 'canonical-urdu') {
        const u = canonicalDocs.find(p => p.id.includes('class-6-urdu'))
        setPaper(u)
      } else if (type === 'pristine-v13') {
        setPaper(v13Papers[0])
      } else if (type === 'modified-v13') {
        const modified = JSON.parse(JSON.stringify(v13Papers[0]))
        modified.official_section[0].content = 'Custom modified question by user'
        setPaper(modified)
      } else if (type === 'legacy-schema2') {
        setPaper({ schemaVersion: 2, sections: [] })
      } else if (typeof type === 'object') {
        setPaper(type)
      }
    }

    const params = new URLSearchParams(window.location.search)
    const initMode = params.get('mode') || 'pristine-v13'
    window.__B3_LOAD_PAPER__(initMode)
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div id="b3-harness-controls" style={{ padding: '6px 12px', background: '#0a192f', borderBottom: '1px solid #334155', display: 'flex', gap: '8px', zIndex: 9999 }}>
        <button id="btn-load-pristine-v13" onClick={() => window.__B3_LOAD_PAPER__('pristine-v13')}>Load Pristine V13</button>
        <button id="btn-load-canonical-english" onClick={() => window.__B3_LOAD_PAPER__('canonical-english')}>Load Canonical English</button>
        <button id="btn-load-canonical-urdu" onClick={() => window.__B3_LOAD_PAPER__('canonical-urdu')}>Load Canonical Urdu</button>
        <button id="btn-load-modified-v13" onClick={() => window.__B3_LOAD_PAPER__('modified-v13')}>Load Modified V13</button>
        <button id="btn-load-legacy-schema2" onClick={() => window.__B3_LOAD_PAPER__('legacy-schema2')}>Load Legacy Schema 2</button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {paper ? <PaperEditorRouter key={paper.id || 'paper'} loadedPaper={paper} /> : <div id="b3-loading">Loading paper...</div>}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<B3HarnessApp />)
