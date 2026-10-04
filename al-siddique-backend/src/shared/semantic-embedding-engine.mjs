/**
 * JARVIS 4.1 — Semantic Embedding Vector Engine
 * 
 * Provides:
 * - Semantic vector representation via models/gemini-embedding-001
 * - Cosine similarity calculation & vector nearest-neighbor search
 * - Precomputed intent & capability semantic anchors
 * - In-memory LRU cache for query embeddings
 * - Deterministic semantic projection fallback for offline/isolated environments
 * 
 * Invariant: Vector similarity is used strictly as EVIDENCE, NOT as execution authority.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_INTENTS } from './semantic-intent-ontology.mjs';

export const EMBEDDING_CONFIG = {
  PROVIDER: 'Google Gemini API',
  MODEL: 'models/gemini-embedding-001',
  DIMENSION: 768, // Truncated/projected or standard output
  CACHE_MAX: 1000
};

export class SemanticEmbeddingEngine {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    this.model = options.model || EMBEDDING_CONFIG.MODEL;
    this.dimension = options.dimension || EMBEDDING_CONFIG.DIMENSION;
    this.cache = new Map();
    this.intentVectors = new Map();
    this.exemplarVectors = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      fallbackCalls: 0
    };
    this._initIntentAnchors();
  }

  /**
   * Initialize semantic description anchors for all canonical intents
   */
  _initIntentAnchors() {
    const descriptions = {
      RECORD_FEE_COLLECTION: 'Record tuition fee payment received in cash by hand at the school front desk, update fee challan voucher, clear student balance, and settle account ledger to zero.',
      RECORD_PARTIAL_PAYMENT: 'Record partial cash payment for student fee voucher, deduct paid amount from outstanding balance, and keep remaining balance active.',
      RECORD_FULL_PAYMENT: 'Mark student monthly fee voucher paid in full as cash has been received, clear ledger, and issue zero balance receipt.',
      READ_STUDENT_FEE: 'Query student fee status, check unpaid monthly challans, view outstanding balance, and inspect dues or voucher details.',
      READ_FEE_SUMMARY: 'Overall school fee collection summary report, total pending dues of all students, recovery percentage, and campus-wide financial health.',
      CREATE_ADMISSION: 'Register and confirm new student admission, enroll candidate in class, create student profile, and confirm dakhla.',
      READ_ADMISSION_STATUS: 'Check student admission status, view admission list, review candidate application and enrollment progress.',
      UPDATE_ADMISSION_DRAFT: 'Modify or update pending admission draft, correct candidate information, father name, or class.',
      READ_ATTENDANCE: 'Query student or class attendance, check today presence and absence statistics, view attendance percentage.',
      MARK_ATTENDANCE: 'Mark and submit attendance for a class, register students present or absent in the school ledger.',
      READ_CLASS_STRENGTH: 'View class headcount, check number of students enrolled in a specific class or section.',
      READ_STUDENT_COUNT: 'Total school student body headcount, overall enrolled students strength across all classes.',
      SEARCH_STUDENT: 'Search and look up student by name, father name, roll number, or GR number in the school roster.',
      READ_STAFF_SUMMARY: 'Inquire about teaching staff, faculty member headcount, and school employee directory.',
      MARKET_INTELLIGENCE: 'Query live financial markets, check gold price XAUUSD, forex currency pairs EURUSD, crypto, or trading setups.',
      BROWSER_RESEARCH: 'Perform web search, browse web pages, extract information from external online websites.',
      DESKTOP_ACTION: 'Execute desktop applications, print documents, interact with local software windows.',
      PUBLIC_INFO: 'Public school information, school opening and closing timings, campus address location, helpline phone number.',
      SYSTEM_HEALTH: 'System diagnostics, database connectivity status, server uptime, and operational health contract.',
      GENERAL_CONVERSATION: 'Social greetings, conversational chit-chat, polite thanks, and open-domain dialogues.'
    };

    for (const [intentId, desc] of Object.entries(descriptions)) {
      // Compute deterministic baseline projection vector
      const vec = this._computeDeterministicSemanticVector(desc);
      this.intentVectors.set(intentId, {
        intent: intentId,
        description: desc,
        vector: vec
      });
    }
  }

  /**
   * Generate embedding vector for a given text
   */
  async getEmbedding(text) {
    const cleanText = String(text || '').trim().toLowerCase();
    if (!cleanText) return new Float32Array(this.dimension);

    if (this.cache.has(cleanText)) {
      this.metrics.cacheHits++;
      return this.cache.get(cleanText);
    }
    this.metrics.cacheMisses++;

    // Try Gemini API if key is available
    if (this.apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/${this.model}:embedContent?key=${this.apiKey}`;
        const t0 = Date.now();
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: cleanText }] }
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.embedding?.values) {
            this.metrics.apiCalls++;
            let rawVals = data.embedding.values;
            // Normalize & project to configured dimension
            let vec = new Float32Array(rawVals.slice(0, this.dimension));
            vec = this._normalizeVector(vec);
            this._storeInCache(cleanText, vec);
            return vec;
          }
        }
      } catch (e) {
        // Fallback gracefully on network error
      }
    }

    // High-fidelity semantic deterministic projection fallback
    this.metrics.fallbackCalls++;
    const fallbackVec = this._computeDeterministicSemanticVector(cleanText);
    this._storeInCache(cleanText, fallbackVec);
    return fallbackVec;
  }

  _storeInCache(text, vec) {
    if (this.cache.size >= EMBEDDING_CONFIG.CACHE_MAX) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(text, vec);
  }

  /**
   * Compute cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  _normalizeVector(vec) {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    if (norm === 0) return vec;
    norm = Math.sqrt(norm);
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  }

  /**
   * Deterministic semantic projection vector:
   * Maps concepts, root tokens, multi-lingual semantic synonyms, and grammatical markers
   * into a dense semantic unit sphere vector.
   */
  _computeDeterministicSemanticVector(text) {
    const vec = new Float32Array(this.dimension);
    const tokens = text.toLowerCase().match(/[\w\u0600-\u06FF]+/g) || [];

    // Semantic cluster centroids in projection space
    const clusters = {
      FINANCIAL_WRITE: ['pay', 'payment', 'submit', 'paid', 'clear', 'settle', 'close', 'post', 'mark', 'wasool', 'jama', 'naqad', 'cash', 'ledger', 'adaigi', 'nipta', 'mukao', 'barabar', 'جمع', 'ادا', 'کلیئر', 'سیٹل', 'نقد', 'وصول', 'کھاتہ'],
      FINANCIAL_READ: ['fee', 'fees', 'charges', 'due', 'dues', 'arrears', 'pending', 'balance', 'outstanding', 'kitni', 'challan', 'voucher', 'hisaab', 'hisab', 'cleared', 'واجبات', 'بقایا', 'چالان'],
      FINANCIAL_SUMMARY: ['total', 'overall', 'summary', 'recovery', 'kul', 'percentage', 'report', 'مجموعی', 'رپورٹ'],
      ACADEMIC_ADMISSION: ['admission', 'admit', 'enroll', 'candidate', 'dakhla', 'onboard', 'pupil', 'fresh', 'applicant', 'داخلہ', 'داخل'],
      ACADEMIC_CLASS: ['class', 'grade', 'jamaat', 'strength', 'seven', 'eight', 'nine', 'five', 'کلاس', 'جماعت'],
      OPERATIONAL_ATTENDANCE: ['attendance', 'present', 'absent', 'hazri', 'hazir', 'ghair', 'حاضری', 'حاضر'],
      OPERATIONAL_STAFF: ['teacher', 'staff', 'faculty', 'principal', 'asatza', 'asatiza', 'اساتذہ', 'عملہ', 'ٹیچرز'],
      DESKTOP_SYSTEM: ['screen', 'snapshot', 'snaps', 'desktop', 'capture', 'file', 'audit', 'task'],
      GROWTH_MARKETING: ['funnel', 'growth', 'marketing', 'leads', 'acquisition', 'campaign', 'analytics', 'conversion', 'saas', 'brand'],
      DOCUMENT_GEN: ['document', 'certificate', 'form', 'leaving', 'character', 'generate', 'prepare'],
      SYSTEM_CONTROL: ['rest', 'off', 'standby', 'sleep', 'pause', 'stop', 'bye', 'arram', 'band', 'chutti', 'jarvis'],
      SYSTEM_HEALTH: ['diagnostic', 'diagnostics', 'database', 'uptime', 'health', 'server', 'connectivity', 'healthcheck'],
      OPEN_DOMAIN: ['gold', 'xauusd', 'eurusd', 'bitcoin', 'crypto', 'search', 'browse', 'print'],
      PUBLIC_INFO: ['timing', 'timings', 'hours', 'location', 'address', 'helpline', 'phone', 'اوقات', 'پتہ']
    };

    const hasAchievementOrSchoolContext = tokens.some(t => ['medal', 'badge', 'award', 'certificate', 'student', 'students', 'school', 'class', 'bachay', 'bachon'].includes(t));

    let clusterIdx = 0;
    for (const [name, words] of Object.entries(clusters)) {
      const offset = (clusterIdx * 40) % this.dimension;
      let matchedCount = 0;
      for (const t of tokens) {
        if (name === 'OPEN_DOMAIN' && (t === 'gold' || t === 'sona') && hasAchievementOrSchoolContext) {
          continue; // Context outranks keyword: student achievement context suppresses market gold
        }
        if (words.some(w => t === w || (t.length >= 4 && w.length >= 4 && (t.startsWith(w) || w.startsWith(t) || t.includes(w) || w.includes(t))))) {
          matchedCount++;
          // Distribute weight
          for (let k = 0; k < 25; k++) {
            vec[(offset + k) % this.dimension] += 3.5;
          }
        }
      }
      clusterIdx++;
    }

    // Token hash dispersion
    for (const t of tokens) {
      let hash = 0;
      for (let i = 0; i < t.length; i++) {
        hash = (hash << 5) - hash + t.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % this.dimension;
      vec[idx] += 0.5;
      vec[(idx + 13) % this.dimension] += 0.2;
    }

    return this._normalizeVector(vec);
  }

  /**
   * Find candidate intents by semantic vector similarity
   */
  async findCandidatesByEmbedding(queryText, topK = 3) {
    const queryVec = await this.getEmbedding(queryText);
    const scored = [];

    // Compare against canonical intent anchors
    for (const [intentId, anchor] of this.intentVectors.entries()) {
      const sim = this.cosineSimilarity(queryVec, anchor.vector);
      scored.push({
        intent: intentId,
        similarity: sim,
        source: 'INTENT_ANCHOR',
        description: anchor.description
      });
    }

    // Compare against registered verified exemplar vectors
    for (const [exemplarKey, ex] of this.exemplarVectors.entries()) {
      const sim = this.cosineSimilarity(queryVec, ex.vector);
      scored.push({
        intent: ex.intent,
        similarity: sim,
        source: 'VERIFIED_EXEMPLAR_VECTOR',
        utterance: ex.utterance
      });
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  /**
   * Register a verified exemplar vector for vector learning
   */
  async registerExemplarVector(utterance, intent, state = 'PROMOTED') {
    const vec = await this.getEmbedding(utterance);
    const key = `${utterance.toLowerCase().trim()}:::${intent}`;
    this.exemplarVectors.set(key, {
      utterance: utterance.toLowerCase().trim(),
      intent,
      state,
      vector: vec,
      registeredAt: Date.now()
    });
    return true;
  }
}

export const semanticEmbeddingEngine = new SemanticEmbeddingEngine();
