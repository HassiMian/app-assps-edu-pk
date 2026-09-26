const { pool } = require('/var/www/apex-backend/config/database');
pool.query("SELECT id, name, email, role, school_id, is_active FROM users WHERE role = 'admin' AND is_active = true LIMIT 5", (err, res) => {
  if (err) { console.error(err); process.exit(1); }
  console.table(res.rows);
  pool.end();
});
