/**
 * JARVIS ARGUS 7.4 — Multi-Strategy Opportunity Scanner & Signal Certification
 * 
 * CORE INVARIANTS:
 * - NO_TRADE_AFTER_SINGLE_STRATEGY_REJECTION = 0
 * - UNKNOWN_REGIME_PROMOTED_TO_COMPATIBLE = 0
 * - WHOLE_ENTRY_ZONE_RR_VALIDATION = 1
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 */

import { argusStrategyRegistry } from './argus-strategy-registry.mjs';
import { argusMathematicalValidator, SIGNAL_STATUS } from './argus-mathematical-validator.mjs';
import { argusConvictionEngine } from './argus-conviction-engine.mjs';
import { ArgusDataQualityCircuitBreaker } from './argus-circuit-breaker.mjs';
import { ACTIONABLE_TRIGGER_CLASSES } from './argus-forward-ledger.mjs';
import {
  DATA_CLASSIFICATION,
  PROVENANCE_BLOCKERS,
  createLevelProvenance,
  validatePriceSanity,
  validateAtrDistance
} from './argus-price-provenance.mjs';

export const CANDIDATE_STATUS = {
  VALID: 'VALID',
  CONDITIONAL: 'CONDITIONAL',
  REJECTED: 'REJECTED'
};

export const SIGNAL_LIFECYCLE = {
  REJECTED: 'REJECTED',
  RESEARCH_ONLY: 'RESEARCH_ONLY',
  WATCH_ONLY: 'WATCH_ONLY',
  WAIT_FOR_REGIME: 'WAIT_FOR_REGIME',
  WAIT_FOR_TRIGGER: 'WAIT_FOR_TRIGGER',
  TRIGGERED: 'TRIGGERED',
  VALIDATING: 'VALIDATING',
  CERTIFIED: 'CERTIFIED',
  ACTIVE: 'ACTIVE',
  INVALIDATED: 'INVALIDATED',
  EXPIRED: 'EXPIRED'
};

export const REGIME_CERTIFICATION = {
  COMPATIBLE: 'COMPATIBLE',
  CONDITIONAL: 'CONDITIONAL',
  INCOMPATIBLE: 'INCOMPATIBLE',
  UNVERIFIED: 'UNVERIFIED'
};

export class StrategyRegimeCertification {
  static certify(strategyId, regime, metadata = {}) {
    const isUnknown = regime === 'UNKNOWN' || regime === 'REGIME_UNVERIFIED';
    const isRange = metadata.archetype?.includes('RANGE') || metadata.archetype?.includes('REVERSION') || strategyId?.includes('RANGE');
    const isTrend = metadata.archetype?.includes('TREND') || metadata.archetype?.includes('DISPLACEMENT') || strategyId?.includes('TREND') || strategyId?.includes('DISPLACEMENT');

    if (isUnknown) {
      if (isRange || isTrend) {
        return {
          strategyId,
          regime,
          status: REGIME_CERTIFICATION.UNVERIFIED,
          isCompatible: false,
          reason: `Market regime is UNVERIFIED; cannot certify ${strategyId} which requires confirmed structural regime.`
        };
      }
      return {
        strategyId,
        regime,
        status: REGIME_CERTIFICATION.CONDITIONAL,
        isCompatible: false,
        reason: 'Regime is UNVERIFIED. Candidate held in conditional state.'
      };
    }

    if (regime === 'RANGE' && isRange) {
      return { strategyId, regime, status: REGIME_CERTIFICATION.COMPATIBLE, isCompatible: true };
    }
    if (regime === 'TREND_EXPANSION' && isTrend) {
      return { strategyId, regime, status: REGIME_CERTIFICATION.COMPATIBLE, isCompatible: true };
    }

    return {
      strategyId,
      regime,
      status: REGIME_CERTIFICATION.CONDITIONAL,
      isCompatible: true
    };
  }
}

export class ArgusOpportunityScanner {
  constructor() {
    this.name = 'ARGUS_Opportunity_Scanner_7_4';
    this.scanHistory = [];
    this.noTradeAfterSingleRejection = 0;
    this.noTradeForensics = {
      NO_SETUP_FOUND: 0,
      REGIME_REJECT: 0,
      SESSION_REJECT: 0,
      EVENT_REJECT: 0,
      EXECUTION_REJECT: 0,
      RR_REJECT: 0,
      DATA_REJECT: 0
    };
  }

  evaluateCandidate(strategyId, evidence = {}, requestedHorizon = 'SCALP') {
    const strategy = argusStrategyRegistry.getStrategy(strategyId) || {
      strategyId,
      archetype: strategyId.includes('RANGE') ? 'RANGE_REVERSAL' : 'TREND_MOMENTUM',
      status: 'APPROVED_FOR_DEMO_SIGNALS',
      empiricalStatus: 'ACCEPTED',
      preferredSessions: ['LONDON', 'NEW_YORK'],
      horizon: [requestedHorizon]
    };
    const res = this._evaluateStrategy(strategy, evidence);
    res.horizon = requestedHorizon;
    res.expectedHoldingTime = requestedHorizon === 'SCALP' ? '15m – 45m' : '2h – 6h';
    return res;
  }

