const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'al-siddique-frontend', 'src', 'Modules', 'students', 'AdmissionsModule.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Update blank form state
content = content.replace(
  "const blank = { name: '', father_name: '', mother_name: '', father_cnic: '', father_occupation: '', locality: '', studentClass: 'Class 1', section: 'A', date_of_birth: '', parent_phone: '', gender: 'male', address: '', photo: null }",
  "const blank = { name: '', father_name: '', mother_name: '', father_cnic: '', father_occupation: '', locality: '', studentClass: 'Class 1', section: 'A', date_of_birth: '', parent_phone: '', parent_whatsapp: '', b_form_number: '', blood_group: '', religion: '', previous_school: '', gender: 'male', address: '', photo: null }"
);

// 2. Update payload
content = content.replace(
  "parent_phone: form.parent_phone,\n        gender: form.gender, address: form.address,",
  "parent_phone: form.parent_phone, parent_whatsapp: form.parent_whatsapp,\n        b_form_number: form.b_form_number, blood_group: form.blood_group, religion: form.religion, previous_school: form.previous_school,\n        gender: form.gender, address: form.address,"
);

// 3. Update UI structure
// Add B-Form and Religion under Student Information
const nameField = "<div style={{ gridColumn:\"1/-1\" }}><label style={lbl}>Student Full Name *</label><input style={inp} value={form.name} onChange={set(\"name\")} placeholder=\"e.g. Ahmed Ali\" required/></div>";
const newNameBform = `
          <div style={{ gridColumn:"1/-1", display:"flex", gap:"16px" }}>
            <div style={{ flex: 2 }}><label style={lbl}>Student Full Name *</label><input style={inp} value={form.name} onChange={set("name")} placeholder="e.g. Ahmed Ali" required/></div>
            <div style={{ flex: 1 }}><label style={lbl}>Student B-Form / CNIC</label><input style={inp} value={form.b_form_number} onChange={set("b_form_number")} placeholder="XXXXX-XXXXXXX-X" maxLength={15}/></div>
          </div>`;
content = content.replace(nameField, newNameBform);

// Add Religion and Blood Group
const genderDob = `<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, gridColumn:"1/-1" }}>
            <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={form.date_of_birth} onChange={set("date_of_birth")}/></div>
            <div><label style={lbl}>Gender</label><select style={{...inp,cursor:'pointer'}} value={form.gender} onChange={set("gender")}><option value="male">Male</option><option value="female">Female</option></select></div>
          </div>`;
const newGenderDob = `<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16, gridColumn:"1/-1" }}>
            <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={form.date_of_birth} onChange={set("date_of_birth")}/></div>
            <div><label style={lbl}>Gender</label><select style={{...inp,cursor:'pointer'}} value={form.gender} onChange={set("gender")}><option value="male">Male</option><option value="female">Female</option></select></div>
            <div><label style={lbl}>Blood Group</label><select style={{...inp,cursor:'pointer'}} value={form.blood_group} onChange={set("blood_group")}><option value="">-- Select --</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></div>
            <div><label style={lbl}>Religion</label><input style={inp} value={form.religion} onChange={set("religion")} placeholder="e.g. Islam"/></div>
          </div>`;
content = content.replace(genderDob, newGenderDob);

// Add WhatsApp under Contact
const parentPhoneAddress = `<div><label style={lbl}>Parent Phone *</label><input style={inp} value={form.parent_phone} onChange={set("parent_phone")} placeholder="03XXXXXXXXX" required/></div>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Address</label><input style={inp} value={form.address} onChange={set("address")} placeholder="Home address"/></div>`;
const newContactFields = `<div><label style={lbl}>Parent Phone *</label><input style={inp} value={form.parent_phone} onChange={set("parent_phone")} placeholder="03XXXXXXXXX" required/></div>
          <div><label style={lbl}>Parent WhatsApp</label><input style={inp} value={form.parent_whatsapp} onChange={set("parent_whatsapp")} placeholder="03XXXXXXXXX"/></div>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Address</label><input style={inp} value={form.address} onChange={set("address")} placeholder="Home address"/></div>`;
content = content.replace(parentPhoneAddress, newContactFields);

// Add Previous School
const classSection = `<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, gridColumn:"1/-1" }}>
            <div><label style={lbl}>Class *</label><select style={{...inp,cursor:'pointer'}} value={form.studentClass} onChange={e=>{setForm(p=>({...p,studentClass:e.target.value,section:(sectionsForClass(e.target.value)[0]||'')}))}} required>{classNames.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Section</label><select style={{...inp,cursor:'pointer'}} value={form.section} onChange={set("section")}>{sectionsForClass(form.studentClass).map(s=><option key={s}>{s}</option>)}</select></div>
          </div>`;
const newClassSection = `<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr", gap:16, gridColumn:"1/-1" }}>
            <div><label style={lbl}>Class *</label><select style={{...inp,cursor:'pointer'}} value={form.studentClass} onChange={e=>{setForm(p=>({...p,studentClass:e.target.value,section:(sectionsForClass(e.target.value)[0]||'')}))}} required>{classNames.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Section</label><select style={{...inp,cursor:'pointer'}} value={form.section} onChange={set("section")}>{sectionsForClass(form.studentClass).map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Previous School (Optional)</label><input style={inp} value={form.previous_school} onChange={set("previous_school")} placeholder="e.g. Allied School"/></div>
          </div>`;
content = content.replace(classSection, newClassSection);


fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched AdmissionsModule.jsx');
