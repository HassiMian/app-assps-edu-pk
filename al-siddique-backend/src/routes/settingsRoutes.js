// src/routes/settingsRoutes.js
// Al Siddique Smart School OS — Settings API Routes

const express = require('express')
const router = express.Router()
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, currentTenantId } = require('../middleware/tenant')
const {
  normalizeTwilioConfig,
  maskTwilioConfig,
  probeTwilioConfig,
} = require('../services/twilioSettings')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const crypto = require('crypto')

const brandingUploadDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(brandingUploadDir)) fs.mkdirSync(brandingUploadDir, { recursive: true })

const brandingUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, brandingUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPG, JPEG, WEBP files are allowed'))
    }
    cb(null, true)
  },
})

function toPublicAssetUrl(req, value) {
  if (!value || typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  if (/^(data:image\/|https?:\/\/|blob:)/i.test(trimmed)) return trimmed

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (!normalizedPath.startsWith('/uploads/')) return normalizedPath

  // Return a same-origin path so the frontend can serve uploads through its
  // local proxy route after refresh without depending on backend host details.
  return normalizedPath
}

function saveBase64Image(base64Str, schoolId, type = 'logo') {
  if (!base64Str) return null;
  if (!base64Str.startsWith('data:image/')) {
    return base64Str;
  }
  
  try {
    const matches = base64Str.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
    if (!matches || matches.length !== 3) {
      throw new Error('Unsupported branding image type. Only JPG, PNG, and WEBP are allowed.');
    }

    const type = matches[1].toLowerCase();
    const ext = type === 'jpeg' ? 'jpg' : type;
    const data = Buffer.from(matches[2], 'base64');
    
    let uploadsDir = path.join(__dirname, '../../../uploads');
    if (fs.existsSync('/var/uploads')) {
      uploadsDir = '/var/uploads';
    } else if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `school_${type}_${schoolId}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, data);
    
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Failed to save base64 image:', error);
    return base64Str;
  }
}

function processBrandingConfig(config, schoolId) {
  if (!config || typeof config !== 'object') return config;
  
  const processObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key].startsWith('data:image/')) {
        obj[key] = saveBase64Image(obj[key], schoolId, `brand_${key}`);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        processObject(obj[key]);
      }
    }
  };
  
  const newConfig = JSON.parse(JSON.stringify(config));
  processObject(newConfig);
  return newConfig;
}

const canManageSettings = requireRoles('super_admin', 'admin', 'principal')

function parseCookieHeader(header = '') {
  return String(header || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const idx = item.indexOf('=')
      if (idx === -1) return acc
      acc[decodeURIComponent(item.slice(0, idx))] = decodeURIComponent(item.slice(idx + 1))
      return acc
    }, {})
}

let tenantBrandingSchemaReady = null
async function ensureTenantBrandingTable() {
  if (tenantBrandingSchemaReady) return true
  const result = await query("SELECT to_regclass('public.tenant_branding') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('tenant_branding schema migration is not applied.')
    err.code = 'SETTINGS_SCHEMA_NOT_READY'
    throw err
  }
  tenantBrandingSchemaReady = true
  return true
}

async function resolveBrandingTenant(req) {
  if (req.user) {
    const role = String(req.user.role || '').toLowerCase()
    const isPlatformAdmin = role === 'super_admin' || role === 'saas_admin' || role === 'platform_owner'
    const tenantId = currentTenantId(req) || (isPlatformAdmin
      ? String(req.body?.tenantId || req.body?.tenant_id || req.query?.tenantId || req.query?.tenant_id || '').trim()
      : null)

    if (!tenantId && !isPlatformAdmin) return null
    return { tenantId, user: req.user }
  }

  const cookies = parseCookieHeader(req.headers.cookie)
  const cookieTenantId = cookies.tenantId || null
  const cookieUserId = cookies.userId || null

  if (cookieUserId) {
    const result = await query(
      `SELECT
         u.id,
         u.role,
         u.tenant_id,
         u.school_id,
         s.tenant_id AS school_tenant_id
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id OR u.tenant_id = s.tenant_id
       WHERE u.id = $1 AND COALESCE(u.is_active, true) = true
       LIMIT 1`,
      [cookieUserId]
    )
    const user = result.rows[0]
    if (user) {
      const role = String(user.role || '').toLowerCase()
      const tenantId = user.tenant_id || user.school_tenant_id || cookieTenantId
      if (!tenantId && role !== 'super_admin' && role !== 'saas_admin') return null
      return { tenantId, user }
    }
  }

  if (cookieTenantId) {
    return { tenantId: cookieTenantId, user: null }
  }

  return null
}

function sanitizeSettingsRow(row = {}, req = null) {
  const schoolLogo = req ? toPublicAssetUrl(req, row.school_logo || null) : row.school_logo || null
  return {
    ...row,
    school_logo: schoolLogo,
    twilio_config: maskTwilioConfig(row.twilio_config || {}),
  }
}

function pickSetting(incoming, existing, key, fallback = '') {
  if (incoming[key] !== undefined && incoming[key] !== null) return incoming[key]
  if (existing && existing[key] !== undefined && existing[key] !== null) return existing[key]
  return fallback
}

let settingsSchemaReady = null
async function ensureSettingsTable() {
  if (settingsSchemaReady) return true
  const result = await query(`
    SELECT
      to_regclass('public.settings') AS settings_table,
      to_regclass('public.organizations') AS organizations_table,
      to_regclass('public.campuses') AS campuses_table,
      COUNT(*) FILTER (WHERE column_name IN ('school_id','school_logo','twilio_config','module_access','school_access','superapp_modules','branding_config','academic_setup'))::int AS settings_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings'
  `)
  const row = result.rows[0] || {}
  if (!row.settings_table || !row.organizations_table || !row.campuses_table || Number(row.settings_columns || 0) !== 8) {
    const err = new Error('settings/identity schema migration is not applied.')
    err.code = 'SETTINGS_SCHEMA_NOT_READY'
    throw err
  }
  settingsSchemaReady = true
  return true
}

router.get('/branding', protect, async (req, res) => {
  try {
    await ensureTenantBrandingTable()
    const ctx = await resolveBrandingTenant(req)

    if (!ctx?.tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const result = await query(
      `SELECT
         id,
         tenant_id AS "tenantId",
         logo_url AS "logoUrl",
         primary_color AS "primaryColor",
         secondary_color AS "secondaryColor",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM tenant_branding
       WHERE tenant_id = $1
       LIMIT 1`,
      [ctx.tenantId]
    )

    return res.json({
      success: true,
      data: result.rows[0] || null,
    })
  } catch (error) {
    console.error('Tenant branding fetch error:', error.message)
    return res.status(error.code === 'SETTINGS_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: error.code === 'SETTINGS_SCHEMA_NOT_READY' ? 'Branding storage is not initialized.' : 'Failed to load branding' })
  }
})

router.post('/branding', protect, canManageSettings, async (req, res) => {
  brandingUpload.single('logo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Branding upload failed' })
    }

    let client = null
    try {
      await ensureTenantBrandingTable()
      const ctx = await resolveBrandingTenant(req)
      if (!ctx?.tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' })
      }

      const primaryColor = String(req.body?.primaryColor || '').trim() || null
      const secondaryColor = String(req.body?.secondaryColor || '').trim() || null
      const logoUrl = req.file ? `/uploads/${req.file.filename}` : null

      client = await pool.connect()
      await client.query('BEGIN')
    await applyTenantContext(client)
      const result = await client.query(
        `INSERT INTO tenant_branding (
           id, tenant_id, logo_url, primary_color, secondary_color, updated_at
         ) VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           logo_url = COALESCE(EXCLUDED.logo_url, tenant_branding.logo_url),
           primary_color = COALESCE(EXCLUDED.primary_color, tenant_branding.primary_color),
           secondary_color = COALESCE(EXCLUDED.secondary_color, tenant_branding.secondary_color),
           updated_at = NOW()
         RETURNING
           id,
           tenant_id AS "tenantId",
           logo_url AS "logoUrl",
           primary_color AS "primaryColor",
           secondary_color AS "secondaryColor",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [crypto.randomUUID(), ctx.tenantId, logoUrl, primaryColor, secondaryColor]
      )

      const schoolUpdate = await client.query(
        `UPDATE schools
         SET logo_url = COALESCE($1, logo_url),
             primary_color = COALESCE($2, primary_color),
             secondary_color = COALESCE($3, secondary_color),
             updated_at = NOW()
         WHERE tenant_id = $4
         RETURNING id`,
        [logoUrl, primaryColor, secondaryColor, ctx.tenantId]
      )
      if (!schoolUpdate.rowCount) {
        const error = new Error('Tenant school record was not found for branding update.')
        error.statusCode = 404
        throw error
      }

      await client.query('COMMIT')
      client.release(); client = null
      return res.json({ success: true, message: 'Branding updated successfully', data: result.rows[0] })
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {})
        client.release(); client = null
      }
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {})
      console.error('Tenant branding update error:', error.message)
      return res.status(error.statusCode || (error.code === 'SETTINGS_SCHEMA_NOT_READY' ? 503 : 500)).json({
        success: false,
        message: error.code === 'SETTINGS_SCHEMA_NOT_READY' ? 'Branding storage is not initialized.' : 'Failed to update branding',
      })
    }
  })
})

