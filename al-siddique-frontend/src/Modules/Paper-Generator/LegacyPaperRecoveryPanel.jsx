import { useEffect, useState } from 'react'
import { encryptedLegacyPaperBackup, verifyEncryptedLegacyPaperBackup, inspectPaperRecoverySources, attestPaperRecoverySources, sameAuthorizedRecoveryActor } from './legacyPaperRecovery.js'

const labels = {
  'legacy-local': 'Older browser store — local storage',
  'legacy-session': 'Older browser store — emergency session',
  'current-local': 'Current school-scoped store — local storage',
  'current-session': 'Current school-scoped store — emergency session',
  'prior-school-local': 'Earlier same-school ID store — local storage',
  'prior-school-session': 'Earlier same-school ID store — emergency session',
}
const border = '1px solid #d9e2ec'
const button = { border, borderRadius: 9, padding: '9px 14px', background: '#edf3f9', color: '#133455', fontWeight: 700, cursor:'pointer' }

const getAreas = () => {
  let localStorage = null, sessionStorage = null
  try { localStorage = window.localStorage } catch { /* blocked browser storage */ }
  try { sessionStorage = window.sessionStorage } catch { /* blocked browser storage */ }
  return { localStorage, sessionStorage }
}

export default function LegacyPaperRecoveryPanel({ user, verifyActor }) {
  const [inventory, setInventory] = useState(null)
  const [selected, setSelected] = useState('')
  const [verifiedOwner, setVerifiedOwner] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [status, setStatus] = useState('')
  const [working, setWorking] = useState(false)
  const [verifyFile, setVerifyFile] = useState(null)
  const [verifyPassphrase, setVerifyPassphrase] = useState('')

  useEffect(() => {
    setInventory(null)
    setVerifyFile(null)
    setVerifyPassphrase('')
    setSelected('')
    setVerifiedOwner(false)
    setPassphrase('')
    setStatus('')
  }, [user?.id, user?.school_id, user?.tenant_id, user?.role])

  const checkServerIdentity = async () => {
    if (typeof verifyActor !== 'function') throw new Error('ACCOUNT_RECHECK_REQUIRED')
    const current = await verifyActor()
    if (!sameAuthorizedRecoveryActor(user, current)) throw new Error('ACCOUNT_SCHOOL_OR_ROLE_CHANGED')
  }

  const inspect = async () => {
    if (working) return
    setWorking(true)
    try {
      await checkServerIdentity()
      const storage = getAreas()
      const discovered = inspectPaperRecoverySources({ user, storage })
      const report = await attestPaperRecoverySources({ user, storage, cryptography:window.crypto, report:discovered })
    setInventory(report)
    setVerifiedOwner(false)
    setPassphrase('')
    const first = report.sources?.find(s => s.state === 'valid' && s.count > 0)
    setSelected(first?.id || '')
      setStatus(report.authorized ? 'Verified school account. Browser-only inventory complete; original data has not been moved.' : 'Verified school Principal or Administrator account required.')
    } catch {
      setInventory(null)
      setSelected('')
      setVerifiedOwner(false)
      setPassphrase('')
      setStatus('Server-backed school identity could not be verified. Recovery remains locked.')
    } finally {
      setWorking(false)
    }
  }

  async function downloadEncryptedCopy() {
    if (!selected || working) return
    setWorking(true)
    setStatus('')
    try {
      await checkServerIdentity()
      const inspectedSource = inventory?.sources?.find(row => row.id === selected && row.state === 'valid')
      if (!inspectedSource?.rawSha256) throw new Error('PAPER_SOURCE_NOT_ATTESTED')
      const backup = await encryptedLegacyPaperBackup({
        user, source: selected, confirmedOwner: verifiedOwner,
        expectedOriginalSha256:inspectedSource.rawSha256,
        passphrase, cryptography: window.crypto,
        storage: getAreas(), now: new Date().toISOString(),
      })
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `ASSPS_papers_encrypted_${backup.schoolScope}_${selected}_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setPassphrase('')
      setVerifiedOwner(false)
      setStatus(`Encrypted local backup prepared for ${backup.count} papers. Store the passphrase securely; it cannot be recovered from the file. No server upload or import occurred.`)
    } catch (e) {
      const allowed = new Set(['SCHOOL_OWNERSHIP_CONFIRMATION_REQUIRED','BACKUP_PASSPHRASE_AT_LEAST_14_CHARACTERS','PAPER_SOURCE_UNAVAILABLE','NO_VALID_SOURCE_PAPERS','SECURE_BROWSER_REQUIRED','ACCOUNT_RECHECK_REQUIRED','ACCOUNT_SCHOOL_OR_ROLE_CHANGED','PAPER_SOURCE_CHANGED_SINCE_INSPECTION','PAPER_SOURCE_NOT_ATTESTED'])
      setStatus(allowed.has(e?.message) ? e.message.replaceAll('_',' ') : 'Unable to prepare encrypted backup. Original browser storage was not changed.')
    } finally {
      setWorking(false)
    }
  }

  async function verifyEncryptedCopy() {
    if (!verifyFile || working) return
    setWorking(true)
    setStatus('')
    try {
      await checkServerIdentity()
      if (verifyFile.size > 24 * 1024 * 1024) throw new Error('ENCRYPTED_FILE_TOO_LARGE')
      const backup = JSON.parse(await verifyFile.text())
      const result = await verifyEncryptedLegacyPaperBackup({
        user, backup, passphrase:verifyPassphrase, cryptography:window.crypto,
      })
      setStatus(`Encrypted local backup verified for ${result.paperCount} original papers in ${result.schoolScope}. No papers were uploaded or imported.`)
      setVerifyPassphrase('')
    } catch {
      setStatus('Verification failed: wrong passphrase, damaged file, or different school. Original browser and server data were not changed.')
    } finally { setWorking(false) }
  }

  const exportable = inventory?.sources?.filter(s => s.state === 'valid' && s.count > 0 && s.rawSha256) || []
  return (
    <section aria-label="Read-only saved paper recovery" style={{ background:'#f8fbff', color:'#193954', border, borderRadius:14, padding:'15px 18px', marginBottom:16 }}>
      <strong style={{ fontSize:15 }}>Saved Papers — Local Recovery Inspection</strong>
      <p style={{ fontSize:12, lineHeight:1.6, margin:'6px 0 10px' }}>
        Existing papers may be in this browser's older storage, not the server library. Inspection is read-only.
        Never clear site data or close an emergency browser session before preserving its papers.
      </p>
      <button type="button" style={button} disabled={working} onClick={inspect}>{working ? 'Verifying school...' : 'Inspect this browser only'}</button>
      {inventory?.authorized && <div style={{ marginTop:12, display:'grid', gap:6 }}>
        <div style={{ fontSize:12, color:'#566c82' }}>Verified account scope: {inventory.scope}. No paper titles or questions are displayed.</div>
        {inventory.sources.map(source => <div key={source.id} style={{ fontSize:12, display:'flex', gap:8, justifyContent:'space-between', borderBottom:'1px solid #e4ebf2', padding:'5px 0' }}>
          <span>{labels[source.id]}</span>
          <strong>{source.state === 'valid' ? `${source.count} papers` : source.state === 'absent' ? 'Not found' : source.state}</strong>
        </div>)}
        {exportable.length>0 && <div style={{ marginTop:8, display:'grid', gap:9 }}>
          <label style={{ fontSize:12, fontWeight:700 }} htmlFor="paperRecoverySource">Backup source</label>
          <select id="paperRecoverySource" value={selected} onChange={e => setSelected(e.target.value)} style={{ border, borderRadius:8, padding:8, background:'#fff', color:'#193954' }}>
            {exportable.map(s=><option key={s.id} value={s.id}>{labels[s.id]} — {s.count} papers</option>)}
          </select>
          <label style={{ fontSize:12, display:'flex', alignItems:'flex-start', gap:8 }}>
            <input type="checkbox" checked={verifiedOwner} onChange={e=>setVerifiedOwner(e.target.checked)}/>
            <span>I confirm these papers belong to this school and I am authorized to preserve their contents. No automatic cross-school import is permitted.</span>
          </label>
          <label style={{ fontSize:12, fontWeight:700 }} htmlFor="paperRecoveryPassphrase">Backup passphrase (minimum 14 characters)</label>
          <input id="paperRecoveryPassphrase" type="password" autoComplete="new-password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="Use a unique private passphrase" style={{ border, borderRadius:8, padding:9, background:'#fff', color:'#193954' }}/>
          <button type="button" style={button} disabled={!verifiedOwner || passphrase.length < 14 || working} onClick={downloadEncryptedCopy}>
            {working ? 'Encrypting...' : 'Download encrypted local backup'}
          </button>
          <span style={{ fontSize:11, color:'#6b7484' }}>AES-256-GCM encrypted in this browser. The file contains only selected saved papers and provenance, not account tokens or Paper Settings. No server upload, import, or deletion.</span>
        </div>}
        <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #d9e2ec', display:'grid', gap:8 }}>
          <strong style={{fontSize:12}}>Verify existing encrypted paper backup (local only)</strong>
          <label htmlFor="paperVerifyFile">Encrypted backup file</label>
          <input id="paperVerifyFile" type="file" accept=".json,application/json"
            onChange={e=>setVerifyFile(e.target.files?.[0]||null)} />
          <label htmlFor="paperVerifyPassphrase">Backup passphrase</label>
          <input id="paperVerifyPassphrase" type="password" value={verifyPassphrase}
            onChange={e=>setVerifyPassphrase(e.target.value)} autoComplete="off" />
          <button type="button" style={button} disabled={!verifyFile || verifyPassphrase.length<14 || working}
            onClick={verifyEncryptedCopy}>Verify encrypted file locally</button>
          <span style={{fontSize:11}}>No server upload, paper import or deletion. Verification checks file integrity and school scope.</span>
        </div>
        {exportable.length===0 && <span style={{fontSize:12}}>No valid saved-paper snapshots found in the inspected browser keys. Other historic browser profiles or tenant keys may require a supervised manual investigation.</span>}
      </div>}
      {status && <p role="status" style={{fontSize:12, color:'#355d81', margin:'9px 0 0'}}>{status}</p>}
    </section>
  )
}
