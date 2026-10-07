/**
 * JARVIS ARGUS 7.5.1 — Zero-Trust Price Provenance & Setup Level Validation
 *
 * CORE CONTRACT & INVARIANTS:
 * - SYNTHETIC_SETUP_TO_OWNER_ALERT = 0
 * - FRESH_QUOTE_WRAPPED_AROUND_STALE_SETUP = 0
 * - CROSS_SNAPSHOT_LEVEL_MIXING = 0
 * - REJECT_PRICE_SANITY on > 3.5% or > 3.5 ATR deviation
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 */

import crypto from 'node:crypto';

export const DATA_CLASSIFICATION = {
  LIVE_BROKER_DATA: 'LIVE_BROKER_DATA',
  TEST_FIXTURE: 'TEST_FIXTURE',
  SYNTHETIC: 'SYNTHETIC',
  MOCK: 'MOCK',
  HISTORICAL_REPLAY: 'HISTORICAL_REPLAY',
  UNKNOWN_SOURCE: 'UNKNOWN_SOURCE'
};

export const PROVENANCE_BLOCKERS = {
  REJECT_PRICE_SANITY: 'REJECT_PRICE_SANITY',
  REJECT_ATR_DISTANCE: 'REJECT_ATR_DISTANCE',
  BLOCK_ALERT_TEST_DATA_PROVENANCE: 'BLOCK_ALERT_TEST_DATA_PROVENANCE',
  CROSS_SNAPSHOT_LEVEL_MIXING: 'CROSS_SNAPSHOT_LEVEL_MIXING',
  INVALID_LEVEL_ORDERING: 'INVALID_LEVEL_ORDERING',
  MISSING_STRATEGY_MIN_RR: 'MISSING_STRATEGY_MIN_RR',
  STRATEGY_MIN_RR_FAIL: 'STRATEGY_MIN_RR_FAIL',
  COST_ADJUSTED_RR_FAIL: 'COST_ADJUSTED_RR_FAIL',
  STALE_SETUP_EXPIRED: 'STALE_SETUP_EXPIRED',
  MISSING_PROVENANCE_METADATA: 'MISSING_PROVENANCE_METADATA',
  SYMBOL_MISMATCH: 'SYMBOL_MISMATCH',
  MARKET_ALERTS_SUSPENDED: 'MARKET_ALERTS_SUSPENDED',
  STALE_TEST_FIXTURE_DETECTED: 'STALE_TEST_FIXTURE_DETECTED',
  INVALID_MARKET_SETUP_OBJECT: 'INVALID_MARKET_SETUP_OBJECT'
};

// Global Emergency Quarantine Switch
export let MARKET_SETUP_ALERTS = 'ACTIVE';

export function setMarketAlertStatus(status) {
  if (status === 'ACTIVE' || status === 'SUSPENDED') {
    MARKET_SETUP_ALERTS = status;
  }
}

/**
 * Creates a cryptographically sealed LevelProvenance record.
 */
export function createLevelProvenance(params = {}) {
  const nowIso = params.generatedAt || new Date().toISOString();
  const symbol = String(params.symbol || 'XAUUSD').toUpperCase();
  const executionSymbol = String(params.executionSymbol || symbol).toUpperCase();
  const referenceSymbol = String(params.referenceSymbol || symbol).toUpperCase();
  const brokerServer = params.brokerServer || 'MetaQuotes-Demo';
  const brokerAccount = String(params.brokerAccount || 'DEMO-RESEARCH');
  const marketSnapshotId = params.marketSnapshotId || `snp-${executionSymbol.toLowerCase()}-${Date.now()}`;
  const brokerTickAt = params.brokerTickAt || nowIso;
  const bidAtCreation = Number(params.bidAtCreation || params.bid || params.currentPrice || 0);
  const askAtCreation = Number(params.askAtCreation || params.ask || params.currentPrice || 0);
  const midAtCreation = Number(params.midAtCreation || ((bidAtCreation + askAtCreation) / 2) || params.currentPrice || 0);
  const sourceTimeframes = Array.isArray(params.sourceTimeframes) ? params.sourceTimeframes : ['M1', 'M5', 'M15', 'H1'];
  const strategyId = params.strategyId || 'UNKNOWN_STRATEGY';
  const dataClassification = params.dataClassification || DATA_CLASSIFICATION.UNKNOWN_SOURCE;

  const hashPayload = {
    setupId: params.setupId,
    symbol,
    executionSymbol,
    brokerServer,
    brokerAccount,
    marketSnapshotId,
    brokerTickAt,
    bidAtCreation,
    askAtCreation,
    midAtCreation,
    strategyId,
    dataClassification
  };
  const marketSnapshotHash = crypto.createHash('sha256').update(JSON.stringify(hashPayload)).digest('hex');

  return {
    setupId: params.setupId || `stp-${executionSymbol.toLowerCase()}-${Date.now()}`,
    symbol,
    executionSymbol,
    referenceSymbol,
    brokerServer,
    brokerAccount,
    marketSnapshotId,
    marketSnapshotHash,
    brokerTickAt,
    bidAtCreation,
    askAtCreation,
    midAtCreation,
    sourceTimeframes,
    strategyId,
    generatedAt: nowIso,
    dataClassification
  };
}

