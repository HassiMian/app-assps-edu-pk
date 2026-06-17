const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'al-siddique-frontend', 'src', 'Modules', 'students', 'StudentModule.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add localities to useAcademicStore destructuring
content = content.replace(
  "const { classNames, sectionsForClass } = useAcademicStore();",
  "const { classNames, sectionsForClass, localities } = useAcademicStore();"
);

// 2. Add fatherOccupation to initial form state
content = content.replace(
  "fatherCnic: initialData.fatherCnic || '',",
  "fatherCnic: initialData.fatherCnic || '',\n    fatherOccupation: initialData.fatherOccupation || '',"
);
content = content.replace(
  "whatsapp:\"\", phone:\"\", locality:\"\", dob:\"\", fatherCnic:\"\",",
  "whatsapp:\"\", phone:\"\", locality:\"\", dob:\"\", fatherCnic:\"\", fatherOccupation:\"\",\n"
);

// 3. Add fatherOccupation input in form UI
content = content.replace(
  "<div><label style={lbl}>Locality / Town</label><input style={inp} value={form.locality} onChange={e=>set(\"locality\",e.target.value)} placeholder=\"e.g. Rayya Khas\"/></div>",
  "<div><label style={lbl}>Locality / Town</label><select style={{...inp,cursor:'pointer'}} value={form.locality} onChange={e=>set(\"locality\",e.target.value)}><option value=\"\">-- Select --</option>{localities.map(l=><option key={l}>{l}</option>)}</select></div>"
);
content = content.replace(
  "<div style={{ gridColumn:\"1/-1\" }}><label style={lbl}>Father CNIC</label><input style={inp} value={form.fatherCnic} onChange={e=>set(\"fatherCnic\",e.target.value)} placeholder=\"XXXXX-XXXXXXX-X\" maxLength={15}/></div>",
  "<div style={{ gridColumn:\"1/-1\" }}><label style={lbl}>Father CNIC</label><input style={inp} value={form.fatherCnic} onChange={e=>set(\"fatherCnic\",e.target.value)} placeholder=\"XXXXX-XXXXXXX-X\" maxLength={15}/></div>\n          <div style={{ gridColumn:\"1/-1\" }}><label style={lbl}>Father Occupation (Optional)</label><input style={inp} value={form.fatherOccupation} onChange={e=>set(\"fatherOccupation\",e.target.value)} placeholder=\"e.g. Business\"/></div>"
);

// 4. Update the payload
content = content.replace(
  "locality:form.locality,father_cnic:form.fatherCnic,",
  "locality:form.locality,father_cnic:form.fatherCnic,father_occupation:form.fatherOccupation,"
);

// 5. Add viewId parsing to StudentsModule
content = content.replace(
  "if (searchParams.get('add') === '1') setShowAdd(true);",
  "if (searchParams.get('add') === '1') setShowAdd(true);\n    const viewId = searchParams.get('viewId');\n    if (viewId && students.length > 0) {\n      const s = students.find(st => String(st.id) === viewId || String(st.gr) === viewId);\n      if (s) setViewStudent(s);\n    }"
);
content = content.replace(
  "}, [searchParams]);",
  "}, [searchParams, students.length]);"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated StudentModule.jsx');
