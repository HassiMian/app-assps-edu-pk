/**
 * JARVIS ARGUS 7.4 — Mathematical Signal Validator & Whole-Zone Execution Certification
 *
 * CORE INVARIANTS:
 * - DISPLAYED_SIGNAL == VALIDATED_SIGNAL
 * - RESPONSE_COMPOSER_LEVEL_MUTATION = 0
 * - WHOLE_ENTRY_ZONE_RR_VALIDATION = 1 (Abolishes midpoint-only RR defect)
 * - COST_ADJUSTED_RR_VALIDATION = 1 (Incorporates spread, slippage & stops level)
 * - BROKER STOPS LEVEL RESPECTED
 * - PRICE_LEVEL_WITHOUT_PROVENANCE = 0
 * - REAL_MONEY_EXECUTION = 0
 */

export const SIGNAL_STATUS = {
  RESEARCH_ONLY: 'RESEARCH_ONLY',
  CONDITIONAL: 'CONDITIONAL',
  VALIDATED: 'VALIDATED',
  CERTIFIED: 'CERTIFIED',
  REJECTED: 'REJECTED',
  NO_TRADE: 'NO_TRADE'
};

export const REJECTION_CODES = {
  INSUFFICIENT_RR_RATIO: 'INSUFFICIENT_RR_RATIO',
  WHOLE_ZONE_RR_VIOLATION: 'WHOLE_ZONE_RR_VIOLATION',
  COST_ADJUSTED_RR_VIOLATION: 'COST_ADJUSTED_RR_VIOLATION',
  STOPS_LEVEL_VIOLATION: 'BROKER_STOPS_LEVEL_VIOLATION',
  MISSING_OR_INVALID_ENTRY: 'MISSING_OR_INVALID_ENTRY',
  MISSING_OR_INVALID_STOP_LOSS: 'MISSING_OR_INVALID_STOP_LOSS',
  MISSING_OR_INVALID_TARGET_1: 'MISSING_OR_INVALID_TARGET_1',
  STRATEGY_REGIME_INELIGIBLE: 'STRATEGY_REGIME_INELIGIBLE',
  PRICE_LEVEL_PROVENANCE_MISSING: 'PRICE_LEVEL_PROVENANCE_MISSING'
};

export class ArgusMathematicalValidator {
  constructor() {
    this.name = 'ARGUS_Mathematical_Signal_Validator_7_4';
  }

  /**
   * Constructs a structured SignalCandidate object
   */
  createSignalCandidate(params = {}) {
    const entryPrice = Number(params.entryPrice || params.entry || 0);
    const entryZone = params.entryZone || { min: entryPrice, max: entryPrice, low: entryPrice, high: entryPrice };

    return {
      strategyId: params.strategyId || 'XAU_DISPLACEMENT_FVG_RETRACE_V1',
      strategyHash: params.strategyHash || '8d3811f584e03f0b2f6ef57a909ea2db131a1532057d39a3f2db78c9497e68fa',
      asset: params.asset || 'XAUUSD',
      brokerSymbol: params.brokerSymbol || 'XAUUSD',
      timestamp: params.timestamp || new Date().toISOString(),
      direction: (params.direction || 'BUY').toUpperCase(),
      entryType: params.entryType || 'LIMIT',
      entryPrice,
      entryZone,
      stopLoss: Number(params.stopLoss || params.sl || 0),
      targets: params.targets || (params.targetPrice ? [params.targetPrice] : []),
      invalidation: params.invalidation || null,
      expectedRR: Number(params.expectedRR || params.minRR || 2.0),
      regime: params.regime || 'UNKNOWN',
      session: params.session || 'UNKNOWN',
      eventRisk: params.eventRisk || 'LOW',
      spread: Number(params.spread !== undefined ? params.spread : 0),
      expectedSlippage: Number(params.expectedSlippage !== undefined ? params.expectedSlippage : (params.slippage !== undefined ? params.slippage : 0)),
      stopsLevel: Number(params.stopsLevel || params.stopsLevelPoints || 0),
      stopsLevelPoints: params.stopsLevelPoints !== undefined ? Number(params.stopsLevelPoints) : undefined,
      point: Number(params.point || 0.01),
      empiricalMetrics: params.empiricalMetrics || { minRR: 2.0, historicalWinRate: 0.58 },
      levelProvenance: params.levelProvenance || null,
      levelProvenanceRequired: Boolean(params.levelProvenanceRequired),
      status: params.status || SIGNAL_STATUS.RESEARCH_ONLY,
      validation: null
    };
  }

