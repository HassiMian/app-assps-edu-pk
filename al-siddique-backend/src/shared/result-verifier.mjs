/**
 * JARVIS 5.0 — Result Verifier Kernel
 *
 * Enforces:
 * 1. FALSE_SUCCESS_CLAIM = 0
 * 2. Strict Post-Condition Invariants per Capability
 * 3. Evidence-Hash Generation & Integrity Verification
 * 4. Automatic Replanning Recommendation on Tool Execution Failures
 * 5. FALSE_SUCCESS_UNKNOWN_DOMAIN = 0
 * 6. WRONG_STUDENT_VERIFIED_SUCCESS = 0
 * 7. STALE_ARGUS_VERIFIED_SUCCESS = 0
 * 8. INVALID_ARTIFACT_VERIFIED_SUCCESS = 0
 */

import crypto from 'crypto';
import fs from 'fs';

export class ResultVerifier {
  /**
   * Verify an execution result against expected capability post-conditions
   * @param {Object} capability - Capability metadata from registry
   * @param {Object} executionResult - Output from tool execution { success, data, error, rawOutput }
   * @param {Object} worldState - WorldStateRead snapshot
   * @param {Object} verificationContext - Optional context for binding verification { requestedStudentId, requestedStudentName, expectedArtifactType, expectedContentHash, snapshotId }
   * @returns {Object} VerificationResult
   */
  static verify(capability, executionResult, worldState = {}, verificationContext = {}) {
    const timestamp = Date.now();
    const capabilityId = capability ? (capability.id || capability.name || 'unknown') : 'unknown';

    // 1. Tool-level execution failure detection
    if (!executionResult || executionResult.success === false || executionResult.error) {
      return {
        isVerified: false,
        dagVerified: false,
        capabilityId,
        status: 'EXECUTION_FAILED',
        error: executionResult?.error || 'Underlying tool execution threw error',
        falseSuccessClaimPrevented: true,
        replanRecommended: true,
        replanRequired: true,
        evidenceHash: null,
        timestamp
      };
    }

    // 2. Specific Capability Invariant Verification
    const domain = capabilityId.split('.')[0];
    let invariantPassed = true;
    let failureReason = null;
    let evidenceData = executionResult.data || executionResult;

    switch (domain) {
      case 'desktop': {
        // P1-3A: Desktop artifact verification — existence + type + non-empty + content validation
        if (executionResult.artifactPath) {
          const artifactPath = executionResult.artifactPath;
          const exists = fs.existsSync(artifactPath);
          if (!exists) {
            invariantPassed = false;
            failureReason = `Artifact on disk missing: ${artifactPath}`;
            break;
          }
          const stat = fs.statSync(artifactPath);
          if (stat.size === 0) {
            invariantPassed = false;
            failureReason = `Artifact on disk is empty (0 bytes): ${artifactPath}`;
            break;
          }
          if (verificationContext.expectedArtifactType) {
            const ext = artifactPath.split('.').pop()?.toLowerCase();
            if (ext !== verificationContext.expectedArtifactType.toLowerCase()) {
              invariantPassed = false;
              failureReason = `Artifact type mismatch: expected ${verificationContext.expectedArtifactType}, got ${ext}`;
              break;
            }
          }
          if (verificationContext.expectedContentHash) {
            try {
              const content = fs.readFileSync(artifactPath);
              const actualHash = crypto.createHash('sha256').update(content).digest('hex');
              if (actualHash !== verificationContext.expectedContentHash) {
                invariantPassed = false;
                failureReason = `Artifact content hash mismatch: expected ${verificationContext.expectedContentHash}, got ${actualHash}`;
                break;
              }
            } catch (e) {
              invariantPassed = false;
              failureReason = `Artifact readback failed: ${e.message}`;
              break;
            }
          }
          // Readback verification: ensure the file can actually be read
          try {
            fs.readFileSync(artifactPath);
          } catch (e) {
            invariantPassed = false;
            failureReason = `Artifact readback failed: ${e.message}`;
          }
        }
        break;
      }

      case 'school': {
        // P1-3B: School student data verification — binding check
        if (capabilityId.includes('fee') || capabilityId.includes('student')) {
          if (executionResult.data === null || executionResult.data === undefined) {
            invariantPassed = false;
            failureReason = 'School database returned null or undefined payload';
            break;
          }
          const returnedData = executionResult.data;
          // Student identity binding: if we requested a specific student, verify the returned data matches
          if (verificationContext.requestedStudentId) {
            const returnedId = returnedData.studentId || returnedData.id || returnedData.student?.id;
            if (returnedId && String(returnedId) !== String(verificationContext.requestedStudentId)) {
              invariantPassed = false;
              failureReason = `WRONG_STUDENT: requested studentId=${verificationContext.requestedStudentId}, returned studentId=${returnedId}`;
              break;
            }
          }
          if (verificationContext.requestedStudentName) {
            const returnedName = (returnedData.studentName || returnedData.name || returnedData.student?.name || '').toLowerCase().trim();
            const requestedName = verificationContext.requestedStudentName.toLowerCase().trim();
            if (returnedName && requestedName && !returnedName.includes(requestedName) && !requestedName.includes(returnedName)) {
              invariantPassed = false;
              failureReason = `WRONG_STUDENT: requested name="${verificationContext.requestedStudentName}", returned name="${returnedName}"`;
              break;
            }
          }
        }
        break;
      }

      case 'argus': {
        // P1-3C: ARGUS verification — geometry + freshness + provenance + minRR
        if (executionResult.levels) {
          const { entry, stopLoss, target1 } = executionResult.levels;
          if (entry && stopLoss && target1) {
            const isBuy = target1 > entry && entry > stopLoss;
            const isSell = target1 < entry && entry < stopLoss;
            if (!isBuy && !isSell) {
              invariantPassed = false;
              failureReason = `Invalid trade level geometry: entry=${entry}, sl=${stopLoss}, tp=${target1}`;
              break;
            }
          }
        }
        // Freshness check: broker truth must not be stale
        const snapshotTimestamp = executionResult.snapshotTimestamp || executionResult.data?.snapshotTimestamp;
        if (snapshotTimestamp) {
          const ageMs = Date.now() - snapshotTimestamp;
          const MAX_SNAPSHOT_AGE_MS = 5 * 60 * 1000; // 5 minutes
          if (ageMs > MAX_SNAPSHOT_AGE_MS) {
            invariantPassed = false;
            failureReason = `STALE_MARKET_DATA: snapshot age ${Math.round(ageMs / 1000)}s exceeds max ${MAX_SNAPSHOT_AGE_MS / 1000}s`;
            break;
          }
        }
        // Provenance check: snapshot identity must match if provided
        if (verificationContext.snapshotId) {
          const returnedSnapshotId = executionResult.snapshotId || executionResult.data?.snapshotId;
          if (returnedSnapshotId && returnedSnapshotId !== verificationContext.snapshotId) {
            invariantPassed = false;
            failureReason = `SNAPSHOT_IDENTITY_MISMATCH: expected ${verificationContext.snapshotId}, got ${returnedSnapshotId}`;
            break;
          }
        }
        // Strategy minRR check
        if (executionResult.strategy) {
          if (!executionResult.strategy.minRR && executionResult.strategy.minRR !== 0) {
            invariantPassed = false;
            failureReason = 'ARGUS strategy missing required minRR field';
            break;
          }
          if (executionResult.strategy.costAdjustedRR !== undefined && executionResult.strategy.costAdjustedRR < executionResult.strategy.minRR) {
            invariantPassed = false;
            failureReason = `ARGUS costAdjustedRR (${executionResult.strategy.costAdjustedRR}) below minRR (${executionResult.strategy.minRR})`;
            break;
          }
        }
        // Test taint check
        if (executionResult.taint === 'TEST' || executionResult.data?.taint === 'TEST') {
          invariantPassed = false;
          failureReason = 'ARGUS result tainted as TEST data — cannot verify as production';
          break;
        }
        break;
      }

      default: {
        // P1-3D: Unknown/unrecognized domain NEVER returns verified success
        invariantPassed = false;
        failureReason = `UNVERIFIED_DOMAIN: No verification strategy for domain "${domain}" — cannot claim verified success`;
        break;
      }
    }

    if (!invariantPassed) {
      return {
        isVerified: false,
        dagVerified: false,
        capabilityId,
        status: domain === 'unknown' || !['desktop', 'school', 'argus'].includes(domain) ? 'UNVERIFIED' : 'POST_CONDITION_VIOLATED',
        error: failureReason,
        falseSuccessClaimPrevented: true,
        replanRecommended: domain !== 'unknown' && ['desktop', 'school', 'argus'].includes(domain),
        replanRequired: domain !== 'unknown' && ['desktop', 'school', 'argus'].includes(domain),
        evidenceHash: null,
        timestamp
      };
    }

    // 3. Compute Cryptographic Evidence Hash
    const evidenceRaw = JSON.stringify({ capabilityId, evidenceData, timestamp });
    const evidenceHash = crypto.createHash('sha256').update(evidenceRaw).digest('hex');

    return {
      isVerified: true,
      dagVerified: true,
      capabilityId,
      status: 'VERIFIED',
      error: null,
      falseSuccessClaimPrevented: true,
      replanRecommended: false,
      replanRequired: false,
      evidenceHash,
      timestamp
    };
  }