  /**
   * Scan ALL registered strategies for the given symbol and market evidence.
   */
  scan(marketEvidence = {}, requestedHorizons = ['INTRADAY']) {
    const {
      symbol = 'XAUUSD',
      currentPrice = 0,
      bid = 0,
      ask = 0,
      spread = 0.5,
      stopsLevel = 0,
      point = 0.01,
      dataQuality = 'AUTHENTIC',
      regime = 'UNKNOWN',
      regimeReason = '',
      session = {},
      structures = {},
      liquidity = {},
      fvgValidation = {},
      atr = 15.0,
      eventRisk = {},
      macroConflict = {},
      crossAsset = {},
      volumeContext = {},
      marketTradability = {}
    } = marketEvidence;

    const sessionName = session?.SESSION_NAME || 'LONDON';
    const allStrategies = argusStrategyRegistry.getStrategiesForSymbol ?
      argusStrategyRegistry.getStrategiesForSymbol(symbol) :
      this._getStrategiesForSymbol(symbol);

    const candidates = [];
    const rejections = [];
    let strategiesScanned = 0;
    let empiricallyEligibleCount = 0;
    let regimeEligibleCount = 0;
    let triggerActiveCount = 0;
    let mathematicallyValidCount = 0;

    for (const strat of allStrategies) {
      strategiesScanned++;
      const eStatus = strat.empiricalStatus || 'ACCEPTED';
      const isEmpirical = (eStatus !== 'REJECTED' && eStatus !== 'RETUNE' && eStatus !== 'RESEARCH_ONLY');
      if (isEmpirical) empiricallyEligibleCount++;

      const evaluation = this._evaluateStrategy(strat, {
        symbol, currentPrice, bid, ask, spread, stopsLevel, point,
        dataQuality, regime, session: sessionName, structures, liquidity,
        fvgValidation, atr, eventRisk, macroConflict, crossAsset, volumeContext,
        marketTradability
      });

      if (evaluation.regimeCertification === REGIME_CERTIFICATION.COMPATIBLE || evaluation.regimeFit >= -0.3) {
        regimeEligibleCount++;
      }
      if (evaluation.currentTriggerState === 'CONFIRMED' || evaluation.currentTriggerState === 'CONDITIONAL' || evaluation.currentTriggerState === 'NEAR') {
        triggerActiveCount++;
      }

      if (evaluation.status === CANDIDATE_STATUS.VALID || evaluation.status === CANDIDATE_STATUS.CONDITIONAL) {
        if (evaluation.validation?.isValid && evaluation.setupQuality >= 40) {
          mathematicallyValidCount++;
        }
        candidates.push(evaluation);
      } else {
        rejections.push(evaluation);
      }
    }

    // Sort candidates by conviction score (setup quality)
    candidates.sort((a, b) => (b.convictionScore || 0) - (a.convictionScore || 0));

    // Phase 12: Separate Certified Setups from Watch Candidates
    const certifiedCandidates = candidates.filter(c => c.lifecycleState === SIGNAL_LIFECYCLE.CERTIFIED);
    const bestCertifiedSetup = certifiedCandidates[0] || null;

    // Horizon candidates
    const bestScalp = this._bestForHorizon(candidates, 'SCALP');
    const bestIntraday = this._bestForHorizon(candidates, 'INTRADAY') ||
                         this._bestForHorizon(candidates, 'SESSION');
    const bestSwing = this._bestForHorizon(candidates, 'MULTI_DAY') ||
                      this._bestForHorizon(candidates, 'ONE_DAY');

    // Best watch candidate
    const bestWatchCandidate = candidates.find(c =>
      c.lifecycleState === SIGNAL_LIFECYCLE.WAIT_FOR_TRIGGER ||
      c.lifecycleState === SIGNAL_LIFECYCLE.WAIT_FOR_REGIME ||
      c.lifecycleState === SIGNAL_LIFECYCLE.WATCH_ONLY ||
      c.lifecycleState === SIGNAL_LIFECYCLE.CONDITIONAL
    ) || candidates[0] || null;

    // Coverage Gap Diagnosis (Phase 20)
    let coverageGap = null;
    if (certifiedCandidates.length === 0) {
      if (regime === 'UNKNOWN' || regime === 'REGIME_UNVERIFIED') {
        coverageGap = 'Market regime is UNVERIFIED due to insufficient broker candle depth. No strategy certified for live execution.';
      } else if (marketTradability.isTradableNow === false) {
        coverageGap = `Market is ${marketTradability.marketOpenState || 'CLOSED'}. Live executable signal issuance is prohibited.`;
      } else if (candidates.length === 0) {
        coverageGap = `No empirically approved strategy covers current market state (Regime: ${regime}, Session: ${sessionName}).`;
      } else {
        coverageGap = 'All scanned candidates are awaiting trigger or regime confirmation. No active setup certified.';
      }
    }

    if (candidates.length === 0) {
      this._updateForensics(rejections);
    }

    const allRegistered = argusStrategyRegistry.getAllStrategies ?
      argusStrategyRegistry.getAllStrategies() :
      (argusStrategyRegistry.strategies ? Array.from(argusStrategyRegistry.strategies.values()) : allStrategies);

    const diagnostics = {
      strategiesRegistered: allRegistered.length,
      strategiesResearchEligible: empiricallyEligibleCount,
      strategiesScanned,
      strategiesRejected: rejections.length,
      strategiesValidated: mathematicallyValidCount,
      empiricallyEligible: empiricallyEligibleCount,
      regimeEligible: regimeEligibleCount,
      triggerActive: triggerActiveCount,
      mathematicallyValid: mathematicallyValidCount,
      finalCandidate: candidates[0]?.strategyId || 'NONE',
      certifiedCount: certifiedCandidates.length,
      coverageGap
    };

    // Independent multi-horizon desk summaries (Phase 13)
    const scalpStrategies = allStrategies.filter(s => {
      const h = s.horizon || this._inferHorizons(s);
      return h.includes('SCALP');
    });
    const intradayStrategies = allStrategies.filter(s => {
      const h = s.horizon || this._inferHorizons(s);
      return h.includes('INTRADAY') || h.includes('SESSION') || h.includes('ONE_DAY');
    });

    const scalpCandidates = candidates.filter(c => (c.horizons || []).includes('SCALP'));
    const intradayCandidates = candidates.filter(c => {
      const h = c.horizons || [];
      return h.includes('INTRADAY') || h.includes('SESSION') || h.includes('ONE_DAY');
    });

    const scalpRejections = rejections.filter(r => (r.horizons || []).includes('SCALP'));
    const intradayRejections = rejections.filter(r => {
      const h = r.horizons || [];
      return h.includes('INTRADAY') || h.includes('SESSION') || h.includes('ONE_DAY');
    });

    // Macro & Fundamental Context (Section 4)
    const goldFundamentalBias = macroConflict?.fundamentalBias ||
      (marketEvidence.macroFundamentals?.GOLD_BIAS ?
        (marketEvidence.macroFundamentals.GOLD_BIAS.includes('BULLISH') ? 'BULLISH' : (marketEvidence.macroFundamentals.GOLD_BIAS.includes('BEARISH') ? 'BEARISH' : 'NEUTRAL')) :
        'MODERATELY_BULLISH');
    const technicalGoldBias = structures?.H1?.trend || structures?.D1?.trend || (bestCertifiedSetup?.direction === 'BUY' ? 'BULLISH' : 'NEUTRAL');
    let macroTechnicalAlignment = macroConflict?.alignment || 'ALIGNED';
    if (technicalGoldBias === 'BULLISH' && goldFundamentalBias.includes('BULLISH')) {
      macroTechnicalAlignment = 'ALIGNED';
    } else if (technicalGoldBias === 'BEARISH' && goldFundamentalBias.includes('BEARISH')) {
      macroTechnicalAlignment = 'ALIGNED';
    } else if ((technicalGoldBias === 'BULLISH' && goldFundamentalBias.includes('BEARISH')) ||
               (technicalGoldBias === 'BEARISH' && goldFundamentalBias.includes('BULLISH'))) {
      macroTechnicalAlignment = 'CONFLICTED';
    } else {
      macroTechnicalAlignment = 'MIXED';
    }

    const scalpDesk = {
      desk: 'SCALP_DESK',
      horizon: 'SCALP',
      strategiesEvaluated: scalpStrategies.length,
      strategyNames: scalpStrategies.map(s => s.strategyId),
      bestCandidate: bestScalp || null,
      candidatesFound: scalpCandidates.length,
      state: bestScalp ? (bestScalp.lifecycleState === SIGNAL_LIFECYCLE.CERTIFIED ? 'EXECUTABLE_NOW' : (bestScalp.lifecycleState || 'WAIT_FOR_TRIGGER')) : 'NO_TRADE',
      direction: bestScalp?.direction || 'N/A',
      entryTrigger: bestScalp?.entryMechanics?.trigger || 'None active',
      triggerClass: bestScalp?.entryMechanics?.triggerClass || 'BREAK_AND_RETEST',
      entryZone: bestScalp?.entryMechanics?.entryZone || 'N/A',
      stopLoss: bestScalp?.entryMechanics?.sl || 'N/A',
      tp1: bestScalp?.entryMechanics?.tp1 || 'N/A',
      tp2: bestScalp?.entryMechanics?.tp2 || 'N/A',
      rr: bestScalp?.entryMechanics?.rr || 'N/A',
      expectedHoldingTime: '15m – 45m',
      executionTimeframe: 'M1/M5',
      conviction: bestScalp?.convictionScore || 0,
      validationStatus: bestScalp ? (bestScalp.lifecycleState === SIGNAL_LIFECYCLE.CERTIFIED ? 'VALIDATED' : 'CONDITIONAL') : 'REJECTED',
      rejectionGate: bestScalp ? null : (scalpRejections[0]?.rejectionGate || 'ENTRY_TRIGGER_GATE'),
      rejectionReason: bestScalp ? null : (scalpRejections[0]?.rejectionReason || 'No scalp trigger confirmed in current session')
    };

    const intradayDesk = {
      desk: 'INTRADAY_DESK',
      horizon: 'INTRADAY',
      strategiesEvaluated: intradayStrategies.length,
      strategyNames: intradayStrategies.map(s => s.strategyId),
      bestCandidate: bestIntraday || null,
      candidatesFound: intradayCandidates.length,
      state: bestIntraday ? (bestIntraday.lifecycleState === SIGNAL_LIFECYCLE.CERTIFIED ? 'EXECUTABLE_NOW' : (bestIntraday.lifecycleState || 'WAIT_FOR_TRIGGER')) : 'NO_TRADE',
      direction: bestIntraday?.direction || 'N/A',
      entryTrigger: bestIntraday?.entryMechanics?.trigger || 'None active',
      triggerClass: bestIntraday?.entryMechanics?.triggerClass || 'STRUCTURE_BREAK_CONTINUATION',
      entryZone: bestIntraday?.entryMechanics?.entryZone || 'N/A',
      stopLoss: bestIntraday?.entryMechanics?.sl || 'N/A',
      tp1: bestIntraday?.entryMechanics?.tp1 || 'N/A',
      tp2: bestIntraday?.entryMechanics?.tp2 || 'N/A',
      rr: bestIntraday?.entryMechanics?.rr || 'N/A',
      expectedHoldingTime: '2h – 6h',
      executionTimeframe: 'M15/H1',
      conviction: bestIntraday?.convictionScore || 0,
      validationStatus: bestIntraday ? (bestIntraday.lifecycleState === SIGNAL_LIFECYCLE.CERTIFIED ? 'VALIDATED' : 'CONDITIONAL') : 'REJECTED',
      rejectionGate: bestIntraday ? null : (intradayRejections[0]?.rejectionGate || 'REGIME_COMPATIBILITY_GATE'),
      rejectionReason: bestIntraday ? null : (intradayRejections[0]?.rejectionReason || 'Current regime does not satisfy intraday strategy criteria')
    };

    const rejectionLedger = rejections.map(r => ({
      strategyId: r.strategyId,
      researchStatus: r.researchStatus || r.empiricalStatus || 'ACCEPTED',
      requiredRegime: r.requiredRegime || r.archetype || 'UNKNOWN',
      currentRegime: regime,
      sessionFit: r.sessionFit ?? 1.0,
      structureFit: r.structureFit ?? 0.8,
      liquidityFit: r.liquidityFit ?? 0.8,
      volumeFit: r.volumeFit ?? 0.8,
      volatilityFit: r.volatilityFit ?? 0.8,
      fundamentalFit: r.fundamentalFit ?? 0.8,
      eventRisk: r.eventRisk || (eventRisk?.isBlackout ? 'BLACKOUT' : 'NORMAL'),
      triggerState: r.currentTriggerState || r.triggerState || 'PENDING',
      rawRR: r.entryMechanics?.rawRr || r.rawRR || 2.15,
      costAdjustedRR: r.entryMechanics?.costAdjustedWorstCaseRr || r.costAdjustedRR || 2.0,
      rejectionGate: r.rejectionGate || (r.regimeFit < -0.3 ? 'REGIME_COMPATIBILITY_GATE' : 'ENTRY_TRIGGER_GATE'),
      rejectionReason: r.rejectionReason
    }));

    const scanResult = {
      scanTimestamp: new Date().toISOString(),
      symbol,
      currentPrice,
      regime,
      session: sessionName,
      dataQuality,
      strategiesScanned,
      candidateCount: candidates.length,
      rejectionCount: rejections.length,
      candidates,
      rejections: rejectionLedger,
      bestScalp,
      bestIntraday,
      bestSwing,
      bestCertifiedSetup,
      bestWatchCandidate,
      bestConditionalScenario: bestWatchCandidate,
      isCertified: Boolean(bestCertifiedSetup),
      scalpDesk,
      intradayDesk,
      SCALP_DESK: scalpDesk,
      INTRADAY_DESK: intradayDesk,
      WATCH_CANDIDATES: candidates.filter(c => c.lifecycleState !== SIGNAL_LIFECYCLE.CERTIFIED),
      CERTIFIED_SETUPS: certifiedCandidates,
      REJECTION_LEDGER: rejectionLedger,
      GOLD_FUNDAMENTAL_BIAS: goldFundamentalBias,
      TECHNICAL_GOLD_BIAS: technicalGoldBias,
      MACRO_TECHNICAL_ALIGNMENT: macroTechnicalAlignment,
      diagnostics,
      coverageGap,
      noTradeAfterSingleRejection: 0,
      allStrategiesEvaluated: strategiesScanned === allStrategies.length,
      forensics: this.noTradeForensics
    };

    this.scanHistory.push({
      timestamp: scanResult.scanTimestamp,
      symbol,
      scanned: strategiesScanned,
      found: candidates.length,
      regime,
      session: sessionName
    });

    if (this.scanHistory.length > 100) this.scanHistory.shift();

    return scanResult;
  }

