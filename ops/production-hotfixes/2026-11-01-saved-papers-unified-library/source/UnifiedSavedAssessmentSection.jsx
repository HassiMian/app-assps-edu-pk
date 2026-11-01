'use client'
import { useEffect, useRef, useState } from 'react'
import api from '@/utils/api'

// Two independent authoritative stores: this component NEVER sends
// assessment-studio identifiers through the legacy paper_vault edit/delete API.
export default function UnifiedSavedAssessmentSection({ ready }) {
  const [papers, setPapers] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [opening, setOpening] = useState('')
  const [refresh, setRefresh] = useState(0)
  const epoch = useRef(0)

  useEffect(() => {
    const scopeEpoch = epoch
    const token = ++scopeEpoch.current
    setPapers([])
    setSelected(null)
    setOpening('')
    setError('')
    if (!ready) {
      setStatus('idle')
      return () => { scopeEpoch.current++ }
    }
    setStatus('loading')
    api.get('/portal/paper-studio/library', { params: { limit: 100 } })
      .then(({ data }) => {
        if (epoch.current !== token) return
        if (data?.success !== true || !Array.isArray(data?.data?.assessments)) {
          throw new Error('The server did not provide an authorized Assessment Studio list.')
        }
        const rows = data.data.assessments
          .filter(p => p?.source === 'assessment-studio' && typeof p?.id === 'string')
          .map(p => ({
            id: p.id, name: String(p.name || 'Untitled assessment'),
            status: String(p.status || 'DRAFT'),
            revision: Number(p.revision || 0),
            reopenable: p.reopenable === true && p.revisionAvailable === true,
            updatedAt: p.updatedAt || null,
          }))
        setPapers(rows)
        setStatus('ready')
      })
      .catch(err => {
        if (epoch.current !== token) return
        setPapers([])
        setStatus('error')
        setError(err?.message || 'Assessment Studio papers could not be verified.')
      })
    return () => { scopeEpoch.current++ }
  }, [ready, refresh])

  async function review(paper) {
    const token = epoch.current
    if (!ready || status !== 'ready' || !paper.reopenable) return
    if (!/^[A-Za-z0-9._:-]{1,220}$/.test(paper.id)) {
      setError('Saved assessment identifier is invalid.')
      return
    }
    setSelected(null)
    setError('')
    setOpening(paper.id)
    try {
      const { data } = await api.get('/assessment-studio/papers/' + encodeURIComponent(paper.id))
      if (token !== epoch.current) return
      const record = data?.data
      if (data?.success !== true || !record?.document_json || !record?.content_hash) {
        throw new Error('This saved paper does not have a verified current revision.')
      }
      const doc = record.document_json
      const n = Array.isArray(doc.sections) ? doc.sections.length : null
      setSelected({
        id: paper.id, name: paper.name,
        revision: Number(record.current_revision || paper.revision),
        source: 'Assessment Studio',
        sectionCount: n,
        title: String(doc.metadata?.title || paper.name),
      })
    } catch (err) {
      if (token === epoch.current) setError(err?.response?.data?.message || err?.message || 'Verified revision could not be opened.')
    } finally {
      if (token === epoch.current) setOpening('')
    }
  }

  if (!ready) return null
  return (
    <section aria-label="Assessment Studio saved papers"
      style={{ background: '#f8fafc', border: '1px solid #dce3ec', borderRadius: 14, padding: '18px 20px', marginTop: 18, color: '#19314c' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 210 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Assessment Studio saved papers</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Separate verified assessment revisions. Vault rename, delete and print actions do not apply to these records.
          </div>
        </div>
        <button type="button" onClick={() => setRefresh(n => n + 1)}
          style={{ border: '1px solid #b7c9dd', background: 'white', borderRadius: 9, color: '#244363', padding: '8px 12px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
      {status === 'loading' && <div role="status" style={{ color: '#64748b', fontSize: 13 }}>Checking Assessment Studio records...</div>}
      {status === 'error' && <div role="alert" style={{ color: '#9a3412', fontSize: 13 }}>{error}</div>}
      {status === 'ready' && <>
        <div style={{ fontSize: 12, marginBottom: 12, color: '#475569' }}>
          {papers.length} school-authorized assessment records; {papers.filter(p => p.reopenable).length} with verified revisions.
        </div>
        {papers.length === 0 && <p style={{ fontSize: 13, color: '#64748b' }}>No Assessment Studio papers are available to this signed-in account.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          {papers.map(paper => (
            <div key={paper.id} style={{ padding: 12, border: '1px solid #d9e1eb', borderRadius: 10, background: 'white' }}>
              <div style={{ fontWeight: 700, fontSize: 13, overflowWrap: 'anywhere' }}>{paper.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>
                {paper.status} · Revision {paper.revision}
              </div>
              <div style={{ fontSize: 11, color: paper.reopenable ? '#236454' : '#94642d', marginTop: 5 }}>
                {paper.reopenable ? 'Verified revision available' : 'Metadata only — verified revision unavailable'}
              </div>
              <button type="button" disabled={!paper.reopenable || Boolean(opening)} onClick={() => review(paper)}
                style={{ marginTop: 10, borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700,
                  background: paper.reopenable ? '#e8f0f9' : '#eef2f6', color: paper.reopenable ? '#24547c' : '#94a3b8',
                  border: '1px solid #d1dce8', cursor: paper.reopenable ? 'pointer' : 'not-allowed' }}>
                {opening === paper.id ? 'Verifying...' : 'View verified revision'}
              </button>
            </div>
          ))}
        </div>
      </>}
      {selected && <div role="region" aria-label="Verified assessment details"
        style={{ background: '#edf4fb', border: '1px solid #bfd3e5', padding: 12, borderRadius: 9, marginTop: 14, fontSize: 13 }}>
        <strong>{selected.title}</strong>
        <p style={{ margin: '6px 0' }}>Source: {selected.source} · Revision {selected.revision}</p>
        {selected.sectionCount !== null && <p style={{ margin: '6px 0' }}>Sections: {selected.sectionCount}</p>}
        <p style={{ color: '#526982', marginBottom: 0 }}>Verified read-only summary. Full assessment editing requires the dedicated approved Assessment Studio editor.</p>
        <button type="button" onClick={() => setSelected(null)} style={{ marginTop: 8, background: 'white', border: '1px solid #bfd3e5', padding: '5px 9px', borderRadius: 7 }}>Close details</button>
      </div>}
      {error && status === 'ready' && <div role="alert" style={{ marginTop: 10, color: '#9a3412', fontSize: 12 }}>{error}</div>}
    </section>
  )
}
