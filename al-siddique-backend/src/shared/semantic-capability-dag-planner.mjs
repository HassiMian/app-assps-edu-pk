/**
 * JARVIS 4.1 — Semantic Capability DAG Planner
 *
 * Provides:
 * - Dynamic Capability Discovery (Exposing inputs, risks, preconditions, effects, verification contracts)
 * - Multi-Intent Dependency DAG generation (READ -> CONDITION -> WRITE -> VERIFY -> DESKTOP)
 * - Semantic Condition Representation (agar, jab, unless, if)
 *
 * Invariant: Every financial/admission mutation requires:
 * 1. Precondition check
 * 2. RBAC / Owner confirmation gate
 * 3. Post-commit readback verification contract
 */

import { RiskTier } from './semantic-intent-ontology.mjs';

export const CAPABILITY_METADATA = {
  'school.resolve_student': {
    name: 'school.resolve_student',
    description: 'Resolve canonical student record from name, GR number, or context reference',
    riskTier: RiskTier.READ_ONLY,
    inputs: { studentName: 'string', classFilter: 'string?' },
    preconditions: ['tenant_active'],
    effects: ['context.activeStudent_bound'],
    verificationContract: 'student_id_exists'
  },
  'school.fetch_challans': {
    name: 'school.fetch_challans',
    description: 'Fetch outstanding fee challans and balance for student',
    riskTier: RiskTier.READ_ONLY,
    inputs: { studentId: 'number' },
    preconditions: ['student_resolved'],
    effects: ['challans_retrieved'],
    verificationContract: 'challan_array_valid'
  },
  'school.record_fee_payment': {
    name: 'school.record_fee_payment',
    description: 'Record cash fee payment received at school front desk',
    riskTier: RiskTier.SENSITIVE_WRITE,
    inputs: { studentId: 'number', challanId: 'string', amount: 'number', paymentMode: 'cash' },
    preconditions: ['challan_unpaid', 'role_authorized', 'owner_confirmed'],
    effects: ['ledger_updated', 'balance_deducted'],
    verificationContract: 'post_commit_readback_balance_zero_or_reduced'
  },
  'school.read_ledger': {
    name: 'school.read_ledger',
    description: 'Read back student ledger to verify payment post-commit',
    riskTier: RiskTier.READ_ONLY,
    inputs: { studentId: 'number' },
    preconditions: ['student_resolved'],
    effects: ['verified_balance_read'],
    verificationContract: 'ledger_matches_transaction'
  },
  'school.generate_receipt': {
    name: 'school.generate_receipt',
    description: 'Generate PDF receipt voucher for collected fee',
    riskTier: RiskTier.READ_ONLY,
    inputs: { studentId: 'number', transactionId: 'string' },
    preconditions: ['payment_verified'],
    effects: ['receipt_pdf_ready'],
    verificationContract: 'pdf_buffer_valid'
  },
  'desktop.print_document': {
    name: 'desktop.print_document',
    description: 'Send document or receipt to local desktop printer',
    riskTier: RiskTier.LOW_RISK_WRITE,
    inputs: { filePath: 'string', printerName: 'string?' },
    preconditions: ['desktop_service_online', 'document_exists'],
    effects: ['print_job_queued'],
    verificationContract: 'print_spooler_ok'
  },
  'school.create_admission': {
    name: 'school.create_admission',
    description: 'Enroll and confirm new student candidate admission',
    riskTier: RiskTier.CRITICAL_WRITE,
    inputs: { candidateName: 'string', className: 'string', fatherName: 'string' },
    preconditions: ['role_authorized', 'candidate_fields_complete', 'owner_confirmed'],
    effects: ['student_record_created', 'gr_assigned'],
    verificationContract: 'student_created_and_searchable'
  },
  'school.mark_attendance': {
    name: 'school.mark_attendance',
    description: 'Submit daily attendance for students in a class',
    riskTier: RiskTier.SENSITIVE_WRITE,
    inputs: { className: 'string', section: 'string?', date: 'string', records: 'array' },
    preconditions: ['role_authorized', 'class_exists'],
    effects: ['attendance_logged'],
    verificationContract: 'attendance_count_matches_roster'
  },
  'market.get_live_rates': {
    name: 'market.get_live_rates',
    description: 'Fetch live market prices and technical setups for gold/forex/crypto',
    riskTier: RiskTier.READ_ONLY,
    inputs: { symbol: 'string' },
    preconditions: ['market_feed_connected'],
    effects: ['ticker_data_returned'],
    verificationContract: 'timestamp_fresh'
  }
};

export class SemanticCapabilityDagPlanner {
  constructor(capabilities = CAPABILITY_METADATA) {
    this.capabilities = capabilities;
  }

