const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src/.env') });

const { pool } = require('./src/config/database');

async function main() {
  try {
    const res = await pool.query("SELECT id, school_id, school_name, length(school_logo) as logo_len FROM settings");
    console.log(`Found ${res.rows.length} records in settings:`);
    for (const row of res.rows) {
      console.log(`  ID: ${row.id}, School ID: ${row.school_id}, Name: ${row.school_name}, Logo Length: ${row.logo_len}`);
      if (row.logo_len && row.logo_len > 0) {
        const logoRes = await pool.query("SELECT school_logo FROM settings WHERE id = $1", [row.id]);
        const logo = logoRes.rows[0].school_logo;
        console.log(`    Start: ${logo.slice(0, 150)}`);
      }
    }
  } catch (err) {
    console.error("Error querying database:", err.message);
  } finally {
    await pool.end();
  }
}

main();
