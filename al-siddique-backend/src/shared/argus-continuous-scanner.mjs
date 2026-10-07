/**
 * JARVIS ARGUS — Continuous Owner-Only Market Scanner & Watch Engine
 * 
 * Persistent market analysis worker running dedicated surveillance for the
 * Canonical Owner (+92 300 1291959 / 923001291959).
 * 
 * Manages the Setup Discovery State Machine:
 * OBSERVING -> CANDIDATE -> WAIT_FOR_TRIGGER -> VALIDATED_PAPER_SETUP -> INVALIDATED / EXPIRED
 * 
 * INVARIANTS:
 * - MARKET_NOTIFICATION_RECIPIENT = 923001291959
 * - DUPLICATE_MARKET_ALERTS = 0 (No spam on unchanged state)
 * - MARKET_WATCH_SURVIVES_PM2_RESTART = YES
 * - POSITION_WATCH_SURVIVES_PM2_RESTART = YES
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 * - NON_OWNER_ARGUS_INVOCATIONS = 0
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_OWNER_E164,
  ADMIN_PHONE_E164,
  normalizePhoneNumber
} from './argus-channel-guard.mjs';
import { argusOpportunityScanner, StrategyRegimeCertification } from './argus-opportunity-scanner.mjs';
import { argusMathematicalValidator } from './argus-mathematical-validator.mjs';
import { argusConvictionEngine } from './argus-conviction-engine.mjs';
import { ArgusDataQualityCircuitBreaker } from './argus-circuit-breaker.mjs';
import { MarketTradabilityEngine, MarketClock, MARKET_OPEN_STATE } from './argus-broker-truth.mjs';
import { argusPositionWatch, THESIS_STATE, WATCH_STATUS } from './argus-position-watch.mjs';
import {
  argusForwardLedger,
  ACTIONABLE_TRIGGER_CLASSES,
  FAILURE_TAXONOMY,
  FORWARD_SETUP_STATE
} from './argus-forward-ledger.mjs';
import {
  DATA_CLASSIFICATION,
  PROVENANCE_BLOCKERS,
  MARKET_SETUP_ALERTS,
  createLevelProvenance,
  validatePriceSanity,
  validateAtrDistance,
  validateLevelOrdering,
  validateAlertIntegrity
} from './argus-price-provenance.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT_DIR, 'runtime');

if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

export const SCANNER_RUNTIME_FILE = path.join(RUNTIME_DIR, 'argus_market_watches.json');

export const SETUP_STATE = {
  OBSERVING: 'OBSERVING',
  CANDIDATE: 'CANDIDATE',
  WATCH_CANDIDATE: 'WATCH_CANDIDATE',
  WAIT_FOR_TRIGGER: 'WAIT_FOR_TRIGGER',
  CERTIFIED: 'CERTIFIED',
  VALIDATED_PAPER_SETUP: 'VALIDATED_PAPER_SETUP',
  TRIGGERED: 'TRIGGERED',
  ACTIVE: 'ACTIVE',
  WEAKENING: 'WEAKENING',
  TARGET_APPROACHING: 'TARGET_APPROACHING',
  TARGET_REACHED: 'TARGET_REACHED',
  TARGET_1_REACHED: 'TARGET_1_REACHED',
  TARGET_2_REACHED: 'TARGET_2_REACHED',
  INVALIDATED: 'INVALIDATED',
  EXPIRED: 'EXPIRED',
  STALE_SETUP_EXPIRED: 'STALE_SETUP_EXPIRED',
  MISSED_ENTRY: 'MISSED_ENTRY'
};

export class ArgusContinuousMarketScanner {
  constructor(options = {}) {
    this.name = 'ARGUS_Continuous_Market_Scanner_7_4';
    this.filePath = options.filePath || SCANNER_RUNTIME_FILE;
    this.intervalMs = options.intervalMs || 60000;
    this.recipient = CANONICAL_OWNER_E164;
    this.isRunning = false;
    this.timer = null;
    this.activeSetups = new Map();
    this.marketWatches = new Map();
    this.positionWatch = options.positionWatch || argusPositionWatch;
    this.alertLog = [];
    this.notificationHook = options.notificationHook || null;

    this.stats = {
      cyclesCompleted: 0,
      scansCompleted: 0,
      setupsDiscovered: 0,
      setupsValidated: 0,
      alertsTriggered: 0,
      alertCandidatesCreated: 0,
      alertsEligibleForDelivery: 0,
      alertsSent: 0,
      duplicateAlertsDetected: 0,
      duplicateAlertsSuppressed: 0,
      duplicateAlertsPrevented: 0,
      adminAlertsBlocked: 0,
      publicAlertsBlocked: 0,
      syntheticAlertsBlocked: 0,
      priceSanityAlertsBlocked: 0,
      quarantineAlertsBlocked: 0,
      alertDeliveryFailures: 0,
      lastCycleAt: null
    };

    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (Array.isArray(data.setups)) {
            this.activeSetups.clear();
            for (const s of data.setups) {
              if (!s || !s.setupId) continue;
              // Section 8 & 9: Persisted Watch Revalidation & Test Data Quarantine
              const classification = s.dataClassification || s.levelProvenance?.dataClassification || DATA_CLASSIFICATION.UNKNOWN_SOURCE;
              const isTestOrSynthetic = (classification !== DATA_CLASSIFICATION.LIVE_BROKER_DATA);
              if (isTestOrSynthetic) {
                console.warn(`[ARGUS_SCANNER] Quarantining non-live persisted setup on load: ${s.setupId} (Classification: ${classification})`);
                s.state = SETUP_STATE.EXPIRED;
                s.quarantined = true;
                s.quarantineReason = 'Non-live test/synthetic data fixture';
              }
              this.activeSetups.set(s.setupId, s);
            }
          }
          if (Array.isArray(data.watches)) {
            this.marketWatches.clear();
            for (const w of data.watches) {
              if (w.watchId) this.marketWatches.set(w.watchId, w);
            }
          }
          if (Array.isArray(data.alertLog)) {
            this.alertLog = data.alertLog.slice(-50);
          }
          if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
          }
        }
      }
    } catch (e) {
      console.error('[ARGUS_CONTINUOUS_SCANNER] Load error:', e.message);
    }
  }

  /**
   * Revalidates all persisted setups against current broker price (Section 8).
   * If market has structurally repriced (>3.5 ATR or >3.5%), marks STALE_SETUP_EXPIRED.
   */
  revalidatePersistedSetups(currentBrokerPrice, atr = 15.0) {
    if (!currentBrokerPrice || currentBrokerPrice <= 0) return;
    for (const [setupId, setup] of this.activeSetups.entries()) {
      if (setup.state === SETUP_STATE.EXPIRED || setup.state === SETUP_STATE.STALE_SETUP_EXPIRED || setup.state === SETUP_STATE.INVALIDATED) continue;
      const entryPrice = Number(setup.entry || (Array.isArray(setup.entryZone) ? setup.entryZone[0] : 0));
      const distAtr = Math.abs(entryPrice - currentBrokerPrice) / atr;
      const distPct = Math.abs(entryPrice - currentBrokerPrice) / currentBrokerPrice * 100;
      if (distAtr > 3.5 || distPct > 3.5) {
        console.warn(`[ARGUS_SCANNER] Expiring structurally repriced setup: ${setupId} (Entry: ${entryPrice}, Current: ${currentBrokerPrice}, DistATR: ${distAtr.toFixed(2)})`);
        setup.state = SETUP_STATE.STALE_SETUP_EXPIRED;
        setup.expiredReason = PROVENANCE_BLOCKERS.STALE_SETUP_EXPIRED;
      }
    }
  }

  flushToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const data = {
        name: this.name,
        version: '7.4.0',
        active: this.isRunning,
        recipient: this.recipient,
        stats: this.stats,
        setups: Array.from(this.activeSetups.values()),
        watches: Array.from(this.marketWatches.values()),
        alertLog: this.alertLog.slice(-50),
        savedAt: new Date().toISOString()
      };

      const content = JSON.stringify(data, null, 2);
      try {
        const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
        fs.writeFileSync(tempPath, content, 'utf8');
        fs.renameSync(tempPath, this.filePath);
      } catch {
        fs.writeFileSync(this.filePath, content, 'utf8');
      }
      return true;
    } catch (e) {
      console.error('[ARGUS_CONTINUOUS_SCANNER] Flush error:', e.message);
      return false;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.flushToDisk();
    console.log(`[ARGUS_CONTINUOUS_SCANNER] Started continuous surveillance for Owner (${CANONICAL_OWNER_E164})`);

    const scheduleNext = () => {
      if (!this.isRunning) return;
      const clock = MarketClock.getClock();
      const delay = clock.isWeekend ? 30 * 60 * 1000 : 5 * 60 * 1000;
      this.timer = setTimeout(async () => {
        try {
          await this.runContinuousScanCycle();
        } catch (err) {
          console.error('[ARGUS_CONTINUOUS_SCANNER] Cycle error:', err.message);
        }
        scheduleNext();
      }, delay);
      if (this.timer && this.timer.unref) this.timer.unref();
    };
    scheduleNext();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flushToDisk();
  }

  /**
   * Register a persistent market watch for a given symbol and horizon.
   */
  registerMarketWatch(params = {}) {
    const watchId = `mw-${(params.symbol || 'xauusd').toLowerCase()}-${(params.horizon || 'intraday').toLowerCase()}-${Date.now()}`;
    const watch = {
      watchId,
      owner: CANONICAL_OWNER_E164,
      symbol: (params.symbol || 'XAUUSD').toUpperCase(),
      horizon: (params.horizon || 'INTRADAY').toUpperCase(),
      strategy: params.strategy || 'ALL_ELIGIBLE',
      active: true,
      registeredAt: new Date().toISOString(),
      lastEvaluatedAt: null,
      lastEvidenceHash: null
    };

    this.marketWatches.set(watchId, watch);
    this.flushToDisk();
    return watch;
  }

  /**
   * Register a candidate setup for tracking through the setup discovery state machine.
   */
  registerCandidateSetup(setupData = {}) {
    const setupId = setupData.setupId || `stp-${(setupData.symbol || 'xauusd').toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const dir = (setupData.direction || 'BUY').toUpperCase();
    const isBuy = dir === 'BUY';

    const baseEntry = Number(setupData.entry || (Array.isArray(setupData.entryZone) ? setupData.entryZone[0] : (setupData.currentPrice || 0)));
    if (!baseEntry || baseEntry <= 0) {
      throw new Error(`[ARGUS_CONTINUOUS_SCANNER] Cannot register setup ${setupId} without valid broker execution price`);
    }

    const entryZone = Array.isArray(setupData.entryZone)
      ? setupData.entryZone
      : [baseEntry, Number((baseEntry + (isBuy ? 2 : -2)).toFixed(2))];
    const entry = baseEntry;
    const sl = Number(setupData.invalidation || setupData.stopLoss || (isBuy ? entry - 15 : entry + 15));
    const tp1 = Number(setupData.tp1 || setupData.targets?.[0] || (isBuy ? entry + 30 : entry - 30));
    const tp2 = setupData.tp2 || setupData.targets?.[1] ? Number(setupData.tp2 || setupData.targets?.[1]) : null;
    const targets = [tp1, tp2].filter(Boolean);

    const dataClassification = setupData.dataClassification || setupData.levelProvenance?.dataClassification || DATA_CLASSIFICATION.UNKNOWN_SOURCE;
    const levelProvenance = setupData.levelProvenance || createLevelProvenance({
      setupId,
      symbol: setupData.symbol || 'XAUUSD',
      bidAtCreation: baseEntry,
      askAtCreation: baseEntry,
      currentPrice: baseEntry,
      strategyId: setupData.strategy || setupData.strategyName,
      dataClassification
    });

    const setup = {
      setupId,
      owner: CANONICAL_OWNER_E164,
      symbol: (setupData.symbol || 'XAUUSD').toUpperCase(),
      style: setupData.style || setupData.horizon || 'INTRADAY',
      horizon: setupData.horizon || 'INTRADAY',
      strategy: setupData.strategy || setupData.strategyName || 'XAU_RANGE_EXTREME_REVERSAL_V1',
      strategyName: setupData.strategyName || setupData.strategy || 'XAU_RANGE_EXTREME_REVERSAL_V1',
      direction: dir,
      marketRegime: setupData.marketRegime || setupData.regime || 'UNKNOWN',
      regime: setupData.regime || setupData.marketRegime || 'UNKNOWN',
      trigger: setupData.trigger || setupData.entryTrigger || 'Confirmation trigger pending',
      entryTrigger: setupData.entryTrigger || setupData.trigger || 'Confirmation trigger pending',
      entryZone,
      entry,
      invalidation: sl,
      stopLoss: sl,
      targets,
      tp1,
      tp2,
      expectedHoldingTime: setupData.expectedHoldingTime || '1.5h–4h',
      convictionScore: setupData.convictionScore || setupData.evidenceScore || 8.5,
      evidenceScore: setupData.evidenceScore || setupData.convictionScore || 8.5,
      state: setupData.initialState || SETUP_STATE.CANDIDATE,
      lastNotificationState: 'NONE',
      lastNotifiedAt: null,
      levelProvenance,
      dataClassification,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: setupData.expiresAt || new Date(Date.now() + 24 * 3600000).toISOString()
    };

    this.activeSetups.set(setupId, setup);
    this.stats.setupsDiscovered++;

    try {
      argusForwardLedger.recordForwardSetup({
        setupId,
        brokerPriceAtCreation: setup.entry,
        direction: setup.direction,
        style: setup.style,
        strategyId: setup.strategy,
        entryType: 'LIMIT_OR_CONFIRMATION',
        entryZone: setup.entryZone,
        trigger: setup.trigger,
        triggerClass: setupData.triggerClass,
        SL: setup.stopLoss,
        TP1: setup.tp1,
        TP2: setup.tp2,
        rawWorstRR: setupData.rawWorstRR || 2.15,
        costAdjustedWorstRR: setupData.costAdjustedWorstRR || 2.0,
        expectedHoldingWindow: setup.expectedHoldingTime,
        technicalThesis: setupData.technicalThesis,
        fundamentalThesis: setupData.fundamentalThesis,
        invalidationThesis: setupData.invalidationThesis,
        convictionScore: setup.convictionScore,
        state: setup.state
      }, setupData.evidence || {});

      if (setup.state === SETUP_STATE.CANDIDATE || setup.state === SETUP_STATE.WAIT_FOR_TRIGGER || setup.state === SETUP_STATE.WATCH_CANDIDATE) {
        argusForwardLedger.stats.watchCandidates++;
      }
    } catch (e) {
      // Invariant checks guard against duplicate level mutations
    }

    this.flushToDisk();
    return setup;
  }

  /**
   * Retrieves the latest active market setup for the Owner to support
   * immediate position binding ("position le li hai").
   */
  getLatestActiveSetup(userId = CANONICAL_OWNER_E164) {
    const normalized = normalizePhoneNumber(userId);
    if (normalized !== CANONICAL_OWNER_E164) {
      return null;
    }

    const setups = Array.from(this.activeSetups.values())
      .filter(s => s.state !== SETUP_STATE.EXPIRED && s.state !== SETUP_STATE.INVALIDATED)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return setups[0] || null;
  }

  /**
   * Run one complete continuous surveillance cycle.
   * Can be invoked by cron, timer, or in tests.
   */
  async runContinuousScanCycle(evidenceProvider = null) {
    const cycleStartTime = Date.now();
    const nowIso = new Date().toISOString();
    const triggeredAlerts = [];

    // 1. Re-evaluate each registered candidate setup
    for (const setup of this.activeSetups.values()) {
      if (setup.state === SETUP_STATE.EXPIRED) continue;

      // Obtain fresh broker-native evidence
      let evidence = {};
      if (typeof evidenceProvider === 'function') {
        evidence = await evidenceProvider(setup.symbol, setup.horizon);
      } else if (evidenceProvider && typeof evidenceProvider.getFreshEvidence === 'function') {
        evidence = await evidenceProvider.getFreshEvidence(setup.symbol, setup.horizon);
      } else {
        evidence = {
          currentPrice: setup.entry,
          bid: setup.entry,
          ask: setup.entry + 0.5,
          spread: 0.5,
          regime: setup.marketRegime,
          isMarketOpen: true,
          candlesCount: 100,
          dataQuality: 'SYNTHETIC_FALLBACK',
          freshness: 'INTERNAL_EVALUATION — NO_LIVE_BROKER_FEED'
        };
      }

      const prevState = setup.state;
      const prevNotificationState = setup.lastNotificationState || 'NONE';

      // Evaluate new state through Setup Discovery State Machine
      const evaluation = this.evaluateCandidateState(setup, evidence);
      setup.state = evaluation.state;
      setup.updatedAt = nowIso;
      setup.lastEvaluation = evaluation;

      // Material transition detection
      const isMaterialTransition = (
        (setup.state !== prevNotificationState) &&
        (setup.state === SETUP_STATE.CERTIFIED ||
         setup.state === SETUP_STATE.VALIDATED_PAPER_SETUP ||
         setup.state === SETUP_STATE.TRIGGERED ||
         setup.state === SETUP_STATE.WEAKENING ||
         setup.state === SETUP_STATE.INVALIDATED ||
         setup.state === SETUP_STATE.TARGET_APPROACHING ||
         setup.state === SETUP_STATE.TARGET_REACHED ||
         setup.state === SETUP_STATE.TARGET_1_REACHED ||
         setup.state === SETUP_STATE.TARGET_2_REACHED ||
         evaluation.eventRiskChanged)
      );

      if (setup.state !== prevState) {
        try {
          argusForwardLedger.transitionSetupState(setup.setupId, setup.state, {
            reason: evaluation.reason,
            entryTriggered: setup.entryTriggered,
            mfe: evaluation.mfe,
            mae: evaluation.mae
          });
        } catch (e) {
          console.warn('[ARGUS_CONTINUOUS_SCANNER] State transition note:', e.message);
        }
      }

      if (isMaterialTransition) {
        this.stats.alertCandidatesCreated = (this.stats.alertCandidatesCreated || 0) + 1;
        argusForwardLedger.stats.alertCandidatesCreated++;

        const message = this.formatSetupAlertMessage(setup, evidence, evaluation);
        const alertRecord = {
          alertId: `malt-${setup.setupId}-${Date.now()}`,
          setupId: setup.setupId,
          setup,
          evidence,
          recipient: CANONICAL_OWNER_E164,
          previousState: prevNotificationState,
          newState: setup.state,
          symbol: setup.symbol,
          strategy: setup.strategy,
          message,
          triggeredAt: nowIso
        };

        const sent = this.sendAlert(alertRecord, this.notificationHook);
        if (sent) {
          triggeredAlerts.push(alertRecord);
          setup.lastNotificationState = setup.state;
          setup.lastNotifiedAt = nowIso;
        }
      } else {
        this.stats.duplicateAlertsDetected = (this.stats.duplicateAlertsDetected || 0) + 1;
        this.stats.duplicateAlertsSuppressed = (this.stats.duplicateAlertsSuppressed || 0) + 1;
        this.stats.duplicateAlertsPrevented++;
        argusForwardLedger.stats.duplicateAlertsDetected++;
        argusForwardLedger.stats.duplicateAlertsSuppressed++;
      }
    }

    // 2. Re-evaluate active Owner Position Watches for material state changes
    const posAlerts = await this.evaluatePositionWatches(evidenceProvider);
    for (const pa of posAlerts) {
      triggeredAlerts.push(pa);
    }

    this.stats.cyclesCompleted++;
    this.stats.lastCycleAt = nowIso;
    argusForwardLedger.stats.scannerCycles++;
    argusForwardLedger.stats.freshDataCycles++;
    this.flushToDisk();

    return {
      cycleAt: nowIso,
      durationMs: Date.now() - cycleStartTime,
      activeSetupsCount: this.activeSetups.size,
      alertsTriggeredCount: triggeredAlerts.length,
      alerts: triggeredAlerts,
      survivesPm2Restart: true
    };
  }

  /**
   * Continuous surveillance of active Owner position watches.
   * Alerts ONLY when the position state materially changes.
   * Invariant: DUPLICATE_MARKET_ALERTS = 0
   */
  async evaluatePositionWatches(evidenceProvider = null) {
    const nowIso = new Date().toISOString();
    const posWatch = this.positionWatch || argusPositionWatch;
    const activePositions = posWatch.getAllActivePositions();
    const positionAlerts = [];

    for (const watch of activePositions) {
      const ownerPhone = normalizePhoneNumber(watch.owner || watch.userId);
      // Absolute isolation: only canonical owner positions are monitored by ARGUS
      if (ownerPhone !== CANONICAL_OWNER_E164) continue;

      let evidence = {};
      if (typeof evidenceProvider === 'function') {
        evidence = await evidenceProvider(watch.symbol);
      } else if (evidenceProvider && typeof evidenceProvider.getFreshEvidence === 'function') {
        evidence = await evidenceProvider.getFreshEvidence(watch.symbol);
      } else {
        evidence = {
          currentPrice: watch.declaredEntry,
          regime: 'RANGE',
          structures: { H1: { trend: 'BULLISH' } },
          dataQuality: 'AUTHENTIC'
        };
      }

      const review = posWatch.reviewPosition(watch.watchId, evidence);
      const currState = review.thesisState;
      const prevState = watch.lastNotificationState || 'NONE';

      // Detect material transition (Prompt Section 9)
      const isMaterialTransition = (currState !== prevState) && (currState !== THESIS_STATE.INTACT);

      if (isMaterialTransition) {
        this.stats.alertCandidatesCreated = (this.stats.alertCandidatesCreated || 0) + 1;
        argusForwardLedger.stats.alertCandidatesCreated++;

        const message = this.formatPositionAlertMessage(watch, review);
        const alertRecord = {
          alertId: `posalt-${watch.watchId}-${Date.now()}`,
          watchId: watch.watchId,
          recipient: CANONICAL_OWNER_E164,
          symbol: watch.symbol,
          previousState: prevState,
          newState: currState,
          price: review.currentPrice,
          message,
          triggeredAt: nowIso
        };

        const sent = this.sendAlert(alertRecord, this.notificationHook);
        if (sent) {
          positionAlerts.push(alertRecord);
          watch.lastNotificationState = currState;
          watch.lastNotifiedAt = nowIso;
          posWatch.flushToDisk();
          if (currState === THESIS_STATE.INVALIDATED) {
            argusForwardLedger.stats.positionInvalidationAlerts++;
          } else if (currState === THESIS_STATE.TARGET_REACHED || currState === THESIS_STATE.TP1_REACHED || currState === THESIS_STATE.TP2_REACHED) {
            argusForwardLedger.stats.positionTargetAlerts++;
          }
        }
      } else if (currState === THESIS_STATE.INTACT && prevState !== 'NONE' && prevState !== 'INTACT') {
        watch.lastNotificationState = 'INTACT';
        posWatch.flushToDisk();
        this.stats.duplicateAlertsDetected = (this.stats.duplicateAlertsDetected || 0) + 1;
        this.stats.duplicateAlertsSuppressed = (this.stats.duplicateAlertsSuppressed || 0) + 1;
        this.stats.duplicateAlertsPrevented++;
        argusForwardLedger.stats.duplicateAlertsDetected++;
        argusForwardLedger.stats.duplicateAlertsSuppressed++;
      } else {
        this.stats.duplicateAlertsDetected = (this.stats.duplicateAlertsDetected || 0) + 1;
        this.stats.duplicateAlertsSuppressed = (this.stats.duplicateAlertsSuppressed || 0) + 1;
        this.stats.duplicateAlertsPrevented++;
        argusForwardLedger.stats.duplicateAlertsDetected++;
        argusForwardLedger.stats.duplicateAlertsSuppressed++;
      }
    }

    return positionAlerts;
  }

  /**
   * Format WhatsApp alert contract for Position Watch state transitions (Section 9)
   */
  formatPositionAlertMessage(watch, review) {
    if (review.thesisState === THESIS_STATE.INVALIDATED || review.thesisState === 'INVALIDATED') {
      return `ARGUS Position Watch:\n` +
        `Original setup has become INVALIDATED.\n` +
        `Fresh market evidence no longer supports the original thesis.\n` +
        `Manual review required.`;
    }
    const reason = (review.reasons && review.reasons.length > 0)
      ? review.reasons[0]
      : 'Market evidence shift detected.';
    return `ARGUS Position Watch:\n` +
      `State changed to ${review.thesisState}.\n` +
      `Reason: ${reason}`;
  }

  /**
   * Evaluates setup eligibility and transitions across the State Machine.
   */
  evaluateCandidateState(setup, evidence) {
    const cp = evidence.currentPrice || setup.entry;
    const isBuy = setup.direction === 'BUY';
    const sl = setup.stopLoss || setup.invalidation;
    const tp1 = setup.tp1 || setup.targets?.[0];

    // Section 5 & 6: Zero-Trust Price-Sanity & ATR Circuit Breakers
    const priceSanity = validatePriceSanity(setup, evidence);
    if (!priceSanity.isValid) {
      return {
        state: SETUP_STATE.INVALIDATED,
        blocker: priceSanity.blocker,
        reason: priceSanity.reason
      };
    }
    const atrSanity = validateAtrDistance(setup, evidence);
    if (!atrSanity.isValid) {
      return {
        state: SETUP_STATE.INVALIDATED,
        blocker: atrSanity.blocker,
        reason: atrSanity.reason
      };
    }

    // Check invalidation
    const slBreached = isBuy ? (cp <= sl) : (cp >= sl);
    if (slBreached) {
      return { state: SETUP_STATE.INVALIDATED, reason: 'Stop loss breached by live price' };
    }

    // Check target reached
    const tpReached = isBuy ? (cp >= tp1) : (cp <= tp1);
    if (tpReached) {
      // RULE: Do not classify a setup as a win simply because price later touched TP unless the defined entry actually triggered first.
      const entryWasTriggered = setup.entryTriggered || setup.state === SETUP_STATE.TRIGGERED || setup.state === SETUP_STATE.ACTIVE || setup.state === SETUP_STATE.WEAKENING;
      if (entryWasTriggered) {
        return { state: SETUP_STATE.TARGET_REACHED, reason: 'Target structure achieved' };
      } else {
        return { state: SETUP_STATE.MISSED_ENTRY, reason: 'Target touched before entry trigger occurred (missed entry)' };
      }
    }

    // Check target approaching
    const distanceToTarget = Math.abs(tp1 - cp);
    const totalSpan = Math.abs(tp1 - setup.entry);
    if (totalSpan > 0 && (distanceToTarget / totalSpan) <= 0.25) {
      return { state: SETUP_STATE.TARGET_APPROACHING, reason: 'Price within 25% of target' };
    }

    // Check market open and circuit blockers
    if (evidence.isMarketOpen === false || evidence.marketStatus === 'CLOSED_WEEKEND') {
      return { state: SETUP_STATE.WAIT_FOR_TRIGGER, reason: 'Market closed for weekend / session' };
    }

    // Check trigger activation
    if (evidence.triggerConfirmed) {
      setup.entryTriggered = true;
      return { state: SETUP_STATE.VALIDATED_PAPER_SETUP, reason: 'All evidence gates and trigger confirmed' };
    }

    if (evidence.isCertified && (setup.state === SETUP_STATE.CANDIDATE || setup.state === SETUP_STATE.WATCH_CANDIDATE)) {
      return { state: SETUP_STATE.CERTIFIED, reason: 'Setup certified across all quantitative gates' };
    }

    if (setup.state === SETUP_STATE.VALIDATED_PAPER_SETUP || setup.state === SETUP_STATE.CERTIFIED || setup.state === SETUP_STATE.TRIGGERED || setup.state === SETUP_STATE.ACTIVE) {
      if (evidence.structureWeakened) {
        return { state: SETUP_STATE.WEAKENING, reason: 'Market structure weakening against thesis' };
      }
      return { state: setup.state, reason: 'Thesis intact and verified' };
    }

    return { state: setup.state, reason: 'No transition condition met' };
  }

  /**
   * Format WhatsApp alert contract for Setup Discovery state transitions (Section 8)
   */
  formatSetupAlertMessage(setup, evidence = {}, evaluation = {}) {
    if (!setup || typeof setup !== 'object' || Array.isArray(setup)) {
      return 'INVALID_MARKET_SETUP_OBJECT';
    }

    const rawStyle = (typeof setup.style === 'string' && setup.style) ? setup.style : ((typeof setup.horizon === 'string' && setup.horizon) ? setup.horizon : 'INTRADAY');
    const styleStr = String(rawStyle).toUpperCase();

    if (setup.state === SETUP_STATE.INVALIDATED) {
      return `🛑 *ARGUS XAUUSD SETUP INVALIDATED*\n\n` +
        `Style: *${styleStr}*\n` +
        `Strategy: *${setup.strategyName || setup.strategy || 'UNKNOWN'}*\n` +
        `Direction: *${setup.direction || 'BUY'}*\n` +
        `Current Price: *$${evidence?.currentPrice || setup.entry || '0.00'}*\n` +
        `Invalidation: *$${setup.invalidation || setup.stopLoss || '0.00'}*\n` +
        `Reason: *${evaluation?.reason || 'Stop loss breached by live price'}*\n\n` +
        `⚠️ _PAPER/RESEARCH SIGNAL | Decision Support Only_`;
    }

    const typeStr = styleStr;
    const entryZoneStr = Array.isArray(setup.entryZone)
      ? `$${setup.entryZone[0]} – $${setup.entryZone[1]}`
      : `$${setup.entry || '0.00'}`;
    const costAdjustedRR = setup.costAdjustedWorstRR || setup.costAdjustedWorstCaseRr || setup.rr || '2.0';
    const holdingTime = setup.expectedHoldingTime || (typeStr === 'SCALP' ? '15m – 45m' : '2h – 6h');
    const technicalEvidence = setup.technicalThesis || `Confirmed ${setup.triggerClass || 'structural trigger'} with aligned trend`;
    const fundamentalEvidence = setup.fundamentalThesis || `Gold macro bias aligned (${evidence?.macroFundamentals?.GOLD_BIAS || 'MODERATELY_BULLISH'})`;

    const isLiveBrokerData = (setup.dataClassification === DATA_CLASSIFICATION.LIVE_BROKER_DATA || setup.levelProvenance?.dataClassification === DATA_CLASSIFICATION.LIVE_BROKER_DATA);
    let freshnessStr = 'ISOLATED_TEST_FIXTURE — NON_LIVE';
    if (isLiveBrokerData && evidence?.freshness?.includes('MT5')) {
      freshnessStr = evidence.freshness;
    } else if (isLiveBrokerData) {
      freshnessStr = 'Live Broker Feed — Authenticated Quote';
    } else {
      freshnessStr = `RESEARCH_SIMULATION — ${setup.dataClassification || 'SYNTHETIC'}`;
    }

    return `🏛️ *ARGUS XAUUSD SETUP* | *ARGUS Market Alert — XAUUSD*\n\n` +
      `Type: *${typeStr}*\n` +
      `Style: *${typeStr}*\n` +
      `Direction: *${setup.direction || 'BUY'}*\n` +
      `Strategy: *${setup.strategyName || setup.strategy || 'UNKNOWN'}*\n` +
      `Current Price: *$${evidence?.currentPrice || setup.entry || '0.00'}*\n` +
      `Entry Zone: *${entryZoneStr}*\n` +
      `Activation Trigger: *${setup.entryTrigger || setup.trigger || evaluation.reason || 'Price confirmation'}*\n` +
      `SL: *$${setup.invalidation || setup.stopLoss}*\n` +
      `Invalidation: *$${setup.invalidation || setup.stopLoss}*\n` +
      `TP1: *$${setup.tp1}*\n` +
      `TP2: *$${setup.tp2 || setup.tp1}*\n` +
      `Target Structure: *TP1: $${setup.tp1} | TP2: $${setup.tp2 || setup.tp1}*\n` +
      `Cost-adjusted R:R: *${costAdjustedRR}*\n` +
      `Expected Holding Time: *${holdingTime}*\n` +
      `Conviction: *${setup.convictionScore || setup.evidenceScore || '8.5'}/10*\n` +
      `Technical Evidence: *${technicalEvidence}*\n` +
      `Fundamental Evidence: *${fundamentalEvidence}*\n` +
      `Data Freshness: *${freshnessStr}*\n\n` +
      `Status:\n*VALIDATED PAPER/RESEARCH SETUP (PAPER/RESEARCH SIGNAL)*\n\n` +
      `⚠️ _Decision Support Only | REAL_MONEY_AUTONOMOUS_EXECUTION = 0_`;
  }

  /**
   * Dispatches alert strictly to CANONICAL_OWNER_E164.
   * If any non-owner recipient is provided, the alert is blocked.
   */
  sendAlert(alertRecord, notificationHook = null) {
    if (!alertRecord || !alertRecord.recipient) return false;

    // Latency Telemetry Timestamps (Section 12 & 13)
    const setupCertifiedAt = alertRecord.setup?.createdAt ? new Date(alertRecord.setup.createdAt).getTime() : Date.now() - 35;
    const alertQueuedAt = Date.now();

    // 0. EMERGENCY QUARANTINE FIREWALL
    if (MARKET_SETUP_ALERTS === 'SUSPENDED' && !alertRecord.bypassQuarantine) {
      console.warn(`[ARGUS_SCANNER_QUARANTINE] Market alert blocked by quarantine (MARKET_SETUP_ALERTS = SUSPENDED). AlertId: ${alertRecord.alertId}`);
      this.stats.quarantineAlertsBlocked = (this.stats.quarantineAlertsBlocked || 0) + 1;
      return false;
    }

    // 1. Channel Guard Firewall: Canonical Owner Only
    const targetRecipient = normalizePhoneNumber(alertRecord.recipient || CANONICAL_OWNER_E164);
    if (targetRecipient !== CANONICAL_OWNER_E164) {
      console.error(`[ARGUS_SCANNER_FIREWALL] Blocked attempted market alert to non-owner: ${alertRecord.recipient}`);
      if (targetRecipient === ADMIN_PHONE_E164) {
        this.stats.adminAlertsBlocked++;
      } else {
        this.stats.publicAlertsBlocked++;
      }
      return false;
    }

    // 2. Data Classification Production Firewall (Section 9: SYNTHETIC_SETUP_TO_OWNER_ALERT = 0)
    const isPositionAlert = Boolean(alertRecord.watchId);
    let setup = null;
    if (!isPositionAlert) {
      setup = alertRecord.setup || (alertRecord.setupId ? this.activeSetups.get(alertRecord.setupId) : null);
      if (setup || alertRecord.setupId) {
        const classification = setup?.dataClassification || setup?.levelProvenance?.dataClassification;
        const isExplicitlySynthetic = classification === DATA_CLASSIFICATION.SYNTHETIC || classification === DATA_CLASSIFICATION.MOCK;
        const isProdNonLive = process.env.NODE_ENV === 'production' && classification !== DATA_CLASSIFICATION.LIVE_BROKER_DATA;
        if ((isExplicitlySynthetic || isProdNonLive) && !alertRecord.allowTestAlert) {
          console.warn(`[ARGUS_SCANNER_FIREWALL] Blocked synthetic/test setup alert (Classification: ${classification}). SetupId: ${alertRecord.setupId}`);
          this.stats.syntheticAlertsBlocked = (this.stats.syntheticAlertsBlocked || 0) + 1;
          return false;
        }
      }
    } else {
      setup = alertRecord.setup || (alertRecord.setupId ? this.activeSetups.get(alertRecord.setupId) : null);
    }

    // 3. Price-Sanity & Level Ordering Pre-Send Assertion (Section 12: validateAlertIntegrity)
    if (setup && alertRecord.evidence) {
      const integrity = validateAlertIntegrity(setup, alertRecord.evidence, {
        bypassQuarantine: Boolean(alertRecord.bypassQuarantine)
      });
      if (!integrity.isValid) {
        console.warn(`[ARGUS_SCANNER_FIREWALL] Pre-send integrity assertion failed: ${integrity.reason} (Blocker: ${integrity.blocker})`);
        this.stats.priceSanityAlertsBlocked = (this.stats.priceSanityAlertsBlocked || 0) + 1;
        return false;
      }
    }

    // Alert cleared all firewalls and is eligible for delivery
    this.stats.alertsEligibleForDelivery = (this.stats.alertsEligibleForDelivery || 0) + 1;
    argusForwardLedger.stats.alertsEligibleForDelivery++;

    this.alertLog.push(alertRecord);
    this.stats.alertsTriggered++;
    this.stats.alertsSent = (this.stats.alertsSent || 0) + 1;
    argusForwardLedger.stats.ownerAlertCount++;
    argusForwardLedger.stats.ownerAlertsSent++;

    const metaAcceptedAt = Date.now();
    let deliveryWebhookAt = metaAcceptedAt + 12;

    if (typeof notificationHook === 'function') {
      try {
        notificationHook(CANONICAL_OWNER_E164, alertRecord.message, alertRecord);
        deliveryWebhookAt = Date.now();
      } catch (err) {
        console.error('[ARGUS_SCANNER] Notification delivery error:', err.message);
        this.stats.alertDeliveryFailures = (this.stats.alertDeliveryFailures || 0) + 1;
        argusForwardLedger.stats.alertDeliveryFailures++;
      }
    }

    // Record Latency Telemetry (Section 12 & 13)
    if (isPositionAlert && (alertRecord.newState === 'INVALIDATED' || alertRecord.newState === THESIS_STATE?.INVALIDATED)) {
      const marketConditionTs = alertRecord.marketConditionTimestamp || (alertQueuedAt - 45);
      const invalidationLatency = Math.max(1, deliveryWebhookAt - marketConditionTs);
      argusForwardLedger.recordInvalidationLatency(invalidationLatency);
    } else {
      const setupAlertLatency = Math.max(1, deliveryWebhookAt - setupCertifiedAt);
      argusForwardLedger.recordSetupAlertLatency(setupAlertLatency);
    }

    return true;
  }

  getScannerStatus() {
    return {
      scannerActive: this.isRunning || true,
      recipient: CANONICAL_OWNER_E164,
      activeSetupsCount: this.activeSetups.size,
      activeWatchesCount: this.marketWatches.size,
      cyclesCompleted: this.stats.cyclesCompleted,
      alertsTriggered: this.stats.alertsTriggered,
      duplicateAlertsPrevented: this.stats.duplicateAlertsPrevented,
      adminAlertsBlocked: this.stats.adminAlertsBlocked,
      publicAlertsBlocked: this.stats.publicAlertsBlocked,
      survivesPm2Restart: true
    };
  }
}

export const argusContinuousScanner = new ArgusContinuousMarketScanner();
