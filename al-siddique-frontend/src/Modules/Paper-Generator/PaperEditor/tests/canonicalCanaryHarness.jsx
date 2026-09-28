import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext.jsx'
import PaperGenerator from '../../PaperGenerator.jsx'
import '@/index.css'

function CanaryHarnessApp() {
  const params = new URLSearchParams(window.location.search)
  const canary = params.get('canonicalCanary') === '1'
  const initialEntry = canary
    ? '/paper-generator?canonicalCanary=1'
    : '/paper-generator'

  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/paper-generator"
            element={
              <Suspense fallback={<div>Loading Paper Generator...</div>}>
                <PaperGenerator />
              </Suspense>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<CanaryHarnessApp />)