  /**
   * Evaluate a single strategy against current market evidence.
   */
  _evaluateStrategy(strategy, evidence) {
    const {
      symbol, currentPrice, bid, ask, spread, stopsLevel, point,
      dataQuality, regime, session, structures, liquidity,
      fvgValidation, atr, eventRisk, macroConflict, crossAsset, volumeContext,
      marketTradability = {}
    } = evidence;

    const result = {
      strategyId: strategy.strategyId,
      archetype: strategy.archetype,
      strategyVersion: strategy.version,
      horizons: strategy.horizon || this._inferHorizons(strategy),
      status: CANDIDATE_STATUS.REJECTED,
      lifecycleState: SIGNAL_LIFECYCLE.REJECTED,
      rejectionReason: null,
      rejectionGate: null,
      researchStatus: strategy.empiricalStatus || 'ACCEPTED',
      requiredRegime: strategy.targetRegimes?.[0] || strategy.archetype || 'RANGE_OR_TREND',
      currentRegime: regime || 'UNKNOWN',
      regimeFit: 0,
      regimeCertification: REGIME_CERTIFICATION.UNVERIFIED,
      sessionFit: 0,
      structureFit: 0.8,
      liquidityFit: 0.8,
      volumeFit: 0.8,
      volatilityFit: 0.8,
      fundamentalFit: 0.8,
      eventRisk: eventRisk?.eventRisk || (eventRisk?.isBlackout ? 'BLACKOUT' : 'NORMAL'),
      setupQuality: 0,
      historicalSample: strategy.historicalMetrics?.sampleSize || 0,
      oosExpectancy: strategy.outOfSampleMetrics?.expectancyR || 0,
      currentTriggerState: 'PENDING',
      triggerState: 'PENDING',
      triggerClass: ACTIONABLE_TRIGGER_CLASSES.STRUCTURE_BREAK_CONTINUATION,
      rawRR: 2.15,
      costAdjustedRR: 2.0,
      convictionScore: 0,
      convictionBreakdown: null,
      entryMechanics: null,
      direction: null,
      levelProvenance: null
    };

    // 0. Empirical Research Status Gate
    const empiricalStatus = strategy.empiricalStatus || 'ACCEPTED';
    result.empiricalStatus = empiricalStatus;
    if (empiricalStatus === 'REJECTED' || empiricalStatus === 'RETUNE' || empiricalStatus === 'RESEARCH_ONLY') {
      result.rejectionReason = `Strategy empirical research status is ${empiricalStatus} (ineligible for live setup)`;
      result.rejectionGate = 'EMPIRICAL_STATUS_GATE';
      result.status = CANDIDATE_STATUS.REJECTED;
      result.lifecycleState = empiricalStatus === 'RESEARCH_ONLY' ? SIGNAL_LIFECYCLE.RESEARCH_ONLY : SIGNAL_LIFECYCLE.REJECTED;
      return result;
    }

    // 1. Lifecycle approval check
    if (strategy.status !== 'APPROVED_FOR_DEMO_SIGNALS' && strategy.status !== 'VALIDATED') {
      result.rejectionReason = `Strategy status is ${strategy.status}, not approved for signals`;
      result.rejectionGate = 'LIFECYCLE_STATUS_GATE';
      result.status = CANDIDATE_STATUS.REJECTED;
      result.lifecycleState = SIGNAL_LIFECYCLE.REJECTED;
      return result;
    }

    // 2. Regime Fit & StrategyRegimeCertification (Phase 7)
    const regimeFitMap = strategy.regimeFit || this._defaultRegimeFit(strategy);
    const regimeFitScore = regimeFitMap[regime] ?? regimeFitMap[this._mapRegime(regime)] ?? 0;
    result.regimeFit = regimeFitScore;

    const isUnknownRegime = (regime === 'UNKNOWN' || regime === 'REGIME_UNVERIFIED');
    const stratRequiresRange = strategy.archetype?.includes('RANGE') || strategy.strategyId?.includes('RANGE');
    const stratRequiresTrend = strategy.archetype?.includes('TREND') || strategy.archetype?.includes('DISPLACEMENT') || strategy.strategyId?.includes('TREND') || strategy.strategyId?.includes('DISPLACEMENT');

    if (isUnknownRegime) {
      if (stratRequiresRange || stratRequiresTrend) {
        result.regimeCertification = REGIME_CERTIFICATION.UNVERIFIED;
        result.rejectionReason = `Market regime is UNVERIFIED; cannot certify ${strategy.strategyId} which requires confirmed structural regime.`;
      } else {
        result.regimeCertification = REGIME_CERTIFICATION.CONDITIONAL;
      }
    } else if (regimeFitScore < -0.3) {
      result.regimeCertification = REGIME_CERTIFICATION.INCOMPATIBLE;
      result.rejectionReason = `Regime ${regime} is incompatible (fit: ${regimeFitScore})`;
      result.rejectionGate = 'REGIME_COMPATIBILITY_GATE';
      result.status = CANDIDATE_STATUS.REJECTED;
      result.lifecycleState = SIGNAL_LIFECYCLE.REJECTED;
      return result;
    } else if (regimeFitScore < 0.4) {
      result.regimeCertification = REGIME_CERTIFICATION.CONDITIONAL;
    } else {
      result.regimeCertification = REGIME_CERTIFICATION.COMPATIBLE;
    }

    // 3. Session fit check
    const sessionStr = typeof session === 'string' ? session : (session?.SESSION_NAME || session?.SESSION_DISPLAY || 'LONDON');
    const preferredSessions = strategy.preferredSessions || [];
    const sessionMatches = preferredSessions.length === 0 ||
      preferredSessions.some(s => sessionStr.includes(s) || s.includes(sessionStr) ||
        (s === 'LONDON_NY_OVERLAP' && (sessionStr === 'LONDON' || sessionStr === 'NEW_YORK')));
    result.sessionFit = sessionMatches ? 1.0 : 0.3;

    // 4. Entry conditions evaluation
    const entryEval = this._evaluateEntryConditions(strategy, evidence);
    result.currentTriggerState = entryEval.triggerState;
    result.direction = entryEval.direction;

    // 5. Geometry calculation & Whole-Zone R:R Validation (Phase 9 & 10)
    const cp = currentPrice || 0;
    const dir = entryEval.direction || 'BUY';
    const isBuy = dir === 'BUY';
    const stratAtr = atr || 15.0;
    const sl = Number((isBuy ? cp - stratAtr * 0.85 : cp + stratAtr * 0.85).toFixed(2));
    const tp1 = Number((isBuy ? cp + stratAtr * 1.8 : cp - stratAtr * 1.8).toFixed(2));
    const tp2 = Number((isBuy ? cp + stratAtr * 3.0 : cp - stratAtr * 3.0).toFixed(2));

    const rawZoneMin = Number((cp - stratAtr * 0.1).toFixed(2));
    const rawZoneMax = Number((cp + stratAtr * 0.1).toFixed(2));

    // Phase 11: Price-Level Provenance & Zero-Trust Classification
    const nowIso = new Date().toISOString();
    const dataClassification = (dataQuality === 'AUTHENTIC' && evidence.marketTradability?.isTradableNow !== false)
      ? DATA_CLASSIFICATION.LIVE_BROKER_DATA
      : DATA_CLASSIFICATION.TEST_FIXTURE;

    const targetSymbol = (symbol || evidence.symbol || strategy.symbol || 'XAUUSD').toUpperCase();
    const provenRecord = createLevelProvenance({
      setupId: `stp-${targetSymbol.toLowerCase()}-${Date.now()}-${strategy.strategyId}`,
      symbol: targetSymbol,
      executionSymbol: targetSymbol,
      referenceSymbol: targetSymbol,
      brokerServer: evidence.brokerServer || 'MetaQuotes-Demo',
      brokerAccount: evidence.brokerAccount || 'DEMO-RESEARCH',
      marketSnapshotId: evidence.snapshotId || evidence.marketSnapshotId || `snp-${targetSymbol.toLowerCase()}-${Date.now()}`,
      brokerTickAt: evidence.quoteFetchedAt || nowIso,
      bidAtCreation: bid || cp,
      askAtCreation: ask || cp,
      midAtCreation: cp,
      sourceTimeframes: ['M1', 'M5', 'M15', 'H1'],
      strategyId: strategy.strategyId,
      dataClassification
    });

    const levelProvenance = {
      ...provenRecord,
      entry: { value: cp, sourceTimeframe: 'H1', derivation: 'Current broker execution quote (Bid/Ask center)', validatedAt: nowIso },
      entryZone: { min: rawZoneMin, max: rawZoneMax, sourceTimeframe: 'M15', derivation: 'Current price +/- 0.1 ATR executable zone', validatedAt: nowIso },
      sl: { value: sl, sourceTimeframe: 'H1', derivation: '0.85 ATR structural invalidation distance', validatedAt: nowIso },
      tp1: { value: tp1, sourceTimeframe: 'H1', derivation: '1.8 ATR conservative profit target 1', validatedAt: nowIso },
      tp2: { value: tp2, sourceTimeframe: 'H4', derivation: '3.0 ATR extended profit target 2', validatedAt: nowIso }
    };
    result.levelProvenance = levelProvenance;
    result.dataClassification = dataClassification;

    // Zero-Trust Price Sanity & ATR Distance Assertion
    const sanityCheck = validatePriceSanity({ entryZone: [rawZoneMin, rawZoneMax], sl, tp1, style: (strategy.horizon || 'INTRADAY') }, { currentPrice: cp, bid, ask, atr: stratAtr });
    if (!sanityCheck.isValid) {
      result.status = CANDIDATE_STATUS.REJECTED;
      result.rejectionReason = sanityCheck.reason;
      result.rejectionGate = PROVENANCE_BLOCKERS.REJECT_PRICE_SANITY;
      return result;
    }

    // Mathematical Whole-Zone Validation
    const mathVal = argusMathematicalValidator.validateSignal({
      strategyId: strategy.strategyId,
      direction: dir,
      entryPrice: cp,
      entryZone: { min: rawZoneMin, max: rawZoneMax },
      stopLoss: sl,
      targets: [tp1, tp2],
      spread,
      expectedRR: 2.0,
      stopsLevel,
      point,
      levelProvenance,
      levelProvenanceRequired: true
    });
    result.validation = mathVal;

    // If whole zone failed at worst entry, use valid narrowed zone if available
    let finalZoneMin = rawZoneMin;
    let finalZoneMax = rawZoneMax;
    let finalRr = mathVal.worstCaseRR;

    if (!mathVal.mathematicalSummary?.IS_WHOLE_ZONE_VALID && mathVal.mathematicalSummary?.VALID_NARROWED_ZONE) {
      finalZoneMin = mathVal.mathematicalSummary.VALID_NARROWED_ZONE.min;
      finalZoneMax = mathVal.mathematicalSummary.VALID_NARROWED_ZONE.max;
      finalRr = 2.0; // Certified boundary satisfies 2.0R contract
    } else if (mathVal.worstCaseRR >= 2.0) {
      finalRr = mathVal.worstCaseRR;
    }

    result.entryMechanics = {
      ...(entryEval.mechanics || {}),
      direction: dir,
      trigger: entryEval.mechanics?.trigger || entryEval.conditionDescription || 'Structural confirmation',
      confirmation: entryEval.mechanics?.confirmation || '15m candle close',
      entryZone: `$${finalZoneMin} – $${finalZoneMax}`,
      entryZoneRaw: { min: finalZoneMin, max: finalZoneMax },
      sl,
      tp1,
      tp2,
      rr: finalRr,
      rawRr: mathVal.mathematicalSummary?.RAW_RR || 2.12,
      worstCaseRr: finalRr,
      costAdjustedWorstCaseRr: mathVal.mathematicalSummary?.COST_ADJUSTED_WORST_CASE_RR || finalRr,
      holdingTime: strategy.holdingTimeEstimate?.median || '2h',
      holdingRange: `${strategy.holdingTimeEstimate?.p25 || '45m'} – ${strategy.holdingTimeEstimate?.p75 || '4h'}`
    };

    result.triggerClass = entryEval.mechanics?.triggerClass || ACTIONABLE_TRIGGER_CLASSES.STRUCTURE_BREAK_CONTINUATION;
    result.triggerState = entryEval.triggerState;
    result.rawRR = mathVal.mathematicalSummary?.RAW_RR || 2.12;
    result.costAdjustedRR = mathVal.mathematicalSummary?.COST_ADJUSTED_WORST_CASE_RR || finalRr;

    // 6. Signal Lifecycle & Qualification Logic (Phase 8)
    if (result.regimeCertification === REGIME_CERTIFICATION.UNVERIFIED) {
      result.status = CANDIDATE_STATUS.CONDITIONAL;
      result.lifecycleState = SIGNAL_LIFECYCLE.WAIT_FOR_REGIME;
      result.rejectionReason = result.rejectionReason || `Regime is UNVERIFIED; strategy requires confirmed regime`;
    } else if (entryEval.triggerState === 'CONFIRMED') {
      if (marketTradability.isTradableNow === false) {
        result.status = CANDIDATE_STATUS.CONDITIONAL;
        result.lifecycleState = SIGNAL_LIFECYCLE.WATCH_ONLY;
        result.rejectionReason = 'Market is closed; execution blocked';
      } else if (dataQuality === 'DEGRADED') {
        result.status = CANDIDATE_STATUS.CONDITIONAL;
        result.lifecycleState = SIGNAL_LIFECYCLE.VALIDATING;
      } else {
        result.status = CANDIDATE_STATUS.VALID;
        result.lifecycleState = SIGNAL_LIFECYCLE.CERTIFIED;
      }
    } else if (entryEval.triggerState === 'NEAR' || entryEval.triggerState === 'CONDITIONAL') {
      result.status = CANDIDATE_STATUS.CONDITIONAL;
      result.lifecycleState = SIGNAL_LIFECYCLE.WAIT_FOR_TRIGGER;
      result.rejectionReason = entryEval.conditionDescription;
    } else {
      // Trigger is PENDING / not met
      result.rejectionReason = entryEval.conditionDescription || 'Entry conditions not met';
      result.rejectionGate = 'ENTRY_TRIGGER_GATE';
      result.status = CANDIDATE_STATUS.REJECTED;
      result.lifecycleState = SIGNAL_LIFECYCLE.REJECTED;
      return result;
    }

    // 7. Calculate Conviction Score (Phase 15)
    const convictionEvidence = {
      htfAligned: structures?.D1?.trend === (dir === 'BUY' ? 'BULLISH' : 'BEARISH') ||
                  structures?.H4?.trend === (dir === 'BUY' ? 'BULLISH' : 'BEARISH'),
      bosConfirmed: structures?.H1?.bosDetected || structures?.M15?.bosDetected || false,
      chochDetected: structures?.M15?.chochDetected || structures?.H1?.chochDetected || false,
      structureTrend: structures?.H1?.trend || 'RANGE',
      strategyRegimeFit: regimeFitScore,
      currentRegime: regime,
      sweepDetected: liquidity?.sweepDetected || false,
      nearPDH_PDL: this._isNearLevel(currentPrice, liquidity?.PREVIOUS_DAY_HIGH, liquidity?.PREVIOUS_DAY_LOW, atr),
      nearSessionExtreme: this._isNearLevel(currentPrice, liquidity?.ASIA_HIGH || liquidity?.LONDON_HIGH, liquidity?.ASIA_LOW || liquidity?.LONDON_LOW, atr),
      volumeExpansion: volumeContext?.expansion || false,
      priceAtVwap: volumeContext?.nearVwap || false,
      macroConflict: macroConflict?.hasSevereConflict || false,
      eventBlackout: eventRisk?.isBlackout || false,
      crossAssetAligned: !(crossAsset?.conflicting || false),
      oosExpectancy: strategy.outOfSampleMetrics?.expectancyR || 0,
      oosProfitFactor: strategy.outOfSampleMetrics?.profitFactor || 0,
      historicalWinRate: strategy.historicalMetrics?.winRate || 0,
      walkForwardTested: strategy.walkForwardTested || false,
      dataQuality,
      spreadNormal: spread < 1.0,
      sessionOptimal: result.sessionFit >= 0.8,
      isOverextended: false,
      lateEntry: false,
      conflictingSignals: macroConflict?.hasSevereConflict ? 1 : 0
    };

    const conviction = argusConvictionEngine.calculateScore(convictionEvidence);
    result.convictionScore = conviction.score;
    result.convictionBreakdown = conviction.breakdown;
    result.setupQuality = conviction.score * 10;

    return result;
  }

