// src/routes/subscriptionRoutes.js
// Subscription onboarding and administrative approvals API

const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { sendRejectionEmail } = require('../services/emailService')
const { generateSchoolAdminCredentials } = require('../services/apexCredentials')

// Storage configuration (aligns with uploadRoutes.js)
const uploadDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, 'screenshot_' + unique + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(jpe?g|png|webp|pdf)$/i
    const allowedMime = /^(image\/(jpeg|jpg|png|webp)|application\/pdf)$/i
    const ext = allowedExt.test(path.extname(file.originalname || '').toLowerCase())
    const mime = allowedMime.test(file.mimetype || '')
    if (ext && mime) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, WEBP images or PDF files are allowed.'))
    }
  }
})

// Generate premium Request ID (REQ-XXXX-XXXX)
function generateRequestId() {
  const segment1 = Math.random().toString(36).substring(2, 6).toUpperCase()
  const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `REQ-${segment1}-${segment2}`
}

async function ensureSubscriptionRequestFormColumns() {
  await pool.query(`
    ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_id VARCHAR(80);
    ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100);
    ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_price INTEGER;
  `)
}

async function createSubscriptionRequestFromBody({ body, file }) {
  const planId = String(body.planId || body.plan_id || '').trim()
  const planName = String(body.planName || body.plan_name || body.selectedPlan || '').trim()
  const planPrice = Number(body.planPrice || body.plan_price || body.amount || 0)
  const ownerName = String(body.ownerName || body.owner_name || '').trim()
  const schoolName = String(body.schoolName || body.school_name || '').trim()
  const schoolAddress = String(body.schoolAddress || body.school_address || '').trim()
  const contactNumber = String(body.contactNumber || body.contact_number || body.phone || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const city = String(body.city || '').trim()
  const billingCycle = String(body.billingCycle || body.billing_cycle || 'monthly').trim().toLowerCase()
  const paymentMethod = String(body.paymentMethod || body.payment_method || 'manual').trim().toLowerCase()
  const transactionId = String(body.transactionId || body.transaction_id || '').trim()

  if (!planId || !planName || !planPrice || !ownerName || !schoolName || !schoolAddress || !contactNumber || !email) {
    throw Object.assign(new Error('All fields are required'), { statusCode: 400 })
  }

  await ensureSubscriptionRequestFormColumns()

  const paymentScreenshotUrl = file ? `/uploads/${file.filename}` : null
  const requestId = generateRequestId()
  const savedTransactionId = transactionId || requestId

  const result = await pool.query(`
    INSERT INTO subscription_requests (
      request_id, plan_id, plan_name, plan_price,
      owner_name, school_name, school_address, contact_number,
      email, city, selected_plan, billing_cycle, payment_method,
      transaction_id, payment_screenshot_url, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending')
    RETURNING *
  `, [
    requestId, planId, planName, Math.round(planPrice),
    ownerName, schoolName, schoolAddress, contactNumber,
    email, city, planName, billingCycle || 'monthly', paymentMethod || 'manual',
    savedTransactionId, paymentScreenshotUrl
  ])

  return result.rows[0]
}

router.post('/request', upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const request = await createSubscriptionRequestFromBody({ body: req.body, file: req.file })
    return res.status(201).json({
      success: true,
      message: 'Subscription request submitted successfully',
      data: request,
      requestId: request.request_id,
    })
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
    const status = err.statusCode || 500
    console.error('Subscription request form error:', err.message)
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to submit request',
    })
  }
})

/**
 * 1. POST / (Public Onboarding Submission)
 */
