import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Download, Eye, Edit, Trash2, GraduationCap, ChevronDown, X } from "lucide-react";
import { useStudentStore, refreshStudents } from "../../services/useStudentStore";
import { useAcademicStore } from "../../services/useAcademicStore";
import { usePaperStore } from "../Paper-Generator/usePaperStore";
import { useFamilyStore } from "../../services/useFamilyStore";
import { Printer } from "lucide-react";
import { DonutChart, BarChart, ChartLegend } from "../../components/Charts";
import PhotoUploadAI from "../../components/PhotoUploadAI";
import PhotoProfessionalizer from "../../components/PhotoProfessionalizer";
import { useUserStore, getUserByEntity } from "../../services/useUserStore";
import api from "../../services/api";
import FeeSetupFields, { initFeeSetup } from "../fees/FeeSetupFields";
import { feeProfileFromAmounts, sumFeeAmounts, MONTHS } from "../fees/feeConstants";
import { trackRecentAdded, trackRecentViewed } from "../fees/feeWorkflowStorage";
import StudentFeePanel from "../fees/StudentFeePanel";
import { printChallan } from "../fees/ViewChallans";

const transformStudent = (student) => ({
 id: student.id,
 gr: student.gr_number || student.gr || "",
 name: student.name || "",
 father: student.father_name || student.father || "",
 mother: student.mother_name || student.mother || "",
 class: student.class || "",
 section: student.section || "",
 contact: student.parent_phone || student.contact || "",
 whatsapp: student.whatsapp || "",
 phone: student.phone || student.parent_phone || student.contact || "",
 locality: student.locality || student.village || "",
 fatherCnic: student.father_cnic || student.cnic || "",
 fatherOccupation: student.father_occupation || "",
 religion: student.religion || "Muslim",
 gender: student.gender || "",
 address: student.address || "",
 status: student.is_active ? "Active" : "Inactive",
 fee: student.fee_status || "Unpaid",
 dob: student.date_of_birth ? student.date_of_birth.split("T")[0] : "",
 admissionDate: student.admission_date ? student.admission_date.split("T")[0] : "",
 photo: student.photo || "",
});

const normalizeGenderValue = (gender = "") => {
 const value = String(gender).trim().toLowerCase();
 if (["male", "m", "boy", "boys"].includes(value)) return "male";
 if (["female", "f", "girl", "girls"].includes(value)) return "female";
 return "";
};

const inferGenderFromStudent = (student = {}) => {
 const explicit = normalizeGenderValue(student.gender);
 if (explicit) return { gender: explicit, estimated: false };

 const name = `${student.name || ""} ${student.mother || ""}`.toLowerCase();
 const femaleSignals = [
 "bibi", "fatima", "zainab", "ayesha", "aisha", "maria", "maryam", "rabia", "hania",
 "dua", "eman", "iman", "noor", "noor ul", "amna", "amina", "sana", "iqra", "maham",
 "hafsa", "khadija", "khadeeja", "bisma", "laiba", "hira", "sidra", "saira", "maira",
 ];
 const maleSignals = [
 "muhammad", "ahmad", "ahmed", "ali", "hassan", "hasan", "hussain", "usman", "umar",
 "abdullah", "hamza", "ibrahim", "arslan", "arman", "bilal", "zubair", "talha", "saad",
 "waqas", "ramzan", "burhan", "subhan", "rehan", "rizwan", "danish", "salman",
 ];

 if (femaleSignals.some(signal => name.includes(signal))) return { gender: "female", estimated: true };
 if (maleSignals.some(signal => name.includes(signal))) return { gender: "male", estimated: true };
 return { gender: "", estimated: true };
};

const getGenderStats = (students = []) => {
 let male = 0;
 let female = 0;
 let estimated = 0;

 students.forEach(student => {
 const result = inferGenderFromStudent(student);
 if (result.gender === "male") male += 1;
 if (result.gender === "female") female += 1;
 if (result.estimated) estimated += 1;
 });

 const remaining = Math.max(students.length - male - female, 0);
 if (remaining > 0) {
 const extraMale = Math.round(remaining * 0.58);
 male += extraMale;
 female += remaining - extraMale;
 estimated += remaining;
 }

 return { male, female, estimated };
};

