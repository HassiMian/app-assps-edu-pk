# AL SIDDIQUE SCHOLARS PUBLIC SCHOOL (ASSPS)
## OFFICIAL INSTITUTIONAL EXAMINATION & ASSESSMENT POLICY
### Academic Session 2026–2027

**Document Identification:** `ASSPS-POL-EXAM-2026-V1.0`  
**Effective Date:** 13 October 2026  
**Governing Authority:** Academic Council & Office of the Principal, ASSPS, Rayya Khas, Narowal  
**Principal & Approving Authority:** Muhammad Haseeb Arshad (Employee ID: `EMP-0001`, User ID: `2373`)  
**Regulatory Alignment:** Punjab Education Curriculum, Training and Assessment Authority (PECTAA), Board of Intermediate and Secondary Education (BISE) Gujranwala, Punjab School Education Department (SED).

---

## 1. Statutory Alignment & Regulatory Hierarchy

1.1. **Regulatory Frameworks:**
- **Pre-Primary & Primary / Elementary (Starter to Class 8):** Governed by PECTAA School-Based Assessment (SBA) guidelines, emphasizing formative assessment for Early Years (Starter, Mover, Flyer) and balanced cognitive domains (Knowledge, Comprehension, Application) for Classes 1–8.
- **Secondary Classes (Classes IX & X):** Governed strictly by BISE Gujranwala SSC (Secondary School Certificate) regulations. Board examinations, paper patterns, practical requirements, and grading structures follow BISE statutory syllabi.
- **Institutional Autonomy:** Distinguishes legally binding government mandates (such as PECTAA curriculum standards and BISE matriculation regulations) from internal private school academic enhancements (such as Early Years Nazra/Oral assessments, bilingual paper presentation, and computerized result card issuance via SaaS Core / APEX Connect).

---

## 2. Institutional Examination Structure & Workflows

2.1. **Academic Terms & Assessments:**
- **Term 1 (First Term Examination - Official Exam ID 9):** Evaluates syllabus covered from commencement of academic year (April / August) to October.
- **Term 2 (Mid Term / Half-Yearly Examination):** Evaluates cumulative syllabus through December.
- **Term 3 (Final Term / Annual Examination):** Evaluates cumulative academic progress for promotion to next grade.
- **Formative Class Tests & Monthly Reviews:** Routine continuous assessments recorded for internal monitoring but isolated from formal term marks without explicit Principal authorization.

2.2. **Examination Formats by Tier:**
- **Tier 1: Pre-Primary / Early Years (Starter, Mover, Flyer):**
  - Dual format: Oral Assessment (25 Marks) + Written Assessment (50 Marks).
  - Oral assessments evaluate phonics, recitation, visual recognition, and spoken interaction.
  - Written assessments evaluate motor control, letter tracing, basic arithmetic, and drawing.
- **Tier 2: Primary & Middle (Classes 1 to 8):**
  - Summative written papers (100 Marks for core subjects: English, Urdu, Mathematics, Science, Social Studies).
  - Specialized subjects: Islamiyat (100 Marks), Quran / Nazra (50 Marks), Computer / IT (100 Marks / 50 Theory + 50 Practical where scheduled).
- **Tier 3: Secondary (Classes IX & X):**
  - BISE Gujranwala Matriculation scheme: Science Group (Physics, Chemistry, Biology / Computer Science, Mathematics, English, Urdu, Islamiyat, Pakistan Studies, Tarjuma-tul-Quran).
  - Theoretical paper totals follow board limits (e.g. 60 or 75 marks) with distinct practical marks.

---

## 3. Canonical Subject Maxima & Passing Criteria

3.1. **Mandatory Maximum Marks Rule:**
- The general examination header default of 100 marks must **never** be applied blindly to all subjects.
- Every paper must possess an approved maximum registered under `exam_subjects` matching its pedagogical format:

