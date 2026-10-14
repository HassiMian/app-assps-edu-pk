# ASSPS Grade IX Computer Science — twelve independently authored long-answer drafts

**Provisional original research answers only. Not subject verified, school-source verified, approved or Paper Studio selectable.**

Existing source: 60 original provisional questions including 12 grading-only long answers. This separate packet contains 12 new explanatory proposals and 60 separate marking-point proposals. Source SHA: `1e685088636d6124c5ce9f6dffc3d480defc54dbfff001c8425b4da3b896d52a`.

### IX-COMP-U01-L01 — Chapter 1: system interaction

A computer performs a task through cooperation among input devices, working memory, the processor, persistent storage and output devices. An input device supplies a command or data, for example a keyboard entering a name. The operating system and program place relevant instructions and data in working memory. The CPU processes instructions using a repeated fetch, decode and execute cycle, performing calculations or controlling transfers. If the result needs to be kept for later, it can be saved to persistent storage rather than remaining only in volatile memory. An output device such as a monitor displays the result. Each component has a different role, but the task succeeds through coordinated data flow.

**Separate proposed five-point marking criteria:** Input supplies data and commands · RAM holds active data and instructions · CPU executes instructions and operations · Storage preserves information for later · Output communicates processed results

### IX-COMP-U02-L01 — Chapter 2: number systems

Decimal notation uses ten symbols, from 0 to 9, while binary uses base two with digits 0 and 1. Octal uses base eight and hexadecimal uses base sixteen with 0–9 and A–F. Place values in every system are powers of its base, so binary 1010 represents 8 + 2, or decimal ten; this same value is A in hexadecimal and 12 in octal. Digital hardware represents distinct states reliably, which makes binary convenient for storing and processing bits. Hexadecimal is especially useful for displaying a long binary quantity compactly because each hexadecimal digit corresponds to a group of four bits. Octal similarly corresponds to groups of three bits.

**Separate proposed five-point marking criteria:** Correct bases 10, 2, 8 and 16 · Place value principle · Correct example 1010 binary equals 10 decimal/A hex/12 octal · Binary matches digital states · Hex groups four bits and octal groups three

### IX-COMP-U03-L01 — Chapter 3: logic design

A logic gate produces an output according to a rule applied to its binary input values. An AND gate outputs 1 only if all required inputs are 1. An OR gate outputs 1 if at least one input is 1. A NOT gate reverses a single binary input, turning 1 into 0 or 0 into 1. Outputs of some gates can become inputs to others, allowing more complex conditions to be expressed. For example, a school device might display an authorized indicator when a valid card is present AND the system is enabled, but NOT when maintenance mode is active. A truth table lists possible input combinations and confirms exactly which combinations produce output 1.

**Separate proposed five-point marking criteria:** Correct AND rule · Correct inclusive OR rule for binary inputs · Correct NOT rule · Explain connected gate outputs and original condition · Truth-table use and logical outcome

### IX-COMP-U04-L01 — Chapter 4: safe troubleshooting

Responsible troubleshooting begins with observing whether the computer shows power, displays an error or repeatedly restarts, while recording the symptoms and recent authorized changes. Personal files and school records should be protected before any repair action. Non-destructive checks, such as confirming that external connections are seated and identifying whether an attached device is the cause, can help narrow the problem. Diagnostic findings should be compared one change at a time instead of making many unrecorded modifications. Any step that requires opening equipment or handling electrical power belongs to a qualified technician rather than a student. After an authorized correction, check normal startup and data access, then document the result so that a recurring fault can be investigated.

**Separate proposed five-point marking criteria:** Record observable symptoms and changes · Prioritize authorized data protection · Use safe non-destructive diagnosis · Isolate causes systematically and avoid unsafe hardware work · Verify service and document outcome

### IX-COMP-U05-L01 — Chapter 5: software system

An operating system provides services that make the computer useful and manageable. Its user interface accepts requests through windows, commands or other controls and presents the results. Process management schedules application tasks so that several programs can make progress without interfering unnecessarily. Memory management allocates working memory to running programs and limits accidental access between them. File-system management organizes persistent files and folders, supports saving and retrieving records and can apply permissions. Device management coordinates keyboards, displays, storage units and other equipment through appropriate drivers. Security and account management help control which users can access protected information. These services cooperate whenever an application opens, edits or saves a school document.

**Separate proposed five-point marking criteria:** User interface handles user interactions · Processes receive managed execution time · Memory allocated and access protected · File/storage organized and retrieved · Device and account security management explained

### IX-COMP-U06-L01 — Chapter 6: network design

A small school network links end devices such as computers and printers so authorized users can share permitted resources. A switch commonly connects wired devices within a local area, while a wireless access point provides a radio connection for supported devices. A router can connect separate networks and serve as an internet gateway where connectivity is available. Network addressing makes it possible to identify the intended destination of each communication, and appropriate permissions limit access to private academic records. Planning should also consider reliability, backups, available bandwidth and who may manage shared devices. Good network design supports learning and collaboration while reducing risks from unauthorized access or accidental exposure.

**Separate proposed five-point marking criteria:** Identify computers, printers and other end devices · Explain wired switch and wireless access point roles · Describe router or internet gateway · Addressing and resource sharing · School privacy, permissions and reliability safeguards

### IX-COMP-U07-L01 — Chapter 7: computational thinking

