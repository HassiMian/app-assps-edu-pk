// AL SIDDIQUE SMART SCHOOL OS
// Fee Collection Module — Working Version
// Path: src/Modules/fees/FeeModule.jsx

import { useState, useMemo, useEffect } from 'react'
import Portal from '../../components/Portal'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { usePaperStore } from '../Paper-Generator/usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { BadgeCheck, CreditCard, ReceiptText, Wallet } from 'lucide-react'
import { renderVoucherCopyHtml } from './ViewChallans'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const FEE_HEADS = [
 { id: 1, name: 'Monthly Fee', defaultAmount: 1500 },
 { id: 2, name: 'Exam Fee', defaultAmount: 500 },
 { id: 3, name: 'Registration Fee', defaultAmount: 1000 },
 { id: 4, name: 'Library Fee', defaultAmount: 200 },
 { id: 5, name: 'Computer Fee', defaultAmount: 300 },
 { id: 6, name: 'Sports Fee', defaultAmount: 150 },
 { id: 7, name: 'Transport Fee', defaultAmount: 800 },
]

const normalizeChallan = (item) => {
 const student = STUDENTS.find(s => s.id === item.student_id)
 return {
 id: item.id,
 voucherNo: item.challan_no || item.voucherNo || '',
 studentId: item.student_id,
 student: item.name || item.student || student?.name || '',
 father: item.father_name || item.father || student?.father || '',
 gr: item.gr_number || item.gr || student?.gr || '',
 class: item.class || student?.class || '',
 section: item.section || student?.section || 'Blue',
 familyCode: item.familyCode || student?.familyCode || '—',
 contact: item.parent_phone || item.contact || student?.contact || '',
 month: item.month || '05',
 year: item.year || '2026',
 feeHeads: [{ name: 'Monthly Fee', amount: Number(item.amount || 0) }],
 discount: 0,
 lateFee: 0,
 total: Number(item.amount || 0),
 paid: Number(item.paid_amount || 0),
 status: item.status ? `${item.status.charAt(0).toUpperCase()}${item.status.slice(1)}` : 'Unpaid',
 dueDate: item.due_date || '2026-05-10',
 paidDate: item.paid_date || null,
 }
}

const TEMPLATE_OPTIONS = [
 { id: 'classic', label: 'Classic Replica' },
 { id: 'modern', label: 'Ultra Modern' },
 { id: 'elegant', label: 'Sleek Elegant' },
]

const STUDENTS = [
 { id: 1, gr: 'GR-001', name: 'Ahmed Raza', father: 'Muhammad Raza', class: 'Pre Nine', section: 'Blue', contact: '0300-1234567', discount: 0, familyCode: '501' },
 { id: 2, gr: 'GR-002', name: 'Fatima Noor', father: 'Noor Ahmad', class: 'Pre Nine', section: 'Fatima', contact: '0301-2345678', discount: 200, familyCode: '502' },
 { id: 3, gr: 'GR-003', name: 'Bilal Hassan', father: 'Hassan Ali', class: 'Pre Nine', section: 'Usman', contact: '0302-3456789', discount: 0, familyCode: '503' },
 { id: 4, gr: 'GR-004', name: 'Ayesha Malik', father: 'Malik Usman', class: 'Eight', section: 'Blue', contact: '0303-4567890', discount: 300, familyCode: '504' },
 { id: 5, gr: 'GR-005', name: 'Usman Tariq', father: 'Tariq Mehmood', class: 'Seven', section: 'Blue', contact: '0304-5678901', discount: 0, familyCode: '505' },
 { id: 6, gr: 'GR-006', name: 'Zainab Khalid', father: 'Khalid Hussain', class: 'Six', section: 'Blue', contact: '0305-6789012', discount: 0, familyCode: '502' },
 { id: 7, gr: 'GR-007', name: 'Hamza Sheikh', father: 'Sheikh Imran', class: 'Five', section: 'Blue', contact: '0306-7890123', discount: 500, familyCode: '506' },
 { id: 8, gr: 'GR-008', name: 'Sana Iqbal', father: 'Iqbal Ahmed', class: 'Four', section: 'Blue', contact: '0307-8901234', discount: 0, familyCode: '507' },
 { id: 9, gr: 'GR-009', name: 'Ali Nawaz', father: 'Nawaz Khan', class: 'Three', section: 'Blue', contact: '0308-9012345', discount: 0, familyCode: '508' },
 { id: 10, gr: 'GR-010', name: 'Mariam Aslam', father: 'Aslam Khan', class: 'Two', section: 'Blue', contact: '0309-0123456', discount: 200, familyCode: '509' },
]

const generateChallans = () => {
 const items = []
 let nextId = 1001
 STUDENTS.forEach(student => {
 [3, 4, 5].forEach(monthIndex => {
 const month = MONTHS[monthIndex - 1]
 const total = 1500 + (monthIndex === 4 ? 500 : 0) - student.discount
 const paid = Math.random() > 0.35 ? total : 0
 items.push({
 id: nextId,
 voucherNo: `AL-${nextId}`,
 studentId: student.id,
 student: student.name,
 father: student.father,
 gr: student.gr,
 class: student.class,
 contact: student.contact,
 month,
 year: 2026,
 feeHeads: [
 { name: 'Monthly Fee', amount: 1500 },
 ...(monthIndex === 4 ? [{ name: 'Exam Fee', amount: 500 }] : []),
 ],
 discount: student.discount,
 lateFee: 0,
 total,
 paid,
 status: paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
 dueDate: `2026-0${monthIndex}-10`,
 paidDate: paid > 0 ? `2026-0${monthIndex}-05` : null,
 })
 nextId += 1
 })
 })
 return items
}

const INITIAL_CHALLANS = generateChallans()

const C = {
 card: 'rgba(11,44,77,0.92)',
 gold: '#C8991A',
 goldL: '#e8b420',
 silver: '#C0C8D8',
 muted: '#8892A4',
 green: '#30D158',
 red: '#FF375F',
 orange: '#FF9F0A',
 blue: '#0A84FF',
 border: 'rgba(148,163,184,0.18)',
}

