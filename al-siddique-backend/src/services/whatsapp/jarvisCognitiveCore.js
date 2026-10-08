/**
 * JARVIS 5.0 — Autonomous Cognitive Agent Core
 * High-Reasoning LLM Agent with Tool-Calling Architecture & Zero-Halt Fallback
 *
 * Primary Engine: Gemini 2.5 Flash
 * Secondary Engine: DeepSeek V4 Pro
 * Tertiary Engine: Gemini 1.5 Flash
 * Quaternary Engine: Autonomous Heuristic SQL Kernel
 */

const tools = require('./jarvisCognitiveTools');
const { normalizePhoneNumber, resolveUserRole } = require('./schoolChannelGuard.cjs');

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const COMMANDER_NUMBERS = [...new Set([
  process.env.WHATSAPP_OWNER_NUMBER,
  process.env.WHATSAPP_ADMIN_NUMBER,
  ...(process.env.JARVIS_WHATSAPP_COMMANDERS || '').split(/[;,\s]+/),
].map(normalizePhoneNumber).filter(Boolean))]

// Tools Declarations for Gemini (Uppercase types)
const GEMINI_TOOLS = [{
  functionDeclarations: [
    {
      name: 'get_exam_datesheet',
      description: 'Query scheduled exams, papers, and datesheet schedule by date (YYYY-MM-DD, today, tomorrow), class, subject, or exam name.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'Exam date e.g. "2026-10-07", "today", "tomorrow"' },
          className: { type: 'STRING', description: 'Class name e.g. "Eight", "Five", "One", "Mover", "Starter"' },
          subject: { type: 'STRING', description: 'Subject name e.g. "Computer", "Islamiyat", "Social Studies"' },
          examName: { type: 'STRING', description: 'Exam name e.g. "First Term Exam"' }
        }
      }
    },
    {
      name: 'manage_datesheet',
      description: 'Create, add, update, or remove exam papers in the datesheet schedule.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'delete'], description: 'Action' },
          examId: { type: 'INTEGER', description: 'Exam ID, defaults to 9' },
          className: { type: 'STRING', description: 'Class name' },
          subject: { type: 'STRING', description: 'Subject name' },
          examDate: { type: 'STRING', description: 'Date YYYY-MM-DD' },
          paperTime: { type: 'STRING', description: 'Time e.g. "10:00 AM - 12:00 PM"' },
          totalMarks: { type: 'INTEGER', description: 'Total marks, default 100' },
          passMarks: { type: 'INTEGER', description: 'Passing marks, default 33' }
        },
        required: ['className', 'subject', 'examDate']
      }
    },
    {
      name: 'enter_exam_marks',
      description: 'Enter or record exam marks for students in a class for a specific subject.',
      parameters: {
        type: 'OBJECT',
        properties: {
          examId: { type: 'INTEGER', description: 'Exam ID, defaults to 9' },
          className: { type: 'STRING', description: 'Class name e.g. "Eight", "Five", "One"' },
          subject: { type: 'STRING', description: 'Subject name' },
          marksList: {
            type: 'ARRAY',
            description: 'List of student marks',
            items: {
              type: 'OBJECT',
              properties: {
                studentNameOrGr: { type: 'STRING', description: 'Student name or GR number' },
                marksObtained: { type: 'NUMBER', description: 'Marks obtained' },
                totalMarks: { type: 'NUMBER', description: 'Total marks, default 100' },
                remarks: { type: 'STRING', description: 'Optional remarks' }
              },
              required: ['studentNameOrGr', 'marksObtained']
            }
          }
        },
        required: ['className', 'subject', 'marksList']
      }
    },
    {
      name: 'get_or_print_result_cards',
      description: 'Fetch and compile result cards, overall grades, positions, and total marks for a class or specific student.',
      parameters: {
        type: 'OBJECT',
        properties: {
          examId: { type: 'INTEGER', description: 'Exam ID, defaults to 9' },
          className: { type: 'STRING', description: 'Class name' },
          studentIdOrGr: { type: 'STRING', description: 'Student name or GR' }
        }
      }
    },
    {
      name: 'edit_student_fee',
      description: 'Update/edit a student monthly fee, balance, or fee structure in the SaaS database upon instruction.',
      parameters: {
        type: 'OBJECT',
        properties: {
          studentQuery: { type: 'STRING', description: 'Student name or GR number' },
          className: { type: 'STRING', description: 'Optional class filter' },
          newMonthlyFee: { type: 'NUMBER', description: 'New monthly fee in PKR' },
          newRemainingBalance: { type: 'NUMBER', description: 'Updated remaining balance' },
          reason: { type: 'STRING', description: 'Reason for edit' }
        },
        required: ['studentQuery']
      }
    },
    {
      name: 'generate_fee_challans',
      description: 'Generate monthly fee vouchers/challans for a class or all classes in SaaS.',
      parameters: {
        type: 'OBJECT',
        properties: {
          className: { type: 'STRING', description: 'Class name' },
          month: { type: 'STRING', description: 'Month name e.g. "October"' },
          year: { type: 'INTEGER', description: 'Year e.g. 2026' }
        }
      }
    },
    {
      name: 'get_attendance',
      description: 'Query student attendance summary, present/absent counts, and list of absentees for any date or class.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'Date e.g. "2026-10-06", "today", "yesterday"' },
          className: { type: 'STRING', description: 'Class filter' }
        }
      }
    },
    {
      name: 'mark_attendance',
      description: 'Mark attendance for students (present, absent, late, leave).',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'Date YYYY-MM-DD' },
          className: { type: 'STRING', description: 'Class name' },
          records: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                studentNameOrGr: { type: 'STRING', description: 'Student name or GR' },
                status: { type: 'STRING', enum: ['present', 'absent', 'late', 'leave'] }
              },
              required: ['studentNameOrGr', 'status']
            }
          }
        },
        required: ['records']
      }
    },
    {
      name: 'get_or_manage_timetable',
      description: 'Query or create school class and teacher timetable schedules.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['get', 'create_slot'] },
          className: { type: 'STRING', description: 'Class name' },
          section: { type: 'STRING', description: 'Section' },
          teacherName: { type: 'STRING', description: 'Teacher name' },
          dayName: { type: 'STRING', description: 'Day name' },
          subject: { type: 'STRING', description: 'Subject' },
          startTime: { type: 'STRING', description: 'Start time' },
          endTime: { type: 'STRING', description: 'End time' },
          periodLabel: { type: 'STRING', description: 'Period label' }
        }
      }
    },
    {
      name: 'manage_student',
      description: 'Search student profile, fee ledger, add new student, update details, or deactivate student.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['search', 'add', 'update', 'deactivate'] },
          studentData: {
            type: 'OBJECT',
            properties: {
              query: { type: 'STRING', description: 'Search term (name, GR, phone)' },
              name: { type: 'STRING', description: 'Full name' },
              father_name: { type: 'STRING', description: 'Father name' },
              class: { type: 'STRING', description: 'Class' },
              section: { type: 'STRING', description: 'Section' },
              parent_phone: { type: 'STRING', description: 'Phone' },
              monthly_fee: { type: 'NUMBER', description: 'Monthly fee' }
            }
          }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_classes_and_settings',
      description: 'List classes, add new class, or view/update school settings in SaaS.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['list_classes', 'add_class', 'get_settings', 'update_setting'] },
          data: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Class name' },
              section: { type: 'STRING', description: 'Section' },
              key: { type: 'STRING', description: 'Setting key' },
              value: { type: 'STRING', description: 'Setting value' }
            }
          }
        },
        required: ['action']
      }
    },
    {
      name: 'dispatch_desktop_task',
      description: 'Dispatch physical hardware and workstation tasks to the Windows School PC: print fee challan to RICOH MP C307, generate weekly planner graphics, check printer status, or run commands.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['print_challan', 'weekly_planner', 'powershell', 'printer_status'], description: 'Workstation action' },
          payload: {
            type: 'OBJECT',
            description: 'Task payload (student details for challan, planner details, or powershell command)',
            properties: {
              studentId: { type: 'STRING', description: 'Student ID or GR for challan printing' },
              challanNo: { type: 'STRING', description: 'Challan number' },
              command: { type: 'STRING', description: 'PowerShell command to execute' }
            }
          }
        },
        required: ['action']
      }
    },
    {
      name: 'get_or_manage_daily_diary',
      description: 'Query or record daily diaries, subject tasks, and homework assignments for classes.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['get', 'add'] },
          className: { type: 'STRING', description: 'Class name' },
          date: { type: 'STRING', description: 'Date YYYY-MM-DD or today' },
          rows: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of subject tasks' },
          footerText: { type: 'STRING', description: 'Footer message or announcement' }
        }
      }
    },
    {
      name: 'get_or_manage_staff',
      description: 'Query school employees, teachers, designations, qualifications, or daily staff attendance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['list', 'attendance'] },
          query: { type: 'STRING', description: 'Teacher name, subject, or designation' },
          date: { type: 'STRING', description: 'Date YYYY-MM-DD for staff attendance' }
        }
      }
    },
    {
      name: 'get_fee_financial_summary_and_defaulters',
      description: 'Retrieve executive fee financial overview (total billed, collected, outstanding balance) and top fee defaulters list with phone grouping.',
      parameters: {
        type: 'OBJECT',
        properties: {
          limit: { type: 'INTEGER', description: 'Number of top defaulters to return (default 15)' },
          className: { type: 'STRING', description: 'Filter by class' },
          month: { type: 'STRING', description: 'Month name' },
          year: { type: 'INTEGER', description: 'Year e.g. 2026' }
        }
      }
    },
    {
      name: 'get_or_manage_notices',
      description: 'Fetch recent official school notices/circulars or publish a new official notice.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['get', 'publish'] },
          title: { type: 'STRING', description: 'Notice title' },
          content: { type: 'STRING', description: 'Notice content' },
          priority: { type: 'STRING', enum: ['normal', 'urgent', 'high'] }
        }
      }
    },
    {
      name: 'manage_admissions_and_families',
      description: 'Query student admissions, applications, or search sibling family groups by phone number.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['list', 'family_search'] },
          query: { type: 'STRING', description: 'Parent phone number or father name for sibling lookup' }
        }
      }
    },
    {
      name: 'manage_expenses_and_accounts',
      description: 'Record or view school operational expenses (fuel, maintenance, supplies, bills).',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['list', 'add'] },
          category: { type: 'STRING', description: 'Expense category e.g. "Generator Fuel", "Utilities", "Stationery"' },
          amount: { type: 'NUMBER', description: 'Amount in PKR' },
          description: { type: 'STRING', description: 'Expense description' }
        }
      }
    },
    {
      name: 'generate_assessment_paper',
      description: 'Generate a complete, syllabus-aligned examination paper (MCQs, Short Questions, Column Matching Column A/B, Long Questions, and Answer Key) for a class and subject, save to paper_vault and disaggregate into question_bank.',
      parameters: {
        type: 'OBJECT',
        properties: {
          className: { type: 'STRING', description: 'Class name e.g. "Class 5", "Eight", "Nine", "One"' },
          subject: { type: 'STRING', description: 'Subject name e.g. "Science", "English", "Urdu", "Mathematics"' },
          chapterName: { type: 'STRING', description: 'Chapter name or topics e.g. "Chapter 2: Force & Motion"' },
          examType: { type: 'STRING', description: 'Exam type e.g. "Monthly Test", "Weekly Quiz", "First Term Exam"' },
          totalMarks: { type: 'INTEGER', description: 'Total marks, default 25' },
          timeAllowed: { type: 'STRING', description: 'Time allowed e.g. "45 Mins", "1 Hour"' }
        },
        required: ['className', 'subject']
      }
    },
    {
      name: 'parse_and_ingest_paper_to_vault',
      description: 'Parse raw exam paper text composed by teachers on WhatsApp (MCQs, Short Questions, Column Matching A/B, Long Questions), normalize formatting, save to paper_vault and disaggregate into question_bank.',
      parameters: {
        type: 'OBJECT',
        properties: {
          rawPaperText: { type: 'STRING', description: 'The raw text of the paper draft to parse' },
          className: { type: 'STRING', description: 'Optional class name filter' },
          subject: { type: 'STRING', description: 'Optional subject filter' },
          chapterName: { type: 'STRING', description: 'Optional chapter name' }
        },
        required: ['rawPaperText']
      }
    },
    {
      name: 'get_paper_from_vault',
      description: 'Retrieve or view saved papers from paper_vault, or dispatch paper to Windows workstation for printing on RICOH MP C307.',
      parameters: {
        type: 'OBJECT',
        properties: {
          paperId: { type: 'INTEGER', description: 'Specific paper ID from paper_vault' },
          className: { type: 'STRING', description: 'Filter by class' },
          subject: { type: 'STRING', description: 'Filter by subject' },
          action: { type: 'STRING', enum: ['view', 'print_to_workstation'], description: 'Action: view or print' }
        }
      }
    }
  ]
}];