const exportToCSV = (data) => {
 const headers = ["GR No", "Name", "Father", "Class", "Section", "Contact", "Status", "Fee"];
 const rows = data.map(s => [s.gr, s.name, s.father, s.class, s.section, s.contact, s.status, s.fee]);
 const content = [headers, ...rows].map(e => e.join(",")).join("\n");
 const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
 const link = document.createElement("a");
 link.href = URL.createObjectURL(blob);
 link.setAttribute("download", `Students_Export_${new Date().toISOString().slice(0,10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
};

// Removed hardcoded CLASSES and SECTIONS

const MODULE_TABS = [
 { id: "students", label: "Learner Records" },
 { id: "classwise", label: "Class Analytics" },
 { id: "admissions", label: "Admissions Vault" },
 { id: "slips", label: "Student Documents" },
 { id: "locality", label: "Location Map" },
 { id: "form", label: "Admission Print" },
];

const STUDENT_DOCS = [
 { id: "progress", label: "Progress Report", icon: "REP" },
 { id: "admission", label: "Admission Form", icon: "ADM" },
 { id: "character", label: "Character Certificate", icon: "CHR" },
 { id: "warning", label: "Warning Letter", icon: "WRN" },
 { id: "birth", label: "Birth Certificate", icon: "DOB" },
 { id: "study", label: "Study Certificate", icon: "STD" },
 { id: "provisional", label: "Provisional Certificate", icon: "PRO" },
 { id: "sports", label: "Sport Certificates", icon: "SPT" },
 { id: "appreciation", label: "Appreciation Certificate", icon: "AWD" },
 { id: "leaving", label: "Leaving Certificate", icon: "LVC" },
];

function PrintStudentList({ list, onClose, school }) {
 if (!list) return null;
 const { type, data } = list;
 const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
 const logo = school?.logo || "";
 const schoolName = school?.schoolName || "Al Siddique Scholars Public School";
 const schoolAddress = school?.address || "Sharif Chowk, Rayya Khas, Narowal";
 const schoolPhone = school?.phone || "0300-1291959";
 // Read principalSignature directly from the store (usePaperStore already imported above)
 const { paperSettings } = usePaperStore();
 const sigImg = paperSettings?.principalSignature || school?.principalSignature || null;

 return createPortal(
 <div className="app-modal-overlay" style={{
 position: "fixed", inset: 0, zIndex: 10001,
 background: "rgba(7,30,52,0.98)",
 display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
 isolation: "isolate",
 }}>
 <style>{`
 @media print {
 body * { visibility: hidden !important; }
 .print-list-root, .print-list-root * { visibility: visible !important; }
 .print-list-root { position: absolute; left: 0; top: 0; width: 100% !important; background: white !important; }
 .no-print { display: none !important; }
 table { width: 100%; border-collapse: collapse; }
 th, td { border: 1px solid #ccc; padding: 6px; text-align: left; font-size: 10px; }
 th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
 .print-list-body { min-height: calc(297mm - 46mm); display: flex !important; flex-direction: column !important; }
 }
 `}</style>
 <div className="print-list-root" style={{
 width: "min(1100px, calc(100vw - 48px))", maxWidth: 1100, background: "#fff", borderRadius: 20, overflow: "hidden", height: "92vh", display: "flex", flexDirection: "column",
 boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
 }}>
 <div style={{ padding: "14px 20px", background: "#0b2c4d", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }} className="no-print">
 <h3 style={{ margin: 0, fontSize: 16 }}> {type}</h3>
 <div style={{ display: "flex", gap: 10 }}>
 <button onClick={() => window.print()} style={{ background: "#C8991A", border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#071e34" }}>Print Now</button>
 <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Close</button>
 </div>
 </div>
 
 <div className="print-list-body" style={{ flex: 1, overflowY: "auto", padding: "30px 40px", color: "#333", display: "flex", flexDirection: "column" }}>
 {/* Header */}
 <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, borderBottom: "2px solid #0b2c4d", paddingBottom: 16 }}>
 {logo
 ? <img src={logo} style={{ width: 70, height: 70, objectFit: "contain" }} alt="Logo" />
 : <div style={{ width: 70, height: 70, borderRadius: "50%", border: "1px solid #D9DEE8", display: "grid", placeItems: "center", color: "#0b2c4d", fontSize: 28, fontWeight: 900 }}>{schoolName.charAt(0)}</div>}
 <div>
 <h1 style={{ margin: 0, fontSize: 22, color: "#0b2c4d", fontFamily: "'Cinzel', serif" }}>{schoolName}</h1>
 <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{schoolAddress} - {schoolPhone}</div>
 <h2 style={{ margin: "8px 0 0", fontSize: 16, color: "#C8991A" }}>{type} &mdash; Session 2026-2027</h2>
 </div>
 </div>

 <table style={{ width: "100%", borderCollapse: "collapse" }}>
 <thead>
 <tr style={{ background: "#f4f4f4" }}>
 <th style={{ width: 40 }}>Sr#</th>
 <th style={{ width: 70 }}>GR No</th>
 <th>Student Name</th>
 <th>Father Name</th>
 <th style={{ width: 100 }}>DOB</th>
 <th style={{ width: 110 }}>Contact</th>
 <th style={{ width: 120 }}>Class / Sec</th>
 </tr>
 </thead>
 <tbody>
 {data.map((s, idx) => (
 <tr key={s.id}>
 <td style={{ textAlign: "center" }}>{idx + 1}</td>
 <td>{s.gr}</td>
 <td style={{ fontWeight: 700 }}>{s.name}</td>
 <td>{s.father}</td>
 <td>{s.dob || "—"}</td>
 <td>{s.contact}</td>
 <td>{s.class} / {s.section}</td>
 </tr>
 ))}
 </tbody>
 </table>

 <div style={{ marginTop: "auto", paddingTop: 30, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11, color: "#888" }}>
 <span>Total Students: {data.length}</span>
 <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 140 }}>
 {sigImg
 ? <img src={sigImg} alt="Principal Signature" style={{ height: 36, maxWidth: 130, objectFit: "contain" }} />
 : <span style={{ display: "block", height: 36, width: 130 }} />}
 <span style={{ borderTop: "1px solid #333", paddingTop: 4, width: "100%", textAlign: "center" }}>Principal Signature</span>
 </span>
 </div>
 </div>
 </div>
 </div>,
 document.body
 );
}


const card = {
 background: "rgba(11,44,77,0.92)", backdropFilter: "blur(20px)",
 border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, padding: 24,
};
const btnPrimary = {
 display: "flex", alignItems: "center", gap: 8,
 background: "linear-gradient(135deg, #C8991A, #e8b420)",
 color: "#071e34", border: "none", borderRadius: 10,
 padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const btnSecondary = {
 display: "flex", alignItems: "center", gap: 8,
 background: "rgba(11,44,77,0.6)", color: "#C0C8D8",
 border: "1px solid rgba(200,153,26,0.2)", borderRadius: 10,
 padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};

//  Certificate print engine 
function printCertificate(docType, student, school = {}, requestedOrientation = "auto") {
 const sn = school.schoolName || "Al Siddique Scholars Public School";
 const su = school.schoolUrdu || "الصدیق اسکالرز پبلک اسکول";
 const sa = school.address || "Sharif Chowk, Rayya Khas, Narowal";
 const showUrduHdr = school.showUrduHeader !== false;
 const sp = school.phone || "";
 const sl = school.logo || "";
 const session = "2026-2027";
 const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

 const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,700;1,400&family=Raleway:wght@300;400;600;700&family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">`;
 const logoImg = sl
 ? `<img src="${sl}" style="height:72px;max-width:92px;object-fit:contain;display:block;margin:0 auto 8px;background:transparent;border-radius:0;padding:0">`
 : `<div style="width:72px;height:72px;border-radius:10px;border:2px solid #8B6914;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:30px;color:#8B6914;font-family:'Cinzel',serif;background:#fffef8">A</div>`;
 const logoImgInv = sl
 ? `<img src="${sl}" style="height:62px;width:82px;object-fit:contain;border-radius:0;background:transparent;padding:0;display:block;margin:0 auto">`
 : `<div style="width:62px;height:62px;border-radius:10px;border:2px solid rgba(200,153,26,.6);display:flex;align-items:center;justify-content:center;font-size:24px;color:#e8c87a;font-family:'Cinzel',serif;background:rgba(255,255,255,0.1)">A</div>`;
 const logoSmall = sl
 ? `<img src="${sl}" style="height:46px;width:58px;object-fit:contain;border-radius:0;background:transparent;padding:0">`
 : `<div style="width:46px;height:46px;border-radius:8px;border:1.5px solid #c8991a;display:flex;align-items:center;justify-content:center;font-size:18px;color:#8B6914;font-family:'Cinzel',serif">A</div>`;

 const principalSig = school.principalSignature ? `<img src="${school.principalSignature}" style="height:44px;width:auto;display:block;margin:0 auto -12px;mix-blend-mode:multiply">` : "";
 const sigBox = (lbl) => `<div style="text-align:center"><div style="min-height:36px;display:flex;align-items:flex-end;justify-content:center">${lbl==='Principal'?principalSig:''}</div><div style="border-top:1px solid #333;width:120px;margin:5px auto"></div><div style="font-size:11px;color:#555;font-weight:700">${lbl}</div></div>`;
 const principalOnly = `<div class="srow principal-only"><span></span>${sigBox('Principal')}</div>`;

 const open = (title, style, body) => {
 const defaultLandscape = /@page\{size:A4 landscape/i.test(style)
 const orientation = requestedOrientation === "auto" ? (defaultLandscape ? "landscape" : "portrait") : requestedOrientation
 const pageW = orientation === "landscape" ? "297mm" : "210mm"
 const pageH = orientation === "landscape" ? "210mm" : "297mm"
 const normalizedStyle = style.replace(/@page\{size:A4 (portrait|landscape);margin:0\}/gi, `@page{size:A4 ${orientation};margin:0}`)
 const frameCss = `
 html,body{width:${pageW}!important;height:${pageH}!important;min-height:${pageH}!important;overflow:hidden}
 .page{width:${pageW}!important;height:${pageH}!important;min-height:${pageH}!important}
 @media screen{
 body{background:#e5e7eb!important;width:auto!important;height:auto!important;min-height:100vh!important;overflow:auto!important}
 .print-toolbar{display:flex!important}
 .page{margin:14px auto!important;box-shadow:0 14px 36px rgba(15,23,42,.2)}
 }
 @media print{.print-toolbar{display:none!important}.page{margin:0!important;box-shadow:none!important}}
 `
 const watermark = sl ? `<img class="doc-watermark" src="${sl}" alt="School logo watermark">` : "";
 const toolbar = `<div class="print-toolbar" style="display:none;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#071e34;color:#d9dee8;font-family:Arial,sans-serif;font-size:13px"><strong style="color:#e8b420">${title}</strong><span>A4 ${orientation}. Scale: 100%.</span><label style="display:flex;align-items:center;gap:5px"><input id="wmToggle" type="checkbox"> Logo watermark</label><label style="display:flex;align-items:center;gap:5px">Opacity <input id="wmOpacity" type="range" min="0.03" max="0.22" step="0.01" value="0.08"></label><select id="docFont" style="border-radius:7px;padding:6px;background:#0b2c4d;color:#d9dee8;border:1px solid rgba(255,255,255,.18)"><option value="'EB Garamond','Times New Roman',serif">Classic</option><option value="Georgia,'Times New Roman',serif">Georgia</option><option value="'Raleway',Arial,sans-serif">Modern Sans</option><option value="'Cinzel',serif">Formal</option></select><button id="editDoc" style="border:1px solid rgba(255,255,255,.18);border-radius:7px;padding:7px 12px;background:#0b2c4d;color:#d9dee8;font-weight:700;cursor:pointer">Edit content</button><button onclick="window.print()" style="margin-left:auto;border:0;border-radius:7px;padding:8px 18px;background:#c8991a;color:#071e34;font-weight:800;cursor:pointer">Print / Save PDF</button></div>`
 const w = window.open("", "_blank", "width=1120,height=820");
 const editorScript = `<script>
 (() => {
 const wm = document.querySelector('.doc-watermark');
 const page = document.querySelector('.page');
 const wmToggle = document.getElementById('wmToggle');
 const wmOpacity = document.getElementById('wmOpacity');
 const docFont = document.getElementById('docFont');
 const editDoc = document.getElementById('editDoc');
 function syncWatermark(){ if(!wm) return; wm.style.display = wmToggle && wmToggle.checked ? 'block' : 'none'; wm.style.opacity = wmOpacity ? wmOpacity.value : '0.08'; }
 wmToggle && wmToggle.addEventListener('change', syncWatermark);
 wmOpacity && wmOpacity.addEventListener('input', syncWatermark);
 docFont && docFont.addEventListener('change', () => { if(page) page.style.fontFamily = docFont.value; });
 editDoc && editDoc.addEventListener('click', () => { if(!page) return; const next = page.getAttribute('contenteditable') !== 'true'; page.setAttribute('contenteditable', String(next)); editDoc.textContent = next ? 'Editing on' : 'Edit content'; });
 syncWatermark();
 })();
 </script>`;
 w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>${FONTS}<style>*{box-sizing:border-box;margin:0;padding:0}.doc-watermark{position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);width:48%;max-height:58%;object-fit:contain;display:none;z-index:0;pointer-events:none;filter:grayscale(1);}.page>*:not(.doc-watermark){position:relative;z-index:1}${normalizedStyle}${frameCss}</style></head><body>${toolbar}${body.replace('<div class="page">', `<div class="page">${watermark}`)}${editorScript}</body></html>`);
 w.document.close();
 };

 //  1. CHARACTER CERTIFICATE — Oxford formal, gold double-border 
 if (docType === "character") {
 open("Character Certificate",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;min-height:297mm;background:#fff;font-family:'EB Garamond','Times New Roman',serif;color:#1a1a2e}
 .page{width:210mm;min-height:297mm;padding:13mm;display:flex;flex-direction:column}
 .f1{flex:1;border:3px solid #8B6914;padding:5mm;display:flex;flex-direction:column;position:relative}
 .f2{flex:1;border:1px solid #c8991a;padding:7mm;display:flex;flex-direction:column;position:relative;background:#fffef8}
 .wm{display:none}
 .c{position:absolute;width:22px;height:22px;border-color:#8B6914;border-style:solid}
 .tl{top:-2px;left:-2px;border-width:3px 0 0 3px}.tr{top:-2px;right:-2px;border-width:3px 3px 0 0}
 .bl{bottom:-2px;left:-2px;border-width:0 0 3px 3px}.br{bottom:-2px;right:-2px;border-width:0 3px 3px 0}
 .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:19px;direction:rtl;text-align:center;color:#5a3e00;margin-bottom:4px}
 .sname{font-family:'Cinzel',serif;font-size:18px;font-weight:700;text-align:center;color:#1a1a2e;letter-spacing:1.5px}
 .saddr{font-size:11px;text-align:center;color:#666;margin-top:5px;letter-spacing:.4px}
 .gbar{height:2px;background:linear-gradient(to right,transparent,#8B6914,#e8b420,#8B6914,transparent);margin:10px 0}
 .tbar{height:.5px;background:linear-gradient(to right,transparent,#8B6914,transparent);margin:5px 0}
 .ctitle{font-family:'Cinzel',serif;font-size:21px;font-weight:700;text-align:center;color:#8B6914;letter-spacing:4px;text-transform:uppercase;margin:12px 0 4px}
 .csub{font-size:10px;text-align:center;color:#aaa;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
 .body{font-size:13.5px;line-height:2.05;text-align:justify;color:#222;flex:1}
 .body p{margin-bottom:13px}
 .hl{color:#4a3000;font-weight:700;border-bottom:1px dotted #8B6914;padding-bottom:1px}
 .srow{display:flex;justify-content:space-between;margin-top:26px}
.principal-only{justify-content:flex-end}
.srow.principal-only>span{flex:1}
.srow.principal-only>div{margin-left:auto}
 .sbox{text-align:center}.sline{border-top:1px solid #333;width:130px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif;letter-spacing:.4px}
 .dline{text-align:center;font-size:11px;color:#888;margin-top:12px;font-style:italic}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page"><div class="f1"><div class="f2">
 <span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
 ${logoImg}${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="sname">${sn}</div>
 <div class="saddr">${sa}${sp?" &middot; Ph: "+sp:""}</div>
 <div class="gbar"></div><div class="tbar"></div>
 <div class="ctitle">Character Certificate</div>
 <div class="csub">Office of the Principal &mdash; ${session}</div>
 <div class="tbar"></div>
 <div class="body">
 <p>This is to certify that <span class="hl">${student.name}</span>, son/daughter of <span class="hl">${student.father}</span>, bearing General Register Number <span class="hl">${student.gr}</span>, is a student of <span class="hl">${student.class} &mdash; Section ${student.section}</span> at this institution during the academic session <span class="hl">${session}</span>.</p>
 <p>During his/her association with this institution, his/her character and moral conduct have been observed to be of an <span class="hl">EXCELLENT</span> standard. He/She is disciplined, well-behaved, and a respectful member of the school community.</p>
 <p>This certificate is issued at the request of the parent/guardian for official purposes. The institution extends its best wishes for his/her future academic and professional endeavours.</p>
 </div>
 <div class="gbar"></div>
 ${principalOnly}
 </div></div></div>`
 ); return;
 }

 //  2. STUDY CERTIFICATE — Modern navy header with gold bar 
 if (docType === "study") {
 open("Study Certificate",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;min-height:297mm;background:#fff;font-family:'EB Garamond','Times New Roman',serif;color:#111}
 .page{width:210mm;min-height:297mm;display:flex;flex-direction:column}
 .hband{background:linear-gradient(135deg,#0a1628 0%,#1a2e4a 60%,#0a1628 100%);padding:26px 18mm 20px;position:relative;overflow:hidden}
 .hband::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(to right,#8B6914,#e8b420,#c8991a,#e8b420,#8B6914)}
 .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:18px;direction:rtl;text-align:center;color:#e8c87a;margin-bottom:5px}
 .sname{font-family:'Cinzel',serif;font-size:18px;font-weight:700;text-align:center;color:#fff;letter-spacing:2px}
 .saddr{font-size:11px;text-align:center;color:rgba(255,255,255,.55);margin-top:5px}
 .body-area{flex:1;padding:14mm 17mm;display:flex;flex-direction:column}
 .label-row{display:flex;align-items:center;gap:14px;margin-bottom:22px}
 .label-line{flex:1;height:1px;background:#ddd}
 .label-text{font-family:'Cinzel',serif;font-size:17px;font-weight:600;color:#8B6914;letter-spacing:3px;white-space:nowrap}
 .body{font-size:14px;line-height:2.1;text-align:justify;color:#222;flex:1}
 .body p{margin-bottom:14px}
 .hl{font-weight:700;color:#0a1628;border-bottom:1px dotted #8B6914;padding-bottom:1px}
 .istrip{background:#f8f5ef;border-left:4px solid #c8991a;padding:12px 16px;margin:18px 0;border-radius:0 4px 4px 0;font-size:13px}
 .istrip span{display:inline-block;margin-right:22px}
 .srow{display:flex;justify-content:space-between;margin-top:38px}
.principal-only{justify-content:flex-end}
.srow.principal-only>span{flex:1}
.srow.principal-only>div{margin-left:auto}
 .sbox{text-align:center}.sline{border-top:1.5px solid #1a2e4a;width:140px;margin:0 auto 6px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif}
 .fband{background:#f0ede6;border-top:2px solid #c8991a;padding:8px 18mm;text-align:center;font-size:10px;color:#888;font-family:'Raleway',sans-serif}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page">
 <div class="hband"><div style="text-align:center;margin-bottom:10px">${logoImgInv}</div>
 ${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="sname">${sn}</div>
 <div class="saddr">${sa}${sp?" &middot; Ph: "+sp:""}</div></div>
 <div class="body-area">
 <div class="label-row"><div class="label-line"></div><div class="label-text">STUDY CERTIFICATE</div><div class="label-line"></div></div>
 <div class="body">
 <p>This is to certify that <span class="hl">${student.name}</span>, son/daughter of <span class="hl">${student.father}</span>, is a bonafide student of this institution. He/She is currently enrolled in <span class="hl">${student.class} &mdash; Section ${student.section}</span> for the academic session <span class="hl">${session}</span>.</p>
 <div class="istrip"><span><strong>GR Number:</strong> ${student.gr}</span><span><strong>Locality:</strong> ${student.locality||"&mdash;"}</span><span><strong>Session:</strong> ${session}</span></div>
 <p>This certificate is issued for official purposes upon the request of the parent/guardian. The institution confirms the above student&rsquo;s enrollment and good standing.</p>
 </div>
 ${principalOnly}
 </div>
 <div class="fband">${sn} &nbsp;&middot;&nbsp; ${sa}</div>
 </div>`
 ); return;
 }

 //  3. SPORTS CERTIFICATE — Landscape, dark left panel 
 if (docType === "sports") {
 open("Sports Certificate",
 `@page{size:A4 landscape;margin:0}
 body{width:297mm;min-height:210mm;background:#fff;font-family:'Raleway',sans-serif}
 .page{width:297mm;min-height:210mm;display:grid;grid-template-columns:82mm 1fr}
 .lp{background:linear-gradient(160deg,#0a1628 0%,#132240 50%,#1c3a60 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14mm 8mm;position:relative;overflow:hidden}
 .lp::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(200,153,26,.12),transparent 60%)}
 .trophy{font-size:82px;filter:drop-shadow(0 4px 16px rgba(200,153,26,.5));margin-bottom:18px}
 .ctype{font-family:'Cinzel',serif;font-size:20px;font-weight:700;letter-spacing:5px;color:#c8991a;text-transform:uppercase;text-align:center;margin-top:20px;line-height:1.35}
 .ybadge{background:rgba(200,153,26,.2);border:1px solid rgba(200,153,26,.4);color:#e8c87a;font-size:13px;font-weight:600;padding:7px 18px;border-radius:20px;margin-top:14px}
 .abbr{color:rgba(255,255,255,.34);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-top:24px;text-align:center}
 .rp{padding:16mm 17mm;display:flex;flex-direction:column;position:relative}
 .rp::before{content:'';position:absolute;left:0;top:8%;bottom:8%;width:3px;background:linear-gradient(to bottom,transparent,#c8991a,transparent)}
 .sh{display:flex;align-items:center;gap:14px;margin-bottom:20px}
 .sl{width:64px;height:56px;border-radius:8px;border:1.5px solid #c8991a;display:flex;align-items:center;justify-content:center;overflow:hidden}
 .snt .sn{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:#0a1628}
 .snt .sa{font-size:12px;color:#888;margin-top:3px}
 .ctitle{font-family:'Cinzel',serif;font-size:38px;font-weight:700;color:#0a1628;letter-spacing:3px;margin-bottom:7px}
 .grule{height:3px;background:linear-gradient(to right,#8B6914,#e8b420,transparent);width:70%;margin-bottom:22px}
 .pre{font-size:13px;color:#888;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px}
 .stname{font-family:'Playfair Display',serif;font-size:46px;font-style:italic;color:#8B6914;margin-bottom:6px}
 .stmeta{font-size:14px;color:#666;margin-bottom:18px}
 .cbody{font-size:16px;line-height:2;color:#333;text-align:justify;flex:1}
 .cbody p{margin-bottom:12px}
 .srow{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:18mm}
.principal-only{justify-content:flex-end}
.srow.principal-only>span{flex:1}
.srow.principal-only>div{margin-left:auto}
 .sbox{text-align:center}.sline{border-top:1.4px solid #0a1628;width:128px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555}
 .dbadge{background:linear-gradient(135deg,#0a1628,#1c3a60);color:#e8c87a;padding:8px 18px;border-radius:20px;font-size:11px;letter-spacing:.8px}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page">
 <div class="lp">
 <div class="trophy">&#127942;</div>
 <div class="ctype">Sports<br>Certificate</div>
 <div class="ybadge">${session}</div>
 <div class="abbr">Al Siddique<br>Scholars</div>
 </div>
 <div class="rp">
 <div class="sh"><div class="sl">${logoSmall}</div>
 <div class="snt"><div class="sn">${sn}</div><div class="sa">${sa}</div></div></div>
 <div class="ctitle">Sports Certificate</div>
 <div class="grule"></div>
 <div class="pre">This certificate is proudly presented to</div>
 <div class="stname">${student.name}</div>
 <div class="stmeta">Son/Daughter of <strong>${student.father}</strong> &nbsp;&middot;&nbsp; ${student.class} &mdash; ${student.section} &nbsp;&middot;&nbsp; GR: ${student.gr}</div>
 <div class="cbody">
 <p>In recognition of active and commendable participation in sports activities organized by this institution during the academic session <strong>${session}</strong>.</p>
 <p>He/She has demonstrated exceptional sportsmanship, dedication, and team spirit, contributing positively to the school&rsquo;s sporting culture. The institution takes pride in acknowledging this achievement and encourages continued excellence in both academics and athletics.</p>
 </div>
 ${principalOnly}
 </div>
 </div>`
 ); return;
 }

 //  4. APPRECIATION CERTIFICATE — Landscape, ornate award design 
 if (docType === "appreciation") {
 open("Appreciation Certificate",
 `@page{size:A4 landscape;margin:0}
 body{width:297mm;min-height:210mm;background:#fff;font-family:'EB Garamond',serif}
 .page{width:297mm;min-height:210mm;padding:10mm;display:flex;flex-direction:column}
 .b1{flex:1;border:3px solid #8B6914;padding:4mm;display:flex;flex-direction:column;position:relative}
 .b2{flex:1;border:1px solid #e8b420;padding:7mm;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;background:radial-gradient(ellipse at center,#fffef8 0%,#faf6e8 100%)}
 .cs{position:absolute;font-size:16px;color:#c8991a}
 .tl{top:7px;left:9px}.tr{top:7px;right:9px}.bl{bottom:7px;left:9px}.br{bottom:7px;right:9px}
 .ornament{font-size:26px;color:#c8991a;margin-bottom:7px;letter-spacing:8px}
 .ctitle{font-family:'Cinzel',serif;font-size:28px;font-weight:700;color:#8B6914;letter-spacing:5px;text-transform:uppercase;text-align:center;margin-bottom:5px}
 .csub{font-size:11px;letter-spacing:4px;color:#aaa;text-transform:uppercase;text-align:center;margin-bottom:14px}
 .rfancy{display:flex;align-items:center;gap:11px;margin:8px 0 16px;width:55%}
 .rl{flex:1;height:1px;background:linear-gradient(to right,transparent,#c8991a)}
 .rl2{flex:1;height:1px;background:linear-gradient(to left,transparent,#c8991a)}
 .rd{font-size:13px;color:#c8991a}
 .pre{font-size:13px;color:#666;letter-spacing:2px;text-align:center;margin-bottom:7px}
 .stname{font-family:'Playfair Display',serif;font-size:38px;font-style:italic;color:#0a1628;text-align:center;margin-bottom:6px}
 .stdetail{font-size:12px;color:#666;text-align:center;letter-spacing:1px;margin-bottom:16px}
 .cpara{font-size:13px;line-height:1.9;text-align:center;color:#444;max-width:68%;margin-bottom:18px}
 .srow{display:flex;gap:56px;justify-content:center}
 .sbox{text-align:center}.sline{border-top:1.5px solid #0a1628;width:120px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif}
 .stamp{display:none}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page"><div class="b1"><div class="b2">
 <span class="cs tl">&#10022;</span><span class="cs tr">&#10022;</span><span class="cs bl">&#10022;</span><span class="cs br">&#10022;</span>
 ${logoImg.replace('height:72px','height:48px').replace('margin:0 auto 8px','margin:0 auto 6px')}
 <div style="font-family:'Cinzel',serif;font-size:10px;color:#0a1628;letter-spacing:1px;text-align:center;margin-bottom:8px">${sn}</div>
 <div class="ornament">&#10022; &#10022; &#10022;</div>
 <div class="ctitle">Certificate of Appreciation</div>
 <div class="csub">Academic Excellence Award &mdash; ${session}</div>
 <div class="rfancy"><div class="rl"></div><div class="rd">&#10070;</div><div class="rl2"></div></div>
 <div class="pre">This certificate is proudly presented to</div>
 <div class="stname">${student.name}</div>
 <div class="stdetail">Son/Daughter of <strong>${student.father}</strong> &nbsp;&middot;&nbsp; ${student.class} &mdash; ${student.section} &nbsp;&middot;&nbsp; GR: ${student.gr}</div>
 <div class="cpara">In recognition of outstanding performance, consistent hard work, and exemplary dedication throughout the academic session <strong>${session}</strong>. This institution takes immense pride in acknowledging your commendable achievement.</div>
 ${principalOnly}
 </div></div></div>`
 ); return;
 }

 //  5. LEAVING CERTIFICATE — Formal institutional table 
 if (docType === "leaving") {
 const TR = (k,v) => `<tr><td style="padding:8px 13px;background:#f5f2eb;font-weight:700;font-size:12.5px;border:1px solid #ddd;color:#333;width:42%">${k}</td><td style="padding:8px 13px;font-size:12.5px;border:1px solid #ddd;color:#111">${v||"&mdash;"}</td></tr>`;
 open("Leaving Certificate",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;min-height:297mm;background:#fff;font-family:'EB Garamond','Times New Roman',serif}
 .page{width:210mm;min-height:297mm;padding:13mm 15mm;display:flex;flex-direction:column}
 .hdr{display:flex;align-items:center;gap:15px;padding-bottom:13px;border-bottom:3px solid #0a1628;margin-bottom:5px}
 .lb{width:74px;height:68px;border-radius:0;overflow:hidden;border:1.5px solid #c8991a;flex-shrink:0;display:flex;align-items:center;justify-content:center}
 .lb img{width:100%;object-fit:contain}
 .ht .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:17px;direction:rtl;color:#5a3e00}
 .ht .en{font-family:'Cinzel',serif;font-size:16px;font-weight:700;color:#0a1628;letter-spacing:1px}
 .ht .addr{font-size:11px;color:#777;margin-top:3px}
 .gbar{height:3px;background:linear-gradient(to right,#8B6914,#e8b420,#c8991a,#e8b420,#8B6914);margin-bottom:16px}
 .ctitle{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:#0a1628;text-align:center;letter-spacing:3px;text-transform:uppercase;padding:9px;border-top:1px solid #ddd;border-bottom:1px solid #ddd;margin-bottom:18px;position:relative}
 .refno{position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:10px;color:#aaa;font-style:italic;font-family:'Raleway',sans-serif}
 table{width:100%;border-collapse:collapse;margin-bottom:18px}
 .note{background:#fefce8;border:1px solid #e8b420;border-left:4px solid #c8991a;padding:11px 15px;font-size:12.5px;line-height:1.8;border-radius:0 4px 4px 0;margin-bottom:22px;flex:1}
 .srow{display:flex;justify-content:space-between;margin-top:24px}
 .sbox{text-align:center}.sline{border-top:1px solid #0a1628;width:130px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif}
 .footer{margin-top:auto;padding-top:12px;border-top:1px solid #ddd;text-align:center;font-size:10px;color:#aaa;font-family:'Raleway',sans-serif}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page">
 <div class="hdr">
 <div class="lb">${sl?`<img src="${sl}">`:`<span style="font-family:'Cinzel',serif;font-size:20px;color:#8B6914">A</span>`}</div>
 <div class="ht">${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="en">${sn}</div><div class="addr">${sa}${sp?" &middot; Ph: "+sp:""}</div></div>
 </div>
 <div class="gbar"></div>
 <div class="ctitle"><span class="refno">Ref: LC-${student.gr}-${new Date().getFullYear()}</span>Leaving Certificate</div>
 <table>${[
 ["Student Full Name",student.name],["Father&rsquo;s Name",student.father],
 ["GR Number",student.gr],["Class / Section",`${student.class} / ${student.section}`],
 ["Date of Birth",student.dob||"&mdash;"],["Date of Admission",student.admissionDate||"&mdash;"],
 ["Date of Leaving",today],["Reason for Leaving","&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"],
 ["Character &amp; Conduct","Good"],
 ].map(([k,v])=>TR(k,v)).join("")}</table>
 <div class="note">This certificate is issued on the request of the parent/guardian of the above-named student. The institution certifies that the information provided herein is correct to the best of our knowledge and official records.</div>
 ${principalOnly}
 <div class="footer">${sn} &nbsp;&middot;&nbsp; ${sa}</div>
 </div>`
 ); return;
 }

 //  6. PROVISIONAL CERTIFICATE — Oxford blue with info grid 
 if (docType === "provisional") {
 open("Provisional Certificate",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;min-height:297mm;background:#fff;font-family:'EB Garamond','Times New Roman',serif}
 .page{width:210mm;min-height:297mm;padding:13mm 15mm;display:flex;flex-direction:column;position:relative}
 .page::before{content:'';position:absolute;left:0;top:0;bottom:0;width:7px;background:linear-gradient(to bottom,#0a1628,#c8991a,#0a1628)}
 .hdr{margin-left:9px;display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:2px solid #0a1628;margin-bottom:16px}
 .lb{width:62px;height:62px;border:1.5px solid #c8991a;border-radius:0;overflow:hidden;display:flex;align-items:center;justify-content:center}
 .lb img{width:100%;object-fit:contain}
 .ht .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:16px;direction:rtl;color:#5a3e00}
 .ht .en{font-family:'Cinzel',serif;font-size:15px;font-weight:700;color:#0a1628}
 .ht .addr{font-size:11px;color:#777;margin-top:3px}
 .tbox{margin-left:9px;text-align:center;background:linear-gradient(135deg,#0a1628,#1c3a60);color:#fff;padding:11px;border-radius:6px;margin-bottom:18px}
 .tbox .t{font-family:'Cinzel',serif;font-size:16px;font-weight:700;letter-spacing:3px}
 .tbox .s{font-size:10px;color:rgba(255,255,255,.6);margin-top:4px;letter-spacing:2px}
 .bc{margin-left:9px;flex:1}
 .cp{font-size:13.5px;line-height:2;text-align:justify;color:#222;margin-bottom:14px}
 .igrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0 18px}
 .ic{background:#f5f2eb;border:1px solid #e0d9c8;padding:9px 13px;border-radius:4px}
 .ic .k{font-size:9.5px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;font-family:'Raleway',sans-serif}
 .ic .v{font-size:14px;font-weight:700;color:#0a1628}
 .note{background:#e8f4fd;border:1px solid #b3d9f5;border-left:4px solid #2980b9;padding:10px 13px;font-size:12px;color:#1a5276;border-radius:0 4px 4px 0;margin-bottom:22px;font-style:italic}
 .srow{display:flex;justify-content:space-between;margin-top:26px}
 .sbox{text-align:center}.sline{border-top:1px solid #0a1628;width:130px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif}
 .dline{text-align:right;font-size:11px;color:#888;font-style:italic;margin-top:14px}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page">
 <div class="hdr">
 <div class="lb">${sl?`<img src="${sl}">`:`<span style="font-family:'Cinzel',serif;font-size:18px;color:#8B6914">A</span>`}</div>
 <div class="ht">${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="en">${sn}</div><div class="addr">${sa}${sp?" &middot; Ph: "+sp:""}</div></div>
 </div>
 <div class="tbox"><div class="t">PROVISIONAL CERTIFICATE</div><div class="s">Subject to Official Declaration</div></div>
 <div class="bc">
 <p class="cp">This is to certify that <strong>${student.name}</strong>, son/daughter of <strong>${student.father}</strong>, has appeared in the annual examination conducted by this institution.</p>
 <div class="igrid">
 <div class="ic"><div class="k">GR Number</div><div class="v">${student.gr}</div></div>
 <div class="ic"><div class="k">Class</div><div class="v">${student.class}</div></div>
 <div class="ic"><div class="k">Section</div><div class="v">${student.section}</div></div>
 <div class="ic"><div class="k">Session</div><div class="v">${session}</div></div>
 </div>
 <div class="note">This certificate is issued on a provisional basis pending formal result declaration. It is not valid as a final result certificate.</div>
 <p class="cp">This provisional certificate is issued on the request of the parent/guardian for submission to other institutions or government departments.</p>
 ${principalOnly}
 </div>
 </div>`
 ); return;
 }

 //  7. BIRTH CERTIFICATE VERIFICATION — Blue official doc 
 if (docType === "birth") {
 open("Birth Certificate Verification",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;height:297mm;background:#fff;font-family:'EB Garamond','Times New Roman',serif;overflow:hidden}
 .tstrip{height:6px;background:linear-gradient(to right,#1a5276,#2980b9,#c8991a,#2980b9,#1a5276)}
 .page{width:210mm;height:calc(297mm - 6px);padding:11mm 15mm 13mm;display:flex;flex-direction:column}
 .hdr{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:1px solid #ddd;margin-bottom:16px}
 .lb{width:70px;height:62px;border-radius:0;border:1.5px solid #2980b9;display:flex;align-items:center;justify-content:center;overflow:hidden}
 .lb img{width:100%;object-fit:contain}
 .ht .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:16px;direction:rtl;color:#1a3a5c}
 .ht .en{font-family:'Cinzel',serif;font-size:15px;font-weight:700;color:#1a3a5c}
 .ht .addr{font-size:11px;color:#777;margin-top:3px}
 .badge{margin-left:auto;background:#1a5276;color:#fff;padding:8px 14px;border-radius:6px;text-align:center}
 .badge .bt{font-size:9.5px;letter-spacing:1px;color:rgba(255,255,255,.7)}
 .badge .bn{font-family:'Cinzel',serif;font-size:12px;font-weight:700;margin-top:3px}
 .ctitle{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:#1a3a5c;letter-spacing:2px;text-align:center;margin-bottom:5px;text-transform:uppercase}
 .brule{height:2px;background:linear-gradient(to right,transparent,#2980b9,#c8991a,#2980b9,transparent);margin-bottom:18px}
 .cp{font-size:13.5px;line-height:2.05;text-align:justify;color:#222;margin-bottom:13px}
 .dobbox{background:linear-gradient(135deg,#eaf4fb,#d6eaf8);border:2px solid #2980b9;border-radius:8px;padding:15px 18px;text-align:center;margin:18px 0}
 .doblbl{font-size:10.5px;color:#1a5276;text-transform:uppercase;letter-spacing:2px;margin-bottom:7px;font-family:'Raleway',sans-serif}
 .dobval{font-family:'Playfair Display',serif;font-size:25px;font-weight:700;color:#1a3a5c}
 .note{font-size:12px;color:#777;font-style:italic;background:#fef9e7;border-left:3px solid #c8991a;padding:10px 13px;margin-bottom:0}
 .srow{display:flex;justify-content:space-between;margin-top:auto;padding-top:18mm}
 .sbox{text-align:center}.sline{border-top:1px solid #1a3a5c;width:130px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif}
 .dline{text-align:center;font-size:11px;color:#888;font-style:italic;margin-top:13px}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="tstrip"></div>
 <div class="page">
 <div class="hdr">
 <div class="lb">${sl?`<img src="${sl}">`:`<span style="font-family:'Cinzel',serif;font-size:19px;color:#1a5276">A</span>`}</div>
 <div class="ht">${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="en">${sn}</div><div class="addr">${sa}${sp?" &middot; Ph: "+sp:""}</div></div>
 <div class="badge"><div class="bt">Document</div><div class="bn">Official<br>Verification</div></div>
 </div>
 <div class="ctitle">Birth Certificate Verification</div>
 <div class="brule"></div>
 <p class="cp">This is to certify that according to the official school records maintained at this institution, the following student&rsquo;s date of birth information is presented for verification purposes:</p>
 <p class="cp"><strong>Student:</strong> ${student.name} &nbsp;|&nbsp; <strong>Father:</strong> ${student.father} &nbsp;|&nbsp; <strong>GR No:</strong> ${student.gr} &nbsp;|&nbsp; <strong>Class:</strong> ${student.class} &mdash; ${student.section}</p>
 <div class="dobbox">
 <div class="doblbl">Date of Birth (as per school record)</div>
 <div class="dobval">${student.dob||"Not Recorded"}</div>
 </div>
 <div class="note">Note: This verification is based solely on records submitted at the time of admission. For official birth registration, please refer to NADRA records.</div>
 ${principalOnly}
 </div>`
 ); return;
 }

 //  8. WARNING LETTER — Red stripe, corporate letter format 
 if (docType === "warning") {
 open("Warning Letter",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;min-height:297mm;background:#fff;font-family:'EB Garamond','Times New Roman',serif}
 .wstrip{height:6px;background:repeating-linear-gradient(45deg,#c0392b,#c0392b 10px,#e74c3c 10px,#e74c3c 20px)}
 .page{width:210mm;min-height:297mm;padding:11mm 15mm 13mm;display:flex;flex-direction:column}
 .hdr{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:2px solid #2c3e50;margin-bottom:5px}
 .lb{width:70px;height:62px;border-radius:0;border:1.5px solid #c0392b;display:flex;align-items:center;justify-content:center;overflow:hidden}
 .lb img{width:100%;object-fit:contain}
 .ht .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:16px;direction:rtl;color:#5a3e00}
 .ht .en{font-family:'Cinzel',serif;font-size:15px;font-weight:700;color:#2c3e50}
 .ht .addr{font-size:11px;color:#777;margin-top:3px}
 .refline{text-align:right;font-size:11px;color:#999;margin-bottom:13px;padding-bottom:13px;border-bottom:1px solid #eee;font-style:italic}
 .whead{background:linear-gradient(135deg,#c0392b,#922b21);color:#fff;padding:11px 17px;border-radius:6px;margin-bottom:18px;display:flex;align-items:center;gap:11px}
 .wicon{font-size:26px}
 .wht .wt{font-family:'Cinzel',serif;font-size:15px;font-weight:700;letter-spacing:2px}
 .wht .ws{font-size:10px;color:rgba(255,255,255,.75);margin-top:3px}
 .toblock{background:#fdf2f2;border:1px solid #fadbd8;padding:11px 15px;border-radius:4px;margin-bottom:14px;font-size:13px}
 .tolbl{font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:1px;font-family:'Raleway',sans-serif;margin-bottom:4px}
 .lbody{font-size:13.5px;line-height:2;color:#222;flex:1}
 .lbody p{margin-bottom:13px;text-align:justify}
 .abox{background:#fef9e7;border:1px solid #f0c040;border-left:4px solid #e67e22;padding:11px 15px;border-radius:0 4px 4px 0;margin:14px 0;font-size:13px;color:#7d4e00}
 .srow{display:flex;justify-content:space-between;margin-top:28px}
 .sbox{text-align:center}.sline{border-top:1px solid #2c3e50;width:130px;margin:0 auto 5px}
 .slbl{font-size:11px;color:#555;font-family:'Raleway',sans-serif}
 .dline{text-align:center;font-size:11px;color:#888;font-style:italic;margin-top:13px}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="wstrip"></div>
 <div class="page">
 <div class="hdr">
 <div class="lb">${sl?`<img src="${sl}">`:`<span style="font-family:'Cinzel',serif;font-size:19px;color:#c0392b">A</span>`}</div>
 <div class="ht">${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="en">${sn}</div><div class="addr">${sa}${sp?" &middot; Ph: "+sp:""}</div></div>
 </div>
 <div class="refline">Ref: WL-${student.gr}-${new Date().getFullYear()}</div>
 <div class="whead">
 <div class="wicon">&#9888;</div>
 <div class="wht"><div class="wt">FORMAL WARNING LETTER</div><div class="ws">Confidential &mdash; To be handed to Parent / Guardian</div></div>
 </div>
 <div class="toblock">
 <div class="tolbl">To:</div>
 <strong>The Parent/Guardian of ${student.name}</strong><br>
 GR No: ${student.gr} &nbsp;&middot;&nbsp; ${student.class} &mdash; Section ${student.section}
 </div>
 <div class="lbody">
 <p>Dear Parent/Guardian,</p>
 <p>This letter is being issued as a <strong>formal warning</strong> regarding the conduct, attendance, or academic performance of your child, <strong>${student.name}</strong>, currently enrolled in <strong>${student.class} &mdash; Section ${student.section}</strong> at this institution.</p>
 <div class="abox"><strong>Required Action:</strong> You are strongly requested to visit the school and meet with the Class Teacher at your earliest convenience to discuss this matter in detail.</div>
 <p>Failure to take corrective action may result in further disciplinary measures as per the school&rsquo;s code of conduct. This institution is committed to the holistic development of every student and urges your cooperation.</p>
 <p style="margin-top:18px">Yours sincerely,</p>
 </div>
 ${principalOnly}
 </div>`
 ); return;
 }

 //  9. ADMISSION FORM — Navy header, clean section layout 
 if (docType === "admission") {
 const F = (lbl, val) => `<div style="display:grid;grid-template-columns:1fr 2fr;border-bottom:1px solid #eee"><div style="padding:7px 12px;background:#f5f2eb;font-size:11px;font-weight:600;color:#444;border-right:1px solid #ddd">${lbl}</div><div style="padding:7px 12px;font-size:12px;color:#111;min-height:28px">${val||""}</div></div>`;
 const SH = (t) => `<div style="background:#0a1628;color:#e8c87a;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 12px;border-radius:3px 3px 0 0">${t}</div>`;
 open("Admission Form",
 `@page{size:A4 portrait;margin:0}
 body{width:210mm;min-height:297mm;background:#fff;font-family:'Raleway',sans-serif;color:#111}
 .page{width:210mm;min-height:297mm;padding:11mm 13mm;display:flex;flex-direction:column}
 .hband{background:linear-gradient(135deg,#0a1628,#1c3a60);padding:14px 18px;border-radius:6px;margin-bottom:12px;display:flex;align-items:center;gap:13px}
 .lb{width:64px;height:54px;border-radius:0;border:1.5px solid rgba(200,153,26,.6);display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent}
 .lb img{width:100%;height:100%;object-fit:contain;padding:3px}
 .hr .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:14px;direction:rtl;color:#e8c87a}
 .hr .en{font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#fff;letter-spacing:1px}
 .hr .addr{font-size:10px;color:rgba(255,255,255,.55);margin-top:2px}
 .ftitle{font-family:'Cinzel',serif;font-size:14px;font-weight:700;text-align:center;color:#0a1628;letter-spacing:3px;text-transform:uppercase;padding:9px;border:1px solid #0a1628;border-radius:4px;margin-bottom:12px}
 .sec{margin-bottom:9px;border:1px solid #ddd;border-top:none;border-radius:0 0 3px 3px}
 .srow{display:flex;justify-content:space-around;margin-top:14px}
 .sbox{text-align:center}.sline{border-top:1px solid #0a1628;width:100px;margin:0 auto 4px}
 .slbl{font-size:10px;color:#555}
 .fnote{font-size:10px;color:#aaa;text-align:center;margin-top:9px;font-style:italic}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page">
 <div class="hband">
 <div class="lb">${sl?`<img src="${sl}">`:`<span style="font-family:'Cinzel',serif;font-size:19px;color:#e8c87a">A</span>`}</div>
 <div class="hr">${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="en">${sn}</div><div class="addr">${sa}${sp?" &middot; Ph: "+sp:""}</div></div>
 </div>
 <div class="ftitle">Admission Form &mdash; Session ${session}</div>
 ${SH("Student Information")}<div class="sec">${F("Student Full Name",student.name)+F("Date of Birth",student.dob)+F("Class",student.class)+F("Section",student.section)+F("GR Number",student.gr)}</div>
 ${SH("Family Information")}<div class="sec">${F("Father&rsquo;s Name",student.father)+F("Mother&rsquo;s Name",student.mother)+F("Father&rsquo;s CNIC",student.fatherCnic)+F("Father&rsquo;s Occupation",student.fatherOccupation)}</div>
 ${SH("Contact &amp; Address")}<div class="sec">${F("WhatsApp Number",student.whatsapp)+F("Phone Number",student.phone)+F("Locality / Village",student.locality)+F("Religion",student.religion)}</div>
 <div class="srow">
 <div class="sbox"><div class="sline" style="border-top:1px solid #0a1628"></div><div class="slbl">Parent Signature</div></div>
 ${sigBox('Principal')}
 </div>
 <div class="fnote">${sn}</div>
 </div>`
 ); return;
 }

 //  10. PROGRESS REPORT — Landscape, full subject table 
 if (docType === "progress") {
 const SUBS = ["Mathematics","English","Urdu","Science","Islamiyat","Social Studies","Computer","Drawing / Art"];
 open("Progress Report",
 `@page{size:A4 landscape;margin:0}
 body{width:297mm;min-height:210mm;background:#fff;font-family:'Raleway',sans-serif}
 .page{width:297mm;min-height:210mm;padding:9mm 13mm;display:flex;flex-direction:column}
 .hdr{display:flex;align-items:center;gap:13px;padding-bottom:9px;border-bottom:3px solid #0a1628;margin-bottom:10px}
 .lb{width:66px;height:56px;border-radius:0;border:1.5px solid #c8991a;display:flex;align-items:center;justify-content:center;overflow:hidden}
 .lb img{width:100%;object-fit:contain}
 .ht .urdu{font-family:'Noto Nastaliq Urdu',serif;font-size:15px;direction:rtl;color:#5a3e00}
 .ht .en{font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#0a1628;letter-spacing:1px}
 .ht .addr{font-size:10px;color:#777;margin-top:2px}
 .tbox{margin-left:auto;text-align:right}
 .tbox .t{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:#0a1628;letter-spacing:2px}
 .tbox .s{font-size:10px;color:#888;letter-spacing:1px;margin-top:2px}
 .gbar{height:2px;background:linear-gradient(to right,#8B6914,#e8b420,transparent);margin-bottom:9px}
 .istrip{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:10px}
 .ic{background:#f5f2eb;border:1px solid #e0d9c8;padding:7px 10px;border-radius:4px}
 .ic .k{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
 .ic .v{font-size:12px;font-weight:700;color:#0a1628}
 table{width:100%;border-collapse:collapse;flex:1}
 th{background:linear-gradient(135deg,#0a1628,#1c3a60);color:#e8c87a;padding:8px 10px;font-size:11px;font-weight:700;letter-spacing:.4px;text-align:center;border:1px solid #c4b89a}
 th.sl{text-align:left}
 td{padding:7px 10px;border:1px solid #e8e0d0;font-size:12px;text-align:center}
 td.sl{text-align:left;font-weight:600;color:#0a1628;background:#fafaf7}
 tr:nth-child(even) td{background:#faf7f0}tr:nth-child(even) td.sl{background:#f5f2eb}
 .tf td{background:#0a1628!important;color:#e8c87a!important;font-weight:700}
 .srow{display:flex;justify-content:space-between;margin-top:12px}
 .sbox{text-align:center}.sline{border-top:1px solid #0a1628;width:110px;margin:0 auto 4px}
 .slbl{font-size:10px;color:#555}
 @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`,
 `<div class="page">
 <div class="hdr">
 <div class="lb">${sl?`<img src="${sl}">`:`<span style="font-family:'Cinzel',serif;font-size:17px;color:#8B6914">A</span>`}</div>
 <div class="ht">${showUrduHdr?`<div class="urdu">${su}</div>`:''}<div class="en">${sn}</div><div class="addr">${sa}${sp?" &middot; "+sp:""}</div></div>
 <div class="tbox"><div class="t">PROGRESS REPORT</div><div class="s">Session: ${session}</div></div>
 </div>
 <div class="gbar"></div>
 <div class="istrip">
 <div class="ic"><div class="k">Student Name</div><div class="v">${student.name}</div></div>
 <div class="ic"><div class="k">Father&rsquo;s Name</div><div class="v">${student.father}</div></div>
 <div class="ic"><div class="k">GR Number</div><div class="v">${student.gr}</div></div>
 <div class="ic"><div class="k">Class</div><div class="v">${student.class}</div></div>
 <div class="ic"><div class="k">Section</div><div class="v">${student.section}</div></div>
 </div>
 <table>
 <thead><tr>
 <th class="sl" style="width:20%">Subject</th>
 <th>Total Marks</th><th>Marks Obtained</th><th>Percentage</th>
 <th>Grade</th><th>Position</th><th>Remarks</th>
 </tr></thead>
 <tbody>${SUBS.map(s=>`<tr><td class="sl">${s}</td>${Array(6).fill(`<td>&nbsp;</td>`).join("")}</tr>`).join("")}</tbody>
 <tfoot><tr class="tf"><td class="sl" style="color:#e8c87a!important;background:#0a1628!important">TOTAL / OVERALL</td>${Array(6).fill(`<td>&nbsp;</td>`).join("")}</tr></tfoot>
 </table>
 <div class="srow">
 ${sigBox('Controller of Examination')}
 ${sigBox('Principal')}
 </div>
 </div>`
 ); return;
 }
}

//  Tooltip 
function Tip({ label, color = '#C8991A', children }) {
 const [show, setShow] = useState(false)
 return (
 <div style={{ position:'relative', display:'inline-flex' }}
 onMouseEnter={() => setShow(true)}
 onMouseLeave={() => setShow(false)}>
 {children}
 {show && (
 <div style={{
 position:'absolute', bottom:'calc(100% + 7px)', left:'50%',
 transform:'translateX(-50%)',
 background:'#071e34', border:`1px solid ${color}55`,
 borderRadius:7, padding:'5px 10px',
 color, fontSize:11, fontWeight:700,
 whiteSpace:'nowrap', zIndex:9999,
 boxShadow:'0 6px 18px rgba(0,0,0,0.55)',
 pointerEvents:'none',
 }}>
 {label}
 <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%) rotate(45deg)', width:8, height:8, background:'#071e34', borderRight:`1px solid ${color}55`, borderBottom:`1px solid ${color}55` }} />
 </div>
 )}
 </div>
 )
}

//  Add / Edit Student Modal 
function AddStudentModal({ onClose, addStudent, initialData, updateStudent, onCredGenerated, paperSettings }) {
 const { classNames, sectionsForClass, localities } = useAcademicStore();
 const { families, addStudentToFamily, createFamily } = useFamilyStore();
 const isEdit = !!initialData
 const [feeSetup, setFeeSetup] = useState(() => initFeeSetup());
 const [generateChallan, setGenerateChallan] = useState(true);
 const [savingCombo, setSavingCombo] = useState(false);
 const [photo, setPhoto] = useState(initialData?.photo || null)
 const [form, setForm] = useState(isEdit ? {
 name: initialData.name || '',
 father: initialData.father || '',
 mother: initialData.mother || '',
 class: initialData.class || classNames[0] || 'Starter',
 section: initialData.section || 'Blue',
 whatsapp: initialData.whatsapp || '',
 phone: initialData.phone || '',
 locality: initialData.locality || '',
 dob: initialData.dob || '',
 fatherCnic: initialData.fatherCnic || '',
 fatherOccupation: initialData.fatherOccupation || '',
 gr: initialData.gr || '',
 } : {
 name:"", father:"", mother:"", class:classNames[0] || "Starter", section:"Blue",
 whatsapp:"", phone:"", locality:"", dob:"", fatherCnic:"", fatherOccupation:"",

 gr:`GR-${Math.floor(1000 + Math.random() * 9000)}`,
 });
 const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
 const inp = { width:"100%", padding:"10px 14px", borderRadius:10, boxSizing:"border-box", background:"rgba(7,22,40,0.92)", border:"1px solid rgba(200,153,26,0.2)", color:"#C0C8D8", fontSize:14, outline:"none" };
 const lbl = { color:"#8892A4", fontSize:12, fontWeight:600, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 };
 const sh = (t) => (
 <div style={{ gridColumn:"1/-1", borderBottom:"1px solid rgba(200,153,26,0.12)", paddingBottom:6, marginBottom:2 }}>
 <span style={{ color:"#C8991A", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{t}</span>
 </div>
 );
 useEffect(() => {
 const onKey = (e) => { if (e.key === "Escape") onClose() }
 window.addEventListener("keydown", onKey)
 return () => window.removeEventListener("keydown", onKey)
 }, [onClose])

 useEffect(() => {
 if (isEdit || !form.class) return
 api.get("/api/fees/settings").then((r) => {
 const list = r.data?.data?.classSettings || []
 const found = list.find((item) => item.class_name === form.class && item.active !== false)
 const monthly = Number(found?.monthly_fee || 2500)
 setFeeSetup((prev) => ({
 ...prev,
 amounts: { ...prev.amounts, "Monthly Fee": monthly },
 }))
 }).catch(() => {})
 }, [form.class, isEdit])

 const buildPayload = () => ({
 name: form.name,
 father_name: form.father,
 mother_name: form.mother,
 class: form.class,
 section: form.section,
 whatsapp: form.whatsapp,
 phone: form.phone,
 parent_phone: form.whatsapp || form.phone,
 locality: form.locality,
 father_cnic: form.fatherCnic,
 father_occupation: form.fatherOccupation,
 date_of_birth: form.dob,
 gr_number: form.gr,
 photo: photo || undefined,
 });

 const saveStudent = async (withFirstChallan = false) => {
 if (!form.name.trim() || !form.father.trim()) {
 alert("Name and father name required");
 return;
 }
 const payload = buildPayload();
 if (isEdit) {
 await updateStudent(initialData.id, payload);
 onClose();
 return;
 }
 setSavingCombo(withFirstChallan);
 try {
 const gross = sumFeeAmounts(feeSetup.amounts, feeSetup.selectedHeads);
 const now = new Date();
 const body = withFirstChallan
 ? {
 ...payload,
 fee_profile: feeProfileFromAmounts(feeSetup.amounts),
 generate_first_challan: true,
 first_challan: {
 month: MONTHS[now.getMonth()],
 year: now.getFullYear(),
 amount: gross,
 discount: feeSetup.discount || 0,
 due_date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split("T")[0],
 },
 }
 : payload;
 const res = await api.post("/api/students", body);
 const saved = res.data?.data || res.data;
 trackRecentAdded({ id: saved?.id, name: saved?.name || form.name, gr_number: saved?.gr_number || form.gr, class: form.class });
 onCredGenerated?.({ ...payload, ...(saved?.id ? saved : {}) });
 if (withFirstChallan && res.data?.first_challan && paperSettings) {
 const ch = res.data.first_challan;
 printChallan(
 { ...ch, name: form.name, gr_number: form.gr, class: form.class, section: form.section, father_name: form.father },
 {
 name: paperSettings.schoolName,
 address: paperSettings.address,
 logo: paperSettings.logo,
 showUrduHeader: paperSettings.showUrduHeader,
 }
 );
 await refreshStudents();
 } else {
 await addStudent(payload);
 }
 onClose();
 } catch (err) {
 alert(err.response?.data?.message || "Could not save student");
 } finally {
 setSavingCombo(false);
 }
 };

 return createPortal((
 <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(7,30,52,0.88)", backdropFilter:"blur(8px)", zIndex:12000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"18px 20px 28px", overflowY:"auto", overflowX:"hidden" }}>
 <div className="super-module-card" onMouseDown={(e) => e.stopPropagation()} style={{ ...card, width:"min(760px, calc(100vw - 40px))", maxHeight:"calc(100vh - 46px)", overflowY:"auto", overflowX:"hidden", position:"relative", transform:"none" }}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"-24px -24px 24px", padding:"18px 24px 16px", position:"sticky", top:0, zIndex:5, background:"rgba(7,30,52,0.96)", borderBottom:"1px solid rgba(200,153,26,0.14)", backdropFilter:"blur(14px)" }}>
 <h2 style={{ color:"#C8991A", fontSize:20, fontWeight:800, margin:0 }}>{isEdit ? 'Edit Student' : 'Add New Student'}</h2>
 <button aria-label="Close student form" title="Close" onClick={onClose} style={{ width:36, height:36, display:"grid", placeItems:"center", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(148,163,184,0.18)", borderRadius:10, color:"#C0C8D8", cursor:"pointer" }}><X size={18}/></button>
 </div>

 {/* Photo upload row */}
 <div style={{ display:"flex", gap:24, marginBottom:24, padding:"16px 18px", background:"rgba(7,30,52,0.45)", borderRadius:14, border:"1px solid rgba(200,153,26,0.12)", alignItems:"flex-start", flexWrap:"wrap" }}>
 <PhotoUploadAI value={photo} onChange={setPhoto} size={110} label="Student Photo" />
 <div style={{ flex:"1 1 260px", minWidth:0, display:"flex", flexDirection:"column", gap:8, paddingTop:4 }}>
 <div style={{ color:"#C8991A", fontSize:13, fontWeight:800 }}>Profile Photo</div>
 <div style={{ color:"#8892A4", fontSize:12, lineHeight:1.7 }}>
 Upload a clear passport-size photo of the student.<br/>
 Use the <span style={{color:"#0D9488",fontWeight: 600}}> AI Apply School Uniform</span> button to automatically apply the official school uniform/coat to the photo — perfect for ID cards and records.
 </div>
 </div>
 </div>

 <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:16, minWidth:0 }}>
 {sh("Student Info")}
 <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Student Full Name *</label><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Ahmed Ali"/></div>
 <div><label style={lbl}>Class *</label><select style={{...inp,cursor:"pointer"}} value={form.class} onChange={e=>{
 const nextClass = e.target.value
 const nextSections = sectionsForClass(nextClass)
 setForm(f => ({ ...f, class: nextClass, section: nextSections[0] || "Blue" }))
 }}>{classNames.map(c=><option key={c}>{c}</option>)}</select></div>
 <div><label style={lbl}>Section</label><select style={{...inp,cursor:"pointer"}} value={form.section} onChange={e=>set("section",e.target.value)}>{(sectionsForClass(form.class).length ? sectionsForClass(form.class) : ["Blue"]).map(s=><option key={s}>{s}</option>)}</select></div>
 <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={form.dob} onChange={e=>set("dob",e.target.value)}/></div>
 <div><label style={lbl}>Locality / Town</label><select style={{...inp,cursor:'pointer'}} value={form.locality} onChange={e=>set("locality",e.target.value)}><option value="">-- Select --</option>{localities.map(l=><option key={l}>{l}</option>)}</select></div>
 {sh("Family Info")}
 <div><label style={lbl}>Father Name *</label><input style={inp} value={form.father} onChange={e=>set("father",e.target.value)} placeholder="e.g. Muhammad Ali"/></div>
 <div><label style={lbl}>Mother Name</label><input style={inp} value={form.mother} onChange={e=>set("mother",e.target.value)} placeholder="e.g. Fatima Bibi"/></div>
 <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Father CNIC</label><input style={inp} value={form.fatherCnic} onChange={e=>set("fatherCnic",e.target.value)} placeholder="XXXXX-XXXXXXX-X" maxLength={15}/></div>
 <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Father Occupation (Optional)</label><input style={inp} value={form.fatherOccupation} onChange={e=>set("fatherOccupation",e.target.value)} placeholder="e.g. Business"/></div>
 {sh("Contact Numbers")}
 <div><label style={lbl}> WhatsApp Number</label><input style={inp} value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)} placeholder="03XXXXXXXXX"/></div>
 <div><label style={lbl}> Phone Number</label><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="03XXXXXXXXX"/></div>
 {sh("Record")}
 <div style={{ gridColumn:"1/-1" }}><label style={lbl}>GR Number {isEdit ? '' : '(Auto-generated)'}</label><input style={{...inp,opacity:0.6}} value={form.gr} readOnly/></div>
 {sh("Family Selection (Optional)")}
 <div style={{ gridColumn:"1/-1" }}>
 <label style={lbl}>Link to Existing Family</label>
 <select 
 style={{...inp,cursor:"pointer"}} 
 value={form.familyCode || ""} 
 onChange={e=>set("familyCode",e.target.value)}
 >
 <option value="">-- No Family (System will Auto-Assign) --</option>
 {families.map(f => (
 <option key={f.code} value={f.code}>{f.code} - {f.fatherName} ({f.students.length} child)</option>
 ))}
 </select>
 <p style={{ fontSize:10, color:"#8892A4", marginTop:6 }}>If left blank, the system will automatically group this student with siblings based on Father Name and Phone.</p>
 </div>
 {!isEdit && (
 <div style={{ gridColumn:"1/-1", padding:"14px 16px", background:"rgba(7,30,52,0.45)", borderRadius:12, border:"1px solid rgba(200,153,26,0.15)" }}>
 <label style={{ display:"flex", alignItems:"center", gap:8, color:"#C8991A", fontWeight:700, fontSize:13, marginBottom:12 }}>
 <input type="checkbox" checked={generateChallan} onChange={(e) => setGenerateChallan(e.target.checked)} />
 Configure fee & generate first challan on save
 </label>
 {generateChallan && (
 <FeeSetupFields
 compact
 title="Admission fee setup"
 amounts={feeSetup.amounts}
 setAmounts={(fn) => setFeeSetup((p) => ({ ...p, amounts: typeof fn === "function" ? fn(p.amounts) : fn }))}
 selectedHeads={feeSetup.selectedHeads}
 setSelectedHeads={(fn) => setFeeSetup((p) => ({ ...p, selectedHeads: typeof fn === "function" ? fn(p.selectedHeads) : fn }))}
 discount={feeSetup.discount}
 setDiscount={(d) => setFeeSetup((p) => ({ ...p, discount: d }))}
 />
 )}
 </div>
 )}
 </div>
 <div style={{ display:"flex", gap:12, margin:"24px -24px -24px", padding:"16px 24px", position:"sticky", bottom:0, zIndex:5, background:"rgba(7,30,52,0.96)", borderTop:"1px solid rgba(200,153,26,0.14)", backdropFilter:"blur(14px)", flexWrap:"wrap" }}>
 <button onClick={onClose} style={{...btnSecondary,flex:1,minWidth:120,justifyContent:"center"}}>Cancel</button>
 {!isEdit ? (
 <>
 <button disabled={savingCombo} onClick={() => saveStudent(false)} style={{...btnSecondary,flex:1,minWidth:140,justifyContent:"center"}}>
 <Plus size={16}/> Add Student Only
 </button>
 <button disabled={savingCombo || !generateChallan} onClick={() => saveStudent(true)} style={{...btnPrimary,flex:1,minWidth:200,justifyContent:"center"}}>
 {savingCombo ? "Saving…" : <><Plus size={16}/> Create Student + First Challan</>}
 </button>
 </>
 ) : (
 <button onClick={() => saveStudent(false)} style={{...btnPrimary,flex:1,justifyContent:"center"}}>
 <Edit size={15}/> Save Changes
 </button>
 )}
 </div>
 </div>
 </div>
 ), document.body);
}

//  Access Tab (inside ProfileModal) 
function AccessTab({ student }) {
 const { generateStudent, regenerateStudent, generateParent, regenerateParent, resetPassword, toggleBlock, deleteAccess } = useUserStore()
 const [showPass, setShowPass] = useState({})
 const [resetTarget, setResetTarget] = useState(null)
 const [newPass, setNewPass] = useState('')
 const [copied, setCopied] = useState(null)

 const userRaw = localStorage.getItem('al_siddique_user')
 let isDemo = false
 try {
   if (userRaw) {
     const userObj = JSON.parse(userRaw)
     isDemo = userObj?.email === 'demo@assps.edu.pk'
   }
 } catch (e) {}

 const entityId = student.id || student.gr_number || student.gr
 const sUser = getUserByEntity(entityId, 'student')
 || getUserByEntity(student.gr, 'student')
 || getUserByEntity(student.gr_number, 'student')
 const pUser = getUserByEntity(entityId, 'parent')
 || getUserByEntity(student.gr, 'parent')
 || getUserByEntity(student.gr_number, 'parent')

 const copy = (text, key) => {
 navigator.clipboard.writeText(text).catch(()=>{})
 setCopied(key); setTimeout(()=>setCopied(null), 1600)
 }

 const printCard = (u, type) => {
 const w = window.open('','_blank','width=420,height=340')
 w.document.write(`<html><head><title>${type} Login</title><style>
 body{font-family:Arial,sans-serif;padding:28px;background:#f8f9fa;margin:0}
 .card{background:#fff;border:2px solid ${type==='Student'?'#0A84FF':'#30D158'};border-radius:14px;padding:24px;max-width:360px}
 h2{color:${type==='Student'?'#0A84FF':'#1a7a3a'};margin:0 0 4px;font-size:17px}
 p{color:#555;font-size:12px;margin:0 0 18px}
 .row{display:flex;justify-content:space-between;padding:9px 13px;background:#f0f4ff;border-radius:8px;margin-bottom:8px}
 .lbl{color:#888;font-size:11px;font-weight:600}.val{color:#1a1a2e;font-size:14px;font-weight:700}
 </style></head><body><div class="card">
 <h2>${type} Login Card — Al Siddique OS</h2>
 <p>${student.name} · GR: ${student.gr || student.gr_number || ''} · Class ${student.class}</p>
 <div class="row"><span class="lbl">Login ID</span><span class="val">${u.username}</span></div>
 <div class="row"><span class="lbl">Password</span><span class="val">${u.password}</span></div>
 <div class="row"><span class="lbl">Portal</span><span class="val">alsiddique.edu.pk</span></div>
 </div></body></html>`)
 w.document.close(); setTimeout(()=>w.print(), 400)
 }

 const CredCard = ({ u, type, color, onGenerate, onRegen }) => (
 <div style={{ background:`rgba(7,30,52,0.5)`, border:`1px solid ${color}33`, borderRadius:14, padding:18 }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
 <div style={{ color, fontWeight:800, fontSize:14 }}>{type==='Student'?'':''} {type} Login</div>
 {!u ? (
 <button onClick={onGenerate} style={{ background:`${color}22`, color, border:`1px solid ${color}44`, padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight: 600, cursor:'pointer' }}>
 + Generate
 </button>
 ) : (
 <div style={{ display:'flex', gap:6 }}>
 <button onClick={onRegen} style={{ background:'rgba(255,159,10,.1)', color:'#FF9F0A', border:'1px solid #FF9F0A33', padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer' }}> Reset</button>
 <button onClick={()=>{ setResetTarget({...u,label:type}); setNewPass('') }} style={{ background:`${color}11`, color, border:`1px solid ${color}33`, padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer' }}> Pass</button>
 <button onClick={()=>toggleBlock(u.id)} style={{ background:u.isActive?'rgba(255,55,95,.1)':'rgba(48,209,88,.1)', color:u.isActive?'#FF375F':'#30D158', border:'1px solid #aaa3', padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer' }}>{u.isActive?'':''}</button>
 <button onClick={()=>printCard(u,type)} style={{ background:'rgba(191,90,242,.1)', color:'#BF5AF2', border:'1px solid #BF5AF233', padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer' }}></button>
 {!isDemo && (
 <button onClick={()=>{ if(window.confirm('Delete this access permanently?')) deleteAccess(u.id) }} style={{ background:'rgba(255,55,95,.08)', color:'#FF375F', border:'1px solid #FF375F22', padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer' }}></button>
 )}
 </div>
 )}
 </div>
 {u ? (
 <div style={{ display:'grid', gap:8 }}>
 {[['Login ID', u.username, `un_${u.id}`], ['Password', showPass[u.id] ? u.password : '••••••', `pw_${u.id}`]].map(([lbl,val,key])=>(
 <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(7,30,52,0.6)', borderRadius:10, padding:'10px 14px' }}>
 <div>
 <div style={{ color:'#8892A4', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{lbl}</div>
 <div style={{ color:'#C0C8D8', fontWeight:700, fontSize:15, fontFamily:'monospace' }}>{val}</div>
 </div>
 <div style={{ display:'flex', gap:6 }}>
 {lbl==='Password' && <button onClick={()=>setShowPass(p=>({...p,[u.id]:!p[u.id]}))} style={{ background:'none',border:'none',cursor:'pointer',color:'#8892A4',fontSize:14 }}>{showPass[u.id]?'':''}</button>}
 <button onClick={()=>copy(val,key)} style={{ background:'none',border:'none',cursor:'pointer',color:copied===key?'#30D158':'#8892A4',fontSize:14 }}>{copied===key?'':''}</button>
 </div>
 </div>
 ))}
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(7,30,52,0.6)', borderRadius:10, padding:'10px 14px' }}>
 <div><div style={{ color:'#8892A4', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>Status</div>
 <span style={{ color:u.isActive?'#30D158':'#FF375F', fontWeight:700, fontSize:13 }}>{u.isActive?' Active':' Blocked'}</span>
 </div>
 <div><div style={{ color:'#8892A4', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>Last Login</div>
 <span style={{ color:'#C0C8D8', fontSize:12 }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-PK') : '—'}</span>
 </div>
 </div>
 </div>
 ) : (
 <div style={{ textAlign:'center', padding:'20px 0', color:'#8892A4', fontSize:13 }}>
 No login credentials have been generated yet.<br/>
 Click <span style={{ color, fontWeight:700 }}>Generate</span> to create portal access.
 </div>
 )}
 </div>
 )

 return (
 <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
 <CredCard
 u={sUser} type="Student" color="#0A84FF"
 onGenerate={()=>generateStudent(student)}
 onRegen={()=>regenerateStudent(student)}
 />
 <CredCard
 u={pUser} type="Parent" color="#30D158"
 onGenerate={()=>generateParent(student)}
 onRegen={()=>regenerateParent(student)}
 />

 {resetTarget && (
 <div style={{ position:'fixed', inset:0, background:'rgba(7,30,52,.85)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
 <div style={{ background:'#0B2C4D', border:'1px solid rgba(148,163,184,0.2)', borderRadius:18, padding:28, width:340 }}>
 <h3 style={{ color:'#C8991A', margin:'0 0 6px', fontSize:16 }}>New Password — {resetTarget.label}</h3>
 <p style={{ color:'#8892A4', fontSize:12, margin:'0 0 16px' }}>{student.name} · {resetTarget.username}</p>
 <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Naya password..."
 style={{ width:'100%', background:'rgba(11,44,77,.8)', border:'1px solid rgba(148,163,184,.2)', borderRadius:10, color:'#C0C8D8', padding:'10px 13px', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:16 }}/>
 <div style={{ display:'flex', gap:10 }}>
 <button onClick={()=>setResetTarget(null)} style={{ flex:1, padding:'10px', borderRadius:10, background:'rgba(255,55,95,.1)', color:'#FF375F', border:'1px solid #FF375F33', cursor:'pointer', fontWeight: 600 }}>Cancel</button>
 <button onClick={()=>{ resetPassword(resetTarget.id, newPass.trim()); setResetTarget(null); setNewPass('') }} style={{ flex:1, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#C8991A,#e8b420)', color:'#071e34', border:'none', cursor:'pointer', fontWeight: 600 }}>Save</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

//  Profile Modal 
function ProfileModal({ student, onClose, paperSettings, onUpdatePhoto }) {
 const [tab, setTab] = useState("profile");

 useEffect(() => {
 trackRecentViewed({ id: student.id, name: student.name, gr_number: student.gr || student.gr_number, class: student.class });
 }, [student.id]);
 const [docsOpen, setDocsOpen] = useState(false);
 const [photoEditOpen, setPhotoEditOpen] = useState(false);
 const [certificateOrientation, setCertificateOrientation] = useState("auto");
 const docsRef = useRef();

 const tabs = ["profile","fee","attendance","results","notes","access","ai-portrait"];

 const InfoBlock = ({ label, value }) => (
 <div style={{ padding:"12px 16px", background:"rgba(7,30,52,0.4)", borderRadius:10 }}>
 <div style={{ color:"#8892A4", fontSize:11, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
 <div style={{ color:"#C0C8D8", fontWeight:600, fontSize:14 }}>{value||"—"}</div>
 </div>
 );

 useEffect(() => {
 const onKey = (e) => { if (e.key === "Escape") onClose() }
 window.addEventListener("keydown", onKey)
 return () => window.removeEventListener("keydown", onKey)
 }, [onClose])

 return createPortal((
 <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position:"fixed", inset:0, background:"rgba(7,30,52,0.88)", backdropFilter:"blur(8px)", zIndex:12000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"18px 20px 28px", overflowY:"auto", overflowX:"hidden" }}>
 <div className="super-module-card" onMouseDown={(e)=>e.stopPropagation()} style={{ ...card, width:"min(860px, calc(100vw - 40px))", maxHeight:"calc(100vh - 48px)", overflowY:"auto", overflowX:"hidden", transform:"none" }}>

 {/* Header row */}
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", margin:"-24px -24px 20px", padding:"18px 24px 16px", gap:12, flexWrap:"wrap", position:"sticky", top:0, zIndex:8, background:"rgba(7,30,52,0.96)", borderBottom:"1px solid rgba(200,153,26,0.14)", backdropFilter:"blur(14px)" }}>
 <h2 style={{ color:"#C8991A", fontSize:18, fontWeight:800, margin:0 }}>{student.name} | {student.father}</h2>
 <div style={{ display:"flex", gap:8, alignItems:"center" }}>

 {/* Student Documents dropdown */}
 <div style={{ position:"relative" }} ref={docsRef}>
 <button onClick={()=>setDocsOpen(o=>!o)} style={{ ...btnSecondary, fontSize:12, padding:"8px 14px" }}>
  Student Documents <ChevronDown size={13}/>
 </button>
 {docsOpen && (
 <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", background:"#0B2C4D", border:"1px solid rgba(200,153,26,0.25)", borderRadius:12, zIndex:100, minWidth:220, boxShadow:"0 12px 40px rgba(0,0,0,0.5)", overflow:"hidden" }}>
 <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
 <div style={{ color:"#8892A4", fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Print Layout</div>
 <select
 value={certificateOrientation}
 onChange={e=>setCertificateOrientation(e.target.value)}
 style={{ width:"100%", borderRadius:8, border:"1px solid rgba(148,163,184,0.2)", background:"#071e34", color:"#C0C8D8", padding:"7px 9px", outline:"none", fontSize:12 }}
 >
 <option value="auto">Auto by certificate</option>
 <option value="portrait">Portrait A4</option>
 <option value="landscape">Landscape A4</option>
 </select>
 </div>
 {STUDENT_DOCS.map(d => (
 <div key={d.id} onClick={()=>{printCertificate(d.id,student,paperSettings,certificateOrientation);setDocsOpen(false)}}
 style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", cursor:"pointer", color:"#C0C8D8", fontSize:13, borderBottom:"1px solid rgba(255,255,255,0.04)" }}
 onMouseEnter={e=>e.currentTarget.style.background="rgba(200,153,26,0.1)"}
 onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
 <span>{d.icon}</span><span>{d.label}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 <button aria-label="Close student profile" title="Close" onClick={onClose} style={{ width:36, height:36, display:"grid", placeItems:"center", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(148,163,184,0.18)", borderRadius:10, color:"#C0C8D8", cursor:"pointer" }}><X size={18}/></button>
 </div>
 </div>

 {/* Avatar + status */}
 <div style={{ display:"flex", alignItems:"center", gap:16, padding:20, background:"rgba(7,30,52,0.5)", borderRadius:12, marginBottom:20 }}>
 {/* Photo — real image or emoji fallback */}
 <div style={{ position:"relative", flexShrink:0 }}>
 {student.photo && !student.photo.includes('') && !student.photo.includes('') ? (
 <img
 src={student.photo}
 alt={student.name}
 style={{ width:72, height:90, objectFit:"cover", borderRadius:12, border:"2px solid rgba(200,153,26,0.4)", display:"block" }}
 />
 ) : (
 <div style={{ width:72, height:90, borderRadius:12, background:"rgba(148,163,184,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:38 }}>
 {student.gender === 'female' ? '' : ''}
 </div>
 )}
 <button
 onClick={() => setPhotoEditOpen(o => !o)}
 style={{ position:"absolute", bottom:3, left:"50%", transform:"translateX(-50%)", background:"rgba(7,30,52,0.88)", border:"1px solid rgba(200,153,26,0.35)", borderRadius:5, color:"#C8991A", fontSize:9, fontWeight:700, padding:"2px 7px", cursor:"pointer", whiteSpace:"nowrap" }}
 >
 Edit Photo
 </button>
 </div>
 <div style={{ flex:1 }}>
 <h3 style={{ color:"#C0C8D8", fontSize:17, fontWeight:800, margin:0 }}>{student.name}</h3>
 <p style={{ color:"#8892A4", fontSize:13, margin:"4px 0 0" }}>{student.gr} · {student.class} · Section {student.section}</p>
 </div>
 <span style={{ padding:"3px 12px", borderRadius:20, fontSize:11, fontWeight:700, background:student.status==="Active"?"rgba(48,209,88,0.15)":"rgba(255,55,95,0.15)", color:student.status==="Active"?"#30D158":"#FF375F", border:`1px solid ${student.status==="Active"?"#30D158":"#FF375F"}` }}>
 {student.status}
 </span>
 </div>

 {/* Inline photo editor */}
 {photoEditOpen && (
 <div style={{ padding:16, background:"rgba(7,30,52,0.55)", borderRadius:12, border:"1px solid rgba(13,148,136,0.25)", marginBottom:16, display:"flex", gap:20, alignItems:"flex-start" }}>
 <PhotoUploadAI
 value={student.photo && !student.photo.startsWith('') && !student.photo.startsWith('') ? student.photo : null}
 onChange={(url) => { onUpdatePhoto?.(student.id, url) }}
 size={100}
 label="Update Photo"
 />
 <div style={{ flex:1, paddingTop:6 }}>
 <div style={{ color:"#0D9488", fontSize:13, fontWeight:800, marginBottom:6 }}> AI Uniform Feature</div>
 <div style={{ color:"#8892A4", fontSize:12, lineHeight:1.8 }}>
 Upload the student's photo, then click <strong style={{color:"#0D9488"}}>AI Apply School Uniform</strong> to automatically dress them in the official school coat/blazer. The processed photo is perfect for ID cards, student records and certificates.
 </div>
 </div>
 </div>
 )}

 {/* Tabs */}
 <div style={{ display:"flex", gap:4, background:"rgba(7,30,52,0.5)", borderRadius:10, padding:4, marginBottom:20, overflowX:"auto" }}>
 {tabs.map(t=>(
 <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", background:tab===t?"rgba(200,153,26,0.2)":"transparent", color:tab===t?"#C8991A":"#8892A4", fontWeight:600, fontSize:12, textTransform:"capitalize", whiteSpace:"nowrap" }}>
 {t==="fee"?"Fees":t==="notes"?"Notes":t==="ai-portrait"?" AI Portrait":t}
 </button>
 ))}
 </div>

 {/* Profile tab */}
 {tab==="profile" && (
 <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
 <div>
 <div style={{ color:"#C8991A", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Student Information</div>
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
 <InfoBlock label="Student Name" value={student.name}/>
 <InfoBlock label="GR Number" value={student.gr}/>
 <InfoBlock label="Father Name" value={student.father}/>
 <InfoBlock label="Mother Name" value={student.mother}/>
 <InfoBlock label="Father Occupation" value={student.fatherOccupation}/>
 <InfoBlock label="Father CNIC" value={student.fatherCnic}/>
 <InfoBlock label="Religion" value={student.religion}/>
 <InfoBlock label="Date of Birth" value={student.dob}/>
 <InfoBlock label="Admission Date" value={student.admissionDate}/>
 </div>
 </div>
 <div>
 <div style={{ color:"#C8991A", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Academic Details</div>
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
 <InfoBlock label="Session" value="2026-2027"/>
 <InfoBlock label="Class / Section" value={`${student.class} / ${student.section}`}/>
 </div>
 </div>
 <div>
 <div style={{ color:"#C8991A", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Contact & Address</div>
 <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
 <InfoBlock label=" WhatsApp" value={student.whatsapp||student.contact}/>
 <InfoBlock label=" Phone" value={student.phone||student.contact}/>
 <InfoBlock label="Locality" value={student.locality}/>
 <InfoBlock label="Address" value={student.address}/>
 </div>
 </div>
 </div>
 )}
 {tab==="fee" && (
 <StudentFeePanel
 student={student}
 school={{
 name: paperSettings?.schoolName,
 address: paperSettings?.address,
 logo: paperSettings?.logo,
 showUrduHeader: paperSettings?.showUrduHeader,
 }}
 />
 )}
 {tab==="attendance" && (
 <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
 {Array.from({length:31}).map((_,i)=>(
 <div key={i} style={{ height:34, borderRadius:6, background:i%7===0?"rgba(255,55,95,0.1)":"rgba(48,209,88,0.1)", border:`1px solid ${i%7===0?"#FF375F22":"#30D15822"}`, display:"grid", placeItems:"center", color:i%7===0?"#FF375F":"#30D158", fontSize:11, fontWeight:700 }}>
 {i+1}<br/><span style={{fontSize:8}}>{i%7===0?'A':'P'}</span>
 </div>
 ))}
 </div>
 )}
 {tab==="results" && (
 <div style={{ display:"grid", gap:10 }}>
 {[
 { exam:"First Term 2026", marks:"88/100", pct:"88%", grade:"A+" },
 { exam:"Monthly Test March", marks:"45/50", pct:"90%", grade:"A+" },
 ].map((r,i)=>(
 <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"14px 18px", background:"rgba(7,30,52,0.4)", borderRadius:12, border:"1px solid rgba(10,132,255,0.15)" }}>
 <div><div style={{ color:"#C0C8D8", fontWeight:700 }}>{r.exam}</div><div style={{ color:"#8892A4", fontSize:12 }}>Obtained: {r.marks}</div></div>
 <div style={{ textAlign:"right" }}><div style={{ color:"#0A84FF", fontWeight:800, fontSize:18 }}>{r.pct}</div><div style={{ color:"#C8991A", fontSize:11, fontWeight:700 }}>Grade: {r.grade}</div></div>
 </div>
 ))}
 </div>
 )}
 {tab==="notes" && (
 <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
 <textarea placeholder="Add notes about this student..." rows={5}
 style={{ width:"100%", background:"rgba(7,22,40,0.92)", border:"1px solid rgba(200,153,26,0.2)", borderRadius:10, color:"#C0C8D8", padding:"12px 14px", fontSize:14, outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
 <button style={{ ...btnPrimary, alignSelf:"flex-start" }}>Save Note</button>
 </div>
 )}

 {tab==="access" && (
 <AccessTab student={student}/>
 )}

 {tab==="ai-portrait" && (
 <PhotoProfessionalizer
 studentId={student.id}
 studentName={student.name}
 studentGender={student.gender}
 onSave={(previewUrl) => {
 onUpdatePhoto?.(student.id, previewUrl)
 setTab("profile")
 }}
 />
 )}
 </div>
 </div>
 ), document.body);
}

//  Classwise Reports 
function ClasswiseReports({ students, onPrintClass }) {
 const classMap = {};
 students.forEach(s => {
 if (!classMap[s.class]) classMap[s.class] = { total:0, active:0, boys:0, girls:0, students:[] };
 classMap[s.class].total++;
 if (s.status==="Active") classMap[s.class].active++;
 classMap[s.class].students.push(s);
 });
 const classes = Object.entries(classMap).sort(([a],[b])=>a.localeCompare(b));
 return (
 <div className="super-module-card" style={card}>
 <h2 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:"0 0 20px" }}> Classwise Student Report — Session 2026-2027</h2>
 <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
 <button onClick={() => onPrintClass?.("All Classes Student List", students)} style={{ ...btnSecondary, padding:"8px 12px" }}><Printer size={14}/> Print All Details</button>
 </div>
 {classes.length===0 ? (
 <div style={{ textAlign:"center", padding:40, color:"#8892A4" }}>No students loaded.</div>
 ) : (
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <thead>
 <tr style={{ borderBottom:"1px solid rgba(200,153,26,0.2)" }}>
 {["Class","Total Students","Active","Inactive","Details"].map(h=>(
 <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {classes.map(([cls,d],i)=>(
 <tr key={cls} style={{ borderBottom:"1px solid rgba(200,153,26,0.06)", background:i%2===0?"transparent":"rgba(11,44,77,0.2)" }}>
 <td style={{ padding:"14px 16px", color:"#C8991A", fontWeight:700 }}>{cls}</td>
 <td style={{ padding:"14px 16px", color:"#C0C8D8", fontWeight:700 }}>{d.total}</td>
 <td style={{ padding:"14px 16px" }}><span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(48,209,88,0.1)", color:"#30D158", fontSize:12, fontWeight:600 }}>{d.active}</span></td>
 <td style={{ padding:"14px 16px" }}><span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(255,55,95,0.1)", color:"#FF375F", fontSize:12, fontWeight:600 }}>{d.total-d.active}</span></td>
 <td style={{ padding:"14px 16px" }}><button onClick={() => onPrintClass?.(`${cls} Student List`, d.students)} style={{ ...btnSecondary, padding:"7px 10px", fontSize:12 }}><Printer size={13}/> Print List</button></td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr style={{ borderTop:"2px solid rgba(200,153,26,0.3)" }}>
 <td style={{ padding:"14px 16px", color:"#C8991A", fontWeight:800 }}>TOTAL</td>
 <td style={{ padding:"14px 16px", color:"#fff", fontWeight:800 }}>{students.length}</td>
 <td style={{ padding:"14px 16px", color:"#30D158", fontWeight:700 }}>{students.filter(s=>s.status==="Active").length}</td>
 <td style={{ padding:"14px 16px", color:"#FF375F", fontWeight:700 }}>{students.filter(s=>s.status!=="Active").length}</td>
 </tr>
 </tfoot>
 </table>
 )}
 </div>
 );
}

//  Locality Reports 
function LocalityReports({ students }) {
 const localMap = {};
 students.forEach(s => {
 const loc = s.locality || "Unknown";
 if (!localMap[loc]) localMap[loc] = 0;
 localMap[loc]++;
 });
 const entries = Object.entries(localMap).sort(([,a],[,b])=>b-a);
 return (
 <div className="super-module-card" style={card}>
 <h2 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:"0 0 20px" }}> Locality Reports</h2>
 {entries.length===0 ? (
 <div style={{ textAlign:"center", padding:40, color:"#8892A4" }}>No locality data available.</div>
 ) : (
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <thead>
 <tr style={{ borderBottom:"1px solid rgba(200,153,26,0.2)" }}>
 <th style={{ padding:"12px 16px", textAlign:"left", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>Locality / Village / Town</th>
 <th style={{ padding:"12px 16px", textAlign:"left", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>Students</th>
 <th style={{ padding:"12px 16px", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>Distribution</th>
 </tr>
 </thead>
 <tbody>
 {entries.map(([loc,cnt],i)=>(
 <tr key={loc} style={{ borderBottom:"1px solid rgba(200,153,26,0.06)", background:i%2===0?"transparent":"rgba(11,44,77,0.2)" }}>
 <td style={{ padding:"14px 16px", color:"#C0C8D8", fontWeight:600 }}>{loc}</td>
 <td style={{ padding:"14px 16px", color:"#C8991A", fontWeight:700 }}>{cnt}</td>
 <td style={{ padding:"14px 16px" }}>
 <div style={{ background:"rgba(11,44,77,0.92)", borderRadius:8, height:16, overflow:"hidden" }}>
 <div style={{ width:`${(cnt/students.length)*100}%`, height:"100%", background:"rgba(200,153,26,0.6)", borderRadius:8 }}/>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 );
}

//  Admission Form Print 
function AdmissionFormPrint({ school }) {
 function printBlankForm() {
 const blank = { name:"", father:"", mother:"", gr:"", class:"", section:"", dob:"", fatherCnic:"", whatsapp:"", phone:"", locality:"", religion:"Muslim", address:"", admissionDate:"", fatherOccupation:"" };
 printCertificate("admission", blank, school);
 }
 return (
 <div className="super-module-card" style={{ ...card, textAlign:"center", padding:60 }}>
 <div style={{ fontSize:52, marginBottom:16 }}></div>
 <h2 style={{ color:"#C8991A", fontSize:20, fontWeight:800, marginBottom:8 }}>Blank Admission Form</h2>
 <p style={{ color:"#8892A4", marginBottom:24 }}>Print a blank admission form to fill in by hand.</p>
 <button onClick={printBlankForm} style={{ ...btnPrimary, margin:"0 auto" }}> Print Blank Form</button>
 </div>
 );
}

//  Admissions & Withdrawal 
function AdmissionsReport({ students }) {
 const thisMonth = new Date().toISOString().slice(0,7);
 const thisYear = new Date().getFullYear().toString();
 const monthNew = students.filter(s=>s.admissionDate?.startsWith(thisMonth));
 const yearNew = students.filter(s=>s.admissionDate?.startsWith(thisYear));
 return (
 <div style={{ display:"grid", gap:20 }}>
 <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
 {[
 { label:"Admissions Today", value:0, color:"#30D158" },
 { label:"Admissions This Month", value:monthNew.length, color:"#C8991A" },
 { label:"Admissions This Year", value:yearNew.length, color:"#0A84FF" },
 ].map(s=>(
 <div key={s.label} style={{ ...card, textAlign:"center" }}>
 <div style={{ color:"#8892A4", fontSize:12, marginBottom:8 }}>{s.label}</div>
 <div style={{ color:s.color, fontSize:36, fontWeight:800 }}>{s.value}</div>
 </div>
 ))}
 </div>
 <div className="super-module-card" style={card}>
 <h3 style={{ color:"#C8991A", fontSize:14, fontWeight:800, margin:"0 0 16px" }}>Recent Admissions</h3>
 {monthNew.length===0 ? (
 <div style={{ textAlign:"center", padding:32, color:"#8892A4" }}>No admissions this month.</div>
 ) : (
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <thead><tr style={{ borderBottom:"1px solid rgba(200,153,26,0.2)" }}>
 {["GR No","Name","Father","Class","Admission Date"].map(h=>(
 <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</th>
 ))}
 </tr></thead>
 <tbody>{monthNew.map((s,i)=>(
 <tr key={s.id} style={{ borderBottom:"1px solid rgba(200,153,26,0.06)", background:i%2===0?"transparent":"rgba(11,44,77,0.2)" }}>
 <td style={{ padding:"12px 14px", color:"#C8991A", fontWeight:700 }}>{s.gr}</td>
 <td style={{ padding:"12px 14px", color:"#C0C8D8" }}>{s.name}</td>
 <td style={{ padding:"12px 14px", color:"#8892A4" }}>{s.father}</td>
 <td style={{ padding:"12px 14px", color:"#8892A4" }}>{s.class}</td>
 <td style={{ padding:"12px 14px", color:"#8892A4" }}>{s.admissionDate}</td>
 </tr>
 ))}</tbody>
 </table>
 )}
 </div>
 </div>
 );
}

//  Student Slips 
function StudentSlips({ students, school }) {
 const [sel, setSel] = useState(null);
 function printSlip(s) {
 printCertificate("study", s, school);
 }
 return (
 <div className="super-module-card" style={card}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
 <h2 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:0 }}> Student Slips</h2>
 {sel && <button onClick={()=>sel&&printSlip(sel)} style={btnPrimary}>Print Selected Slip</button>}
 </div>
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <thead><tr style={{ borderBottom:"1px solid rgba(200,153,26,0.2)" }}>
 {["","GR No","Student Name","Father","Class","Section"].map(h=>(
 <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</th>
 ))}
 </tr></thead>
 <tbody>{students.slice(0,30).map((s,i)=>(
 <tr key={s.id} onClick={()=>setSel(s)} style={{ borderBottom:"1px solid rgba(200,153,26,0.06)", background:sel?.id===s.id?"rgba(200,153,26,0.08)":i%2===0?"transparent":"rgba(11,44,77,0.2)", cursor:"pointer" }}>
 <td style={{ padding:"10px 14px" }}><input type="radio" readOnly checked={sel?.id===s.id}/></td>
 <td style={{ padding:"10px 14px", color:"#C8991A", fontWeight:700 }}>{s.gr}</td>
 <td style={{ padding:"10px 14px", color:"#C0C8D8" }}>{s.name}</td>
 <td style={{ padding:"10px 14px", color:"#8892A4" }}>{s.father}</td>
 <td style={{ padding:"10px 14px", color:"#8892A4" }}>{s.class}</td>
 <td style={{ padding:"10px 14px", color:"#8892A4" }}>{s.section}</td>
 </tr>
 ))}</tbody>
 </table>
 </div>
 );
}

//  Main Component 
export default function StudentsModule() {
 const { classNames, allSections } = useAcademicStore();
 const { students: rawStudents, addStudent, deleteStudent, updateStudent } = useStudentStore();
 
  const userRaw = localStorage.getItem('al_siddique_user')
  let isDemo = false
  try {
    if (userRaw) {
      const userObj = JSON.parse(userRaw)
      isDemo = userObj?.email === 'demo@assps.edu.pk'
    }
  } catch (e) {}

 const { generateStudent, generateParent } = useUserStore();
 const [searchParams] = useSearchParams();
 const students = rawStudents.map(transformStudent);
 const [search, setSearch] = useState("");
 const [showDropdown, setShowDropdown] = useState(false);
 const [filterClass, setFilterClass] = useState("All Classes");
 const [filterSection, setFilterSection] = useState("All Sections");
 const [showAdd, setShowAdd] = useState(false);
 const [editStudent, setEditStudent] = useState(null);
 const [viewStudent, setViewStudent] = useState(null);
 const [printList, setPrintList] = useState(null);
 const [moduleTab, setModuleTab] = useState("students");
 const searchRef = useRef(null);

 const { paperSettings } = usePaperStore();
 const { families, autoDetectFamilies, getFamilyForStudent } = useFamilyStore();

 useEffect(() => {
 if (searchParams.get('add') === '1') setShowAdd(true);
 const viewId = searchParams.get('view') || searchParams.get('viewId');
 if (viewId && students.length > 0) {
 const s = students.find(st => String(st.id) === viewId || String(st.gr) === viewId);
 if (s) setViewStudent(s);
 }
 }, [searchParams, students.length]);

 // Auto-detect families when student list changes
 useEffect(() => {
 if (students.length > 0) {
 autoDetectFamilies(students);
 }
 }, [students.length]);

 const filtered = students.filter(s => {
 const q = search.toLowerCase();
 const matchS = s.name.toLowerCase().includes(q)||s.gr.toLowerCase().includes(q)||s.father.toLowerCase().includes(q);
 const matchC = filterClass==="All Classes"||s.class===filterClass;
 const matchSec = filterSection==="All Sections"||s.section===filterSection;
 return matchS&&matchC&&matchSec;
 });

 const stats = [
 { label:"Total Students", value:students.length, icon:"ALL", color:"#0A84FF" },
 { label:"Active", value:students.filter(s=>s.status==="Active").length, icon:"OK", color:"#30D158" },
 { label:"Fee Paid", value:students.filter(s=>s.fee==="Paid").length, icon:"PAID", color:"#C8991A" },
 { label:"Fee Pending", value:students.filter(s=>s.fee==="Pending").length, icon:"DUE", color:"#FF9F0A" },
 ];

 // Dashboard computed values
 const genderStats = getGenderStats(students);
 const maleCount = genderStats.male;
 const femaleCount = genderStats.female;
 const malePct = students.length > 0 ? Math.round((maleCount / students.length) * 100) : 0;
 const femalePct = students.length > 0 ? 100 - malePct : 0;
 const activeCount = students.filter(s => s.status === "Active").length;
 const activePct = students.length > 0 ? Math.round((activeCount / students.length) * 100) : 0;

 // Class distribution
 const classCounts = {};
 students.forEach(s => { classCounts[s.class] = (classCounts[s.class] || 0) + 1; });
 const classBarData = Object.entries(classCounts)
 .sort((a, b) => a[0].localeCompare(b[0]))
 .slice(0, 8)
 .map(([name, count], i) => ({
 label: (name || '').replace('Class ', 'C'),
 value: count,
 color: ['#0A84FF','#30D158','#C8991A','#BF5AF2','#FF375F','#64D2FF','#FF9F0A','#25D366'][i % 8],
 }));

 const dashCardStyle = { background: 'rgba(11,44,77,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 22, padding: 20 };
 const dashTitleStyle = { color: '#C0C8D8', fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };
 const metricCardStyle = {
 background: "linear-gradient(145deg, rgba(12,49,84,0.96), rgba(9,33,59,0.98))",
 border: "1px solid rgba(148,163,184,0.18)",
 borderRadius: 20,
 padding: 20,
 boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 42px rgba(0,0,0,0.16)",
 position: "relative",
 overflow: "hidden",
 };

 return (
 <div style={{ padding:24, width:"100%", maxWidth:1520, margin:"0 auto", boxSizing:"border-box" }}>

 {/* Header */}
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:20 }}>
 <div style={{ display:"flex", alignItems:"center", gap:12 }}>
 <div style={{ width:40, height:40, borderRadius:12, background:"rgba(10,132,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
 <GraduationCap size={22} color="#0A84FF"/>
 </div>
 <div>
 <h1 style={{ color:"#C0C8D8", fontSize:24, fontWeight:800, margin:0 }}>Student Management</h1>
 <p style={{ color:"#8892A4", fontSize:13, margin:0 }}>Session 2026-2027 · {students.length} total students</p>
 </div>
 </div>
 <div style={{ display:"flex", gap:10 }}>
 <button 
 onClick={() => {
 const sorted = [...students].sort((a,b) => a.class.localeCompare(b.class));
 setPrintList({ type: "Full Student List", data: sorted });
 }} 
 style={btnSecondary}
 >
 <Printer size={16}/> Print All Classes
 </button>
 <button onClick={()=>exportToCSV(filtered)} style={btnSecondary}><Download size={16}/> Export Excel</button>
 <button onClick={()=>setShowAdd(true)} style={btnPrimary}><Plus size={16}/> Add Student</button>
 </div>
 </div>


 {/* Module Sub-tabs */}
 <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", paddingBottom:2 }}>
 {MODULE_TABS.map(t=>(
 <button key={t.id} onClick={()=>setModuleTab(t.id)} style={{
 padding:"10px 18px", borderRadius:10, border:"none", cursor:"pointer", whiteSpace:"nowrap",
 background:moduleTab===t.id?"linear-gradient(135deg,#C8991A,#e8b420)":"rgba(11,44,77,0.92)",
 color:moduleTab===t.id?"#071e34":"#8892A4",
 fontWeight:700, fontSize:13,
 border:moduleTab===t.id?"none":"1px solid rgba(148,163,184,0.18)",
 }}>{t.label}</button>
 ))}
 </div>

 {/* Student Analytics */}
 <div style={{ display: "grid", gridTemplateColumns: "minmax(340px, 0.9fr) minmax(420px, 1.4fr)", gap: 18, marginBottom: 22 }}>
 <div style={{ ...dashCardStyle, minHeight: 230 }}>
 <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
 <div>
 <div style={{ ...dashTitleStyle, marginBottom: 5 }}>Student Composition</div>
 <div style={{ color: "#EAF2FF", fontSize: 18, fontWeight: 850 }}>Boys / Girls Split</div>
 </div>
 <span style={{ color: "#C8991A", background: "rgba(200,153,26,0.12)", border: "1px solid rgba(200,153,26,0.22)", borderRadius: 999, padding: "5px 10px", fontSize: 11, fontWeight: 750 }}>
 {genderStats.estimated > 0 ? "Smart estimate" : "Verified data"}
 </span>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
 <DonutChart
 segments={[
 { value: maleCount, color: "#0A84FF" },
 { value: femaleCount, color: "#FF375F" },
 ]}
 size={138}
 strokeWidth={18}
 label={String(students.length)}
 sublabel="students"
 />
 <div style={{ flex: 1, minWidth: 190 }}>
 <ChartLegend items={[
 { label: "Boys", color: "#0A84FF", value: `${maleCount} (${malePct}%)` },
 { label: "Girls", color: "#FF375F", value: `${femaleCount} (${femalePct}%)` },
 { label: "Active", color: "#30D158", value: `${activeCount} (${activePct}%)` },
 ]} />
 <div style={{ marginTop: 14, color: "rgba(192,200,216,0.72)", fontSize: 12, lineHeight: 1.55 }}>
 {genderStats.estimated > 0
 ? "Missing gender fields are displayed with a safe name-based estimate so the dashboard stays useful without changing student records."
 : "Gender values are coming directly from student records."}
 </div>
 </div>
 </div>
 </div>

 <div style={{ ...dashCardStyle, minHeight: 230 }}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
 <div>
 <div style={{ ...dashTitleStyle, marginBottom: 5 }}>Class Strength Map</div>
 <div style={{ color: "#EAF2FF", fontSize: 18, fontWeight: 850 }}>Enrollment by Class</div>
 </div>
 <div style={{ color: "#8892A4", fontSize: 12, fontWeight: 700 }}>{Object.keys(classCounts).length} active classes</div>
 </div>
 {classBarData.length > 0
 ? <BarChart bars={classBarData} height={145} showValues={true} />
 : <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "42px 0" }}>No class data</div>
 }
 </div>
 </div>

 {/* Summary Cards */}
 <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:16, marginBottom:24 }}>
 {[
 { label:"Total Students", value:students.length, color:"#0A84FF", sub:"System Enrolled", pct:100 },
 { label:"Active Students", value:activeCount, color:"#30D158", sub:"Currently Active", pct:activePct },
 { label:"Boys Total", value:maleCount, color:"#C8991A", sub:`${malePct}% of school`, pct:malePct },
 { label:"Girls Total", value:femaleCount, color:"#FF375F", sub:`${femalePct}% of school`, pct:femalePct },
 ].map(s=>(
 <div key={s.label} style={metricCardStyle}>
 <div style={{ position: "absolute", inset: "auto -35px -45px auto", width: 120, height: 120, borderRadius: "50%", background: s.color, opacity: 0.08 }} />
 <div style={{ color:"#96A3B8", fontSize:11, fontWeight:750, textTransform:"uppercase", letterSpacing:0.7, marginBottom:10 }}>{s.label}</div>
 <div style={{ color:s.color, fontSize:34, fontWeight:850, marginBottom:6, letterSpacing:-0.5 }}>{s.value}</div>
 <div style={{ color:"#C0C8D8", fontSize:12, marginBottom:14 }}>{s.sub}</div>
 <div style={{ height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
 <div style={{ width: `${Math.max(0, Math.min(100, s.pct))}%`, height: "100%", background: `linear-gradient(90deg, ${s.color}, rgba(255,255,255,0.82))`, borderRadius: 999 }} />
 </div>
 </div>
 ))}
 </div>

 {/* Tab Content */}
 {moduleTab==="students" && (
 <>
 {/* Filters */}
 <div className="super-module-card" style={{ ...card, marginBottom:20, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
 <div ref={searchRef} style={{ flex:1, minWidth:200, position:"relative" }}>
 <Search size={16} color="#8892A4" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:1 }}/>
 <input
 value={search}
 onChange={e=>{ setSearch(e.target.value); setShowDropdown(true); }}
 onFocus={()=>search.trim() && setShowDropdown(true)}
 onBlur={()=>setTimeout(()=>setShowDropdown(false), 150)}
 placeholder="Search by name, GR No, father name..."
 style={{ width:"100%", padding:"10px 12px 10px 38px", borderRadius:10, background:"rgba(7,22,40,0.92)", border:"1px solid rgba(200,153,26,0.2)", color:"#C0C8D8", fontSize:14, outline:"none", boxSizing:"border-box" }}
 />
 {showDropdown && search.trim().length > 0 && (()=>{
 const q = search.toLowerCase();
 const suggestions = students.filter(s=>
 s.name.toLowerCase().includes(q)||s.gr.toLowerCase().includes(q)||s.father.toLowerCase().includes(q)
 ).slice(0, 8);
 if (!suggestions.length) return null;
 return (
 <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#0B2C4D", border:"1px solid rgba(200,153,26,0.3)", borderRadius:10, zIndex:999, boxShadow:"0 8px 24px rgba(0,0,0,0.5)", overflow:"hidden" }}>
 {suggestions.map(s=>(
 <div
 key={s.id}
 onMouseDown={()=>{ setSearch(s.name); setShowDropdown(false); }}
 style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", borderBottom:"1px solid rgba(200,153,26,0.08)", transition:"background 0.15s" }}
 onMouseEnter={e=>e.currentTarget.style.background="rgba(200,153,26,0.1)"}
 onMouseLeave={e=>e.currentTarget.style.background="transparent"}
 >
 <span style={{ fontSize:20 }}>{s.photo}</span>
 <div style={{ flex:1 }}>
 <div style={{ color:"#C0C8D8", fontWeight:600, fontSize:13 }}>{s.name}</div>
 <div style={{ color:"#8892A4", fontSize:11 }}>{s.gr} · {s.class} {s.section} · Father: {s.father}</div>
 </div>
 <span style={{ padding:"2px 8px", background:"rgba(10,132,255,0.12)", border:"1px solid rgba(10,132,255,0.2)", borderRadius:12, fontSize:11, color:"#0A84FF" }}>{s.fee}</span>
 </div>
 ))}
 </div>
 );
 })()}
 </div>
 <select value={filterClass} onChange={e=>setFilterClass(e.target.value)}
 style={{ padding:"10px 14px", borderRadius:10, background:"rgba(7,22,40,0.92)", border:"1px solid rgba(200,153,26,0.2)", color:"#C0C8D8", fontSize:14, outline:"none", cursor:"pointer" }}>
 {['All Classes', ...classNames].map(c=><option key={c}>{c}</option>)}
 </select>
 <select value={filterSection} onChange={e=>setFilterSection(e.target.value)}
 style={{ padding:"10px 14px", borderRadius:10, background:"rgba(7,22,40,0.92)", border:"1px solid rgba(200,153,26,0.2)", color:"#C0C8D8", fontSize:14, outline:"none", cursor:"pointer" }}>
 {allSections.map(s=><option key={s}>{s}</option>)}
 </select>
 
 <button 
 onClick={() => setPrintList({ type: `${filterClass} List`, data: filtered })} 
 style={{ ...btnSecondary, padding: "8px 12px" }}
 >
 <Printer size={14}/> Print This List
 </button>

 <span style={{ color:"#8892A4", fontSize:13 }}>{filtered.length} results</span>
 </div>

 {/* Table */}
 <div className="super-module-card" style={card}>
 <table style={{ width:"100%", borderCollapse:"collapse" }}>
 <thead>
 <tr style={{ borderBottom:"1px solid rgba(200,153,26,0.2)" }}>
 {["GR No","Student","Father","Class","Contact","Fee","Status","Actions"].map(h=>(
 <th key={h} style={{ padding:"12px 14px", textAlign:"left", color:"#8892A4", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {filtered.map((s,i)=>(
 <tr key={s.id} style={{ borderBottom:"1px solid rgba(200,153,26,0.06)", background:i%2===0?"transparent":"rgba(11,44,77,0.2)" }}>
 <td style={{ padding:"14px", color:"#C8991A", fontSize:13, fontWeight:700 }}>{s.gr}</td>
 <td style={{ padding:"14px" }}>
 <div style={{ display:"flex", alignItems:"center", gap:10 }}>
 <span style={{ fontSize:22 }}>{s.photo}</span>
 <span
 onClick={()=>setViewStudent(s)}
 style={{ color:"#C0C8D8", fontWeight:600, fontSize:14, cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(10,132,255,0.4)", textDecorationThickness:1 }}
 onMouseEnter={e=>e.currentTarget.style.color="#0A84FF"}
 onMouseLeave={e=>e.currentTarget.style.color="#C0C8D8"}
 >{s.name}</span>
 </div>
 </td>
 <td style={{ padding:"14px" }}>
 <div style={{ color:"#C0C8D8", fontSize:13 }}>{s.father}</div>
 {(() => {
 const fam = getFamilyForStudent(s.id);
 return fam ? (
 <div 
 onClick={(e) => { e.stopPropagation(); navigate('/families'); }}
 style={{ fontSize:10, color:"#0A84FF", cursor:"pointer", marginTop:2 }}
 >
  {fam.code}
 </div>
 ) : null;
 })()}
 </td>
 <td style={{ padding:"14px" }}>
 <span style={{ padding:"3px 10px", background:"rgba(10,132,255,0.1)", border:"1px solid rgba(10,132,255,0.2)", borderRadius:20, fontSize:12, color:"#0A84FF" }}>{s.class} · {s.section}</span>
 </td>
 <td style={{ padding:"14px", color:"#8892A4", fontSize:13 }}>{s.contact}</td>
 <td style={{ padding:"14px" }}>
 <span style={{ padding:"3px 10px", background:s.fee==="Paid"?"rgba(48,209,88,0.1)":"rgba(255,159,10,0.1)", border:`1px solid ${s.fee==="Paid"?"rgba(48,209,88,0.3)":"rgba(255,159,10,0.3)"}`, borderRadius:20, fontSize:12, color:s.fee==="Paid"?"#30D158":"#FF9F0A", fontWeight:600 }}>{s.fee}</span>
 </td>
 <td style={{ padding:"14px" }}>
 <span style={{ padding:"3px 10px", background:s.status==="Active"?"rgba(48,209,88,0.1)":"rgba(255,55,95,0.1)", border:`1px solid ${s.status==="Active"?"rgba(48,209,88,0.3)":"rgba(255,55,95,0.3)"}`, borderRadius:20, fontSize:12, color:s.status==="Active"?"#30D158":"#FF375F", fontWeight:600 }}>{s.status}</span>
 </td>
 <td style={{ padding:"14px" }}>
 <div style={{ display:"flex", gap:6 }}>
 <Tip label="View Profile" color="#0A84FF">
 <button onClick={()=>setViewStudent(s)} style={{ width:30, height:30, borderRadius:8, background:"rgba(10,132,255,0.15)", border:"1px solid rgba(10,132,255,0.2)", color:"#0A84FF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Eye size={14}/></button>
 </Tip>
 <Tip label="Edit Student" color="#C8991A">
 <button onClick={()=>setEditStudent(s)} style={{ width:30, height:30, borderRadius:8, background:"rgba(148,163,184,0.18)", border:"1px solid rgba(200,153,26,0.2)", color:"#C8991A", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Edit size={14}/></button>
 </Tip>
 {!isDemo && (
 <Tip label="Delete Student" color="#FF375F">
 <button onClick={()=>{ if(window.confirm(`Delete ${s.name}?`)) deleteStudent(s.id) }} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,55,95,0.15)", border:"1px solid rgba(255,55,95,0.2)", color:"#FF375F", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Trash2 size={14}/></button>
 </Tip>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {filtered.length===0 && (
 <div style={{ textAlign:"center", padding:40, color:"#8892A4" }}>
 <div style={{ fontSize:40, marginBottom:12 }}></div>
 <p>No students found.</p>
 </div>
 )}
 </div>
 </>
 )}

 {moduleTab==="classwise" && <ClasswiseReports students={students} onPrintClass={(type, data) => setPrintList({ type, data })}/>}
 {moduleTab==="admissions" && <AdmissionsReport students={students}/>}
 {moduleTab==="slips" && <StudentSlips students={filtered} school={paperSettings}/>}
 {moduleTab==="locality" && <LocalityReports students={students}/>}
 {moduleTab==="form" && <AdmissionFormPrint school={paperSettings}/>}

 {showAdd && <AddStudentModal onClose={()=>setShowAdd(false)} addStudent={addStudent} paperSettings={paperSettings} onCredGenerated={s=>{ generateStudent(s); generateParent(s) }}/>}
 {editStudent && <AddStudentModal onClose={()=>setEditStudent(null)} initialData={editStudent} updateStudent={updateStudent}/>}
 {viewStudent && <ProfileModal student={viewStudent} onClose={()=>setViewStudent(null)} paperSettings={paperSettings} onUpdatePhoto={(id, url) => { updateStudent(id, { photo: url }); setViewStudent(s => ({ ...s, photo: url })) }}/>}
 {printList && <PrintStudentList list={printList} school={paperSettings} onClose={()=>setPrintList(null)} />}
 </div>
 );
}
