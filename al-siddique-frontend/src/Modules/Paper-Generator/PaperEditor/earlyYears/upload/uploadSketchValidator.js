// uploadSketchValidator.js — Validation, sanitization, and metadata extraction for user-uploaded sketches
import { validateSketchSvg, registerUserSketchAsset } from '../assets/SketchAssetRegistry.js'

const ALLOWED_MIME_TYPES = new Set(['image/svg+xml', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Validates a sketch upload payload
 */
export function validateSketchUploadPayload({
  file = null,
  fileName = '',
  mimeType = '',
  fileSizeBytes = 0,
  textPayload = null,
  dataUrl = null
}) {
  const errors = []

  const effectiveMime = mimeType || file?.type || ''
  if (!ALLOWED_MIME_TYPES.has(effectiveMime)) {
    errors.push(`Invalid file type: ${effectiveMime}. Accepted formats: SVG, PNG, WebP`)
  }

  const effectiveSize = fileSizeBytes || file?.size || 0
  if (effectiveSize > MAX_FILE_SIZE_BYTES) {
    errors.push(`File size exceeds 2MB limit: ${(effectiveSize / (1024 * 1024)).toFixed(2)} MB`)
  }

  // Security check for SVG payloads
  let sanitizedSvg = textPayload
  if (effectiveMime === 'image/svg+xml' && textPayload) {
    const sec = validateSketchSvg(textPayload)
    if (!sec.valid) {
      errors.push(`Security validation error: ${sec.error}`)
    } else {
      // Clean comments and extra whitespace
      sanitizedSvg = textPayload.replace(/<!--[\s\S]*?-->/g, '').trim()
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    }
  }

  // Generate safe assetId
  const baseName = (fileName || 'sketch').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
  const assetId = `user.upload.${baseName.toLowerCase()}.${Date.now().toString(36)}`

  const metadata = {
    assetId,
    name: baseName,
    altText: `User sketch: ${baseName}`,
    source: 'USER_UPLOAD',
    mimeType: effectiveMime,
    fileSizeBytes: effectiveSize,
    width: 100,
    height: 100,
    aspectRatio: 1,
    printMode: 'photocopy-safe',
    objectFit: 'contain',
    svgContent: sanitizedSvg || '',
    dataUrl: dataUrl || null
  }

  return {
    valid: true,
    metadata
  }
}

/**
 * Processes a File object from an HTML <input type="file">
 */
export async function processSketchFileUpload(file) {
  if (!file) throw new Error('No file provided')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    if (file.type === 'image/svg+xml') {
      reader.onload = () => {
        const textPayload = reader.result
        const validation = validateSketchUploadPayload({
          file,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          textPayload
        })

        if (!validation.valid) {
          reject(new Error(validation.errors.join('; ')))
          return
        }

        const registered = registerUserSketchAsset(validation.metadata)
        resolve(registered)
      }
      reader.onerror = () => reject(new Error('Failed to read SVG file'))
      reader.readAsText(file)
    } else {
      reader.onload = () => {
        const dataUrl = reader.result
        const validation = validateSketchUploadPayload({
          file,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          dataUrl
        })

        if (!validation.valid) {
          reject(new Error(validation.errors.join('; ')))
          return
        }

        const registered = registerUserSketchAsset(validation.metadata)
        resolve(registered)
      }
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    }
  })
}