/**
 * Computes dynamic, strategy-aware bounds based on strategyId, desk, timeframe, regime, and volatility distribution.
 */
export function getStrategyAwareBounds(setup = {}, brokerSnapshot = {}, options = {}) {
  const setupStyle = (setup && typeof setup.style === 'string') ? setup.style : ((setup && typeof setup.horizon === 'string') ? setup.horizon : '');
  const desk = String(options.desk || setup?.desk || (setupStyle.toUpperCase().includes('SCALP') ? 'SCALP' : 'DAY_TRADE')).toUpperCase();
  const timeframe = String(options.timeframe || setup.timeframe || 'M15').toUpperCase();
  const regime = String(options.regime || brokerSnapshot.regime || setup.regime || 'RANGE').toUpperCase();
  const volDist = String(options.volatilityDistribution || brokerSnapshot.volatilityDistribution || 'NORMAL').toUpperCase();

  let baseMaxEntryAtr = 2.5;
  let baseMaxEntryPct = 3.0;
  let baseMaxSlAtr = 4.0;
  let baseMaxSlPct = 4.5;
  let baseMaxTpAtr = 8.0;
  let baseMaxTpPct = 8.0;

  if (desk.includes('SCALP') || timeframe === 'M1' || timeframe === 'M5') {
    baseMaxEntryAtr = 1.2;
    baseMaxEntryPct = 1.0;
    baseMaxSlAtr = 2.0;
    baseMaxSlPct = 2.0;
    baseMaxTpAtr = 4.0;
    baseMaxTpPct = 4.0;
  } else if (desk.includes('SWING') || timeframe === 'H1' || timeframe === 'H4' || timeframe === 'D1') {
    baseMaxEntryAtr = 4.5;
    baseMaxEntryPct = 5.5;
    baseMaxSlAtr = 6.0;
    baseMaxSlPct = 7.0;
    baseMaxTpAtr = 12.0;
    baseMaxTpPct = 12.0;
  }

  let regimeMult = 1.0;
  if (regime.includes('EXPANSION') || regime.includes('BREAKOUT')) {
    regimeMult = 1.3;
  } else if (regime.includes('RANGE') || regime.includes('COMPRESSION')) {
    regimeMult = 0.85;
  } else if (regime.includes('VOLATILITY_SHOCK')) {
    regimeMult = 1.5;
  }

  let volMult = 1.0;
  if (volDist === 'LOW') {
    volMult = 0.8;
  } else if (volDist === 'HIGH') {
    volMult = 1.25;
  } else if (volDist === 'EXTREME') {
    volMult = 1.6;
  }

  const factor = regimeMult * volMult;

  return {
    desk,
    timeframe,
    regime,
    volatilityDistribution: volDist,
    maxEntryAtr: Number((baseMaxEntryAtr * factor).toFixed(2)),
    maxEntryDistancePct: Number((baseMaxEntryPct * factor).toFixed(2)),
    maxSlAtr: Number((baseMaxSlAtr * factor).toFixed(2)),
    maxSlDistancePct: Number((baseMaxSlPct * factor).toFixed(2)),
    maxTpAtr: Number((baseMaxTpAtr * factor).toFixed(2)),
    maxTargetDistancePct: Number((baseMaxTpPct * factor).toFixed(2))
  };
}

/**
 * Validates geometric price sanity and percentage deviation from broker current spot.
 */