Computational thinking helps break a school attendance program into manageable parts. Decomposition separates the work into choosing a class and date, showing the authorized roster, recording status values, validating entries and producing a summary. Pattern recognition identifies repeated actions, such as checking that each record belongs to the chosen class and using the same status values across students. Abstraction keeps only essential fields, for example an authorized student identifier, date, class and attendance status, instead of unrelated personal information. An algorithm specifies the order: load the appropriate roster, check entries, flag omissions, save only with authorization and show a confirmation for the original class and day. Testing should cover missing entries, duplicate submissions, network errors and a change of selected date before confirmation.

**Separate proposed five-point marking criteria:** Decompose attendance into manageable steps · Find repeated validation or data patterns · Select minimal required fields · Describe an ordered validated save workflow · Test edge cases and refine behavior

### IX-COMP-U08-L01 — Chapter 8: web development

HTML, CSS and JavaScript have complementary roles in a basic web page. HTML defines meaningful content and structure, such as headings, navigation, paragraphs and form labels. CSS controls presentation, including layout, typography and spacing, while still respecting readability and contrast. JavaScript can respond to user actions, validate ordinary inputs and update page content without changing the underlying meaning of HTML. The browser combines these resources when rendering an interactive page. For example, a school information page may present events using HTML, arrange them using CSS and let visitors reveal additional event details through a simple JavaScript interaction. Descriptive labels, keyboard access and testing at different screen sizes improve usability.

**Separate proposed five-point marking criteria:** HTML semantics and page structure · CSS layout and readable presentation · JavaScript responds to interaction · Describe a coherent original school-page example · Accessibility and usability validation

### IX-COMP-U09-L01 — Chapter 9: data project

A school library preference study should begin with a specific question, such as which opening periods students find convenient. The target population is the students who may use the library, and the sample should fairly represent different classes or schedules rather than only one small friendship group. A short voluntary survey can ask students to select suitable time categories while avoiding names and unrelated personal details. Responses are grouped into categories and summarized by frequencies or percentages, with a clear chart if useful. The results should be interpreted carefully, noting non-response, timetable restrictions and whether the sample truly represents the school. Findings can inform scheduling, but no individual student should be identified in public reporting.

**Separate proposed five-point marking criteria:** State a focused library-hours research question · Define population and representative sample · Collect responses voluntarily with minimal private data · Tabulate and visualize aggregate preferences · Interpret limitations and report without identifying students

### IX-COMP-U10-L01 — Chapter 10: emerging technology

Artificial intelligence refers to computational approaches that perform tasks such as recognizing patterns or making predictions; a school might use a teacher-checked system to suggest practice activities. Cloud computing provides computing or storage services over a network, for example authorized remote access to school files, but requires attention to account protection and connectivity. The Internet of Things connects physical devices that can sense or communicate data, such as a room-temperature monitor. These technologies serve different purposes and may be combined, yet they have different risks. AI output may be inaccurate or unfair, cloud services require privacy safeguards and dependable service access, and network-connected devices require careful security and maintenance.

**Separate proposed five-point marking criteria:** Explain AI purpose and one supervised school use · Identify AI accuracy or fairness risk · Explain cloud services and account/connectivity concern · Explain IoT device and its monitoring use · Contrast privacy/security/reliability risks across technologies

### IX-COMP-U11-L01 — Chapter 11: ethical computing

Ethical computer use respects other people and their information. Privacy means collecting and sharing personal data only for a justified purpose with appropriate permission; for example, student records should not be posted publicly. Copyright means recognizing creators’ rights, using authorized software and giving credit to permitted content rather than copying materials without permission. Respectful communication avoids harassment and misleading messages. Data security protects accounts through appropriate access controls, updates and careful handling of files. Accessibility ensures that people with different abilities can understand and use digital information, for instance through descriptive labels and keyboard-friendly navigation. Together these principles make school technology safer and more inclusive.

**Separate proposed five-point marking criteria:** Protect personal privacy and limit disclosures · Respect creators and authorized content use · Communicate respectfully · Use appropriate data security/access controls · Support accessibility and inclusion

### IX-COMP-U12-L01 — Chapter 12: entrepreneurship

A small digital service should start with a real user problem, such as helping families find school announcements more easily. The developer identifies intended users and checks whether existing tools already solve the need. A clear value proposition then explains what improvement the new service offers. The first version should include only a manageable set of important features, with costs, maintenance needs and available resources considered. Feedback from permitted test users can identify confusing behavior and help refine the service before wider release. A responsible launch also provides clear support information, respects others’ intellectual property and protects data through reasonable privacy and security decisions. Success should be judged by usefulness and trust rather than by the number of features alone.

**Separate proposed five-point marking criteria:** Define a real need and intended users · Explain the service value proposition · Plan a minimum viable set of features and costs · Test with consent and improve from feedback · Launch with privacy, copyright and support safeguards

## Independent approval requirements

1. Confirm the actual ASSPS Grade IX Computer Science textbook title, printed edition, approved medium, school year and board exam year; the catalog PDF identity is not adoption evidence.
2. Verify original textbook chapter and exercise against the actual printed page/PDF physical page with an authorized independent reviewer.
3. A qualified Computer IX subject teacher must check accuracy, ethics, student-accessibility, five-mark fairness and whether each explanation fully answers its exact original question.
4. Independently verify Urdu equivalence where needed; submit a new immutable question revision and obtain separate human academic signoff before any approval.
5. Keep Paper Studio Grade IX/X verified picker empty. SaaS Core alone owns tenant/RLS certification and production deployment.

**Independent source/page verification: 0 · Subject-teacher review: 0 · Academically approved: 0 · Published: 0.**
