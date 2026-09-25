// EarlyYearsHeader.jsx — Official school header with child metadata fields
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'

export default function EarlyYearsHeader({
  headerConfig = {},
  isUrdu = false
}) {
  const {
    schoolName = 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
    campus = 'Sharif Chowk, Rayya Khas, Narowal',
    classDisplayName = 'Starter',
    subjectDisplayName = 'English',
    totalMarks = 50
  } = headerConfig

  return (
    <header
      className="early-years-worksheet-header"
      style={{
        border: '2px solid #000',
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '16px',
        background: '#fff',
        direction: isUrdu ? 'rtl' : 'ltr'
      }}
    >
      {/* School Name & Subtitle */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY_TOKENS.fontSizes.schoolName,
            fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            color: '#000',
            textTransform: 'uppercase'
          }}
        >
          {schoolName}
        </h1>
        <div
          style={{
            fontSize: TYPOGRAPHY_TOKENS.fontSizes.schoolSubtitle,
            fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishSupportingSans,
            color: '#333',
            marginTop: '2px'
          }}
        >
          {campus}
        </div>
      </div>

      {/* Primary Exam Metadata Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          borderTop: '1.5px solid #000',
          borderBottom: '1.5px solid #000',
          padding: '6px 4px',
          fontSize: TYPOGRAPHY_TOKENS.fontSizes.metadata,
          fontFamily: isUrdu
            ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
            : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
          fontWeight: 'bold'
        }}
      >
        <div>
          <span>{isUrdu ? 'جماعت:' : 'Class:'} </span>
          <span style={{ fontWeight: 'normal' }}>{classDisplayName}</span>
        </div>
        <div>
          <span>{isUrdu ? 'مضمون:' : 'Subject:'} </span>
          <span style={{ fontWeight: 'normal' }}>{subjectDisplayName}</span>
        </div>
        <div>
          <span>{isUrdu ? 'تاریخ:' : 'Date:'} </span>
          <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '60px' }}>&nbsp;</span>
        </div>
        <div style={{ textAlign: isUrdu ? 'left' : 'right' }}>
          <span>{isUrdu ? 'کل نمبر:' : 'Total Marks:'} </span>
          <span style={{ fontWeight: 'bold' }}>{totalMarks !== null ? totalMarks : '—'}</span>
        </div>
      </div>

      {/* Student Name & Roll Number Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '12px',
          padding: '6px 4px 0 4px',
          fontSize: TYPOGRAPHY_TOKENS.fontSizes.metadata,
          fontFamily: isUrdu
            ? TYPOGRAPHY_TOKENS.fontFamilies.urduPrimary
            : TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <span style={{ fontWeight: 'bold' }}>{isUrdu ? 'طالب علم کا نام:' : 'Student Name:'}</span>
          <div style={{ flex: 1, borderBottom: '1px solid #444' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <span style={{ fontWeight: 'bold' }}>{isUrdu ? 'رول نمبر:' : 'Roll No:'}</span>
          <div style={{ flex: 1, borderBottom: '1px solid #444' }} />
        </div>
      </div>
    </header>
  )
}
