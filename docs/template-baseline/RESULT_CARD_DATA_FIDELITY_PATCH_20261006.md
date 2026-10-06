# Result Card protected-template data-fidelity patch — 2026-10-06

## Reason
This is an intentional surgical patch under the template-preservation policy. The approved result-card visual templates are preserved. Only source-data fallbacks that could print invented school/student/result facts were changed.

## Defects corrected
- Removed hardcoded academic session `2026-2027`.
- Removed fake `Demo Student`, `Father Name`, and `GR-0001` identity values.
- Removed ASSPS school/address fallback from the multi-tenant renderer.
- Removed invented attendance totals `220 / 205 / 15`.
- Removed automatic promotion/principal remark text.
- Removed generated subject-performance remarks presented as if they were recorded remarks.
- Grade fallback now consumes configured grade bands supplied by the result-card workflow rather than fixed thresholds.
- Card Generator no longer invents `Starter` when Academic Setup has no configured classes.

## Preservation statement
No template IDs, template registry entries, structural layout variants, print dimensions, brand geometry, colors, font families, or printable card visual architecture were intentionally changed by this patch. Missing canonical data now renders as an em dash or blank field instead of a fabricated fact.