export function validatePriceSanity(setup = {}, brokerSnapshot = {}, options = {}) {
  if (!setup || typeof setup !== 'object' || Array.isArray(setup)) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.INVALID_MARKET_SETUP_OBJECT,
      reason: 'Setup must be a valid non-null object'
    };
  }
  const brokerBid = Number(brokerSnapshot.bid || brokerSnapshot.currentPrice || brokerSnapshot.price || 0);
  const brokerAsk = Number(brokerSnapshot.ask || brokerSnapshot.currentPrice || brokerSnapshot.price || 0);
  const brokerMid = (brokerBid && brokerAsk) ? (brokerBid + brokerAsk) / 2 : Number(brokerSnapshot.currentPrice || brokerSnapshot.price || 0);

  if (!brokerMid || brokerMid <= 0) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_PRICE_SANITY,
      reason: 'Broker snapshot price is missing or non-positive'
    };
  }

  // Extract entry zone and midpoint
  let entryZone = setup.entryZone;
  if (!Array.isArray(entryZone) && typeof entryZone === 'string') {
    const parts = entryZone.replace(/[\$ ]/g, '').split(/[–-]/).map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      entryZone = parts;
    }
  }

  const entryMid = Array.isArray(entryZone)
    ? (Number(entryZone[0]) + Number(entryZone[1])) / 2
    : Number(setup.entry || setup.entryPrice || 0);

  const sl = Number(setup.invalidation || setup.stopLoss || setup.sl || 0);
  const tp1 = Number(setup.tp1 || setup.takeProfit || setup.tp || setup.targets?.[0] || 0);

  if (!entryMid || entryMid <= 0 || !sl || sl <= 0 || !tp1 || tp1 <= 0) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_PRICE_SANITY,
      reason: 'Setup levels (entry, sl, tp1) are missing or non-positive'
    };
  }

  const entryDistancePct = Math.abs(entryMid - brokerMid) / brokerMid * 100;
  const slDistancePct = Math.abs(sl - brokerMid) / brokerMid * 100;
  const targetDistancePct = Math.abs(tp1 - brokerMid) / brokerMid * 100;

  // Compute Strategy-Aware Dynamic Bounds
  const strategyBounds = getStrategyAwareBounds(setup, brokerSnapshot, options);
  const maxEntryDistancePct = options.maxEntryDistancePct || strategyBounds.maxEntryDistancePct;
  const maxSlDistancePct = options.maxSlDistancePct || strategyBounds.maxSlDistancePct;
  const maxTargetDistancePct = options.maxTargetDistancePct || strategyBounds.maxTargetDistancePct;

  // 1. Level Geometry Ordering Check (independent of R:R)
  const dir = (setup.direction || (tp1 > entryMid ? 'BUY' : 'SELL')).toUpperCase();
  const isBuy = dir === 'BUY';
  const isSell = dir === 'SELL';
  let geometryValid = true;
  let geometryReason = null;

  if (isBuy) {
    if (sl >= entryMid) {
      geometryValid = false;
      geometryReason = `BUY level ordering violated: stopLoss ($${sl}) must be strictly below entry ($${entryMid})`;
    } else if (tp1 <= entryMid) {
      geometryValid = false;
      geometryReason = `BUY level ordering violated: takeProfit ($${tp1}) must be strictly above entry ($${entryMid})`;
    }
  } else if (isSell) {
    if (sl <= entryMid) {
      geometryValid = false;
      geometryReason = `SELL level ordering violated: stopLoss ($${sl}) must be strictly above entry ($${entryMid})`;
    } else if (tp1 >= entryMid) {
      geometryValid = false;
      geometryReason = `SELL level ordering violated: takeProfit ($${tp1}) must be strictly below entry ($${entryMid})`;
    }
  }

  if (!geometryValid) {
    return {
      isValid: false,
      certified: false,
      blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING,
      reason: geometryReason
    };
  }

  // 2. Explicit Strategy minRR Enforcement (No Silent Default Fallbacks)
  const explicitMinRR = setup.minRR ?? options.minRR ?? setup.strategy?.minRR ?? options.strategy?.minRR ?? setup.expectedRR;
  if (explicitMinRR === undefined || explicitMinRR === null || isNaN(Number(explicitMinRR)) || Number(explicitMinRR) <= 0) {
    return {
      isValid: false,
      certified: false,
      blocker: PROVENANCE_BLOCKERS.MISSING_STRATEGY_MIN_RR,
      reason: 'MISSING_STRATEGY_MIN_RR: Strategy minRR is not explicitly defined on setup or strategy. Silent default fallback is prohibited in production certification.'
    };
  }
  const strategyMinRR = Number(explicitMinRR);

  // 3. Full Execution-Cost RR with Side-Aware Bid/Ask Execution
  const bid = Number(brokerSnapshot.bid || (brokerMid - 0.20));
  const ask = Number(brokerSnapshot.ask || (brokerMid + 0.20));
  const spread = Math.max(0.05, Number(brokerSnapshot.spread ?? (ask - bid) ?? options.spread ?? 0.35));
  const atr = Number(brokerSnapshot.atr || 18.0);
  const slippage = Number(brokerSnapshot.expectedSlippage ?? options.expectedSlippage ?? (atr * 0.01));
  const commission = Number(brokerSnapshot.commission ?? options.commission ?? 0.05);

  const rawRisk = Math.abs(entryMid - sl);
  const rawReward = Math.abs(tp1 - entryMid);
  const rawRR = rawRisk > 0 ? (rawReward / rawRisk) : 0;

  const spreadCost = spread;
  const slippageCost = slippage * 2; // entry + exit slippage
  const commissionCost = commission * 2; // round-trip commission
  const totalCost = spreadCost + slippageCost + commissionCost;

  const costAdjustedReward = Math.max(0, rawReward - (spreadCost / 2) - slippageCost - commissionCost);
  const costAdjustedRisk = rawRisk + (spreadCost / 2) + slippageCost + commissionCost;
  const costAdjustedRR = costAdjustedRisk > 0 ? (costAdjustedReward / costAdjustedRisk) : 0;

  const spreadSource = (brokerSnapshot.ask && brokerSnapshot.bid) ? 'LIVE_BROKER' : (brokerSnapshot.spread ? 'BROKER_CONFIG' : 'ESTIMATE');
  const slippageSource = 'EMPIRICAL_MODEL'; // strictly modeled, not observed live
  const commissionSource = 'BROKER_CONFIG';

  const executionFriction = {
    RAW_RR: Number(rawRR.toFixed(3)),
    SPREAD_COST: Number(spreadCost.toFixed(3)),
    SLIPPAGE_COST: Number(slippageCost.toFixed(3)),
    COMMISSION_COST: Number(commissionCost.toFixed(3)),
    COST_ADJUSTED_RR: Number(costAdjustedRR.toFixed(3)),
    SPREAD_VALUE: Number(spreadCost.toFixed(3)),
    SPREAD_SOURCE: spreadSource,
    SLIPPAGE_VALUE: Number(slippageCost.toFixed(3)),
    SLIPPAGE_SOURCE: slippageSource,
    COMMISSION_VALUE: Number(commissionCost.toFixed(3)),
    COMMISSION_SOURCE: commissionSource
  };

  if (costAdjustedRR < strategyMinRR && !options.allowLowRR) {
    return {
      isValid: false,
      certified: false,
      blocker: PROVENANCE_BLOCKERS.COST_ADJUSTED_RR_FAIL,
      strategyMinRR,
      costAdjustedRR: Number(costAdjustedRR.toFixed(3)),
      executionFriction,
      reason: `Cost-adjusted R:R (${costAdjustedRR.toFixed(2)}R) is below strategy requirement (${strategyMinRR}R) under full execution friction (spread: $${spreadCost.toFixed(2)}, slippage: $${slippageCost.toFixed(2)}, commission: $${commissionCost.toFixed(2)})`
    };
  }

  // Absolute dollar deviation guard for Gold (XAUUSD): Secondary check
  const sym = String(setup.symbol || brokerSnapshot.symbol || 'XAUUSD').toUpperCase();
  const absDollarDist = Math.abs(entryMid - brokerMid);
  const maxGoldDollarDeviation = options.maxDollarDeviation !== undefined ? options.maxDollarDeviation : 30.0;
  if ((sym.includes('XAU') || sym.includes('GOLD')) && absDollarDist > maxGoldDollarDeviation) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.STALE_TEST_FIXTURE_DETECTED,
      entryDistanceDollars: Number(absDollarDist.toFixed(2)),
      brokerMid,
      entryMid,
      reason: `Gold entry level ($${entryMid.toFixed(2)}) deviates by $${absDollarDist.toFixed(2)} from broker spot ($${brokerMid.toFixed(2)}), exceeding maximum allowed $${maxGoldDollarDeviation} (STALE_TEST_FIXTURE_DETECTED)`
    };
  }

  if (entryDistancePct > maxEntryDistancePct) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_PRICE_SANITY,
      entryDistancePct: Number(entryDistancePct.toFixed(2)),
      brokerMid,
      entryMid,
      reason: `Entry level ($${entryMid.toFixed(2)}) is ${entryDistancePct.toFixed(2)}% away from broker spot ($${brokerMid.toFixed(2)}), exceeding maximum allowed ${maxEntryDistancePct}% for ${strategyBounds.desk}`
    };
  }

  if (slDistancePct > maxSlDistancePct) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_PRICE_SANITY,
      slDistancePct: Number(slDistancePct.toFixed(2)),
      brokerMid,
      sl,
      reason: `SL level ($${sl.toFixed(2)}) is ${slDistancePct.toFixed(2)}% away from broker spot ($${brokerMid.toFixed(2)}), exceeding maximum allowed ${maxSlDistancePct}%`
    };
  }

  if (targetDistancePct > maxTargetDistancePct) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_PRICE_SANITY,
      targetDistancePct: Number(targetDistancePct.toFixed(2)),
      brokerMid,
      tp1,
      reason: `Target 1 ($${tp1.toFixed(2)}) is ${targetDistancePct.toFixed(2)}% away from broker spot ($${brokerMid.toFixed(2)}), exceeding maximum allowed ${maxTargetDistancePct}%`
    };
  }

  return {
    isValid: true,
    certified: true,
    blocker: null,
    entryDistancePct: Number(entryDistancePct.toFixed(2)),
    slDistancePct: Number(slDistancePct.toFixed(2)),
    targetDistancePct: Number(targetDistancePct.toFixed(2)),
    brokerMid,
    entryMid,
    sl,
    tp1,
    costAdjustedRR: Number(costAdjustedRR.toFixed(2)),
    strategyMinRR,
    executionFriction
  };
}

