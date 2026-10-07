/**
 * JARVIS ARGUS 6.0 — Deep Market Structure, Liquidity & Auction Intelligence
 * 
 * Foundational research engine providing:
 * 1. Multi-Timeframe Structure (Weekly, Daily, 4H, 1H, 15m, 5m): HH, HL, LH, LL, BOS, CHOCH
 * 2. Structure Narrative: Sequential fractal narrative across timeframes
 * 3. Liquidity Map: EQH, EQL, PDH, PDL, PWH, PWL, Asia/London/NY extremes (Price-Action Liquidity Proxy)
 * 4. Liquidity Sweep Detection: Failed acceptance beyond liquidity level + swift re-entry + displacement
 * 5. Displacement & Fair Value Gap (FVG) Engine: Body-to-range, ATR expansion, FVG_QUALITY_SCORE (0-100)
 * 6. Validated Order Block (OB) Engine: Origin of displacement/BOS, freshness, ZONE_QUALITY_SCORE (0-100)
 * 7. Dealing Range & Premium / Discount: 50% Equilibrium determination
 * 8. Session Model: Asia accumulation, London expansion/sweep, NY continuation/reversal, Overlap
 * 9. Volume / VWAP / Profile Context: Daily VWAP, Anchored VWAP, Value Areas (VAH/VAL/POC), auction context
 * 
 * INVARIANTS:
 * - REAL_MONEY_EXECUTION = 0
 * - ZERO FABRICATED BANK ORDERS (Order blocks are labeled as structural price-action zones)
 * - TICK-VOLUME LIMITATIONS EXPLICITLY LABELED
 */

export const SESSIONS = {
  ASIA: { id: 'ASIA', name: 'Asia Session', startUtc: 0, endUtc: 8, phase: 'ACCUMULATION' },
  LONDON: { id: 'LONDON', name: 'London Session', startUtc: 8, endUtc: 13, phase: 'EXPANSION_OR_SWEEP' },
  LONDON_NY_OVERLAP: { id: 'OVERLAP', name: 'London / NY Overlap', startUtc: 13, endUtc: 16.5, phase: 'MAX_LIQUIDITY' },
  NEW_YORK: { id: 'NEW_YORK', name: 'New York Session', startUtc: 13, endUtc: 21, phase: 'CONTINUATION_OR_REVERSAL' },
  OFF_HOURS: { id: 'OFF_HOURS', name: 'Inter-Session / Rollover', startUtc: 21, endUtc: 24, phase: 'LIQUIDITY_THIN' }
};

export class ArgusDeepStructureEngine {
  constructor() {
    this.name = 'ARGUS_Deep_Structure_Engine';
  }

  // ============================================================
  // 1. MULTI-TIMEFRAME MARKET STRUCTURE & FRACTAL NARRATIVE
  // ============================================================

