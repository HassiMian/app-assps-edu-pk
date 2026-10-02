// Quick Question Bank input: no fabricated answers or missing translations.
export const QUICK_TEXT_KINDS = new Set(['short','long','definition','fill','essay','letter','comprehension','translation','grammar','numerical','sentence_correction','alfaz_maani','muhawara'])

export function createQuickQuestionRecord({subjectId,type,medium,text,textUrdu='',marks,answer='',chapter='',topic=''}) {
  const id = String(subjectId||'').trim()
  const kind = String(type||'').trim()
  const language = ['english','urdu','dual'].includes(medium) ? medium : 'english'
  const prompt = String(text||'').trim()
  const points = Number(marks)
  if (!id) throw new Error('Select a subject before adding a question.')
  if (!QUICK_TEXT_KINDS.has(kind)) throw new Error('Use Advanced Add for MCQs or structured exercises.')
  if (!prompt) throw new Error('Enter question text first.')
  const translation = String(textUrdu||'').trim()
  if (language==='dual' && !translation) throw new Error('Enter a separate Urdu translation for Dual Medium.')
  if (!Number.isFinite(points) || points<=0 || points>1000) throw new Error('Marks must be greater than zero (maximum 1000).')
  return {
    subjectId:id,type:kind,medium:language,
    text:language==='urdu'?'':prompt,
    textUrdu:language==='urdu'?prompt:language==='dual'?translation:'',
    marks:points,answer:String(answer||'').trim(),
    chapter:String(chapter||'').trim(),topic:String(topic||'').trim(),priority:'all',
  }
}