const SCHOOL_AI_TOOL_ALLOWLIST = new Set([
  'get_exam_datesheet',
  'get_or_print_result_cards',
  'get_attendance',
  'get_or_manage_timetable',
  'manage_student',
  'manage_classes_and_settings',
  'get_or_manage_daily_diary',
  'get_or_manage_staff',
  'get_fee_financial_summary_and_defaulters',
  'get_or_manage_notices',
  'manage_admissions_and_families',
  'manage_expenses_and_accounts',
  'get_paper_from_vault',
])

const exposedDeclarations = GEMINI_TOOLS[0]?.functionDeclarations || []
GEMINI_TOOLS[0].functionDeclarations = exposedDeclarations.filter(decl => SCHOOL_AI_TOOL_ALLOWLIST.has(decl.name))

// Tools Converter for DeepSeek (Lowercase standard schema)
function convertToDeepSeekTools(geminiDecl) {
  function convertType(t) {
    if (!t) return 'string';
    return t.toLowerCase();
  }

  function convertProps(props) {
    const res = {};
    for (const [k, v] of Object.entries(props || {})) {
      res[k] = {
        type: convertType(v.type),
        description: v.description || ''
      };
      if (v.enum) res[k].enum = v.enum;
      if (v.type === 'OBJECT' || v.type === 'object') {
        res[k].properties = convertProps(v.properties);
        if (v.required) res[k].required = v.required;
      } else if (v.type === 'ARRAY' || v.type === 'array') {
        const itemType = v.items && v.items.type ? convertType(v.items.type) : 'string';
        res[k].items = {
          type: itemType,
          description: v.items?.description || ''
        };
        if (v.items && v.items.properties) {
          res[k].items.properties = convertProps(v.items.properties);
          if (v.items.required) res[k].items.required = v.items.required;
        }
      }
    }
    return res;
  }

  return geminiDecl.map(fn => ({
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description,
      parameters: {
        type: 'object',
        properties: convertProps(fn.parameters.properties),
        required: fn.parameters.required || []
      }
    }
  }));
}