  /**
   * Validates a SignalCandidate mathematically against broker, whole-zone and cost constraints.
   * PHASE 9 & 10: Whole-Zone R:R & Cost-Adjusted Certification
   */
  validateSignal(candidate) {
    const minRequiredRR = Number(candidate.expectedRR || candidate.empiricalMetrics?.minRR || 2.0);
    const point = Number(candidate.point || 0.01);
    const stopsLevel = Number(candidate.stopsLevel || 0);
    const spread = Number(candidate.spread !== undefined ? candidate.spread : 0);
    const slippage = Number(candidate.expectedSlippage !== undefined ? candidate.expectedSlippage : 0);

    const entry = Number(candidate.entryPrice || candidate.entry || candidate.entryZone?.target || candidate.entryZone?.min || 0);
    const sl = Number(candidate.stopLossPrice || candidate.stopLoss || candidate.sl || 0);

    // Extract targets
    let t1 = 0;
    let t2 = 0;
    if (Array.isArray(candidate.targets) && candidate.targets.length > 0) {
      t1 = Number(candidate.targets[0]?.level || candidate.targets[0] || 0);
      t2 = Number(candidate.targets[1]?.level || candidate.targets[1] || t1);
    } else if (candidate.targetPrice) {
      t1 = Number(candidate.targetPrice);
      t2 = Number(candidate.target2Price || candidate.target2 || t1);
    } else if (candidate.target1) {
      t1 = Number(candidate.target1);
      t2 = Number(candidate.target2 || t1);
    }

    const errors = [];

    // 1. Existence check
    if (!entry || entry <= 0 || !Number.isFinite(entry)) errors.push('MISSING_OR_INVALID_ENTRY');
    if (!sl || sl <= 0 || !Number.isFinite(sl)) errors.push('MISSING_OR_INVALID_STOP_LOSS');
    if (!t1 || t1 <= 0 || !Number.isFinite(t1)) errors.push('MISSING_OR_INVALID_TARGET_1');

    if (errors.length > 0) {
      return {
        isValid: false,
        status: SIGNAL_STATUS.REJECTED,
        rejectionReason: errors.join('; '),
        mathematicalSummary: null
      };
    }

    // 2. Geometry check
    const isBuy = candidate.direction === 'BUY';
    const isSell = candidate.direction === 'SELL';

    if (!isBuy && !isSell) {
      errors.push(`INVALID_DIRECTION: ${candidate.direction}`);
    }

    if (isBuy) {
      if (sl >= entry) errors.push(`BUY_STOP_LOSS_GEOMETRY_INVALID: SL (${sl}) must be strictly below Entry (${entry})`);
      if (t1 <= entry) errors.push(`BUY_TARGET_GEOMETRY_INVALID: TP1 (${t1}) must be strictly above Entry (${entry})`);
      if (t2 < t1) errors.push(`BUY_TARGET_2_GEOMETRY_INVALID: TP2 (${t2}) must be >= TP1 (${t1})`);
    } else if (isSell) {
      if (sl <= entry) errors.push(`SELL_STOP_LOSS_GEOMETRY_INVALID: SL (${sl}) must be strictly above Entry (${entry})`);
      if (t1 >= entry) errors.push(`SELL_TARGET_GEOMETRY_INVALID: TP1 (${t1}) must be strictly below Entry (${entry})`);
      if (t2 > t1) errors.push(`SELL_TARGET_2_GEOMETRY_INVALID: TP2 (${t2}) must be <= TP1 (${t1})`);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        status: SIGNAL_STATUS.REJECTED,
        rejectionReason: errors.join('; '),
        mathematicalSummary: null
      };
    }

    // 3. Midpoint / Raw calculations
    const riskDistance = Number(Math.abs(entry - sl).toFixed(2));
    const rewardDistanceT1 = Number(Math.abs(t1 - entry).toFixed(2));
    const rewardDistanceT2 = Number(Math.abs(t2 - entry).toFixed(2));

    if (riskDistance <= 0) errors.push('RISK_DISTANCE_MUST_BE_STRICTLY_GREATER_THAN_ZERO');
    if (rewardDistanceT1 <= 0) errors.push('REWARD_DISTANCE_MUST_BE_STRICTLY_GREATER_THAN_ZERO');

    const rawRRT1 = Number((rewardDistanceT1 / (riskDistance || 1)).toFixed(2));
    const rawRRT2 = Number((rewardDistanceT2 / (riskDistance || 1)).toFixed(2));

