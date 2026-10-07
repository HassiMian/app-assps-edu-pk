import { deepseekClient } from './deepseek-client.mjs';
import { liveSchoolSaaSClient } from './live-school-saas-client.mjs';

/**
 * Academic Tools Suite for JARVIS Production
 */
export class AcademicTools {
  /**
   * 1. Generate Daily Diary and sync to School SaaS
   */
  static async generateDiary(params = {}) {
    const className = params.className || params.class || "Eight";
    const diaryDate = params.date || new Date().toISOString().split('T')[0];
    const customNotes = params.notes || "";

    const prompt = `Generate a realistic and rigorous Daily School Diary for Class ${className} at Al Siddique Scholars Public School (ASSPS) for date ${diaryDate}.
Include rows for all primary subjects: English, Urdu, Mathematics, General Science, Islamiyat, and Computer Science.
For each subject specify:
- subject: name of subject
- homework: specific homework task (e.g., Learn Unit 4 Q1-Q3, Solve Ex 3.2 Q5-Q8 on notebook, etc.)
- classwork: summary of what was taught today

Return the result as STRICT JSON with this exact schema:
{
  "school_name": "Al Siddique Scholars Public School",
  "tagline": "Excellence in Education & Character Building",
  "class_name": "${className}",
  "diary_date": "${diaryDate}",
  "slips_per_page": 8,
  "footer_text": "والدین سے گزارش ہے کہ ڈائری روزانہ چیک کر کے دستخط کریں۔",
  "footer_is_urdu": true,
  "rows": [
    { "subject": "English", "classwork": "...", "homework": "..." },
    { "subject": "Urdu", "classwork": "...", "homework": "..." },
    { "subject": "Mathematics", "classwork": "...", "homework": "..." },
    { "subject": "General Science", "classwork": "...", "homework": "..." },
    { "subject": "Islamiyat", "classwork": "...", "homework": "..." },
    { "subject": "Computer Science", "classwork": "...", "homework": "..." }
  ]
}
${customNotes ? `Special instructions: ${customNotes}` : ''}
Do not wrap in markdown or backticks, return ONLY valid JSON.`;

    const aiRes = await deepseekClient.ask(prompt, "You are an expert Academic Coordinator designing daily school diaries.");
    let diaryData = null;

    if (aiRes.ok) {
      try {
        const cleanJson = aiRes.content.replace(/```json\s*|```/g, '').trim();
        diaryData = JSON.parse(cleanJson);
      } catch {
        // Fallback structured diary
        diaryData = this.getDefaultDiary(className, diaryDate);
      }
    } else {
      diaryData = this.getDefaultDiary(className, diaryDate);
    }

    // Attempt to persist to live SaaS backend if endpoint is reachable
    let saasSync = null;
    try {
      saasSync = await liveSchoolSaaSClient.request('daily-diary', {
        method: 'POST',
        body: diaryData
      });
    } catch (e) {
      saasSync = { ok: false, error: e.message };
    }

    return {
      success: true,
      action: "academic.generate_diary",
      className,
      diaryDate,
      diary: diaryData,
      saasSynced: Boolean(saasSync?.ok),
      response: `Sir, Class ${className} ki Daily Diary (${diaryDate}) generate ho chuki hai (${diaryData.rows?.length || 6} subjects included).`
    };
  }

  static getDefaultDiary(className, diaryDate) {
    return {
      school_name: "Al Siddique Scholars Public School",
      tagline: "Excellence in Education & Character Building",
      class_name: className,
      diary_date: diaryDate,
      slips_per_page: 8,
      footer_text: "والدین سے گزارش ہے کہ ڈائری روزانہ چیک کر کے دستخط کریں۔",
      footer_is_urdu: true,
      rows: [
        { subject: "English", classwork: "Unit 3 Comprehension reading and difficult words", homework: "Learn Unit 3 Word/Meanings on notebook" },
        { subject: "Urdu", classwork: "سبق نمبر 4 کی پڑھائی اور مشقی سوالات", homework: "سوال نمبر 1 تا 3 یاد کریں" },
        { subject: "Mathematics", classwork: "Chapter 2 Real Numbers: Exercise 2.1 Q1-Q4 solved on board", homework: "Solve Ex 2.1 Q5 to Q8 on homework notebook" },
        { subject: "General Science", classwork: "Chapter 4: Cell Structure and Plant Tissues explanation", homework: "Draw and label Plant Cell diagram" },
        { subject: "Islamiyat", classwork: "سورۃ الاحزاب ترجمہ و مفہوم", homework: "آیات 1 تا 5 کا ترجمہ یاد کریں" },
        { subject: "Computer Science", classwork: "Chapter 1: Network Devices and Topologies", homework: "Learn definitions of Router, Switch and Hub" }
      ]
    };
  }

