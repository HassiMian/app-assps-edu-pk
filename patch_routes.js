const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'al-siddique-backend', 'src', 'routes', 'studentRoutes.js');
let content = fs.readFileSync(file, 'utf8');

// POST route destructuring
content = content.replace(
  "father_cnic, father_occupation, locality,\n      father_cnic, father_occupation, locality",
  "father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school"
);

// POST route insert - tenant
content = content.replace(
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo,\n      father_cnic, father_occupation, locality,\n           father_cnic, father_occupation, locality",
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo, father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school"
);
content = content.replace(
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)",
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)"
);
content = content.replace(
  "father_cnic, father_occupation, locality,\n          father_cnic, father_occupation, locality])",
  "father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school])"
);

// POST route insert - non-tenant
content = content.replace(
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo,\n      father_cnic, father_occupation, locality,\n           father_cnic, father_occupation, locality",
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo, father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school"
);
content = content.replace(
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)"
);
content = content.replace(
  "father_cnic, father_occupation, locality,\n          father_cnic, father_occupation, locality])",
  "father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school])"
);

// PUT route destructuring
content = content.replace(
  "father_cnic, father_occupation, locality\n    } = req.body",
  "father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school\n    } = req.body"
);

// PUT route update
content = content.replace(
  "father_cnic=$13, father_occupation=$14, locality=$15, updated_at=NOW()\n      WHERE id=$16\n        ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND (school_id = $17 OR school_id IS NULL)' : ''}",
  "father_cnic=$13, father_occupation=$14, locality=$15, b_form_number=$16, blood_group=$17, religion=$18, previous_school=$19, updated_at=NOW()\n      WHERE id=$20\n        ${supportsTenant && req.user?.role !== 'super_admin' ? 'AND (school_id = $21 OR school_id IS NULL)' : ''}"
);
content = content.replace(
  "father_cnic, father_occupation, locality,\n      father_cnic, father_occupation, locality, req.params.id]",
  "father_cnic, father_occupation, locality, b_form_number, blood_group, religion, previous_school, req.params.id]"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched studentRoutes.js');
