export default function ApexSurface({
  as: Component = 'div',
  elevation = 'base',
  className = '',
  children,
  ...props
}) {
  const classes = ['apex-surface', `apex-surface--${elevation}`, className].filter(Boolean).join(' ')
  return <Component className={classes} {...props}>{children}</Component>
}