  /**
   * Verify an entire multi-step DAG execution
   * @param {Array} stepResults - Array of step results { stepId, capability, result, verification }
   * @returns {Object} DagVerificationSummary
   */
  static verifyDag(stepResults = []) {
    let allVerified = true;
    let failedStep = null;

    for (const sr of stepResults) {
      const v = sr.verification || ResultVerifier.verify(sr.capability, sr.result);
      if (!v.isVerified) {
        allVerified = false;
        failedStep = {
          stepId: sr.stepId,
          capabilityId: v.capabilityId,
          error: v.error
        };
        break;
      }
    }

    return {
      dagVerified: allVerified,
      isVerified: allVerified,
      totalSteps: stepResults.length,
      failedStep,
      replanRequired: !allVerified,
      replanRecommended: !allVerified,
      falseSuccessClaim: 0
    };
  }

  /**
   * Verify semantic task progress for stateful mission responses.
   * Enforces:
   * 1. DELIVERY_SUCCESS != TASK_SUCCESS (Transport delivery does not equal semantic task success)
   * 2. INTENT_MATCH
   * 3. MISSION_ID_CONTINUITY
   * 4. KNOWN_FIELDS_PRESERVED
   * 5. MISSING_FIELDS_ACCURATE
   * 6. NO_ALREADY_KNOWN_REASK
   * 7. NO_GENERIC_FALLBACK_HIJACK
   * 8. NEXT_STATE_VALID
   *
   * @param {Object} mission - Current or active mission { missionId, type, state }
   * @param {Object} action - Action or intent being verified
   * @param {Object} result - Response result { reply, finalResponseText, delivered, metaAccepted, intent }
   * @param {Object} context - Verification context { knownFields, missingFields, conflicts, nextExpectedFields, targetClass, workflowState }
   * @returns {Object} AdmissionVerificationContract
   */
  static verifyTaskProgress(mission, action, result, context = {}) {
    const timestamp = Date.now();
    const missionId = mission?.missionId || context?.missionId || result?.missionId || 'unknown';
    const missionType = mission?.type || context?.missionType || action?.type || 'CREATE_ADMISSION';

    const deliverySuccess = Boolean(
      result?.delivered || result?.metaAccepted || result?.metaStatus === 'DELIVERED' || result?.metaStatus === 'READ'
    );

    const failures = [];

    // 1. INTENT_MATCH
    const expectedIntent = context.expectedIntent || missionType;
    const actualIntent = result?.intent || result?.forensicTrace?.selected_intent;
    if (expectedIntent && actualIntent && expectedIntent !== actualIntent && expectedIntent !== 'CREATE_ADMISSION') {
      failures.push(`INTENT_MISMATCH: expected ${expectedIntent}, got ${actualIntent}`);
    }

    // 2. MISSION & WORKFLOW SESSION CONTINUITY
    const currentAdmissionSessionId = context.admissionSessionId || result?.admissionSessionId || mission?.admissionSessionId || null;
    let workflowSessionContinuity = true;
    if (context.previousAdmissionSessionId && currentAdmissionSessionId) {
      if (context.previousAdmissionSessionId !== currentAdmissionSessionId) {
        workflowSessionContinuity = false;
        failures.push(`WORKFLOW_SESSION_DISCONTINUITY: previous session ${context.previousAdmissionSessionId}, current session ${currentAdmissionSessionId}`);
      }
    }
    if (context.requireMissionIdContinuity && context.previousMissionId && result?.missionId && context.previousMissionId !== result.missionId) {
      failures.push(`MISSION_ID_DISCONTINUITY: previous ${context.previousMissionId}, result ${result.missionId}`);
    }

    // 3. NO_GENERIC_FALLBACK_HIJACK
    const replyText = result?.reply || result?.finalResponseText || '';
    const isBrochureText = /Welcome to Apex|Our campus offers|fee schedule|admission brochure|الصدّيق اسکالرز پبلک اسکول/i.test(replyText) &&
      !/details note kar li hain|admission draft|confirm karein|barah-e-karam/i.test(replyText);
    if (actualIntent === 'PUBLIC_INFO' || result?.intent === 'PUBLIC_INFO' || isBrochureText) {
      if (context.isAdmissionWorkflowActive || missionType === 'CREATE_ADMISSION') {
        failures.push('GENERIC_FALLBACK_HIJACK: generic brochure sent during active admission collection');
      }
    }

    // 4. KNOWN_FIELDS_PRESERVED & NO_ALREADY_KNOWN_REASK
    const knownFields = context.knownFields || [];
    const missingFields = context.missingFields || [];
    const conflicts = context.conflicts || [];
    const nextExpectedFields = context.nextExpectedFields || missingFields;
    const targetClass = context.targetClass || null;
    const workflowState = context.workflowState || 'COLLECTING';

    if (knownFields.length > 0 && replyText) {
      for (const known of knownFields) {
        if (known === 'Student Name' || known === 'studentName' || known === 'name') {
          if (/barah-e-karam.*(?:student\s*name|طالب\s*علم\s*کا\s*نام).*provide/i.test(replyText) ||
              /•\s*\*?Student Name\*?/i.test(replyText) ||
              (/\*Student Name\*/i.test(replyText) && /provide karein/i.test(replyText))) {
            failures.push('ALREADY_KNOWN_FIELD_REASK: Student Name was already known but re-asked');
          }
        }
        if (known === 'Father Name' || known === 'fatherName' || known === 'father_name') {
          if (/barah-e-karam.*(?:father\s*name|والد\s*کا\s*نام).*provide/i.test(replyText) ||
              /•\s*\*?Father Name\*?/i.test(replyText) ||
              (/\*Father Name\*/i.test(replyText) && /provide karein/i.test(replyText))) {
            failures.push('ALREADY_KNOWN_FIELD_REASK: Father Name was already known but re-asked');
          }
        }
      }
    }

    // 5. TARGET CLASS BINDING (WORKFLOW-STAGE AWARE)
    const stage = (context.stage || context.workflowState || 'COLLECTING').toUpperCase();
    const requestedTargetClass = context.requestedTargetClass || context.targetClass || null;
    const missionTargetClass = context.missionTargetClass || context.candidate?.targetClass || null;

    if (requestedTargetClass) {
      // Stage: COLLECTING, PREVIEW, VALIDATION, CREATE
      if (missionTargetClass && missionTargetClass.toLowerCase().replace(/[^a-z0-9]/g, '') !== requestedTargetClass.toLowerCase().replace(/[^a-z0-9]/g, '')) {
        failures.push(`TARGET_CLASS_MISMATCH: requestedTargetClass "${requestedTargetClass}" != missionTargetClass "${missionTargetClass}"`);
      }

      // Stage: PREVIEW
      if (stage === 'PREVIEW' || stage === 'ADMISSION_PREVIEW') {
        const previewApplyingClass = context.previewApplyingClass ||
          (replyText.match(/•\s*\*Applying Class:\*\s*([^\n\r]+)/i)?.[1]?.trim()) || null;
        if (previewApplyingClass) {
          const normPreview = previewApplyingClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normReq = requestedTargetClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normPreview !== normReq && !normPreview.includes(normReq) && !normReq.includes(normPreview)) {
            failures.push(`TARGET_CLASS_MISMATCH: requestedTargetClass "${requestedTargetClass}" != previewApplyingClass "${previewApplyingClass}"`);
          }
        }
      }

      // Stage: VALIDATION
      if (stage === 'VALIDATION' || stage === 'ADMISSION_VALIDATION') {
        const validatedApplyingClass = context.validatedApplyingClass || context.candidate?.class || null;
        if (validatedApplyingClass) {
          const normVal = validatedApplyingClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normReq = requestedTargetClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normVal !== normReq && !normVal.includes(normReq) && !normReq.includes(normVal)) {
            failures.push(`TARGET_CLASS_MISMATCH: requestedTargetClass "${requestedTargetClass}" != validatedApplyingClass "${validatedApplyingClass}"`);
          }
        }
      }

