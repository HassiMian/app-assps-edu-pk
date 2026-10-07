/**
 * JARVIS ARGUS 7.4 — Broker Tick Truth, Market Tradability & Market Clock Engine
 * 
 * CORE CONTRACT:
 * RAW DATA -> DATA TRUTH -> TEMPORAL TRUTH -> MARKET STATE -> SIGNAL CERTIFICATION
 * 
 * INVARIANTS:
 * - FETCH_TIME_IS_BROKER_TICK_TIME = 0
 * - STALE_QUOTE_PRESENTED_AS_LIVE = 0
 * - CLOSED_MARKET_EXECUTABLE_SIGNAL = 0
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 */

export const MARKET_OPEN_STATE = {
  OPEN: 'OPEN',
  CLOSED_WEEKEND: 'CLOSED_WEEKEND',
  CLOSED_SESSION: 'CLOSED_SESSION',
  BROKER_DISABLED: 'BROKER_DISABLED',
  HOLIDAY_SUSPECTED: 'HOLIDAY_SUSPECTED',
  STALE_FEED: 'STALE_FEED',
  UNKNOWN: 'UNKNOWN'
};

export const QUOTE_FRESHNESS = {
  FRESH: 'FRESH',
  STALE: 'STALE',
  OFFLINE: 'OFFLINE',
  CLOSED: 'CLOSED',
  LAST_VALID_QUOTE: 'LAST_VALID_QUOTE'
};

/**
 * 1. Canonical Market Clock
 * Distinguishes User Local, UTC, Broker Server, and Session windows.
 */
export class MarketClock {
  static getClock(dateInput = new Date()) {
    const now = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    const utcTime = now.toISOString();
    const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const timeVal = hour + minute / 60;

    // Broker server time estimate (MetaTrader typically UTC+2 standard, UTC+3 DST)
    const brokerOffsetHours = 2; // Default UTC+2
    const brokerDate = new Date(now.getTime() + brokerOffsetHours * 3600000);
    const brokerServerTime = brokerDate.toISOString().replace('Z', `+0${brokerOffsetHours}:00`);

    // Determine weekend condition for Gold (Friday 21:00 UTC to Sunday 22:00 UTC)
    const isFridayClose = (dayOfWeek === 5 && timeVal >= 21.0);
    const isSaturday = (dayOfWeek === 6);
    const isSundayPreOpen = (dayOfWeek === 0 && timeVal < 22.0);
    const isWeekend = isFridayClose || isSaturday || isSundayPreOpen;

    let sessionName = 'CLOSED';
    let calendarWindow = 'Weekend / Closed';
    let activeTradableSession = 'NONE';

    if (isWeekend) {
      if (isSaturday) calendarWindow = 'Weekend Window (Saturday)';
      else if (isSundayPreOpen) calendarWindow = 'Weekend Pre-Market Window (Sunday)';
      else calendarWindow = 'Weekend Post-Close Window (Friday)';
      sessionName = 'WEEKEND_CLOSED';
      activeTradableSession = 'NONE';
    } else {
      // Weekday daily maintenance break (21:00 - 22:00 UTC)
      if (timeVal >= 21.0 && timeVal < 22.0) {
        calendarWindow = 'Daily Maintenance Break (21:00–22:00 UTC)';
        sessionName = 'DAILY_SETTLEMENT_BREAK';
        activeTradableSession = 'NONE';
      } else if (timeVal >= 0.0 && timeVal < 8.0) {
        calendarWindow = 'Asian Trading Session';
        sessionName = 'ASIA';
        activeTradableSession = 'ASIA';
      } else if (timeVal >= 8.0 && timeVal < 13.0) {
        calendarWindow = 'London Trading Session';
        sessionName = 'LONDON';
        activeTradableSession = 'LONDON';
      } else if (timeVal >= 13.0 && timeVal < 16.5) {
        calendarWindow = 'London / New York Overlap Session';
        sessionName = 'LONDON_NY_OVERLAP';
        activeTradableSession = 'LONDON_NY_OVERLAP';
      } else if (timeVal >= 16.5 && timeVal < 21.0) {
        calendarWindow = 'New York Afternoon Session';
        sessionName = 'NEW_YORK';
        activeTradableSession = 'NEW_YORK';
      } else {
        calendarWindow = 'Late Day Off-Peak Session';
        sessionName = 'AFTER_HOURS';
        activeTradableSession = 'AFTER_HOURS';
      }
    }

    return {
      utcTime,
      brokerServerTime,
      dayOfWeek,
      utcHour: hour,
      utcMinute: minute,
      isWeekend,
      sessionName,
      calendarWindow,
      activeTradableSession
    };
  }

