import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import PaperEditorRouter from '../editorV2/PaperEditorRouter.jsx'
import canonicalCorpusData from '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json'
import v13DatasetData from '../../seed-data/official-first-term-2026-v13.json'
import '../editorV2/canonicalEditor.css'
import '@/index.css'

const canonicalDocs = canonicalCorpusData.documents
const v13Papers = v13DatasetData.papers

if (typeof window !== 'undefined') {
  window.__B3_DIAGNOSTICS__ = {
    rootRenderCount: 0,
    documentRendererRenderCount: 0,
    fieldRenderCounts: {},
    editorCreationCounts: {},
    localSetContentCounts: {},
  }
}

function B3HarnessApp() {
  const [paper, setPaper] = useState(null)

  useEffect(() => {
    window.__B3_RESET_DIAGNOSTICS__ = () => {
      window.__B3_DIAGNOSTICS__ = {
        rootRenderCount: 0,
        documentRendererRenderCount: 0,
        fieldRenderCounts: {},
        editorCreationCounts: {},
        localSetContentCounts: {},
      }
    }

    window.__B3_LOAD_PAPER__ = (type) => {
      let p = null
      if (typeof type === 'string' && canonicalDocs.some(doc => doc.id === type)) {
        p = canonicalDocs.find(doc => doc.id === type)
      } else if (type === 'canonical-english') {
        p = canonicalDocs.find(doc => doc.id.includes('class-4-english')) || canonicalDocs[0]
      } else if (type === 'canonical-urdu') {
        p = canonicalDocs.find(doc => doc.id.includes('class-6-urdu'))
      } else if (type === 'pristine-v13') {
        p = v13Papers[0]
      } else if (type === 'modified-v13') {
        const modified = JSON.parse(JSON.stringify(v13Papers[0]))
        modified.official_section[0].content = 'Custom modified question by user'
        p = modified
      } else if (type === 'legacy-schema2') {
        p = { schemaVersion: 2, sections: [] }
      } else if (typeof type === 'object') {
        p = type
      }

      if (p && p.format === 'assps-canonical-paper') {
        window.__B3_BASELINE_CAPTURE__ = {
          docJson: JSON.stringify(p),
          sourceIdentityJson: JSON.stringify(p.sourceIdentity),
          sourceCoverageLedgerJson: JSON.stringify(p.sourceCoverageLedger),
          authorityJson: JSON.stringify(p.authority),
          nodeMarksJson: JSON.stringify(p.sections.map(s => s.nodes.map(n => n.nodeMarks))),
          reference: p,
        }
      }

      setPaper(p)
    }

    window.__B3_VERIFY_BASELINE_INTEGRITY__ = () => {
      const capture = window.__B3_BASELINE_CAPTURE__
      if (!capture) return { ok: false, error: 'NO_BASELINE_CAPTURE' }
      const current = capture.reference

      const currentJson = JSON.stringify(current)
      if (currentJson !== capture.docJson) {
        return { ok: false, error: 'CANONICAL_BASELINE_DOC_MUTATED' }
      }
      if (JSON.stringify(current.sourceIdentity) !== capture.sourceIdentityJson) {
        return { ok: false, error: 'SOURCE_IDENTITY_MUTATED' }
      }
      if (JSON.stringify(current.sourceCoverageLedger) !== capture.sourceCoverageLedgerJson) {
        return { ok: false, error: 'SOURCE_COVERAGE_LEDGER_MUTATED' }
      }
      if (JSON.stringify(current.authority) !== capture.authorityJson) {
        return { ok: false, error: 'AUTHORITY_MUTATED' }
      }
      if (JSON.stringify(current.sections.map(s => s.nodes.map(n => n.nodeMarks))) !== capture.nodeMarksJson) {
        return { ok: false, error: 'NODE_MARKS_MUTATED' }
      }
      return { ok: true }
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
