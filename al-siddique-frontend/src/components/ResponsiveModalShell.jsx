export default function ResponsiveModalShell({ children, className = '', style = {}, onClose }) {
  return (
    <div
      className="app-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(2,12,24,0.72)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className={`responsive-modal-shell ${className}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(720px, calc(100vw - 24px))',
          maxHeight: '90vh',
          overflowY: 'auto',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  )
}
