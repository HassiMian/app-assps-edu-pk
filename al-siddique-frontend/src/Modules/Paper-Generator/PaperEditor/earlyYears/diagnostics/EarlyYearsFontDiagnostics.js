// EarlyYearsFontDiagnostics.js — Conservative browser Jameel font readiness check
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'

/*
 * FontFaceSet.check() alone is not proof that a system font exists: browsers
 * can return true when a CSS family is unknown and no webfont load is needed.
 * Report JAMEEL_ACTIVE only if an actual declared Jameel face is LOADED and
 * the font set check agrees. This does not replace PDF or physical signoff.
 */
export function checkUrduFontAvailability() {
  const fallback = {
    jameelLoaded: false,
    activeFamily: 'Noto Nastaliq Urdu',
    cssFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
    fallbackActive: true,
    fallbackVerified: false,
    status: 'JAMEEL_UNVERIFIED',
    warning: 'Jameel Noori Nastaleeq has not been confirmed as a loaded browser font. Urdu may use a fallback; verify the PDF embedded font and physical print before official use.'
  }

  if (typeof document === 'undefined' || !document.fonts) {
    return { ...fallback, reason: 'Server/Node environment - document.fonts not available' }
  }

  try {
    const fontSet = document.fonts
    if (typeof fontSet.check !== 'function' || typeof fontSet[Symbol.iterator] !== 'function') {
      return { ...fallback, reason: 'Browser FontFaceSet lacks verifiable face inventory' }
    }

    const declaredLoaded = Array.from(fontSet).some((face) => {
      const name = String(face?.family ?? '').replace(/^['"]|['"]$/g, '').trim().toLowerCase()
      return (name === 'jameel noori nastaleeq' || name === 'assps jameel noori') &&
        face.status === 'loaded'
    })
    const fontCheck = fontSet.check("16px 'Jameel Noori Nastaleeq'", 'اردو')
    if (declaredLoaded && fontCheck) {
      return {
        jameelLoaded: true,
        activeFamily: 'Jameel Noori Nastaleeq',
        cssFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
        status: 'JAMEEL_FACE_LOADED',
        physicalPrintVerified: false
      }
    }

    return { ...fallback, reason: declaredLoaded ? 'FontFaceSet.check did not confirm Jameel' : 'No loaded Jameel FontFace declaration found' }
  } catch (error) {
    return { ...fallback, reason: 'FontFaceSet check failed', warning: `Font check failed (${error instanceof Error ? error.message : 'unknown error'}); verify the Urdu font and print output before use.` }
  }
}
