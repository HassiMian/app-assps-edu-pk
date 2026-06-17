// notificationService.js
// Al Siddique Smart School OS — Twilio WhatsApp + SMS Service
// Backend: Node.js + Express

const twilio = require('twilio')

//  Config 
// In production: use environment variables (.env file)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM // e.g. '+12345678900'
const TWILIO_WA_FROM = process.env.TWILIO_WA_FROM // e.g. 'whatsapp:+14155238886'

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

//  Send SMS 

async function sendSMS(to, message) {
 // Pakistan number format: 03001234567 → +923001234567
 const formatted = formatPakistanNumber(to)
 try {
 const result = await client.messages.create({
 body: message,
 from: TWILIO_SMS_FROM,
 to: formatted,
 })
 return { success: true, sid: result.sid, to: formatted, channel: 'sms' }
 } catch (err) {
 console.error(`SMS failed to ${formatted}:`, err.message)
 return { success: false, error: err.message, to: formatted, channel: 'sms' }
 }
}

//  Send WhatsApp 

async function sendWhatsApp(to, message) {
 const formatted = formatPakistanNumber(to)
 try {
 const result = await client.messages.create({
 body: message,
 from: TWILIO_WA_FROM,
 to: `whatsapp:${formatted}`,
 })
 return { success: true, sid: result.sid, to: formatted, channel: 'whatsapp' }
 } catch (err) {
 console.error(`WhatsApp failed to ${formatted}:`, err.message)
 return { success: false, error: err.message, to: formatted, channel: 'whatsapp' }
 }
}

//  Send Both 

async function sendBoth(to, message) {
 const [smsResult, waResult] = await Promise.allSettled([
 sendSMS(to, message),
 sendWhatsApp(to, message),
 ])
 return {
 sms: smsResult.status === 'fulfilled' ? smsResult.value : { success: false, error: smsResult.reason },
 whatsapp: waResult.status === 'fulfilled' ? waResult.value : { success: false, error: waResult.reason },
 }
}

//  Bulk Send 
// Send to multiple recipients with delay to avoid rate limits

async function sendBulk(recipients, getMessage, channel = 'both', delayMs = 300) {
 const results = []

 for (const recipient of recipients) {
 const message = typeof getMessage === 'function' ? getMessage(recipient) : getMessage

 let result
 if (channel === 'sms') result = { recipient, ...(await sendSMS(recipient.phone, message)) }
 else if (channel === 'whatsapp') result = { recipient, ...(await sendWhatsApp(recipient.phone, message)) }
 else result = { recipient, ...(await sendBoth(recipient.phone, message)) }

 results.push(result)

 // Delay between messages
 if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
 }

 return results
}

//  Helper 

function formatPakistanNumber(number) {
 // Remove all spaces, dashes
 let n = String(number).replace(/[\s\-]/g, '')

 if (n.startsWith('+92')) return n
 if (n.startsWith('92')) return '+' + n
 if (n.startsWith('0')) return '+92' + n.slice(1)
 return '+92' + n
}

module.exports = { sendSMS, sendWhatsApp, sendBoth, sendBulk, formatPakistanNumber }