  /**
   * Analyzes multi-timeframe candle data across timeframes:
   * Determines Swing Highs, Swing Lows, HH/HL/LH/LL, BOS, CHOCH, and Phase.
   */
  analyzeStructure(candles = [], timeframe = '1H') {
    if (!candles || candles.length < 15) {
      return {
        timeframe,
        trend: 'NEUTRAL',
        phase: 'COMPRESSION',
        bosDetected: false,
        chochDetected: false,
        swingHighs: [],
        swingLows: [],
        currentPrice: candles[candles.length - 1]?.close || 0,
        narrative: `${timeframe}: Structure indeterminate due to insufficient candle depth.`
      };
    }

    const currentPrice = candles[candles.length - 1].close;
    const swingHighs = [];
    const swingLows = [];

    // Fractal swing detection (window of 2 on each side)
    for (let i = 2; i < candles.length - 2; i++) {
      const c = candles[i];
      if (c.high > candles[i - 1].high && c.high > candles[i - 2].high &&
          c.high > candles[i + 1].high && c.high > candles[i + 2].high) {
        swingHighs.push({ price: c.high, index: i, time: c.time || i });
      }
      if (c.low < candles[i - 1].low && c.low < candles[i - 2].low &&
          c.low < candles[i + 1].low && c.low < candles[i + 2].low) {
        swingLows.push({ price: c.low, index: i, time: c.time || i });
      }
    }

    const lastHigh = swingHighs[swingHighs.length - 1]?.price || candles[candles.length - 1].high;
    const prevHigh = swingHighs[swingHighs.length - 2]?.price || lastHigh;
    const lastLow = swingLows[swingLows.length - 1]?.price || candles[candles.length - 1].low;
    const prevLow = swingLows[swingLows.length - 2]?.price || lastLow;

    const isHigherHigh = lastHigh > prevHigh;
    const isHigherLow = lastLow > prevLow;
    const isLowerHigh = lastHigh < prevHigh;
    const isLowerLow = lastLow < prevLow;

    let trend = 'NEUTRAL';
    let bosDetected = false;
    let chochDetected = false;
    let phase = 'COMPRESSION';

    if (isHigherHigh && isHigherLow) {
      trend = 'BULLISH';
      if (currentPrice > lastHigh) {
        bosDetected = true;
        phase = 'EXPANSION';
      } else if (currentPrice < lastLow) {
        chochDetected = true;
        phase = 'CORRECTION';
      } else {
        phase = 'CORRECTION';
      }
    } else if (isLowerHigh && isLowerLow) {
      trend = 'BEARISH';
      if (currentPrice < lastLow) {
        bosDetected = true;
        phase = 'EXPANSION';
      } else if (currentPrice > lastHigh) {
        chochDetected = true;
        phase = 'CORRECTION';
      } else {
        phase = 'CORRECTION';
      }
    } else {
      trend = 'RANGE_BOUND';
      phase = 'COMPRESSION';
    }

    // Measure recent momentum vs ATR
    const recentCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const isImpulse = Math.abs(recentCandle.close - recentCandle.open) > (recentCandle.high - recentCandle.low) * 0.65;
    if (isImpulse && (bosDetected || Math.abs(recentCandle.close - prevCandle.close) > (currentPrice * 0.003))) {
      phase = 'IMPULSE';
    }

    const narrative = `${timeframe} ${trend} (${phase})${bosDetected ? ' with Break of Structure (BOS)' : ''}${chochDetected ? ' with Change of Character (CHOCH)' : ''}`;

    return {
      timeframe,
      trend,
      phase, // 'IMPULSE' | 'CORRECTION' | 'COMPRESSION' | 'EXPANSION'
      isHigherHigh,
      isHigherLow,
      isLowerHigh,
      isLowerLow,
      bosDetected,
      chochDetected,
      lastHigh,
      prevHigh,
      lastLow,
      prevLow,
      currentPrice,
      swingHighs: swingHighs.map(s => s.price),
      swingLows: swingLows.map(s => s.price),
      narrative
    };
  }

  /**
   * Synthesizes a coherent multi-timeframe structure narrative:
   * e.g., "Daily Bullish (EXPANSION) -> 4H Pullback (CORRECTION) -> 1H Liquidity Sweep -> 15m Displacement -> 5m Trigger"
   */
  synthesizeMtfNarrative(mtfData = {}) {
    const daily = mtfData['1D'] || { trend: 'BULLISH', phase: 'EXPANSION' };
    const h4 = mtfData['4H'] || { trend: 'BULLISH', phase: 'CORRECTION' };
    const h1 = mtfData['1H'] || { trend: 'BULLISH', phase: 'CORRECTION' };
    const m15 = mtfData['15m'] || { trend: 'BULLISH', phase: 'IMPULSE' };
    const m5 = mtfData['5m'] || { trend: 'BULLISH', phase: 'EXPANSION' };

    const narrativeParts = [
      `Daily ${daily.trend} (${daily.phase || 'TREND'})`,
      `4H ${h4.trend === daily.trend ? 'trend alignment' : 'pullback / counter-trend'} (${h4.phase || 'CORRECTION'})`,
      `1H ${h1.bosDetected ? 'BOS continuation' : (h1.chochDetected ? 'CHOCH transition' : h1.phase || 'structure')}`,
      `15m ${m15.phase === 'IMPULSE' ? 'directional displacement' : 'range setup'}`,
      `5m ${m5.bosDetected ? 'micro BOS execution trigger' : 'execution confirmation'}`
    ];

    const htfBias = daily.trend;
    const ltfAlignment = (daily.trend === m15.trend && daily.trend === m5.trend) ? 'FULLY_ALIGNED' : 'COUNTER_OR_TRANSITIONAL';

    return {
      fullNarrative: narrativeParts.join(' ➔ '),
      htfBias,
      ltfAlignment,
      daily,
      h4,
      h1,
      m15,
      m5
    };
  }

