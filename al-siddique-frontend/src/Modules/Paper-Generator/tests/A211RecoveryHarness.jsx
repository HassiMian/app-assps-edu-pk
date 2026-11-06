import React from 'react'
import { createRoot } from 'react-dom/client'
import LegacyPaperRecoveryPanel from '../LegacyPaperRecoveryPanel'
const params = new URL(location.href).searchParams
const role = params.get('role') || 'principal'
const actor = { role, id: 5, school_id: 1 }
createRoot(document.getElementById('root')).render(<LegacyPaperRecoveryPanel user={actor} verifyActor={async () => ({...actor, school_id:Number(params.get('verifiedSchool')||1)})} />)
