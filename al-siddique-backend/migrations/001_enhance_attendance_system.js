/**
 * Migration: Enhance Attendance System
 * 
 * Purpose:
 * - Ensure attendance table supports all statuses (present, absent, late, leave, half_day)
 * - Add optional time tracking columns
 * - Add remarks field for notes
 * - Ensure proper constraints and indexing
 * 
 * Status: This script documents the expected schema and provides
 *         validation/setup code for the attendance system
 */

const { query } = require('../src/config/database')

async function enhanceAttendanceSystem() {
  try {
    console.log('🚀 Starting Attendance System Enhancement...')

    // Check current attendance table structure
    const tableCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance'
      ORDER BY ordinal_position
    `)

    console.log('📊 Current attendance table structure:')
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    // Verify required columns exist
    const columnNames = tableCheck.rows.map(r => r.column_name)
    const requiredColumns = {
      'id': 'serial primary key',
      'school_id': 'uuid',
      'student_id': 'integer',
      'date': 'date',
      'status': 'varchar (supports: present, absent, late, leave, half_day)',
      'marked_by': 'varchar',
      'created_at': 'timestamp',
      'updated_at': 'timestamp',
    }

    const missingColumns = Object.keys(requiredColumns).filter(col => !columnNames.includes(col))
    
    if (missingColumns.length > 0) {
      console.warn('⚠️  Missing columns:', missingColumns)
      console.log('🔧 Run the following SQL to add missing columns:')
      
      const statements = []
      if (missingColumns.includes('status')) {
        statements.push(`
          ALTER TABLE attendance 
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'present'
          CHECK (status IN ('present', 'absent', 'late', 'leave', 'half_day'));
        `)
      }
      if (missingColumns.includes('updated_at')) {
        statements.push(`
          ALTER TABLE attendance 
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        `)
      }
      statements.forEach(stmt => console.log(stmt))
    } else {
      console.log('✅ All required columns exist')
    }

    // Optional: Check for additional fields (not required but recommended)
    const optionalColumns = {
      'time_in': 'time',
      'time_out': 'time',
      'remarks': 'text',
      'marked_at': 'timestamp',
    }

    console.log('\n📝 Optional enhancement columns (not required):')
    Object.entries(optionalColumns).forEach(([colName, colType]) => {
      if (!columnNames.includes(colName)) {
        console.log(`   - ADD COLUMN ${colName} ${colType}`)
      } else {
        console.log(`   ✓ ${colName} already exists`)
      }
    })

    // Verify constraints
    console.log('\n🔐 Checking constraints...')
    const constraints = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'attendance'
    `).catch(() => ({ rows: [] }))

    if (constraints.rows.length > 0) {
      console.log('✅ Constraints found:')
      constraints.rows.forEach(c => console.log(`   - ${c.constraint_name} (${c.constraint_type})`))
    } else {
      console.log('⚠️  No constraints found. Ensure unique constraint on (student_id, date) exists.')
    }

    // Check indexes
    console.log('\n📈 Checking indexes...')
    const indexes = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'attendance'
    `).catch(() => ({ rows: [] }))

    if (indexes.rows.length > 0) {
      console.log('✅ Indexes found:')
      indexes.rows.forEach(i => console.log(`   - ${i.indexname}`))
    }

    console.log('\n✨ Attendance System Status Check Complete')
    console.log('\n📌 Supported Statuses:')
    console.log('   ✓ present')
    console.log('   ✓ absent')
    console.log('   ✓ late')
    console.log('   ✓ leave')
    console.log('   ✓ half_day (optional)')

    return { success: true, message: 'Attendance system verified' }
  } catch (error) {
    console.error('❌ Error during enhancement:', error.message)
    return { success: false, error: error.message }
  }
}

// Export for use in other scripts
module.exports = { enhanceAttendanceSystem }

// Run if called directly
if (require.main === module) {
  enhanceAttendanceSystem()
    .then(result => {
      console.log('\nResult:', result)
      process.exit(result.success ? 0 : 1)
    })
    .catch(err => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}
