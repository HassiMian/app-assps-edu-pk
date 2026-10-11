// Shared, presentation-only school order. Does not merge student cohorts:
// Pre Nine, Nine and Ten remain three distinct classes.
const ORDER = [
 'starter','mover','flyer','one','two','three','four','five','six',
 'seven','eight','pre nine','nine','ten'
]
const ORDINALS = ['one','two','three','four','five','six','seven','eight','nine','ten']
export const schoolClassOrderKey = value => {
 const raw = String(value ?? '').trim().toLowerCase().replace(/^class\s+/,'')
  .replace(/[_-]/g,' ').replace(/\s+/g,' ').trim()
 if (/^(?:[1-9]|10)$/.test(raw)) return ORDINALS[Number(raw)-1]
 if (raw === 'playgroup' || raw === 'play group') return 'starter'
 if (raw === 'nursery') return 'mover'
 if (raw === 'prep' || raw === 'kg') return 'flyer'
 return raw
}
export const compareSchoolClasses = (a,b) => {
 const akey=schoolClassOrderKey(a), bkey=schoolClassOrderKey(b)
 const ia=ORDER.indexOf(akey),ib=ORDER.indexOf(bkey)
 return (ia<0?999:ia)-(ib<0?999:ib) || akey.localeCompare(bkey) || String(a).localeCompare(String(b))
}
export const sortSchoolClasses = values => [...(values||[])].sort(compareSchoolClasses)