router.post('/', upload.single('screenshot'), async (req, res) => {
  try {
    const {
      ownerName,
      schoolName,
      schoolAddress,
      contactNumber,
      email,
      city,
      selectedPlan,
      billingCycle,
      paymentMethod,
      transactionId
    } = req.body

    // Validate inputs
    if (!ownerName || !schoolName || !email || !selectedPlan || !billingCycle || !paymentMethod || !transactionId) {
      if (req.file) {
        fs.unlinkSync(req.file.path) // Cleanup uploaded file on error
      }
      return res.status(400).json({ success: false, message: 'All required fields must be completed.' })
    }

    const paymentScreenshotUrl = req.file ? `/uploads/${req.file.filename}` : null

    const requestId = generateRequestId()

    const result = await pool.query(`
      INSERT INTO subscription_requests (
        request_id, owner_name, school_name, school_address, contact_number,
        email, city, selected_plan, billing_cycle, payment_method,
        transaction_id, payment_screenshot_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING id, request_id
    `, [
      requestId, ownerName, schoolName, schoolAddress || '', contactNumber || '',
      email.toLowerCase().trim(), city || '', selectedPlan, billingCycle, paymentMethod,
      transactionId, paymentScreenshotUrl
    ])

    res.status(201).json({
      success: true,
      requestId: result.rows[0].request_id,
      message: 'Your subscription request has been submitted and is pending verification.'
    })
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
    console.error('Subscription submission error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to submit onboarding form. Please try again.' })
  }
})

/**
 * 2. GET / (Super Admin List Subscription Requests)
 */