const GCard = ({ children, style = {} }) => (
 <div className="super-module-card" style={{
 background: C.card,
 backdropFilter: 'blur(20px)',
 border: `1px solid ${C.border}`,
 borderRadius: 22,
 padding: 24,
 boxShadow: '0 12px 32px rgba(7,30,52,0.28)',
 ...style,
 }}>
 {children}
 </div>
)

const TabBtn = ({ active, onClick, children }) => (
 <button onClick={onClick} style={{
 background: active ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(15,23,42,0.46)',
 color: active ? '#071e34' : C.silver,
 fontWeight: 700,
 fontSize: 14,
 padding: '10px 22px',
 borderRadius: 14,
 border: active ? 'none' : `1px solid ${C.border}`,
 cursor: 'pointer',
 transition: 'all 0.18s ease',
 }}>{children}</button>
)

const Lbl = ({ children }) => (
 <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, letterSpacing: '0.06em' }}>
 {children}
 </label>
)

const Inp = ({ style = {}, ...props }) => (
 <input {...props} style={{
 width: '100%',
 background: 'rgba(11,44,77,0.6)',
 border: `1px solid ${C.border}`,
 borderRadius: 12,
 color: C.silver,
 padding: '11px 14px',
 fontSize: 14,
 outline: 'none',
 boxSizing: 'border-box',
 ...style,
 }} />
)

const Sel = ({ style = {}, children, ...props }) => (
 <select {...props} style={{
 width: '100%',
 background: 'rgba(11,44,77,0.6)',
 border: `1px solid ${C.border}`,
 borderRadius: 12,
 color: C.silver,
 padding: '11px 14px',
 fontSize: 14,
 outline: 'none',
 cursor: 'pointer',
 boxSizing: 'border-box',
 WebkitAppearance: 'none',
 MozAppearance: 'none',
 appearance: 'none',
 ...style,
 }}>
 {children}
 </select>
)

const StatusBadge = ({ status }) => {
 const map = {
 Paid: { color: '#fff', bg: C.green },
 Unpaid: { color: '#fff', bg: C.red },
 Partial: { color: '#fff', bg: C.orange },
 }[status] || { color: C.muted, bg: 'rgba(255,255,255,0.08)' }

 return (
 <span style={{
 display: 'inline-block',
 textAlign: 'center',
 background: map.bg,
 color: map.color,
 width: '100%',
 padding: '4px 0',
 borderRadius: 4,
 fontWeight: 600,
 fontSize: 12,
 }}>
 {status}
 </span>
 )
}

function ActionDropdown({ onPrint }) {
 const [open, setOpen] = useState(false)
 
 const options = [
 { label: 'Edit Challan', color: C.silver },
 { label: 'Delete Challan', color: C.red },
 { label: 'View Fee History', color: C.blue },
 { label: 'One Student (1 Copy)', action: () => onPrint('1c') },
 { label: 'One Student (1 Copy - Thermal)', action: () => onPrint('thermal') },
 { label: 'One Student (2 Copies)', action: () => onPrint('2c') },
 { label: 'One Student (3 Copies)', action: () => onPrint('3c') },
 { label: 'Family Single Voucher', action: () => alert('Printing Family Single Voucher...') },
 { label: 'Family Double Voucher', action: () => alert('Printing Family Double Voucher...') },
 { label: 'Family Triple Voucher', action: () => alert('Printing Family Triple Voucher...') },
 { label: 'Family Fee Report', action: () => alert('Generating Family Fee Report...') },
 ]

 return (
 <div className="super-module-card" style={{ position: 'relative' }}>
 <button 
 onClick={() => setOpen(!open)}
 onBlur={() => setTimeout(() => setOpen(false), 200)}
 style={{
 background: C.gold,
 color: '#fff',
 border: 'none',
 borderRadius: 4,
 padding: '4px 12px',
 fontSize: 13,
 fontWeight: 600,
 cursor: 'pointer',
 display: 'flex',
 alignItems: 'center',
 gap: 6
 }}
 >
 Action <span style={{ fontSize: 10 }}></span>
 </button>
 {open && (
 <div className="super-module-card" style={{
 position: 'absolute',
 right: 0,
 top: '100%',
 marginTop: 4,
 width: 220,
 background: '#fff',
 borderRadius: 6,
 boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
 zIndex: 100,
 overflow: 'hidden',
 border: '1px solid #ddd'
 }}>
 {options.map((opt, i) => (
 <div 
 key={i}
 onClick={() => { opt.action?.(); setOpen(false) }}
 style={{
 padding: '8px 16px',
 fontSize: 12,
 color: opt.color || '#334155',
 cursor: 'pointer',
 borderBottom: i < options.length - 1 ? '1px solid #f1f5f9' : 'none',
 background: '#fff'
 }}
 onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
 onMouseLeave={e => e.currentTarget.style.background = '#fff'}
 >
 {opt.label}
 </div>
 ))}
 </div>
 )}
 </div>
 )
}

const StatCard = ({ icon, label, value, color }) => (
 <GCard style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 24px', background: `linear-gradient(145deg, ${color}18, rgba(11,44,77,0.96) 48%, rgba(7,30,52,0.98))`, border: `1px solid ${color}35`, borderRadius: 22, boxShadow: `0 18px 42px rgba(0,0,0,0.22), 0 0 28px ${color}12` }}>
 <div className="super-module-card" style={{
 width: 52,
 height: 52,
 borderRadius: 18,
 background: `linear-gradient(135deg, ${color}2e, rgba(255,255,255,0.045))`,
 border: `1px solid ${color}55`,
 display: 'grid',
 placeItems: 'center',
 color,
 boxShadow: `0 12px 24px ${color}18`,
 }}>{icon}</div>
 <div>
 <div className="super-module-card" style={{ color, fontSize: 24, fontWeight: 850, letterSpacing: -0.3 }}>{value}</div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 12, marginTop: 4, fontWeight: 650 }}>{label}</div>
 </div>
 </GCard>
)