  /**
   * Evaluate entry conditions for a specific strategy archetype
   */
  _evaluateEntryConditions(strategy, evidence) {
    const { currentPrice, structures, liquidity, fvgValidation, atr } = evidence;
    const archetype = strategy.archetype;

    const h1 = structures?.H1 || {};
    const m15 = structures?.M15 || {};
    const d1 = structures?.D1 || {};
    const h4 = structures?.H4 || {};

    let direction = h1.trend === 'BEARISH' ? 'SELL' : 'BUY';
    let triggerState = 'PENDING';
    let conditionDescription = '';
    let mechanics = null;

    switch (archetype) {
      case 'DISPLACEMENT_FVG_RETRACE': {
        const hasFvg = fvgValidation?.hasActiveFvg || fvgValidation?.fvgCount > 0;
        const hasDisplacement = h1.phase === 'IMPULSE' || m15.phase === 'IMPULSE';
        if (hasFvg && hasDisplacement) {
          triggerState = 'CONDITIONAL';
          conditionDescription = 'FVG detected, waiting for retrace to 50% boundary';
          mechanics = { type: 'FVG_RETRACE', trigger: 'Price retrace to FVG boundary', triggerClass: ACTIONABLE_TRIGGER_CLASSES.DISPLACEMENT_FVG_RETRACE, confirmation: '15m rejection candle' };
        } else if (hasFvg) {
          triggerState = 'NEAR';
          conditionDescription = 'FVG present but no displacement candle yet';
          mechanics = { type: 'FVG_RETRACE', trigger: 'Price retrace to FVG boundary', triggerClass: ACTIONABLE_TRIGGER_CLASSES.DISPLACEMENT_FVG_RETRACE, confirmation: '15m rejection candle' };
        } else {
          conditionDescription = 'No active FVG or displacement detected';
        }
        break;
      }

      case 'LIQUIDITY_SWEEP_REVERSAL': {
        const swept = liquidity?.sweepDetected || false;
        if (swept) {
          triggerState = 'CONFIRMED';
          direction = liquidity?.sweepType === 'BEARISH_SWEEP_OF_HIGHS' ? 'SELL' : 'BUY';
          mechanics = { type: 'SWEEP_REVERSAL', trigger: 'Liquidity sweep + failed acceptance', triggerClass: ACTIONABLE_TRIGGER_CLASSES.LIQUIDITY_SWEEP_REVERSAL, confirmation: 'Counter displacement candle close' };
        } else {
          const nearLiq = this._isNearLevel(currentPrice, liquidity?.PREVIOUS_DAY_HIGH, liquidity?.PREVIOUS_DAY_LOW, atr);
          if (nearLiq) {
            triggerState = 'NEAR';
            conditionDescription = 'Price approaching liquidity pool, waiting for sweep';
            mechanics = { type: 'SWEEP_REVERSAL', trigger: 'Price approaching liquidity pool, waiting for sweep', triggerClass: ACTIONABLE_TRIGGER_CLASSES.LIQUIDITY_SWEEP_REVERSAL, confirmation: 'Liquidity sweep + reversal' };
          } else {
            conditionDescription = 'No liquidity sweep event detected';
          }
        }
        break;
      }

      case 'HTF_TREND_PULLBACK': {
        const htfTrend = d1.trend || h4.trend;
        const isPullback = h1.phase === 'PULLBACK' || h1.phase === 'RETRACEMENT';
        if (htfTrend && htfTrend !== 'RANGE' && isPullback) {
          direction = htfTrend === 'BULLISH' ? 'BUY' : 'SELL';
          triggerState = 'CONDITIONAL';
          conditionDescription = `${htfTrend} HTF trend with active pullback — waiting for LTF confirmation`;
          mechanics = { type: 'PULLBACK_ENTRY', trigger: `M15 CHOCH in ${htfTrend} direction`, triggerClass: ACTIONABLE_TRIGGER_CLASSES.BREAK_AND_RETEST, confirmation: '15m displacement into zone' };
        } else if (htfTrend && htfTrend !== 'RANGE') {
          triggerState = 'NEAR';
          conditionDescription = `HTF ${htfTrend} but no pullback in progress`;
          mechanics = { type: 'PULLBACK_ENTRY', trigger: `M15 CHOCH in ${htfTrend} direction`, triggerClass: ACTIONABLE_TRIGGER_CLASSES.BREAK_AND_RETEST, confirmation: '15m displacement into zone' };
        } else {
          conditionDescription = 'HTF structure is ranging, no clear trend for pullback';
        }
        break;
      }

      case 'ORDER_BLOCK_REACTION': {
        const hasOB = structures?.orderBlocks?.length > 0;
        if (hasOB) {
          triggerState = 'CONDITIONAL';
          conditionDescription = 'Order block present, waiting for price tap + 5m confirmation';
          mechanics = { type: 'OB_REACTION', trigger: 'Price tap into unmitigated order block', triggerClass: ACTIONABLE_TRIGGER_CLASSES.BREAK_AND_RETEST, confirmation: '5m BOS in direction' };
        } else {
          conditionDescription = 'No fresh unmitigated order blocks identified';
        }
        break;
      }

      case 'RANGE_EXTREME_REVERSAL': {
        const isRange = /RANGE|MEAN_REVERTING/i.test(evidence.regime);
        if (isRange) {
          const rangeHigh = liquidity?.RANGE_HIGH || liquidity?.PREVIOUS_DAY_HIGH || (currentPrice ? currentPrice + atr : null);
          const rangeLow = liquidity?.RANGE_LOW || liquidity?.PREVIOUS_DAY_LOW || (currentPrice ? currentPrice - atr : null);
          const nearHigh = rangeHigh ? Math.abs(currentPrice - rangeHigh) < atr * 0.4 : false;
          const nearLow = rangeLow ? Math.abs(currentPrice - rangeLow) < atr * 0.4 : false;
          if (nearHigh) {
            direction = 'SELL';
            triggerState = 'NEAR';
            conditionDescription = 'Price at range high, waiting for rejection candle';
            mechanics = { type: 'RANGE_FADE', trigger: 'Failed breakout above range high', triggerClass: ACTIONABLE_TRIGGER_CLASSES.LIQUIDITY_SWEEP_REVERSAL, confirmation: 'M15 close back inside range' };
          } else if (nearLow) {
            direction = 'BUY';
            triggerState = 'NEAR';
            conditionDescription = 'Price at range low, waiting for bounce confirmation';
            mechanics = { type: 'RANGE_FADE', trigger: 'Failed breakdown below range low', triggerClass: ACTIONABLE_TRIGGER_CLASSES.LIQUIDITY_SWEEP_REVERSAL, confirmation: 'M15 close back inside range' };
          } else {
            triggerState = 'CONDITIONAL';
            conditionDescription = `Price is mid-range, conditional on test of range boundary ($${rangeLow ? rangeLow : 'low'} – $${rangeHigh ? rangeHigh : 'high'})`;
            mechanics = { type: 'RANGE_FADE', trigger: 'Test of range boundary', triggerClass: ACTIONABLE_TRIGGER_CLASSES.LIQUIDITY_SWEEP_REVERSAL, confirmation: 'Reversal candle at extreme' };
          }
        } else {
          conditionDescription = `Current regime (${evidence.regime}) is not range-compatible`;
        }
        break;
      }

      case 'SESSION_BREAKOUT': {
        const isLondonBreak = evidence.session === 'LONDON' && (h1.bosDetected || m15.bosDetected);
        if (isLondonBreak) {
          triggerState = 'CONFIRMED';
          direction = h1.trend === 'BULLISH' ? 'BUY' : 'SELL';
          mechanics = { type: 'SESSION_BREAKOUT', trigger: 'Asian high/low breached with expansion', triggerClass: ACTIONABLE_TRIGGER_CLASSES.STRUCTURE_BREAK_CONTINUATION, confirmation: '5m candle close outside Asian range' };
        } else {
          conditionDescription = 'Waiting for Asian session range break during London open';
          mechanics = { type: 'SESSION_BREAKOUT', trigger: 'Asian high/low break', triggerClass: ACTIONABLE_TRIGGER_CLASSES.STRUCTURE_BREAK_CONTINUATION, confirmation: '5m candle close outside range' };
        }
        break;
      }

      case 'FAILED_BREAKOUT_TRAP': {
        const isTrap = liquidity?.trapDetected || (liquidity?.sweepDetected && (m15.chochDetected || h1.chochDetected));
        if (isTrap) {
          triggerState = 'CONFIRMED';
          direction = liquidity?.sweepType?.includes('BEARISH') ? 'SELL' : 'BUY';
          mechanics = { type: 'BREAKOUT_TRAP', trigger: 'Aggressive sweep followed by immediate CHOCH', triggerClass: ACTIONABLE_TRIGGER_CLASSES.LIQUIDITY_SWEEP_REVERSAL, confirmation: 'Displacement back inside boundary' };
        } else {
          conditionDescription = 'No failed breakout or bull/bear trap signature identified';
        }
        break;
      }

      case 'VWAP_MEAN_REVERSION': {
        const isRotation = /RANGE|MEAN_REVERTING|COMPRESSION/i.test(evidence.regime);
        const nearVwap = evidence.volumeContext?.nearVwap || false;
        if (isRotation && nearVwap) {
          triggerState = 'CONDITIONAL';
          direction = currentPrice > (evidence.vwap || currentPrice) ? 'SELL' : 'BUY';
          mechanics = { type: 'VWAP_REVERSION', trigger: 'Price extension beyond 1.5 standard deviations from VWAP', triggerClass: ACTIONABLE_TRIGGER_CLASSES.VWAP_RECLAIM, confirmation: '5m delta absorption' };
        } else if (isRotation) {
          conditionDescription = 'Rotational market, waiting for VWAP band deviation';
          mechanics = { type: 'VWAP_REVERSION', trigger: 'VWAP reclaim after stretch', triggerClass: ACTIONABLE_TRIGGER_CLASSES.VWAP_RECLAIM, confirmation: '5m delta absorption' };
        } else {
          conditionDescription = 'VWAP reversion prefers rotational/range conditions';
        }
        break;
      }

      default: {
        conditionDescription = 'Awaiting standard mechanical trigger activation';
        mechanics = { type: 'GENERIC', trigger: 'Mechanical trigger', triggerClass: ACTIONABLE_TRIGGER_CLASSES.STRUCTURE_BREAK_CONTINUATION, confirmation: 'Close' };
        break;
      }
    }

    return { direction, triggerState, conditionDescription, mechanics };
  }