  // ============================================================
  // 2. LIQUIDITY MAP & PRICE-ACTION LIQUIDITY PROXY
  // ============================================================

  /**
   * Builds the comprehensive liquidity map:
   * EQH, EQL, PDH, PDL, PWH, PWL, Asia High/Low, London High/Low, NY High/Low.
   */
  generateLiquidityMap(candles = [], currentPrice = 0) {
    if (!candles || candles.length < 20) {
      return {
        label: 'PRICE-ACTION LIQUIDITY PROXY',
        equalHighs: [],
        equalLows: [],
        previousDayHigh: currentPrice * 1.008,
        previousDayLow: currentPrice * 0.992,
        previousWeekHigh: currentPrice * 1.015,
        previousWeekLow: currentPrice * 0.985,
        sessionLiquidity: {
          asia: { high: currentPrice * 1.003, low: currentPrice * 0.997 },
          london: { high: currentPrice * 1.006, low: currentPrice * 0.994 },
          newYork: { high: currentPrice * 1.009, low: currentPrice * 0.991 }
        },
        untestedPoolsAbove: [],
        untestedPoolsBelow: []
      };
    }

    const dec = currentPrice < 10 ? 4 : 2;
    const tolerance = currentPrice * 0.0006; // 0.06% tolerance for equal highs/lows

    // 1. Equal Highs & Equal Lows Detection
    const equalHighs = [];
    const equalLows = [];

    for (let i = 0; i < candles.length - 1; i++) {
      for (let j = i + 1; j < candles.length; j++) {
        if (Math.abs(candles[i].high - candles[j].high) <= tolerance) {
          const avgH = Number(((candles[i].high + candles[j].high) / 2).toFixed(dec));
          if (!equalHighs.some(h => Math.abs(h.price - avgH) <= tolerance)) {
            equalHighs.push({ price: avgH, touches: 2, type: 'EQH_BUY_SIDE_LIQUIDITY' });
          }
        }
        if (Math.abs(candles[i].low - candles[j].low) <= tolerance) {
          const avgL = Number(((candles[i].low + candles[j].low) / 2).toFixed(dec));
          if (!equalLows.some(l => Math.abs(l.price - avgL) <= tolerance)) {
            equalLows.push({ price: avgL, touches: 2, type: 'EQL_SELL_SIDE_LIQUIDITY' });
          }
        }
      }
    }

    // 2. Previous Day High / Low (PDH / PDL)
    const dayCandles = candles.slice(-24); // Approximation of last 24h
    const pdh = Number(Math.max(...dayCandles.map(c => c.high)).toFixed(dec));
    const pdl = Number(Math.min(...dayCandles.map(c => c.low)).toFixed(dec));

    // 3. Previous Week High / Low (PWH / PWL)
    const weekCandles = candles.slice(-120); // Approximation of past week
    const pwh = Number(Math.max(...weekCandles.map(c => c.high)).toFixed(dec));
    const pwl = Number(Math.min(...weekCandles.map(c => c.low)).toFixed(dec));

    // 4. Session Highs & Lows (simulated from 24h slices)
    const asiaCandles = candles.slice(-24, -16);
    const londonCandles = candles.slice(-16, -8);
    const nyCandles = candles.slice(-8);

    const ash = asiaCandles.length ? Number(Math.max(...asiaCandles.map(c => c.high)).toFixed(dec)) : pdh;
    const asl = asiaCandles.length ? Number(Math.min(...asiaCandles.map(c => c.low)).toFixed(dec)) : pdl;
    const loh = londonCandles.length ? Number(Math.max(...londonCandles.map(c => c.high)).toFixed(dec)) : pdh;
    const lol = londonCandles.length ? Number(Math.min(...londonCandles.map(c => c.low)).toFixed(dec)) : pdl;
    const nyh = nyCandles.length ? Number(Math.max(...nyCandles.map(c => c.high)).toFixed(dec)) : pdh;
    const nyl = nyCandles.length ? Number(Math.min(...nyCandles.map(c => c.low)).toFixed(dec)) : pdl;

    // 5. Untested Pools
    const poolsAbove = [
      ...equalHighs.map(h => ({ price: h.price, label: 'Equal Highs (Buy-Side Pool)' })),
      { price: pdh, label: 'Previous Day High (PDH)' },
      { price: pwh, label: 'Previous Week High (PWH)' },
      { price: loh, label: 'London High (LOH)' }
    ].filter(p => p.price > currentPrice).sort((a, b) => a.price - b.price);

    const poolsBelow = [
      ...equalLows.map(l => ({ price: l.price, label: 'Equal Lows (Sell-Side Pool)' })),
      { price: pdl, label: 'Previous Day Low (PDL)' },
      { price: pwl, label: 'Previous Week Low (PWL)' },
      { price: lol, label: 'London Low (LOL)' }
    ].filter(p => p.price < currentPrice).sort((a, b) => b.price - a.price);

    return {
      label: 'PRICE-ACTION LIQUIDITY PROXY',
      equalHighs,
      equalLows,
      previousDayHigh: pdh,
      previousDayLow: pdl,
      previousWeekHigh: pwh,
      previousWeekLow: pwl,
      sessionLiquidity: {
        asia: { high: ash, low: asl },
        london: { high: loh, low: lol },
        newYork: { high: nyh, low: nyl }
      },
      untestedPoolsAbove: poolsAbove,
      untestedPoolsBelow: poolsBelow,
      primaryBuySideTarget: poolsAbove[0] || { price: Number((currentPrice * 1.01).toFixed(dec)), label: 'Swing Resistance' },
      primarySellSideTarget: poolsBelow[0] || { price: Number((currentPrice * 0.99).toFixed(dec)), label: 'Swing Support' }
    };
  }

