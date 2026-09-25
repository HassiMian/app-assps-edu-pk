// eyTestHarness.jsx — Test harness for Early Years browser acceptance tests
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import EarlyYearsWorksheetEditor from '../earlyYears/EarlyYearsWorksheetEditor.jsx'
import '@/index.css'

function EarlyYearsHarnessApp() {
  const [paperId, setPaperId] = useState('ey-starter-english-2026')

  useEffect(() => {
    window.__EY_LOAD_PAPER__ = (id) => {
      setPaperId(id)
    }

    // Read initial mode from URL search param if present
    const params = new URLSearchParams(window.location.search)
    const paperParam = params.get('paper')
    if (paperParam) {
      setPaperId(paperParam)
    }
  }, [])

  return (
    <EarlyYearsWorksheetEditor
      key={paperId}
      initialPaperId={paperId}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<EarlyYearsHarnessApp />)