  /**
   * Plan execution DAG from structured NLU interpretation
   */
  planDag(nluResult, context = {}) {
    const dag = {
      planId: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      intent: nluResult.intent,
      modality: nluResult.modality,
      conditions: nluResult.conditions || [],
      isMultiIntent: nluResult.is_multi_intent || false,
      nodes: [],
      executionStatus: 'PENDING',
      createdAt: Date.now()
    };

    const studentName = nluResult.entities?.studentName || context.activeStudent?.name;
    const studentId = context.activeStudent?.id || null;
    const amount = nluResult.entities?.amount || null;

    // A. Multi-Intent Complex Instruction DAG
    // e.g. "Mahnoor ki fee check karo, agar sirf September baki hai to cash paid laga do aur receipt print kar do"
    if (nluResult.is_multi_intent || nluResult.conditions?.length > 0 || nluResult.sub_intents?.length > 0) {
      // Step 1: Resolve Student
      dag.nodes.push({
        id: 'step_1_resolve_student',
        capability: 'school.resolve_student',
        input: { studentName },
        dependsOn: [],
        riskTier: RiskTier.READ_ONLY
      });

      // Step 2: Fetch Challans
      dag.nodes.push({
        id: 'step_2_fetch_challans',
        capability: 'school.fetch_challans',
        input: { studentId },
        dependsOn: ['step_1_resolve_student'],
        riskTier: RiskTier.READ_ONLY
      });

      // Step 3: Condition Evaluation Gate (if condition exists)
      if (dag.conditions.length > 0) {
        dag.nodes.push({
          id: 'step_3_eval_condition',
          capability: 'system.evaluate_condition',
          input: {
            condition: dag.conditions[0],
            evaluationScope: 'step_2_fetch_challans.result'
          },
          dependsOn: ['step_2_fetch_challans'],
          riskTier: RiskTier.READ_ONLY
        });
      }

      // Step 4: Record Cash Payment (Gated by condition)
      const payDependencies = dag.conditions.length > 0
        ? ['step_3_eval_condition']
        : ['step_2_fetch_challans'];

      dag.nodes.push({
        id: 'step_4_record_payment',
        capability: 'school.record_fee_payment',
        input: {
          studentId,
          amount,
          paymentMode: 'cash',
          paymentSource: 'MANUAL_SCHOOL_COLLECTION'
        },
        dependsOn: payDependencies,
        riskTier: RiskTier.SENSITIVE_WRITE,
        conditionGate: dag.conditions.length > 0 ? dag.conditions[0].expression : null,
        requiresConfirmation: true
      });

      // Step 5: Post-Commit Readback Verification
      dag.nodes.push({
        id: 'step_5_read_ledger',
        capability: 'school.read_ledger',
        input: { studentId },
        dependsOn: ['step_4_record_payment'],
        riskTier: RiskTier.READ_ONLY
      });

      // Step 6: Desktop Print Action
      dag.nodes.push({
        id: 'step_6_print_receipt',
        capability: 'desktop.print_document',
        input: { documentType: 'fee_receipt' },
        dependsOn: ['step_5_read_ledger'],
        riskTier: RiskTier.LOW_RISK_WRITE
      });

      return dag;
    }

    // B. Novel Single-Intent Derivation
    // e.g. "Mahnoor ke paise office mein receive ho gaye hain, account mein laga ke remaining zero verify kar dena"
    if (nluResult.intent === 'RECORD_FEE_COLLECTION' || nluResult.intent === 'RECORD_FULL_PAYMENT') {
      dag.nodes.push({
        id: 'node_resolve_student',
        capability: 'school.resolve_student',
        input: { studentName },
        dependsOn: [],
        riskTier: RiskTier.READ_ONLY
      });

      dag.nodes.push({
        id: 'node_fetch_challans',
        capability: 'school.fetch_challans',
        input: { studentId },
        dependsOn: ['node_resolve_student'],
        riskTier: RiskTier.READ_ONLY
      });

      dag.nodes.push({
        id: 'node_record_payment',
        capability: 'school.record_fee_payment',
        input: {
          studentId,
          amount,
          paymentMode: 'cash',
          paymentSource: 'MANUAL_SCHOOL_COLLECTION'
        },
        dependsOn: ['node_fetch_challans'],
        riskTier: RiskTier.SENSITIVE_WRITE,
        requiresConfirmation: true
      });

      dag.nodes.push({
        id: 'node_verify_readback',
        capability: 'school.read_ledger',
        input: { studentId },
        dependsOn: ['node_record_payment'],
        riskTier: RiskTier.READ_ONLY
      });

      return dag;
    }

    // C. Default Canonical Intent Mapping
    const def = this.capabilities[nluResult.required_capabilities?.[0]];
    dag.nodes.push({
      id: 'node_single_action',
      capability: nluResult.required_capabilities?.[0] || 'school.general',
      input: nluResult.entities || {},
      dependsOn: [],
      riskTier: def?.riskTier || RiskTier.READ_ONLY
    });

    return dag;
  }
}

export const semanticCapabilityDagPlanner = new SemanticCapabilityDagPlanner();