// Get school settings
router.get('/', protect, async (req, res) => {
  try {
    await ensureSettingsTable()
    const schoolId = Number(currentSchoolId(req) || 0)
    if (!schoolId) return res.status(403).json({ success: false, message: 'School context is required.' })
    const schoolResult = await query(
      `SELECT id, code, COALESCE(NULLIF(TRIM(school_name), ''), name) AS school_name,
              address, logo_url, subscription_plan, feature_flags
       FROM schools WHERE id = $1 LIMIT 1`,
      [schoolId]
    )
    if (!schoolResult.rowCount) return res.status(404).json({ success: false, message: 'School not found.' })
    const canonicalSchool = schoolResult.rows[0]
    const schoolCode = canonicalSchool.code || null

    // Now query the settings
    const result = await query(`
      SELECT * FROM settings
      WHERE school_id = $1
      ORDER BY id DESC
      LIMIT 1
    `, [currentSchoolId(req)])

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        configured: false,
        data: {
          school_id: schoolId,
          school_code: schoolCode,
          school_name: canonicalSchool.school_name || '',
          school_address: canonicalSchool.address || '',
          school_phone: '',
          school_email: '',
          principal_name: '',
          academic_year: '',
          fee_due_date: '',
          attendance_threshold: '',
          school_logo: canonicalSchool.logo_url || null,
          twilio_config: maskTwilioConfig({}),
          school_urdu: '',
          show_urdu_on_login: false,
          module_access: {},
          school_access: [],
          superapp_modules: {},
          branding_config: {},
          subscription_plan: canonicalSchool.subscription_plan || null,
          feature_flags: Array.isArray(canonicalSchool.feature_flags) ? canonicalSchool.feature_flags : [],
        }
      })
    }

    res.json({
      success: true,
      data: sanitizeSettingsRow({
        ...result.rows[0],
        school_code: schoolCode,
        module_access: result.rows[0]?.module_access || {},
        school_access: result.rows[0]?.school_access || [],
        superapp_modules: result.rows[0]?.superapp_modules || {},
        branding_config: result.rows[0]?.branding_config || {},
      }, req),
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return res.status(error.code === 'SETTINGS_SCHEMA_NOT_READY' ? 503 : 500).json({
      success: false,
      message: error.code === 'SETTINGS_SCHEMA_NOT_READY' ? 'Settings storage is not initialized.' : 'Database unavailable. Settings cannot be loaded.'
    })
  }

})

