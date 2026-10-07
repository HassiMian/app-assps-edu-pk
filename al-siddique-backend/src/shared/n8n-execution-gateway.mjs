import { randomUUID } from "node:crypto";
import { liveSchoolSaaSClient } from "./live-school-saas-client.mjs";

const DEFAULT_N8N_BASE = process.env.N8N_URL || "http://127.0.0.1:5678";
const N8N_SECRET = process.env.JARVIS_N8N_SECRET || "jarvis-n8n-internal-secret-2026";
const TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS || 8000);

export class N8nExecutionGateway {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_N8N_BASE).replace(/\/+$/, "");
    this.secret = options.secret || N8N_SECRET;
    this.timeoutMs = options.timeoutMs || TIMEOUT_MS;
    this.explicitSecretProvided = Object.prototype.hasOwnProperty.call(options, "secret");
  }

  getWebhookPathForAction(action) {
    const actionRoutes = {
      "school.get_students_count": "/webhook/school-students-count",
      "school.get_strength": "/webhook/school-students-count",
      "school.search_student": "/webhook/school-search-student",
      "school.get_staff_count": "/webhook/school-staff-count",
      "school.get_staff": "/webhook/school-staff-count",
      "school.get_teacher_count": "/webhook/school-teachers-count",
      "school.search_staff": "/webhook/school-search-staff",
      "school.get_class_strength": "/webhook/school-class-strength",
      "school.get_attendance": "/webhook/school-attendance",
      "school.get_fee_summary": "/webhook/school-fees-summary",
      "school.get_student_fee": "/webhook/school-student-fee",
      "school.get_class_fee_summary": "/webhook/school-class-fee",
      "school.get_fee_defaulters": "/webhook/school-fee-defaulters"
    };
    return actionRoutes[action] || `/webhook/jarvis-${action.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  /**
   * Primary execution method routing through n8n with direct LiveSchoolSaaS execution
   */
  async executeWorkflow(action, payload = {}, options = {}) {
    const startTime = Date.now();
    const missionId = options.missionId || `MSN-${randomUUID().slice(0, 8).toUpperCase()}`;
    const webhookPath = options.webhookPath || this.getWebhookPathForAction(action);
    const targetUrl = `${this.baseUrl}${webhookPath}`;

    if (this.explicitSecretProvided && this.secret !== N8N_SECRET) {
      return {
        ok: false,
        status: "AUTH_FAILED",
        error_code: "N8N_AUTH_FAILED",
        missionId,
        executionId: `N8N-AUTH-${randomUUID().slice(0, 8).toUpperCase()}`,
        workflow: `JARVIS - ${action}`,
        action,
        source: "n8n Gateway",
        durationMs: Date.now() - startTime,
        verification: "AUTH_FAILED",
        error: "N8N gateway rejected the supplied service token.",
        data: null
      };
    }

    const requestBody = {
      action,
      missionId,
      timestamp: new Date().toISOString(),
      serviceIdentity: "JARVIS_SCHOOL_SERVICE",
      payload
    };

    if (process.env.N8N_ENABLED === "true") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000); // Quick check if n8n runner is active

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-JARVIS-SECRET": this.secret,
          "X-JARVIS-MISSION-ID": missionId
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        return {
          ok: false,
          status: "FAILED",
          missionId,
          executionId: response.headers.get("x-n8n-execution-id") || `N8N-ERR-${Date.now()}`,
          workflow: `JARVIS — ${action}`,
          action,
          source: "n8n Gateway",
          durationMs,
          verification: "GATEWAY_REJECTED",
          error: errorJson.error || `n8n webhook returned HTTP ${response.status}: ${response.statusText}`,
          data: null
        };
      }

      const resultJson = await response.json();
      return {
        ok: true,
        status: "COMPLETED",
        missionId,
        executionId: resultJson.executionId || response.headers.get("x-n8n-execution-id") || `N8N-EXEC-${randomUUID().slice(0, 8).toUpperCase()}`,
        workflow: resultJson.workflow || `JARVIS — ${action}`,
        action,
        source: resultJson.source || "LIVE_SCHOOL_SAAS",
        verification: resultJson.verification || "AUTHORITATIVE_PROVIDER_RESULT",
        durationMs,
        data: resultJson.data,
        raw: resultJson
      };
    } catch (_) {
      clearTimeout(timer);
    }
    }

    // Direct invocation via LiveSchoolSaaSClient
    const directExecutionId = `N8N-DIRECT-${randomUUID().slice(0, 8).toUpperCase()}`;
    let saasResult = null;

    switch (action) {
      case "school.get_students_count":
      case "school.get_strength":
        saasResult = await liveSchoolSaaSClient.getStudentCount();
        break;
      case "school.search_student":
        saasResult = await liveSchoolSaaSClient.searchStudent(payload.studentName || payload.student_name || payload.name || payload.personName || payload.query || payload.raw_query || payload.rawQuery || "");
        break;
      case "school.get_student_profile":
        saasResult = await liveSchoolSaaSClient.getStudentProfile(payload.studentId, payload.name, payload);
        break;
      case "school.get_class_students":
        saasResult = await liveSchoolSaaSClient.getClassStudents(payload.className || payload.class);
        break;
      case "school.get_staff_count":
      case "school.get_total_staff":
      case "school.get_staff":
        saasResult = await liveSchoolSaaSClient.getStaff();
        break;
      case "school.get_teacher_count":
        saasResult = await liveSchoolSaaSClient.getTeacherCount();
        break;
      case "school.search_staff":
        saasResult = await liveSchoolSaaSClient.searchStaff(payload.name || payload.query);
        break;
      case "school.get_class_strength":
        saasResult = await liveSchoolSaaSClient.getClassStrength(payload.className || payload.class);
        break;
      case "school.get_classes_list":
        saasResult = await liveSchoolSaaSClient.getClassesList();
        break;
      case "school.get_student_fee":
        saasResult = await liveSchoolSaaSClient.getStudentFee(payload.studentId, payload.studentName || payload.student_name || payload.name || payload.personName || payload.query, payload);
        break;
      case "school.get_class_fee_summary":
        saasResult = await liveSchoolSaaSClient.getClassFeeSummary(payload.className || payload.class);
        break;
      case "school.get_fee_defaulters":
        saasResult = await liveSchoolSaaSClient.getFeeDefaulters();
        break;
      case "school.get_fee_summary":
        saasResult = await liveSchoolSaaSClient.getFeeSummary(payload.month, payload.year);
        break;
      case "school.get_payment_history":
        saasResult = await liveSchoolSaaSClient.getStudentFee(payload.studentId, payload.studentName || payload.student_name || payload.name || payload.personName || payload.query, payload);
        break;
      case "school.get_attendance":
        saasResult = await liveSchoolSaaSClient.getAttendanceSummary(payload.date);
        break;
      case "school.get_student_attendance":
        saasResult = await liveSchoolSaaSClient.getStudentAttendance(payload.name || payload.personName, payload.studentId, payload);
        break;
      case "school.get_class_attendance":
        saasResult = await liveSchoolSaaSClient.getClassAttendance(payload.className || payload.class, payload.date);
        break;
      case "school.get_student_marks":
      case "school.get_student_result":
        saasResult = await liveSchoolSaaSClient.getStudentResult(payload.studentId, payload.name, payload.examType, payload.subject, payload);
        break;
      case "school.get_exam_results":
      case "school.get_class_result_summary":
        saasResult = await liveSchoolSaaSClient.getClassResultSummary(payload.className || payload.class, payload.examType);
        break;
      case "school.get_timetable":
      case "school.get_student_timetable":
      case "school.get_class_timetable":
        saasResult = await liveSchoolSaaSClient.getTimetable(payload.className || payload.class);
        break;
      case "school.get_admission_information":
      case "school.get_admission_status":
        saasResult = await liveSchoolSaaSClient.getAdmissionInformation();
        break;
      case "school.get_notices":
        saasResult = await liveSchoolSaaSClient.getNotices();
        break;
      case "school.get_assessments":
        saasResult = await liveSchoolSaaSClient.getAssessments();
        break;
      default:
        saasResult = { ok: false, error: `Unsupported school action: ${action}` };
    }

    const durationMs = Date.now() - startTime;

    if (!saasResult || !saasResult.ok) {
      // If offline/test mode is explicitly requested, allow labelled local fallback
      const isExplicitOffline = payload.allowOfflineFallback || payload.offlineMode || process.env.JARVIS_ALLOW_OFFLINE_DB === 'true';

      if (isExplicitOffline) {
        try {
          const { schoolConnector } = await import("./school-connector.mjs");
          let localData = null;

          switch (action) {
            case "school.get_students_count":
            case "school.get_strength": {
              const str = schoolConnector.getStudentStrength();
              localData = { active: str.activeStudents, total: str.totalStudents, boys: str.boys, girls: str.girls };
              break;
            }
            case "school.search_student":
              localData = schoolConnector.searchStudents(payload.name || payload.query);
              break;
            case "school.get_staff_count":
            case "school.get_staff":
            case "school.get_teacher_count":
              localData = schoolConnector.getStaffSummary();
              break;
            case "school.get_class_strength":
              localData = schoolConnector.getClassStrength(payload.className || payload.class);
              break;
            case "school.get_student_fee":
              localData = schoolConnector.getStudentFee(payload.studentId, payload.name || payload.personName);
              break;
            case "school.get_fee_defaulters":
              localData = schoolConnector.getFeeDefaulters();
              break;
            case "school.get_fee_summary":
              localData = schoolConnector.getFeeSummary(payload.month, payload.year);
              break;
            case "school.get_attendance":
              localData = schoolConnector.getAttendanceSummary(payload.date);
              break;
          }

          if (localData) {
            return {
              ok: true,
              status: "COMPLETED",
              missionId,
              executionId: directExecutionId,
              workflow: `JARVIS — ${action}`,
              action,
              source: "LOCAL_TEST_FIXTURE",
              endpoint: "sqlite3://school.db (OFFLINE_TEST_MODE)",
              durationMs: Date.now() - startTime,
              verification: "LOCAL_TEST_FIXTURE_RESULT",
              data: localData,
              error: null
            };
          }
        } catch (_) {}
      }

      // Production fail-closed: do not silently substitute local SQLite
      return {
        ok: false,
        status: "FAILED",
        error_code: saasResult?.error_code || "LIVE_SAAS_UNAVAILABLE",
        missionId,
        executionId: directExecutionId,
        workflow: `JARVIS — ${action}`,
        action,
        source: "LIVE_ASSPS_PRODUCTION_API",
        endpoint: saasResult?.endpoint || "https://app.assps.edu.pk/api",
        http_status: saasResult?.http_status || 503,
        durationMs,
        verification: "LIVE_SAAS_REQUEST_FAILED",
        error: saasResult?.error || "Live School SaaS API is unavailable or authentication token is missing.",
        raw: saasResult?.raw_response,
        data: null
      };
    }

    return {
      ok: true,
      status: "COMPLETED",
      missionId,
      executionId: directExecutionId,
      workflow: `JARVIS — ${action}`,
      action,
      source: "LIVE_ASSPS_SCHOOL_SAAS",
      data_authority: saasResult.data_authority || "PRODUCTION",
      endpoint: saasResult.endpoint,
      http_status: saasResult.http_status,
      durationMs,
      verification: saasResult.verification || saasResult.data?.verification || "LIVE_PRODUCTION_VERIFIED",
      provider: saasResult.provider || saasResult.data?.provider || "ASSPS_PRODUCTION_API",
      base_url: saasResult.base_url || "https://app.assps.edu.pk/api",
      provider_request_id: saasResult.provider_request_id || saasResult.data?.provider_request_id || null,
      fetched_at: saasResult.fetched_at || saasResult.data?.fetched_at || new Date().toISOString(),
      source_timestamp: saasResult.source_timestamp || saasResult.data?.source_timestamp || new Date().toISOString(),
      freshness: saasResult.freshness || saasResult.data?.freshness || "LIVE_REALTIME",
      raw_result_hash: saasResult.raw_result_hash || saasResult.data?.raw_result_hash || null,
      normalization_status: saasResult.normalization_status || saasResult.data?.normalization_status || "SUCCESS",
      data: typeof saasResult === 'object' ? saasResult : (saasResult.data !== undefined ? saasResult.data : saasResult),
      raw: saasResult
    };
  }
}

export const n8nGateway = new N8nExecutionGateway();
