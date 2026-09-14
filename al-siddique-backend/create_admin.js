const { query, pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const email = process.env.CREATE_ADMIN_EMAIL;
    const password = process.env.CREATE_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error('CREATE_ADMIN_EMAIL and CREATE_ADMIN_PASSWORD are required.');
    }
    if (String(password).length < 12) {
      throw new Error('CREATE_ADMIN_PASSWORD must be at least 12 characters.');
    }
    
    // Check if exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists. Updating password from environment value...');
      const hashed = await bcrypt.hash(password, 10);
      await query('UPDATE users SET password = $1 WHERE email = $2', [hashed, email]);
      console.log('Password updated successfully.');
    } else {
      console.log('Creating new admin user...');
      const hashed = await bcrypt.hash(password, 10);
      await query(`
        INSERT INTO users (name, email, password, role, is_active) 
        VALUES ($1, $2, $3, $4, true)
      `, ['Super Admin', email, hashed, 'Admin']);
      console.log('Admin user created successfully.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
