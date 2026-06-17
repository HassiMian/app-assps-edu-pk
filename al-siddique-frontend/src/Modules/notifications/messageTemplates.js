// messageTemplates.js
// Al Siddique Smart School OS — Notification Message Templates
// Urdu + English bilingual templates

export const templates = {

 //  Attendance 

 attendance_absent: {
 english: (data) =>
 `Dear Parent,\n\nYour child *${data.studentName}* (Class ${data.class}, Roll No. ${data.rollNo}) was *ABSENT* today on ${data.date}.\n\nPlease ensure regular attendance.\n\n— ${data.schoolName}`,
 urdu: (data) =>
 `محترم والدین،\n\nآپ کے بچے *${data.studentName}* (کلاس ${data.class}، رول نمبر ${data.rollNo}) نے آج ${data.date} کو *غیر حاضری* کی۔\n\nبراہ کرم باقاعدہ حاضری یقینی بنائیں۔\n\n— ${data.schoolName}`,
 },

 attendance_late: {
 english: (data) =>
 `Dear Parent,\n\nYour child *${data.studentName}* (Class ${data.class}) arrived *LATE* today on ${data.date}.\n\nPlease ensure timely arrival.\n\n— ${data.schoolName}`,
 urdu: (data) =>
 `محترم والدین،\n\nآپ کے بچے *${data.studentName}* (کلاس ${data.class}) نے آج ${data.date} کو *دیر سے* حاضری دی۔\n\nبراہ کرم وقت پر بھیجیں۔\n\n— ${data.schoolName}`,
 },

 attendance_present: {
 english: (data) =>
 `Dear Parent,\n\nYour child *${data.studentName}* (Class ${data.class}) is *PRESENT* today on ${data.date}.\n\n— ${data.schoolName}`,
 urdu: (data) =>
 `محترم والدین،\n\nآپ کے بچے *${data.studentName}* (کلاس ${data.class}) نے آج ${data.date} کو *حاضری* دی۔\n\n— ${data.schoolName}`,
 },

 //  Fee 

 fee_reminder: {
 english: (data) =>
 `Dear Parent,\n\nThis is a reminder that *Fee of Rs. ${data.amount}* for *${data.studentName}* (Class ${data.class}) for *${data.month}* is still *UNPAID*.\n\nPlease pay at the earliest to avoid any inconvenience.\n\nDue Date: ${data.dueDate}\n\n— ${data.schoolName}`,
 urdu: (data) =>
 `محترم والدین،\n\n*${data.studentName}* (کلاس ${data.class}) کی *${data.month}* کی فیس *${data.amount} روپے* ابھی تک *ادا نہیں ہوئی*۔\n\nبراہ کرم جلد از جلد ادا کریں۔\n\nآخری تاریخ: ${data.dueDate}\n\n— ${data.schoolName}`,
 },

 fee_paid: {
 english: (data) =>
 `Dear Parent,\n\nWe have received *Fee of Rs. ${data.amount}* for *${data.studentName}* (Class ${data.class}) for *${data.month}*. Thank you!\n\nReceipt No: ${data.receiptNo}\n\n— ${data.schoolName}`,
 urdu: (data) =>
 `محترم والدین،\n\n*${data.studentName}* (کلاس ${data.class}) کی *${data.month}* کی فیس *${data.amount} روپے* موصول ہو گئی۔ شکریہ!\n\nرسید نمبر: ${data.receiptNo}\n\n— ${data.schoolName}`,
 },

 fee_overdue: {
 english: (data) =>
 ` URGENT — Dear Parent,\n\nFee of *Rs. ${data.amount}* for *${data.studentName}* (Class ${data.class}) is *OVERDUE* since ${data.dueDate}.\n\nPlease pay immediately to avoid suspension.\n\n— ${data.schoolName}`,
 urdu: (data) =>
 ` فوری — محترم والدین،\n\n*${data.studentName}* (کلاس ${data.class}) کی فیس *${data.amount} روپے* ${data.dueDate} سے *واجب الادا* ہے۔\n\nبراہ کرم فوری ادائیگی کریں۔\n\n— ${data.schoolName}`,
 },

 //  Exam Results 

 result_pass: {
 english: (data) =>
 ` Dear Parent,\n\nWe are pleased to inform you that *${data.studentName}* (Class ${data.class}) has *PASSED* the ${data.examName}.\n\nMarks Obtained: *${data.marksObtained}/${data.totalMarks}*\nGrade: *${data.grade}*\nPosition: ${data.position || 'N/A'}\n\nCongratulations! \n\n— ${data.schoolName}`,
 urdu: (data) =>
 ` محترم والدین،\n\nخوشی کے ساتھ اطلاع دی جاتی ہے کہ *${data.studentName}* (کلاس ${data.class}) نے ${data.examName} میں *کامیابی* حاصل کی۔\n\nحاصل نمبر: *${data.marksObtained}/${data.totalMarks}*\nگریڈ: *${data.grade}*\nپوزیشن: ${data.position || 'N/A'}\n\nمبارک ہو! \n\n— ${data.schoolName}`,
 },

 result_fail: {
 english: (data) =>
 `Dear Parent,\n\n*${data.studentName}* (Class ${data.class}) has *FAILED* the ${data.examName}.\n\nMarks Obtained: *${data.marksObtained}/${data.totalMarks}*\nGrade: *${data.grade}*\n\nPlease meet the class teacher for guidance.\n\n— ${data.schoolName}`,
 urdu: (data) =>
 `محترم والدین،\n\n*${data.studentName}* (کلاس ${data.class}) ${data.examName} میں *ناکام* ہوئے۔\n\nحاصل نمبر: *${data.marksObtained}/${data.totalMarks}*\nگریڈ: *${data.grade}*\n\nبراہ کرم استاد سے ملاقات کریں۔\n\n— ${data.schoolName}`,
 },

 result_card: {
 english: (data) =>
 ` Dear Parent,\n\nResult Card for *${data.studentName}* (Class ${data.class}) — ${data.examName}:\n\n${data.subjectResults}\n\nTotal: *${data.marksObtained}/${data.totalMarks}* | Grade: *${data.grade}*\n\n— ${data.schoolName}`,
 urdu: (data) =>
 ` محترم والدین،\n\n*${data.studentName}* (کلاس ${data.class}) کا نتیجہ — ${data.examName}:\n\n${data.subjectResults}\n\nکل نمبر: *${data.marksObtained}/${data.totalMarks}* | گریڈ: *${data.grade}*\n\n— ${data.schoolName}`,
 },

 //  General 

 custom: {
 english: (data) => data.customMessage,
 urdu: (data) => data.customMessage,
 },
}

// Get formatted message
export function getMessage(templateKey, language, data) {
 const tmpl = templates[templateKey]
 if (!tmpl) return ''
 const fn = tmpl[language] || tmpl.english
 return fn(data)
}

// Get both languages combined
export function getBilingualMessage(templateKey, data) {
 const eng = getMessage(templateKey, 'english', data)
 const urd = getMessage(templateKey, 'urdu', data)
 return `${eng}\n\n${''.repeat(30)}\n\n${urd}`
}