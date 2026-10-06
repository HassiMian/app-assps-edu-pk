import { useEffect } from 'react'
import { useTenantBranding } from '../context/TenantBrandingContext'

const FALLBACK_ICON = '/favicon.svg'
const FALLBACK_SCHOOL_NAME = 'APEX'

export default function BrandHeadSync() {
  const branding = useTenantBranding()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const schoolName = branding?.schoolName || FALLBACK_SCHOOL_NAME
    document.title = `${schoolName} | APEX OS`

    let link = document.querySelector('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }

    link.type = branding?.logoUrl?.toLowerCase?.().endsWith('.svg') ? 'image/svg+xml' : 'image/png'
    link.href = branding?.logoUrl || FALLBACK_ICON
  }, [branding?.logoUrl, branding?.schoolName])

  return null
}
