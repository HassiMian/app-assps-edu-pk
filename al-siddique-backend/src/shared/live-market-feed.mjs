/**
 * Live Market Data Feed — Yahoo Finance + RSS News
 * Zero fake data. Every price is real. Staleness is tracked.
 */

const SYMBOLS = {
  XAUUSD: { yahoo: 'GC=F', name: 'Gold / US Dollar', decimals: 2 },
  EURUSD: { yahoo: 'EURUSD=X', name: 'Euro / US Dollar', decimals: 4 },
  GBPUSD: { yahoo: 'GBPUSD=X', name: 'British Pound / US Dollar', decimals: 4 },
  USDJPY: { yahoo: 'JPY=X', name: 'US Dollar / Japanese Yen', decimals: 2 },
  DXY:    { yahoo: 'DX-Y.NYB', name: 'US Dollar Index', decimals: 2 }
};

const TF_MAP = {
  '5m':  { interval: '5m',  range: '1d' },
  '15m': { interval: '15m', range: '5d' },
  '1H':  { interval: '1h',  range: '5d' },
  '4H':  { interval: '1h',  range: '1mo' },
  '1D':  { interval: '1d',  range: '6mo' }
};

const cache = new Map();
const CACHE_TTL_MS = 15_000;

function cacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export async function fetchQuote(symbol) {
  const key = cacheKey('quote', symbol);
  const cached = getCached(key);
  if (cached) return cached;

  const cfg = SYMBOLS[symbol];
  if (!cfg) return { error: `Unknown symbol: ${symbol}` };

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.yahoo}?interval=1m&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'JARVIS/1.0' } });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No market data returned');

    const result = json.chart.result[0];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const sparkline = closes.slice(-30).filter(v => v != null);
    
    const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
    const lastPrice = meta.regularMarketPrice;
    const change = lastPrice - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    const quote = {
      symbol, name: cfg.name,
      lastPrice: Number(lastPrice.toFixed(cfg.decimals)),
      previousClose: Number(prevClose?.toFixed(cfg.decimals) || 0),
      change: Number(change.toFixed(cfg.decimals)),
      changePercent: Number(changePct.toFixed(2)),
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
      fetchedAt: new Date().toISOString(),
      delayed: false, sparkline
    };

    setCache(key, quote);
    return quote;
  } catch (e) {
    return { symbol, error: e.message, lastPrice: 0, changePercent: 0, delayed: true };
  }
}

export async function fetchCandles(symbol, timeframe = '1H') {
  const key = cacheKey('candles', { symbol, timeframe });
  const cached = getCached(key);
  if (cached) return cached;

  const cfg = SYMBOLS[symbol];
  if (!cfg) return [];
  const tf = TF_MAP[timeframe] || TF_MAP['1H'];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.yahoo}?interval=${tf.interval}&range=${tf.range}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'JARVIS/1.0' } });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return [];

    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};

    let candles = [];
    for (let i = 0; i < ts.length; i++) {
      if (q.open?.[i] == null || q.close?.[i] == null) continue;
      candles.push({
        time: ts[i] * 1000,
        open: Number(q.open[i].toFixed(cfg.decimals)),
        high: Number(q.high[i].toFixed(cfg.decimals)),
        low: Number(q.low[i].toFixed(cfg.decimals)),
        close: Number(q.close[i].toFixed(cfg.decimals)),
        volume: q.volume?.[i] || 0
      });
    }

    if (timeframe === '4H') {
      const agg = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, i + 4);
        if (!chunk.length) continue;
        agg.push({
          time: chunk[0].time,
          open: chunk[0].open,
          high: Math.max(...chunk.map(c => c.high)),
          low: Math.min(...chunk.map(c => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((s, c) => s + c.volume, 0)
        });
      }
      candles = agg;
    }

    setCache(key, candles);
    return candles;
  } catch (e) {
    console.warn(`[LiveFeed] Candle fetch error for ${symbol}:`, e.message);
    return [];
  }
}

export async function fetchWatchlist() {
  const entries = await Promise.all(
    Object.keys(SYMBOLS).map(async (sym) => {
      const q = await fetchQuote(sym);
      return [sym, {
        name: SYMBOLS[sym].name,
        price: q.lastPrice || 0,
        changePct: q.changePercent || 0,
        sparkline: q.sparkline || [],
        delayed: q.delayed || false
      }];
    })
  );
  return Object.fromEntries(entries);
}

export async function fetchLiveNews() {
  const key = cacheKey('news', 'all');
  const cached = getCached(key);
  if (cached) return cached;

  const feeds = [
    { url: 'https://www.forexlive.com/feed/', source: 'ForexLive', category: 'FOREX' },
    { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters', category: 'MACRO' }
  ];

  const allNews = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'JARVIS/1.0' }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        if (!title) continue;

        const text = title.toLowerCase();
        let severity = 'GREEN';
        if (/war|conflict|sanctions|crisis|crash|emergency|breaking/i.test(text)) severity = 'RED';
        else if (/inflation|rate|fed|ecb|nfp|gdp|pce|cpi|fomc/i.test(text)) severity = 'ORANGE';

        const affectedAssets = [];
        if (/gold|xau/i.test(text)) affectedAssets.push('XAUUSD');
        if (/dollar|dxy|usd/i.test(text)) affectedAssets.push('DXY');
        if (/euro|eur/i.test(text)) affectedAssets.push('EURUSD');
        if (/oil|crude/i.test(text)) affectedAssets.push('OIL');
        if (affectedAssets.length === 0) affectedAssets.push('MACRO');

        let freshness = 'Now';
        if (pubDate) {
          const diffMin = Math.floor((Date.now() - new Date(pubDate).getTime()) / 60000);
          if (diffMin < 60) freshness = `${diffMin}m ago`;
          else if (diffMin < 1440) freshness = `${Math.floor(diffMin / 60)}h ago`;
          else freshness = `${Math.floor(diffMin / 1440)}d ago`;
        }

        allNews.push({
          headline: title.replace(/<[^>]+>/g, '').trim(),
          source: feed.source, category: feed.category, severity, freshness, affectedAssets,
          observedReaction: 'Monitoring market response.',
          jarvisNote: `Live from ${feed.source}. Verify with price action before trading.`
        });
      }
    } catch {}
  }

  const severityOrder = { RED: 0, ORANGE: 1, GREEN: 2 };
  allNews.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));
  const result = allNews.slice(0, 15);
  setCache(key, result);
  return result;
}

export async function getMarketData(asset = 'XAUUSD', timeframe = '1H') {
  const [quote, candles, watchlist] = await Promise.all([
    fetchQuote(asset), fetchCandles(asset, timeframe), fetchWatchlist()
  ]);
  return { quote, candles, watchlist };
}