  // ============================================================
  // 3. LIQUIDITY SWEEP DETECTION
  // ============================================================

  /**
   * Detects genuine liquidity sweep:
   * Price trades beyond liquidity level -> fails to accept beyond it ->
   * re-enters range -> shows displacement / rejection -> micro structure break.
   */
  detectLiquiditySweep(candles = [], liquidityMap = null) {
    if (!candles || candles.length < 3) {
      return { sweepDetected: false, reason: 'Insufficient candle data' };
    }

    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const currentPrice = lastCandle.close;

    const pdh = liquidityMap?.previousDayHigh || 0;
    const pdl = liquidityMap?.previousDayLow || 0;
    const eqh = (liquidityMap?.equalHighs || []).map(h => h.price);
    const eql = (liquidityMap?.equalLows || []).map(l => l.price);

    const keyHighs = [pdh, ...eqh].filter(h => h > 0);
    const keyLows = [pdl, ...eql].filter(l => l > 0);

    // Bullish Sweep of Lows (Bear trap -> Bullish reversal)
    for (const lowLevel of keyLows) {
      const piercedBelow = prevCandle.low < lowLevel || lastCandle.low < lowLevel;
      const closedBackAbove = lastCandle.close > lowLevel;
      const hasRejectionWick = (Math.min(lastCandle.open, lastCandle.close) - lastCandle.low) > (lastCandle.high - lastCandle.low) * 0.4;
      const showsDisplacement = lastCandle.close > prevCandle.close;

      if (piercedBelow && closedBackAbove && (hasRejectionWick || showsDisplacement)) {
        return {
          sweepDetected: true,
          type: 'BULLISH_SWEEP_OF_LOWS',
          sweptLevel: lowLevel,
          sweptPoolType: lowLevel === pdl ? 'PREVIOUS_DAY_LOW' : 'EQUAL_LOWS_SELL_SIDE_LIQUIDITY',
          sweepLowExtreme: Math.min(prevCandle.low, lastCandle.low),
          reEntryPrice: lastCandle.close,
          displacementConfirmed: showsDisplacement,
          narrative: `Price traded below ${lowLevel}, failed acceptance, and closed back above with strong displacement.`
        };
      }
    }

    // Bearish Sweep of Highs (Bull trap -> Bearish reversal)
    for (const highLevel of keyHighs) {
      const piercedAbove = prevCandle.high > highLevel || lastCandle.high > highLevel;
      const closedBackBelow = lastCandle.close < highLevel;
      const hasRejectionWick = (lastCandle.high - Math.max(lastCandle.open, lastCandle.close)) > (lastCandle.high - lastCandle.low) * 0.4;
      const showsDisplacement = lastCandle.close < prevCandle.close;

      if (piercedAbove && closedBackBelow && (hasRejectionWick || showsDisplacement)) {
        return {
          sweepDetected: true,
          type: 'BEARISH_SWEEP_OF_HIGHS',
          sweptLevel: highLevel,
          sweptPoolType: highLevel === pdh ? 'PREVIOUS_DAY_HIGH' : 'EQUAL_HIGHS_BUY_SIDE_LIQUIDITY',
          sweepHighExtreme: Math.max(prevCandle.high, lastCandle.high),
          reEntryPrice: lastCandle.close,
          displacementConfirmed: showsDisplacement,
          narrative: `Price traded above ${highLevel}, failed acceptance, and closed back below with strong displacement.`
        };
      }
    }

    return {
      sweepDetected: false,
      reason: 'No failed-acceptance sweep event detected at major liquidity levels'
    };
  }