function PrintVoucher({ challan, selectedTemplate, onClose, school }) {
  if (!challan) return null
  const template = selectedTemplate || 'classic'
  const templateIdMap = { classic: 1, modern: 2, elegant: 3, thermal: 3 }
  const templateId = templateIdMap[template] || 1

  const schoolObj = {
    name: school?.schoolName || school?.name || 'Al Siddique Scholars Public School',
    logo: school?.logo || '',
    address: school?.address || ''
  }

  return (
    <Portal>
      <div className="super-module-card" style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(7,30,52,0.95)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <style>{`
          @page {
            size: A4 landscape;
            margin: 2mm 3mm;
          }
          @media screen {
            .print-scroll-container {
              overflow-y: auto;
              flex: 1;
              width: 100%;
              display: flex;
              justify-content: center;
              padding: 10px 0;
            }
            .print-voucher-root {
              transform: scale(0.6);
              transform-origin: top center;
              margin-bottom: -160px; /* offset scale margin */
            }
          }
          @media print {
            body * { visibility: hidden !important; }
            .print-voucher-root, .print-voucher-root * { visibility: visible !important; }
            .print-voucher-root { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 297mm !important; 
              height: 210mm !important;
              box-shadow: none !important; 
              padding: 2mm 3mm !important;
              margin: 0 !important;
              background: #fff !important; 
            }
            .no-print { display: none !important; }
            .print-scroll-container { overflow: visible !important; height: auto !important; width: 100% !important; padding: 0 !important; }
            .no-print-border { border-left: 1.5px dashed #ccc !important; border-top: none !important; height: 204mm !important; width: 1px !important; margin: 0 2mm !important; }
          }
        `}</style>

        {/* Top bar (not printed) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '297mm', background: '#0b2c4d', padding: '12px 24px', borderRadius: '12px 12px 0 0', color: '#fff', boxSizing: 'border-box' }} className="no-print">
          <div>
            <div style={{ color: '#e8c87a', fontWeight: 900, fontSize: 18 }}>Fee Voucher Preview (Landscape)</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, marginTop: 4 }}>Voucher No: {challan.voucherNo || challan.challan_no}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => window.print()} style={{
              background: 'linear-gradient(135deg, #c8991a, #e8c87a)',
              color: '#071e34', border: 'none', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 700,
            }}>Print</button>
            <button onClick={onClose} style={{
              background: 'rgba(255,55,95,0.18)',
              border: '1px solid rgba(255,55,95,0.4)',
              color: '#FF375F', padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 700,
            }}>Close</button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="print-scroll-container">
          <div className="print-voucher-root" style={{
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            boxSizing: 'border-box',
            padding: '2mm 3mm',
            width: '297mm',
            height: '210mm',
            display: 'flex',
            flexDirection: 'row',
            gap: '6px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: '291mm', height: '204mm', boxSizing: 'border-box' }}>
              <div style={{ width: 'calc(33.33% - 4px)', height: '204mm', display: 'flex' }} dangerouslySetInnerHTML={{ __html: renderVoucherCopyHtml(challan, 'Student Copy', schoolObj, templateId) }} />
              <div style={{ borderLeft: '1.5px dashed #ccc', width: '1px', margin: '0 2mm', height: '204mm' }} className="no-print-border"></div>
              <div style={{ width: 'calc(33.33% - 4px)', height: '204mm', display: 'flex' }} dangerouslySetInnerHTML={{ __html: renderVoucherCopyHtml(challan, 'Institute Copy', schoolObj, templateId) }} />
              <div style={{ borderLeft: '1.5px dashed #ccc', width: '1px', margin: '0 2mm', height: '204mm' }} className="no-print-border"></div>
              <div style={{ width: 'calc(33.33% - 4px)', height: '204mm', display: 'flex' }} dangerouslySetInnerHTML={{ __html: renderVoucherCopyHtml(challan, 'Bank Copy', schoolObj, templateId) }} />
            </div>
          </div>
        </div>

      </div>
    </Portal>
  )
}

function PrintStudentList({ list, onClose, school }) {
 if (!list) return null
 const { type, data } = list
 const logo = school?.logo || ''
 const schoolName = school?.schoolName || 'Al Siddique Scholars Public School'
 const schoolAddress = school?.address || 'Sharif Chowk, Rayya Khas, Narowal'
 const schoolPhone = school?.phone || '0300-1291959'
 const { paperSettings } = usePaperStore()
 const sigImg = paperSettings?.principalSignature || school?.principalSignature || null

 return (
 <Portal>
 <div className="super-module-card" style={{
 position: 'fixed', inset: 0, zIndex: 10001,
 background: 'rgba(7,30,52,0.98)',
 display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
 }}>
 <style>{`
 @media print {
 body * { visibility: hidden !important; }
 .print-list-root, .print-list-root * { visibility: visible !important; }
 .print-list-root { position: absolute; left: 0; top: 0; width: 100% !important; background: white !important; }
 .no-print { display: none !important; }
 table { width: 100%; border-collapse: collapse; }
 th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 11px; }
 th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
 }
 `}</style>
 <div className="print-list-root" style={{
 width: '100%', maxWidth: 1000, background: '#fff', borderRadius: 20, overflow: 'hidden', height: '90vh', display: 'flex', flexDirection: 'column'
 }}>
 <div className="super-module-card" style={{ padding: '16px 24px', background: '#0b2c4d', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
 <h3 style={{ margin: 0 }}> {type}</h3>
 <div className="super-module-card" style={{ display: 'flex', gap: 10 }}>
 <button onClick={() => window.print()} style={{ background: C.gold, border: 'none', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Print Now</button>
 <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Close</button>
 </div>
 </div>
 
 <div className="super-module-card" style={{ flex: 1, overflowY: 'auto', padding: 40, color: '#333' }}>
 {/* Header */}
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30, borderBottom: '2px solid #0b2c4d', paddingBottom: 20 }}>
 {logo
 ? <img src={logo} style={{ width: 80, height: 80, objectFit:'contain' }} alt="Logo" />
 : <div style={{ width:80, height:80, borderRadius:'50%', border:'1px solid #D9DEE8', display:'grid', placeItems:'center', color:'#0b2c4d', fontSize:30, fontWeight:900 }}>{schoolName.charAt(0)}</div>}
 <div>
 <h1 style={{ margin: 0, fontSize: 24, color: '#0b2c4d' }}>{schoolName}</h1>
 <div className="super-module-card" style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{schoolAddress} - {schoolPhone}</div>
 <h2 style={{ margin: '10px 0 0', fontSize: 18, color: C.gold }}>{type} — {new Date().toLocaleDateString()}</h2>
 </div>
 </div>

 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ background: '#f4f4f4' }}>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Sr#</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>GR No</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Student Name</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Father Name</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Class / Section</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Family Code</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Monthly Fee</th>
 <th style={{ padding: 10, border: '1px solid #ddd' }}>Status</th>
 </tr>
 </thead>
 <tbody>
 {data.map((item, idx) => (
 <tr key={item.id}>
 <td style={{ padding: 8, border: '1px solid #ddd', textAlign: 'center' }}>{idx + 1}</td>
 <td style={{ padding: 8, border: '1px solid #ddd' }}>{item.gr}</td>
 <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>{item.student}</td>
 <td style={{ padding: 8, border: '1px solid #ddd' }}>{item.father}</td>
 <td style={{ padding: 8, border: '1px solid #ddd' }}>{item.class} / {item.section}</td>
 <td style={{ padding: 8, border: '1px solid #ddd', textAlign: 'center' }}>{item.familyCode}</td>
 <td style={{ padding: 8, border: '1px solid #ddd', textAlign: 'right' }}>{item.total}</td>
 <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 700, color: item.status==='Paid' ? 'green' : 'red' }}>{item.status}</td>
 </tr>
 ))}
 </tbody>
 </table>

 <div className="super-module-card" style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 12, color: '#888' }}>
 <span>Printed on: {new Date().toLocaleString()}</span>
 <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 150 }}>
 {sigImg
 ? <img src={sigImg} alt="Principal Signature" style={{ height: 36, maxWidth: 130, objectFit: 'contain' }} />
 : <span style={{ display: 'block', height: 36, width: 130 }} />}
 <span style={{ borderTop: '1px solid #333', paddingTop: 5, width: '100%', textAlign: 'center' }}>Principal Signature</span>
 </span>
 </div>
 </div>
 </div>
 </div>
 </Portal>
 )
}

