'use strict'
// Hermetic source contract; no school message, WhatsApp request or DB traffic.
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const src=fs.readFileSync(path.join(__dirname,'../routes/whatsappRoutes.js'),'utf8')

test('inbound logs do not include student or parent phone/message text',()=>{
  assert.match(src,/\[WhatsApp Webhook Inbound\] Accepted message event/)
  assert.doesNotMatch(src,/console\.(?:log|warn|error)\s*\([^\n]*\$\{(?:from|cleanTo|text|msgId)\}/)
  assert.doesNotMatch(src,/console\.log\s*\([^\n]*text\.slice\(/)
})
test('outbound audit logs do not expose recipient numbers or provider message ID',()=>{
  assert.match(src,/\[WhatsApp Outbound Success\] Dispatch accepted/)
  assert.match(src,/\[WhatsApp Outbound\] Duplicate reply suppressed/)
  assert.doesNotMatch(src,/console\.log\s*\([^\n]*(?:wamid|Sent to|from \+)/)
})
test('provider failures do not log raw data or error messages that could contain school data',()=>{
  assert.match(src,/Provider status \$\{Number\(res\.status\) \|\| 0\}/)
  assert.doesNotMatch(src,/console\.error\s*\([^\n]*(?:JSON\.stringify\(data|err\.message)/)
})
test('WhatsApp payload transport and idempotency semantics remain untouched',()=>{
  assert.match(src,/missionManager\.isDuplicateResponse\(cleanTo, text\)/)
  assert.match(src,/recordIdempotentEvent\(msgId, 'message', from, null, msg\)/)
  assert.match(src,/to: cleanTo/)
  assert.match(src,/body: String\(text \|\| ''\)\.slice\(0, 4096\)/)
  assert.match(src,/sendWhatsAppMessage\(from, replyText\)/)
})