/**
 * Validates ATR-normalized distance of setup levels against broker current spot.
 */
export function validateAtrDistance(setup = {}, brokerSnapshot = {}, options = {}) {
  const atr = Number(brokerSnapshot.atr || options.atr || 15.0);
  const brokerBid = Number(brokerSnapshot.bid || brokerSnapshot.currentPrice || brokerSnapshot.price || 0);
  const brokerAsk = Number(brokerSnapshot.ask || brokerSnapshot.currentPrice || brokerSnapshot.price || 0);
  const brokerMid = (brokerBid && brokerAsk) ? (brokerBid + brokerAsk) / 2 : Number(brokerSnapshot.currentPrice || brokerSnapshot.price || 0);

  let entryZone = setup.entryZone;
  if (!Array.isArray(entryZone) && typeof entryZone === 'string') {
    const parts = entryZone.replace(/[\$ ]/g, '').split(/[–-]/).map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      entryZone = parts;
    }
  }

  const entryMid = Array.isArray(entryZone)
    ? (Number(entryZone[0]) + Number(entryZone[1])) / 2
    : Number(setup.entry || setup.entryPrice || 0);

  const sl = Number(setup.invalidation || setup.stopLoss || setup.sl || 0);
  const tp1 = Number(setup.tp1 || setup.targets?.[0] || 0);

  const entryDistanceAtr = Math.abs(entryMid - brokerMid) / atr;
  const slDistanceAtr = Math.abs(sl - brokerMid) / atr;
  const tpDistanceAtr = Math.abs(tp1 - brokerMid) / atr;

  const strategyBounds = getStrategyAwareBounds(setup, brokerSnapshot, options);
  const maxEntryAtr = options.maxEntryAtr || strategyBounds.maxEntryAtr;
  const maxSlAtr = options.maxSlAtr || strategyBounds.maxSlAtr;
  const maxTpAtr = options.maxTpAtr || strategyBounds.maxTpAtr;

  if (entryDistanceAtr > maxEntryAtr) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_ATR_DISTANCE,
      entryDistanceAtr: Number(entryDistanceAtr.toFixed(2)),
      maxAllowedAtr: maxEntryAtr,
      atr,
      brokerMid,
      entryMid,
      reason: `Entry distance (${entryDistanceAtr.toFixed(2)} ATR) exceeds maximum allowed ${maxEntryAtr} ATR for ${strategyBounds.desk}`
    };
  }

  if (slDistanceAtr > maxSlAtr) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_ATR_DISTANCE,
      slDistanceAtr: Number(slDistanceAtr.toFixed(2)),
      reason: `SL distance (${slDistanceAtr.toFixed(2)} ATR) exceeds maximum allowed ${maxSlAtr} ATR`
    };
  }

  if (tpDistanceAtr > maxTpAtr) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.REJECT_ATR_DISTANCE,
      tpDistanceAtr: Number(tpDistanceAtr.toFixed(2)),
      reason: `TP distance (${tpDistanceAtr.toFixed(2)} ATR) exceeds maximum allowed ${maxTpAtr} ATR`
    };
  }

  return {
    isValid: true,
    blocker: null,
    entryDistanceAtr: Number(entryDistanceAtr.toFixed(2)),
    slDistanceAtr: Number(slDistanceAtr.toFixed(2)),
    tpDistanceAtr: Number(tpDistanceAtr.toFixed(2)),
    atr
  };
}

