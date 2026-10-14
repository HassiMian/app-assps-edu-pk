'use strict'
const crypto = require('node:crypto')

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  }
  return value
}

function sha256(value) {
  const payload = typeof value === 'string' ? value : JSON.stringify(stable(value))
  return crypto.createHash('sha256').update(payload).digest('hex')
}

module.exports={stable,sha256}
