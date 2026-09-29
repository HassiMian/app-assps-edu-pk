import React from 'react'
import { buildWorksheetSpec } from '../specs/EarlyYearsWorksheetSpec.js'
import EarlyYearsHeader from './EarlyYearsHeader.jsx'
import EarlyYearsQuestionBlock from './EarlyYearsQuestionBlock.jsx'
import UrduFontNotice from './UrduFontNotice.jsx'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import '../earlyYearsPrint.css'

function pagePattern(pattern='none', accent='#123b67', accent2='#38bdf8', tint='#ffffff') {
  if(pattern==='micro-grid') return `linear-gradient(${accent}0A 1px, transparent 1px), linear-gradient(90deg, ${accent}0A 1px, transparent 1px), linear-gradient(180deg,${tint},#fff 26%)`
  if(pattern==='notebook') return `repeating-linear-gradient(180deg, transparent 0 25px, ${accent}0B 25px 26px), linear-gradient(180deg,${tint},#fff 24%)`
  if(pattern==='waves') return `radial-gradient(ellipse at 12% -4%, ${accent2}16 0 42px, transparent 43px), radial-gradient(ellipse at 88% -7%, ${accent}10 0 52px, transparent 53px), linear-gradient(180deg,${tint},#fff 28%)`
  if(pattern==='sun-lines') return `radial-gradient(circle at 92% 5%, ${accent2}18 0 32px, transparent 33px), linear-gradient(180deg,${tint},#fff 28%)`
  if(pattern==='constellation') return `radial-gradient(circle at 12px 12px,${accent2}16 0 1.2px,transparent 1.4px), radial-gradient(circle at 42px 30px,${accent}0D 0 1px,transparent 1.2px), linear-gradient(180deg,${tint},#fff 28%)`
  if(pattern==='confetti') return `linear-gradient(135deg,transparent 0 48%,${accent2}10 49% 51%,transparent 52%), linear-gradient(180deg,${tint},#fff 28%)`
  return `linear-gradient(180deg,${tint} 0%,#fff 24%,#fff 100%)`
}

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
  const pageBackground = pagePattern(theme.pagePattern, accent, accent2, pageTint)
  const premiumFrame = theme.premiumEarlyYears
    ? `inset 0 0 0 1px #fff, inset 0 0 0 2px ${border}66, 0 14px 42px rgba(2,12,27,.22)`
    : '0 14px 42px rgba(2, 12, 27, .28)'
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
        width:'100%',
        flex:'0 0 auto',
        padding:'20px 18px 56px',
        background:'radial-gradient(circle at 50% 0%, #475569 0, #334155 44%, #263548 100%)',
        minHeight:'100%',
        boxSizing:'border-box',
        '--ey-accent':accent,
        '--ey-accent-2':accent2,
        '--ey-border':border,
        '--ey-soft':accentSoft,
        '--ey-page-background':pageBackground,
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
          background:pageBackground,
          backgroundSize: theme.pagePattern === 'micro-grid' ? '18px 18px,18px 18px,auto' : undefined,
          boxShadow:premiumFrame,
          boxSizing:'border-box',
          color:'#111827',
          fontFamily:paperFont,
          height:'auto',
          overflow:'visible',
          zoom:scale || 1,
          transform:'none',
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