function FeeModule() {
 const location = useLocation()
 const navigate = useNavigate()
 const { paperSettings } = usePaperStore()
 const { classNames } = useAcademicStore()
 const classOptions = classNames?.length ? classNames : ['Starter']
 const getStorage = () => {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
 }
 const routeTab = useMemo(() => {
 if (location.pathname.includes('/fees/reporting')) return 'reports'
 if (location.pathname.includes('/fees/challans')) return 'view'
 if (location.pathname.includes('/fees/settings')) return 'settings'
 if (location.pathname.includes('/fees/proofs')) return 'proofs'
 return 'create'
 }, [location.pathname])

 const [challans, setChallans] = useState([])
 const [printChallan, setPrintChallan] = useState(null)
 const [printList, setPrintList] = useState(null) // { type: 'filtered' | 'defaulters' | 'all', data: [] }
 const [selectedTemplate, setSelectedTemplate] = useState(() => getStorage()?.getItem('feeTemplate') || 'classic')

 useEffect(() => {
 const storage = getStorage()
 try { storage?.setItem('feeTemplate', selectedTemplate) } catch {}
 }, [selectedTemplate])

 useEffect(() => {
 async function loadFees() {
 try {
 const response = await api.get('/api/fees')
 const items = response.data?.data || []
 setChallans(items.map(normalizeChallan))
 } catch (err) {
 console.error('Failed to load fees', err)
 }
 }
 loadFees()
 }, [])

 const addChallan = async () => {
 try {
 const response = await api.get('/api/fees')
 const items = response.data?.data || []
 setChallans(items.map(normalizeChallan))
 } catch (err) {
 console.error('Failed to reload challans', err)
 }
 navigate('/fees/challans')
 }

 return (
 <div className="super-module-card" style={{ minHeight: '100vh', background: '#071e34', color: C.silver, fontFamily: 'Inter, sans-serif' }}>
 {printChallan && (
 <PrintVoucher
 challan={printChallan}
 selectedTemplate={selectedTemplate}
 onClose={() => setPrintChallan(null)}
 school={paperSettings}
 />
 )}
 {printList && (
 <PrintStudentList 
 list={printList} 
 onClose={() => setPrintList(null)} 
 school={paperSettings}
 />
 )}
 <div className="super-module-card" style={{ padding: '24px 24px' }}>
 <div className="super-module-card" style={{
 padding: '24px 26px',
 borderRadius: 26,
 background: 'linear-gradient(135deg, rgba(11,44,77,0.92), rgba(7,30,52,0.98))',
 border: `1px solid ${C.border}`,
 display: 'flex',
 flexWrap: 'wrap',
 gap: 18,
 justifyContent: 'space-between',
 alignItems: 'center',
 }}>
 <div className="super-module-card" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
 <div className="super-module-card" style={{ width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'rgba(200,153,26,0.16)', border: `1px solid rgba(200,153,26,0.35)`, color: C.gold }}>
 <CreditCard size={26} />
 </div>
 <div>
 <h1 style={{ margin: 0, fontSize: 28, color: '#fff', fontFamily: "'Playfair Display',serif", fontWeight: 800 }}>Fee Collection</h1>
 <p style={{ margin: '6px 0 0', color: C.muted, fontSize: 13 }}>Create challans, view collections, and manage defaulters.</p>
 </div>
 </div>
 <div className="super-module-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
 <TabBtn active={routeTab === 'create'} onClick={() => navigate('/fees/create')}> Create Challan</TabBtn>
 <TabBtn active={routeTab === 'view'} onClick={() => navigate('/fees/challans')}> View Challans</TabBtn>
 <TabBtn active={routeTab === 'reports'} onClick={() => navigate('/fees/reporting')}> Reports</TabBtn>
 <TabBtn active={routeTab === 'proofs'} onClick={() => navigate('/fees/proofs')}> Proof Review</TabBtn>
 <TabBtn active={routeTab === 'settings'} onClick={() => navigate('/fees/settings')}> Fee Settings</TabBtn>
 </div>
 </div>
 <GCard style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18, alignItems: 'center' }}>
 <div>
 <div className="super-module-card" style={{ color: C.silver, fontSize: 13, marginBottom: 6 }}>Fee Voucher Settings</div>
 <div className="super-module-card" style={{ color: '#fff', fontWeight: 700 }}>Choose the print template to apply to all vouchers.</div>
 </div>
 <div className="super-module-card" style={{ minWidth: 240, width: '100%', maxWidth: 320 }}>
 <Lbl>Voucher Template</Lbl>
 <Sel value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
 {TEMPLATE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
 </Sel>
 </div>
 </GCard>

 <div className="super-module-card" style={{ paddingTop: 28 }}>
 {routeTab === 'create' && <CreateChallan onCreate={addChallan} />}
 {routeTab === 'view' && (
 <ViewChallans 
 challans={challans} 
 onPrint={setPrintChallan} 
 onPrintList={(type, data) => setPrintList({ type, data })}
 />
 )}
 {routeTab === 'reports' && <FeeReports challans={challans} />}
 {routeTab === 'proofs' && <ProofReview />}
 {routeTab === 'settings' && (
 <FeeSettings
 selectedTemplate={selectedTemplate}
 onTemplateChange={setSelectedTemplate}
 />
 )}
 </div>
 </div>
 </div>
 )
}