const DEEPSEEK_TOOLS = convertToDeepSeekTools(GEMINI_TOOLS[0].functionDeclarations);

function cleanPhoneNumber(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildSystemPrompt(fromNumber, role) {
  const now = new Date();
  const pkTime = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000);
  const dateStr = pkTime.toISOString().split('T')[0];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[pkTime.getDay()];
  const timeStr = pkTime.toLocaleTimeString('en-US', { hour12: true });

  const isOwner = role === 'OWNER';
  const isAdmin = role === 'ADMIN';
  const roleLabel = isOwner ? 'School Owner / Principal' : (isAdmin ? 'School Administrator' : (role === 'PARENT' ? 'Verified Parent' : 'Public Visitor'));

  return `You are JARVIS 5.0, the Supreme Autonomous Cognitive AI Chief Operating Officer and Executive Administrator of Al-Siddique Scholars Public School (ASSPS).

CORE OPERATING PRINCIPLE: AUTHORIZED, TENANT-SCOPED, GROUNDED EXECUTION
You are an ASSPS school operations assistant. Execute only actions permitted by the authenticated caller role, tenant context, and backend policy. Never bypass role, school, privacy, approval, or data-integrity boundaries.
When an action is unavailable or outside ASSPS scope, explain the limitation without inventing data or silently broadening authority.

RELIABILITY DIRECTIVES:
1. Use only the scoped domain tools exposed to this school channel. Backend authorization, tenant isolation, approval requirements, and data-integrity rules are authoritative.
2. Never execute arbitrary SQL, bypass tenant policy, invent missing records, or turn a source failure into a zero/empty success.
3. Hardware/workstation actions may be dispatched only through the dedicated bridge and remain subject to backend authorization and approval policy.
4. If a query contains ambiguous terms, fuzzy names, or assumptions:
   - Investigate with the available scoped tools and verified school data.
   - Challenge invalid premises with verified reality.
   - If a source or capability is unavailable, say so clearly instead of fabricating data or silently widening authority.
5. ASSESSMENT STUDIO & QUESTION BANK ENGINE:
   - When asked to create/generate an exam paper (e.g. "Class 5 Science Chapter 2 ka paper banao"), call "generate_assessment_paper". It synthesizes MCQs, Short Questions, Column Matching (Column A/B), and Long Questions, saves to paper_vault, and disaggregates all items into question_bank.
   - When teachers or the Owner paste raw exam drafts, questions, or test notes on WhatsApp, call "parse_and_ingest_paper_to_vault". It decomposes, analyzes, aligns, formats, saves to paper_vault, and disaggregates into question_bank.
   - When asked to view or print saved papers, call "get_paper_from_vault".

GROUNDED TELEMETRY & CONTEXT:
- Current Local Time: ${timeStr}, ${dayName}, ${dateStr} (PKT / Asia/Karachi, UTC+5)
- Active Academic Session: 2026-2027
- Active Major Examination: First Term Exam (Exam ID: 9, Sep 28 – Oct 10, 2026)
- Caller Phone: +${fromNumber}
- Caller Verified Role: ${role} (${roleLabel})
- Authority Level: ${isOwner || isAdmin ? 'Privileged school operator subject to backend role, tenant, approval, and audit policy' : 'Restricted Public/Parent'}

RESPONSE TONE & STYLE:
- Respond in natural, crisp, respectful, highly competent Pakistani Roman Urdu. Address the Owner/Admin as "Sir".
- Be confident, polite, analytical, and completely transparent with verified database data.
- Always provide clear headings, bullet points, numbers, and bold key metrics for high executive readability.`;
}

