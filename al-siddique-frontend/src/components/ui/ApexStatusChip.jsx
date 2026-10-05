export default function ApexStatusChip({ children, tone = 'neutral', className = '' }) {
  const classes = ['apex-status-chip', `apex-status-chip--${tone}`, className].filter(Boolean).join(' ')
  return <span className={classes}>{children}</span>
}
