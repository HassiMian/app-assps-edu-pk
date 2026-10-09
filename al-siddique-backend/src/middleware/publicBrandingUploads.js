'use strict'
// SaaS Core owns the public media boundary. Only tenant branding is intended
// for unauthenticated access. Student identity and other uploaded records must
// use future authenticated record-scoped endpoints, never static filesystem URLs.
const path = require('node:path')
const fs = require('node:fs')
const express = require('express')

function mountPublicBrandingUploads(app, uploadsDir, options = {}) {
  if (!app || typeof app.use !== 'function' || !uploadsDir) {
    throw new Error('PUBLIC_UPLOADS_CONFIG_INVALID')
  }
  const staticOptions = {
    index: false,
    fallthrough: false,
    maxAge: options.maxAge ?? 0,
    setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }
  const brandingDir = path.join(uploadsDir, 'branding')
  const branding = express.static(brandingDir, staticOptions)
  const deny = (_req, res) => {
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.status(404).json({ success: false, message: 'Upload is not publicly accessible.' })
  }
  // A branding-directory symlink pointing at private files must never become
  // an anonymous static-file escape. The upload route itself writes UUID-named
  // raster images, so permit only such single-file image paths and regular files.
  const brandOnly = (req, res, next) => {
    const filename = req.path.slice(1)
    if (!/^[a-z0-9][a-z0-9_.-]*\.(?:png|jpe?g|webp)$/i.test(filename)) return deny(req, res)
    fs.lstat(path.join(brandingDir, filename), (error, stat) => {
      if (error || !stat.isFile()) return deny(req, res)
      next()
    })
  }
  // Keep both existing public logo URL aliases working without serving the
  // entire filesystem beneath /var/uploads to anonymous users.
  app.use('/uploads/branding', brandOnly, branding)
  app.use('/api/uploads/branding', brandOnly, branding)
  app.use(['/uploads', '/api/uploads'], deny)
}

module.exports = { mountPublicBrandingUploads }