    // 4. Broker Stops Level Enforcement
    let minStopsDistance = 0;
    if (candidate.stopsLevelPoints !== undefined && candidate.stopsLevelPoints > 0) {
      minStopsDistance = Number(candidate.stopsLevelPoints);
    } else if (stopsLevel > 0) {
      minStopsDistance = stopsLevel >= 20 ? Number((stopsLevel * point).toFixed(2)) : Number(stopsLevel);
    }
    if (minStopsDistance > 0 && riskDistance < minStopsDistance) {
      errors.push(`BROKER_STOPS_LEVEL_VIOLATION: Risk distance (${riskDistance}) is less than broker minimum stops level (${minStopsDistance})`);
    }

    // 5. Whole-Zone R:R Validation (Phase 9)
    let zoneMin = entry;
    let zoneMax = entry;
    if (candidate.entryZone) {
      if (typeof candidate.entryZone === 'object') {
        zoneMin = candidate.entryZone.min !== undefined ? Number(candidate.entryZone.min) : (candidate.entryZone.low !== undefined ? Number(candidate.entryZone.low) : entry);
        zoneMax = candidate.entryZone.max !== undefined ? Number(candidate.entryZone.max) : (candidate.entryZone.high !== undefined ? Number(candidate.entryZone.high) : entry);
      }
    }

    // Worst executable entry
    const worstEntry = isBuy ? zoneMax : zoneMin;
    const worstRiskDistance = Number(Math.abs(worstEntry - sl).toFixed(2));
    const worstRewardDistance = Number(Math.abs(t1 - worstEntry).toFixed(2));
    const worstCaseRR = worstRiskDistance > 0 ? Number((worstRewardDistance / worstRiskDistance).toFixed(2)) : 0;

    // Calculate maximum boundary of entry zone that legitimately satisfies minRequiredRR
    let validNarrowedZone = null;
    let isWholeZoneValid = true;

    if (worstCaseRR < minRequiredRR) {
      isWholeZoneValid = false;
      errors.push(`INSUFFICIENT_RR_RATIO: Worst executable entry in zone ($${worstEntry}) produces R:R of ${worstCaseRR}R, below minimum required ${minRequiredRR}R`);

      if (isBuy) {
        // (TP1 - E) / (E - SL) >= minRR  =>  E <= (TP1 + minRR * SL) / (1 + minRR)
        const maxValidEntry = Number(((t1 + minRequiredRR * sl) / (1 + minRequiredRR)).toFixed(2));
        if (maxValidEntry > sl && maxValidEntry >= zoneMin) {
          validNarrowedZone = { min: zoneMin, max: maxValidEntry };
        }
      } else {
        // (E - TP1) / (SL - E) >= minRR  =>  E >= (TP1 + minRR * SL) / (1 + minRR)
        const minValidEntry = Number(((t1 + minRequiredRR * sl) / (1 + minRequiredRR)).toFixed(2));
        if (minValidEntry < sl && minValidEntry <= zoneMax) {
          validNarrowedZone = { min: minValidEntry, max: zoneMax };
        }
      }
    }

    // 6. Cost-Adjusted R:R Calculation (Phase 10)
    // 6. Cost-Adjusted R:R Calculation (Phase 10)
    // BUY: Buy at Ask (worstEntry + spread + slippage), Exit at Bid (sl / t1)
    // SELL: Sell at Bid (worstEntry), Exit at Ask (sl + spread + slippage / t1 + spread + slippage)
    let costAdjustedRisk = worstRiskDistance;
    let costAdjustedReward = worstRewardDistance;
    let spreadOnlyRisk = worstRiskDistance;
    let spreadOnlyReward = worstRewardDistance;

    if (isBuy) {
      costAdjustedRisk = Number(((worstEntry + spread + slippage) - sl).toFixed(2));
      costAdjustedReward = Number((t1 - (worstEntry + spread + slippage)).toFixed(2));
      spreadOnlyRisk = Number(((worstEntry + spread) - sl).toFixed(2));
      spreadOnlyReward = Number((t1 - (worstEntry + spread)).toFixed(2));
    } else {
      costAdjustedRisk = Number(((sl + spread + slippage) - worstEntry).toFixed(2));
      costAdjustedReward = Number((worstEntry - (t1 + spread + slippage)).toFixed(2));
      spreadOnlyRisk = Number(((sl + spread) - worstEntry).toFixed(2));
      spreadOnlyReward = Number((worstEntry - (t1 + spread)).toFixed(2));
    }

