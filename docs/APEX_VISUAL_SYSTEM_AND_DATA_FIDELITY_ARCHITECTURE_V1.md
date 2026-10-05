# APEX OS — Visual System + Exact Data Fidelity Architecture V1
Date: 2026-10-05
Status: Foundation / non-destructive

## 1. Non-negotiable rule: data and presentation are separate layers
APEX OS must never improve visual design by changing, inventing, correcting, summarizing, or replacing authoritative school data.

### Protected exact-data surfaces
The following are fidelity-critical and are excluded from cosmetic shell redesign unless a dedicated renderer change is explicitly approved and regression-tested:
- Official examination papers and approved paper snapshots
- Paper numbering, marks, instructions, MCQ structure, tables, RTL ordering and print geometry
- Result cards and official examination values
- Student identity, class/enrollment, attendance, fees and payment facts
- School-facing printable documents
- Any student/parent presentation that represents official school data

The UI may change how a fact is visually presented, but the displayed value must mirror the canonical source exactly.

## 2. Mirror-data contract
Every screen that shows a school fact must satisfy:

Canonical DB record
  -> Domain API
  -> Typed response contract
  -> UI view model
  -> Screen / dashboard / student presentation

No screen may create a business fact from localStorage, hard-coded arrays, demo values, stale derived labels or UI-only state in production.

Derived metrics are allowed only when:
- formula is defined;
- inputs are canonical;
- timestamp/period is explicit;
- empty/partial data is not silently converted to zero;
- result can be reproduced server-side.

## 3. Paper protection boundary
Paper data pipeline remains independent from SaaS chrome/theme:

Source Paper Data
  -> Canonical PaperDocument
  -> Editor Transactions
  -> Shared Renderer
  -> Screen Preview
  -> Print/PDF/Word

The SaaS light/dark theme must not recolor the printable paper canvas, marks, question text, tables, Urdu layout or official presentation.

### Rule
`App Theme != Document Theme`

A dark application may still display a white A4 official paper. This is intentional.

## 4. Student/school presentation protection
Student-facing and parent-facing views must use the same canonical values as admin views. A prettier presentation must never become a second copy of the data.

Example:
Student profile header -> Student 360 API -> same student identity record used by attendance/fees/exams.

Never:
Student profile local cache -> separate class label -> separate attendance label.

## 5. Visual direction: premium, light, vibrant, calm
The current dark navy is visually too heavy when used as a full-page background and as repeated card backgrounds. Brand navy should remain an identity color, not become the entire atmosphere.

### New art direction
Think: premium enterprise software + modern educational institution.

Use:
- graphite/navy foundation rather than near-black blue;
- cleaner neutral surfaces;
- one vivid blue action color;
- restrained teal for secondary energy;
- muted metallic gold only for distinction/highlight;
- silver as brand detail, not body text everywhere;
- gradients only at shell/canvas level, not every card;
- glass only for top-level floating surfaces;
- large areas of visual quiet.

## 6. Core palette
### Dark mode — APEX Graphite Aurora
Canvas: `#101722`
Elevated canvas: `#131D2A`
Surface: `#18283B`
Subtle surface: `#1D3045`
Primary text: `#F5F8FC`
Secondary text: `#C4CFDD`
Muted text: `#91A0B4`
Primary action: `#65A6FF`
Secondary action: `#42CFC2`
Premium highlight: `#DEB655`
Danger: `#EF6678`
Success: `#48C58B`

The dark mode must feel luminous, not black. Contrast comes from layered graphite surfaces, not from `#071e34` everywhere.

### Light mode — APEX Pearl Air
Canvas: `#F4F7FB`
Elevated canvas: `#F8FAFE`
Surface: `#FFFFFF`
Subtle surface: `#EDF3F8`
Primary text: `#152033`
Secondary text: `#42536A`
Muted text: `#68788D`
Primary action: `#256FE8`
Secondary action: `#20A99F`
Premium highlight: `#C99A32`
Danger: `#D9465C`
Success: `#209765`

Light mode should feel airy and expensive, not grey/washed-out.

## 7. Background architecture
### Application shell
One ambient gradient per route shell. No competing module gradients.

Light:
- pearl white base
- very subtle azure radial light top-left
- very subtle teal atmospheric light top-right

Dark:
- graphite base
- soft azure atmospheric light
- teal secondary atmospheric light
- no full-screen pure navy block

### Surface hierarchy
Level 0: canvas
Level 1: normal card/surface
Level 2: elevated panel/dialog
Level 3: floating menu/popover

Elevation must be communicated by a combination of tone + border + shadow, not by stronger color alone.