router.get('/', protect, requireRoles('super_admin'), async (req, res) => {
  try {
    const { status, plan, search, startDate, endDate } = req.query
    
    let queryText = 'SELECT * FROM subscription_requests WHERE 1=1'
    const queryParams = []
    let paramIndex = 1

    if (status) {
      queryText += ` AND status = $${paramIndex++}`
      queryParams.push(status)
    }

    if (plan) {
      queryText += ` AND LOWER(selected_plan) = LOWER($${paramIndex++})`
      queryParams.push(plan)
    }

    if (search) {
      queryText += ` AND (
        LOWER(owner_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(school_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR 
        LOWER(transaction_id) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    if (startDate) {
      queryText += ` AND created_at >= $${paramIndex++}`
      queryParams.push(startDate)
    }

    if (endDate) {
      queryText += ` AND created_at <= $${paramIndex++}`
      queryParams.push(endDate)
    }

    queryText += ' ORDER BY created_at DESC'

    const result = await pool.query(queryText, queryParams)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Admin fetch subscriptions error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to retrieve subscription requests.' })
  }
})

/**
 * 3. GET /:id (Super Admin Retrieve Single Request)
 */
router.get('/:id', protect, requireRoles('super_admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscription_requests WHERE id = $1 LIMIT 1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription request not found.' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Admin fetch subscription details error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to retrieve request details.' })
  }
})

/**
 * 4. POST /:id/approve (Super Admin Approve Request & Auto-Provision)
 */
router.post('/:id/approve', protect, requireRoles('super_admin'), async (req, res) => {
  const client = await pool.connect()
  try {
    const requestId = req.params.id

    // Fetch the request
    const requestResult = await client.query('SELECT * FROM subscription_requests WHERE id = $1 LIMIT 1', [requestId])
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription request not found.' })
    }

    const request = requestResult.rows[0]

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot approve a request with status "${request.status}".` })
    }

    await client.query('BEGIN')

    // Generate unique school tenantId
    const baseSlug = request.school_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    let tenantId = baseSlug
    let uniqueNum = 1000

    // Ensure uniqueness of school code/tenant_id
    while (true) {
      const checkRes = await client.query('SELECT id FROM schools WHERE code = $1 LIMIT 1', [tenantId])
      if (checkRes.rows.length === 0) {
        break
      }
      tenantId = `${baseSlug}-${uniqueNum}`
      uniqueNum++
    }

    // Set billing duration
    const startDate = new Date()
    const endDate = new Date()
    if (request.billing_cycle.toLowerCase() === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    // 1. Create school
    const schoolInsert = await client.query(`
      INSERT INTO schools (
        name, code, tenant_id, school_name, address, owner_name, email, phone,
        logo_url, branding, status, subscription_plan, subscription_status,
        subscription_start_date, subscription_end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, 'active', $12, $13)
      RETURNING id, tenant_id, school_name
    `, [
      request.school_name, tenantId, tenantId, request.school_name, request.school_address || '',
      request.owner_name, request.email, request.contact_number || '', request.payment_screenshot_url || '',
      JSON.stringify({}), request.selected_plan, startDate, endDate
    ])

    const schoolId = schoolInsert.rows[0].id

    // 2. Create school settings
    await client.query(`
      INSERT INTO settings (
        school_id, school_name, school_address, school_phone, school_email, principal_name, branding_config
      ) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
    `, [
      schoolId, request.school_name, request.school_address || '', request.contact_number || '',
      request.email, request.owner_name
    ])

    const baseDomain = req.headers.host || 'apex.assps.edu.pk'
    const loginUrl = `${req.secure ? 'https' : 'http'}://${baseDomain}/login/saas`
    const { user } = await generateSchoolAdminCredentials({
      client,
      request,
      tenantId,
      schoolId,
      loginUrl,
    })

    await client.query(`
      UPDATE subscription_requests
      SET status = 'approved',
          tenant_id = $2,
          approved_at = NOW(),
          created_school_id = $3,
          created_admin_user_id = $4,
          updated_at = NOW()
      WHERE id = $1
    `, [requestId, tenantId, schoolId, user.id])

    const invoiceNumber = `INV-${tenantId.toUpperCase()}-${Date.now()}`
    const amount = Number(request.amount || request.total_amount || 0)
    await client.query(`
      INSERT INTO invoices (tenant_id, invoice_number, amount, plan, status)
      VALUES ($1, $2, $3, $4, 'paid')
      ON CONFLICT (invoice_number) DO NOTHING
    `, [tenantId, invoiceNumber, amount, request.selected_plan])

    await client.query(`
      INSERT INTO payments (tenant_id, request_id, transaction_id, payment_method, amount, screenshot_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'verified')
    `, [
      tenantId,
      request.request_id || String(request.id),
      request.transaction_id || null,
      request.payment_method,
      amount,
      request.payment_screenshot_url || null
    ])

    await client.query('COMMIT')

    res.json({
      success: true,
      message: 'Subscription approved, school tenant created, and login credentials emailed successfully.',
      data: {
        tenantId,
        email: user.email,
        schoolId
      }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Approval transaction failed:', err.message)
    res.status(500).json({ success: false, message: 'Failed to approve subscription and provision school.' })
  } finally {
    client.release()
  }
})

/**
 * 5. POST /:id/reject (Super Admin Reject Request)
 */
router.post('/:id/reject', protect, requireRoles('super_admin'), async (req, res) => {
  try {
    const requestId = req.params.id
    const { rejectionReason } = req.body

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' })
    }

    // Fetch the request
    const requestResult = await pool.query('SELECT * FROM subscription_requests WHERE id = $1 LIMIT 1', [requestId])
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription request not found.' })
    }

    const request = requestResult.rows[0]

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject a request with status "${request.status}".` })
    }

    // Update request
    await pool.query(`
      UPDATE subscription_requests 
      SET status = 'rejected', rejection_reason = $1, updated_at = NOW() 
      WHERE id = $2
    `, [rejectionReason, requestId])

    // Send Rejection Email
    await sendRejectionEmail({
      ownerName: request.owner_name,
      schoolName: request.school_name,
      email: request.email,
      reason: rejectionReason
    }).catch(err => {
      console.error('⚠️ Rejection email send failed. Error:', err.message)
    })

    res.json({ success: true, message: 'Subscription request rejected and notification emailed successfully.' })
  } catch (err) {
    console.error('Rejection request failed:', err.message)
    res.status(500).json({ success: false, message: 'Failed to reject subscription request.' })
  }
})

module.exports = router