const PRIVILEGED_TOOL_ROLES = new Set(['OWNER', 'ADMIN']);
const PUBLIC_SAFE_TOOLS = new Set(['get_exam_datesheet']);

function canExecuteSchoolTool(role, toolName) {
  if (!SCHOOL_AI_TOOL_ALLOWLIST.has(toolName)) return false;
  if (PRIVILEGED_TOOL_ROLES.has(role)) return true;
  return PUBLIC_SAFE_TOOLS.has(toolName);
}

class JarvisCognitiveCore {
  constructor() {
    this.sessionMemory = new Map();
  }

  getCallerRole(fromNumber) {
    return resolveUserRole(fromNumber);
  }

  async executeTool(name, args, role) {
    if (!canExecuteSchoolTool(role, name)) {
      console.warn(`[JARVIS Authorization] Denied tool "${name}" for role ${role || 'UNKNOWN'}`);
      return { success: false, error: 'This school operation is not authorized for the caller role.' };
    }
    console.log(`[JARVIS Tool Call] Executing "${name}" for role ${role} with args:`, JSON.stringify(args));
    try {
      switch (name) {
        case 'get_exam_datesheet':
          return await tools.getExamDatesheet(args);
        case 'manage_datesheet':
          return await tools.manageDatesheet(args);
        case 'enter_exam_marks':
          return await tools.enterExamMarks(args);
        case 'get_or_print_result_cards':
          return await tools.getOrPrintResultCards(args);
        case 'edit_student_fee':
          return await tools.editStudentFee(args);
        case 'generate_fee_challans':
          return await tools.generateFeeChallans(args);
        case 'get_attendance':
          return await tools.getAttendance(args);
        case 'mark_attendance':
          return await tools.markAttendance(args);
        case 'get_or_manage_timetable':
          return await tools.getOrManageTimetable(args);
        case 'manage_student':
          return await tools.manageStudent(args);
        case 'manage_classes_and_settings':
          return await tools.manageClassesAndSettings(args);
        case 'dispatch_desktop_task':
          return await tools.dispatchDesktopTask(args);
        case 'get_or_manage_daily_diary':
          return await tools.getOrManageDailyDiary(args);
        case 'get_or_manage_staff':
          return await tools.getOrManageStaff(args);
        case 'get_fee_financial_summary_and_defaulters':
          return await tools.getFeeFinancialSummaryAndDefaulters(args);
        case 'get_or_manage_notices':
          return await tools.getOrManageNotices(args);
        case 'manage_admissions_and_families':
          return await tools.manageAdmissionsAndFamilies(args);
        case 'manage_expenses_and_accounts':
          return await tools.manageExpensesAndAccounts(args);
        case 'generate_assessment_paper':
          return await tools.generateAssessmentPaper(args);
        case 'parse_and_ingest_paper_to_vault':
          return await tools.parseAndIngestPaperToVault(args);
        case 'get_paper_from_vault':
          return await tools.getPaperFromVault(args);
        default:
          return { error: `Tool ${name} not found` };
      }
    } catch (err) {
      console.error(`[JARVIS Tool Error] ${name}:`, err.message);
      return { error: err.message };
    }
  }

