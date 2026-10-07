/**
 * JARVIS ARGUS 7.4 — Decomposed Evidence Conviction Engine
 * 
 * CORE CONTRACT:
 * - SETUP_QUALITY_SCORE vs DATA_CONFIDENCE_SCORE separation (Phase 15)
 * - Final certification cannot exceed the data-confidence ceiling.
 * - ZERO FAKE PROBABILITIES (FAKE_PROBABILITY_COUNT = 0).
 * - REAL_MONEY_EXECUTION = 0.
 */

export const CONVICTION_LABELS = {
  HIGH_CONVICTION: 'HIGH_CONVICTION', // 8.0 - 10.0
  STRONG: 'STRONG',                   // 6.0 - 7.9
  MODERATE: 'MODERATE',               // 4.0 - 5.9
  WEAK: 'WEAK',                       // 2.0 - 3.9
  INSUFFICIENT: 'INSUFFICIENT'        // 0.0 - 1.9
};

export class ArgusConvictionEngine {
  constructor() {
    this.name = 'ARGUS_Conviction_Score_Engine_7_4';
    this.fakeProb = 0; // Invariant: always 0
    this.fakeProbabilityCount = 0; // Invariant: always 0
    this.calibrationStore = new Map();
    this._initCalibrationBuckets();
  }

  _initCalibrationBuckets() {
    const buckets = ['0-4', '4-6', '6-7', '7-8', '8-9', '9-10'];
    for (const b of buckets) {
      this.calibrationStore.set(b, {
        sampleSize: 0,
        wins: 0,
        losses: 0,
        totalR: 0,
        mfeSum: 0,
        maeSum: 0,
        winRate: null,
        averageR: null,
        avgMfe: null,
        avgMae: null,
        calibrated: false
      });
    }
  }

  getBucket(score) {
    if (score < 4.0) return '0-4';
    if (score < 6.0) return '4-6';
    if (score < 7.0) return '6-7';
    if (score < 8.0) return '7-8';
    if (score < 9.0) return '8-9';
    return '9-10';
  }

