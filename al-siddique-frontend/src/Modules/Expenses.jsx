import { useState } from 'react'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from './moduleStyles'

const EXPENSE_CATEGORIES = ['Utilities', 'Maintenance', 'Staff', 'Supplies']
const initialExpenses = [
 { id: 1, category: 'Utilities', description: 'Electricity bill', amount: 13000, date: '2026-04-12' },
 { id: 2, category: 'Maintenance', description: 'Playground repair', amount: 42000, date: '2026-04-26' },
]

export default function Expenses() {
 const [expenses, setExpenses] = useState(initialExpenses)
 const [newExpense, setNewExpense] = useState({ category: 'Utilities', description: '', amount: '', date: '2026-05-01' })
 const [message, setMessage] = useState('')

 const addExpense = (event) => {
 event.preventDefault()
 setExpenses((prev) => [...prev, { ...newExpense, id: Date.now(), amount: Number(newExpense.amount) }])
 setNewExpense({ category: 'Utilities', description: '', amount: '', date: '2026-05-01' })
 setMessage('Expense saved successfully.')
 setTimeout(() => setMessage(''), 2800)
 }

 const total = expenses.reduce((sum, item) => sum + item.amount, 0)

 return (
 <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver }}>
 <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
 <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
 <div>
 <h1 style={sectionHeader}>Expense Tracker</h1>
 <p style={{ color: C.muted, marginTop: 8 }}>Create expense entries and keep your school operating costs organized.</p>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ color: C.silver, fontSize: 12, marginBottom: 6 }}>Total expense</div>
 <div style={{ fontSize: 28, fontWeight: 700, color: C.gold }}>PKR {total.toLocaleString()}</div>
 </div>
 </div>

 <form className="super-module-card" onSubmit={addExpense} style={{ ...card, display: 'grid', gap: 18, borderRadius: 22 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
 <div>
 <label style={labelStyle}>Description</label>
 <input style={input} value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} required />
 </div>
 <div>
 <label style={labelStyle}>Category</label>
 <select style={select} value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
 {EXPENSE_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
 </select>
 </div>
 <div>
 <label style={labelStyle}>Amount</label>
 <input type="number" style={input} value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} required />
 </div>
 <div>
 <label style={labelStyle}>Date</label>
 <input type="date" style={input} value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} />
 </div>
 </div>
 <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
 <button type="submit" style={btnPrimary}>Record Expense</button>
 <button type="button" style={btnSecondary}>Reset</button>
 {message && <span style={{ color: C.green, fontWeight: 700 }}>{message}</span>}
 </div>
 </form>

 <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ borderBottom: `1px solid ${C.border}` }}>
 {['Date', 'Description', 'Category', 'Amount'].map((label) => (
 <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {expenses.map((expense, index) => (
 <tr key={expense.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px', color: C.gold }}>{expense.date}</td>
 <td style={{ padding: '14px 16px' }}>{expense.description}</td>
 <td style={{ padding: '14px 16px' }}>{expense.category}</td>
 <td style={{ padding: '14px 16px', fontWeight: 700 }}>PKR {expense.amount.toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}
