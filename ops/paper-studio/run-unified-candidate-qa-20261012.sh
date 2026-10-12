#!/usr/bin/env bash
# Paper-owned source validation only. Does not contact or mutate production data.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONT="$ROOT/al-siddique-frontend"
EVIDENCE="${ASSPS_PAPER_EVIDENCE_DIR:-/tmp/assps-paper-core-unified-qa-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
if [[ -e "$EVIDENCE" ]]; then
  echo "HOLD: pre-existing evidence directory; will not overwrite prior tests." >&2
  exit 2
fi
mkdir -m 700 -p "$EVIDENCE"
if [[ -n "${DATABASE_URL:-}" || -n "${DB_NAME:-}" || -n "${PGHOST:-}" ]]; then
  echo "HOLD: database environment supplied; offline-only suite refuses it." >&2
  exit 2
fi
{
  printf 'source_commit='
  git -C "$ROOT" rev-parse HEAD
  printf 'source_branch='
  git -C "$ROOT" branch --show-current
  printf 'utc_started=%s\n' "$(date -u +%FT%TZ)"
} > "$EVIDENCE/provenance.txt"
gate() {
  local label="$1"
  shift
  printf 'BEGIN %s\n' "$label"
  if (cd "$FRONT" && "$@") > "$EVIDENCE/$label.log" 2>&1; then
    printf 'PASS %s\n' "$label" | tee -a "$EVIDENCE/summary.txt"
  else
    local rc=$?
    printf 'FAIL %s exit=%s\n' "$label" "$rc" | tee -a "$EVIDENCE/summary.txt"
    tail -35 "$EVIDENCE/$label.log"
    return "$rc"
  fi
}
gate protected-templates npm run verify:templates
gate guard-fixtures node --test ../ops/tests/paper-rls-role-gate.test.cjs ../ops/tests/paper-runtime-artifact-drift.test.cjs
gate structured-migration node --test src/Modules/Paper-Generator/PaperEditor/tests/migrationV2_43.test.js src/Modules/Paper-Generator/PaperEditor/tests/normalization43.test.js src/Modules/Paper-Generator/PaperEditor/tests/urduMcqInlineOptionBoundary.test.js src/Modules/Paper-Generator/PaperEditor/tests/canonicalDocxModel.test.js
gate canonical-editor-browser node --test src/Modules/Paper-Generator/PaperEditor/tests/canonicalEditorBrowserAcceptance.test.js
gate early-years-browser node --test src/Modules/Paper-Generator/PaperEditor/tests/earlyYearsBrowserAcceptance.test.js
gate selection-identity-browser node --test src/Modules/Paper-Generator/PaperEditor/tests/paperWorkspaceSelectionRegressionV12.test.js src/Modules/Paper-Generator/PaperEditor/tests/paperWorkspaceSelectionThemeV11.test.js
gate urdu-workspace-browser node --test src/Modules/Paper-Generator/PaperEditor/tests/paperWorkspaceUrduBrowserAcceptance.test.js src/Modules/Paper-Generator/PaperEditor/tests/canonicalEnglishUrduA4PdfAcceptance.test.js
gate diary-lesson-browser node --test src/Modules/Paper-Generator/PaperEditor/tests/dailyDiaryWorkspaceBrowserAcceptance.test.js src/Modules/Paper-Generator/PaperEditor/tests/lessonPlanningWorkspaceBrowserAcceptance.test.js
gate official-print-browser node --test src/Modules/Paper-Generator/PaperEditor/tests/unifiedWorkspaceOfficialBrowserAcceptance.test.js
gate first-term-marks-browser node scripts/test-marks-entry-firstterm-browser.mjs
gate paper-owned-eslint ./node_modules/.bin/eslint src/Modules/Paper-Generator --format json
gate vite-build npm run build
printf 'ALL_AUTOMATED_PAPER_CANDIDATE_GATES_PASS\n' | tee -a "$EVIDENCE/summary.txt"
printf 'HOLD: genuine signed teacher+cross-tenant acceptance, physical Nastaleeq print/PDF/DOCX, Grade IX/X human approval, and SaaS Core network/deployment certification are outside this offline suite.\n' >> "$EVIDENCE/summary.txt"