function ProofReview() {
 const [proofs, setProofs] = useState([])
 const [loading, setLoading] = useState(true)
 const [preview, setPreview] = useState(null)
 const [acting, setActing] = useState(null)
 const [alert, setAlert] = useState(null)

 const load = async () => {
 setLoading(true)
 try {
 const res = await api.get('/api/fees/pending-proofs')
 setProofs(res.data?.data || [])
 } catch { setProofs([]) }
 setLoading(false)
 }
 useEffect(() => { load() }, [])

 const showAlert = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000) }

 const handleAction = async (id, action) => {
 setActing(id + action)
 try {
 await api.put(`/api/fees/${id}/approve-proof`, { action })
 showAlert('success', action === 'approve' ? 'Fee marked as paid!' : 'Proof rejected.')
 setPreview(null)
 load()
 } catch (e) {
 showAlert('error', e?.response?.data?.message || 'Action failed')
 }
 setActing(null)
 }

 return (
 <GCard style={{ position: 'relative' }}>
 {alert && (
 <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 12,
 background: alert.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
 border: `1px solid ${alert.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
 color: alert.type === 'success' ? '#34d399' : '#f87171', fontWeight: 600, fontSize: 13 }}>
 {alert.msg}
 </div>
 )}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
 <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}> Fee Proof Review</div>
 <button onClick={load} style={{ background: 'rgba(200,153,26,0.15)', border: '1px solid rgba(200,153,26,0.3)', color: C.gold, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}> Refresh</button>
 </div>
 {loading && <p style={{ color: C.muted, fontSize: 14 }}>Loading...</p>}
 {!loading && proofs.length === 0 && (
 <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
 <div style={{ fontSize: 40, marginBottom: 12 }}></div>
 <p>No pending proof submissions.</p>
 </div>
 )}
 <div style={{ display: 'grid', gap: 14 }}>
 {proofs.map(p => (
 <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 16, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
 <div>
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{p.name} <span style={{ color: C.muted, fontWeight: 400, fontSize: 13 }}>({p.gr_number})</span></div>
 <div style={{ color: C.silver, fontSize: 13, marginTop: 4 }}>Class {p.class} &bull; {p.month} {p.year} &bull; Rs {Number(p.proof_amount || p.amount).toLocaleString()}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Via: {p.proof_method || '—'} &bull; Submitted: {p.proof_submitted_at ? new Date(p.proof_submitted_at).toLocaleDateString('en-GB') : '—'}</div>
 </div>
 <div style={{ display: 'flex', gap: 8 }}>
 <button onClick={() => setPreview(p)} style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}> View</button>
 <button onClick={() => handleAction(p.id, 'approve')} disabled={acting === p.id + 'approve'} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: acting ? 0.6 : 1 }}> Approve</button>
 <button onClick={() => handleAction(p.id, 'reject')} disabled={acting === p.id + 'reject'} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: acting ? 0.6 : 1 }}> Reject</button>
 </div>
 </div>
 ))}
 </div>

 {preview && (
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
 <div style={{ background: '#0f172a', border: '1px solid rgba(200,153,26,0.3)', borderRadius: 20, maxWidth: 480, width: '100%', padding: 24 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{preview.name} — Payment Screenshot</div>
 <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
 </div>
 <img src={preview.proof_image} alt="Proof" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 320, objectFit: 'contain', background: '#1e293b' }} />
 <div style={{ display: 'flex', gap: 10 }}>
 <button onClick={() => { handleAction(preview.id, 'approve'); setPreview(null) }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontWeight: 600, cursor: 'pointer' }}> Approve & Mark Paid</button>
 <button onClick={() => { handleAction(preview.id, 'reject'); setPreview(null) }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 600, cursor: 'pointer' }}> Reject</button>
 </div>
 </div>
 </div>
 )}
 </GCard>
 )
}

function FeeSettings({ selectedTemplate, onTemplateChange }) {
 return (
 <GCard>
 <div className="super-module-card" style={{ display: 'grid', gap: 16 }}>
 <div className="super-module-card" style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Fee Voucher Template Settings</div>
 <p style={{ color: C.silver, margin: 0, fontSize: 14 }}>
 These settings apply globally across all fee vouchers. The selected template will be remembered for your next session.
 </p>
 <div className="super-module-card" style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
 <Lbl>Choose Voucher Template</Lbl>
 <Sel value={selectedTemplate} onChange={(e) => onTemplateChange(e.target.value)}>
 {TEMPLATE_OPTIONS.map((option) => (
 <option key={option.id} value={option.id}>{option.label}</option>
 ))}
 </Sel>
 </div>
 </div>
 </GCard>
 )
}

function CreateChallan({ onCreate }) {
 const [selectedClass, setSelectedClass] = useState('Pre Nine')
 const [selectedStudent, setSelectedStudent] = useState('')
 const [selectedMonth, setSelectedMonth] = useState('May')
 const [selectedYear, setSelectedYear] = useState('2026')
 const [dueDate, setDueDate] = useState('2026-05-10')
 const [heads, setHeads] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false })
 const [amounts, setAmounts] = useState(FEE_HEADS.reduce((acc, head) => ({ ...acc, [head.id]: head.defaultAmount }), {}))
 const [discount, setDiscount] = useState(0)
 const [lateFee, setLateFee] = useState(0)
 const [saved, setSaved] = useState(false)

 const availableStudents = STUDENTS.filter(student => student.class === selectedClass)
 const student = STUDENTS.find(student => student.id === Number(selectedStudent))

 const total = useMemo(() => {
 const subtotal = FEE_HEADS.filter(head => heads[head.id]).reduce((sum, head) => sum + Number(amounts[head.id] || 0), 0)
 return Math.max(0, subtotal - Number(discount || 0) + Number(lateFee || 0))
 }, [heads, amounts, discount, lateFee])

 const handleSubmit = async () => {
 if (!student) return
 try {
 await api.post('/api/fees', {
 student_id: student.id,
 month: selectedMonth,
 year: Number(selectedYear),
 amount: total,
 due_date: dueDate,
 created_by: 1,
 })
 setSaved(true)
 setTimeout(() => setSaved(false), 2000)
 onCreate()
 } catch (err) {
 console.error('Failed to create challan', err)
 alert('Failed to create challan: ' + (err.response?.data?.message || err.message))
 }
 }

 return (
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
 <div className="super-module-card" style={{ display: 'grid', gap: 24 }}>
 <GCard>
 <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 18, fontFamily: "'Playfair Display',serif" }}>Step 1 — Select Student</h2>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
 <div>
 <Lbl>Class</Lbl>
 <Sel value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent('') }}>
 {classOptions.map(item => <option key={item} value={item}>{item}</option>)}
 </Sel>
 </div>
 <div>
 <Lbl>Student</Lbl>
 <Sel value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
 <option value="">Pick a student</option>
 {availableStudents.map(student => <option key={student.id} value={student.id}>{student.name} ({student.gr})</option>)}
 </Sel>
 </div>
 </div>
 {student ? (
 <div className="super-module-card" style={{ background: 'rgba(200,153,26,0.08)', border: `1px solid ${C.border}`, borderRadius: 20, padding: 18, display: 'grid', gap: 14 }}>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
 <div><Lbl>GR No</Lbl><div className="super-module-card" style={{ color: '#fff', fontWeight: 700 }}>{student.gr}</div></div>
 <div><Lbl>Father</Lbl><div className="super-module-card" style={{ color: '#fff', fontWeight: 700 }}>{student.father}</div></div>
 </div>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
 <div><Lbl>Contact</Lbl><div className="super-module-card" style={{ color: '#fff', fontWeight: 700 }}>{student.contact}</div></div>
 <div><Lbl>Discount</Lbl><div className="super-module-card" style={{ color: C.green, fontWeight: 700 }}>Rs. {student.discount}</div></div>
 </div>
 </div>
 ) : (
 <div className="super-module-card" style={{ color: C.muted, fontSize: 13 }}>Select a class and student to preview challan details.</div>
 )}
 </GCard>

 <GCard>
 <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 18, fontFamily: "'Playfair Display',serif" }}>Step 2 — Billing Period</h2>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
 <div><Lbl>Month</Lbl><Sel value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>{MONTHS.map(item => <option key={item} value={item}>{item}</option>)}</Sel></div>
 <div><Lbl>Year</Lbl><Sel value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>{['2025', '2026', '2027'].map(year => <option key={year} value={year}>{year}</option>)}</Sel></div>
 <div><Lbl>Due Date</Lbl><Inp type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
 </div>
 </GCard>

 <GCard>
 <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 18, fontFamily: "'Playfair Display',serif" }}>Step 3 — Fee Heads</h2>
 <div className="super-module-card" style={{ display: 'grid', gap: 12 }}>
 {FEE_HEADS.map(head => (
 <div key={head.id} style={{
 display: 'grid', gridTemplateColumns: 'auto 1fr 100px', gap: 12,
 alignItems: 'center', padding: '12px 14px', borderRadius: 14,
 border: `1px solid ${heads[head.id] ? 'rgba(200,153,26,0.35)' : C.border}`,
 background: heads[head.id] ? 'rgba(200,153,26,0.08)' : 'rgba(11,44,77,0.28)',
 }}>
 <input type="checkbox" checked={!!heads[head.id]} onChange={e => setHeads(prev => ({ ...prev, [head.id]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: C.gold, cursor: 'pointer' }} />
 <div className="super-module-card" style={{ color: heads[head.id] ? '#fff' : C.muted, fontWeight: 600 }}>{head.name}</div>
 <Inp type="number" value={amounts[head.id]} disabled={!heads[head.id]} onChange={e => setAmounts(prev => ({ ...prev, [head.id]: Number(e.target.value) || 0 }))} style={{ opacity: heads[head.id] ? 1 : 0.45, textAlign: 'right' }} />
 </div>
 ))}
 </div>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
 <div><Lbl>Discount</Lbl><Inp type="number" value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" /></div>
 <div><Lbl>Late Fee</Lbl><Inp type="number" value={lateFee} onChange={e => setLateFee(Number(e.target.value) || 0)} placeholder="0" /></div>
 </div>
 </GCard>
 </div>

 <div className="super-module-card" style={{ display: 'grid', gap: 24 }}>
 <GCard style={{ position: 'sticky', top: 24 }}>
 <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 18, fontFamily: "'Playfair Display',serif" }}>Challan Summary</h2>
 <div className="super-module-card" style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', color: C.muted }}><span>Student</span><span>{student?.name || '—'}</span></div>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', color: C.muted }}><span>Month</span><span>{`${selectedMonth} ${selectedYear}`}</span></div>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', color: C.muted }}><span>Due Date</span><span>{dueDate}</span></div>
 </div>
 <div className="super-module-card" style={{ background: 'rgba(7,30,52,0.4)', borderRadius: 18, padding: 18, display: 'grid', gap: 12 }}>
 {FEE_HEADS.filter(head => heads[head.id]).map(head => (
 <div key={head.id} style={{ display: 'flex', justifyContent: 'space-between', color: C.silver }}>
 <span>{head.name}</span>
 <span>Rs. {(amounts[head.id] || 0).toLocaleString()}</span>
 </div>
 ))}
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', color: C.green, fontWeight: 700 }}><span>Discount</span><span>- Rs. {Number(discount || 0).toLocaleString()}</span></div>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', color: C.red, fontWeight: 700 }}><span>Late Fee</span><span>+ Rs. {Number(lateFee || 0).toLocaleString()}</span></div>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.border}`, color: C.gold, fontWeight: 800, fontSize: 16 }}>
 <span>Total</span>
 <span>Rs. {total.toLocaleString()}</span>
 </div>
 </div>
 <button onClick={handleSubmit} disabled={!student} style={{
 width: '100%', padding: '14px 0', borderRadius: 20, border: 'none', cursor: student ? 'pointer' : 'not-allowed',
 background: student ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(148,163,184,0.18)',
 color: student ? '#071e34' : C.muted, fontWeight: 700, fontSize: 15,
 }}>{saved ? ' Challan Created' : 'Create Challan'}</button>
 </GCard>
 </div>
 </div>
 )
}

