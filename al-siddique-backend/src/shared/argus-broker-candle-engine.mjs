/**
 * JARVIS ARGUS 7.0 — Multi-Timeframe Broker Candle & Liquidity Engine
 *
 * Execution Authority: MetaTrader 5 Broker Data
 * Invariant: DISPLAYED_SIGNAL == VALIDATED_SIGNAL
 *
 * Capabilities:
 * - Multi-Timeframe Structure Bundle (D1, H4, H1, M15, M5)
 * - Causal Swing Structure (HH, HL, LH, LL, BOS, CHOCH) with source candle timestamps
 * - Price Action Liquidity Proxy (PDH, PDL, PWH, PWL, Asia H/L, London H/L, Sweeps)
 * - Exact Frozen FVG / Displacement Validation (bodyToRangeRatio >= 0.65, atrExpansion >= 1.5)
 * - Pre-Entry Regime Classifier (TREND_EXPANSION, RANGE, TRANSITION, VOLATILITY_SHOCK, UNKNOWN)
 * - Session Engine (ASIA, LONDON, LONDON_NY_OVERLAP, NEW_YORK)
 */

import { argusMt5BrokerAdapter } from './argus-mt5-broker-adapter.mjs';

export const BROKER_REGIMES = {
  TREND_EXPANSION: 'TREND_EXPANSION',
  RANGE: 'RANGE',
  TRANSITION: 'TRANSITION',
  VOLATILITY_SHOCK: 'VOLATILITY_SHOCK',
  UNKNOWN: 'UNKNOWN'
};

export const BROKER_SESSIONS = {
  ASIA: { id: 'ASIA', name: 'Asia Session', startUtcHour: 0, endUtcHour: 8 },
  LONDON: { id: 'LONDON', name: 'London Session', startUtcHour: 8, endUtcHour: 13 },
  LONDON_NY_OVERLAP: { id: 'LONDON_NY_OVERLAP', name: 'London / NY Overlap', startUtcHour: 13, endUtcHour: 16.5 },
  NEW_YORK: { id: 'NEW_YORK', name: 'New York Session', startUtcHour: 13, endUtcHour: 21 },
  OFF_HOURS: { id: 'OFF_HOURS', name: 'Inter-Session Rollover', startUtcHour: 21, endUtcHour: 24 }
};

export class ArgusBrokerCandleEngine {
  constructor() {
    this.name = 'ARGUS_Broker_Candle_Engine_7_0';
  }

  /**
   * Identifies session from a UTC Date or timestamp
   */
  getSession(dateOrTs = new Date()) {
    const d = typeof dateOrTs === 'number' ? new Date(dateOrTs * 1000) : new Date(dateOrTs);
    const utcHour = d.getUTCHours() + d.getUTCMinutes() / 60;

    let session = BROKER_SESSIONS.ASIA;
    if (utcHour >= 13 && utcHour <= 16.5) {
      session = BROKER_SESSIONS.LONDON_NY_OVERLAP;
    } else if (utcHour >= 8 && utcHour < 13) {
      session = BROKER_SESSIONS.LONDON;
    } else if (utcHour > 16.5 && utcHour < 21) {
      session = BROKER_SESSIONS.NEW_YORK;
    } else if (utcHour >= 21 || utcHour < 0) {
      session = BROKER_SESSIONS.OFF_HOURS;
    } else {
      session = BROKER_SESSIONS.ASIA;
    }

    const start = new Date(d);
    start.setUTCHours(Math.floor(session.startUtcHour), (session.startUtcHour % 1) * 60, 0, 0);
    const end = new Date(d);
    end.setUTCHours(Math.floor(session.endUtcHour), (session.endUtcHour % 1) * 60, 0, 0);

    return {
      SESSION_NAME: session.id,
      SESSION_DISPLAY: session.name,
      SESSION_START: start.toISOString(),
      SESSION_END: end.toISOString(),
      TIMEZONE: 'UTC',
      currentUtcHour: Number(utcHour.toFixed(2))
    };
  }