  /**
   * 2. Generate Examination Question Paper
   */
  static async generateExamPaper(params = {}) {
    const className = params.className || params.class || "Eight";
    const subject = params.subject || "English";
    const totalMarks = params.totalMarks || 50;
    const term = params.term || "Mid-Term Examination 2026";
    const syllabus = params.syllabus || "Units 1 to 5 as per Punjab Board (PTB) & Single National Curriculum (SNC)";

    const prompt = `You are a Senior Subject Specialist and Board Examination Author.
Generate a comprehensive, high-quality examination paper for:
- School: Al Siddique Scholars Public School (ASSPS)
- Class: ${className}
- Subject: ${subject}
- Total Marks: ${totalMarks}
- Examination: ${term}
- Syllabus: ${syllabus}

Structure the paper professionally into:
1. Section A: Objective / Multiple Choice Questions (MCQs) with 4 options each [A, B, C, D] (10-15 Marks)
2. Section B: Short Answer Questions (Conceptual and analytical) (20-25 Marks)
3. Section C: Long Answer / Descriptive / Practical Questions (15-20 Marks)
For language subjects, include Grammar, Essay/Letter, and Translation exercises.

Return structured Markdown with a clear, beautiful header and bilingual Urdu/English wherever appropriate.`;

    const aiRes = await deepseekClient.ask(prompt, "You are a master examination paper creator adhering strictly to Pakistani educational board standards.");

    return {
      success: true,
      action: "academic.generate_exam_paper",
      className,
      subject,
      totalMarks,
      term,
      paperContent: aiRes.ok ? aiRes.content : this.getDefaultExamPaper({ className, subject, totalMarks, term, syllabus }),
      response: `Sir, Class ${className} (${subject}) ka ${totalMarks} marks ka exam paper tayyar kar diya gaya hai.`
    };
  }

  static getDefaultExamPaper({ className, subject, totalMarks, term, syllabus }) {
    return `# AL SIDDIQUE SCHOLARS PUBLIC SCHOOL

## ${term}

Class: ${className}
Subject: ${subject}
Total Marks: ${totalMarks}
Syllabus: ${syllabus}

### Section A - Objective

1. Choose the correct answer from four options.
2. Fill in the blanks with suitable words.
3. Write true or false against each statement.

### Section B - Short Questions

Answer any five questions in clear sentences. Each answer should include the key concept, one example, and neat presentation.

1. Define the main topic taught in this unit.
2. Explain one important rule or principle from the chapter.
3. Write the difference between two related terms.
4. Give one practical example from daily life.
5. Solve one textbook-style exercise question.

### Section C - Long Questions

Answer any two questions in detail. Use headings, diagrams, steps, or examples wherever suitable.

1. Explain the chapter concept with a labelled example.
2. Write a complete answer showing understanding, application, and conclusion.

Note: This is a deterministic local fallback paper generated because the live AI provider was not available. Human review is required before printing.`;
  }

  /**
   * 3. Generate Comprehensive Lesson Plan
   */
  static async generateLessonPlan(params = {}) {
    const className = params.className || params.class || "Eight";
    const subject = params.subject || "General Science";
    const topic = params.topic || "Cell Division and Mitosis";
    const duration = params.duration || "40 Minutes";

    const prompt = `Create a high-impact, pedagogical Lesson Plan for:
- School: Al Siddique Scholars Public School (ASSPS)
- Class: ${className}
- Subject: ${subject}
- Topic: ${topic}
- Duration: ${duration}

Include:
1. Student Learning Outcomes (SLOs)
2. Required Teaching Aids & Resources
3. Warm-up & Brainstorming (5 mins)
4. Direct Instruction & Concept Delivery (15 mins)
5. Board Work Layout
6. Guided Practice & Class Activity (10 mins)
7. Assessment for Learning / Formative Check (5 mins)
8. Differentiated Homework Assignment (5 mins)

Format cleanly in professional Markdown.`;

    const aiRes = await deepseekClient.ask(prompt, "You are a master teacher trainer and curriculum developer.");

    return {
      success: true,
      action: "academic.generate_lesson_plan",
      className,
      subject,
      topic,
      lessonPlan: aiRes.ok ? aiRes.content : this.getDefaultLessonPlan({ className, subject, topic, duration }),
      response: `Sir, Class ${className} (${subject} - "${topic}") ka complete lesson plan generate kar diya gaya hai.`
    };
  }

  static getDefaultLessonPlan({ className, subject, topic, duration }) {
    return `# Lesson Plan

School: AL SIDDIQUE SCHOLARS PUBLIC SCHOOL
Class: ${className}
Subject: ${subject}
Topic: ${topic}
Duration: ${duration}

## Student Learning Outcomes

- Students will define the key concept in their own words.
- Students will solve or explain one guided example.
- Students will answer a short exit-ticket question independently.

## Teaching Flow

1. Warm-up: ask two prior-knowledge questions.
2. Direct instruction: explain the concept on the board with one clear example.
3. Guided practice: solve one example with the class.
4. Independent practice: students complete a short written task.
5. Assessment: collect responses and identify students needing support.

## Homework

Revise the topic, learn key definitions, and solve the assigned textbook questions.

Note: This is a deterministic local fallback lesson plan generated because the live AI provider was not available.`;
  }
}