## 8. Color usage budget
A normal screen should visually expose at most:
- 1 primary action color
- 1 secondary accent
- 1 premium highlight
- semantic status colors only when needed

If every module has its own color, the product loses identity.

## 9. Logo architecture
School/tenant logo should be transparent whenever the source supports transparency.

Rules:
- never place logo in a random opaque square unless contrast requires a defined logo plate;
- light mode: subtle neutral/silver plate only if needed;
- dark mode: soft translucent light plate only if logo contrast fails;
- preserve aspect ratio;
- no glow applied directly to school logo;
- tenant branding may alter accent color within contrast limits, not core readability tokens.

## 10. Typography
Primary UI: modern neutral sans-serif.
Display typography should be rare and reserved for branded/ceremonial surfaces.
Urdu: approved Nastaliq/Naskh pipeline according to context; official paper typography remains renderer-controlled.

Use a consistent type scale, not per-module arbitrary sizes.

## 11. Buttons
Every button maps to one of six semantic variants:
- Primary
- Secondary
- Tertiary
- Ghost/Icon
- Danger
- Success (rare)

A primary button should not be gold by default. Gold is premium emphasis, not universal CTA.

### Interaction states
Default -> Hover -> Active -> Focus -> Loading -> Disabled.
All six states must work in both themes.

## 12. Cards
Cards should not all be dark blue boxes.

Card families:
- Standard data card
- Metric card
- Action card
- Elevated workflow panel
- Modal/dialog

Metric cards should use small accent details rather than full-card saturated colors.

## 13. Tables
Tables are information surfaces, not decoration.
- neutral backgrounds;
- subtle row separators;
- sticky header only where useful;
- one selected-row treatment;
- status chips semantic;
- row actions consistent;
- mobile strategy declared per table.

## 14. Forms
Inputs must share one height, radius, focus ring and error model.
Do not use browser alert for validation.
Inline errors preserve entered data.
Required/optional semantics explicit.

## 15. Navigation
Sidebar/topbar should be the quietest stable surfaces in the product. Active route uses one accent and subtle surface lift. Do not light every icon differently.

## 16. Notifications/profile
Bell, profile and global search belong to one identity/command shell.
- same popover geometry;
- same elevated surface token;
- same loading/empty/error states;
- unread state uses compact accent, not loud badge effects.

## 17. Diagram — protected architecture
```text
                            APEX OS
                               |
             +-----------------+------------------+
             |                                    |
       PRODUCT SHELL                         DATA TRUTH
             |                                    |
   Theme / Layout / UX                    PostgreSQL / APIs
             |                                    |
   +---------+---------+                  +-------+-------+
   |                   |                  |               |
Light Theme        Dark Theme        Domain Services   Audit/Events
   |                   |                  |
   +---------+---------+                  |
             |                            |
       UI COMPONENTS                     |
             |                            |
   +---------+---------+                  |
   |                   |                  |
Operational UI     Presentation UI <------+  (mirror values)
                                           
OFFICIAL DOCUMENT PIPELINE (protected)
Source -> Canonical PaperDocument -> Editor -> Renderer -> Print/PDF
                         ^
                         |
               NOT INHERITED FROM APP THEME
```

## 18. Implementation boundaries
### Safe to redesign progressively
- app shell backgrounds
- sidebar/topbar
- cards
- buttons
- forms
- modal/popover
- dashboards
- operational tables
- navigation hierarchy
- login/profile/notifications

### Protected until dedicated fidelity test exists
- paper canvas
- print/PDF styles
- approved official paper snapshots
- document-specific RTL engine
- result/receipt/certificate print layouts

## 19. Test matrix for visual migration
Every migrated component must be captured at:
- Light 1440 desktop
- Dark 1440 desktop
- Light 390 mobile
- Dark 390 mobile
- 768 tablet

And verify:
- no clipped text
- no unreadable contrast
- no logo distortion
- no theme leakage into documents
- same canonical data values before/after

## 20. Data fidelity acceptance
For every migrated screen:
1. Capture API response fixture.
2. Capture before-render business values.
3. Apply visual migration.
4. Capture after-render business values.
5. Assert exact equality for IDs, names, class/enrollment, amounts, marks, dates and statuses.
6. Permit only formatting changes explicitly defined (e.g. date presentation), never value mutation.

## 21. Immediate execution order
1. Introduce semantic tokens without changing paper/document rendering.
2. Refactor app shell/background only.
3. Standardize Button/Input/Card primitives.
4. Migrate Login + Sidebar + Topbar.
5. Migrate Dashboard.
6. Migrate Students/Attendance/Fees one workflow at a time with mirror-data assertions.
7. Only then migrate secondary modules.
8. Paper/editor chrome may adopt shell tokens later; paper content canvas stays protected.
