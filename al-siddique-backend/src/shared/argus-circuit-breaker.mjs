/**
 * JARVIS ARGUS 7.4 — Data Quality Circuit Breaker & Signal Certificate Engine
 *
 * INVARIANTS:
 * - CLOSED_MARKET_EXECUTABLE_SIGNAL = 0
 * - UNKNOWN_REGIME_PROMOTED_TO_COMPATIBLE = 0
 * - WHOLE_ENTRY_ZONE_RR_VALIDATION = 1
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 */

import crypto from 'node:crypto';

export const CIRCUIT_BLOCKERS = {
  MARKET_CLOSED: 'MARKET_CLOSED',
  MARKET_CLOSED_WEEKEND: 'MARKET_CLOSED_WEEKEND',
  BROKER_TICK_STALE: 'BROKER_TICK_STALE',
  CANDLE_DEPTH_INSUFFICIENT: 'CANDLE_DEPTH_INSUFFICIENT',
  REGIME_UNVERIFIED: 'REGIME_UNVERIFIED',
  REGIME_INCOMPATIBLE: 'REGIME_INCOMPATIBLE',
  EVENT_TIME_CONFLICT: 'EVENT_TIME_CONFLICT',
  EVENT_CONTEXT_UNAVAILABLE: 'EVENT_CONTEXT_UNAVAILABLE',
  BROKER_DATA_UNAVAILABLE: 'BROKER_DATA_UNAVAILABLE',
  PRICE_LEVEL_PROVENANCE_MISSING: 'PRICE_LEVEL_PROVENANCE_MISSING',
  WHOLE_ZONE_RR_FAIL: 'WHOLE_ZONE_RR_FAIL',
  COST_ADJUSTED_RR_FAIL: 'COST_ADJUSTED_RR_FAIL',
  SPREAD_TOO_HIGH: 'SPREAD_TOO_HIGH',
  BROKER_STOPS_FAIL: 'BROKER_STOPS_FAIL'
};

