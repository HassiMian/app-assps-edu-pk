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

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
})

app.use(generalLimiter)

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
}))          // PDF uploads are now multipart, not JSON
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
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
  },
}
app.use('/uploads', express.static(uploadsDir, uploadStaticOptions))
app.use('/api/uploads', express.static(uploadsDir, uploadStaticOptions))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    time: new Date().toISOString(),
  })
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
    status: 'ok',
    service: 'ASSPS API',
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
  mount('/fees',       './routes/feeRoutes')
  mount('/expenses',   './routes/expenseRoutes')
  mount('/transport',  './routes/transportRoutes')
  mount('/library',    './routes/libraryRoutes')
  mount('/date-sheets', './routes/dateSheetRoutes')
  mount('/exams',      './routes/examRoutes')
  mount('/employees',  './routes/employeeRoutes')
  mount('/settings',   './routes/settingsRoutes')
  mount('/schools',    './routes/schoolRoutes')
  mount('/school',     './routes/brandingRoutes')
  mount('/cards',      './routes/cardsRoutes')
  mount('/notify',     './routes/notifyRoutes')
  mount('/paper',      './routes/paperRoute')
  mount('/assessment-studio', './routes/assessmentStudioRoutes')
  mount('/assessment-results', './routes/assessmentResultRoutes')
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
  mount('/lesson-plans','./routes/lessonPlanRoutes')
  mount('/ai-analytics', './routes/aiAnalyticsRoutes')
  mount('/whatsapp', './routes/whatsappRoutes')
}

const apiRouter = express.Router()
registerRoutes(apiRouter)

app.use(['/api/auth', '/api/admin/auth'], authLimiter)
app.use('/api', apiRouter)
app.use('/api/admin', apiRouter) // Alias for Super App
// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  const status = Number(err.status || err.statusCode || 500)
  const exposeMessage = status < 500 || process.env.NODE_ENV !== 'production'
  res.status(status).json({
    success: false,
    message: exposeMessage ? (err.message || 'Request failed') : 'Internal server error',
  })
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