// Update school settings
router.put('/', protect, canManageSettings, async (req, res) => {
  try {
    await ensureSettingsTable()
    let schoolCode = null
    try {
      const schoolResult = await query(
        'SELECT code FROM schools WHERE id = $1 LIMIT 1',
        [currentSchoolId(req)]
      )
      schoolCode = schoolResult.rows[0]?.code || null
    } catch (err) {
      console.warn('Could not resolve updated school code:', err.message)
    }
    const incoming = req.body && typeof req.body === 'object' ? req.body : {}
    const existingResult = await query(
      `SELECT school_name, school_address, school_phone, school_email, principal_name,
              academic_year, fee_due_date, attendance_threshold, school_logo, twilio_config,
              school_urdu, show_urdu_on_login, module_access, school_access, superapp_modules, branding_config
         FROM settings
        WHERE school_id = $1
        LIMIT 1`,
      [currentSchoolId(req)]
    )
    const existing = existingResult.rows[0] || {}
    const existingTwilio = await query(
      'SELECT twilio_config FROM settings WHERE school_id = $1 LIMIT 1',
      [currentSchoolId(req)]
    )
    const mergedTwilio = normalizeTwilioConfig({
      ...(existingTwilio.rows[0]?.twilio_config || {}),
      ...(incoming.twilio_config && typeof incoming.twilio_config === 'object' ? incoming.twilio_config : {}),
      auth_token: incoming.twilio_config?.auth_token || incoming.twilio_config?.authToken || existingTwilio.rows[0]?.twilio_config?.auth_token || existingTwilio.rows[0]?.twilio_config?.authToken || '',
    })

    const schoolId = currentSchoolId(req)
    let logoToSave = incoming.school_logo !== undefined ? (incoming.school_logo || null) : (existing.school_logo || null)
    if (logoToSave && logoToSave.startsWith('data:image/')) {
      logoToSave = saveBase64Image(logoToSave, schoolId, 'logo')
    }

    let brandingConfigToSave = incoming.branding_config && typeof incoming.branding_config === 'object' ? incoming.branding_config : (existing.branding_config || {})
    brandingConfigToSave = processBrandingConfig(brandingConfigToSave, schoolId)

    // Insert or update settings
    const result = await query(`
      INSERT INTO settings (
        school_id, school_name, school_address, school_phone, school_email,
        principal_name, academic_year, fee_due_date, attendance_threshold,
        school_logo, twilio_config, school_urdu, show_urdu_on_login, module_access, school_access, superapp_modules, branding_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (school_id) DO UPDATE SET
        school_name = EXCLUDED.school_name,
        school_address = EXCLUDED.school_address,
        school_phone = EXCLUDED.school_phone,
        school_email = EXCLUDED.school_email,
        principal_name = EXCLUDED.principal_name,
        academic_year = EXCLUDED.academic_year,
        fee_due_date = EXCLUDED.fee_due_date,
        attendance_threshold = EXCLUDED.attendance_threshold,
        school_logo = EXCLUDED.school_logo,
        twilio_config = EXCLUDED.twilio_config,
        school_urdu = EXCLUDED.school_urdu,
        show_urdu_on_login = EXCLUDED.show_urdu_on_login,
        module_access = EXCLUDED.module_access,
        school_access = EXCLUDED.school_access,
        superapp_modules = EXCLUDED.superapp_modules,
        branding_config = EXCLUDED.branding_config,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      schoolId,
      pickSetting(incoming, existing, 'school_name', ''),
      pickSetting(incoming, existing, 'school_address', ''),
      pickSetting(incoming, existing, 'school_phone', ''),
      pickSetting(incoming, existing, 'school_email', ''),
      pickSetting(incoming, existing, 'principal_name', ''),
      pickSetting(incoming, existing, 'academic_year', ''),
      pickSetting(incoming, existing, 'fee_due_date', '10'),
      pickSetting(incoming, existing, 'attendance_threshold', '75'),
      logoToSave,
      mergedTwilio,
      pickSetting(incoming, existing, 'school_urdu', ''),
      incoming.show_urdu_on_login !== undefined ? Boolean(incoming.show_urdu_on_login) : Boolean(existing.show_urdu_on_login),
      incoming.module_access && typeof incoming.module_access === 'object' ? incoming.module_access : (existing.module_access || {}),
      Array.isArray(incoming.school_access) ? incoming.school_access : (Array.isArray(existing.school_access) ? existing.school_access : []),
      incoming.superapp_modules && typeof incoming.superapp_modules === 'object' ? incoming.superapp_modules : (existing.superapp_modules || {}),
      brandingConfigToSave,
    ])

    await query(
      `UPDATE schools
       SET
         school_name = COALESCE($1, school_name),
         logo_url = COALESCE($2, logo_url),
         address = COALESCE($3, address),
         updated_at = NOW()
       WHERE id = $4`,
      [
        result.rows[0]?.school_name || null,
        result.rows[0]?.school_logo || null,
        result.rows[0]?.school_address || null,
        schoolId,
      ]
    ).catch((err) => {
      console.warn('Could not mirror settings branding into schools table:', err.message)
    })

    res.json({
      success: true,
      data: sanitizeSettingsRow({
        ...result.rows[0],
        school_code: schoolCode,
      }, req),
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Settings update error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    })
  }
})

router.get('/twilio', protect, canManageSettings, async (req, res) => {
  try {
    await ensureSettingsTable()
    const schoolId = currentSchoolId(req)
    const result = await query(
      'SELECT twilio_config FROM settings WHERE school_id = $1 LIMIT 1',
      [schoolId]
    )
    const config = maskTwilioConfig(result.rows[0]?.twilio_config || {})
    const probe = await probeTwilioConfig(result.rows[0]?.twilio_config || {})

    res.json({
      success: true,
      data: {
        ...config,
        probe,
      },
    })
  } catch (error) {
    console.error('Twilio settings fetch error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to load Twilio settings',
    })
  }
})

router.put('/twilio', protect, canManageSettings, async (req, res) => {
  try {
    await ensureSettingsTable()
    const schoolId = currentSchoolId(req)
    const existing = await query(
      'SELECT twilio_config FROM settings WHERE school_id = $1 LIMIT 1',
      [schoolId]
    )
    const merged = normalizeTwilioConfig({
      ...(existing.rows[0]?.twilio_config || {}),
      ...(req.body && typeof req.body === 'object' ? req.body : {}),
      auth_token: req.body?.auth_token || req.body?.authToken || existing.rows[0]?.twilio_config?.auth_token || existing.rows[0]?.twilio_config?.authToken || '',
    })
    const canonicalSchool = await query("SELECT COALESCE(NULLIF(TRIM(school_name), ''), name) AS school_name FROM schools WHERE id = $1 LIMIT 1", [schoolId])
    const schoolName = String(req.body?.school_name || canonicalSchool.rows[0]?.school_name || '').trim()
    if (!schoolName) return res.status(422).json({ success: false, message: 'School name is required before updating messaging settings.' })
    const result = await query(`
      INSERT INTO settings (school_id, school_name, twilio_config)
      VALUES ($1, $2, $3)
      ON CONFLICT (school_id) DO UPDATE SET
        twilio_config = EXCLUDED.twilio_config,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [schoolId, schoolName, merged])

    res.json({
      success: true,
      data: {
        twilio_config: maskTwilioConfig(result.rows[0]?.twilio_config || {}),
      },
      message: 'Twilio settings updated successfully',
    })
  } catch (error) {
    console.error('Twilio settings update error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update Twilio settings',
    })
  }
})