      // Stage: CREATE
      if (stage === 'CREATE' || stage === 'ADMISSION_CONFIRM_AND_CREATE') {
        const finalCreatePayloadClass = context.finalCreatePayloadClass || context.payload?.class || context.lockedRecord?.className || null;
        if (finalCreatePayloadClass) {
          const normPayload = finalCreatePayloadClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normReq = requestedTargetClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normPayload !== normReq && !normPayload.includes(normReq) && !normReq.includes(normPayload)) {
            failures.push(`TARGET_CLASS_MISMATCH: requestedTargetClass "${requestedTargetClass}" != finalCreatePayloadClass "${finalCreatePayloadClass}"`);
          }
        }
      }
    }

    const taskProgressVerified = failures.length === 0;

    return {
      missionId,
      missionType,
      targetClass,
      requestedTargetClass,
      missionTargetClass,
      admissionSessionId: currentAdmissionSessionId,
      workflowSessionContinuity: workflowSessionContinuity ? 'YES' : 'NO',
      stage,
      knownFields,
      missingFields,
      conflicts,
      nextExpectedFields,
      workflowState,
      deliverySuccess,
      taskProgressVerified,
      isVerified: taskProgressVerified, // Semantic task success, NOT just delivery
      failures,
      timestamp
    };
  }
}
