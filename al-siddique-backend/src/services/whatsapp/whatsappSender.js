'use strict';

/**
 * AL SIDDIQUE SCHOLARS PUBLIC SCHOOL (ASSPS)
 * WhatsApp Direct Outbound Dispatcher (Meta Graph API)
 */

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
const VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';

function cleanPhoneNumber(to) {
  if (!to) return '';
  let cleanTo = String(to).replace(/\D/g, '');
  if (cleanTo.startsWith('03') && cleanTo.length === 11) {
    cleanTo = '92' + cleanTo.slice(1);
  }
  return cleanTo;
}

async function sendWhatsAppMessage(to, text) {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp Outbound] Missing Token or Phone ID');
    return { success: false, error: 'MISSING_WHATSAPP_CONFIG' };
  }

  const cleanTo = cleanPhoneNumber(to);
  const strText = String(text || '').trim();
  if (!cleanTo || !strText) return { success: false, error: 'INVALID_RECIPIENT_OR_BODY' };

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: {
          preview_url: false,
          body: strText.slice(0, 4096)
        }
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[WhatsApp Outbound Error] Status ${res.status}:`, data.error || data);
      return { success: false, error: data.error || data, status: res.status };
    }
    console.log("[WhatsApp Outbound Success] Text dispatched to +" + cleanTo);
    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err) {
    console.error('[WhatsApp Outbound Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

async function sendWhatsAppTemplate(to, templateName, bodyParams = [], headerParams = []) {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp Outbound Template] Missing Token or Phone ID');
    return { success: false, error: 'MISSING_WHATSAPP_CONFIG' };
  }

  const cleanTo = cleanPhoneNumber(to);
  if (!cleanTo || !templateName) return { success: false, error: 'INVALID_RECIPIENT_OR_TEMPLATE' };

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`;

  const components = [];
  if (Array.isArray(headerParams) && headerParams.length > 0) {
    components.push({
      type: 'header',
      parameters: headerParams.map(v => ({ type: 'text', text: String(v) }))
    });
  }
  if (Array.isArray(bodyParams) && bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map(v => ({ type: 'text', text: String(v) }))
    });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components: components.length > 0 ? components : undefined
        }
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[WhatsApp Outbound Template Error] Status ${res.status}:`, data.error || data);
      return { success: false, error: data.error || data, status: res.status };
    }
    console.log(`[WhatsApp Outbound Template Success] Template ${templateName} dispatched to +${cleanTo}`);
    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err) {
    console.error('[WhatsApp Outbound Template Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

async function sendWhatsAppImage(to, imageUrl, caption = '') {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp Outbound Image] Missing Token or Phone ID');
    return { success: false, error: 'MISSING_WHATSAPP_CONFIG' };
  }

  const cleanTo = cleanPhoneNumber(to);
  if (!cleanTo || !imageUrl) return { success: false, error: 'INVALID_RECIPIENT_OR_IMAGE' };

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'image',
        image: {
          link: imageUrl,
          caption: String(caption || '').slice(0, 1024)
        }
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[WhatsApp Outbound Image Error] Status ${res.status}:`, data.error || data);
      return { success: false, error: data.error || data };
    }
    console.log("[WhatsApp Outbound Image Success] Image dispatched to +" + cleanTo);
    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err) {
    console.error('[WhatsApp Outbound Image Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

async function sendWhatsAppDocument(to, documentUrl, filename = 'document.pdf', caption = '') {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp Outbound Document] Missing Token or Phone ID');
    return { success: false, error: 'MISSING_WHATSAPP_CONFIG' };
  }

  const cleanTo = cleanPhoneNumber(to);
  if (!cleanTo || !documentUrl) return { success: false, error: 'INVALID_RECIPIENT_OR_DOCUMENT' };

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'document',
        document: {
          link: documentUrl,
          filename: filename || 'document.pdf',
          caption: String(caption || '').slice(0, 1024)
        }
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[WhatsApp Outbound Document Error] Status ${res.status}:`, data.error || data);
      return { success: false, error: data.error || data };
    }
    console.log("[WhatsApp Outbound Document Success] Document dispatched to +" + cleanTo);
    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err) {
    console.error('[WhatsApp Outbound Document Network Error]', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  cleanPhoneNumber,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppImage,
  sendWhatsAppDocument
};
