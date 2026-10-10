// Only whitelisted teacher-facing style choices may be injected into print CSS.
const COLOR_CHOICES = Object.freeze({
  Black: '#000000',
  Blue: '#0000ff',
  'Dark Blue': '#0b2a4a',
})

export const resolveWizardInkColor = choice => COLOR_CHOICES[choice] || COLOR_CHOICES.Black
export const resolveWizardBodyWeight = choice => choice === 'Bold' ? '700' : '400'
