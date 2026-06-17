const DEFAULT_STABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
]

class GeminiError extends Error {
  constructor(message, { code = 'GEMINI_ERROR', status = 500, model = null, details = null } = {}) {
    super(message)
    this.name = 'GeminiError'
    this.code = code
    this.status = status
    this.model = model
    this.details = details
  }
}

function maskSecrets(text) {
  return String(text || '')
    .replace(/AIza[0-9A-Za-z\-_]+/g, '[REDACTED]')
    .replace(/key=\w+/gi, 'key=[REDACTED]')
}

function getAiEnvConfig() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ''
  const primaryModel = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-flash'
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash'
  const visionModel = process.env.GEMINI_VISION_MODEL || primaryModel
  const textModel = process.env.GEMINI_TEXT_MODEL || primaryModel
  return { apiKey, primaryModel, fallbackModel, visionModel, textModel }
}

function uniqueModels(models) {
  return [...new Set(models.filter(Boolean).map(model => String(model).trim()).filter(Boolean))]
}

function buildModelChain({ preferredModel, purpose = 'text' } = {}) {
  const config = getAiEnvConfig()
  const base = [
    preferredModel,
    purpose === 'vision' ? config.visionModel : config.textModel,
    config.primaryModel,
    config.fallbackModel,
    ...DEFAULT_STABLE_MODELS,
  ]
  return uniqueModels(base)
}

function isMissingKeyError(err) {
  return !getAiEnvConfig().apiKey || err?.code === 'INVALID_API_KEY'
}

function publicMessageFor(err) {
  if (!err) return 'AI service temporarily unavailable.'
  if (err instanceof GeminiError) {
    if (err.code === 'INVALID_API_KEY') return 'AI model is not configured on the server.'
    if (err.code === 'MODEL_NOT_FOUND') return 'AI model temporarily unavailable, fallback model used / please retry.'
    if (err.code === 'RATE_LIMIT') return 'AI service is busy right now. Please retry in a moment.'
    if (err.code === 'TIMEOUT') return 'AI request timed out. The job will retry automatically.'
    if (err.code === 'INVALID_JSON') return 'AI returned an invalid response. Please retry.'
    return err.message || 'AI service temporarily unavailable.'
  }
  return 'AI service temporarily unavailable.'
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGeminiRaw({
  apiKey,
  model,
  contents,
  generationConfig,
  timeoutMs = 90000,
  safetySettings,
}) {
  const key = apiKey || getAiEnvConfig().apiKey
  if (!key) {
    throw new GeminiError('Gemini API key is missing on the server.', {
      code: 'INVALID_API_KEY',
      status: 500,
      model,
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0,
          topP: 0.95,
          maxOutputTokens: generationConfig?.maxOutputTokens || 8192,
          responseMimeType: generationConfig?.responseMimeType || 'application/json',
          ...generationConfig,
        },
        safetySettings,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = maskSecrets(data?.error?.message || response.statusText || 'Gemini request failed')
      const status = response.status
      const lower = message.toLowerCase()
      if (status === 401 || lower.includes('api key') || lower.includes('invalid api key')) {
        throw new GeminiError('Gemini API key is invalid or missing on the server.', {
          code: 'INVALID_API_KEY',
          status,
          model,
          details: message,
        })
      }
      if (status === 404 || lower.includes('not found')) {
        throw new GeminiError(`Gemini model not found: ${model}`, {
          code: 'MODEL_NOT_FOUND',
          status,
          model,
          details: message,
        })
      }
      if (status === 429 || lower.includes('quota') || lower.includes('rate limit')) {
        throw new GeminiError('Gemini rate limit exceeded.', {
          code: 'RATE_LIMIT',
          status,
          model,
          details: message,
        })
      }
      if (status === 408 || status === 504) {
        throw new GeminiError('Gemini request timed out.', {
          code: 'TIMEOUT',
          status,
          model,
          details: message,
        })
      }
      throw new GeminiError(message || 'Gemini request failed.', {
        code: 'GEMINI_ERROR',
        status,
        model,
        details: message,
      })
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
    return { text, raw: data, model }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new GeminiError('Gemini request timed out.', {
        code: 'TIMEOUT',
        status: 504,
        model,
      })
    }
    if (err instanceof GeminiError) throw err
    throw new GeminiError(maskSecrets(err.message || 'Gemini request failed.'), {
      code: 'GEMINI_ERROR',
      status: 500,
      model,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function stripCodeFences(raw) {
  return String(raw || '')
    .replace(/```json\s*/gi, '```')
    .replace(/```/g, '')
    .trim()
}

function extractJsonCandidate(raw) {
  const cleaned = stripCodeFences(raw)
  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket)
  if (start < 0) return null
  const open = cleaned[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth += 1
    if (cleaned[i] === close) depth -= 1
    if (depth === 0) {
      return cleaned.slice(start, i + 1)
    }
  }
  return cleaned.slice(start)
}

function parseJsonResponse(raw) {
  const candidate = extractJsonCandidate(raw)
  if (!candidate) return null
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

async function repairJsonResponse({
  apiKey,
  model,
  rawText,
  schemaHint,
  timeoutMs = 45000,
}) {
  const repairPrompt = [
    'Repair the following AI output into strict valid JSON only.',
    `Schema hint: ${schemaHint}`,
    'Rules:',
    '- Do not add new facts.',
    '- Preserve Urdu exactly.',
    '- Output only JSON, no markdown, no commentary.',
    '',
    'RAW OUTPUT:',
    rawText,
  ].join('\n')

  const { text } = await callGeminiRaw({
    apiKey,
    model,
    contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' },
    timeoutMs,
  })

  return parseJsonResponse(text)
}

async function callWithFallback({
  apiKey,
  model,
  purpose = 'text',
  contents,
  generationConfig,
  timeoutMs = 90000,
  onAttempt,
  maxRetries = 2,
}) {
  const chain = buildModelChain({ preferredModel: model, purpose })
  let lastErr = null

  for (const candidate of chain) {
    let attempt = 0
    while (attempt <= maxRetries) {
      try {
        onAttempt?.({ model: candidate, attempt: attempt + 1 })
        const result = await callGeminiRaw({
          apiKey,
          model: candidate,
          contents,
          generationConfig,
          timeoutMs,
        })
        return { ...result, fallbackUsed: candidate !== model, attempts: attempt + 1 }
      } catch (err) {
        lastErr = err
        if (err instanceof GeminiError && err.code === 'INVALID_API_KEY') {
          throw err
        }
        const retryable = err instanceof GeminiError
          && ['TIMEOUT', 'RATE_LIMIT', 'GEMINI_ERROR'].includes(err.code)
        if (!retryable || attempt >= maxRetries) break
        const backoff = 700 * Math.pow(2, attempt)
        await sleep(backoff)
        attempt += 1
      }
    }
  }

  if (lastErr instanceof GeminiError && lastErr.code === 'MODEL_NOT_FOUND') {
    throw new GeminiError('AI model temporarily unavailable, fallback model used / please retry.', {
      code: 'MODEL_NOT_FOUND',
      status: 503,
      details: lastErr.details,
    })
  }

  throw new GeminiError(publicMessageFor(lastErr), {
    code: lastErr?.code || 'GEMINI_ERROR',
    status: lastErr?.status || 500,
    details: lastErr?.details || null,
  })
}

module.exports = {
  GeminiError,
  getAiEnvConfig,
  buildModelChain,
  callGeminiRaw,
  callWithFallback,
  extractJsonCandidate,
  parseJsonResponse,
  repairJsonResponse,
  publicMessageFor,
  maskSecrets,
}
