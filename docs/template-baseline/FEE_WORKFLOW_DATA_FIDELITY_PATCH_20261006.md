# Fee workflow protected-source data-fidelity patch — 2026-10-06

## Scope
This is a surgical operational patch under the template-preservation policy. `CreateChallan.jsx` and `ViewChallans.jsx` contain both workflow/UI state and approved voucher presentation logic, so the protected source hashes are intentionally updated after this review.

## Objective defects corrected
- Removed the invented Rs. 2,500 monthly-fee fallback when fee settings are unavailable.
- Removed the invented `Blue` section fallback from class challan generation.
- Removed `Starter` as a synthetic class option in challan viewing.
- Replaced hardcoded September 2026 / 2026–2027 filter choices with live calendar defaults and a complete month list.
- Removed ASSPS name/address/phone fallbacks from the generic multi-tenant challan viewer.
- API failures now render an explicit error instead of a misleading empty challan list.
- “Mark as Unpaid” no longer swallows a failed backend mutation; the user is told when the challan status was not actually updated.

## Preservation statement
No voucher template ID, printable voucher geometry, copy layout, typography architecture, A4 dimensions, branding geometry, or canonical voucher renderer was intentionally redesigned by this patch. Changes are limited to operational state, filtering, tenant identity sourcing, and error/data fidelity.