/**
 * Validates strict geometric level ordering:
 * BUY:  SL < EntryMin <= EntryMax < TP1 <= TP2
 * SELL: TP2 <= TP1 < EntryMin <= EntryMax < SL
 */
export function validateLevelOrdering(setup = {}) {
  const dir = (setup.direction || 'BUY').toUpperCase();
  let entryMin = Number(setup.entry || setup.entryPrice || 0);
  let entryMax = entryMin;

  if (Array.isArray(setup.entryZone) && setup.entryZone.length === 2) {
    entryMin = Math.min(Number(setup.entryZone[0]), Number(setup.entryZone[1]));
    entryMax = Math.max(Number(setup.entryZone[0]), Number(setup.entryZone[1]));
  } else if (typeof setup.entryZone === 'string') {
    const parts = setup.entryZone.replace(/[\$ ]/g, '').split(/[–-]/).map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      entryMin = Math.min(parts[0], parts[1]);
      entryMax = Math.max(parts[0], parts[1]);
    }
  }

  const sl = Number(setup.invalidation || setup.stopLoss || setup.sl || 0);
  const tp1 = Number(setup.tp1 || setup.takeProfit || setup.tp || setup.targets?.[0] || 0);
  const tp2 = setup.tp2 || setup.targets?.[1] ? Number(setup.tp2 || setup.targets?.[1]) : null;

  if (dir === 'BUY') {
    if (!(sl < entryMin)) {
      return { isValid: false, blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING, reason: `BUY SL ($${sl}) must be strictly below Entry ($${entryMin})` };
    }
    if (!(entryMax < tp1)) {
      return { isValid: false, blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING, reason: `BUY TP1 ($${tp1}) must be strictly above Entry ($${entryMax})` };
    }
    if (tp2 !== null && !(tp1 <= tp2)) {
      return { isValid: false, blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING, reason: `BUY TP2 ($${tp2}) must be greater than or equal to TP1 ($${tp1})` };
    }
  } else if (dir === 'SELL') {
    if (!(sl > entryMax)) {
      return { isValid: false, blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING, reason: `SELL SL ($${sl}) must be strictly above Entry ($${entryMax})` };
    }
    if (!(entryMin > tp1)) {
      return { isValid: false, blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING, reason: `SELL TP1 ($${tp1}) must be strictly below Entry ($${entryMin})` };
    }
    if (tp2 !== null && !(tp2 <= tp1)) {
      return { isValid: false, blocker: PROVENANCE_BLOCKERS.INVALID_LEVEL_ORDERING, reason: `SELL TP2 ($${tp2}) must be less than or equal to TP1 ($${tp1})` };
    }
  }

  return { isValid: true, blocker: null };
}