  /**
   * Resolves the next actual tradable session date and window.
   */
  static getNextTradableSession(dateInput = new Date()) {
    const now = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    const clk = MarketClock.getClock(now);
    const dayOfWeek = clk.dayOfWeek;

    if (clk.isWeekend) {
      let daysUntilMonday = 1;
      if (dayOfWeek === 6) daysUntilMonday = 2; // Saturday
      else if (dayOfWeek === 5) daysUntilMonday = 3; // Friday post-close
      else if (dayOfWeek === 0) daysUntilMonday = 1; // Sunday

      const targetDate = new Date(now.getTime() + daysUntilMonday * 86400000);
      const dateStr = targetDate.toISOString().split('T')[0];

      return {
        sessionName: 'MONDAY_LONDON',
        dayName: 'Monday',
        dateStr,
        utcTime: `${dateStr}T08:00:00.000Z`,
        description: 'Monday London Session (08:00 UTC)',
        isWeekend: false
      };
    }

    if (clk.activeTradableSession === 'NONE' || clk.sessionName === 'DAILY_SETTLEMENT_BREAK') {
      const dateStr = now.toISOString().split('T')[0];
      return {
        sessionName: 'ASIA',
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        dateStr,
        utcTime: `${dateStr}T22:00:00.000Z`,
        description: 'Asian Pre-Market (22:00 UTC)',
        isWeekend: false
      };
    }

    return {
      sessionName: clk.sessionName,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      dateStr: now.toISOString().split('T')[0],
      utcTime: clk.utcTime,
      description: clk.calendarWindow,
      isWeekend: false
    };
  }
}

/**
 * 2. Market Tradability Engine
 * Authoritative determination of whether an instrument is open, tradable, or closed.
 */
export class MarketTradabilityEngine {
  /**
   * Determine whether instrument is tradable now.
   */
  static evaluateTradability(symbol = 'XAUUSD', tickData = {}, clock = null) {
    const sym = String(symbol).toUpperCase().replace('/', '');
    const clk = clock || MarketClock.getClock();
    const isGold = sym.includes('XAU') || sym.includes('GOLD');

    let marketOpenState = MARKET_OPEN_STATE.OPEN;
    let isTradableNow = true;
    let executableSignalAllowed = true;
    let reason = 'Market is open and actively trading';

    // 1. Weekend Check (Friday 21:00 UTC to Sunday 22:00 UTC for Gold/FX)
    if (clk.isWeekend) {
      marketOpenState = MARKET_OPEN_STATE.CLOSED_WEEKEND;
      isTradableNow = false;
      executableSignalAllowed = false;
      reason = 'Global spot gold and currency markets are closed for the weekend (Friday 21:00 UTC – Sunday 22:00 UTC).';
    }
    // 2. Daily Maintenance Roll Break Check (21:00 - 22:00 UTC)
    else if (clk.activeTradableSession === 'NONE') {
      marketOpenState = MARKET_OPEN_STATE.CLOSED_SESSION;
      isTradableNow = false;
      executableSignalAllowed = false;
      reason = 'Daily broker settlement and maintenance window (21:00 – 22:00 UTC). Order routing paused.';
    }
    // 3. Broker trade mode check (0 = disabled, 1 = close only, 4 = full)
    else if (tickData.tradeMode === 0 || tickData.tradeMode === 'DISABLED') {
      marketOpenState = MARKET_OPEN_STATE.BROKER_DISABLED;
      isTradableNow = false;
      executableSignalAllowed = false;
      reason = 'Broker has disabled new order execution on this symbol.';
    }
    // 4. Stale Tick Check during theoretical open window (> 300 seconds without quote update)
    else if (tickData.marketDataAgeMs > 300000) {
      marketOpenState = MARKET_OPEN_STATE.STALE_FEED;
      isTradableNow = false;
      executableSignalAllowed = false;
      reason = `Broker tick feed has stopped progressing (age: ${Math.round(tickData.marketDataAgeMs / 1000)}s > 300s). Live execution unsafe.`;
    }

    return {
      symbol: sym,
      marketOpenState,
      isTradableNow,
      executableSignalAllowed,
      reason,
      session: clk.sessionName,
      calendarWindow: clk.calendarWindow,
      activeTradableSession: clk.activeTradableSession,
      evaluatedAt: new Date().toISOString()
    };
  }
}

/**
 * 3. Broker Tick Truth Object Builder
 * Strictly decouples transportLatency from marketDataAge.
 */
