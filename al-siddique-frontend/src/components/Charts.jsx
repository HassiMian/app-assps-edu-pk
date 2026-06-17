import { useState, useEffect } from 'react'

//  DonutChart 
export function DonutChart({ segments = [], size = 140, strokeWidth = 18, label = '', sublabel = '' }) {
 const [animated, setAnimated] = useState(false)

 useEffect(() => {
 const t = setTimeout(() => setAnimated(true), 80)
 return () => clearTimeout(t)
 }, [])

 const radius = (size - strokeWidth) / 2
 const circ = 2 * Math.PI * radius
 const cx = size / 2
 const cy = size / 2

 const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1

 let cumPct = 0
 const arcs = segments.map((seg, i) => {
 const pct = (seg.value || 0) / total
 const dash = animated ? circ * pct : 0
 // gap = circ (large) prevents floating-point seams between segments
 const rotation = cumPct * 360 - 90
 cumPct += pct
 return (
 <circle
 key={i}
 cx={cx}
 cy={cy}
 r={radius}
 fill="none"
 stroke={seg.color}
 strokeWidth={strokeWidth}
 strokeDasharray={`${dash} ${circ}`}
 strokeDashoffset={0}
 strokeLinecap="butt"
 transform={`rotate(${rotation} ${cx} ${cy})`}
 style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)' }}
 />
 )
 })

 return (
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
 {/* Background track */}
 <circle
 cx={cx} cy={cy} r={radius}
 fill="none"
 stroke="var(--chart-track, rgba(255,255,255,0.06))"
 strokeWidth={strokeWidth}
 />
 {arcs}
 {/* Center label */}
 {label && (
 <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--chart-text, #fff)" fontSize={size * 0.14} fontWeight="800">
 {label}
 </text>
 )}
 {sublabel && (
 <text x={cx} y={cy + size * 0.1} textAnchor="middle" fill="var(--chart-muted, rgba(255,255,255,0.45))" fontSize={size * 0.08} fontWeight="600">
 {sublabel}
 </text>
 )}
 </svg>
 </div>
 )
}

//  BarChart 
export function BarChart({ bars = [], height = 110, showValues = true }) {
 const [animated, setAnimated] = useState(false)

 useEffect(() => {
 const t = setTimeout(() => setAnimated(true), 120)
 return () => clearTimeout(t)
 }, [])

 const maxVal = Math.max(...bars.map(b => b.value || 0), 1)

 return (
 <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 4px' }}>
 {bars.map((bar, i) => {
 const pct = (bar.value / maxVal) * 100
 const barH = animated ? `${pct}%` : '0%'
 return (
 <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
 {showValues && (
 <span style={{ color: 'var(--chart-muted, rgba(255,255,255,0.55))', fontSize: 10, fontWeight: 700, transition: 'opacity 0.5s', opacity: animated ? 1 : 0 }}>
 {bar.value}
 </span>
 )}
 <div
 style={{
 width: '100%',
 height: barH,
 minHeight: bar.value > 0 ? 4 : 0,
 background: `linear-gradient(to top, ${bar.color}, ${bar.color}aa)`,
 borderRadius: '4px 4px 0 0',
 transition: 'height 0.8s cubic-bezier(0.34,1.1,0.64,1)',
 boxShadow: `0 0 8px ${bar.color}44`,
 }}
 />
 <span style={{ color: 'var(--chart-muted, rgba(255,255,255,0.4))', fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
 {bar.label}
 </span>
 </div>
 )
 })}
 </div>
 )
}

//  ChartLegend 
export function ChartLegend({ items = [] }) {
 return (
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
 {items.map((item, i) => (
 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 5px ${item.color}` }} />
 <span style={{ color: 'var(--chart-muted, rgba(255,255,255,0.55))', fontSize: 11, fontWeight: 600 }}>{item.label}</span>
 {item.value !== undefined && (
 <span style={{ color: 'var(--chart-text, #fff)', fontSize: 11, fontWeight: 800 }}>{item.value}</span>
 )}
 </div>
 ))}
 </div>
 )
}
