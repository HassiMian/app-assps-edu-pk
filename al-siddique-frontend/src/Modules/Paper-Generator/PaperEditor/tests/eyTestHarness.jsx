// eyTestHarness.jsx — Test harness for Early Years browser acceptance tests
import React, { useState, useEffect, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import EarlyYearsWorksheetEditor from '../earlyYears/EarlyYearsWorksheetEditor.jsx'
import PaperGenerator from '../../PaperGenerator.jsx'
import '@/index.css'

function EarlyYearsHarnessApp() {
  const [paperId, setPaperId] = useState('ey-starter-english-2026')
  const [mode, setMode] = useState('editor')

  useEffect(() => {
    window.__EY_LOAD_PAPER__ = (id) => {
      setPaperId(id)
    }

    // Read initial mode from URL search param if present
    const params = new URLSearchParams(window.location.search)
    const m = params.get('mode')
    if (m === 'generator' || m === 'real-product') {
      setMode('generator')
    }
    const paperParam = params.get('paper')
    if (paperParam) {
      setPaperId(paperParam)
    }
  }, [])

  if (mode === 'generator') {
    return (
      <MemoryRouter initialEntries={['/paper-generator']}>
        <Routes>
          <Route
            path="/paper-generator"
            element={
              <Suspense fallback={<div style={{ padding: 40, color: '#C0C8D8' }}>Loading Paper Generator...</div>}>
                <PaperGenerator />
              </Suspense>
            }
          />
        </Routes>
      </MemoryRouter>
    )
  }

  return (
    <EarlyYearsWorksheetEditor
      key={paperId}
      initialPaperId={paperId}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<EarlyYearsHarnessApp />)