function ViewChallans({ challans, onPrint, onPrintList }) {
 const [classFilter, setClassFilter] = useState('All')
 const [monthFilter, setMonthFilter] = useState('All')
 const [statusFilter, setStatusFilter] = useState('All')
 const [search, setSearch] = useState('')

 const filtered = useMemo(() => challans.filter(item => {
 if (classFilter !== 'All' && item.class !== classFilter) return false
 if (monthFilter !== 'All' && item.month !== monthFilter) return false
 if (statusFilter !== 'All' && item.status !== statusFilter) return false
 if (search && !item.student.toLowerCase().includes(search.toLowerCase()) && !item.gr.toLowerCase().includes(search.toLowerCase())) return false
 return true
 }), [challans, classFilter, monthFilter, statusFilter, search])

 const totalAmount = filtered.reduce((sum, item) => sum + item.total, 0)
 const collectedAmount = filtered.reduce((sum, item) => sum + item.paid, 0)

 const handlePrintDefaulters = () => {
 const defaulters = challans.filter(c => c.status !== 'Paid')
 onPrintList('Fee Defaulters List', defaulters)
 }

 const handlePrintAllClasses = () => {
 // Sort by class for grouped printing
 const sorted = [...challans].sort((a, b) => a.class.localeCompare(b.class))
 onPrintList('School-Wide Student Fee List', sorted)
 }

 return (
 <div className="super-module-card" style={{ display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
 <button onClick={handlePrintAllClasses} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}> Print All Classes</button>
 <button onClick={handlePrintDefaulters} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}> Print Defaulters</button>
 <button onClick={() => onPrintList(`${classFilter==='All'?'Current':classFilter} List`, filtered)} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}> Print Filtered List</button>
 <button style={{ background: C.orange, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Class Wise View Challan</button>
 </div>

 <GCard>
 <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 18 }}>View Fee Challans ({filtered.length} records)</h3>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
 <div><Lbl>Session</Lbl><Sel><option>2026-2027</option></Sel></div>
 <div><Lbl>Class Head</Lbl><Sel><option>All</option></Sel></div>
 <div><Lbl>Class</Lbl><Sel value={classFilter} onChange={e => setClassFilter(e.target.value)}><option>All</option>{classOptions.map(item => <option key={item} value={item}>{item}</option>)}</Sel></div>
 <div><Lbl>Section</Lbl><Sel><option>All</option><option>Blue</option><option>Red</option><option>Green</option></Sel></div>
 <div><Lbl>Challan Month</Lbl><Sel value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option>All</option>{MONTHS.map(item => <option key={item} value={item}>{item}</option>)}</Sel></div>
 <div><Lbl>Fee Status</Lbl><Sel value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All</option><option>Paid</option><option>Partial</option><option>Unpaid</option></Sel></div>
 </div>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
 <button style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Filter</button>
 </div>
 </GCard>

 <GCard style={{ padding: 0, overflow: 'visible' }}>
 <div className="super-module-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div>Show <Sel style={{ width: 80, display: 'inline-block' }}><option>10</option><option>25</option><option>50</option></Sel> entries</div>
 <div>Search: <Inp style={{ width: 200, display: 'inline-block' }} value={search} onChange={e => setSearch(e.target.value)} /></div>
 </div>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ background: '#1e293b', borderBottom: `1px solid ${C.border}` }}>
 {['GR. No', 'Student / Father Name', 'Family Code', 'Class/Section', 'ChallanID', 'Monthly Fee', 'Total', 'Pay Fee', 'Action', 'Status'].map(column => (
 <th key={column} style={{ padding: '12px 16px', textAlign: 'left', color: '#fff', fontSize: 12, fontWeight: 600 }}>{column}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 ? (
 <tr><td colSpan={10} style={{ padding: 42, textAlign: 'center', color: C.muted }}>No challans found.</td></tr>
 ) : filtered.map((challan, index) => (
 <tr key={challan.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
 <td style={{ padding: '14px 16px', color: C.silver }}>{challan.gr}</td>
 <td style={{ padding: '14px 16px' }}>
 <div className="super-module-card" style={{ color: C.blue, fontWeight: 600 }}>{challan.student} / {challan.father}</div>
 </td>
 <td style={{ padding: '14px 16px', color: C.silver, textAlign: 'center' }}>{challan.familyCode}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{challan.class} / {challan.section}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{challan.voucherNo.replace('AL-','')}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{challan.total}</td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{challan.total}</td>
 <td style={{ padding: '14px 16px' }}>
 <button style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Pay Now</button>
 </td>
 <td style={{ padding: '14px 16px' }}>
 <ActionDropdown onPrint={() => onPrint(challan)} />
 </td>
 <td style={{ padding: '14px 16px', minWidth: 80 }}>
 <StatusBadge status={challan.status} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </GCard>
 </div>
 )
}

function FeeReports({ challans }) {
 const paidChallans = challans.filter(challan => challan.status === 'Paid')
 const unpaidChallans = challans.filter(challan => challan.status !== 'Paid')
 const defaulters = STUDENTS.filter(student => unpaidChallans.some(challan => challan.studentId === student.id))

 const totalCollected = paidChallans.reduce((sum, c) => sum + c.total, 0)
 const totalPending = unpaidChallans.reduce((sum, c) => sum + (c.total - c.paid), 0)

 const monthlySummary = MONTHS.slice(2, 5).map(month => {
 const rows = challans.filter(challan => challan.month === month)
 return {
 month,
 collected: rows.filter(item => item.status === 'Paid').reduce((sum, item) => sum + item.total, 0),
 pending: rows.filter(item => item.status !== 'Paid').reduce((sum, item) => sum + (item.total - item.paid), 0),
 }
 })

 const maxValue = Math.max(...monthlySummary.map(item => item.collected + item.pending), 1)

 return (
 <div className="super-module-card" style={{ display: 'grid', gap: 24 }}>
 <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
 <StatCard icon={<Wallet size={23} />} label="Collected" value={`Rs.${(totalCollected / 1000).toFixed(1)}K`} color={C.green} />
 <StatCard icon={<ReceiptText size={23} />} label="Pending" value={`Rs.${(totalPending / 1000).toFixed(1)}K`} color={C.red} />
 <StatCard icon={<BadgeCheck size={23} />} label="Defaulters" value={defaulters.length} color={C.orange} />
 </div>
 <GCard>
 <h3 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, marginBottom: 22 }}>Monthly Collection Overview</h3>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'flex-end', gap: 26, minHeight: 170 }}>
 {monthlySummary.map(item => {
 const total = item.collected + item.pending
 const barHeight = total ? Math.max(34, (total / maxValue) * 140) : 34
 const paidHeight = total ? Math.max(12, (item.collected / total) * barHeight) : 0
 return (
 <div key={item.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
 <div className="super-module-card" style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>Rs.{(item.collected / 1000).toFixed(1)}K</div>
 <div className="super-module-card" style={{ width: '100%', height: barHeight, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,55,95,0.2)', display: 'flex', flexDirection: 'column-reverse' }}>
 <div className="super-module-card" style={{ height: paidHeight, background: `linear-gradient(180deg, ${C.green}, #25a244)` }} />
 </div>
 <div className="super-module-card" style={{ color: C.muted, fontSize: 12 }}>{item.month}</div>
 </div>
 )
 })}
 </div>
 <div className="super-module-card" style={{ display: 'flex', gap: 18, marginTop: 18 }}>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: C.green }} />Collected</div>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,55,95,0.45)' }} />Pending</div>
 </div>
 </GCard>
 <GCard style={{ padding: 0, overflow: 'hidden' }}>
 <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
 <h3 style={{ color: C.red, fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Fee Defaulters</h3>
 <button style={{ background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.35)', borderRadius: 12, padding: '10px 16px', color: C.red, fontWeight: 600, cursor: 'pointer' }}>SMS Defaulters</button>
 </div>
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr style={{ background: 'rgba(7,30,52,0.95)', borderBottom: `1px solid ${C.border}` }}>
 {['Student', 'GR No', 'Class', 'Contact', 'Pending', 'Action'].map(header => (
 <th key={header} style={{ padding: '14px 16px', textAlign: 'left', color: C.gold, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{header}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {defaulters.length === 0 ? (
 <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: C.muted }}>No defaulters right now.</td></tr>
 ) : defaulters.map((student, index) => {
 const pending = challans.filter(ch => ch.studentId === student.id && ch.status !== 'Paid').reduce((sum, ch) => sum + (ch.total - ch.paid), 0)
 return (
 <tr key={student.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '14px 16px' }}>
 <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 <div className="super-module-card" style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,55,95,0.16)', display: 'grid', placeItems: 'center', color: C.red, fontWeight: 800 }}>{student.name.charAt(0)}</div>
 <span style={{ color: '#fff', fontWeight: 700 }}>{student.name}</span>
 </div>
 </td>
 <td style={{ padding: '14px 16px' }}><span style={{ background: 'rgba(200,153,26,0.12)', color: C.gold, padding: '5px 10px', borderRadius: 10, fontWeight: 700 }}>{student.gr}</span></td>
 <td style={{ padding: '14px 16px', color: C.silver }}>{student.class}</td>
 <td style={{ padding: '14px 16px', color: C.muted }}>{student.contact}</td>
 <td style={{ padding: '14px 16px' }}><span style={{ background: 'rgba(255,55,95,0.12)', color: C.red, padding: '6px 12px', borderRadius: 10, fontWeight: 700 }}>Rs. {pending.toLocaleString()}</span></td>
 <td style={{ padding: '14px 16px' }}><button style={{ background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.4)', borderRadius: 10, padding: '8px 14px', color: C.orange, fontWeight: 600, cursor: 'pointer' }}>SMS</button></td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </GCard>
 </div>
 )
}

export default FeeModule
