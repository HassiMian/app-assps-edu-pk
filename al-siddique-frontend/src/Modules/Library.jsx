import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const BOOK_CATEGORIES = ['Textbook','Reference','Fiction','Non-fiction']
const emptyBook = { title:'', author:'', category:'Textbook', available:true }

function exportCsv(books) {
 const rows = [['Title','Author','Category','Status'], ...books.map(book => [book.title, book.author, book.category, book.available ? 'Available' : 'Issued'])]
 const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
 const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = `library-inventory-${new Date().toISOString().slice(0,10)}.csv`
 link.click()
 URL.revokeObjectURL(url)
}

export default function Library() {
 const [books,setBooks] = useState([])
 const [form,setForm] = useState(emptyBook)
 const [editingId,setEditingId] = useState(null)
 const [message,setMessage] = useState('')
 const [loading,setLoading] = useState(true)
 const [saving,setSaving] = useState(false)

 async function loadBooks() {
 setLoading(true)
 try {
 const response = await api.get('/api/library')
 setBooks(Array.isArray(response.data?.data) ? response.data.data : [])
 } catch (err) {
 console.error('Failed to load library inventory', err)
 setMessage(err.response?.data?.message || 'Library inventory could not be refreshed. Existing loaded inventory was preserved.')
 } finally { setLoading(false) }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadBooks()
 }, [])

 const saveBook = async event => {
 event.preventDefault()
 if (saving) return
 setSaving(true); setMessage('')
 try {
 const response = editingId ? await api.put(`/api/library/${editingId}`, form) : await api.post('/api/library', form)
 const saved = response.data?.data
 setBooks(prev => editingId ? prev.map(item=>item.id===saved.id?saved:item) : [...prev,saved])
 setForm(emptyBook); setEditingId(null)
 setMessage(editingId ? 'Book updated successfully.' : 'Book added to inventory.')
 } catch (err) { setMessage(err.response?.data?.message || 'Book could not be saved.') }
 finally { setSaving(false); setTimeout(()=>setMessage(''),3000) }
 }

 const editBook = book => { setEditingId(book.id); setForm({ title:book.title||'', author:book.author||'', category:book.category||'Textbook', available:book.available!==false }); window.scrollTo({top:0,behavior:'smooth'}) }
 const availableCount = useMemo(()=>books.filter(book=>book.available).length,[books])

 return (
 <div style={{ minHeight:'100vh', padding:24, background:'var(--apex-shell-gradient)', color:C.silver }}>
 <div style={{ maxWidth:1220, margin:'0 auto', display:'grid', gap:22 }}>
 <div className="super-module-card" style={{ ...card, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16, borderRadius:22 }}>
 <div><h1 style={sectionHeader}>Library Management</h1><p style={{ color:C.muted, marginTop:8 }}>Server-backed library inventory with verified availability status.</p></div>
 <div style={{ display:'flex', gap:10, alignItems:'center' }}><span style={{ color:C.muted,fontSize:12 }}>{availableCount}/{books.length} available</span><button style={btnSecondary} onClick={()=>exportCsv(books)} disabled={!books.length}>Export Inventory</button></div>
 </div>

 <form className="super-module-card" onSubmit={saveBook} style={{ ...card, display:'grid', gap:18, borderRadius:22 }}>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:16 }}>
 <div><label style={labelStyle}>Title</label><input style={input} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required /></div>
 <div><label style={labelStyle}>Author</label><input style={input} value={form.author} onChange={e=>setForm({...form,author:e.target.value})} required /></div>
 <div><label style={labelStyle}>Category</label><select style={select} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{BOOK_CATEGORIES.map(item=><option key={item}>{item}</option>)}</select></div>
 </div>
 <label style={{ color:C.silver, display:'flex', gap:8, alignItems:'center', fontSize:13 }}><input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})}/> Available</label>
 <div style={{ display:'flex',gap:12,alignItems:'center',flexWrap:'wrap' }}><button type="submit" style={btnPrimary} disabled={saving}>{saving?'Saving…':editingId?'Update Book':'Add Book'}</button>{editingId&&<button type="button" style={btnSecondary} onClick={()=>{setEditingId(null);setForm(emptyBook)}}>Cancel Edit</button>}{message&&<span style={{ color:message.includes('success')||message.includes('inventory')?C.green:C.red,fontWeight:700 }}>{message}</span>}</div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX:'auto', borderRadius:22 }}>
 {loading?<div style={{ padding:24,color:C.muted }}>Loading library inventory…</div>:<table style={{ width:'100%',borderCollapse:'collapse' }}><thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{['Title','Author','Category','Status','Actions'].map(label=><th key={label} style={{ padding:'14px 16px',textAlign:'left',color:C.muted,fontSize:12,textTransform:'uppercase' }}>{label}</th>)}</tr></thead><tbody>
 {books.map((book,index)=><tr key={book.id} style={{ background:index%2?'var(--apex-bg-subtle)':'transparent' }}><td style={{ padding:'14px 16px',color:'var(--apex-action-primary)',fontWeight:700 }}>{book.title}</td><td style={{ padding:'14px 16px' }}>{book.author}</td><td style={{ padding:'14px 16px' }}>{book.category}</td><td style={{ padding:'14px 16px' }}><span style={{ padding:'6px 12px',borderRadius:999,background:book.available?'color-mix(in srgb,var(--apex-action-success) 10%,transparent)':'color-mix(in srgb,var(--apex-action-danger) 8%,transparent)',color:book.available?C.green:C.red,fontWeight:700 }}>{book.available?'Available':'Issued'}</span></td><td style={{ padding:'14px 16px' }}><button style={btnSecondary} onClick={()=>editBook(book)}>Edit</button></td></tr>)}
 {!books.length&&<tr><td colSpan={5} style={{ padding:28,textAlign:'center',color:C.muted }}>No library books recorded yet.</td></tr>}</tbody></table>}
 </div>
 </div>
 </div>
 )
}