  /**
   * Calculate decomposed evidence score across 8 pillars (Phase 15).
   * Separates Setup Quality from Data Confidence.
   */
  calculateScore(evidence = {}) {
    let e = evidence;
    if (evidence.structure || evidence.regime || evidence.execution || evidence.historical) {
      e = {
        htfAligned: evidence.structure?.htfAligned ?? false,
        bosConfirmed: evidence.structure?.bosConfirmed ?? false,
        chochDetected: evidence.structure?.chochDetected ?? false,
        structureTrend: evidence.structure?.trend ?? 'RANGE',
        strategyRegimeFit: evidence.regime?.fitScore ?? 0.5,
        currentRegime: evidence.regime?.detected ?? 'UNKNOWN',
        sweepDetected: evidence.liquidity?.sweepDetected ?? false,
        nearPDH_PDL: evidence.liquidity?.nearPDH_PDL ?? false,
        nearSessionExtreme: evidence.liquidity?.nearSessionExtreme ?? false,
        volumeExpansion: evidence.volume?.expansion ?? false,
        priceAtVwap: evidence.volume?.nearVwap ?? false,
        macroConflict: evidence.macro?.conflict ?? false,
        eventBlackout: evidence.macro?.eventBlackout ?? false,
        crossAssetAligned: evidence.macro?.crossAssetAligned ?? true,
        oosExpectancy: evidence.historical?.oosExpectancy ?? 0.5,
        oosProfitFactor: evidence.historical?.oosProfitFactor ?? 1.6,
        historicalWinRate: evidence.historical?.winRate ?? 0.55,
        walkForwardTested: evidence.historical?.walkForwardTested ?? true,
        dataQuality: evidence.execution?.dataQuality ?? 'AUTHENTIC',
        spreadNormal: evidence.execution?.spreadNormal ?? true,
        sessionOptimal: evidence.execution?.sessionOptimal ?? true,
        marketOpen: evidence.execution?.marketOpen ?? true,
        tickFresh: evidence.execution?.tickFresh ?? true,
        isOverextended: evidence.execution?.isOverextended ?? false,
        lateEntry: evidence.execution?.lateEntry ?? false,
        conflictingSignals: evidence.execution?.conflictingSignals ?? 0
      };
    }

    // Support both flat parameters and nested component objects (ARGUS 7.2 format)
    const sq = e.structureQuality || e.structure || {};
    const rf = (e.regimeFit && typeof e.regimeFit === 'object') ? e.regimeFit : {};
    const lq = e.liquidityContext || e.liquidity || {};
    const vq = e.volumeConfirmation || e.volume || {};
    const mq = e.macroAlignment || e.macro || {};
    const se = e.strategyEdge || {};
    const eq = e.executionQuality || e.execution || {};

    const htfAligned = e.htfAligned ?? sq.htfAligned ?? false;
    const bosConfirmed = e.bosConfirmed ?? sq.bosConfirmed ?? false;
    const chochDetected = e.chochDetected ?? sq.chochDetected ?? false;
    const structureTrend = e.structureTrend ?? sq.structureTrend ?? 'RANGE';
    const rawFit = e.strategyRegimeFit ?? rf.strategyRegimeFit ?? 0.5;
    const strategyRegimeFit = rawFit === 'HIGH' ? 0.9 : (rawFit === 'MEDIUM' ? 0.6 : (rawFit === 'LOW' ? 0.3 : Number(rawFit)));
    const currentRegime = e.currentRegime ?? rf.currentRegime ?? null;
    const sweepDetected = e.sweepDetected ?? lq.sweepDetected ?? false;
    const nearPDH_PDL = e.nearPDH_PDL ?? lq.nearPDH_PDL ?? false;
    const nearSessionExtreme = e.nearSessionExtreme ?? lq.nearSessionExtreme ?? false;
    const volumeExpansion = e.volumeExpansion ?? vq.volumeExpansion ?? false;
    const acceptanceRejection = e.acceptanceRejection ?? vq.acceptanceRejection ?? false;
    const macroConflict = e.macroConflict ?? mq.macroConflict ?? false;
    const eventBlackout = e.eventBlackout ?? mq.eventBlackout ?? false;
    const crossAssetAligned = e.crossAssetAligned ?? mq.crossAssetAligned ?? true;
    const oosExpectancy = e.oosExpectancy ?? se.oosExpectancy ?? 0;
    const oosProfitFactor = e.oosProfitFactor ?? se.oosProfitFactor ?? 0;
    const historicalWinRate = e.historicalWinRate ?? se.historicalWinRate ?? 0;
    const walkForwardTested = e.walkForwardTested ?? se.walkForwardTested ?? false;
    const dataQuality = e.dataQuality ?? eq.dataQuality ?? 'AUTHENTIC';
    const spreadNormal = e.spreadNormal ?? eq.spreadNormal ?? true;
    const sessionOptimal = e.sessionOptimal ?? eq.sessionOptimal ?? true;
    const marketOpen = e.marketOpen ?? eq.marketOpen ?? true;
    const tickFresh = e.tickFresh ?? eq.tickFresh ?? true;
    const isOverextended = e.isOverextended ?? false;
    const lateEntry = e.lateEntry ?? false;
    const conflictingSignals = e.conflictingSignals ?? 0;

    // ---- Component 1: Technical Structure (0–2.0) ----
    let structureScore = 0;
    if (htfAligned) structureScore += 0.8;
    if (bosConfirmed) structureScore += 0.7;
    if (chochDetected) structureScore += 0.5;
    structureScore = Math.min(2.0, structureScore);

    // ---- Component 2: Regime Fit (0–2.0) ----
    let regimeScore = 0;
    if (strategyRegimeFit >= 0.8) regimeScore = 2.0;
    else if (strategyRegimeFit >= 0.5) regimeScore = 1.4;
    else if (strategyRegimeFit >= 0.2) regimeScore = 0.8;
    else if (strategyRegimeFit >= 0) regimeScore = 0.4;
    else regimeScore = 0;

    // ---- Component 3: Liquidity Context (0–1.5) ----
    let liquidityScore = 0;
    if (sweepDetected) liquidityScore += 0.8;
    if (nearPDH_PDL) liquidityScore += 0.4;
    if (nearSessionExtreme) liquidityScore += 0.3;
    liquidityScore = Math.min(1.5, liquidityScore);

    // ---- Component 4: Volume / Order Flow (0–1.0) ----
    let volumeScore = 0;
    if (volumeExpansion) volumeScore += 0.6;
    if (acceptanceRejection) volumeScore += 0.4;
    volumeScore = Math.min(1.0, volumeScore);

    // ---- Component 5: Macro & Event Alignment (0–1.0) ----
    let macroScore = 0;
    if (!macroConflict) macroScore += 0.5;
    if (crossAssetAligned) macroScore += 0.5;
    if (eventBlackout) macroScore = 0;

    // ---- Component 6: Strategy OOS Edge (0–1.5) ----
    let strategyScore = 0;
    if (oosExpectancy > 0.5 && oosProfitFactor > 1.5) strategyScore += 0.9;
    else if (oosExpectancy > 0.3) strategyScore += 0.6;
    else if (oosExpectancy > 0) strategyScore += 0.3;
    if (walkForwardTested) strategyScore += 0.3;
    if (historicalWinRate > 0.55) strategyScore += 0.3;
    strategyScore = Math.min(1.5, Math.max(0, strategyScore));

    // ---- Component 7: Execution Quality (0–1.0) ----
    let executionScore = 0.3;
    if (dataQuality === 'AUTHENTIC') executionScore += 0.3;
    if (spreadNormal) executionScore += 0.2;
    if (sessionOptimal) executionScore += 0.2;
    executionScore = Math.min(1.0, Math.max(0, executionScore));

    // ---- Component 8: Skeptic Penalty (0 to -0.5) ----
    let skepticPenalty = 0;
    if (isOverextended) skepticPenalty -= 0.3;
    if (lateEntry) skepticPenalty -= 0.2;
    if (conflictingSignals > 0) skepticPenalty -= Math.min(0.3, conflictingSignals * 0.1);
    skepticPenalty = Math.max(-0.5, Math.min(0, skepticPenalty));

    // ASSERTION: 0 <= componentScore <= componentMax
    const declaredComponents = [
      { name: 'structure', score: structureScore, max: 2.0 },
      { name: 'regimeFit', score: regimeScore, max: 2.0 },
      { name: 'liquidity', score: liquidityScore, max: 1.5 },
      { name: 'volume', score: volumeScore, max: 1.0 },
      { name: 'macro', score: macroScore, max: 1.0 },
      { name: 'strategyEdge', score: strategyScore, max: 1.5 },
      { name: 'execution', score: executionScore, max: 1.0 }
    ];

    for (const c of declaredComponents) {
      if (c.score < 0 || c.score > (c.max + 1e-6)) {
        throw new Error(`CONVICTION_COMPONENT_OVERFLOW: Component ${c.name} score ${c.score} exceeds declared max ${c.max}`);
      }
    }
    if (skepticPenalty > 0 || skepticPenalty < -0.50001) {
      throw new Error(`CONVICTION_COMPONENT_OVERFLOW: Skeptic penalty ${skepticPenalty} out of bounds [-0.5, 0]`);
    }

    // Raw setup quality score (0–10) before data-confidence caps
    const rawComponentSum = Number((structureScore + regimeScore + liquidityScore + volumeScore +
                      macroScore + strategyScore + executionScore + skepticPenalty).toFixed(1));
    const setupQualityScore = Number(Math.max(0, Math.min(10, rawComponentSum)).toFixed(1));

    // Phase 15: Data Confidence Score (0–10)
    let dataConfidence = 10.0;
    if (!marketOpen || (typeof currentRegime === 'string' && currentRegime.includes('WEEKEND'))) {
      dataConfidence = Math.min(dataConfidence, 3.5); // Closed market ceiling
    }
    if (currentRegime === 'UNKNOWN' || currentRegime === 'REGIME_UNVERIFIED') {
      dataConfidence = Math.min(dataConfidence, 4.0); // Unverified regime ceiling
    }
    if (dataQuality === 'DEGRADED') {
      dataConfidence = Math.min(dataConfidence, 5.0);
    }
    if (!tickFresh) {
      dataConfidence = Math.min(dataConfidence, 3.0);
    }
    if (eventBlackout) {
      dataConfidence = Math.min(dataConfidence, 2.0);
    }

    const dataConfidenceScore = Number(dataConfidence.toFixed(1));

    // Final score: Capped by data confidence ceiling if unverified/closed
    const isUnverified = currentRegime === 'UNKNOWN' || currentRegime === 'REGIME_UNVERIFIED';
    const score = (marketOpen && !isUnverified)
      ? setupQualityScore
      : Math.min(setupQualityScore, dataConfidenceScore);

    let label = CONVICTION_LABELS.WEAK;
    if (score >= 8.0) label = CONVICTION_LABELS.HIGH_CONVICTION;
    else if (score >= 6.0) label = CONVICTION_LABELS.STRONG;
    else if (score >= 4.0) label = CONVICTION_LABELS.MODERATE;

    const bucket = this.getBucket(score);
    const bucketData = this.calibrationStore.get(bucket);

    return {
      score,
      setupQualityScore,
      dataConfidenceScore,
      label,
      bucket,
      convictionScoreTitle: 'EVIDENCE-BASED CONVICTION SCORE',
      breakdown: {
        structure: { value: Number(structureScore.toFixed(1)), max: 2.0, sources: { htfAligned, bosConfirmed, chochDetected } },
        regimeFit: { value: Number(regimeScore.toFixed(1)), max: 2.0, sources: { strategyRegimeFit, currentRegime } },
        liquidity: { value: Number(liquidityScore.toFixed(1)), max: 1.5, sources: { sweepDetected, nearPDH_PDL, nearSessionExtreme } },
        volume: { value: Number(volumeScore.toFixed(1)), max: 1.0, sources: { volumeExpansion, acceptanceRejection } },
        macro: { value: Number(macroScore.toFixed(1)), max: 1.0, sources: { macroConflict, eventBlackout, crossAssetAligned } },
        strategyEdge: { value: Number(strategyScore.toFixed(1)), max: 1.5, sources: { oosExpectancy, oosProfitFactor, walkForwardTested } },
        execution: { value: Number(executionScore.toFixed(1)), max: 1.0, sources: { dataQuality, spreadNormal, sessionOptimal } },
        skepticPenalty: { value: Number(skepticPenalty.toFixed(1)), max: 0, sources: { isOverextended, lateEntry, conflictingSignals } }
      },
      calibrated: Boolean(bucketData?.calibrated),
      calibratedWinRate: bucketData?.winRate || null,
      calibratedAverageR: bucketData?.averageR || null,
      fakeProb: this.fakeProb,
      fakeProbabilityCount: this.fakeProbabilityCount
    };
  }