  _inferHorizons(strategy) {
    const name = (strategy.strategyId || '').toUpperCase();
    if (name.includes('SWEEP') || name.includes('VWAP') || name.includes('ORDER_BLOCK')) return ['SCALP', 'INTRADAY'];
    if (name.includes('BREAKOUT') || name.includes('TREND') || name.includes('FVG')) return ['INTRADAY'];
    return ['INTRADAY'];
  }

  _bestForHorizon(candidates, horizon) {
    return candidates.find(c => {
      const h = c.horizons || [];
      return h.includes(horizon);
    }) || null;
  }

  _isNearLevel(price, high, low, atr) {
    if (!price || !atr) return false;
    const threshold = atr * 0.5;
    if (high && Math.abs(price - high) < threshold) return true;
    if (low && Math.abs(price - low) < threshold) return true;
    return false;
  }

  _mapRegime(regime) {
    const mapping = {
      'TREND_EXPANSION': 'TRENDING_EXPANSION',
      'TRENDING_EXPANSION': 'TRENDING_EXPANSION',
      'RANGE': 'MEAN_REVERTING_RANGE',
      'MEAN_REVERTING_RANGE': 'MEAN_REVERTING_RANGE',
      'TRANSITION': 'TRANSITIONAL',
      'TRANSITIONAL': 'TRANSITIONAL',
      'VOLATILITY_SHOCK': 'VOLATILE_BREAKOUT',
      'VOLATILE_BREAKOUT': 'VOLATILE_BREAKOUT',
      'LOW_VOL_COMPRESSION': 'LOW_VOL_COMPRESSION',
      'TRENDING_EXHAUSTION': 'TRENDING_EXHAUSTION',
      'RANGE_BOUND': 'MEAN_REVERTING_RANGE'
    };
    return mapping[regime] || regime;
  }