| Class Cohort | Subject | Format | Total Marks | Passing Marks | Passing % |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Starter (Blue)** | English Written | Written | **50** | 20 | 40% |
| **Starter (Blue)** | English Oral | Oral | **25** | 10 | 40% |
| **Starter (Blue)** | Mathematics Written | Written | **50** | 20 | 40% |
| **Starter (Blue)** | Mathematics Oral | Oral | **25** | 10 | 40% |
| **Starter (Blue)** | Urdu Written | Written | **50** | 20 | 40% |
| **Starter (Blue)** | Urdu Oral | Oral | **25** | 10 | 40% |
| **Starter (Blue)** | General Knowledge Oral | Oral | **25** | 10 | 40% |
| **Mover (Purple)** | English Written | Written | **50** | 20 | 40% |
| **Mover (Purple)** | English Oral | Oral | **25** | 10 | 40% |
| **Mover (Purple)** | Mathematics Written | Written | **50** | 20 | 40% |
| **Mover (Purple)** | Mathematics Oral | Oral | **25** | 10 | 40% |
| **Mover (Purple)** | Urdu Written | Written | **50** | 20 | 40% |
| **Mover (Purple)** | Urdu Oral | Oral | **25** | 10 | 40% |
| **Mover (Purple)** | General Knowledge Oral | Oral | **25** | 10 | 40% |
| **Flyer (Pink)** | English Written | Written | **50** | 20 | 40% |
| **Flyer (Pink)** | English Oral | Oral | **25** | 10 | 40% |
| **Flyer (Pink)** | Mathematics Written | Written | **50** | 20 | 40% |
| **Flyer (Pink)** | Mathematics Oral | Oral | **25** | 10 | 40% |
| **Flyer (Pink)** | Urdu Written | Written | **50** | 20 | 40% |
| **Flyer (Pink)** | Urdu Oral | Oral | **25** | 10 | 40% |
| **Flyer (Pink)** | General Knowledge Oral | Oral | **25** | 10 | 40% |
| **Classes 1–8** | English, Math, Urdu, Science, S.St | Written | **100** | 40 | 40% |
| **Classes 1–8** | Islamiyat | Written | **100** | 40 | 40% |
| **Classes 1–8** | Quran / Nazra | Oral / Recitation | **50** | 20 | 40% |
| **Classes 1–8** | Computer | Theory / Practical | **100** | 40 | 40% |

3.2. **Resolution of Historical Exam 9 Anomaly:**
- Historical First Term Exam ID 9 records contain instances where 50-mark written papers and 25-mark oral assessments were stored against an assumed `total_marks = 100`.
- Under this policy, no result may be graded against an unapproved maximum. All Exam ID 9 subject records must be re-evaluated against the authentic paper maxima defined above, rectifying artificial 'F' grades caused by denominator mismatch.

---

## 4. Mandatory Result-Status Architecture & Absence Protocol

4.1. **Strict Result Status Definitions:**
To ensure unambiguous academic records, every examination entry must carry one of four strictly typed statuses:

| Status Code | Stored Numeric Mark | Result Card Display | Academic Impact | Authority Required |
| :---: | :---: | :---: | :--- | :--- |
| **`SCORED`** | Valid Number ($0 \le \text{mark} \le \text{total}$) | Numeric score (e.g., `45`, including genuine `0`) | Included in total and percentage | Subject Teacher |
| **`ABSENT`** | `NULL` | **`AB — Absent`** | Zero marks for position calculation; grade withheld if aggregate incomplete | Subject Teacher / Invigilator |
| **`PENDING`** | `NULL` | **`Pending`** | Withholds aggregate grade and position until resolved | Academic Coordinator |
| **`EXCUSED`** | `NULL` | **`EX — Approved Deferred`** | Excluded from denominator or slated for approved re-exam | Principal **ONLY** |

4.2. **Zero vs. Absent Protection Rules:**
- **Rule 1 (No Coercion):** Under no circumstances shall an absent, missing, or blank mark be silently converted into `0`.
- **Rule 2 (Genuine Zero):** A numeric score of `0` represents an evaluated paper where the student obtained zero marks. It carries status `SCORED`.
- **Rule 3 (Independence from Daily Attendance):** Examination absence must be explicitly recorded during the examination session. The system must **never** infer examination absence automatically from general school gate attendance or morning roll call.
- **Rule 4 (Incomplete Result Safeguard):** For any student with an `ABSENT`, `PENDING`, or `EXCUSED` subject, final overall grade, percentage-based ranking, and merit position are **strictly withheld** until authorized completion or moderation.