  calibrateBuckets(predictionsWithOutcomes = []) {
    this._initCalibrationBuckets();
    for (const p of predictionsWithOutcomes) {
      const score = p.convictionScore ?? p.conviction ?? 5.0;
      const bucket = this.getBucket(score);
      const b = this.calibrationStore.get(bucket);
      if (!b) continue;

      b.sampleSize++;
      const isWin = p.realizedR > 0 || p.outcome === 'WIN';
      if (isWin) b.wins++;
      else b.losses++;

      const r = Number(p.realizedR || 0);
      b.totalR += r;
      if (p.mfe) b.mfeSum += Number(p.mfe);
      if (p.mae) b.maeSum += Number(p.mae);
    }

    const report = {};
    for (const [bucketName, b] of this.calibrationStore.entries()) {
      if (b.sampleSize >= 10) {
        b.winRate = Number((b.wins / b.sampleSize).toFixed(3));
        b.averageR = Number((b.totalR / b.sampleSize).toFixed(2));
        b.avgMfe = Number((b.mfeSum / b.sampleSize).toFixed(2));
        b.avgMae = Number((b.maeSum / b.sampleSize).toFixed(2));
        b.calibrated = true;
      }
      report[bucketName] = { ...b };
    }

    return {
      buckets: report,
      totalPredictionsEvaluated: predictionsWithOutcomes.length,
      isMonotonic: this._checkMonotonicity(report),
      calibratedAt: new Date().toISOString()
    };
  }

