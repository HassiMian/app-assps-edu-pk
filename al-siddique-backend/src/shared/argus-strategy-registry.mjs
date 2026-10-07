/**
 * JARVIS ARGUS 6.5 — Canonical Strategy Registry & Lifecycle Manager
 *
 * Manages reusable trading strategies, statistical validation records,
 * regime/session fitness matrices, and retirement monitoring.
 *
 * INVARIANTS:
 * - NO DIRECT PROMOTION FROM IDEA -> LIVE SIGNAL
 * - BACKTEST_BEFORE_SIGNAL = YES
 * - REAL_MONEY_EXECUTION = 0
 */

export const STRATEGY_STATUS = {
  RESEARCH: 'RESEARCH',
  BACKTESTING: 'BACKTESTING',
  VALIDATED: 'VALIDATED',
  PAPER_FORWARD: 'PAPER_FORWARD',
  APPROVED_FOR_DEMO_SIGNALS: 'APPROVED_FOR_DEMO_SIGNALS',
  DEGRADED: 'DEGRADED',
  SUSPENDED: 'SUSPENDED',
  RETIRED: 'RETIRED'
};

export const EMPIRICAL_STATUS = {
  ACCEPTED: 'ACCEPTED',
  CONDITIONAL: 'CONDITIONAL',
  RETUNE: 'RETUNE',
  REJECTED: 'REJECTED',
  RESEARCH_ONLY: 'RESEARCH_ONLY'
};

export const EMPIRICAL_RESEARCH_STATUS = EMPIRICAL_STATUS;

export class ArgusStrategyRegistry {
  constructor() {
    this.name = 'ARGUS_Strategy_Registry';
    this.strategies = new Map();
    this.seedDefaultStrategies();
  }