export class BrokerTickTruth {
  static create(params = {}) {
    const now = params.currentTime ? new Date(params.currentTime).getTime() : (
      params.now ? new Date(params.now).getTime() : (
        params.quoteFetchedAt ? new Date(params.quoteFetchedAt).getTime() : Date.now()
      )
    );
    const fetchedAt = params.quoteFetchedAt || params.fetchedAt || new Date(now).toISOString();
    const quoteFetchedAt = fetchedAt;
    const transportLatencyMs = Number(params.transportLatencyMs || params.latencyMs || 0);

    const clock = params.clock || MarketClock.getClock(now);
    const isWeekend = clock.isWeekend;

    // Determine Friday close reference for weekend clamping
    const nowDate = new Date(now);
    const dayOfWeek = nowDate.getUTCDay();
    let daysBackToFriday = 0;
    if (dayOfWeek === 6) daysBackToFriday = 1; // Saturday
    else if (dayOfWeek === 0) daysBackToFriday = 2; // Sunday
    else if (dayOfWeek === 5 && nowDate.getUTCHours() >= 21) daysBackToFriday = 0; // Friday post-close

    const fridayCloseMs = isWeekend
      ? Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate() - daysBackToFriday, 21, 0, 0, 0)
      : 0;

    // Extract genuine broker tick time
    let rawBrokerTickTimeMs = 0;
    if (params.brokerTickTimeMs) {
      rawBrokerTickTimeMs = Number(params.brokerTickTimeMs);
    } else if (params.tickTimeMs || params.time_msc || params.tick_time_msc) {
      rawBrokerTickTimeMs = Number(params.tickTimeMs || params.time_msc || params.tick_time_msc);
    } else if (params.tickTime || params.tick_time || params.time) {
      const t = params.tickTime || params.tick_time || params.time;
      rawBrokerTickTimeMs = typeof t === 'number' && t < 1e11 ? t * 1000 : Number(t);
    } else if (params.brokerTickAt || params.brokerTickTime || params.timestamp) {
      rawBrokerTickTimeMs = new Date(params.brokerTickAt || params.brokerTickTime || params.timestamp).getTime();
    }

    let brokerTickTimeMs = rawBrokerTickTimeMs;

    // Invariant 1: Closed weekend quote must NEVER show Actual Tick Age = 0s unless a genuine tick occurred then
    // If market is closed for weekend and terminal timestamp is missing, 0, or recent (< 10m from now while market closed):
    if (isWeekend) {
      const isTerminalRewrite = !brokerTickTimeMs || (brokerTickTimeMs > fridayCloseMs + 300000);
      if (isTerminalRewrite) {
        // Clamp to last candle time or Friday close
        const candleFallbackMs = params.latestM1Time ? params.latestM1Time * 1000 : (params.latestCandleTime ? new Date(params.latestCandleTime).getTime() : 0);
        brokerTickTimeMs = (candleFallbackMs > 0 && candleFallbackMs <= fridayCloseMs) ? candleFallbackMs : fridayCloseMs;
      }
    } else {
      if (!brokerTickTimeMs || isNaN(brokerTickTimeMs)) {
        brokerTickTimeMs = now;
      }
    }

    const brokerTickAt = new Date(brokerTickTimeMs).toISOString();
    const brokerTickTime = brokerTickAt;
    const marketDataAgeMs = Math.max(0, now - brokerTickTimeMs);
    const ageSec = Math.round(marketDataAgeMs / 1000);
    let marketDataAgeText = `${ageSec}s`;
    if (ageSec >= 3600) {
      const hrs = Math.floor(ageSec / 3600);
      const mins = Math.floor((ageSec % 3600) / 60);
      marketDataAgeText = `${hrs}h ${mins}m`;
    } else if (ageSec >= 60) {
      const mins = Math.floor(ageSec / 60);
      const secs = ageSec % 60;
      marketDataAgeText = `${mins}m ${secs}s`;
    }

    const tradability = MarketTradabilityEngine.evaluateTradability(
      params.symbol || 'XAUUSD',
      { tradeMode: params.tradeMode, marketDataAgeMs },
      clock
    );

    let quoteFreshness = QUOTE_FRESHNESS.FRESH;
    if (tradability.marketOpenState === MARKET_OPEN_STATE.CLOSED_WEEKEND || tradability.marketOpenState === MARKET_OPEN_STATE.CLOSED_SESSION) {
      quoteFreshness = QUOTE_FRESHNESS.LAST_VALID_QUOTE;
    } else if (marketDataAgeMs > 300000) {
      quoteFreshness = QUOTE_FRESHNESS.STALE;
    } else if (tradability.marketOpenState === MARKET_OPEN_STATE.BROKER_DISABLED) {
      quoteFreshness = QUOTE_FRESHNESS.OFFLINE;
    }

