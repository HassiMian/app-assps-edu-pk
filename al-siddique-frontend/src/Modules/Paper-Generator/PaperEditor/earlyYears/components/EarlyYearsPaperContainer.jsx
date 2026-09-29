import React from 'react'
import { buildWorksheetSpec } from '../specs/EarlyYearsWorksheetSpec.js'
import EarlyYearsHeader from './EarlyYearsHeader.jsx'
import EarlyYearsQuestionBlock from './EarlyYearsQuestionBlock.jsx'
import UrduFontNotice from './UrduFontNotice.jsx'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import '../earlyYearsPrint.css'

function PremiumPageMotif({ motif = 'classic', accent = '#123b67', accent2 = '#38bdf8' }) {
  if (motif === 'classic') return null
  const symbol = motif === 'clouds' ? '●' : motif === 'sun' ? '✦' : motif === 'confetti' ? '◆' : motif === 'dots' ? '•' : '★'
  return (
    <div className="early-years-page-motif" aria-hidden="true" style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
      <span style={{ position:'absolute', top:18, left:18, color:accent2, opacity:.16, fontSize:17 }}>{symbol}</span>
      <span style={{ position:'absolute', top:26, left:38, color:accent, opacity:.10, fontSize:9 }}>{symbol}</span>
      <span style={{ position:'absolute', top:18, right:20, color:accent, opacity:.10, fontSize:13 }}>{symbol}</span>
      <span style={{ position:'absolute', bottom:24, right:20, color:accent2, opacity:.10, fontSize:17 }}>{symbol}</span>
      <span style={{ position:'absolute', bottom:34, right:44, color:accent, opacity:.08, fontSize:8 }}>{symbol}</span>
    </div>
  )
}

export default function EarlyYearsPaperContainer({
  paper = null,
  spec = null,
  scale = 1,
  presentationRevision = 0,
  templatePreset = null
}) {
  const activeSpec = spec || (paper ? buildWorksheetSpec(paper) : null)

  if (!activeSpec) {
    return <div style={{ padding:24, textAlign:'center', color:'#666' }}>No Early Years paper specification loaded.</div>
  }

  const isUrdu = activeSpec.language === 'urdu' || activeSpec.subject === 'urdu'
  const theme = templatePreset || {}
  const accent = theme.accent || '#123b67'
  const accent2 = theme.accent2 || theme.border || '#38bdf8'
  const border = theme.border || '#9eb6cf'
  const accentSoft = theme.accentSoft || '#eef8ff'
  const pageTint = theme.pageTint || '#ffffff'
  const paperFont = isUrdu
    ? (theme.urduFont || "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif")
    : (theme.fontFamily || "'Times New Roman', serif")

  return (
    <div
      className="early-years-paper-viewport"
      data-early-years-template={theme.id || 'classic'}
      style={{
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        padding:'20px 0',
        background:'radial-gradient(circle at 50% 0%, #475569 0, #334155 44%, #263548 100%)',
        minHeight:'100vh',
        boxSizing:'border-box',
        '--ey-accent':accent,
        '--ey-accent-2':accent2,
        '--ey-border':border,
        '--ey-soft':accentSoft,
        '--ey-page-background':`linear-gradient(180deg, ${pageTint} 0%, #ffffff 24%, #ffffff 100%)`,
      }}
    >
      {isUrdu && (
        <div className="no-print" style={{ width:'210mm', maxWidth:'100%', boxSizing:'border-box' }}>
          <UrduFontNotice />
        </div>
      )}

      <div
        className="early-years-sheet-a4"
        data-template-id={theme.id || 'classic'}
        data-premium-early-years={theme.premiumEarlyYears ? 'true' : 'false'}
        style={{
          width:`${LAYOUT_TOKENS.page.widthMm}mm`,
          minHeight:`${LAYOUT_TOKENS.page.heightMm}mm`,
          padding:`${LAYOUT_TOKENS.page.marginTopMm}mm ${LAYOUT_TOKENS.page.marginRightMm}mm ${LAYOUT_TOKENS.page.marginBottomMm}mm ${LAYOUT_TOKENS.page.marginLeftMm}mm`,
          background:`linear-gradient(180deg, ${pageTint} 0%, #ffffff 24%, #ffffff 100%)`,
          boxShadow:'0 14px 42px rgba(2, 12, 27, .28)',
          boxSizing:'border-box',
          color:'#111827',
          fontFamily:paperFont,
          height:'auto',
          overflow:'visible',
          transform:scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin:'top center',
          position:'relative',
          direction:isUrdu ? 'rtl' : 'ltr',
          border:`1px solid ${border}`,
          borderRadius:2,
        }}
      >
        <PremiumPageMotif motif={theme.motif} accent={accent} accent2={accent2} />

        <div style={{ position:'relative', zIndex:1 }}>
          <EarlyYearsHeader
            headerConfig={activeSpec.headerConfig}
            isUrdu={isUrdu}
            templatePreset={theme}
          />

          <div className="early-years-questions-container">
            {activeSpec.questionPresentations.map((question) => (
              <EarlyYearsQuestionBlock
                key={`${question.questionId}-${presentationRevision}`}
                question={question}
                isUrdu={isUrdu}
                paperId={paper?.id || activeSpec.paperId}
                presentationRevision={presentationRevision}
                templatePreset={theme}
              />
            ))}
          </div>

          <footer
            className="early-years-footer"
            style={{
              marginTop:10,
              paddingTop:5,
              borderTop:`1px solid ${border}`,
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              gap:10,
              fontSize:'8.5pt',
              color:'#64748b',
              fontFamily:"'Segoe UI', Arial, sans-serif"
            }}
          >
            <span style={{ fontWeight:800, color:accent }}>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</span>
            <span style={{ flex:1, textAlign:'center', fontSize:'7.5pt' }}>Empowering Minds • Shaping Futures</span>
            <span style={{ fontWeight:700 }}>
              {activeSpec.headerConfig.classDisplayName} · {activeSpec.headerConfig.subjectDisplayName}
            </span>
          </footer>
        </div>
      </div>
    </div>
  )
}
