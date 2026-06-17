const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'routes', 'studentRoutes.js');
let content = fs.readFileSync(file, 'utf8');

// Replace POST destructuring
content = content.replace(
  "parent_phone, parent_whatsapp, photo",
  "parent_phone, parent_whatsapp, photo,\n      father_cnic, father_occupation, locality"
);

// Replace PUT destructuring
// Wait, the first replace only replaces the FIRST occurrence. Let's do it globally.
content = content.replace(
  /parent_phone, parent_whatsapp, photo/g,
  "parent_phone, parent_whatsapp, photo,\n      father_cnic, father_occupation, locality"
);

// Replace POST INSERT 1
content = content.replace(
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo)",
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo,\n           father_cnic, father_occupation, locality)"
);

content = content.replace(
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)"
);

// Replace POST INSERT 2
content = content.replace(
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
  "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)"
);

// Replace PUT UPDATE
content = content.replace(
  "parent_phone=$10, parent_whatsapp=$11, photo=$12, updated_at=NOW()",
  "parent_phone=$10, parent_whatsapp=$11, photo=$12,\n        father_cnic=$13, father_occupation=$14, locality=$15, updated_at=NOW()"
);

// Replace PUT Params
content = content.replace(
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo, req.params.id]",
  "date_of_birth, gender, address, parent_phone, parent_whatsapp, photo,\n      father_cnic, father_occupation, locality, req.params.id]"
);

// We need to fix the WHERE clause indices for PUT because id was $13, now it is $16
content = content.replace("WHERE id=$13", "WHERE id=$16");
content = content.replace("AND (school_id = $14", "AND (school_id = $17");

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated studentRoutes.js');
