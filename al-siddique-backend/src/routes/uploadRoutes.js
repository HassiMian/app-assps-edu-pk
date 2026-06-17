const express = require('express')
const router  = require('express').Router()
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { protect } = require('../middleware/auth')

// Keep uploads in the same production directory used by branding/settings.
const uploadDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // high-res portraits/logos
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(jpe?g|png|webp)$/i
    const allowedMime = /^image\/(jpeg|jpg|png|webp)$/i
    const ext = allowedExt.test(path.extname(file.originalname || '').toLowerCase())
    const mime = allowedMime.test(file.mimetype || '')
    if (ext && mime) cb(null, true)
    else cb(new Error('Sirf images allowed hain (jpg, png, webp)'))
  }
})

function cleanupFile(filePath) {
  if (!filePath) return Promise.resolve()
  return fs.promises.unlink(filePath).catch(() => {})
}

// POST /api/upload/photo
router.post('/photo', protect, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      await cleanupFile(req.file?.path)
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' })
    }

    if (!req.file) return res.status(400).json({ success: false, message: 'File nahi mili' })
    const url = `/uploads/${req.file.filename}`
    res.json({ success: true, url, filename: req.file.filename })
  })
})

module.exports = router
