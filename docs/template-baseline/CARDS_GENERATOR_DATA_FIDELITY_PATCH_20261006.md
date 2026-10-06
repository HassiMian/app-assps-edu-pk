# Cards Generator protected-source data-fidelity patch — 2026-10-06

## Scope
This is an intentional surgical patch under the template-preservation policy. `CardsGeneratorModule.jsx` contains approved printable card templates together with operational data-loading logic.

## Objective defects corrected
- Result-card variants no longer print the hardcoded session `2026-2027`; each variant now renders the session from the selected exam record.
- Employee-card generation no longer converts an employee API failure into a misleading empty employee dataset; the source failure is shown explicitly.

## Preservation statement
No template IDs, printable dimensions, card geometry, color architecture, typography, front/back arrangement, or A4 packing rules were intentionally changed. The patch only corrects data sourcing and operational error truthfulness.