4.3. **Medical & Deferred Assessment Policy:**
- A student unable to appear due to verified medical illness or bereavement must submit an official application within 48 hours of the scheduled exam.
- The Principal alone has authority to assign `EXCUSED` status.
- A deferred examination must be scheduled within 10 school days of student return. Upon re-examination, status updates from `EXCUSED` to `SCORED` with audit logging.

---

## 5. Grading Bands & Promotion Rules

5.1. **Institutional Grading Scale:**

| Percentage Range | Grade | Descriptor | Promotion Impact |
| :---: | :---: | :--- | :--- |
| **90.00% – 100.00%** | **A+** | Exceptional / Outstanding | Promoted with Distinction |
| **80.00% – 89.99%** | **A** | Excellent | Promoted |
| **70.00% – 79.99%** | **B** | Very Good | Promoted |
| **60.00% – 69.99%** | **C** | Good / Satisfactory | Promoted |
| **50.00% – 59.99%** | **D** | Fair / Needs Improvement | Conditional Promotion / Academic Warning |
| **0.00% – 49.99%** | **F** | Fail / Unsatisfactory | Retained / Mandatory Summer Remediation |

5.2. **Promotion & Position Calculations:**
- Aggregate percentage is calculated strictly as:
  $$\text{Percentage} = \frac{\sum \text{Marks Obtained in Scored Subjects}}{\sum \text{Total Marks of Prescribed Subjects}} \times 100$$
- Merit positions (1st, 2nd, 3rd) are awarded per class section only when all prescribed subjects have status `SCORED`. Ties in total marks share the rank.

---

## 6. Access Control, Moderation & Audit History

6.1. **Separation of Duties:**
- **Subject Teachers:** Possess restricted access via APEX Connect (`api.assps.edu.pk/teacher`) to enter marks only for their officially assigned classes, sections, and subjects. Teachers have zero access to create exams, delete exams, or alter school configuration.
- **Academic Reviewers / Coordinators:** Verify marks completeness, review borderline cases, and recommend moderation.
- **Principal:** Sole authority to approve subject offerings, authorize `EXCUSED` status, moderate marks, and publish official term result cards.

6.2. **Marks Moderation & Immutable Audit Ledger:**
- Once marks are saved, modifications require a formal revision request stating the pedagogical justification (e.g., recounting error, unentered practical).
- All changes are recorded with previous mark, new mark, amending user ID, timestamp, and revision sequence. Historical snapshots remain permanently accessible.

---

## 7. Bilingual Printing, Accessibility & Record Retention

7.1. **Bilingual Typography & RTL Standards:**
- All official examination papers and result cards must support bilingual English and Urdu typography.
- Urdu Nastaleeq text must render using authentic **Jameel Noori Nastaleeq** with correct right-to-left (RTL) baseline alignment.
- Mathematical equations, Arabic Quranic verses, and English terminology must retain clear visual fidelity across standard A4 and A5 printable formats.

7.2. **Document Retention:**
- Physical answer scripts must be securely stored for a minimum of 12 months following examination publication.
- Master digitized academic records, result card PDFs, and audit logs must be permanently archived in SaaS Core storage with continuous automated backups.

---

## 8. Version Control & Institutional Attestation

| Revision | Date | Author / Role | Changes / Description | Approval State |
| :---: | :---: | :--- | :--- | :---: |
| **1.0** | 13 Oct 2026 | Muhammad Haseeb Arshad (Principal, `EMP-0001`) | Canonical baseline formulated for 2026–27 session, resolving Exam 9 paper maxima and result-status semantics. | **APPROVED & ADOPTED** |

**Attested by:**  
*Muhammad Haseeb Arshad*  
Principal, Al Siddique Scholars Public School (ASSPS)  
Sharif Chowk, Rayya Khas, Narowal
