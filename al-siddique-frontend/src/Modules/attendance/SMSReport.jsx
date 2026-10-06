import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { C, card, btnSecondary, select, labelStyle, sectionHeader } from '../moduleStyles'

const STATUSES = ['All','Sent','Delivered','Queued','Failed']

function displayStatus(status) {
 const normalized = String(status || '').toLowerCase()
 if (normalized === 'delivered') return 'Delivered'
 if (['sent','accepted'].includes(normalized)) return 'Sent'
 if (['queued','pending'].includes(normalized)) return 'Queued'
 if (['failed','undelivered','error'].includes(normalized)) return 'Failed'
 return status || 'Unknown'
}

const badgeStyle = status => {
 if (status === 'Delivered') return { background:'color-mix(in srgb,var(--apex-action-success) 10%,transparent)', color:C.green }
 if (status === 'Sent') return { background:'color-mix(in srgb,var(--apex-action-primary) 10%,transparent)', color:'var(--apex-action-primary)' }
 if (status === 'Queued') return { background:'color-mix(in srgb,var(--apex-action-highlight) 10%,transparent)', color:'var(--apex-action-highlight)' }
 if (status === 'Failed') return { background:'color-mix(in srgb,var(--apex-action-danger) 10%,transparent)', color:C.red }
 return { background:'var(--apex-bg-subtle)', color:C.muted }
}

export default function SMSReport() {
 const [logs,setLogs] = useState([])
 const [selectedStatus,setSelectedStatus] = useState('All')
 const [search,setSearch] = useState('')
 const [loading,setLoading] = useState(true)
 const [retryingId,setRetryingId] = useState(null)
 const [message,setMessage] = useState('')

 async function loadLogs() {
 setLoading(true)
 try {
 const response = await api.get('/api/notify/history', { skipCache:true })
 setLogs(Array.isArray(response.data?.data) ? response.data.data : [])
 } catch (err) {
 console.error('Notification history load failed', err)
 setLogs([])
 setMessage(err.response?.data?.message || 'Delivery history could not be loaded.')
 } finally { setLoading(false) }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadLogs()
 }, [])

 const rows = useMemo(() => logs.map(item => ({
 ...item,
 recipient:item.metadata?.recipient_name || item.metadata?.name || item.title || 'Recipient',
 displayStatus:displayStatus(item.status),
 date:item.sent_at ? new Date(item.sent_at).toLocaleString('en-PK') : '',
 })), [logs])

 const filtered = rows.filter(item => {
 const matchesStatus = selectedStatus === 'All' || item.displayStatus === selectedStatus
 const q = search.trim().toLowerCase()
 const matchesSearch = !q || String(item.recipient).toLowerCase().includes(q) || String(item.phone || '').includes(q) || String(item.message || '').toLowerCase().includes(q)
 return matchesStatus && matchesSearch
 })

 const retry = async item => {
 if (!item.phone || !item.message || item.displayStatus !== 'Failed') return
 setRetryingId(item.id); setMessage('')
 try {
 const response = await api.post('/api/notify/bulk', { recipients:[{ phone:item.phone, message:item.message, student_id:item.student_id || null, name:item.recipient, title:item.title || 'School Notification', type:item.type || 'retry', recipient_role:item.metadata?.recipient_role || 'parent' }], channel:item.channel || 'auto' })
 const sent = Number(response.data?.sent || 0)
 const failed = Number(response.data?.failed || 0)
 setMessage(failed > 0 ? `Retry failed for ${failed} message.` : sent > 0 ? 'Retry accepted by the messaging provider.' : 'Retry returned no delivery result.')
 await loadLogs()
 } catch (err) {
 setMessage(err.response?.data?.message || 'Retry failed.')
 } finally { setRetryingId(null) }
 }

 return (
 <div style={{ minHeight:'100vh', padding:24, background:'var(--apex-shell-gradient)', color:C.silver }}>
 <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gap:24 }}>
 <div className="super-module-card" style={{ ...card, display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:16 }}>
 <div><h1 style={sectionHeader}>SMS / WhatsApp Delivery Report</h1><p style={{ color:C.muted, marginTop:8 }}>Verified provider delivery ledger only; no fabricated message records.</p></div>
 <button style={btnSecondary} onClick={()=>void loadLogs()} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button>
 </div>
 <div className="super-module-card" style={{ ...card, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, alignItems:'flex-end' }}>
 <div><label style={labelStyle}>Search Recipient</label><input style={{ ...select,padding:'10px 12px' }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, phone or message" /></div>
 <div><label style={labelStyle}>Delivery Status</label><select style={select} value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)}>{STATUSES.map(item=><option key={item}>{item}</option>)}</select></div>
 <div style={{ color:C.muted,fontSize:13 }}>{filtered.length} verified records</div>
 </div>

 <div className="super-module-card" style={{ ...card, overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{['Recipient','Phone','Date','Status','Channel','Message','Action'].map(header=><th key={header} style={{ padding:'14px 16px', textAlign:'left', color:C.muted, fontSize:12, textTransform:'uppercase' }}>{header}</th>)}</tr></thead>
 <tbody>{filtered.map((item,index)=><tr key={item.id} style={{ background:index%2?'var(--apex-bg-subtle)':'transparent' }}>
 <td style={{ padding:'14px 16px' }}>{item.recipient}</td><td style={{ padding:'14px 16px', color:'var(--apex-action-primary)' }}>{item.phone || '—'}</td><td style={{ padding:'14px 16px', color:C.muted }}>{item.date}</td>
 <td style={{ padding:'14px 16px' }}><span style={{ padding:'6px 12px',borderRadius:999,...badgeStyle(item.displayStatus),fontWeight:700 }}>{item.displayStatus}</span></td><td style={{ padding:'14px 16px' }}>{item.channel || '—'}</td><td style={{ padding:'14px 16px',maxWidth:340 }}>{item.message}</td>
 <td style={{ padding:'14px 16px' }}>{item.displayStatus==='Failed'?<button style={btnSecondary} onClick={()=>void retry(item)} disabled={retryingId===item.id}>{retryingId===item.id?'Retrying…':'Retry'}</button>:<span style={{ color:C.muted,fontSize:12 }}>—</span>}</td>
 </tr>)}{!loading&&!filtered.length&&<tr><td colSpan={7} style={{ padding:28,textAlign:'center',color:C.muted }}>No verified delivery records match this filter.</td></tr>}</tbody></table>
 </div>
 {message&&<div style={{ color:(message.includes('accepted')||message.includes('no delivery'))?'var(--apex-action-success)':'var(--apex-action-danger)',fontSize:13,fontWeight:700 }}>{message}</div>}
 </div>
 </div>
 )
}