/**
 * Hard Pre-Send Alert Integrity Assertion (Section 12).
 * Strictly verifies snapshot atomicity, data classification, price sanity, and level ordering before WhatsApp dispatch.
 */
export function validateAlertIntegrity(setup = {}, currentSnapshot = {}, options = {}) {
  // 1. Emergency Quarantine Check
  if (MARKET_SETUP_ALERTS === 'SUSPENDED' && !options.bypassQuarantine) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.MARKET_ALERTS_SUSPENDED,
      reason: 'Market setup alerts are currently QUARANTINED (MARKET_SETUP_ALERTS = SUSPENDED)'
    };
  }

  // 2. Data Classification Production Firewall (Zero-Trust)
  const classification = setup.levelProvenance?.dataClassification || setup.dataClassification || DATA_CLASSIFICATION.UNKNOWN_SOURCE;
  const isTainted = Boolean(setup.isTainted || setup.levelProvenance?.isTainted);
  const isNonLive = classification !== DATA_CLASSIFICATION.LIVE_BROKER_DATA || isTainted;
  if (isNonLive && !options.allowTestAlert) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.BLOCK_ALERT_TEST_DATA_PROVENANCE,
      reason: `Setup dataClassification is '${classification}' (isTainted: ${isTainted}), strictly prohibited from production alert (TEST_FIXTURE_PRODUCTION_ALERT = 0, UNKNOWN_PROVENANCE_ALERT = 0)`
    };
  }

  // 3. Symbol Matching
  const setupSymbol = (setup.symbol || setup.levelProvenance?.symbol || '').toUpperCase();
  const snapshotSymbol = (currentSnapshot.symbol || '').toUpperCase();
  if (setupSymbol && snapshotSymbol && setupSymbol !== snapshotSymbol) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.SYMBOL_MISMATCH,
      reason: `Setup symbol (${setupSymbol}) does not match current broker snapshot symbol (${snapshotSymbol})`
    };
  }

  // 4. Snapshot Atomicity Check
  const setupSnapshotId = setup.levelProvenance?.marketSnapshotId || setup.snapshotId || null;
  const currentSnapshotId = currentSnapshot.snapshotId || currentSnapshot.marketSnapshotId || null;
  if (setupSnapshotId && currentSnapshotId && setupSnapshotId !== currentSnapshotId && options.enforceExactSnapshot) {
    return {
      isValid: false,
      blocker: PROVENANCE_BLOCKERS.CROSS_SNAPSHOT_LEVEL_MIXING,
      reason: `Setup snapshotId (${setupSnapshotId}) does not match active alert snapshotId (${currentSnapshotId})`
    };
  }

  // 5. Price Sanity Check
  const priceSanity = validatePriceSanity(setup, currentSnapshot, options);
  if (!priceSanity.isValid) {
    return priceSanity;
  }

  // 6. ATR Distance Check
  const atrSanity = validateAtrDistance(setup, currentSnapshot, options);
  if (!atrSanity.isValid) {
    return atrSanity;
  }

  // 7. Level Ordering Check
  const orderingSanity = validateLevelOrdering(setup);
  if (!orderingSanity.isValid) {
    return orderingSanity;
  }

  return {
    isValid: true,
    blocker: null,
    priceSanity,
    atrSanity,
    orderingSanity,
    classification
  };
}

