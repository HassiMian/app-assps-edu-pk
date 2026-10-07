// AL SIDDIQUE SMART SCHOOL OS
// Main Server Entry Point — Updated with Routes
// server.js

require('dotenv').config({ path: __dirname + '/.env' })
const express = require('express')
const fs = require('fs')
const path = require('path')
const cors    = require('cors')
const helmet  = require('helmet')
const morgan  = require('morgan')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const { query, tenantContext } = require('./config/database')
const { migrate } = require('./config/migrate')
const { migrateSubscriptionSchema } = require('./config/subscription_migrate')
const { getAiEnvConfig } = require('./services/ai/geminiClient')

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

const app = express()

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
}

app.use((req, res, next) => {
  tenantContext.run({ rlsEnabled: false, isSuperAdmin: false, tenantId: null }, next)
})

// ─── Middleware ───────────────────────────────────────────────────────────────
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: false }))

// General browsing quota: a school can have hundreds of parent/student/teacher
// sessions behind ONE router/NAT. A plain 120/IP/min limiter caused unrelated
// legitimate accounts to receive 429 after ordinary page navigation.
// Only a VERIFIED HS256 access cookie may select a user quota. Unsigned userId,
// tenantId or role cookies and arbitrary X-Forwarded-For are NEVER identity proof.
const generalSessionSubject = (req) => {
  const match = String(req.headers?.cookie || '').match(/(?:^|;\s*)authToken=([^;]+)/)
  if (!match || !process.env.JWT_SECRET) return null
  try {
    const token = decodeURIComponent(match[1])
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    const id = Number(decoded?.id)
    if (!Number.isSafeInteger(id) || id <= 0) return null
    return `school:${String(decoded.school_id ?? decoded.tenant_id ?? 'global')}:user:${id}`
  } catch { return null }
}

const skipDedicatedLimits = (req) =>
  req.method === 'OPTIONS' || req.path === '/health' || req.path.startsWith('/health/') ||
  req.path.startsWith('/api/whatsapp') || req.path.startsWith('/whatsapp') ||
  ['/api/auth/login','/api/admin/auth/login',
   '/api/auth/password-reset/request','/api/auth/password-reset/confirm',
   '/api/admin/auth/password-reset/request','/api/admin/auth/password-reset/confirm'].includes(req.path)

const authenticatedBrowseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.generalSessionSubject,
  skip: req => !req.generalSessionSubject || skipDedicatedLimits(req),
  message: { success:false, message:'Your session is sending too many requests. Please wait before retrying.' },
})
const publicBrowseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  // Retain express-rate-limit's built-in trusted req.ip / IPv6 handling.
  skip: req => Boolean(req.generalSessionSubject) || skipDedicatedLimits(req),
  message: { success:false, message:'Too many requests. Please try again later.' },
})
app.use((req,res,next) => { req.generalSessionSubject = generalSessionSubject(req); next() })
app.use(authenticatedBrowseLimiter)
app.use(publicBrowseLimiter)

// A separate per-network flood ceiling prevents rotating thousands of login
// identifiers to evade the account+network limiter. 480/min accommodates an
// ordinary school NAT login rush while retaining a finite abuse budget.
const loginNetworkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 480,
  standardHeaders: false,
  legacyHeaders: false,
  message: {success:false,message:'Too many login requests from this network. Please retry shortly.'},
})

// Login throttling is scoped by network and normalized login identity, not
// by the Next.js reverse-proxy IP or unrelated authenticated /auth/me traffic.
// The auth route separately blocks repeated incorrect passwords (5 failures).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier = String(req.body?.email || req.body?.username || req.body?.loginId || '')
      .trim().toLowerCase()
    return `${req.ip}:${require('crypto').createHash('sha256').update(identifier).digest('hex')}`
  },
  message: { success: false, message: 'Too many authentication attempts for this login. Please wait before trying again.' },
})

// Password-recovery operations retain independent per-IP throttling.
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many recovery requests. Please try again later.' },
})

// ─── CORS ────────────────────────────────────────────────────────────────────
// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/(www\.)?assps\.edu\.pk$/,
  /^https:\/\/app\.assps\.edu\.pk$/,
  /^https:\/\/apex\.assps\.edu\.pk$/,
  /^https:\/\/api\.assps\.edu\.pk$/,
]
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some(r => r.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else if (!origin && process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin === 'null' && process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type,Authorization,X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf },
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('dev'))

const uploadsDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use(['/uploads/payment-screenshots', '/api/uploads/payment-screenshots'], (req, res) => {
  res.status(404).json({ success: false, message: 'Payment proof files are not publicly accessible.' })
})
const uploadStaticOptions = {
  index: false,
  fallthrough: false,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}
app.use('/uploads', express.static(uploadsDir, uploadStaticOptions))
app.use('/api/uploads', express.static(uploadsDir, uploadStaticOptions))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() })
})

app.get('/health/ready', async (req, res) => {
  try {
    const result = await query('SELECT 1 AS ok')
    res.json({
      success: true,
      status: 'ready',
      database: result.rows[0]?.ok === 1 ? 'ok' : 'unknown',
      time: new Date().toISOString(),
    })
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'degraded',
      database: 'down',
      message: 'Database is not ready',
      time: new Date().toISOString(),
    })
  }
})

