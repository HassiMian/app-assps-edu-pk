import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'

export default function EarlyYearsHeader({
  headerConfig = {},
  isUrdu = false,
  templatePreset = {}
}) {
  const {
    schoolName = 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
    campus = 'Sharif Chowk, Rayya Khas, Narowal',
    classDisplayName = 'Starter',
    subjectDisplayName = 'English',
    totalMarks = 50,
    examDate = '',
    timeAllowed = ''
  } = headerConfig

  const accent = templatePreset.accent || '#123b67'
  const accent2 = templatePreset.accent2 || templatePreset.border || '#38bdf8'
  const border = templatePreset.border || accent
  const accentSoft = templatePreset.accentSoft || '#eef8ff'
  const englishFont = templatePreset.fontFamily || TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary
  const urduFont = templatePreset.urduFont || TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
  const paperFont = isUrdu ? urduFont : englishFont

  const metaCell = {
    border: `1px solid ${border}`,
    borderRadius: 6,
    padding: '4px 7px',
    background: '#fff',
    minHeight: 30,
    boxSizing: 'border-box'
  }

  return (
    <header
      className="early-years-worksheet-header"
      data-early-years-premium-header={templatePreset.premiumEarlyYears ? 'true' : 'false'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `1.5px solid ${border}`,
        borderRadius: 11,
        padding: '7px 9px 8px',
        marginBottom: 9,
        background: `linear-gradient(180deg, ${accentSoft} 0%, #ffffff 44%, #ffffff 100%)`,
        direction: isUrdu ? 'rtl' : 'ltr',
        boxShadow: `0 1px 0 ${accentSoft} inset`
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent}, ${accent2}, ${accent})`
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 54,
          height: 54,
          borderRadius: '50%',
          right: isUrdu ? 'auto' : -24,
          left: isUrdu ? -24 : 'auto',
          top: -24,
          border: `1px solid ${accent2}`,
          opacity: .18
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '58px minmax(0,1fr) auto', gap: 9, alignItems: 'center', direction: 'ltr' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: '#fff',
            border: `1px solid ${border}`,
            boxShadow: `inset 0 0 0 3px ${accentSoft}`
          }}
        >
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 1000, color: accent, letterSpacing: -.5 }}>ASSPS</div>
            <div style={{ fontSize: 6.5, fontWeight: 900, color: accent2, marginTop: 3, letterSpacing: .4 }}>LEARN • GROW</div>
          </div>
        </div>

        <div style={{ minWidth: 0, textAlign: 'center', direction: isUrdu ? 'rtl' : 'ltr' }}>
          <div
            style={{
              fontFamily: englishFont,
              fontSize: TYPOGRAPHY_TOKENS.fontSizes.schoolName,
              fontWeight: 1000,
              color: accent,
              letterSpacing: .2,
              lineHeight: 1.02,
              textTransform: 'uppercase'
            }}
          >
            {schoolName}
          </div>
          <div style={{ marginTop: 2, fontSize: 8.5, fontWeight: 700, color: '#526174', fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishSupportingSans }}>
            {campus}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 4, direction: 'ltr' }}>
            <span style={{ padding: '2px 7px', borderRadius: 999, background: accent, color: '#fff', fontSize: 7.5, fontWeight: 900, letterSpacing: .45 }}>
              FIRST TERM 2026
            </span>
            <span style={{ padding: '2px 7px', borderRadius: 999, border: `1px solid ${border}`, background: '#fff', color: accent, fontSize: 7.5, fontWeight: 900 }}>
              EARLY YEARS
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 4, justifyItems: 'end', direction: 'ltr' }}>
          <span style={{ minWidth: 72, textAlign: 'center', padding: '4px 8px', borderRadius: 999, background: accentSoft, border: `1px solid ${border}`, color: accent, fontSize: 9, fontWeight: 1000 }}>
            {classDisplayName}
          </span>
          <span style={{ minWidth: 72, textAlign: 'center', padding: '3px 8px', borderRadius: 999, background: '#fff', border: `1px solid ${border}`, color: '#334155', fontSize: 8.5, fontWeight: 900 }}>
            {subjectDisplayName}
          </span>
        </div>
      </div>

      <div
        data-early-years-meta-grid
        style={{
          marginTop: 7,
          display: 'grid',
          gridTemplateColumns: '1.25fr .85fr .9fr .72fr',
          gap: 5,
          fontFamily: paperFont,
          fontSize: TYPOGRAPHY_TOKENS.fontSizes.metadata,
          direction: isUrdu ? 'rtl' : 'ltr'
        }}
      >
        <div style={metaCell}>
          <b style={{ color: accent }}>{isUrdu ? 'طالب علم:' : 'Student:'}</b>
          <span style={{ display: 'inline-block', minWidth: 74, marginInlineStart: 5, borderBottom: '1px solid #64748b' }}>&nbsp;</span>
        </div>
        <div style={metaCell}>
          <b style={{ color: accent }}>{isUrdu ? 'رول نمبر:' : 'Roll No:'}</b>
          <span style={{ display: 'inline-block', minWidth: 35, marginInlineStart: 5, borderBottom: '1px solid #64748b' }}>&nbsp;</span>
        </div>
        <div style={metaCell}>
          <b style={{ color: accent }}>{isUrdu ? 'تاریخ:' : 'Date:'}</b>{' '}
          <span style={{ fontWeight: 700 }}>{examDate || '________'}</span>
          {timeAllowed && <div style={{ marginTop: 1, fontSize: 8, color: '#64748b' }}>{isUrdu ? 'وقت:' : 'Time:'} {timeAllowed}</div>}
        </div>
        <div style={{ ...metaCell, textAlign: 'center', background: accentSoft }}>
          <b style={{ color: accent }}>{isUrdu ? 'کل نمبر' : 'Marks'}</b>
          <div style={{ fontFamily: englishFont, fontSize: 13, fontWeight: 1000, color: accent, lineHeight: 1.05 }}>{totalMarks ?? '—'}</div>
        </div>
      </div>
    </header>
  )
}