    const costAdjustedWorstCaseRR = costAdjustedRisk > 0 ? Number((Math.max(0, costAdjustedReward) / costAdjustedRisk).toFixed(2)) : 0;
    const spreadOnlyRR = spreadOnlyRisk > 0 ? Number((Math.max(0, spreadOnlyReward) / spreadOnlyRisk).toFixed(2)) : 0;
    const spreadDrag = Number(Math.max(0, worstCaseRR - spreadOnlyRR).toFixed(2));
    const slippageDrag = Number(Math.max(0, spreadOnlyRR - costAdjustedWorstCaseRR).toFixed(2));

    if ((spread > 0 || slippage > 0) && costAdjustedWorstCaseRR < minRequiredRR && !errors.some(e => e.startsWith('INSUFFICIENT_RR_RATIO'))) {
      errors.push(`INSUFFICIENT_COST_ADJUSTED_RR: Cost-adjusted R:R (${costAdjustedWorstCaseRR}R) is below minimum required ${minRequiredRR}R after spread drag (${spreadDrag}R) and slippage drag (${slippageDrag}R)`);
    }

    // 7. Level Provenance Check (Phase 11)
    if (candidate.levelProvenanceRequired && (!candidate.levelProvenance || Object.keys(candidate.levelProvenance).length === 0)) {
      errors.push('PRICE_LEVEL_PROVENANCE_MISSING: Displayed levels must include authoritative derivation and timeframe provenance');
    }

    // 8. Regime Ineligibility Gate
    if (candidate.strategyId === 'XAU_DISPLACEMENT_FVG_RETRACE_V1' && candidate.regime === 'RANGE') {
      errors.push('STRATEGY_REGIME_INELIGIBLE: XAU_DISPLACEMENT_FVG_RETRACE_V1 cannot trade in RANGE regime (-1.05R empirical degradation)');
    }

    const mathematicalSummary = {
      ENTRY: entry,
      ENTRY_ZONE: { min: zoneMin, max: zoneMax },
      WORST_ENTRY: worstEntry,
      STOP_LOSS: sl,
      TARGET_1: t1,
      TARGET_2: t2,
      RISK_DISTANCE: riskDistance,
      REWARD_DISTANCE_T1: rewardDistanceT1,
      REWARD_DISTANCE_T2: rewardDistanceT2,
      RAW_RR: rawRRT1,
      RR_T1: rawRRT1,
      RR_T2: rawRRT2,
      WORST_CASE_RR: worstCaseRR,
      RAW_WORST_RR: worstCaseRR,
      COST_ADJUSTED_WORST_CASE_RR: costAdjustedWorstCaseRR,
      COST_ADJUSTED_WORST_RR: costAdjustedWorstCaseRR,
      SPREAD_INCLUDED: spread,
      SLIPPAGE_ESTIMATE: slippage,
      SPREAD_DRAG: spreadDrag,
      SLIPPAGE_DRAG: slippageDrag,
      STOPS_LEVEL_ENFORCED: stopsLevel > 0 ? minStopsDistance : 'RESPECTED',
      IS_WHOLE_ZONE_VALID: isWholeZoneValid,
      VALID_NARROWED_ZONE: validNarrowedZone,
      DISPLAYED_SIGNAL_EQUALS_VALIDATED_SIGNAL: errors.length === 0
    };

    if (errors.length > 0) {
      return {
        isValid: false,
        status: SIGNAL_STATUS.REJECTED,
        rejectionReason: errors.join('; '),
        riskRewardRatio: rawRRT1,
        worstCaseRR,
        costAdjustedWorstCaseRR,
        mathematicalSummary
      };
    }