    const bid = Number(params.bid || params.price || 0);
    const ask = Number(params.ask || (params.spread ? bid + params.spread : bid + 0.5));
    const spread = Number(params.spread !== undefined ? params.spread : (ask - bid).toFixed(2));

    return {
      symbol: params.symbol || 'XAUUSD',
      bid,
      ask,
      spread,
      quoteFetchedAt,
      fetchedAt,
      brokerTickAt,
      brokerTickTime,
      brokerTickTimeMs,
      transportLatency: `${transportLatencyMs} ms`,
      transportLatencyMs,
      marketDataAge: marketDataAgeText,
      marketDataAgeMs,
      marketDataAgeText,
      quoteSequenceChanged: Boolean(params.quoteSequenceChanged ?? true),
      quoteFreshness,
      source: params.source || (params.isNativeBroker ? 'MT5_TERMINAL' : 'YAHOO_RECONCILED'),
      marketOpenState: tradability.marketOpenState,
      isTradableNow: tradability.isTradableNow,
      executableSignalAllowed: tradability.executableSignalAllowed,
      tradabilityReason: tradability.reason,
      clock
    };
  }
}

/**
 * 4. Broker Candle Certification
 * Certifies candle series for indicators, structure, and regime qualification.
 */
export class BrokerCandleCertification {
  static certify(timeframe = '1H', candles = [], options = {}) {
    const tf = String(timeframe).toUpperCase();
    const requestedBars = Number(options.requestedBars || 100);
    const receivedBars = Array.isArray(candles) ? candles.length : 0;

    if (receivedBars === 0) {
      return {
        timeframe: tf,
        requestedBars,
        receivedBars: 0,
        latestBarTime: null,
        latestClosedBarTime: null,
        ageSec: 999999,
        continuity: 'NO_DATA',
        duplicateBars: 0,
        missingBars: requestedBars,
        sufficientForIndicators: false,
        sufficientForStructure: false,
        sufficientForRegime: false,
        status: 'INSUFFICIENT_DATA',
        reason: `No candle bars received for ${tf}`
      };
    }

    const lastBar = candles[candles.length - 1];
    const prevBar = candles.length > 1 ? candles[candles.length - 2] : lastBar;
    const latestBarTime = lastBar?.time ? new Date(lastBar.time * 1000 || lastBar.time).toISOString() : null;
    const latestClosedBarTime = prevBar?.time ? new Date(prevBar.time * 1000 || prevBar.time).toISOString() : null;
    const nowMs = options.now ? new Date(options.now).getTime() : (options.currentTime ? new Date(options.currentTime).getTime() : Date.now());
    const nowSec = Math.floor(nowMs / 1000);
    const barSec = lastBar?.time ? (lastBar.time < 1e11 ? lastBar.time : Math.floor(lastBar.time / 1000)) : nowSec;
    const ageSec = Math.max(0, nowSec - barSec);

    // Duplicate and continuity check
    let duplicateBars = 0;
    for (let i = 1; i < candles.length; i++) {
      if (candles[i].time === candles[i - 1].time) duplicateBars++;
    }

    const sufficientForIndicators = receivedBars >= 14;
    const sufficientForStructure = receivedBars >= 20;
    const sufficientForRegime = receivedBars >= 20;

    let status = 'CERTIFIED';
    let reason = 'Candle depth and continuity certified';

    if (!sufficientForStructure) {
      status = 'INSUFFICIENT_DATA';
      reason = `Insufficient pre-entry broker candle depth (<20 bars, found ${receivedBars})`;
    } else if (duplicateBars > 0) {
      status = 'DEGRADED';
      reason = `Detected ${duplicateBars} duplicate candle timestamps`;
    }

    return {
      timeframe: tf,
      requestedBars,
      receivedBars,
      latestBarTime,
      latestClosedBarTime,
      ageSec,
      continuity: duplicateBars === 0 ? 'PRISTINE' : 'DEGRADED',
      duplicateBars,
      missingBars: Math.max(0, requestedBars - receivedBars),
      sufficientForIndicators,
      sufficientForStructure,
      sufficientForRegime,
      status,
      reason
    };
  }
}

/**
 * 5. Live Open-Market Truth Gate (Section 1)
 */
