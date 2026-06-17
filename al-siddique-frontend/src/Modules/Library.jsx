import { useState } from 'react'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const BOOK_CATEGORIES = ['Textbook', 'Reference', 'Fiction', 'Non-fiction']
const initialBooks = [
 { id: 1, title: 'Mathematics Simplified', author: 'Ali Khan', category: 'Textbook', available: true },
 { id: 2, title: 'History of Pakistan', author: 'Sara Ahmed', category: 'Reference', available: false },
 { id: 3, title: 'Stories for Young Minds', author: 'Aisha Noor', category: 'Fiction', available: true },
]

export default function Library() {
 const [books, setBooks] = useState(initialBooks)
 const [newBook, setNewBook] = useState({ title: '', author: '', category: 'Textbook', available: true })
 const [message, setMessage] = useState('')

 const addBook = (event) => {
 event.preventDefault()
 setBooks((prev) => [...prev, { ...newBook, id: Date.now() }])
 setNewBook({ title: '', author: '', category: 'Textbook', available: true })
 setMessage('Book added to inventory.')
 setTimeout(() => setMessage(''), 2800)
 }

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Library Management</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Track books, availability, and library inventory for students.</p>
 </div>
 <button style={btnPrimary}>Inventory Report</button>
 </div>

 <form className="super-module-card" onSubmit={addBook} style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
 <div>
 <label style={labelStyle}>Book Title</label>
 <input style={input} value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} required />
 </div>
 <div>
 <label style={labelStyle}>Author</label>
 <input style={input} value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} required />
 </div>
 <div>
 <label style={labelStyle}>Category</label>
 <select style={select} value={newBook.category} onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}>
 {BOOK_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
 </select>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
 <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <input type="checkbox" checked={newBook.available} onChange={(e) => setNewBook({ ...newBook, available: e.target.checked })} />
 Available
 </label>
 <button type="submit" style={btnPrimary}>Add Book</button>
 {message && <span style={{ color: C.green, fontWeight: 700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Title', 'Author', 'Category', 'Status', 'Actions'].map((label) => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {books.map((book, index) => (
 <tr key={book.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold }}>{book.title}</td>
 <td style={{ padding: '14px 16px' }}>{book.author}</td>
 <td style={{ padding: '14px 16px' }}>{book.category}</td>
 <td style={{ padding: '14px 16px' }}><span style={{ padding: '6px 12px', borderRadius: 14, background: book.available ? 'rgba(48,209,88,0.14)' : 'rgba(255,55,95,0.14)', color: book.available ? C.green : C.red, fontWeight: 700 }}>{book.available ? 'Available' : 'Issued'}</span></td>
 <td style={{ padding: '14px 16px' }}><button style={btnSecondary}>Edit</button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}
