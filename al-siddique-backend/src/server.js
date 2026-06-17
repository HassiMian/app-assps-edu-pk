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
  /^https?:\/\/(www\.)?assps\.edu\.pk$/,
  /^https?:\/\/app\.assps\.edu\.pk$/,
  /^https?:\/\/apex\.assps\.edu\.pk$/,
  /^https?:\/\/api\.assps\.edu\.pk$/,
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

app.use(express.json({ limit: '10mb' }))          // PDF uploads are now multipart, not JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('dev'))

const uploadsDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir, {
  index: false,
  fallthrough: false,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}))
app.use('/api/uploads', express.static(uploadsDir, {
  index: false,
  fallthrough: false,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Al Siddique Smart School OS — API Running!',
    version: '1.0.0',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV || 'development',
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
  res.json({
    success: true,
    configured: Boolean(ai.apiKey),
    models: {
      primary: ai.primaryModel,
      fallback: ai.fallbackModel,
      vision: ai.visionModel,
      text: ai.textModel,
    },
    status: ai.apiKey ? 'ready' : 'unconfigured',
    message: ai.apiKey ? 'AI service configured' : 'AI service not configured',
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
    }
  }

  mount('/auth',       './routes/authRoutes')
  mount('/students',   './routes/studentRoutes')
  mount('/attendance', './routes/attendanceRoutes')
  mount('/fees',       './routes/feeRoutes')
  mount('/exams',      './routes/examRoutes')
  mount('/employees',  './routes/employeeRoutes')
  mount('/settings',   './routes/settingsRoutes')
  mount('/schools',    './routes/schoolRoutes')
  mount('/school',     './routes/brandingRoutes')
  mount('/cards',      './routes/cardsRoutes')
  mount('/notify',     './routes/notifyRoutes')
  mount('/paper',      './routes/paperRoute')
  mount('/question-bank', './routes/questionBankRoutes')
  mount('/global-search', './routes/globalSearchRoutes')
  mount('/admissions', './routes/admissionRoutes')
  mount('/demo-requests', './routes/demoRequestRoutes')
  mount('/subscription-requests', './routes/subscriptionRoutes')
  mount('/subscription', './routes/subscriptionRoutes')
  mount('/', './routes/uploadStorageRoutes')
  mount('/dashboard',  './routes/dashboardRoutes')
  mount('/events',     './routes/eventsRoutes')
  mount('/notices',    './routes/noticesRoutes')
  mount('/portal',     './routes/portalRoutes')
  mount('/ops',        './routes/opsRoutes')
  mount('/daily-diary','./routes/dailyDiaryRoutes')
  try { router.use('/ai-analytics', (req, res) => {
    // Mock AI data for now but hitting real endpoint
    res.json({
      success: true,
      data: [
        { id: '1', type: 'risk', title: 'At-Risk Students Detected', description: '23 students showing declining performance.', studentCount: 23, severity: 'high', grade: 'Grade 10' },
        { id: '2', type: 'performance', title: 'Top Performers Cluster', description: '156 students consistently scoring above 90%.', studentCount: 156, severity: 'low', grade: 'All Grades' },
      ]
    })
  }) } catch(e) {}
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
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────
async function bootstrap() {
  if (process.env.AUTO_MIGRATE_ON_BOOT !== 'false') {
    try {
      await migrate()
      await migrateSubscriptionSchema()
    } catch (err) {
      console.error('Migration failed:', err.message)
      if (process.env.NODE_ENV === 'production') {
        throw err
      }
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
