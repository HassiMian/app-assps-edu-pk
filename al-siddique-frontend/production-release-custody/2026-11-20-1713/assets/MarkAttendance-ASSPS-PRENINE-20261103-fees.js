import{o as e}from"./rolldown-runtime-BM3Ffeng.js";import{n as t,r as n}from"./vendor-motion-ZhfIyk1Y.js";import{At as r,K as i,Vt as a,Z as o,_ as s,an as c,f as l,m as u,nt as d,s as f,v as p,xn as m}from"./vendor-react-3skYbFsB.js";import{l as h}from"./index-Dsriwatl.js";import{a as g}from"./useAcademicStore--G_qr8Za.js";import{r as _,t as v}from"./attendanceRosterScope-7l-hvOZt.js";import{i as y,t as b}from"./attendanceEvents-BYUJCf4V.js";var x=e(n(),1),S=t(),C={gold:`#C8991A`,goldLight:`#e8b420`,silver:`#C0C8D8`,muted:`#8892A4`,green:`#30D158`,red:`#FF375F`,amber:`#FF9F0A`,blue:`#0A84FF`,cyan:`#64D2FF`},w={background:`var(--apex-bg-surface)`,backdropFilter:`blur(20px)`,WebkitBackdropFilter:`blur(20px)`,border:`1px solid rgba(148,163,184,0.18)`,borderRadius:20,boxShadow:`0 22px 50px rgba(0,0,0,0.32)`},T={width:`100%`,minHeight:58,padding:`0 16px`,borderRadius:20,background:`rgba(7,22,40,0.92)`,border:`1px solid rgba(148,163,184,0.18)`,color:C.silver,fontSize:15,fontWeight:700,outline:`none`,boxSizing:`border-box`},E={unmarked:{label:`Unmarked`,icon:s,color:C.muted,bg:`var(--apex-bg-subtle)`,border:`var(--apex-border-default)`,grad:`linear-gradient(135deg,#64748b,#475569)`},present:{label:`Present`,icon:p,color:C.green,bg:`rgba(48,209,88,0.1)`,border:`rgba(48,209,88,0.32)`,grad:`linear-gradient(135deg,#30D158,#1A8C3A)`},absent:{label:`Absent`,icon:u,color:C.red,bg:`rgba(255,55,95,0.1)`,border:`rgba(255,55,95,0.32)`,grad:`linear-gradient(135deg,#FF375F,#C01030)`},late:{label:`Late`,icon:c,color:C.amber,bg:`rgba(255,159,10,0.1)`,border:`rgba(255,159,10,0.32)`,grad:`linear-gradient(135deg,#FF9F0A,#C07000)`},leave:{label:`Leave`,icon:s,color:C.blue,bg:`rgba(10,132,255,0.1)`,border:`rgba(10,132,255,0.32)`,grad:`linear-gradient(135deg,#0A84FF,#0356A8)`}},D={"Pre Nine":`Pre Nine`};function O(e){return D[e]||e}function k(e){return e}function A(e,t){let n=t(e);return n.length?n:e===`Pre Nine`?[`Blue`]:[]}function j({children:e,accent:t=C.blue,style:n={},className:r=``}){return(0,S.jsxs)(`div`,{className:`att-panel att-reveal ${r}`,style:{...w,"--accent":t,...n},children:[(0,S.jsx)(`div`,{className:`att-panel-glow`,style:{background:`radial-gradient(circle,${t}22,transparent 70%)`}}),e]})}function M({state:e,value:t,delay:n}){let r=E[e],i=r.icon;return(0,S.jsxs)(`div`,{className:`att-stat-card att-reveal`,style:{...w,"--accent":r.color,"--glow":`${r.color}55`,animationDelay:n,padding:24,position:`relative`,overflow:`hidden`,border:`1px solid ${r.border}`},children:[(0,S.jsx)(`div`,{className:`att-glow`,style:{background:`radial-gradient(circle,${r.color}35,transparent 70%)`}}),(0,S.jsxs)(`div`,{style:{position:`relative`,zIndex:1,display:`flex`,justifyContent:`space-between`,alignItems:`flex-start`},children:[(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`div`,{style:{color:r.color,fontSize:34,fontWeight:900,lineHeight:1},children:t}),(0,S.jsx)(`div`,{style:{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:`0.08em`,textTransform:`uppercase`,marginTop:14},children:r.label})]}),(0,S.jsx)(`div`,{style:{width:52,height:52,borderRadius:20,background:r.grad,display:`flex`,alignItems:`center`,justifyContent:`center`,boxShadow:`0 8px 22px ${r.color}55`},children:(0,S.jsx)(i,{size:24,color:`white`})})]})]})}function N(){let{classNames:e,sectionsForClass:t}=g(),n=(0,x.useMemo)(()=>[...new Set([...e,`Pre Nine`].map(O))],[e]),c=e[0]||``,[w,D]=(0,x.useState)(c),[N,P]=(0,x.useState)(()=>A(c,t)[0]||``),[F,I]=(0,x.useState)(y()),[L,R]=(0,x.useState)([]),[z,B]=(0,x.useState)({}),[V,H]=(0,x.useState)(!1),[U,W]=(0,x.useState)(!1),[G,K]=(0,x.useState)(``),q=(0,x.useRef)(``);(0,x.useEffect)(()=>{e.length&&(!w||![...e,`Pre Nine`].includes(w))&&D(e[0])},[e,w]);let J=()=>{if(!w||!N){R([]),B({}),q.current=``,K(w?`Failed to load: no section is configured for this class.`:`Failed to load: no active class is configured in Academic Setup.`);return}let e=`${w}|${N}|${F}`;q.current&&q.current!==e&&(R([]),B({})),H(!0),K(``),Promise.all([h.get(`/api/students`,{params:{class:w,section:N,active:"true"}}),h.get(`/api/attendance`,{params:{class:k(w),section:N,date:F}})]).then(([t,n])=>{var r,i;let a=Array.isArray((r=t.data)==null?void 0:r.data)?t.data.data:[],o=Array.isArray((i=n.data)==null?void 0:i.data)?n.data.data:[],s={};o.forEach(e=>{let t=e.student_id||e.id;t&&e.status&&(s[t]=e.status)}),R(a);let c={};a.forEach(e=>{s[e.id]&&(c[e.id]=s[e.id])}),B(c),q.current=e}).catch(t=>{var n;console.error(`Attendance roster load failed`,t);let r=((n=t.response)==null||(n=n.data)==null?void 0:n.message)||t.message||`server unavailable`;K(q.current===e?`Attendance refresh failed: ${r}. Existing loaded roster and marks were preserved.`:`Attendance data for the selected class, section and date is temporarily unavailable: ${r}`)}).finally(()=>H(!1))};(0,x.useEffect)(()=>{let e=A(w,t);if(e.length&&!e.includes(N)){P(e[0]);return}w&&J()},[w,N,F]);let Y=(e,t)=>B(n=>({...n,[e]:t})),X=e=>{B(L.reduce((t,n)=>({...t,[n.id]:e}),{}))},Z=async()=>{let e=`${w}|${N}|${F}`;if(q.current!==e){K(`Load the current class, section and date before saving attendance.`);return}W(!0);try{let e=L.filter(e=>z[e.id]&&z[e.id]!==`unmarked`).map(e=>({student_id:e.id,date:F,status:z[e.id]}));if(!e.length){K(`Mark at least one student before saving.`),W(!1);return}if(!_((await h.post(`/api/attendance/mark`,{records:e})).data,e.length))throw Error(`Attendance server did not confirm the full saved batch. Reload before retrying.`);b({date:F,count:e.length}),K(`Attendance saved successfully.`),setTimeout(()=>K(``),3e3)}catch(e){var t;K((e==null||(t=e.response)==null||(t=t.data)==null?void 0:t.message)||(e==null?void 0:e.message)||`Attendance could not be verified. Reload before retrying.`)}finally{W(!1)}},Q=(0,x.useMemo)(()=>({present:Object.values(z).filter(e=>e===`present`).length,absent:Object.values(z).filter(e=>e===`absent`).length,late:Object.values(z).filter(e=>e===`late`).length,leave:Object.values(z).filter(e=>e===`leave`).length}),[z]),$=L.length,ee=Object.keys(z).length,te=$>0?Math.round(Q.present/$*100):0;return(0,S.jsxs)(`div`,{className:`att-shell`,children:[(0,S.jsx)(`style`,{children:`
 .att-shell {
 min-height: 100%;
 color: #f8fafc;
 padding: 24px;
 font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
 }
 .att-inner {
 max-width: 1400px;
 margin: 0 auto;
 display: grid;
 gap: 24px;
 }
 .att-reveal {
 animation: attFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
 }
 .att-panel {
 position: relative;
 overflow: hidden;
 padding: 28px 32px;
 transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.25s ease;
 }
 .att-panel:hover {
 transform: translateY(-3px);
 border-color: color-mix(in srgb, var(--accent) 36%, transparent) !important;
 box-shadow: 0 22px 48px rgba(0,0,0,0.36), 0 0 26px color-mix(in srgb, var(--accent) 16%, transparent) !important;
 }
 .att-panel-glow {
 position: absolute;
 top: -52px;
 right: -38px;
 width: 210px;
 height: 210px;
 border-radius: 999px;
 pointer-events: none;
 }
 .att-glow {
 position: absolute;
 top: -36px;
 right: -36px;
 width: 136px;
 height: 136px;
 border-radius: 999px;
 pointer-events: none;
 }
 .att-stat-grid {
 display: grid;
 grid-template-columns: repeat(4, minmax(0, 1fr));
 gap: 20px;
 perspective: 1000px;
 }
 .att-stat-card {
 transition: transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.35s ease, border-color 0.25s ease;
 }
 .att-stat-card:hover {
 transform: translateY(-8px) rotateX(-5deg) scale(1.02);
 box-shadow: 0 28px 56px var(--glow), 0 10px 28px rgba(0,0,0,0.5) !important;
 }
 .att-filter-grid {
 display: grid;
 grid-template-columns: minmax(170px, 1fr) minmax(150px, 1fr) minmax(180px, 1fr) auto;
 gap: 16px;
 align-items: end;
 position: relative;
 z-index: 1;
 }
 .att-label {
 display: block;
 color: #8892A4;
 font-size: 11px;
 font-weight: 900;
 text-transform: uppercase;
 letter-spacing: 0.08em;
 margin: 0 0 8px;
 }
 .att-primary,
 .att-soft-btn,
 .att-status-btn {
 transition: transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.28s ease, border-color 0.2s ease, background 0.2s ease;
 }
 .att-primary:hover,
 .att-soft-btn:hover,
 .att-status-btn:hover {
 transform: translateY(-3px);
 }
 .att-primary {
 min-height: 58px;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 gap: 10px;
 border: 0;
 border-radius: 16px;
 padding: 0 22px;
 color: #fff;
 background: var(--apex-action-primary);
 box-shadow: 0 14px 30px rgba(200,153,26,0.22);
 cursor: pointer;
 font-weight: 900;
 font-size: 14px;
 white-space: nowrap;
 }
 .att-primary:disabled {
 cursor: not-allowed;
 opacity: 0.55;
 transform: none;
 }
 .att-soft-actions {
 display: flex;
 gap: 10px;
 flex-wrap: wrap;
 position: relative;
 z-index: 1;
 justify-content: flex-end;
 }
 .att-soft-btn {
 min-height: 48px;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 gap: 8px;
 border-radius: 14px;
 padding: 0 18px;
 background: rgba(7,22,40,0.88);
 cursor: pointer;
 font-weight: 900;
 font-size: 13px;
 }
 .att-table-wrap {
 position: relative;
 z-index: 1;
 overflow-x: auto;
 }
 .att-table {
 width: 100%;
 border-collapse: separate;
 border-spacing: 0 10px;
 min-width: 760px;
 }
 .att-table th {
 padding: 0 20px 10px;
 text-align: left;
 color: #8892A4;
 font-size: 11px;
 text-transform: uppercase;
 letter-spacing: 0.08em;
 font-weight: 900;
 }
 .att-table td {
 padding: 16px 20px;
 background: var(--apex-bg-subtle);
 border-top: 1px solid rgba(148,163,184,0.12);
 border-bottom: 1px solid rgba(148,163,184,0.12);
 }
 .att-table td:first-child {
 border-left: 1px solid rgba(148,163,184,0.12);
 border-radius: 16px 0 0 16px;
 }
 .att-table td:last-child {
 border-right: 1px solid rgba(148,163,184,0.12);
 border-radius: 0 16px 16px 0;
 }
 .att-row {
 transition: transform 0.25s ease, filter 0.25s ease;
 }
 .att-row:hover {
 transform: translateY(-2px);
 filter: brightness(1.08);
 }
 .att-status-pill {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 min-width: 92px;
 padding: 8px 14px;
 border-radius: 999px;
 font-size: 13px;
 font-weight: 900;
 text-transform: capitalize;
 }
 .att-status-actions {
 display: flex;
 gap: 10px;
 flex-wrap: wrap;
 }
 .att-status-btn {
 min-width: 92px;
 border-radius: 14px;
 padding: 11px 14px;
 font-size: 13px;
 font-weight: 900;
 cursor: pointer;
 background: var(--apex-bg-subtle);
 }
 @keyframes attFadeUp {
 from { opacity: 0; transform: translateY(22px) rotateX(8deg); }
 to { opacity: 1; transform: translateY(0) rotateX(0); }
 }
 @keyframes attPulseGlow {
 0%, 100% { opacity: 0.6; transform: scale(1); }
 50% { opacity: 1; transform: scale(1.18); }
 }
 @keyframes attSpin {
 to { transform: rotate(360deg); }
 }
 @media (max-width: 1100px) {
 .att-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 .att-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 }
 @media (max-width: 760px) {
 .att-shell { padding: 16px; }
 .att-panel { padding: 22px; }
 .att-stat-grid, .att-filter-grid { grid-template-columns: 1fr; }
 .att-soft-actions { justify-content: stretch; }
 .att-soft-btn, .att-primary { width: 100%; }
 }
 `}),(0,S.jsxs)(`div`,{className:`att-inner`,children:[(0,S.jsxs)(j,{accent:C.gold,style:{background:`linear-gradient(135deg,rgba(15,23,42,0.88),rgba(15,23,42,0.54))`},children:[(0,S.jsx)(`div`,{style:{position:`absolute`,bottom:-46,left:-24,width:170,height:170,borderRadius:`50%`,background:`radial-gradient(circle,rgba(10,132,255,0.14),transparent 70%)`,pointerEvents:`none`}}),(0,S.jsxs)(`div`,{style:{position:`relative`,zIndex:1,display:`flex`,justifyContent:`space-between`,alignItems:`center`,gap:20,flexWrap:`wrap`},children:[(0,S.jsxs)(`div`,{children:[(0,S.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:10,marginBottom:8},children:[(0,S.jsx)(`span`,{style:{width:8,height:8,borderRadius:999,background:C.green,boxShadow:`0 0 8px ${C.green}`,animation:`attPulseGlow 2s ease-in-out infinite`}}),(0,S.jsx)(`span`,{style:{color:C.green,fontSize:11,fontWeight:900,letterSpacing:`0.1em`},children:`ATTENDANCE LIVE`})]}),(0,S.jsx)(`h1`,{style:{color:C.gold,fontSize:30,fontWeight:950,margin:`0 0 5px`,letterSpacing:-.5},children:`Mark Attendance`}),(0,S.jsx)(`p`,{style:{color:C.muted,fontSize:14,margin:0},children:`Toggle student status with a polished live attendance console.`})]}),(0,S.jsxs)(`button`,{className:`att-primary`,onClick:Z,disabled:U||!L.length,children:[U?(0,S.jsx)(r,{size:18,style:{animation:`attSpin 0.9s linear infinite`}}):(0,S.jsx)(d,{size:18}),U?`Saving...`:`Save Attendance`]})]})]}),(0,S.jsx)(j,{accent:C.blue,style:{padding:24},children:(0,S.jsxs)(`div`,{className:`att-filter-grid`,children:[(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`label`,{className:`att-label`,children:`Class`}),(0,S.jsx)(`select`,{style:T,value:w,onChange:e=>D(e.target.value),children:n.map(e=>(0,S.jsx)(`option`,{value:e,children:e},e))})]}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`label`,{className:`att-label`,children:`Section`}),(0,S.jsx)(`select`,{style:T,value:N,onChange:e=>P(e.target.value),children:A(w,t).map(e=>(0,S.jsx)(`option`,{value:e,children:e},e))})]}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`label`,{className:`att-label`,children:`Date`}),(0,S.jsx)(`input`,{type:`date`,style:T,value:F,onChange:e=>I(e.target.value)})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:J,disabled:V,className:`att-primary`,children:[V?(0,S.jsx)(r,{size:18,style:{animation:`attSpin 0.9s linear infinite`}}):(0,S.jsx)(o,{size:18}),V?`Loading...`:`Load`]})]})}),(0,S.jsxs)(`div`,{className:`att-stat-grid`,children:[(0,S.jsx)(M,{state:`present`,value:Q.present,delay:`0ms`}),(0,S.jsx)(M,{state:`absent`,value:Q.absent,delay:`90ms`}),(0,S.jsx)(M,{state:`late`,value:Q.late,delay:`180ms`}),(0,S.jsx)(M,{state:`leave`,value:Q.leave,delay:`270ms`})]}),(0,S.jsx)(j,{accent:C.cyan,style:{padding:24},children:(0,S.jsxs)(`div`,{style:{position:`relative`,zIndex:1,display:`grid`,gridTemplateColumns:`1fr auto`,gap:18,alignItems:`center`},children:[(0,S.jsxs)(`div`,{style:{display:`flex`,gap:16,alignItems:`center`,flexWrap:`wrap`},children:[(0,S.jsx)(`div`,{style:{width:52,height:52,borderRadius:20,background:`linear-gradient(135deg,#0A84FF,#64D2FF)`,display:`flex`,alignItems:`center`,justifyContent:`center`,boxShadow:`0 8px 22px rgba(10,132,255,0.4)`},children:(0,S.jsx)(i,{size:24,color:`white`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsxs)(`h2`,{style:{color:`#f8fafc`,fontSize:18,fontWeight:900,margin:0},children:[w,` - Section `,N]}),(0,S.jsxs)(`p`,{style:{color:C.muted,margin:`6px 0 0`,fontSize:13},children:[ee,` marked out of `,$,` students. Current presence rate is `,te,`%.`]})]})]}),(0,S.jsxs)(`div`,{className:`att-soft-actions`,children:[(0,S.jsxs)(`button`,{type:`button`,onClick:()=>X(`present`),className:`att-soft-btn`,style:{color:C.green,border:`1px solid ${E.present.border}`},children:[(0,S.jsx)(p,{size:16}),` All Present`]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>X(`leave`),className:`att-soft-btn`,style:{color:C.blue,border:`1px solid ${E.leave.border}`},children:[(0,S.jsx)(s,{size:16}),` All Leave`]}),(0,S.jsxs)(`button`,{type:`button`,onClick:()=>X(`absent`),className:`att-soft-btn`,style:{color:C.red,border:`1px solid ${E.absent.border}`},children:[(0,S.jsx)(u,{size:16}),` All Absent`]})]})]})}),G&&(0,S.jsx)(j,{accent:G.startsWith(`Failed`)?C.red:C.green,style:{padding:`16px 20px`},children:(0,S.jsx)(`div`,{style:{position:`relative`,zIndex:1,color:G.startsWith(`Failed`)?C.red:C.green,fontWeight:900},children:G})}),(0,S.jsxs)(j,{accent:C.gold,style:{padding:30},children:[(0,S.jsxs)(`div`,{style:{position:`relative`,zIndex:1,display:`flex`,justifyContent:`space-between`,alignItems:`center`,gap:16,marginBottom:18,flexWrap:`wrap`},children:[(0,S.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12},children:[(0,S.jsx)(`div`,{style:{width:42,height:42,borderRadius:14,background:`linear-gradient(135deg,#C8991A,#9A7210)`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:(0,S.jsx)(a,{size:20,color:`white`})}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`h3`,{style:{color:`#f8fafc`,fontSize:18,fontWeight:900,margin:0},children:`Student Roster`}),(0,S.jsx)(`p`,{style:{color:C.muted,fontSize:12,margin:`4px 0 0`},children:F})]})]}),(0,S.jsxs)(`div`,{style:{display:`inline-flex`,alignItems:`center`,gap:8,color:C.gold,fontWeight:900,fontSize:12,textTransform:`uppercase`,letterSpacing:`0.08em`},children:[(0,S.jsx)(f,{size:15}),` Quick Status Mode`]})]}),(0,S.jsx)(`div`,{className:`att-table-wrap`,children:V?(0,S.jsxs)(`div`,{style:{padding:50,textAlign:`center`,color:C.muted,display:`grid`,gap:14,justifyItems:`center`},children:[(0,S.jsx)(r,{size:30,color:C.gold,style:{animation:`attSpin 0.9s linear infinite`}}),`Loading students...`]}):(0,S.jsxs)(`table`,{className:`att-table`,children:[(0,S.jsx)(`thead`,{children:(0,S.jsx)(`tr`,{children:[`Student`,`GR No`,`Status`,`Actions`].map(e=>(0,S.jsx)(`th`,{children:e},e))})}),(0,S.jsxs)(`tbody`,{children:[L.map(e=>{let t=z[e.id]||`unmarked`,n=E[t],r=n.icon;return(0,S.jsxs)(`tr`,{className:`att-row`,children:[(0,S.jsx)(`td`,{children:(0,S.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:14},children:[(0,S.jsx)(`div`,{style:{width:42,height:42,borderRadius:14,background:`rgba(10,132,255,0.14)`,color:C.cyan,display:`flex`,alignItems:`center`,justifyContent:`center`,fontWeight:900},children:(e.name||`S`).slice(0,1).toUpperCase()}),(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`div`,{style:{color:`#f8fafc`,fontSize:15,fontWeight:800},children:e.name||`Unnamed Student`}),(0,S.jsx)(`div`,{style:{color:C.muted,fontSize:12,marginTop:3},children:e.father_name||e.parent_name||`Student profile`})]})]})}),(0,S.jsx)(`td`,{style:{color:C.gold,fontWeight:900},children:e.gr_number||e.gr||`-`}),(0,S.jsx)(`td`,{children:(0,S.jsxs)(`span`,{className:`att-status-pill`,style:{color:n.color,background:n.bg,border:`1px solid ${n.border}`},children:[(0,S.jsx)(r,{size:14,style:{marginRight:6}}),` `,t]})}),(0,S.jsx)(`td`,{children:(0,S.jsx)(`div`,{className:`att-status-actions`,children:Object.entries(E).map(([n,r])=>(0,S.jsx)(`button`,{type:`button`,onClick:()=>Y(e.id,n),className:`att-status-btn`,style:{color:r.color,border:`1px solid ${t===n?r.color:`rgba(148,163,184,0.16)`}`,background:t===n?r.bg:`var(--apex-bg-subtle)`,boxShadow:t===n?`0 8px 22px ${r.color}22`:`none`},children:r.label},n))})})]},e.id)}),L.length===0&&!V&&(0,S.jsx)(`tr`,{children:(0,S.jsxs)(`td`,{colSpan:4,style:{textAlign:`center`,color:C.muted,padding:34},children:[(0,S.jsx)(l,{size:26,style:{display:`block`,margin:`0 auto 10px`,color:C.gold}}),`No students in this class or section.`]})})]})]})})]}),(0,S.jsx)(j,{accent:C.green,style:{padding:22},children:(0,S.jsxs)(`div`,{style:{position:`relative`,zIndex:1,display:`flex`,alignItems:`center`,gap:12,color:C.muted,fontSize:13,fontWeight:700},children:[(0,S.jsx)(m,{size:17,color:C.green}),`Students remain unmarked until attendance is explicitly recorded. Bulk actions are available when you intentionally want one status for the full class.`]})})]})]})}export{N as default};