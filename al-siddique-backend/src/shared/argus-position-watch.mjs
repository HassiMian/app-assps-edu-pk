/**
 * JARVIS ARGUS 7.2 — Position Watch Engine
 *
 * Tracks user-declared open positions and enables thesis review.
 * Persisted to runtime/argus_position_watches.json for PM2 durability.
 *
 * INVARIANTS:
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 * - Position tracking is decision support only
 * - ORIGINAL_PREDICTION_REWRITE_COUNT = 0
 * - POSITION_SURVIVES_PM2_RESTART = YES
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { argusForwardLedger } from './argus-forward-ledger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT_DIR, 'runtime');

if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

const WATCHES_FILE = path.join(RUNTIME_DIR, 'argus_position_watches.json');

export const THESIS_STATE = {
  INTACT: 'THESIS_INTACT',
  THESIS_INTACT: 'THESIS_INTACT',
  STRENGTHENING: 'THESIS_STRENGTHENING',
  THESIS_STRENGTHENING: 'THESIS_STRENGTHENING',
  WEAKENING: 'THESIS_WEAKENING',
  THESIS_WEAKENING: 'THESIS_WEAKENING',
  INVALIDATION_APPROACHING: 'INVALIDATION_APPROACHING',
  INVALIDATED: 'INVALIDATED',
  TARGET_REACHED: 'TARGET_REACHED',
  TP1_REACHED: 'TP1_REACHED',
  TP2_REACHED: 'TP2_REACHED',
  EXIT_REVIEW_REQUIRED: 'EXIT_REVIEW_REQUIRED',
  DATA_UNAVAILABLE: 'DATA_UNAVAILABLE',

  // Backward-compatible aliases for 7.1 tests:
  TARGET_APPROACHING: 'TARGET_APPROACHING',
  EVENT_RISK_INCREASED: 'EVENT_RISK_INCREASED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_FRESH_DATA'
};

export const WATCH_STATUS = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  INVALIDATED: 'INVALIDATED'
};
let _watchCounter = 0;

export class ArgusPositionWatch {
  constructor(optionsOrPath = WATCHES_FILE) {
    this.name = 'ARGUS_Position_Watch_7_2';
    this.filePath = (typeof optionsOrPath === 'object' && optionsOrPath?.filePath)
      ? optionsOrPath.filePath
      : (typeof optionsOrPath === 'string' ? optionsOrPath : WATCHES_FILE);
    this.watches = new Map();
    this.originalPredictionRewriteCount = 0; // Invariant
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.watches.clear();
          for (const w of list) {
            if (w.watchId) this.watches.set(w.watchId, w);
          }
        }
      }
    } catch (e) {
      console.error('[ARGUS_POSITION_WATCH] Load error:', e.message);
    }
  }

  flushToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const arr = Array.from(this.watches.values());
      fs.writeFileSync(this.filePath, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {
      console.error('[ARGUS_POSITION_WATCH] Flush error:', e.message);
    }
  }

  /**
   * Declare a user-opened position for tracking.
   * Preserves immutable original thesis and levels.
   */
  declarePosition(userId = 'owner', params = {}) {
    const now = new Date().toISOString();
    const cleanSym = (params.symbol || 'XAUUSD').toUpperCase();
    const watchId = `pw-${cleanSym.toLowerCase()}-${Date.now()}-${++_watchCounter}`;

    const declaredEntry = Number(params.actualEntry || params.entry || params.declaredEntry || 0);
    const stopLoss = params.stopLoss || params.sl ? Number(params.stopLoss || params.sl) : null;
    const targets = Array.isArray(params.targets) ? params.targets.map(Number) :
                    (params.tp1 ? [Number(params.tp1), params.tp2 ? Number(params.tp2) : null].filter(Boolean) : []);

    const watch = {
      watchId,
      userId: String(userId),
      owner: String(params.owner || userId),
      symbol: cleanSym,
      direction: (params.direction || 'BUY').toUpperCase(),
      actualEntry: declaredEntry,
      declaredEntry,
      originalSetupId: params.originalSetupId || params.setupId || params.certificationId || null,
      strategy: params.strategy || params.strategyId || 'USER_DECLARED',
      strategyId: params.strategyId || params.strategy || 'USER_DECLARED',
      initialThesis: params.initialThesis || params.thesis || 'User declared position',
      originalThesis: params.initialThesis || params.thesis || 'User declared position',
      invalidation: params.invalidation || (stopLoss ? `Price reaches SL at ${stopLoss}` : 'Structural invalidation'),
      originalInvalidation: params.invalidation || (stopLoss ? `Price reaches SL at ${stopLoss}` : 'Structural invalidation'),
      originalSL: stopLoss,
      targets,
      originalTargets: targets,
      tp1: targets[0] || null,
      tp2: targets[1] || null,
      certificationId: params.certificationId || params.originalSetupId || null,
      brokerQuoteAtDeclaration: params.brokerQuoteAtDeclaration || params.quoteAtDeclaration || null,
      openedAt: now,
      createdAt: now,
      status: WATCH_STATUS.ACTIVE,
      state: THESIS_STATE.INTACT,
      lastReviewAt: now,
      lastPositionState: THESIS_STATE.INTACT,
      lastNotificationState: 'NONE',
      lastNotifiedAt: null,
      mfe: 0,
      mae: 0,
      reviews: [],
      marketSnapshotAtOpen: params.marketSnapshot || null
    };

    this.watches.set(watchId, watch);
    if (argusForwardLedger && argusForwardLedger.stats) {
      argusForwardLedger.stats.positionWatches++;
    }
    this.flushToDisk();
    return watch;
  }

  /**
   * Find most recent active position for a given user and symbol
   */
  findActivePosition(userId = 'owner', symbol = 'XAUUSD') {
    const cleanSym = String(symbol).toUpperCase();
    const uId = String(userId);
    const matches = Array.from(this.watches.values())
      .filter(w => w.userId === uId && w.symbol === cleanSym && w.status === WATCH_STATUS.ACTIVE)
      .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    return matches[0] || null;
  }

  /**
   * Get active positions for user (array)
   */
  getActivePositions(userId = 'owner') {
    const uId = String(userId);
    return Array.from(this.watches.values())
      .filter(w => w.userId === uId && w.status === WATCH_STATUS.ACTIVE)
      .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  }

  /**
   * Get active position for user (any symbol)
   */
  getActivePosition(userId = 'owner') {
    return this.getActivePositions(userId)[0] || null;
  }

  /**
   * Get all active positions across all users
   */
  getAllActivePositions() {
    return Array.from(this.watches.values())
      .filter(w => w.status === WATCH_STATUS.ACTIVE)
      .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  }

  /**
   * Review a tracked position against fresh market evidence.
   */
  reviewPosition(watchId, freshEvidence = {}) {
    const watch = this.watches.get(watchId);
    if (!watch) return { error: 'Position watch not found', watchId };
    if (watch.status !== WATCH_STATUS.ACTIVE) return { error: 'Position is no longer active', watchId, status: watch.status };

    const now = new Date().toISOString();
    const {
      currentPrice = 0,
      regime = 'UNKNOWN',
      structures = {},
      eventRisk = {},
      atr = 15.0,
      dataQuality = 'AUTHENTIC',
      isStale = false,
      tickTruth = null,
      marketOpenState = null
    } = freshEvidence;

    const isStaleFeed = isStale === true ||
      dataQuality === 'UNAVAILABLE' ||
      dataQuality === 'STALE' ||
      tickTruth?.quoteFreshness === 'STALE' ||
      marketOpenState === 'CLOSED_WEEKEND' ||
      marketOpenState === 'CLOSED_SESSION' ||
      tickTruth?.marketOpenState === 'CLOSED_WEEKEND' ||
      (tickTruth && tickTruth.marketDataAgeMs > 120000);

    // Check data availability and freshness (Invariant: POSITION_REVIEW_FROM_STALE_DATA = 0)
    if (currentPrice <= 0 || isStaleFeed) {
      return {
        watchId,
        symbol: watch.symbol,
        direction: watch.direction,
        declaredEntry: watch.declaredEntry,
        thesisState: THESIS_STATE.DATA_UNAVAILABLE,
        reasons: ['Broker market data is stale, closed, or unavailable. Live position review suspended to prevent false execution claims.'],
        unrealizedR: 0,
        currentPrice: currentPrice || 0,
        recommendation: 'STANDBY — Awaiting fresh broker evidence'
      };
    }

    let thesisState = THESIS_STATE.INTACT;
    const reasons = [];
    const entry = watch.declaredEntry;
    const direction = watch.direction;
    const sl = watch.originalSL;
    const tp1 = watch.tp1 || (watch.originalTargets?.[0]);
    const tp2 = watch.tp2 || (watch.originalTargets?.[1]);

    // 1. Check if SL hit / Invalidation breached
    if (sl) {
      if ((direction === 'BUY' && currentPrice <= sl) || (direction === 'SELL' && currentPrice >= sl)) {
        thesisState = THESIS_STATE.INVALIDATED;
        reasons.push(`Price ($${currentPrice}) has reached or breached stop loss ($${sl})`);
      } else {
        // Check if invalidation approaching (< 0.2 ATR from SL)
        const distToSL = Math.abs(currentPrice - sl);
        if (distToSL <= atr * 0.2) {
          thesisState = THESIS_STATE.INVALIDATION_APPROACHING;
          reasons.push(`Price ($${currentPrice}) is within ${distToSL.toFixed(1)} pts of stop loss ($${sl})`);
        }
      }
    }

    // 2. Check if TP targets reached
    if (thesisState !== THESIS_STATE.INVALIDATED) {
      if (tp2 && ((direction === 'BUY' && currentPrice >= tp2) || (direction === 'SELL' && currentPrice <= tp2))) {
        thesisState = THESIS_STATE.TP2_REACHED;
        reasons.push(`Target 2 ($${tp2}) has been reached! Full exit review recommended.`);
      } else if (tp1 && ((direction === 'BUY' && currentPrice >= tp1) || (direction === 'SELL' && currentPrice <= tp1))) {
        thesisState = THESIS_STATE.TP1_REACHED;
        reasons.push(`Target 1 ($${tp1}) has been reached. Consider partial profit lock or trailing SL.`);
      } else if (tp1) {
        const distToTarget = Math.abs(currentPrice - tp1);
        if (distToTarget < atr * 0.3) {
          thesisState = THESIS_STATE.TARGET_APPROACHING;
          reasons.push(`Price ($${currentPrice}) is approaching Target 1 ($${tp1})`);
        }
      }
    }

    // 3. Check structural alignment if not invalidated or TP
    if (thesisState === THESIS_STATE.INTACT) {
      const h1Trend = structures?.H1?.trend || structures?.trend;
      if (h1Trend) {
        if ((direction === 'BUY' && h1Trend === 'BEARISH') || (direction === 'SELL' && h1Trend === 'BULLISH')) {
          thesisState = THESIS_STATE.WEAKENING;
          reasons.push(`H1 structure has turned ${h1Trend}, opposing ${direction} position thesis`);
        }
      }
    }

    // 4. Check macro event risk
    if (eventRisk?.isBlackout || eventRisk?.isImminent) {
      if (thesisState === THESIS_STATE.INTACT) {
        thesisState = THESIS_STATE.EVENT_RISK_INCREASED;
      }
      reasons.push(`High-impact macro event imminent: ${eventRisk.imminentEvent?.event || 'release scheduled'}`);
    }

    // 5. P&L & Excursion Tracking (MFE / MAE)
    let unrealizedR = 0;
    if (entry > 0 && currentPrice > 0 && sl) {
      const riskDistance = Math.abs(entry - sl);
      if (riskDistance > 0) {
        const pnl = direction === 'BUY' ? (currentPrice - entry) : (entry - currentPrice);
        unrealizedR = Number((pnl / riskDistance).toFixed(2));

        // Update MFE / MAE
        if (unrealizedR > (watch.mfe || 0)) watch.mfe = unrealizedR;
        if (unrealizedR < (watch.mae || 0)) watch.mae = unrealizedR;
      }
    }

    if (thesisState === THESIS_STATE.INTACT && reasons.length === 0) {
      reasons.push('Original thesis remains valid. Structure and market conditions continue to support the position.');
    }

    const review = {
      reviewedAt: now,
      thesisState,
      reasons,
      currentPrice,
      unrealizedR,
      mfe: watch.mfe,
      mae: watch.mae,
      regime,
      marketEvidenceHash: `${currentPrice}-${regime}-${now}`
    };

    watch.reviews.push(review);
    watch.lastReviewAt = now;
    watch.lastPositionState = thesisState;

    // Invalidation auto-status update
    if (thesisState === THESIS_STATE.INVALIDATED) {
      watch.status = WATCH_STATUS.INVALIDATED;
    }

    this.watches.set(watchId, watch);
    this.flushToDisk();

    return {
      watchId,
      symbol: watch.symbol,
      direction: watch.direction,
      declaredEntry: watch.declaredEntry,
      originalSL: watch.originalSL,
      originalTargets: watch.originalTargets,
      thesisState,
      reasons,
      unrealizedR,
      mfe: watch.mfe,
      mae: watch.mae,
      currentPrice,
      recommendation: this._getRecommendation(thesisState, unrealizedR),
      review
    };
  }

  _getRecommendation(thesisState, unrealizedR) {
    switch (thesisState) {
      case THESIS_STATE.INVALIDATED:
        return 'EXIT IMMEDIATELY — Original thesis invalidated by price breach';
      case THESIS_STATE.TP2_REACHED:
        return 'FULL EXIT — Target 2 achieved, lock profits';
      case THESIS_STATE.TP1_REACHED:
        return 'TAKE PARTIAL PROFIT — Target 1 reached, shift SL to Breakeven';
      case THESIS_STATE.INVALIDATION_APPROACHING:
        return 'PREPARE EXIT — Price threatening stop level';
      case THESIS_STATE.WEAKENING:
        return 'TIGHTEN RISK — Higher timeframe momentum shifting';
      case THESIS_STATE.EVENT_RISK_INCREASED:
        return 'REDUCE RISK — Macro event imminent';
      case THESIS_STATE.DATA_UNAVAILABLE:
        return 'STANDBY — Fresh feed reconnecting';
      default:
        return unrealizedR > 1.0 ? 'HOLD WITH PROFIT — Thesis intact' : 'HOLD — Thesis fully intact';
    }
  }

  closePosition(watchId, reason = 'USER_CLOSED') {
    const watch = this.watches.get(watchId);
    if (!watch) return null;
    watch.status = WATCH_STATUS.CLOSED;
    watch.closedAt = new Date().toISOString();
    watch.closeReason = reason;
    this.watches.set(watchId, watch);
    this.flushToDisk();
    return watch;
  }

  closeAllPositions(userId = null) {
    let closedCount = 0;
    for (const [id, w] of this.watches.entries()) {
      const match = !userId || userId === 'ALL' || w.userId === String(userId);
      if (match && w.status === WATCH_STATUS.ACTIVE) {
        w.status = WATCH_STATUS.CLOSED;
        w.closedAt = new Date().toISOString();
        this.watches.set(id, w);
        closedCount++;
      }
    }
    this.flushToDisk();
    return closedCount;
  }

  getAllActivePositions() {
    return Array.from(this.watches.values()).filter(w => w.status === WATCH_STATUS.ACTIVE);
  }
}

export const argusPositionWatch = new ArgusPositionWatch();
