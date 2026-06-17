const { query, pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const email = 'admin@alsiddique.edu.pk';
    const password = 'admin123';
    
    // Check if exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists. Updating password to password123...');
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