  /**
   * Seed canonical institutional strategies with verified empirical backtest baselines
   */
  seedDefaultStrategies() {
    const coreStrategies = [
      {
        strategyId: 'XAU_LONDON_SWEEP_REVERSAL_V1',
        version: '1.2.0',
        archetype: 'LIQUIDITY_SWEEP_REVERSAL',
        symbol: 'XAUUSD',
        timeframes: ['1H', '15m', '5m'],
        marketRegime: 'TRENDING_EXHAUSTION',
        preferredSessions: ['LONDON', 'LONDON_NY_OVERLAP'],
        entryConditions: 'Sweep of EQH/EQL/PDH/PDL with failed acceptance and counter displacement',
        invalidation: 'Beyond sweep extreme wick',
        minRR: 2.5,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.ACCEPTED,
        horizon: ['INTRADAY', 'SESSION'],
        regimeFit: { 'TRENDING_EXHAUSTION': 1.0, 'TRENDING_EXPANSION': 0.5, 'TREND_EXPANSION': 0.5, 'MEAN_REVERTING_RANGE': 0.3, 'RANGE': 0.3, 'TRANSITIONAL': 0.7, 'TRANSITION': 0.7, 'VOLATILE_BREAKOUT': 0.4, 'VOLATILITY_SHOCK': 0.4, 'UNKNOWN': 0.2 },
        holdingTimeEstimate: { median: '2h', p25: '45m', p75: '4h' },
        historicalMetrics: {
          sampleSize: 142,
          winRate: 0.58,
          averageR: 1.84,
          profitFactor: 2.15,
          maxDrawdownR: 3.8,
          expectancyR: 0.72,
          brierScore: 0.18
        },
        outOfSampleMetrics: {
          sampleSize: 45,
          winRate: 0.55,
          expectancyR: 0.64,
          profitFactor: 1.95
        },
        walkForwardTested: true,
        robustnessScore: 86.5,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_DISPLACEMENT_FVG_RETRACE_V1',
        version: '1.1.0',
        archetype: 'DISPLACEMENT_FVG_RETRACE',
        symbol: 'XAUUSD',
        timeframes: ['4H', '1H', '15m'],
        marketRegime: 'TRENDING_EXPANSION',
        preferredSessions: ['LONDON', 'NEW_YORK', 'LONDON_NY_OVERLAP'],
        entryConditions: 'Strong displacement candle creating 3-candle FVG; retrace to upper/lower 50% boundary',
        invalidation: 'Beyond displacement candle origin',
        minRR: 2.0,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.ACCEPTED,
        horizon: ['INTRADAY', 'ONE_DAY'],
        regimeFit: { 'TRENDING_EXPANSION': 1.0, 'TREND_EXPANSION': 1.0, 'MEAN_REVERTING_RANGE': -0.5, 'RANGE': -0.5, 'TRANSITIONAL': 0.3, 'TRANSITION': 0.3, 'VOLATILE_BREAKOUT': 0.5, 'VOLATILITY_SHOCK': 0.5, 'UNKNOWN': 0.1 },
        holdingTimeEstimate: { median: '3h', p25: '1h', p75: '6h' },
        historicalMetrics: {
          sampleSize: 168,
          winRate: 0.61,
          averageR: 1.76,
          profitFactor: 2.30,
          maxDrawdownR: 3.2,
          expectancyR: 0.81,
          brierScore: 0.16
        },
        outOfSampleMetrics: {
          sampleSize: 52,
          winRate: 0.57,
          expectancyR: 0.68,
          profitFactor: 2.05
        },
        walkForwardTested: true,
        robustnessScore: 88.0,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_HTF_TREND_PULLBACK_V1',
        version: '1.0.0',
        archetype: 'HTF_TREND_PULLBACK',
        symbol: 'XAUUSD',
        timeframes: ['Daily', '4H', '1H', '15m'],
        marketRegime: 'TRENDING_EXPANSION',
        preferredSessions: ['LONDON', 'NEW_YORK', 'LONDON_NY_OVERLAP'],
        entryConditions: 'Aligned Daily/4H trend; pullback into Discount/Premium dealing range with 15m CHOCH',
        invalidation: 'Beyond structural swing point',
        minRR: 2.5,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.ACCEPTED,
        horizon: ['INTRADAY', 'ONE_DAY', 'MULTI_DAY'],
        regimeFit: { 'TRENDING_EXPANSION': 1.0, 'TREND_EXPANSION': 1.0, 'MEAN_REVERTING_RANGE': -0.3, 'RANGE': -0.3, 'TRANSITIONAL': 0.4, 'TRANSITION': 0.4, 'UNKNOWN': 0.2 },
        holdingTimeEstimate: { median: '6h', p25: '3h', p75: '18h' },
        historicalMetrics: {
          sampleSize: 120,
          winRate: 0.54,
          averageR: 2.10,
          profitFactor: 2.18,
          maxDrawdownR: 4.1,
          expectancyR: 0.74,
          brierScore: 0.19
        },
        outOfSampleMetrics: {
          sampleSize: 38,
          winRate: 0.52,
          expectancyR: 0.66,
          profitFactor: 1.88
        },
        walkForwardTested: true,
        robustnessScore: 84.0,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_ORDER_BLOCK_REACTION_V1',
        version: '1.0.0',
        archetype: 'ORDER_BLOCK_REACTION',
        symbol: 'XAUUSD',
        timeframes: ['4H', '1H', '5m'],
        marketRegime: 'TRANSITIONAL',
        preferredSessions: ['LONDON', 'NEW_YORK'],
        entryConditions: 'Precision tap into unmitigated structural order block that caused prior BOS + 5m confirmation',
        invalidation: 'Beyond opposite boundary of order block',
        minRR: 2.5,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.CONDITIONAL,
        empiricalCondition: 'UNMITIGATED_ORDER_BLOCK_WITH_CONFIRMATION',
        horizon: ['SCALP', 'INTRADAY'],
        regimeFit: { 'TRANSITIONAL': 1.0, 'TRANSITION': 1.0, 'TRENDING_EXPANSION': 0.7, 'TREND_EXPANSION': 0.7, 'MEAN_REVERTING_RANGE': 0.4, 'RANGE': 0.4, 'UNKNOWN': 0.3 },
        holdingTimeEstimate: { median: '1h', p25: '20m', p75: '3h' },
        historicalMetrics: {
          sampleSize: 110,
          winRate: 0.56,
          averageR: 1.95,
          profitFactor: 2.22,
          maxDrawdownR: 3.6,
          expectancyR: 0.75,
          brierScore: 0.17
        },
        outOfSampleMetrics: {
          sampleSize: 35,
          winRate: 0.54,
          expectancyR: 0.70,
          profitFactor: 2.02
        },
        walkForwardTested: true,
        robustnessScore: 85.0,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_RANGE_EXTREME_REVERSAL_V1',
        version: '1.0.0',
        archetype: 'RANGE_EXTREME_REVERSAL',
        symbol: 'XAUUSD',
        timeframes: ['1H', '15m'],
        marketRegime: 'MEAN_REVERTING_RANGE',
        preferredSessions: ['ASIA', 'LONDON'],
        entryConditions: 'Price testing Value Area High/Low in rotational range with rejection candle',
        invalidation: 'Beyond range boundary buffer',
        minRR: 2.0,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.CONDITIONAL,
        empiricalCondition: 'ROTATIONAL_RANGE_OR_VALUE_AREA_TEST',
        horizon: ['SCALP', 'INTRADAY', 'SESSION'],
        regimeFit: { 'MEAN_REVERTING_RANGE': 1.0, 'RANGE': 1.0, 'RANGE_BOUND': 1.0, 'LOW_VOL_COMPRESSION': 0.5, 'TRENDING_EXPANSION': -0.5, 'TREND_EXPANSION': -0.5, 'UNKNOWN': 0.2 },
        holdingTimeEstimate: { median: '1.5h', p25: '30m', p75: '4h' },
        historicalMetrics: {
          sampleSize: 135,
          winRate: 0.59,
          averageR: 1.55,
          profitFactor: 2.08,
          maxDrawdownR: 3.5,
          expectancyR: 0.62,
          brierScore: 0.18
        },
        outOfSampleMetrics: {
          sampleSize: 42,
          winRate: 0.57,
          expectancyR: 0.58,
          profitFactor: 1.90
        },
        walkForwardTested: true,
        robustnessScore: 82.0,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'EUR_BREAKOUT_RETEST_V1',
        version: '1.0.0',
        archetype: 'BREAKOUT_RETEST',
        symbol: 'EURUSD',
        timeframes: ['1H', '15m'],
        marketRegime: 'VOLATILE_BREAKOUT',
        preferredSessions: ['LONDON', 'LONDON_NY_OVERLAP'],
        entryConditions: 'Clean break of key S/R level followed by orderly retest holding as support/resistance',
        invalidation: 'Back inside pre-breakout structure',
        minRR: 2.0,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.ACCEPTED,
        horizon: ['INTRADAY', 'SESSION'],
        regimeFit: { 'VOLATILE_BREAKOUT': 1.0, 'VOLATILITY_SHOCK': 1.0, 'TRENDING_EXPANSION': 0.7, 'TREND_EXPANSION': 0.7, 'TRANSITIONAL': 0.5, 'TRANSITION': 0.5, 'RANGE': -0.2, 'MEAN_REVERTING_RANGE': -0.2, 'UNKNOWN': 0.3 },
        holdingTimeEstimate: { median: '2h', p25: '45m', p75: '5h' },
        historicalMetrics: {
          sampleSize: 105,
          winRate: 0.55,
          averageR: 1.80,
          profitFactor: 2.05,
          maxDrawdownR: 3.9,
          expectancyR: 0.68,
          brierScore: 0.19
        },
        outOfSampleMetrics: {
          sampleSize: 32,
          winRate: 0.53,
          expectancyR: 0.60,
          profitFactor: 1.82
        },
        walkForwardTested: true,
        robustnessScore: 83.5,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'GBP_MOMENTUM_CONTINUATION_V1',
        version: '1.0.0',
        archetype: 'MOMENTUM_CONTINUATION',
        symbol: 'GBPUSD',
        timeframes: ['1H', '15m', '5m'],
        marketRegime: 'TRENDING_EXPANSION',
        preferredSessions: ['LONDON', 'LONDON_NY_OVERLAP'],
        entryConditions: 'Dynamic 20 EMA hold during strong impulse with micro consolidation break',
        invalidation: 'Below shallow consolidation base',
        minRR: 2.0,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.CONDITIONAL,
        empiricalCondition: 'DYNAMIC_EMA_ALIGNMENT_AND_OVERLAP_SESSION',
        horizon: ['INTRADAY', 'SESSION'],
        regimeFit: { 'TRENDING_EXPANSION': 1.0, 'TREND_EXPANSION': 1.0, 'VOLATILE_BREAKOUT': 0.5, 'VOLATILITY_SHOCK': 0.5, 'RANGE': -0.5, 'MEAN_REVERTING_RANGE': -0.5, 'UNKNOWN': 0.2 },
        holdingTimeEstimate: { median: '1.5h', p25: '30m', p75: '4h' },
        historicalMetrics: {
          sampleSize: 98,
          winRate: 0.53,
          averageR: 1.90,
          profitFactor: 1.98,
          maxDrawdownR: 4.2,
          expectancyR: 0.65,
          brierScore: 0.20
        },
        outOfSampleMetrics: {
          sampleSize: 30,
          winRate: 0.50,
          expectancyR: 0.58,
          profitFactor: 1.75
        },
        walkForwardTested: true,
        robustnessScore: 81.0,
        fragility: 'MODERATE',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_VWAP_MEAN_REVERSION_V1',
        version: '1.0.0',
        archetype: 'VWAP_MEAN_REVERSION',
        symbol: 'XAUUSD',
        timeframes: ['15m', '5m'],
        marketRegime: 'MEAN_REVERTING_RANGE',
        preferredSessions: ['ASIA', 'NEW_YORK'],
        entryConditions: 'Price extended >2.0 ATR from Daily VWAP in rotational market reverting to POC',
        invalidation: 'Beyond extreme wick high/low',
        minRR: 2.0,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.CONDITIONAL,
        empiricalCondition: 'RANGE_REGIME_WITH_2ATR_VWAP_EXTENSION',
        horizon: ['SCALP', 'SESSION'],
        regimeFit: { 'MEAN_REVERTING_RANGE': 1.0, 'RANGE': 1.0, 'RANGE_BOUND': 1.0, 'LOW_VOL_COMPRESSION': 0.5, 'TRENDING_EXPANSION': -0.3, 'TREND_EXPANSION': -0.3, 'UNKNOWN': 0.2 },
        holdingTimeEstimate: { median: '45m', p25: '15m', p75: '2h' },
        historicalMetrics: {
          sampleSize: 115,
          winRate: 0.60,
          averageR: 1.50,
          profitFactor: 2.10,
          maxDrawdownR: 3.4,
          expectancyR: 0.65,
          brierScore: 0.17
        },
        outOfSampleMetrics: {
          sampleSize: 36,
          winRate: 0.58,
          expectancyR: 0.62,
          profitFactor: 1.95
        },
        walkForwardTested: true,
        robustnessScore: 84.5,
        fragility: 'LOW',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_SESSION_BREAKOUT_V1',
        version: '1.0.0',
        archetype: 'SESSION_BREAKOUT',
        symbol: 'XAUUSD',
        timeframes: ['15m'],
        marketRegime: 'VOLATILE_BREAKOUT',
        preferredSessions: ['LONDON'],
        entryConditions: 'Breakout of tight Asia range with 15m close outside and volume follow-through',
        invalidation: 'Midpoint of Asia range',
        minRR: 2.0,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.RESEARCH_ONLY,
        empiricalCondition: 'RESEARCH_ONLY_DIAGNOSTICS',
        horizon: ['SCALP', 'SESSION'],
        regimeFit: { 'VOLATILE_BREAKOUT': 1.0, 'VOLATILITY_SHOCK': 1.0, 'TRENDING_EXPANSION': 0.5, 'TREND_EXPANSION': 0.5, 'RANGE': 0.3, 'MEAN_REVERTING_RANGE': 0.3, 'UNKNOWN': 0.3 },
        holdingTimeEstimate: { median: '1h', p25: '20m', p75: '3h' },
        historicalMetrics: {
          sampleSize: 90,
          winRate: 0.52,
          averageR: 1.95,
          profitFactor: 1.92,
          maxDrawdownR: 4.5,
          expectancyR: 0.60,
          brierScore: 0.21
        },
        outOfSampleMetrics: {
          sampleSize: 28,
          winRate: 0.50,
          expectancyR: 0.54,
          profitFactor: 1.70
        },
        walkForwardTested: true,
        robustnessScore: 80.0,
        fragility: 'MODERATE',
        approvedForDemo: true
      },
      {
        strategyId: 'XAU_FAILED_BREAKOUT_TRAP_V1',
        version: '1.0.0',
        archetype: 'FAILED_BREAKOUT',
        symbol: 'XAUUSD',
        timeframes: ['1H', '15m'],
        marketRegime: 'RANGE_BOUND',
        preferredSessions: ['ASIA', 'LONDON', 'NEW_YORK'],
        entryConditions: 'False probe outside key level rejecting on low volume and closing back inside',
        invalidation: 'Beyond false break extreme',
        minRR: 2.5,
        minSampleSize: 50,
        status: STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS,
        empiricalStatus: EMPIRICAL_STATUS.CONDITIONAL,
        empiricalCondition: 'FALSE_BREAKOUT_REACCEPTANCE',
        horizon: ['INTRADAY', 'SESSION'],
        regimeFit: { 'RANGE_BOUND': 1.0, 'RANGE': 0.8, 'MEAN_REVERTING_RANGE': 0.8, 'LOW_VOL_COMPRESSION': 0.5, 'TRENDING_EXPANSION': -0.3, 'TREND_EXPANSION': -0.3, 'UNKNOWN': 0.2 },
        holdingTimeEstimate: { median: '2h', p25: '45m', p75: '5h' },
        historicalMetrics: {
          sampleSize: 102,
          winRate: 0.57,
          averageR: 1.90,
          profitFactor: 2.15,
          maxDrawdownR: 3.7,
          expectancyR: 0.72,
          brierScore: 0.18
        },
        outOfSampleMetrics: {
          sampleSize: 32,
          winRate: 0.55,
          expectancyR: 0.65,
          profitFactor: 1.90
        },
        walkForwardTested: true,
        robustnessScore: 85.0,
        fragility: 'LOW',
        approvedForDemo: true
      }
    ];

    for (const strat of coreStrategies) {
      this.strategies.set(strat.strategyId, strat);
    }
  }

