// hashUtils.js — Browser-safe cryptographic hashing utilities
// Pure JavaScript standard SHA-256 + SubtleCrypto async verification.
// No Node-only dependencies.

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]

/**
 * Computes standard SHA-256 hash synchronously for a string or Uint8Array.
 * Browser-compatible, pure JavaScript, zero external dependencies.
 *
 * @param {string | Uint8Array} input
 * @returns {string} 64-character lowercase hex string
 */
export function sha256Sync(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19

  const byteLen = bytes.length
  const bitLen = byteLen * 8

  const remainder = (byteLen + 9) % 64
  const padLen = remainder === 0 ? 0 : 64 - remainder
  const totalLen = byteLen + 1 + padLen + 8
  const padded = new Uint8Array(totalLen)
  padded.set(bytes, 0)
  padded[byteLen] = 0x80

  const view = new DataView(padded.buffer)
  view.setBigUint64(totalLen - 8, BigInt(bitLen), false)

  const W = new Int32Array(64)

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getInt32(offset + i * 4, false)
    }
    for (let i = 16; i < 64; i++) {
      const s0 = ((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^
                 ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^
                 (W[i - 15] >>> 3)
      const s1 = ((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^
                 ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^
                 (W[i - 2] >>> 10)
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
      const ch = (e & f) ^ ((~e) & g)
      const temp1 = (h + S1 + ch + K[i] + W[i]) | 0
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0

      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    H0 = (H0 + a) | 0
    H1 = (H1 + b) | 0
    H2 = (H2 + c) | 0
    H3 = (H3 + d) | 0
    H4 = (H4 + e) | 0
    H5 = (H5 + f) | 0
    H6 = (H6 + g) | 0
    H7 = (H7 + h) | 0
  }

  return [H0, H1, H2, H3, H4, H5, H6, H7]
    .map(val => (val >>> 0).toString(16).padStart(8, '0'))
    .join('')
}

/**
 * Computes standard SHA-256 hash asynchronously using Web Crypto API
 * with pure JS fallback.
 *
 * @param {string | Uint8Array} input
 * @returns {Promise<string>}
 */
export async function sha256Async(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return sha256Sync(bytes)
}