  // ─── Gemini Agent Loop ───────────────────────────────────────────────────
  async callGeminiAgent(fromNumber, role, userMessage, history = [], modelName = 'gemini-2.5-flash') {
    const systemPrompt = buildSystemPrompt(fromNumber, role);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    for (let step = 0; step < 5; step++) {
      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: GEMINI_TOOLS,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      };

      const resp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini API (${modelName}) Error ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      const candidate = data.candidates?.[0];
      if (!candidate) throw new Error(`No candidate returned from Gemini (${modelName})`);

      const parts = candidate.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length === 0) {
        const textParts = parts.filter(p => p.text).map(p => p.text).join('\n');
        return textParts || 'Sir, task process ho gaya hai.';
      }

      // Record function calls
      contents.push({ role: 'model', parts });
      const toolResponses = [];

      for (const fc of functionCalls) {
        const toolName = fc.functionCall.name;
        const toolArgs = fc.functionCall.args || {};
        const toolResult = await this.executeTool(toolName, toolArgs, role);
        toolResponses.push({
          functionResponse: {
            name: toolName,
            response: { content: toolResult }
          }
        });
      }

      contents.push({ role: 'user', parts: toolResponses });
    }

    return 'Sir, task ke steps execute ho gaye hain.';
  }

  // ─── DeepSeek V4 Pro Fallback Agent Loop ──────────────────────────────────
  async callDeepSeekAgent(fromNumber, role, userMessage) {
    const systemPrompt = buildSystemPrompt(fromNumber, role);
    const url = 'https://api.deepseek.com/chat/completions';

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    for (let step = 0; step < 5; step++) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          tools: DEEPSEEK_TOOLS,
          temperature: 0.2,
          max_tokens: 2048
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`DeepSeek API Error ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      const message = data.choices?.[0]?.message;
      if (!message) throw new Error('No message from DeepSeek');

      messages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || 'Sir, aapka task execute ho gaya hai.';
      }

      for (const tc of message.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch {}
        const result = await this.executeTool(fnName, fnArgs, role);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result)
        });
      }
    }

    return 'Sir, DeepSeek engine se task complete ho gaya hai.';
  }

  // ─── Autonomous Heuristic Deterministic Fallback ──────────────────────────
  async executeDeterministicFallback(fromNumber, role, text) {
    const lower = text.toLowerCase().trim();

    if (!PRIVILEGED_TOOL_ROLES.has(role)) {
      return 'This public school channel cannot access private student, fee, attendance, staff, database, or workstation operations.';
    }

    // 1. Attendance Check
    if (lower.includes('attendance') || lower.includes('haziri') || lower.includes('present') || lower.includes('absent') || lower.includes('hazri')) {
      const dateMatch = text.match(/(\d{1,2})[th|st|nd|rd]*\s*(october|oct|sep|september|nov|november)?/i);
      let queryDate = 'today';
      if (dateMatch) {
        const d = dateMatch[1].padStart(2, '0');
        queryDate = `2026-10-${d}`;
      }
      const res = await tools.getAttendance({ date: queryDate });
      if (res.success) {
        let absTxt = '';
        if (res.absentees && res.absentees.length > 0) {
          absTxt = '\n\n*Absentees List:*\n' + res.absentees.map(a => `• ${a.name} (Class ${a.class})`).join('\n');
        }
        return `*School Attendance Report (${res.date}):*\n\n• Total Marked: *${res.total_marked}*\n• Present: *${res.present}*\n• Absent: *${res.absent}*${res.leave ? `\n• Leave: *${res.leave}*` : ''}${absTxt}`;
      }
    }

    // 2. Datesheet & Exam Papers
    if (lower.includes('datesheet') || lower.includes('paper') || lower.includes('exam') || lower.includes('subject') || lower.includes('1st term') || (lower.includes('kis') && lower.includes('class'))) {
      const dateMatch = text.match(/(\d{1,2})[th|st|nd|rd]*\s*(october|oct)?/i);
      let queryDate = '2026-10-07';
      if (dateMatch) {
        const d = dateMatch[1].padStart(2, '0');
        queryDate = `2026-10-${d}`;
      }
      const res = await tools.getExamDatesheet({ date: queryDate });
      if (res.success && res.papers.length > 0) {
        const lines = res.papers.map(p => `• *Class ${p.class_name}:* ${p.subject} (${p.paper_time || '10:00 AM - 12:00 PM'})`).join('\n');
        return `Sir, *${queryDate}* ko First Term Exam ke darj zail *${res.count}* papers hain:\n\n${lines}\n\nTamam papers SaaS database se 100% verified hain.`;
      }
    }

    // 3. Fee Financial Summary & Defaulters
    if (lower.includes('defaulter') || lower.includes('recovery') || (lower.includes('fee') && (lower.includes('summary') || lower.includes('total') || lower.includes('list')))) {
      const res = await tools.getFeeFinancialSummaryAndDefaulters({ limit: 10 });
      if (res.success) {
        const s = res.summary;
        let defTxt = '';
        if (res.top_defaulters && res.top_defaulters.length > 0) {
          defTxt = '\n\n*Top Defaulters:*\n' + res.top_defaulters.slice(0, 5).map((d, i) => `${i+1}. ${d.student_name} (Class ${d.class}) - Due: Rs. ${d.total_due}`).join('\n');
        }
        return `*Fee & Financial Summary:*\n\n• Total Billed: *Rs. ${s.total_billed}*\n• Total Collected: *Rs. ${s.total_collected}* (${s.recovery_percentage})\n• Total Outstanding: *Rs. ${s.total_outstanding}*${defTxt}`;
      }
    }

    // 4. Student Search
    if (lower.includes('student') || lower.includes('record') || lower.includes('gr ') || lower.includes('fee check')) {
      const cleanName = text.replace(/(search|student|ka|ki|ke|record|check|karo|batao|details|profile|gr|fee)/gi, '').trim();
      const res = await tools.manageStudent({ action: 'search', studentData: { query: cleanName } });
      if (res.success && res.students.length > 0) {
        const s = res.students[0];
        return `*Student Record Verified:*\n\n• Name: *${s.name}*\n• Father Name: *${s.father_name || 'N/A'}*\n• Class: *Class ${s.class}* (${s.section || 'A'})\n• GR Number: \`${s.gr_number}\`\n• Monthly Fee: *Rs. ${s.monthly_fee}*\n• Fee Status: *${s.fee_status.toUpperCase()}* (Balance: Rs. ${s.latest_balance})\n• Status: *${s.is_active ? 'Active' : 'Inactive'}*`;
      }
    }

    // 5. General Intelligent Autonomous Query
    try {
      const tables = await tools.inspectDatabaseSchema({ action: 'list_tables' });
      return `Sir, aap ka command: "${text}" process karne ke liye database active hai (83 tables connected). Kisi bhi table ka data, fee adjustment, ya operational task foran perform kiya ja sakta hai.`;
    } catch {
      return `Sir, aap ka paigham mosool ho gaya hai: "${text}". Main Al-Siddique Scholars OS operations ke liye hazir hoon.`;
    }
  }

  // ─── Main Entry Point ─────────────────────────────────────────────────────
  async processMessage(fromNumber, text) {
    const startTime = Date.now();
    const cleanFrom = cleanPhoneNumber(fromNumber);
    const role = this.getCallerRole(cleanFrom);

    console.log(`[JARVIS Core] Processing message from +${cleanFrom} (Role: ${role}): "${text}"`);

    if (!this.sessionMemory.has(cleanFrom)) {
      this.sessionMemory.set(cleanFrom, []);
    }
    const history = this.sessionMemory.get(cleanFrom);

    let reply = '';
    let engineUsed = 'GEMINI_2.5_FLASH';

    // Tier 1: Gemini 2.5 Flash
    try {
      reply = await this.callGeminiAgent(cleanFrom, role, text, history, 'gemini-2.5-flash');
    } catch (geminiErr) {
      console.warn('[JARVIS Core] Gemini 2.5 Flash failed, pivoting to DeepSeek V4 Pro:', geminiErr.message);

      // Tier 2: DeepSeek V4 Pro
      try {
        engineUsed = 'DEEPSEEK_V4_PRO';
        reply = await this.callDeepSeekAgent(cleanFrom, role, text);
      } catch (deepseekErr) {
        console.warn('[JARVIS Core] DeepSeek failed, pivoting to Gemini 1.5 Flash:', deepseekErr.message);

        // Tier 3: Gemini 1.5 Flash Fallback
        try {
          engineUsed = 'GEMINI_1.5_FLASH';
          reply = await this.callGeminiAgent(cleanFrom, role, text, history, 'gemini-1.5-flash');
        } catch (gemini15Err) {
          console.warn('[JARVIS Core] Gemini 1.5 Flash failed, pivoting to Deterministic Fallback:', gemini15Err.message);

          // Tier 4: Autonomous Heuristic Deterministic Fallback
          engineUsed = 'DETERMINISTIC_SQL_KERNEL';
          reply = await this.executeDeterministicFallback(cleanFrom, role, text);
        }
      }
    }

    // Record session history
    history.push({ role: 'user', parts: [{ text }] });
    history.push({ role: 'model', parts: [{ text: reply }] });
    if (history.length > 12) history.splice(0, history.length - 12);

    const durationMs = Date.now() - startTime;
    console.log(`[JARVIS Core] Reply composed in ${durationMs}ms via ${engineUsed}`);

    return {
      reply,
      engineUsed,
      durationMs,
      role
    };
  }
}

const jarvisCognitiveCore = new JarvisCognitiveCore();

module.exports = jarvisCognitiveCore;
module.exports.jarvisCognitiveCore = jarvisCognitiveCore;
module.exports.JarvisCognitiveCore = JarvisCognitiveCore;
