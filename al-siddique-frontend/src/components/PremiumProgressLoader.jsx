import { useEffect, useState } from 'react'

export default function PremiumProgressLoader({ label = 'Preparing workspace' }) {
  const [progress, setProgress] = useState(6)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const elapsed = Date.now() - startedAt
        const target = Math.min(100, 10 + Math.round(elapsed / 12))
        return Math.min(100, Math.max(current + 1, target))
      })
    }, 70)

    return () => window.clearInterval(timer)
  }, [])

  const safeProgress = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(2,12,24,0.58)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: 'min(360px, calc(100vw - 48px))',
          padding: 22,
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(11,44,77,0.96), rgba(7,30,52,0.94))',
          border: '1px solid rgba(200,153,26,0.24)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.36)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' }}>
              {label}
            </div>
            <div style={{ color: '#8892A4', fontSize: 11, marginTop: 4 }}>
              Aligning modules and secure data
            </div>
          </div>
          <div style={{ color: '#e8b420', fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 500 }}>
            {safeProgress}%
          </div>
        </div>

        <div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,0.16)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${safeProgress}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #C8991A, #e8b420)',
              boxShadow: '0 0 22px rgba(200,153,26,0.28)',
              transition: 'width 0.18s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  )
}
