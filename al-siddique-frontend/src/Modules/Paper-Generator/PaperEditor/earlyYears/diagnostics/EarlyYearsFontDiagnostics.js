// EarlyYearsFontDiagnostics.js — Checks runtime font availability and reports fallback status
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'

/**
 * Checks if Jameel Noori Nastaleeq is available in the browser runtime
 */
export function checkUrduFontAvailability() {
  if (typeof document === 'undefined' || !document.fonts) {
    return {
      jameelLoaded: false,
      activeFamily: 'Noto Nastaliq Urdu',
      reason: 'Server/Node environment - document.fonts not available'
    }
  }

  try {
    // Check if 'Jameel Noori Nastaleeq' is available in the browser font set
    const isJameelAvailable = document.fonts.check("16px 'Jameel Noori Nastaleeq'")

    if (isJameelAvailable) {
      return {
        jameelLoaded: true,
        activeFamily: 'Jameel Noori Nastaleeq',
        cssFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
        status: 'JAMEEL_ACTIVE'
      }
    }

    return {
      jameelLoaded: false,
      activeFamily: 'Noto Nastaliq Urdu',
      cssFamily: TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary,
      fallbackActive: true,
      status: 'FALLBACK_NOTO',
      warning: "Jameel Noori Nastaleeq is not installed locally; using verified fallback 'Noto Nastaliq Urdu'. Unlicensed font files are not automatically downloaded."
    }
  } catch (err) {
    return {
      jameelLoaded: false,
      activeFamily: 'Noto Nastaliq Urdu',
      status: 'FALLBACK_NOTO',
      warning: `Font check error: ${err.message}`
    }
  }
}