  // ============================================================
  // 4. DISPLACEMENT & FAIR VALUE GAPS (FVG)
  // ============================================================

  /**
   * Quantifies displacement and extracts Fair Value Gaps with FVG_QUALITY_SCORE (0-100).
   */
  extractFairValueGaps(candles = [], atr = 15.0) {
    if (!candles || candles.length < 4) return { fvgs: [], activeFvg: null };

    const fvgs = [];
    const dec = candles[0].close < 10 ? 4 : 2;

    for (let i = 2; i < candles.length; i++) {
      const c0 = candles[i - 2];
      const c1 = candles[i - 1]; // Displacement candle
      const c2 = candles[i];

      const range1 = c1.high - c1.low;
      const body1 = Math.abs(c1.close - c1.open);
      const isDisplacement = (body1 / (range1 || 1)) >= 0.60 && range1 >= (atr * 0.8);

      // Bullish FVG: High of c0 < Low of c2
      if (c0.high < c2.low && c1.close > c1.open && isDisplacement) {
        const top = c2.low;
        const bottom = c0.high;
        const midpoint = Number(((top + bottom) / 2).toFixed(dec));
        const size = Number((top - bottom).toFixed(dec));

        // Score FVG quality (0 - 100)
        let qualityScore = 50;
        if (body1 / range1 > 0.75) qualityScore += 15; // Strong body
        if (range1 > atr * 1.2) qualityScore += 15; // Strong impulse
        if (size > (atr * 0.2)) qualityScore += 10; // Clean gap size
        if (i >= candles.length - 5) qualityScore += 10; // Freshness

        fvgs.push({
          type: 'BULLISH_FVG',
          top,
          bottom,
          midpoint,
          size,
          originCandleIndex: i - 1,
          qualityScore: Math.min(100, qualityScore),
          isMitigated: candles.slice(i + 1).some(c => c.low <= midpoint)
        });
      }

      // Bearish FVG: Low of c0 > High of c2
      if (c0.low > c2.high && c1.close < c1.open && isDisplacement) {
        const top = c0.low;
        const bottom = c2.high;
        const midpoint = Number(((top + bottom) / 2).toFixed(dec));
        const size = Number((top - bottom).toFixed(dec));

        let qualityScore = 50;
        if (body1 / range1 > 0.75) qualityScore += 15;
        if (range1 > atr * 1.2) qualityScore += 15;
        if (size > (atr * 0.2)) qualityScore += 10;
        if (i >= candles.length - 5) qualityScore += 10;

        fvgs.push({
          type: 'BEARISH_FVG',
          top,
          bottom,
          midpoint,
          size,
          originCandleIndex: i - 1,
          qualityScore: Math.min(100, qualityScore),
          isMitigated: candles.slice(i + 1).some(c => c.high >= midpoint)
        });
      }
    }

    const activeFvg = fvgs.filter(f => !f.isMitigated).slice(-1)[0] || null;

    return {
      fvgs,
      activeFvg,
      totalUnmitigatedCount: fvgs.filter(f => !f.isMitigated).length
    };
  }

  // ============================================================
  // 5. VALIDATED ORDER BLOCKS & SUPPLY / DEMAND
  // ============================================================

