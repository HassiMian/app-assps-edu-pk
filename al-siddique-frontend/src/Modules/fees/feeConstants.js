export const FEE_HEADS = [
  'Monthly Fee',
  'Admission Fee',
  'Registration Fee',
  'Library Fee',
  'Transport Fee',
  'Exam Fee',
  'Other Charges',
]

export const FEE_HEAD_KEYS = {
  'Monthly Fee': 'monthly_fee',
  'Admission Fee': 'admission_fee',
  'Registration Fee': 'registration_fee',
  'Library Fee': 'library_fee',
  'Transport Fee': 'transport_fee',
  'Exam Fee': 'exam_fee',
  'Other Charges': 'other_charges',
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function defaultFeeAmounts(monthly = 2500) {
  return {
    'Monthly Fee': monthly,
    'Admission Fee': 0,
    'Registration Fee': 0,
    'Library Fee': 0,
    'Transport Fee': 0,
    'Exam Fee': 0,
    'Other Charges': 0,
  }
}

export function feeProfileFromAmounts(amounts = {}) {
  return {
    monthly_fee: Number(amounts['Monthly Fee'] || 0),
    admission_fee: Number(amounts['Admission Fee'] || 0),
    registration_fee: Number(amounts['Registration Fee'] || 0),
    library_fee: Number(amounts['Library Fee'] || 0),
    transport_fee: Number(amounts['Transport Fee'] || 0),
    exam_fee: Number(amounts['Exam Fee'] || 0),
    other_charges: Number(amounts['Other Charges'] || 0),
  }
}

export function sumFeeAmounts(amounts = {}, selected = {}) {
  return FEE_HEADS.reduce((sum, head) => {
    if (selected[head] === false) return sum
    return sum + Number(amounts[head] || 0)
  }, 0)
}