    return {
      isValid: true,
      status: SIGNAL_STATUS.VALIDATED,
      rejectionReason: null,
      riskRewardRatio: rawRRT1,
      worstCaseRR,
      costAdjustedWorstCaseRR,
      mathematicalSummary
    };
  }

  /**
   * Validates conditional scenario levels.
   */
  validateConditionalScenario(scenario = {}) {
    const { triggerPrice, targetPrice, stopLossPrice, direction = 'BUY', minRR = 2.0, entryZone = null } = scenario;
    if (!triggerPrice || !targetPrice || !stopLossPrice) {
      return {
        isValid: false,
        label: 'NON_EXECUTABLE_REFERENCE_LEVELS',
        reason: 'Incomplete price parameters for scenario'
      };
    }

    const candidate = this.createSignalCandidate({
      direction,
      entryPrice: triggerPrice,
      entryZone: entryZone || { min: triggerPrice, max: triggerPrice },
      stopLoss: stopLossPrice,
      targets: [targetPrice],
      expectedRR: minRR
    });

    const val = this.validateSignal(candidate);
    if (!val.isValid) {
      return {
        isValid: false,
        status: SIGNAL_STATUS.REJECTED,
        label: 'NON_EXECUTABLE_REFERENCE_LEVELS',
        rr: val.mathematicalSummary?.RR_T1 || 0,
        worstCaseRR: val.worstCaseRR || 0,
        rejectionReason: val.rejectionReason,
        mathematicalSummary: val.mathematicalSummary,
        isExecutablePlan: false
      };
    }

    return {
      isValid: true,
      status: SIGNAL_STATUS.VALIDATED,
      label: 'VALIDATED_CONDITIONAL_SCENARIO',
      rr: val.mathematicalSummary.RR_T1,
      worstCaseRR: val.worstCaseRR,
      costAdjustedWorstCaseRR: val.costAdjustedWorstCaseRR,
      mathematicalSummary: val.mathematicalSummary,
      isExecutablePlan: true
    };
  }

  /**
   * Phase 9: Whole-Zone R:R Validation across every executable price
   */
  validateWholeZoneRR(params = {}) {
    const {
      direction = 'BUY',
      entryZone = null,
      entryZoneMin,
      entryZoneMax,
      minRR = Number(params.minRequiredRR || params.minRR || 2.0),
      spread = Number(params.spread !== undefined ? params.spread : 0),
      expectedSlippage = Number(params.expectedSlippage !== undefined ? params.expectedSlippage : (params.slippage !== undefined ? params.slippage : 0))
    } = params;

    const sl = Number(params.sl !== undefined ? params.sl : (params.stopLoss !== undefined ? params.stopLoss : params.stopLossPrice));
    const tp1 = Number(params.tp1 !== undefined ? params.tp1 : (params.target1 !== undefined ? params.target1 : (Array.isArray(params.targets) ? (params.targets[0]?.level || params.targets[0]) : params.targetPrice)));

    const minVal = Number(entryZoneMin || (typeof entryZone === 'object' ? (entryZone.min ?? entryZone.low) : (typeof entryZone === 'string' ? entryZone.split(/[–-]/)[0] : params.entryPrice || 0)));
    const maxVal = Number(entryZoneMax || (typeof entryZone === 'object' ? (entryZone.max ?? entryZone.high) : (typeof entryZone === 'string' ? entryZone.split(/[–-]/)[1] : minVal)));
    const midpoint = Number(((minVal + maxVal) / 2).toFixed(2));

    const candidate = this.createSignalCandidate({
      direction,
      entryPrice: midpoint,
      entryZone: { min: minVal, max: maxVal },
      stopLoss: sl,
      targets: [tp1],
      expectedRR: minRR,
      spread,
      expectedSlippage
    });

    const val = this.validateSignal(candidate);
    return {
      isValid: val.isValid && (val.mathematicalSummary?.IS_WHOLE_ZONE_VALID !== false),
      midpointRR: val.riskRewardRatio,
      worstCaseRR: val.worstCaseRR,
      costAdjustedRR: val.costAdjustedWorstCaseRR,
      validNarrowedZone: val.mathematicalSummary?.VALID_NARROWED_ZONE,
      rejectionReason: val.rejectionReason,
      mathematicalSummary: val.mathematicalSummary
    };
  }

  /**
   * Phase 10: Spread, Slippage & Broker Stops Level Validation
   */
  validateExecutionRealities(params = {}) {
    const minRR = params.minRR || 2.0;
    const candidate = this.createSignalCandidate({
      direction: params.direction || 'BUY',
      entryPrice: params.entryPrice,
      stopLoss: params.sl,
      targets: [params.tp1],
      spread: params.spread !== undefined ? params.spread : 0,
      expectedSlippage: params.slippage !== undefined ? params.slippage : (params.expectedSlippage !== undefined ? params.expectedSlippage : 0),
      stopsLevel: params.stopsLevelPoints || params.stopsLevel || 0,
      stopsLevelPoints: params.stopsLevelPoints,
      expectedRR: minRR
    });
    const val = this.validateSignal(candidate);
    const isValid = val.isValid && (val.costAdjustedWorstCaseRR >= minRR);
    return {
      isValid,
      rawRR: val.riskRewardRatio,
      costAdjustedRR: val.costAdjustedWorstCaseRR,
      rejectionReason: !isValid ? (val.rejectionReason || `Cost-adjusted R:R (${val.costAdjustedWorstCaseRR}R) below minimum required (${minRR}R)`) : null,
      mathematicalSummary: val.mathematicalSummary
    };
  }
}

export const argusMathematicalValidator = new ArgusMathematicalValidator();