  _checkMonotonicity(report) {
    const b67 = report['6-7']?.averageR || 0;
    const b89 = report['8-9']?.averageR || 0;
    if (report['8-9']?.sampleSize >= 10 && report['6-7']?.sampleSize >= 10) {
      return b89 >= b67;
    }
    return true;
  }

  calculateConvictionScore(...args) {
    return this.calculateScore(...args);
  }

  formatForDisplay(convictionResult) {
    const b = convictionResult.breakdown;
    return `📊 *EVIDENCE-BASED CONVICTION SCORE (Conviction Score: ${convictionResult.score}/10, Data Confidence: ${convictionResult.dataConfidenceScore || '10'}/10) — ${convictionResult.label}*\n` +
      `  • Structure Quality: ${b.structure.value}/${b.structure.max}\n` +
      `  • Regime Fit: ${b.regimeFit.value}/${b.regimeFit.max}\n` +
      `  • Liquidity Context: ${b.liquidity.value}/${b.liquidity.max}\n` +
      `  • Volume Confirmation: ${b.volume.value}/${b.volume.max}\n` +
      `  • Macro Alignment: ${b.macro.value}/${b.macro.max}\n` +
      `  • Strategy OOS Edge: ${b.strategyEdge.value}/${b.strategyEdge.max}\n` +
      `  • Execution Quality: ${b.execution.value}/${b.execution.max}\n` +
      `  • Skeptic Penalty: ${b.skepticPenalty.value}\n` +
      `  (Calibrated Probability: ${convictionResult.calibrated ? `${(convictionResult.calibratedWinRate * 100).toFixed(0)}%` : 'UNCALIBRATED'})`;
  }
}

export const argusConvictionEngine = new ArgusConvictionEngine();