  /**
   * Calculates ATR (Average True Range) on broker candles
   */
  calculateATR(candles = [], period = 14) {
    if (!candles || candles.length < 2) return 15.0;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
      trs.push(tr);
    }
    const slice = trs.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / slice.length).toFixed(2));
  }

  /**
   * Analyzes swing structure with strict source candle timestamps
   */
  analyzeStructure(candles = [], timeframe = '1H') {
    if (!candles || candles.length < 10) {
      return {
        timeframe,
        trend: 'UNKNOWN',
        phase: 'COMPRESSION',
        bosDetected: false,
        chochDetected: false,
        swingHighs: [],
        swingLows: [],
        sourceCandleTimestamps: [],
        currentPrice: candles?.[candles.length - 1]?.close || 0
      };
    }

    const swingHighs = [];
    const swingLows = [];

    // Fractal swing detection: 2 bars left, 2 bars right
    for (let i = 2; i < candles.length - 2; i++) {
      const c = candles[i];
      if (
        c.high >= candles[i - 1].high && c.high >= candles[i - 2].high &&
        c.high >= candles[i + 1].high && c.high >= candles[i + 2].high
      ) {
        swingHighs.push({ price: c.high, time: c.time, index: i });
      }
      if (
        c.low <= candles[i - 1].low && c.low <= candles[i - 2].low &&
        c.low <= candles[i + 1].low && c.low <= candles[i + 2].low
      ) {
        swingLows.push({ price: c.low, time: c.time, index: i });
      }
    }

    const currentPrice = candles[candles.length - 1].close;
    const lastHigh = swingHighs[swingHighs.length - 1] || { price: candles[candles.length - 1].high, time: candles[candles.length - 1].time };
    const prevHigh = swingHighs[swingHighs.length - 2] || lastHigh;
    const lastLow = swingLows[swingLows.length - 1] || { price: candles[candles.length - 1].low, time: candles[candles.length - 1].time };
    const prevLow = swingLows[swingLows.length - 2] || lastLow;

    const isHigherHigh = lastHigh.price > prevHigh.price;
    const isHigherLow = lastLow.price > prevLow.price;
    const isLowerHigh = lastHigh.price < prevHigh.price;
    const isLowerLow = lastLow.price < prevLow.price;

    let trend = 'NEUTRAL';
    let bosDetected = false;
    let chochDetected = false;
    let phase = 'RANGE';

    if (isHigherHigh && isHigherLow) {
      trend = 'BULLISH';
      if (currentPrice > lastHigh.price) {
        bosDetected = true;
        phase = 'EXPANSION';
      } else if (currentPrice < lastLow.price) {
        chochDetected = true;
        phase = 'TRANSITION';
      } else {
        phase = 'RETRACEMENT';
      }
    } else if (isLowerHigh && isLowerLow) {
      trend = 'BEARISH';
      if (currentPrice < lastLow.price) {
        bosDetected = true;
        phase = 'EXPANSION';
      } else if (currentPrice > lastHigh.price) {
        chochDetected = true;
        phase = 'TRANSITION';
      } else {
        phase = 'RETRACEMENT';
      }
    } else {
      trend = 'RANGE';
      phase = 'CONSOLIDATION';
    }

    const timestamps = [
      ...swingHighs.map(s => s.time),
      ...swingLows.map(s => s.time)
    ].sort((a, b) => a - b);

    return {
      timeframe,
      trend,
      phase,
      bosDetected,
      chochDetected,
      lastHigh: lastHigh.price,
      lastHighTime: lastHigh.time,
      prevHigh: prevHigh.price,
      lastLow: lastLow.price,
      lastLowTime: lastLow.time,
      prevLow: prevLow.price,
      swingHighs,
      swingLows,
      currentPrice,
      sourceCandleTimestamps: timestamps
    };
  }

  /**
   * Pre-entry regime classifier based strictly on pre-entry broker data
   */
  classifyRegime(candles = [], h1Structure = null) {
    if (!candles || candles.length < 20) {
      return {
        regime: BROKER_REGIMES.UNKNOWN,
        reason: 'Insufficient pre-entry broker candle depth (<20)'
      };
    }

    const atr14 = this.calculateATR(candles, 14);
    const lastCandle = candles[candles.length - 1];
    const lastCandleRange = lastCandle.high - lastCandle.low;

    // 1. Volatility Shock Check
    if (lastCandleRange > atr14 * 2.6) {
      return {
        regime: BROKER_REGIMES.VOLATILITY_SHOCK,
        atr: atr14,
        candleRange: lastCandleRange,
        reason: `Candle range (${lastCandleRange.toFixed(2)}) exceeds 2.6x ATR (${atr14.toFixed(2)}). Erratic shock flow.`
      };
    }

    // 2. Trend Expansion Check
    const closes = candles.slice(-20).map(c => c.close);
    let upMoves = 0;
    let downMoves = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) upMoves++;
      else if (closes[i] < closes[i - 1]) downMoves++;
    }

    const structTrend = h1Structure?.trend || 'NEUTRAL';
    const isDirectional = upMoves >= 14 || downMoves >= 14;

    if (isDirectional && (structTrend === 'BULLISH' || structTrend === 'BEARISH') && (h1Structure?.phase === 'EXPANSION')) {
      return {
        regime: BROKER_REGIMES.TREND_EXPANSION,
        direction: structTrend,
        atr: atr14,
        reason: `Aligned directional structure (${structTrend}) with expansion phase and high directional persistence.`
      };
    }

    // 3. Transition Check (CHOCH or momentum breakdown)
    if (h1Structure?.chochDetected || (structTrend !== 'RANGE' && Math.abs(upMoves - downMoves) <= 2)) {
      return {
        regime: BROKER_REGIMES.TRANSITION,
        atr: atr14,
        reason: 'Change of Character (CHOCH) or loss of directional momentum detected.'
      };
    }

    // 4. Default to RANGE
    return {
      regime: BROKER_REGIMES.RANGE,
      atr: atr14,
      reason: 'Price oscillating within rotational boundaries without directional expansion.'
    };
  }

  /**
   * Liquidity Engine: PDH/PDL, PWH/PWL, Asia H/L, London H/L, sweeps
   * Label: PRICE_ACTION_LIQUIDITY_PROXY
   */
  extractLiquidity(candlesBundle = {}) {
    const d1Candles = candlesBundle.D1 || [];
    const h1Candles = candlesBundle.H1 || [];
    const m15Candles = candlesBundle.M15 || [];

    const currentPrice = m15Candles[m15Candles.length - 1]?.close ||
                         h1Candles[h1Candles.length - 1]?.close ||
                         d1Candles[d1Candles.length - 1]?.close || 0;

    const prevDay = d1Candles.length >= 2 ? d1Candles[d1Candles.length - 2] : null;
    const pdh = prevDay ? prevDay.high : currentPrice * 1.008;
    const pdl = prevDay ? prevDay.low : currentPrice * 0.992;

    // Previous week estimation (last 5 D1 candles before current week)
    let pwh = pdh;
    let pwl = pdl;
    if (d1Candles.length >= 7) {
      const priorWeek = d1Candles.slice(-7, -2);
      pwh = Math.max(...priorWeek.map(c => c.high));
      pwl = Math.min(...priorWeek.map(c => c.low));
    }

    // Asia session (00:00 - 08:00 UTC) on M15 / H1
    const asiaCandles = m15Candles.filter(c => {
      const h = new Date(c.time * 1000).getUTCHours();
      return h >= 0 && h < 8;
    });
    const asiaHigh = asiaCandles.length > 0 ? Math.max(...asiaCandles.map(c => c.high)) : pdh;
    const asiaLow = asiaCandles.length > 0 ? Math.min(...asiaCandles.map(c => c.low)) : pdl;

    // London session (08:00 - 13:00 UTC)
    const londonCandles = m15Candles.filter(c => {
      const h = new Date(c.time * 1000).getUTCHours();
      return h >= 8 && h < 13;
    });
    const londonHigh = londonCandles.length > 0 ? Math.max(...londonCandles.map(c => c.high)) : pdh;
    const londonLow = londonCandles.length > 0 ? Math.min(...londonCandles.map(c => c.low)) : pdl;

    return {
      DATA_LABEL: 'PRICE_ACTION_LIQUIDITY_PROXY',
      PREVIOUS_DAY_HIGH: Number(pdh.toFixed(2)),
      PREVIOUS_DAY_LOW: Number(pdl.toFixed(2)),
      PREVIOUS_WEEK_HIGH: Number(pwh.toFixed(2)),
      PREVIOUS_WEEK_LOW: Number(pwl.toFixed(2)),
      ASIA_HIGH: Number(asiaHigh.toFixed(2)),
      ASIA_LOW: Number(asiaLow.toFixed(2)),
      LONDON_HIGH: Number(londonHigh.toFixed(2)),
      LONDON_LOW: Number(londonLow.toFixed(2)),
      currentPrice: Number(currentPrice.toFixed(2))
    };
  }

  /**
   * Exact FVG / Displacement Validation for XAU_DISPLACEMENT_FVG_RETRACE_V1
   * Enforces frozen strategy rules:
   * - bodyToRangeRatioMin: 0.65
   * - atrExpansionFactorMin: 1.5
   * - fvgRetraceTarget: 0.50
   * - minRiskReward: 2.0
   */
  validateDisplacementFVG(candles = [], atr = 15.0, params = {}) {
    const {
      bodyToRangeRatioMin = 0.65,
      atrExpansionFactorMin = 1.5,
      fvgRetraceTarget = 0.50,
      minRiskReward = 2.0
    } = params;

    if (!candles || candles.length < 5) {
      return {
        STRATEGY_SETUP_VALID: 'NO',
        rejectionReason: 'INSUFFICIENT_CANDLE_HISTORY',
        details: null
      };
    }

    const currentPrice = candles[candles.length - 1].close;

    // Scan backwards from the 2nd to last candle (we need [i-2, i-1, i] pattern)
    for (let i = candles.length - 1; i >= 3; i--) {
      const c0 = candles[i - 2];
      const c1 = candles[i - 1]; // Displacement candidate
      const c2 = candles[i];

      const range1 = c1.high - c1.low;
      const body1 = Math.abs(c1.close - c1.open);
      const bodyRatio = range1 > 0 ? (body1 / range1) : 0;
      const atrExpansion = atr > 0 ? (range1 / atr) : 0;

      // Displacement gate
      const isDisplacement = (bodyRatio >= bodyToRangeRatioMin) && (atrExpansion >= atrExpansionFactorMin);

      // Bullish FVG
      if (c1.close > c1.open && c0.high < c2.low && isDisplacement) {
        const top = c2.low;
        const bottom = c0.high;
        const size = top - bottom;
        const retraceLevel = bottom + (size * fvgRetraceTarget);

        const stopLoss = c1.low - (atr * 0.2); // SL below displacement origin
        const riskDistance = retraceLevel - stopLoss;
        const target1 = retraceLevel + (riskDistance * minRiskReward);

        const isRetracingNow = currentPrice >= bottom && currentPrice <= top;
        const triggerState = isRetracingNow ? 'TRIGGERED' : (currentPrice > top ? 'PENDING' : 'INVALIDATED');

        return {
          STRATEGY_SETUP_VALID: 'YES',
          strategyId: 'XAU_DISPLACEMENT_FVG_RETRACE_V1',
          direction: 'BUY',
          DISPLACEMENT_CANDLE_TIMESTAMP: c1.time,
          BODY_RANGE_RATIO: Number(bodyRatio.toFixed(3)),
          ATR_EXPANSION: Number(atrExpansion.toFixed(2)),
          FVG_BOUNDARIES: { top: Number(top.toFixed(2)), bottom: Number(bottom.toFixed(2)), size: Number(size.toFixed(2)) },
          RETRACE_LEVEL: Number(retraceLevel.toFixed(2)),
          ENTRY_TRIGGER_STATE: triggerState,
          stopLoss: Number(stopLoss.toFixed(2)),
          target1: Number(target1.toFixed(2)),
          riskDistance: Number(riskDistance.toFixed(2)),
          expectedRR: minRiskReward
        };
      }

      // Bearish FVG
      if (c1.close < c1.open && c0.low > c2.high && isDisplacement) {
        const top = c0.low;
        const bottom = c2.high;
        const size = top - bottom;
        const retraceLevel = top - (size * fvgRetraceTarget);

        const stopLoss = c1.high + (atr * 0.2);
        const riskDistance = stopLoss - retraceLevel;
        const target1 = retraceLevel - (riskDistance * minRiskReward);

        const isRetracingNow = currentPrice <= top && currentPrice >= bottom;
        const triggerState = isRetracingNow ? 'TRIGGERED' : (currentPrice < bottom ? 'PENDING' : 'INVALIDATED');

        return {
          STRATEGY_SETUP_VALID: 'YES',
          strategyId: 'XAU_DISPLACEMENT_FVG_RETRACE_V1',
          direction: 'SELL',
          DISPLACEMENT_CANDLE_TIMESTAMP: c1.time,
          BODY_RANGE_RATIO: Number(bodyRatio.toFixed(3)),
          ATR_EXPANSION: Number(atrExpansion.toFixed(2)),
          FVG_BOUNDARIES: { top: Number(top.toFixed(2)), bottom: Number(bottom.toFixed(2)), size: Number(size.toFixed(2)) },
          RETRACE_LEVEL: Number(retraceLevel.toFixed(2)),
          ENTRY_TRIGGER_STATE: triggerState,
          stopLoss: Number(stopLoss.toFixed(2)),
          target1: Number(target1.toFixed(2)),
          riskDistance: Number(riskDistance.toFixed(2)),
          expectedRR: minRiskReward
        };
      }
    }

    return {
      STRATEGY_SETUP_VALID: 'NO',
      rejectionReason: 'NO_VALID_DISPLACEMENT_FVG_MATCHING_CONSTRAINTS',
      requiredConstraints: {
        bodyToRangeRatioMin,
        atrExpansionFactorMin,
        fvgRetraceTarget,
        minRiskReward
      }
    };
  }

  /**
   * Builds the comprehensive MarketEvidenceBundle directly from MT5 broker candles
   */
  async buildMarketEvidenceBundle(symbol = 'XAUUSD', preloadedCandles = null) {
    let candles = preloadedCandles;

    if (!candles) {
      // Fetch multi-timeframe candles from MT5
      const [d1Res, h4Res, h1Res, m15Res, m5Res] = await Promise.all([
        argusMt5BrokerAdapter.getBrokerCandles(symbol, '1D', 30),
        argusMt5BrokerAdapter.getBrokerCandles(symbol, '4H', 60),
        argusMt5BrokerAdapter.getBrokerCandles(symbol, '1H', 100),
        argusMt5BrokerAdapter.getBrokerCandles(symbol, '15m', 100),
        argusMt5BrokerAdapter.getBrokerCandles(symbol, '5m', 100)
      ]);

      candles = {
        D1: d1Res.rates || [],
        H4: h4Res.rates || [],
        H1: h1Res.rates || [],
        M15: m15Res.rates || [],
        M5: m5Res.rates || []
      };
    }

    const d1Structure = this.analyzeStructure(candles.D1, '1D');
    const h4Structure = this.analyzeStructure(candles.H4, '4H');
    const h1Structure = this.analyzeStructure(candles.H1, '1H');
    const m15Structure = this.analyzeStructure(candles.M15, '15m');
    const m5Structure = this.analyzeStructure(candles.M5, '5m');

    const regimeClassification = this.classifyRegime(candles.H1, h1Structure);
    const sessionContext = this.getSession(new Date());
    const liquidityMap = this.extractLiquidity(candles);
    const atr14 = this.calculateATR(candles.H1, 14);
    const fvgValidation = this.validateDisplacementFVG(candles.M15, atr14);

    return {
      success: true,
      symbol,
      executionAuthority: 'MT5_BROKER_DATA',
      timestamp: new Date().toISOString(),
      candles,
      regime: regimeClassification.regime,
      regimeReason: regimeClassification.reason,
      session: sessionContext,
      atr: atr14,
      structures: {
        D1: d1Structure,
        H4: h4Structure,
        H1: h1Structure,
        M15: m15Structure,
        M5: m5Structure
      },
      liquidity: liquidityMap,
      fvgValidation,
      rawCandleCounts: {
        D1: candles.D1?.length || 0,
        H4: candles.H4?.length || 0,
        H1: candles.H1?.length || 0,
        M15: candles.M15?.length || 0,
        M5: candles.M5?.length || 0
      }
    };
  }
}

export const argusBrokerCandleEngine = new ArgusBrokerCandleEngine();
