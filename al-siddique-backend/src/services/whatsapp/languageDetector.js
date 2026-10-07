/**
 * Language Detector for WhatsApp Conversational Intelligence
 *
 * Accurately classifies incoming user queries into 4 canonical modes:
 * - URDU_SCRIPT
 * - ROMAN_URDU
 * - ENGLISH
 * - MIXED_URDU_ENGLISH
 */

const URDU_SCRIPT_REGEX = /[\u0600-\u06FF]/;

const ROMAN_URDU_WORDS = new Set([
  'mery', 'mere', 'meri', 'mera', 'mein', 'main', 'kitny', 'kitne', 'kitna', 'kitni', 'ktny', 'ktne', 'ktn',
  'bachy', 'bache', 'bachay', 'btao', 'batao', 'btaya', 'kya', 'kia', 'hai', 'hain', 'har', 'sath',
  'dues', 'hazri', 'asatza', 'asatiza', 'karo', 'karein', 'kr', 'kro', 'do', 'dein', 'mujhy', 'mujhe', 'mujy',
  'tumhy', 'tumhe', 'tumny', 'tumne', 'tum', 'aap', 'ap', 'ni', 'nahi', 'nhi', 'abhi', 'tk', 'tak',
  'shikayat', 'ka', 'ki', 'ke', 'k', 'ko', 'par', 'pe', 'se', 'sy', 'aur', 'or', 'kuch', 'chahye', 'chahiye',
  'bohot', 'zyada', 'chal', 'raha', 'rha', 'rahi', 'rhi', 'rahe', 'rhe', 'hukum', 'sunao',
  'kese', 'kaise', 'kaisa', 'theek', 'thk', 'gya', 'gaya', 'gyi', 'gayi', 'gye', 'gaye', 'kyu', 'kyun',
  'udr', 'idr', 'yha', 'yahan', 'wahan', 'wha', 'dekho', 'dekhein', 'dekh', 'waley', 'wali', 'wala', 'wale',
  'dakhla', 'dakhlay', 'parhao', 'karega', 'karegi', 'bhejo', 'bhejein', 'baqaya', 'kul', 'tadaad', 'filhal',
  'manga', 'smj', 'samajh', 'samjh', 'kab', 'hoga', 'hogi', 'honge', 'kis', 'kitnaa'
]);

const ENGLISH_VERBS_AND_GRAMMAR = new Set([
  'how', 'many', 'what', 'where', 'when', 'who', 'why', 'is', 'are', 'am', 'was', 'were',
  'give', 'tell', 'show', 'send', 'provide', 'fetch', 'display', 'generate', 'calculate',
  'please', 'me', 'my', 'the', 'a', 'an', 'in', 'of', 'for', 'with', 'about', 'currently',
  'total', 'active', 'enrolled', 'all', 'any', 'count', 'quick', 'make', 'it', 'report'
]);

function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'ROMAN_URDU';
  const clean = text.trim();
  if (!clean) return 'ROMAN_URDU';

  // 1. Urdu Script Detection
  const urduCharCount = (clean.match(/[\u0600-\u06FF]/g) || []).length;
  if (urduCharCount >= 2 || URDU_SCRIPT_REGEX.test(clean)) {
    return 'URDU_SCRIPT';
  }

  // Tokenize words
  const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ENGLISH';

  let romanUrduHits = 0;
  let englishGrammarHits = 0;

  for (const w of words) {
    if (ROMAN_URDU_WORDS.has(w)) romanUrduHits++;
    if (ENGLISH_VERBS_AND_GRAMMAR.has(w)) englishGrammarHits++;
  }

  // Pure English: No Roman Urdu marker words and has English grammar/structure
  if (romanUrduHits === 0) {
    return 'ENGLISH';
  }

  // Mixed Urdu-English: Contains significant English phrases/grammar along with Roman Urdu
  // Examples:
  // "Class Eight ki current strength tell me" (romanUrdu: 'ki', english: 'tell', 'me', 'strength')
  // "Please send karo total enrollment report" (english: 'please', 'send', 'report', romanUrdu: 'karo')
  // "Give me the attendance summary aaj ki"
  const hasEnglishVerbOrQuestion = words.some(w => ['tell', 'give', 'show', 'send', 'please', 'how', 'what', 'why', 'where', 'is', 'are', 'make', 'quick'].includes(w));

  if (romanUrduHits >= 1 && hasEnglishVerbOrQuestion && englishGrammarHits >= 2) {
    return 'MIXED_URDU_ENGLISH';
  }

  // If text is predominantly Roman Urdu with loan nouns (school, students, class, etc.)
  return 'ROMAN_URDU';
}

module.exports = {
  detectLanguage,
  ROMAN_URDU_WORDS,
  ENGLISH_VERBS_AND_GRAMMAR
};