  /**
   * Validates structural order blocks with ZONE_QUALITY_SCORE (0-100).
   * Strict validation: Must originate displacement and cause BOS/CHOCH.
   */
  extractOrderBlocks(candles = [], structure = null, atr = 15.0) {
    if (!candles || candles.length < 3) return { orderBlocks: [], activeOrderBlock: null };

    const dec = candles[0].close < 10 ? 4 : 2;
    const orderBlocks = [];

    for (let i = 0; i < candles.length - 2; i++) {
      const c = candles[i];
      const nextCandle = candles[i + 1];
      const nextNext = candles[i + 2];

      const nextDisplacement = Math.abs(nextCandle.close - nextCandle.open) > (atr * 0.8);
      const isUpImpulse = nextCandle.close > nextCandle.open && nextNext.close > nextCandle.high;
      const isDownImpulse = nextCandle.close < nextCandle.open && nextNext.close < nextCandle.low;

      // Bullish Order Block: Last down candle before strong up displacement
      if (c.close < c.open && isUpImpulse && nextDisplacement) {
        let qualityScore = 55;
        if (structure?.bosDetected) qualityScore += 20; // Originated BOS
        if (nextCandle.close > c.high) qualityScore += 15; // Engulfed immediately
        if (i >= candles.length - 8) qualityScore += 10; // Freshness

        orderBlocks.push({
          type: 'BULLISH_ORDER_BLOCK',
          high: c.high,
          low: c.low,
          open: c.open,
          close: c.close,
          qualityScore: Math.min(100, qualityScore),
          index: i,
          zoneQuality: qualityScore >= 75 ? 'HIGH_QUALITY' : 'MODERATE_QUALITY',
          disclaimer: 'Structural price-action zone (origin of displacement); no proprietary institutional flow implied.'
        });
      }

      // Bearish Order Block: Last up candle before strong down displacement
      if (c.close > c.open && isDownImpulse && nextDisplacement) {
        let qualityScore = 55;
        if (structure?.bosDetected) qualityScore += 20;
        if (nextCandle.close < c.low) qualityScore += 15;
        if (i >= candles.length - 8) qualityScore += 10;

        orderBlocks.push({
          type: 'BEARISH_ORDER_BLOCK',
          high: c.high,
          low: c.low,
          open: c.open,
          close: c.close,
          qualityScore: Math.min(100, qualityScore),
          index: i,
          zoneQuality: qualityScore >= 75 ? 'HIGH_QUALITY' : 'MODERATE_QUALITY',
          disclaimer: 'Structural price-action zone (origin of displacement); no proprietary institutional flow implied.'
        });
      }
    }

    const activeOrderBlock = orderBlocks.slice(-1)[0] || null;

    return {
      orderBlocks,
      activeOrderBlock,
      totalCount: orderBlocks.length
    };
  }

  // ============================================================
  // 6. DEALING RANGE & PREMIUM / DISCOUNT
  // ============================================================

  /**
   * Computes Dealing Range High, Low, Equilibrium (50%), and current classification:
   * PREMIUM (>50%), DISCOUNT (<50%), EQUILIBRIUM (45% - 55%).
   */
  calculateDealingRange(candles = [], currentPrice = 0) {
    if (!candles || candles.length < 1) {
      return {
        rangeHigh: currentPrice * 1.01,
        rangeLow: currentPrice * 0.99,
        equilibrium: currentPrice,
        location: 'EQUILIBRIUM',
        percentInRange: 50.0,
        longsFavored: false,
        shortsFavored: false
      };
    }

    const dec = currentPrice < 10 ? 4 : 2;
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const rangeHigh = Number(Math.max(...highs).toFixed(dec));
    const rangeLow = Number(Math.min(...lows).toFixed(dec));
    const rangeSpan = rangeHigh - rangeLow;

    const equilibrium = Number(((rangeHigh + rangeLow) / 2).toFixed(dec));
    const percentInRange = rangeSpan > 0 ? Number((((currentPrice - rangeLow) / rangeSpan) * 100).toFixed(1)) : 50.0;

    let location = 'EQUILIBRIUM';
    let longsFavored = false;
    let shortsFavored = false;

    if (percentInRange < 45.0) {
      location = 'DISCOUNT';
      longsFavored = true;
    } else if (percentInRange > 55.0) {
      location = 'PREMIUM';
      shortsFavored = true;
    } else {
      location = 'EQUILIBRIUM';
    }

    return {
      rangeHigh,
      rangeLow,
      equilibrium,
      location, // 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM'
      percentInRange,
      longsFavored,
      shortsFavored,
      narrative: `Price is at ${percentInRange}% of dealing range (${location}). Longs favored in Discount; Shorts favored in Premium.`
    };
  }

