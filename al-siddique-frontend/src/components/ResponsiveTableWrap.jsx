export default function ResponsiveTableWrap({ children, className = '', style = {} }) {
  return (
    <div
      className={`responsive-table-wrap ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