router.get('/twilio/test', protect, canManageSettings, async (req, res) => {
  try {
    await ensureSettingsTable()
    const schoolId = currentSchoolId(req)
    const result = await query(
      'SELECT twilio_config FROM settings WHERE school_id = $1 LIMIT 1',
      [schoolId]
    )
    const probe = await probeTwilioConfig(result.rows[0]?.twilio_config || {})
    res.json({
      success: true,
      data: probe,
    })
  } catch (error) {
    console.error('Twilio probe error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify Twilio settings',
    })
  }
})

router.patch('/logo', protect, canManageSettings, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    let school_logo = req.body?.school_logo || null
    if (school_logo && school_logo.startsWith('data:image/')) {
      school_logo = saveBase64Image(school_logo, schoolId, 'logo')
    }
    await ensureSettingsTable()
    const canonicalSchool = await query("SELECT COALESCE(NULLIF(TRIM(school_name), ''), name) AS school_name FROM schools WHERE id = $1 LIMIT 1", [schoolId])
    const schoolName = String(req.body?.school_name || canonicalSchool.rows[0]?.school_name || '').trim()
    if (!schoolName) return res.status(422).json({ success: false, message: 'School name is required before updating the logo.' })
    const result = await query(`
      INSERT INTO settings (school_id, school_name, school_logo)
      VALUES ($1, $2, $3)
      ON CONFLICT (school_id) DO UPDATE SET
        school_logo = EXCLUDED.school_logo,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [schoolId, schoolName, school_logo])

    res.json({
      success: true,
      data: sanitizeSettingsRow(result.rows[0], req),
      message: 'School logo updated successfully',
    })
  } catch (error) {
    console.error('Settings logo update error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update school logo',
    })
  }
})

// Public endpoint — no auth required (returns basic school identity for login pages)
router.get('/public', async (req, res) => {
  try {
    await ensureSettingsTable()
    const requestedSchoolId = Number(req.query.school_id || req.query.schoolId)
    const requestedSchoolCode = String(req.query.school_code || req.query.schoolCode || '').trim()
    const hasExplicitSchoolRef = Boolean(requestedSchoolCode || (Number.isInteger(requestedSchoolId) && requestedSchoolId > 0))
    const schoolQuery = requestedSchoolCode ? 'code' : 'id'
    const schoolValue = requestedSchoolCode || (Number.isInteger(requestedSchoolId) && requestedSchoolId > 0 ? requestedSchoolId : 1)

    let school = null
    try {
      const schoolSql = schoolQuery === 'code'
        ? 'SELECT id, code, status, subscription_plan, feature_flags FROM schools WHERE LOWER(code) = LOWER($1) LIMIT 1'
        : 'SELECT id, code, status, subscription_plan, feature_flags FROM schools WHERE id = $1 LIMIT 1'
      const schoolResult = await query(schoolSql, [schoolValue])
      school = schoolResult.rows[0] || null
    } catch (err) {
      // schools table might not exist yet in single-tenant setups
      console.warn('Could not query schools table:', err.message)
    }

    let branchSettings = null;
    let branchSchoolId = null;
    if (!school && requestedSchoolCode) {
      const allSettings = await query('SELECT school_id, school_access FROM settings WHERE school_access IS NOT NULL');
      for (const row of allSettings.rows) {
        if (!Array.isArray(row.school_access)) continue;
        const branch = row.school_access.find(b => b.schoolCode && b.schoolCode.toLowerCase() === requestedSchoolCode.toLowerCase() && b.active);
        if (branch) {
          branchSettings = branch;
          branchSchoolId = row.school_id;
          break;
        }
      }
    }

    if (!school && !branchSchoolId && hasExplicitSchoolRef) {
      return res.status(404).json({ success: false, message: 'School not found.' })
    }
    const settingsSchoolId = school ? school.id : (branchSchoolId || 1)
    const result = await query(
      'SELECT school_name, school_address, school_phone, school_email, school_logo, principal_name, school_urdu, show_urdu_on_login, superapp_modules, branding_config FROM settings WHERE school_id = $1 LIMIT 1',
      [settingsSchoolId]
    )

    if (!result.rows[0] && !branchSettings) {
      return res.status(404).json({ success: false, message: 'School settings not found.' })
    }

    res.json({
      success: true,
      data: {
        school_name: branchSettings ? branchSettings.schoolName : (result.rows[0]?.school_name || ''),
        school_address: result.rows[0]?.school_address || '',
        school_phone: result.rows[0]?.school_phone || '',
        school_email: result.rows[0]?.school_email || '',
        school_logo: toPublicAssetUrl(req, branchSettings ? (branchSettings.schoolLogo || null) : (result.rows[0]?.school_logo || null)),
        principal_name: result.rows[0]?.principal_name || 'Principal',
        school_urdu: result.rows[0]?.school_urdu || '',
        show_urdu_on_login: Boolean(result.rows[0]?.show_urdu_on_login),
        school_id: settingsSchoolId,
        school_code: branchSettings ? branchSettings.schoolCode : (school?.code || null),
        status: branchSettings ? 'active' : (school?.status || 'active'),
        subscription_plan: school?.subscription_plan || 'basic',
        feature_flags: school?.feature_flags || [],
        superapp_modules: result.rows[0]?.superapp_modules || {},
        branding_config: result.rows[0]?.branding_config || {},
      }
    })
  } catch (error) {
    console.error('Public settings fetch error:', error)
    return res.status(503).json({
      success: false,
      message: 'Service unavailable. Public settings cannot be loaded.'
    })
  }
})

module.exports = router