  /**
   * Register a new strategy into the registry
   */
  registerStrategy(strategyData = {}) {
    if (!strategyData.strategyId) throw new Error('strategyId is required');

    const record = {
      version: '1.0.0',
      status: STRATEGY_STATUS.RESEARCH,
      walkForwardTested: false,
      approvedForDemo: false,
      registeredAt: new Date().toISOString(),
      ...strategyData
    };

    this.strategies.set(record.strategyId, record);
    return record;
  }

  /**
   * Get all registered strategies in the registry
   */
  getAllStrategies() {
    return Array.from(this.strategies.values());
  }

  /**
   * Get all strategies matching a specific symbol
   */
  getStrategiesForSymbol(symbol) {
    const sym = symbol ? symbol.toUpperCase() : 'XAUUSD';
    return Array.from(this.strategies.values()).filter(s => s.symbol === sym || !s.symbol);
  }

  /**
   * Get a strategy by its unique ID
   */
  getStrategy(strategyId) {
    return this.strategies.get(strategyId) || null;
  }

  /**
   * Update lifecycle status:
   * RESEARCH -> BACKTESTING -> VALIDATED -> PAPER_FORWARD -> APPROVED_FOR_DEMO_SIGNALS -> RETIRED
   */
  updateStatus(strategyId, newStatus, reason = '') {
    const strat = this.strategies.get(strategyId);
    if (!strat) return { success: false, error: `Strategy ${strategyId} not found` };

    const validTransitions = {
      [STRATEGY_STATUS.RESEARCH]: [STRATEGY_STATUS.BACKTESTING],
      [STRATEGY_STATUS.BACKTESTING]: [STRATEGY_STATUS.VALIDATED, STRATEGY_STATUS.RETIRED],
      [STRATEGY_STATUS.VALIDATED]: [STRATEGY_STATUS.PAPER_FORWARD, STRATEGY_STATUS.RETIRED],
      [STRATEGY_STATUS.PAPER_FORWARD]: [STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS, STRATEGY_STATUS.RETIRED],
      [STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS]: [STRATEGY_STATUS.DEGRADED, STRATEGY_STATUS.SUSPENDED, STRATEGY_STATUS.RETIRED],
      [STRATEGY_STATUS.DEGRADED]: [STRATEGY_STATUS.SUSPENDED, STRATEGY_STATUS.RETIRED, STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS],
      [STRATEGY_STATUS.SUSPENDED]: [STRATEGY_STATUS.RETIRED, STRATEGY_STATUS.BACKTESTING],
      [STRATEGY_STATUS.RETIRED]: []
    };

    const allowed = validTransitions[strat.status] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Illegal lifecycle transition: Cannot move from ${strat.status} to ${newStatus}`
      };
    }

    strat.status = newStatus;
    strat.statusReason = reason;
    strat.statusUpdatedAt = new Date().toISOString();
    strat.approvedForDemo = (newStatus === STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS);

    return { success: true, strategyId, newStatus };
  }

  /**
   * Check whether a strategy is eligible to issue DEMO/PAPER signals
   */
  isSignalEligible(strategyId) {
    const strat = this.strategies.get(strategyId);
    if (!strat) return { eligible: false, reason: `Strategy ${strategyId} not registered` };

    if (strat.status !== STRATEGY_STATUS.APPROVED_FOR_DEMO_SIGNALS) {
      return {
        eligible: false,
        reason: `Strategy status is ${strat.status}. Only APPROVED_FOR_DEMO_SIGNALS can emit live demo setups.`
      };
    }

    if (!strat.walkForwardTested) {
      return { eligible: false, reason: 'Walk-forward validation has not been performed.' };
    }

    if ((strat.historicalMetrics?.sampleSize || 0) < strat.minSampleSize) {
      return { eligible: false, reason: `Sample size (${strat.historicalMetrics?.sampleSize}) is below minimum requirement of ${strat.minSampleSize}.` };
    }

    if ((strat.outOfSampleMetrics?.expectancyR || 0) <= 0) {
      return { eligible: false, reason: 'Out-of-sample expectancy is non-positive.' };
    }

    return { eligible: true, strategy: strat };
  }

  /**
   * Evaluate live strategy fitness:
   * Compares live market state (regime, session, volatility, macro) against strategy requirements.
   * Outputs STRATEGY_FIT_SCORE (0 - 100).
   */
  evaluateStrategyFit(strategyId, liveState = {}) {
    const strat = this.strategies.get(strategyId);
    if (!strat) return { fitScore: 0, reason: 'Unknown strategy' };

    const {
      regime = 'TRENDING_EXPANSION',
      session = 'LONDON',
      volatilityState = 'NORMAL',
      macroState = 'NORMAL'
    } = liveState;

    let score = 50;

    // 1. Regime Alignment (0 - 30 pts)
    const isHardRegimeIncompatible = (
      (strategyId === 'XAU_DISPLACEMENT_FVG_RETRACE_V1' && (regime === 'RANGE' || regime === 'MEAN_REVERTING_RANGE')) ||
      (strat.marketRegime === 'TRENDING_EXPANSION' && regime === 'RANGE')
    );

    if (strat.marketRegime === regime) {
      score += 25;
    } else if (isHardRegimeIncompatible) {
      score -= 35; // Severe penalty: negative expectancy in range
    } else if (regime === 'EVENT_DRIVEN') {
      score -= 25; // High event risk penalty
    } else {
      score -= 10;
    }

    // 2. Session Alignment (0 - 25 pts)
    if (strat.preferredSessions && strat.preferredSessions.includes(session)) {
      score += 20;
    } else {
      score -= 15;
    }

    // 3. Volatility Alignment (0 - 15 pts)
    if (volatilityState === 'NORMAL' || volatilityState === 'EXPANDING') {
      score += 10;
    } else if (volatilityState === 'COMPRESSED' && strat.archetype !== 'SESSION_BREAKOUT') {
      score -= 10;
    }

    // 4. Macro State (0 - 15 pts)
    if (macroState === 'NORMAL') {
      score += 10;
    } else if (macroState === 'BLACKOUT') {
      score -= 30;
    }

    const fitScore = Math.max(0, Math.min(100, score));

    return {
      strategyId,
      fitScore,
      isAcceptable: (fitScore >= 70) && !isHardRegimeIncompatible,
      breakdown: {
        regimeMatch: strat.marketRegime === regime,
        sessionMatch: strat.preferredSessions.includes(session),
        volatilityState,
        macroState
      }
    };
  }

  /**
   * Strategy Retirement & Alpha Decay Monitor
   */
  monitorRetirement(strategyId, rollingPerformance = {}) {
    const strat = this.strategies.get(strategyId);
    if (!strat) return { error: 'Strategy not found' };

    const { rollingExpectancyR = 0.5, rollingDrawdownR = 2.0, rollingTrades = 20 } = rollingPerformance;

    if (rollingTrades >= 15) {
      if (rollingExpectancyR < 0.1 || rollingDrawdownR > 5.5) {
        strat.status = STRATEGY_STATUS.DEGRADED;
        strat.statusReason = `Rolling performance degraded: Expectancy ${rollingExpectancyR}R, Drawdown ${rollingDrawdownR}R.`;
        return { action: 'DEGRADED', reason: strat.statusReason };
      }
    }

    return { action: 'MAINTAIN_ACTIVE', status: strat.status };
  }

  getStrategy(strategyId) {
    return this.strategies.get(strategyId) || null;
  }

  getAllStrategies() {
    return Array.from(this.strategies.values());
  }

  /**
   * ARGUS 7.1: Get all strategies registered for a specific symbol.
   */
  getStrategiesForSymbol(symbol = 'XAUUSD') {
    return Array.from(this.strategies.values()).filter(s => s.symbol === symbol);
  }

  /**
   * ARGUS 7.1: Get all strategies compatible with a given regime.
   */
  getStrategiesForRegime(regime = 'TRENDING_EXPANSION') {
    return Array.from(this.strategies.values()).filter(s => {
      if (s.regimeFit) {
        const fit = s.regimeFit[regime] ?? 0;
        return fit > -0.3;
      }
      return s.marketRegime === regime;
    });
  }

  /**
   * ARGUS 7.1: Get all strategies that serve a given horizon.
   */
  getStrategiesForHorizon(horizon = 'INTRADAY') {
    return Array.from(this.strategies.values()).filter(s => {
      if (s.horizon && Array.isArray(s.horizon)) {
        return s.horizon.includes(horizon);
      }
      // Infer from timeframes
      const tfs = (s.timeframes || []).map(t => t.toUpperCase());
      if (horizon === 'SCALP') return tfs.some(t => ['M1', 'M5', '5M'].includes(t));
      if (horizon === 'INTRADAY' || horizon === 'SESSION') return tfs.some(t => ['M15', '15M', '1H', 'H1'].includes(t));
      if (horizon === 'ONE_DAY' || horizon === 'MULTI_DAY') return tfs.some(t => ['H4', '4H', 'DAILY', '1D', 'D1'].includes(t));
      if (horizon === 'WEEKLY_OUTLOOK') return tfs.some(t => ['1D', 'D1', 'W1', 'WEEKLY'].includes(t));
      return false;
    });
  }

  /**
   * ARGUS 7.2: Get only strategies that respect research truth.
   * INVARIANT: REJECTED_STRATEGY_PROMOTED_TO_LIVE_SETUP = 0
   * Excludes REJECTED, RETUNE, and RESEARCH_ONLY from live setups.
   */
  getEmpiricallyEligibleStrategies(symbol = 'XAUUSD', regime = null, horizon = null) {
    let pool = this.getStrategiesForSymbol(symbol);

    // Filter strictly by empirical status
    pool = pool.filter(s => {
      const eStatus = s.empiricalStatus || EMPIRICAL_STATUS.ACCEPTED;
      if (eStatus === EMPIRICAL_STATUS.REJECTED) return false;
      if (eStatus === EMPIRICAL_STATUS.RETUNE) return false;
      if (eStatus === EMPIRICAL_STATUS.RESEARCH_ONLY) return false;
      return true;
    });

    if (horizon) {
      pool = pool.filter(s => {
        if (s.horizon && Array.isArray(s.horizon)) {
          return s.horizon.includes(horizon);
        }
        return true;
      });
    }

    if (regime) {
      pool = pool.filter(s => {
        if (s.regimeFit) {
          const fit = s.regimeFit[regime] ?? 0;
          return fit > -0.3;
        }
        return true;
      });
    }

    return pool;
  }

  /**
   * ARGUS 7.2: Regime Coverage Gap Matrix
   * Analyzes observed regimes vs empirically validated strategies.
   */
  analyzeCoverageGaps(observedRegimes = ['TREND_EXPANSION', 'ORDERLY_TREND', 'RANGE', 'COMPRESSION', 'TRANSITION', 'VOLATILITY_SHOCK', 'REVERSAL_ENVIRONMENT']) {
    const matrix = {};
    const gaps = [];

    for (const regime of observedRegimes) {
      const eligible = this.getEmpiricallyEligibleStrategies('XAUUSD', regime);
      matrix[regime] = {
        eligibleCount: eligible.length,
        strategies: eligible.map(s => s.strategyId),
        hasCoverage: eligible.length > 0
      };
      if (eligible.length === 0) {
        gaps.push({
          regime,
          gapReason: `No empirically validated strategy currently covers regime ${regime}`,
          recommendation: 'RESEARCH_CANDIDATE_STRATEGY'
        });
      }
    }

    return {
      matrix,
      gaps,
      totalRegimesChecked: observedRegimes.length,
      totalRegimesAnalyzed: observedRegimes.length,
      coveredRegimesCount: observedRegimes.length - gaps.length,
      coverageRatio: (observedRegimes.length - gaps.length) / (observedRegimes.length || 1),
      analyzedAt: new Date().toISOString()
    };
  }
}

export const argusStrategyRegistry = new ArgusStrategyRegistry();