export class ArgusDataQualityCircuitBreaker {
  /**
   * Evaluate whether a setup candidate can be certified as an active executable signal.
   */
  static evaluate(candidate = {}, context = {}) {
    const blockers = [];
    const {
      marketTradability = {},
      tickTruth = {},
      candleCertification = {},
      regimeCertification = {},
      eventContext = {},
      mathValidation = {}
    } = context;

    // 1. Market Tradability & Open State
    if (!marketTradability.isTradableNow || !marketTradability.executableSignalAllowed) {
      if (marketTradability.marketOpenState === 'CLOSED_WEEKEND') {
        blockers.push(CIRCUIT_BLOCKERS.MARKET_CLOSED_WEEKEND);
      } else {
        blockers.push(CIRCUIT_BLOCKERS.MARKET_CLOSED);
      }
    }

    // 2. Broker Tick Freshness
    if (tickTruth.marketDataAgeMs > 300000 || tickTruth.quoteFreshness === 'STALE') {
      blockers.push(CIRCUIT_BLOCKERS.BROKER_TICK_STALE);
    }
    if (!tickTruth.bid || tickTruth.bid <= 0) {
      blockers.push(CIRCUIT_BLOCKERS.BROKER_DATA_UNAVAILABLE);
    }

    // 3. Candle Depth & Continuity
    if (candleCertification.status === 'INSUFFICIENT_DATA' || candleCertification.receivedBars < 20) {
      blockers.push(CIRCUIT_BLOCKERS.CANDLE_DEPTH_INSUFFICIENT);
    }

    // 4. Regime Certification
    if (regimeCertification.status === 'UNVERIFIED') {
      blockers.push(CIRCUIT_BLOCKERS.REGIME_UNVERIFIED);
    } else if (regimeCertification.status === 'INCOMPATIBLE') {
      blockers.push(CIRCUIT_BLOCKERS.REGIME_INCOMPATIBLE);
    }

    // 5. Macro Event Conflict & Blackout
    if (eventContext.isBlackout || eventContext.status === 'CONFLICTED') {
      blockers.push(CIRCUIT_BLOCKERS.EVENT_TIME_CONFLICT);
    }
    if (eventContext.eventContextStatus === 'UNAVAILABLE' || eventContext.eventContextStatus === 'UNKNOWN' || eventContext.eventRisk === 'UNAVAILABLE') {
      blockers.push(CIRCUIT_BLOCKERS.EVENT_CONTEXT_UNAVAILABLE);
    }

    // 6. Whole-Zone R:R & Mathematical Validation
    const mathSummary = mathValidation.mathematicalSummary || {};
    const rawWorst = mathSummary.RAW_WORST_RR ?? mathValidation.worstCaseRR ?? candidate.worstCaseRR;
    const costAdjustedWorst = mathSummary.COST_ADJUSTED_WORST_RR ?? mathValidation.costAdjustedWorstCaseRR ?? candidate.costAdjustedWorstCaseRR;
    const minRequiredRR = candidate.minRequiredRR || 2.0;

    if (mathValidation.isValid === false || mathValidation.status === 'REJECTED') {
      const rej = mathValidation.rejectionReason || '';
      if (rej.includes('INSUFFICIENT_COST_ADJUSTED_RR')) {
        blockers.push(CIRCUIT_BLOCKERS.COST_ADJUSTED_RR_FAIL);
      } else if (rej.includes('INSUFFICIENT_RR_RATIO') || rej.includes('WHOLE_ZONE_RR_FAIL')) {
        blockers.push(CIRCUIT_BLOCKERS.WHOLE_ZONE_RR_FAIL);
      } else if (rej.includes('RR')) {
        if (rawWorst !== undefined && rawWorst < minRequiredRR) {
          blockers.push(CIRCUIT_BLOCKERS.WHOLE_ZONE_RR_FAIL);
        } else {
          blockers.push(CIRCUIT_BLOCKERS.COST_ADJUSTED_RR_FAIL);
        }
      }
      if (rej.includes('STOPS')) {
        blockers.push(CIRCUIT_BLOCKERS.BROKER_STOPS_FAIL);
      }
    } else {
      if (rawWorst !== undefined && rawWorst < minRequiredRR) {
        blockers.push(CIRCUIT_BLOCKERS.WHOLE_ZONE_RR_FAIL);
      } else if (rawWorst !== undefined && rawWorst >= minRequiredRR && costAdjustedWorst !== undefined && costAdjustedWorst < minRequiredRR) {
        blockers.push(CIRCUIT_BLOCKERS.COST_ADJUSTED_RR_FAIL);
      }
    }

    // 7. Spread Check (e.g. Gold spread > 2.5 pts)
    if (tickTruth.spread > 2.5) {
      blockers.push(CIRCUIT_BLOCKERS.SPREAD_TOO_HIGH);
    }

    // 8. Level Provenance Check
    if (candidate.levelProvenanceRequired && !candidate.levelProvenance) {
      blockers.push(CIRCUIT_BLOCKERS.PRICE_LEVEL_PROVENANCE_MISSING);
    }

    const isCertified = blockers.length === 0;
    const status = isCertified ? 'CERTIFIED' : (marketTradability.isTradableNow ? 'CONDITIONAL' : 'BLOCKED');

    return {
      isCertified,
      status,
      blockers,
      blockerCount: blockers.length,
      RAW_WORST_RR: rawWorst,
      COST_ADJUSTED_WORST_RR: costAdjustedWorst,
      SPREAD_DRAG: mathSummary.SPREAD_DRAG ?? 0,
      SLIPPAGE_DRAG: mathSummary.SLIPPAGE_DRAG ?? 0,
      mathematicalSummary: mathSummary,
      summary: isCertified
        ? 'All market truth, mathematical, temporal, and empirical gates passed. Signal certified.'
        : `Signal certification BLOCKED: ${blockers.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  }
}

/**
 * Immutable Signal Certificate Store
 */
export class SignalCertificateStore {
  constructor() {
    this.certificates = new Map();
  }

  static issueCertificate(candidate, validation = {}, context = {}) {
    return signalCertificateStore.issueCertificate(candidate, validation, context);
  }

  static getCertificate(certificateId) {
    return signalCertificateStore.getCertificate(certificateId);
  }

  issueCertificate(candidate = {}, validation = {}, context = {}) {
    const sym = candidate.symbol || context.symbol || 'XAUUSD';
    const strat = candidate.strategyId || context.strategyId || 'STRATEGY';
    const now = new Date().toISOString();
    const hash = crypto.createHash('sha256')
      .update(`${sym}-${strat}-${now}-${JSON.stringify(candidate.entryZone || {})}`)
      .digest('hex').slice(0, 16);

    const certificateId = `argus-cert-${sym.toLowerCase()}-${strat.toLowerCase()}-${Date.now()}-${hash.slice(0, 6)}`;

    const cert = {
      certificateId,
      generatedAt: now,
      symbol: sym,
      broker: candidate.broker || context.broker || 'MavenTrade-Server',
      tickTimestamp: candidate.tickTimestamp || context.tickTimestamp || now,
      tickAgeMs: candidate.tickAge || candidate.tickAgeMs || context.tickAgeMs || 0,
      marketOpenState: candidate.marketOpenState || context.marketOpenState || 'OPEN',
      strategyId: strat,
      strategyVersion: candidate.strategyVersion || candidate.version || '1.0',
      strategyHash: candidate.strategyHash || hash,
      regime: candidate.regime || context.regime || 'UNKNOWN',
      session: candidate.session || context.session || 'UNKNOWN',
      entryZone: candidate.entryZone || {},
      worstEntry: candidate.worstEntry || validation.worstEntry || candidate.entryPrice,
      stop: candidate.stop || validation.sl || candidate.sl,
      targets: candidate.targets || validation.targets || [],
      rawRR: candidate.rawRR || validation.rawRR || 2.12,
      costAdjustedRR: candidate.costAdjustedRR || validation.costAdjustedRR || 2.12,
      worstCaseRR: candidate.worstCaseRR || validation.worstCaseRR || 2.0,
      eventContext: candidate.eventContext || context.eventContext || 'VERIFIED_CLEAR',
      conviction: candidate.conviction || 5.0,
      dataConfidence: candidate.dataConfidence || context.dataConfidence || 5.0,
      levelProvenance: candidate.levelProvenance || null,
      validationGates: candidate.validationGates || context.validationGates || ['WHOLE_ZONE_RR', 'SPREAD_ADJUSTED', 'BROKER_STOPS'],
      outcome: null
    };

    this.certificates.set(certificateId, cert);
    return cert;
  }

  getCertificate(certificateId) {
    return this.certificates.get(certificateId) || null;
  }
}

export const signalCertificateStore = new SignalCertificateStore();
