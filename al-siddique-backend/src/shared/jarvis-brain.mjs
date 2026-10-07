/**
 * JARVIS Brain — Conversational AI Engine with DeepSeek Integration
 * Features:
 * - Conversation memory (last 20 messages per session)
 * - DeepSeek API as primary reasoning engine
 * - Buddy personality — casual, funny, context-aware
 * - Auto language detection (Roman Urdu / English)
 * - Task completion with honest failure reporting
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// In-memory conversation store (session-based)
const sessions = new Map();
const MAX_HISTORY = 20;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function getSession(sessionId) {
  if (!sessionId) sessionId = 'default';
  let session = sessions.get(sessionId);
  if (!session || Date.now() - session.lastActive > SESSION_TTL_MS) {
    session = { id: sessionId, messages: [], lastActive: Date.now(), metadata: {} };
    sessions.set(sessionId, session);
  }
  session.lastActive = Date.now();
  return session;
}

function addToHistory(session, role, content) {
  session.messages.push({ role, content, timestamp: Date.now() });
  if (session.messages.length > MAX_HISTORY * 2) {
    session.messages = session.messages.slice(-MAX_HISTORY * 2);
  }
}

function detectLanguage(text) {
  const s = String(text || '').toLowerCase();
  const urduMarkers = /\b(kya|hai|hain|mein|main|kaise|kesy|karo|aur|se|ka|ke|ko|nahi|kyun|chahiye|hoga|batao|dekho|karo|krna|krny|mujhy|apny|uska|uski|iska|iski|kaisa|kesi|achi|acha|bht|boht|sahi|theek|thik)\b/gi;
  const matches = s.match(urduMarkers) || [];
  return matches.length >= 2 ? 'roman-urdu' : 'english';
}

function buildSystemPrompt(context = {}) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 5 ? 'Raat ka waqt hai' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = context.userName || 'Haseeb';

  return `You are JARVIS — the AI assistant for Al Siddique Scholars Public School, Narowal, Pakistan.

PERSONALITY & COMMUNICATION STYLE:
- You are ${userName}'s buddy, not a formal assistant. Talk like close friends do.
- Mix Roman Urdu and English naturally — however the user talks, match their style.
- Be witty, crack relevant jokes sometimes, ask about their day if conversation allows.
- Use casual language: "Yaar", "Bhai", "Dekho", "Sun", "Chalo" etc.
- BUT when giving data or completing tasks, be precise and accurate. No fake numbers ever.
- If you don't know something, say "Yaar honestly ye mujhe nahi pata, check karta hun" — never make up data.
- Keep responses concise — 2-4 sentences for simple queries, more only when needed.

SCHOOL CONTEXT:
- School: Al Siddique Scholars Public School
- Location: Sharif Chowk, Rayya Khas, Narowal, Punjab, Pakistan
- Owner/Principal: Muhammad Haseeb (the user)
- Website: assps.edu.pk
- Phone: +92 306 9545996

CURRENT TIME: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}

RULES:
1. NEVER invent statistics, student counts, fee amounts, or any school data. If asked, say you'll check the database.
2. NEVER repeat a previous answer for a new question. Each response must be unique and contextual.
3. If a task fails, explain WHY it failed honestly. Don't pretend it succeeded.
4. When the user gives a command/task, acknowledge it naturally and execute it.
5. Respond in the same language the user is using (Roman Urdu or English).`;
}

/**
 * Send a message to DeepSeek and get a response
 */
export async function chat(userMessage, options = {}) {
  const { sessionId, userName, context } = options;
  const session = getSession(sessionId);
  const language = detectLanguage(userMessage);

  // Build messages array with conversation history
  const systemPrompt = buildSystemPrompt({ userName, ...context });
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history for context
  const recentHistory = session.messages.slice(-MAX_HISTORY);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: false
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`DeepSeek API error: HTTP ${response.status} — ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    if (!assistantMessage) {
      throw new Error('DeepSeek returned empty response');
    }

    // Save to conversation history
    addToHistory(session, 'user', userMessage);
    addToHistory(session, 'assistant', assistantMessage);

    return {
      text: assistantMessage,
      language,
      model: data.model || DEEPSEEK_MODEL,
      tokensUsed: data.usage?.total_tokens || 0,
      sessionId: session.id,
      turnCount: session.messages.length / 2
    };
  } catch (error) {
    // Honest failure — don't fake a response
    const fallbackMessage = language === 'roman-urdu'
      ? `Yaar sorry, abhi AI engine se connect nahi ho pa raha. Error: ${error.message}. Thori der mein dobara try karo.`
      : `Sorry, I couldn't connect to the AI engine right now. Error: ${error.message}. Please try again in a moment.`;

    return {
      text: fallbackMessage,
      language,
      model: 'fallback',
      error: error.message,
      sessionId: session?.id || 'default',
      turnCount: 0
    };
  }
}

/**
 * Clear a session's history
 */
export function clearSession(sessionId) {
  sessions.delete(sessionId || 'default');
}

/**
 * Get session info for debugging
 */
export function getSessionInfo(sessionId) {
  const session = sessions.get(sessionId || 'default');
  if (!session) return { exists: false };
  return {
    exists: true,
    messageCount: session.messages.length,
    lastActive: new Date(session.lastActive).toISOString(),
    turnCount: Math.floor(session.messages.length / 2)
  };
}

export { detectLanguage };
