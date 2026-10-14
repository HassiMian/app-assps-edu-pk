// Evidence format is verified from magic bytes, not the browser-supplied MIME string.
// This does not establish issuer, textbook edition, school adoption or human authorship.
export function detectSchoolEvidenceMime(data) {
 if (!(data instanceof Uint8Array) || data.length<4) return null
 if (data.length>=5 && data[0]===0x25 && data[1]===0x50 && data[2]===0x44 && data[3]===0x46 && data[4]===0x2d)
  return 'application/pdf'
 if (data.length>=8 && [137,80,78,71,13,10,26,10].every((n,i)=>data[i]===n))
  return 'image/png'
 if (data.length>=4 && data[0]===0xff && data[1]===0xd8 && data[2]===0xff)
  return 'image/jpeg'
 return null
}