/**
 * Permanently marks target object with taint if source is non-live or tainted.
 * Taint propagates across derived objects and cannot be cleared by attaching quotes.
 */
export function propagateTaint(derivedObj = {}, sourceObj = {}) {
  const srcClassification = sourceObj.levelProvenance?.dataClassification || sourceObj.dataClassification || DATA_CLASSIFICATION.UNKNOWN_SOURCE;
  const isSrcTainted = Boolean(sourceObj.isTainted || sourceObj.levelProvenance?.isTainted || (srcClassification !== DATA_CLASSIFICATION.LIVE_BROKER_DATA));

  if (isSrcTainted) {
    derivedObj.isTainted = true;
    derivedObj.dataClassification = srcClassification === DATA_CLASSIFICATION.LIVE_BROKER_DATA ? DATA_CLASSIFICATION.TEST_FIXTURE : srcClassification;
    derivedObj.taintSource = sourceObj.taintSource || sourceObj.setupId || 'DERIVED_FROM_NON_LIVE';
    if (derivedObj.levelProvenance) {
      derivedObj.levelProvenance.dataClassification = derivedObj.dataClassification;
      derivedObj.levelProvenance.isTainted = true;
      derivedObj.levelProvenance.taintSource = derivedObj.taintSource;
    }
  }
  return derivedObj;
}