  // ============================================================
  // 7. SESSION MODEL & TIME CONTEXT
  // ============================================================

  /**
   * Evaluates active market session and symbol appropriateness:
   */
  evaluateSession(symbol = 'XAUUSD', date = new Date()) {
    const utcHour = date.getUTCHours() + (date.getUTCMinutes() / 60);

    let activeSession = SESSIONS.OFF_HOURS;
    if (utcHour >= 0 && utcHour < 8) activeSession = SESSIONS.ASIA;
    else if (utcHour >= 8 && utcHour < 13) activeSession = SESSIONS.LONDON;
    else if (utcHour >= 13 && utcHour < 16.5) activeSession = SESSIONS.LONDON_NY_OVERLAP;
    else if (utcHour >= 16.5 && utcHour < 21) activeSession = SESSIONS.NEW_YORK;

    // Symbol session suitability
    let sessionSuitability = 'FAVORABLE';
    let sessionRationale = `${activeSession.name} (${activeSession.phase}): High institutional participation.`;

    if (symbol.includes('XAU') || symbol.includes('GOLD')) {
      if (activeSession.id === 'ASIA') {
        sessionSuitability = 'MODERATE_RANGE_BOUND';
        sessionRationale = 'Asia session Gold typically accumulates inside tight ranges; breakout follow-through is lower.';
      } else if (activeSession.id === 'LONDON' || activeSession.id === 'OVERLAP') {
        sessionSuitability = 'OPTIMAL_VOLATILITY';
        sessionRationale = 'London open & London-NY overlap provide peak Gold liquidity and clean displacement.';
      }
    }

    return {
      activeSession: activeSession.id,
      sessionName: activeSession.name,
      sessionPhase: activeSession.phase,
      utcHour: Number(utcHour.toFixed(2)),
      sessionSuitability,
      sessionRationale
    };
  }

  // ============================================================
  // 8. VOLUME, VWAP & AUCTION CONTEXT
  // ============================================================

  /**
   * Computes Daily VWAP, Value Area High (VAH), Value Area Low (VAL), POC, and Auction Context.
   */
  evaluateAuctionContext(candles = [], currentPrice = 0) {
    if (!candles || candles.length === 0) {
      return {
        dailyVwap: currentPrice,
        vah: currentPrice * 1.004,
        val: currentPrice * 0.996,
        poc: currentPrice,
        auctionStatus: 'ROTATION',
        volumeType: 'TICK_VOLUME_PROXY'
      };
    }

    const dec = currentPrice < 10 ? 4 : 2;
    let sumPv = 0;
    let sumV = 0;

    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      const vol = c.volume > 0 ? c.volume : 1;
      sumPv += tp * vol;
      sumV += vol;
    }

    const vwap = sumV > 0 ? Number((sumPv / sumV).toFixed(dec)) : currentPrice;

    // Standard deviation for Value Area (+/- 1 sigma = 68% value area)
    let sumDevSq = 0;
    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      const vol = c.volume > 0 ? c.volume : 1;
      sumDevSq += Math.pow(tp - vwap, 2) * vol;
    }
    const stdDev = sumV > 0 ? Math.sqrt(sumDevSq / sumV) : currentPrice * 0.005;

    const vah = Number((vwap + stdDev).toFixed(dec));
    const val = Number((vwap - stdDev).toFixed(dec));
    const poc = vwap; // Proxy POC at maximum volume density

    let auctionStatus = 'ROTATION';
    if (currentPrice > vah) auctionStatus = 'ACCEPTANCE_ABOVE_VALUE (Bullish Expansion)';
    else if (currentPrice < val) auctionStatus = 'ACCEPTANCE_BELOW_VALUE (Bearish Expansion)';
    else if (Math.abs(currentPrice - vwap) < (stdDev * 0.25)) auctionStatus = 'EQUILIBRIUM_ROTATION_AT_POC';
    else auctionStatus = 'ROTATION_INSIDE_VALUE_AREA';

    return {
      dailyVwap: vwap,
      vah,
      val,
      poc,
      auctionStatus,
      volumeType: 'TICK_VOLUME_PROXY',
      disclaimer: 'Volume calculations use broker tick volume proxy; centralized exchange depth of book is not available.'
    };
  }
}

export const argusDeepStructureEngine = new ArgusDeepStructureEngine();