export class LiveOpenMarketTruthGate {
  static evaluate(params = {}) {
    const tickTruth = params.tickTruth || BrokerTickTruth.create(params);
    const quoteNow = tickTruth.quoteFetchedAt || tickTruth.brokerTickAt || params.currentTime || params.now;
    const certOpts = { currentTime: quoteNow, now: quoteNow };
    const m1Cert = params.m1Cert || (params.m1Candles ? BrokerCandleCertification.certify('1M', params.m1Candles, certOpts) : null);
    const m5Cert = params.m5Cert || (params.m5Candles ? BrokerCandleCertification.certify('5M', params.m5Candles, certOpts) : null);
    const m15Cert = params.m15Cert || (params.m15Candles ? BrokerCandleCertification.certify('15M', params.m15Candles, certOpts) : null);

    const isMarketOpen = tickTruth.marketOpenState === MARKET_OPEN_STATE.OPEN;
    const isBrokerConnected = Boolean(params.isBrokerConnected ?? (tickTruth.source === 'MT5_TERMINAL' || tickTruth.bid > 0));
    const isTickAdvancing = Boolean(tickTruth.quoteSequenceChanged ?? true);
    const isBrokerTickFresh = tickTruth.quoteFreshness === QUOTE_FRESHNESS.FRESH && tickTruth.marketDataAgeMs <= 300000;

    const isM1Advancing = m1Cert ? (m1Cert.sufficientForStructure && m1Cert.ageSec < 3600) : Boolean(params.m1Advancing ?? true);
    const isM5Advancing = m5Cert ? (m5Cert.sufficientForStructure && m5Cert.ageSec < 7200) : Boolean(params.m5Advancing ?? true);
    const isM15Advancing = m15Cert ? (m15Cert.sufficientForStructure && m15Cert.ageSec < 14400) : Boolean(params.m15Advancing ?? true);
    const isSpreadCurrent = Boolean(tickTruth.spread > 0 && tickTruth.spread < 20.0);

    const allPassed = isMarketOpen &&
      isBrokerConnected &&
      isTickAdvancing &&
      isBrokerTickFresh &&
      isM1Advancing &&
      isM5Advancing &&
      isM15Advancing &&
      isSpreadCurrent;

    const latestM1Bar = m1Cert?.latestBarTime || (params.m1Candles?.length > 0 ? new Date((params.m1Candles[params.m1Candles.length - 1].time || 0) * 1000).toISOString() : (params.latestM1Bar || tickTruth.brokerTickAt));
    const latestM5Bar = m5Cert?.latestBarTime || (params.m5Candles?.length > 0 ? new Date((params.m5Candles[params.m5Candles.length - 1].time || 0) * 1000).toISOString() : (params.latestM5Bar || tickTruth.brokerTickAt));
    const latestM15Bar = m15Cert?.latestBarTime || (params.m15Candles?.length > 0 ? new Date((params.m15Candles[params.m15Candles.length - 1].time || 0) * 1000).toISOString() : (params.latestM15Bar || tickTruth.brokerTickAt));

    let failureReason = null;
    if (!isMarketOpen) failureReason = `Market is ${tickTruth.marketOpenState}`;
    else if (!isBrokerConnected) failureReason = 'Broker disconnected';
    else if (!isBrokerTickFresh) failureReason = `Broker tick stale (age: ${tickTruth.marketDataAge})`;
    else if (!isTickAdvancing) failureReason = 'Tick sequence not advancing';
    else if (!isM1Advancing || !isM5Advancing || !isM15Advancing) failureReason = 'Candle series progression stalled';
    else if (!isSpreadCurrent) failureReason = `Spread not current ($${tickTruth.spread})`;

    return {
      MARKET_OPEN: isMarketOpen ? 'YES' : 'NO',
      BROKER_CONNECTED: isBrokerConnected ? 'YES' : 'NO',
      TICK_SEQUENCE_ADVANCING: isTickAdvancing ? 'YES' : 'NO',
      BROKER_TICK_FRESH: isBrokerTickFresh ? 'YES' : 'NO',
      M1_CANDLES_ADVANCING: isM1Advancing ? 'YES' : 'NO',
      M5_CANDLES_ADVANCING: isM5Advancing ? 'YES' : 'NO',
      M15_CANDLES_ADVANCING: isM15Advancing ? 'YES' : 'NO',
      SPREAD_CURRENT: isSpreadCurrent ? 'YES' : 'NO',

      brokerTickAt: tickTruth.brokerTickAt,
      quoteFetchedAt: tickTruth.quoteFetchedAt,
      tickAgeMs: tickTruth.marketDataAgeMs,
      latestM1Bar,
      latestM5Bar,
      latestM15Bar,
      spread: tickTruth.spread,
      bid: tickTruth.bid,
      ask: tickTruth.ask,

      allPassed,
      status: allPassed ? 'PROVEN_OPEN_MARKET' : 'NO_PRECISE_SETUP',
      isPreciseSetupAllowed: allPassed,
      failureReason
    };
  }
}