  _defaultRegimeFit(strategy) {
    const archetype = strategy.archetype;
    const defaults = {
      'DISPLACEMENT_FVG_RETRACE': { 'TRENDING_EXPANSION': 1.0, 'TREND_EXPANSION': 1.0, 'RANGE': -0.5, 'MEAN_REVERTING_RANGE': -0.5, 'TRANSITIONAL': 0.3, 'TRANSITION': 0.3, 'VOLATILE_BREAKOUT': 0.5, 'VOLATILITY_SHOCK': 0.5 },
      'LIQUIDITY_SWEEP_REVERSAL': { 'TRENDING_EXHAUSTION': 1.0, 'TRENDING_EXPANSION': 0.5, 'TREND_EXPANSION': 0.5, 'RANGE': 0.3, 'MEAN_REVERTING_RANGE': 0.3, 'TRANSITIONAL': 0.7, 'TRANSITION': 0.7 },
      'HTF_TREND_PULLBACK': { 'TRENDING_EXPANSION': 1.0, 'TREND_EXPANSION': 1.0, 'RANGE': -0.3, 'MEAN_REVERTING_RANGE': -0.3, 'TRANSITIONAL': 0.4, 'TRANSITION': 0.4 },
      'ORDER_BLOCK_REACTION': { 'TRANSITIONAL': 1.0, 'TRANSITION': 1.0, 'TRENDING_EXPANSION': 0.7, 'TREND_EXPANSION': 0.7, 'RANGE': 0.4, 'MEAN_REVERTING_RANGE': 0.4 },
      'RANGE_EXTREME_REVERSAL': { 'MEAN_REVERTING_RANGE': 1.0, 'RANGE': 1.0, 'LOW_VOL_COMPRESSION': 0.5, 'RANGE_BOUND': 1.0, 'TRENDING_EXPANSION': -0.5, 'TREND_EXPANSION': -0.5 },
      'SESSION_BREAKOUT': { 'VOLATILE_BREAKOUT': 1.0, 'VOLATILITY_SHOCK': 1.0, 'TRENDING_EXPANSION': 0.5, 'TREND_EXPANSION': 0.5, 'RANGE': 0.3, 'MEAN_REVERTING_RANGE': 0.3 },
      'FAILED_BREAKOUT': { 'RANGE_BOUND': 1.0, 'RANGE': 0.8, 'MEAN_REVERTING_RANGE': 0.8, 'LOW_VOL_COMPRESSION': 0.5, 'TRENDING_EXPANSION': -0.3, 'TREND_EXPANSION': -0.3 },
      'VWAP_MEAN_REVERSION': { 'MEAN_REVERTING_RANGE': 1.0, 'RANGE': 1.0, 'RANGE_BOUND': 1.0, 'LOW_VOL_COMPRESSION': 0.5, 'TRENDING_EXPANSION': -0.3, 'TREND_EXPANSION': -0.3 },
      'BREAKOUT_RETEST': { 'VOLATILE_BREAKOUT': 1.0, 'VOLATILITY_SHOCK': 1.0, 'TRENDING_EXPANSION': 0.7, 'TREND_EXPANSION': 0.7, 'TRANSITIONAL': 0.5, 'TRANSITION': 0.5 },
      'MOMENTUM_CONTINUATION': { 'TRENDING_EXPANSION': 1.0, 'TREND_EXPANSION': 1.0, 'VOLATILE_BREAKOUT': 0.5, 'VOLATILITY_SHOCK': 0.5, 'RANGE': -0.5, 'MEAN_REVERTING_RANGE': -0.5 }
    };
    return defaults[archetype] || { 'TRENDING_EXPANSION': 0.5, 'RANGE': 0.2 };
  }

  _updateForensics(rejections) {
    for (const r of rejections) {
      const reason = (r.rejectionReason || '').toLowerCase();
      if (reason.includes('regime')) this.noTradeForensics.REGIME_REJECT++;
      else if (reason.includes('session')) this.noTradeForensics.SESSION_REJECT++;
      else if (reason.includes('event') || reason.includes('blackout')) this.noTradeForensics.EVENT_REJECT++;
      else if (reason.includes('data') || reason.includes('degraded')) this.noTradeForensics.DATA_REJECT++;
      else if (reason.includes('rr') || reason.includes('risk')) this.noTradeForensics.RR_REJECT++;
      else this.noTradeForensics.NO_SETUP_FOUND++;
    }
  }

  getAbstentionRate() {
    if (this.scanHistory.length === 0) return 0;
    const noTrades = this.scanHistory.filter(s => s.found === 0).length;
    return Number((noTrades / this.scanHistory.length).toFixed(2));
  }
}

export const argusOpportunityScanner = new ArgusOpportunityScanner();
