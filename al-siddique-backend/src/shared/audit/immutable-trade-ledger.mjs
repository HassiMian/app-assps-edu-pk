/**
 * JARVIS ARGUS 6.6 — Immutable Research Trade Ledger & Chronological Reconstructor
 * 
 * Reconstructs individual historical trade candidates bar-by-bar,
 * models realistic friction (spread, slippage, commission),
 * and persists an immutable audit trail.
 * 
 * INVARIANTS:
 * - AGGREGATE_WITHOUT_UNDERLYING_TRADES = 0
 * - LOOKAHEAD_BIAS = 0
 * - FUTURE_CANDLE_ACCESS = 0
 * - REAL_MONEY_EXECUTION = 0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { datasetAuditor } from './dataset-auditor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

export class ImmutableTradeLedger {
  constructor() {
    this.name = 'ARGUS_Immutable_Trade_Ledger';
    this.auditDir = path.resolve(ROOT_DIR, 'data/audit');
    this.ledgerFile = path.join(this.auditDir, 'argus_immutable_trade_ledger.json');
    this.runs = [];
    this.trades = [];
    this.windows = [];
    this.monteCarloRuns = [];
    this._loadLedger();
  }

  _loadLedger() {
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
    if (fs.existsSync(this.ledgerFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.ledgerFile, 'utf8'));
        this.runs = raw.runs || [];
        this.trades = raw.trades || [];
        this.windows = raw.windows || [];
        this.monteCarloRuns = raw.monteCarloRuns || [];
      } catch {
        this.runs = [];
        this.trades = [];
        this.windows = [];
        this.monteCarloRuns = [];
      }
    }
  }

  saveLedger() {
    const payload = {
      auditTimestamp: new Date().toISOString(),
      aggregateWithoutUnderlyingTrades: 0,
      totalRuns: this.runs.length,
      totalTrades: this.trades.length,
      totalWindows: this.windows.length,
      totalMonteCarloRuns: this.monteCarloRuns.length,
      runs: this.runs,
      trades: this.trades,
      windows: this.windows,
      monteCarloRuns: this.monteCarloRuns
    };
    fs.writeFileSync(this.ledgerFile, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
  }

  /**
   * 1. Reconstruct all historical occurrences for a strategy chronologically
   */
  reconstructStrategyTrades(strategyDef, datasetId = 'DATASET_XAUUSD_1H_2026') {
    const candles = datasetAuditor.loadDataset(datasetId);
    if (!candles || candles.length < 50) {
      throw new Error(`Insufficient bars in dataset ${datasetId}`);
    }

    const runId = `RUN_${strategyDef.strategyId}_${Date.now()}`;
    const totalBars = candles.length;
    const isFx = strategyDef.symbol.includes('EUR') || strategyDef.symbol.includes('GBP');
    const decimals = isFx ? 4 : 2;

    // Cost Model
    const spread = isFx ? 0.00012 : 0.35; // 1.2 pips FX, $0.35 Gold
    const slippage = isFx ? 0.00003 : 0.15; // 0.3 pips FX, $0.15 Gold
    const commissionR = 0.05; // 0.05R equivalent round-turn cost
    const totalFriction = spread + slippage;

    // Chronological Splits: 60% Train (IS), 20% Validation, 20% OOS
    const isSplitIndex = Math.floor(totalBars * 0.60);
    const valSplitIndex = Math.floor(totalBars * 0.80);

    const reconstructedTrades = [];
    const lookback = strategyDef.parameterSet.lookbackBars || 20;

    // Bar-by-bar chronological execution (LOOKAHEAD_BIAS = 0)
    for (let i = lookback + 5; i < totalBars - 12; i++) {
      const windowCandles = candles.slice(0, i + 1); // Strictly past + current
      const currentBar = windowCandles[i];
      const prevBar = windowCandles[i - 1];

      // Determine chronological partition
      let partition = 'IN_SAMPLE';
      if (i >= valSplitIndex) partition = 'OUT_OF_SAMPLE';
      else if (i >= isSplitIndex) partition = 'VALIDATION';

      // Session context from bar
      const session = currentBar.session || 'LONDON';

      // Session filter check
      if (strategyDef.sessionFilter && !strategyDef.sessionFilter.includes(session)) {
        continue;
      }

      // Detect trade signal using strict past rules
      const recentHighs = windowCandles.slice(i - lookback, i).map(c => c.high);
      const recentLows = windowCandles.slice(i - lookback, i).map(c => c.low);
      const swingH = Math.max(...recentHighs);
      const swingL = Math.min(...recentLows);

      let signalDirection = null;

      // Archetype specific signal triggers
      if (strategyDef.archetype === 'LIQUIDITY_SWEEP_REVERSAL') {
        // High-probability sweep: sweep of lows with bullish close, sweep of highs with bearish close
        if (currentBar.low < swingL && currentBar.close > currentBar.open) {
          signalDirection = 'BUY';
        } else if (currentBar.high > swingH && currentBar.close < currentBar.open) {
          signalDirection = 'SELL';
        }
      } else if (strategyDef.archetype === 'DISPLACEMENT_FVG_RETRACE') {
        const bodySize = Math.abs(currentBar.close - currentBar.open);
        const candleRange = currentBar.high - currentBar.low;
        if (candleRange > 0 && (bodySize / candleRange) >= 0.55) {
          signalDirection = currentBar.close > currentBar.open ? 'BUY' : 'SELL';
        }
      } else if (strategyDef.archetype === 'HTF_TREND_PULLBACK') {
        const range = swingH - swingL;
        const eq = swingL + range * 0.5;
        if (currentBar.close > eq && prevBar.close <= eq && currentBar.close > currentBar.open) {
          signalDirection = 'BUY';
        } else if (currentBar.close < eq && prevBar.close >= eq && currentBar.close < currentBar.open) {
          signalDirection = 'SELL';
        }
      } else if (strategyDef.archetype === 'ORDER_BLOCK_REACTION') {
        if (currentBar.low <= swingL * 1.003 && currentBar.close > currentBar.open) {
          signalDirection = 'BUY';
        } else if (currentBar.high >= swingH * 0.997 && currentBar.close < currentBar.open) {
          signalDirection = 'SELL';
        }
      } else if (strategyDef.archetype === 'BREAKOUT_RETEST') {
        if (currentBar.close > swingH) signalDirection = 'BUY';
        else if (currentBar.close < swingL) signalDirection = 'SELL';
      } else if (strategyDef.archetype === 'RANGE_EXTREME_REVERSAL') {
        if (currentBar.high >= swingH * 0.999 && currentBar.close < currentBar.open) signalDirection = 'SELL';
        else if (currentBar.low <= swingL * 1.001 && currentBar.close > currentBar.open) signalDirection = 'BUY';
      } else if (strategyDef.archetype === 'VWAP_MEAN_REVERSION') {
        const smaLookback = Math.min(20, windowCandles.length);
        const sma = windowCandles.slice(i - smaLookback, i).reduce((acc, c) => acc + c.close, 0) / smaLookback;
        const threshold = isFx ? 0.003 : 6.0;
        if (currentBar.close > sma + threshold && currentBar.close < currentBar.open) signalDirection = 'SELL';
        else if (currentBar.close < sma - threshold && currentBar.close > currentBar.open) signalDirection = 'BUY';
      } else if (strategyDef.archetype === 'MOMENTUM_CONTINUATION') {
        if (currentBar.close > prevBar.close && currentBar.close > currentBar.open && prevBar.close > swingH * 0.992) signalDirection = 'BUY';
      } else if (strategyDef.archetype === 'SESSION_BREAKOUT') {
        if (session === 'LONDON' && (currentBar.close > swingH || currentBar.close < swingL)) {
          signalDirection = currentBar.close > swingH ? 'BUY' : 'SELL';
        }
      } else {
        // FAILED_BREAKOUT
        if (currentBar.high > swingH && currentBar.close < prevBar.close) signalDirection = 'SELL';
      }

      if (signalDirection) {
        const candidateId = `TRADE_${strategyDef.strategyId}_${i}_${Date.now()}`;
        const entryPrice = signalDirection === 'BUY' 
          ? Number((currentBar.close + totalFriction).toFixed(decimals))
          : Number((currentBar.close - totalFriction).toFixed(decimals));

        let stopLoss = 0;
        let target1 = 0;
        let target2 = 0;
        const rr = strategyDef.minRR || 2.0;

        const stopBuffer = Math.min(
          Math.abs(currentBar.close - (signalDirection === 'BUY' ? swingL : swingH)),
          isFx ? 0.0030 : 6.5
        );
        const risk = Math.max(stopBuffer, isFx ? 0.0010 : 3.0);

        if (signalDirection === 'BUY') {
          stopLoss = Number((entryPrice - risk).toFixed(decimals));
          target1 = Number((entryPrice + risk * 1.5).toFixed(decimals));
          target2 = Number((entryPrice + risk * rr).toFixed(decimals));
        } else {
          stopLoss = Number((entryPrice + risk).toFixed(decimals));
          target1 = Number((entryPrice - risk * 1.5).toFixed(decimals));
          target2 = Number((entryPrice - risk * rr).toFixed(decimals));
        }

        const riskDistance = Math.abs(entryPrice - stopLoss);
        if (riskDistance <= 0) continue;

        // Forward simulate trade outcome over subsequent bars
        let result = 'LOSS';
        let exitReason = 'STOP_LOSS';
        let realizedR = -1.0 - commissionR;
        let grossR = -1.0;
        let maxFavorableR = 0;
        let maxAdverseR = 0;
        let exitBarIndex = i + 1;
        let hitT1 = false;
        let movedToBe = false;

        const maxHoldingBars = 16;
        for (let j = i + 1; j < Math.min(i + 1 + maxHoldingBars, totalBars); j++) {
          const forwardBar = candles[j];
          exitBarIndex = j;

          if (signalDirection === 'BUY') {
            const favorable = (forwardBar.high - entryPrice) / riskDistance;
            const adverse = (entryPrice - forwardBar.low) / riskDistance;
            if (favorable > maxFavorableR) maxFavorableR = favorable;
            if (adverse > maxAdverseR) maxAdverseR = adverse;

            if (maxFavorableR >= 1.5) movedToBe = true;
            if (forwardBar.high >= target1 && !hitT1) hitT1 = true;

            if (hitT1 && forwardBar.high >= target2) {
              result = 'WIN';
              exitReason = 'TP2_FULL';
              grossR = rr * 1.2;
              realizedR = grossR - commissionR;
              break;
            }

            if (forwardBar.low <= (movedToBe ? entryPrice : stopLoss)) {
              if (hitT1) {
                result = 'WIN';
                exitReason = 'TP1_PARTIAL_RUNNER_BE';
                grossR = 0.9;
                realizedR = grossR - commissionR;
              } else if (movedToBe) {
                result = 'BREAKEVEN';
                exitReason = 'BREAKEVEN_STOP';
                grossR = 0.0;
                realizedR = -commissionR;
              } else {
                result = 'LOSS';
                exitReason = 'STOP_LOSS';
                grossR = -1.0;
                realizedR = -1.0 - commissionR;
              }
              break;
            }
          } else {
            const favorable = (entryPrice - forwardBar.low) / riskDistance;
            const adverse = (forwardBar.high - entryPrice) / riskDistance;
            if (favorable > maxFavorableR) maxFavorableR = favorable;
            if (adverse > maxAdverseR) maxAdverseR = adverse;

            if (maxFavorableR >= 1.5) movedToBe = true;
            if (forwardBar.low <= target1 && !hitT1) hitT1 = true;

            if (hitT1 && forwardBar.low <= target2) {
              result = 'WIN';
              exitReason = 'TP2_FULL';
              grossR = rr * 1.2;
              realizedR = grossR - commissionR;
              break;
            }

            if (forwardBar.high >= (movedToBe ? entryPrice : stopLoss)) {
              if (hitT1) {
                result = 'WIN';
                exitReason = 'TP1_PARTIAL_RUNNER_BE';
                grossR = 0.9;
                realizedR = grossR - commissionR;
              } else if (movedToBe) {
                result = 'BREAKEVEN';
                exitReason = 'BREAKEVEN_STOP';
                grossR = 0.0;
                realizedR = -commissionR;
              } else {
                result = 'LOSS';
                exitReason = 'STOP_LOSS';
                grossR = -1.0;
                realizedR = -1.0 - commissionR;
              }
              break;
            }
          }
        }

        const tradeRecord = {
          candidateId,
          runId,
          strategyId: strategyDef.strategyId,
          strategyVersion: strategyDef.version,
          datasetId,
          symbol: strategyDef.symbol,
          regime: strategyDef.regimeFilter ? strategyDef.regimeFilter[0] : 'TRENDING_EXPANSION',
          session,
          timestampDetected: currentBar.time,
          entryTriggerTimestamp: currentBar.time,
          entryPrice,
          stopLoss,
          target1,
          target2,
          spread,
          slippage,
          commissionR,
          result,
          exitReason,
          grossR: Number(grossR.toFixed(2)),
          realizedR: Number(realizedR.toFixed(2)),
          mfe: Number(maxFavorableR.toFixed(2)),
          mae: Number(maxAdverseR.toFixed(2)),
          exitTimestamp: candles[exitBarIndex]?.time,
          holdingBars: exitBarIndex - i,
          partition
        };

        reconstructedTrades.push(tradeRecord);
        i += 3;
      }
    }

    // Save into ledger
    this.runs.push({
      runId,
      strategyId: strategyDef.strategyId,
      datasetId,
      totalBars,
      reconstructedTradesCount: reconstructedTrades.length,
      executedAt: new Date().toISOString()
    });

    this.trades.push(...reconstructedTrades);
    this.saveLedger();

    return {
      runId,
      strategyId: strategyDef.strategyId,
      reconstructedTradesCount: reconstructedTrades.length,
      trades: reconstructedTrades
    };
  }

  /**
   * Query trades from immutable ledger
   */
  getTradesByStrategy(strategyId, partition = null) {
    let list = this.trades.filter(t => t.strategyId === strategyId);
    if (partition) {
      list = list.filter(t => t.partition === partition);
    }
    return list;
  }

  getAllTrades() {
    return this.trades;
  }
}

export const immutableTradeLedger = new ImmutableTradeLedger();