app.get('/health/ai', (req, res) => {
  const ai = getAiEnvConfig()
  const configured = Boolean(ai.apiKey)
  res.status(configured ? 200 : 503).json({
    success: configured,
    status: configured ? 'ready' : 'unavailable',
    time: new Date().toISOString(),
  })
})

app.get('/', (req, res) => {
  res.json({
    success: true,
    app:  'Al Siddique Smart School OS',
    endpoints: {
      health:     'GET  /health',
      auth:       'POST /api/auth/login',
      students:   'GET  /api/students',
      attendance: 'GET  /api/attendance',
      fees:       'GET  /api/fees',
      exams:      'GET  /api/exams',
      notify:      'POST /api/notify/bulk',
      admissions:  'POST /api/admissions (public), GET /api/admissions (admin)',
      demoRequests: 'POST /api/demo-requests (public), GET /api/demo-requests (admin)',
      transport:   'GET, POST, PUT, DELETE /api/transport (admin)',
      aiAnalytics: 'GET /api/ai-analytics (admin)',
    }
  })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
const registerRoutes = (router) => {
  const mount = (path, routeFile) => {
    try {
      router.use(path, require(routeFile))
    } catch (e) {
      console.error(`Failed to register route ${path} from ${routeFile}:`, e.message)
      if (process.env.NODE_ENV === 'production') throw e
    }
  }

  mount('/auth',       './routes/authRoutes')
  mount('/students',   './routes/studentRoutes')
  mount('/families',   './routes/familyRoutes')
  mount('/attendance', './routes/attendanceRoutes')
  mount('/academic',   './routes/academicRoutes')
  mount('/expenses',   './routes/expenseRoutes')
  mount('/transport',  './routes/transportRoutes')
  mount('/library',    './routes/libraryRoutes')
  mount('/date-sheets','./routes/dateSheetRoutes')
  mount('/fees',       './routes/feeRoutes')
  mount('/exams',      './routes/examRoutes')
  mount('/employees',  './routes/employeeRoutes')
  mount('/settings',   './routes/settingsRoutes')
  mount('/schools',    './routes/schoolRoutes')
  mount('/school',     './routes/brandingRoutes')
  mount('/cards',      './routes/cardsRoutes')
  mount('/notify',     './routes/notifyRoutes')
  mount('/paper',      './routes/paperRoute')
  mount('/assessment-studio', './routes/assessmentStudioRoutes')
  mount('/question-bank', './routes/questionBankRoutes')
  mount('/timetable',  './routes/timetableRoutes')
  mount('/global-search', './routes/globalSearchRoutes')
  mount('/admissions', './routes/admissionRoutes')
  mount('/demo-requests', './routes/demoRequestRoutes')
  mount('/subscription-requests', './routes/subscriptionRoutes')
  mount('/subscription', './routes/subscriptionRoutes')
  mount('/', './routes/uploadStorageRoutes')
  mount('/dashboard',  './routes/dashboardRoutes')
  mount('/events',     './routes/eventsRoutes')
  mount('/notices',    './routes/noticesRoutes')
  mount('/portal/paper-studio', './routes/paperStudioRoutes')
  mount('/portal',     './routes/portalRoutes')
  mount('/ops',        './routes/opsRoutes')
  mount('/daily-diary','./routes/dailyDiaryRoutes')
  mount('/ai-analytics', './routes/aiAnalyticsRoutes')
  mount('/whatsapp',   './routes/whatsappRoutes')
}

const apiRouter = express.Router()
registerRoutes(apiRouter)

app.use(['/api/auth/login', '/api/admin/auth/login'], loginNetworkLimiter, authLimiter)
app.use([
  '/api/auth/password-reset/request', '/api/auth/password-reset/confirm',
  '/api/admin/auth/password-reset/request', '/api/admin/auth/password-reset/confirm',
], recoveryLimiter)
app.use('/api', apiRouter)
app.use('/api/admin', apiRouter) // Alias for Super App

try {
  app.use('/whatsapp', require('./routes/whatsappRoutes'))
} catch (e) {
  console.error('Failed to register root /whatsapp route:', e.message)
  if (process.env.NODE_ENV === 'production') throw e
}
// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  const status = Number(err.status || err.statusCode || 500)
  const exposeMessage = status < 500 || process.env.NODE_ENV !== 'production'
  res.status(status).json({ success: false, message: exposeMessage ? (err.message || 'Request failed') : 'Internal server error' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production'
  const autoMigrate = process.env.AUTO_MIGRATE_ON_BOOT !== 'false'
  if (isProduction && autoMigrate) {
    throw new Error('AUTO_MIGRATE_ON_BOOT=false is required in production; apply versioned migrations before startup.')
  }
  if (autoMigrate) {
    try {
      await migrate()
      await migrateSubscriptionSchema()
    } catch (err) {
      console.error('Migration failed:', err.message)
      console.warn('Continuing startup in degraded mode because the database is unavailable.')
    }
  }

  const PORT = process.env.PORT || 3001
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n=====================================')
    console.log('  AL SIDDIQUE SMART SCHOOL OS')
    console.log(`  Server: http://localhost:${PORT}`)
    console.log(`  Health: http://localhost:${PORT}/health`)
    console.log('=====================================\n')
  })
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap server:', err.message)
  process.exit(1)
})

module.exports = app
