export default function ApexButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconOnly = false,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = [
    'apex-button',
    `apex-button--${variant}`,
    `apex-button--${size}`,
    iconOnly ? 'apex-button--icon-only' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {icon && <span className="apex-button__icon" aria-hidden="true">{icon}</span>}
      {!iconOnly && <span className="apex-button__label">{children}</span>}
    </button>
  )
}
