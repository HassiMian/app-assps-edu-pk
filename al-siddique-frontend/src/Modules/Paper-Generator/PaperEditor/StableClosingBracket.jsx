
export default function StableClosingBracket({ color = 'currentColor', style = {} }) {
  return (
    <span
      data-option-bracket
      dir="rtl"
      aria-hidden="true"
      style={{
        direction: 'rtl',
        unicodeBidi: 'isolate',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 400,
        fontSize: '0.70em',
        lineHeight: 1,
        letterSpacing: 0,
        display: 'inline-block',
        width: '0.42em',
        minWidth: '0.42em',
        textAlign: 'center',
        verticalAlign: '-0.02em',
        color,
        flex: '0 0 auto',
        transform: 'translateY(-0.03em) scaleY(0.92)',
        transformOrigin: 'center center',
        ...style,
      }}
    >
      )
    </span>
  )
}
