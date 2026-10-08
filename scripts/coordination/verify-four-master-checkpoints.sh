#!/usr/bin/env bash
# Read-only evidence gathering for ASSPS four-master release coordination.
# NEVER interprets source equality or tests as production certification.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/root/workspace/assps-four-master-gate-scan-20261008}"
PAPER_ROOT="${PAPER_ROOT:-/root/workspace/assps-paper-studio-master-phase7-20261008}"
CORE_ROOT="${CORE_ROOT:-/root/workspace/assps-core-phase7-signed-rls-isolated-20261008}"
GRADE_ROOT="${GRADE_ROOT:-/root/workspace/assps-grade910-academic-master-evidence-20261008}"
CONNECT_ROOT="${CONNECT_ROOT:-/root/workspace/apex-connect-master-20261008/source}"
FRONT_META="${FRONT_META:-/var/www/apex-os/release-meta.json}"
BACK_META="${BACK_META:-/var/www/apex-backend/release-meta.json}"
faults=0

say(){ printf '%s\n' "$*"; }
sha_of(){ sha256sum "$1" | cut -d' ' -f1; }
branch_ref(){
  local branch="$1" ref
  ref=$(git -C "$REPO_ROOT" ls-remote origin "refs/heads/$branch" | awk '{print $1}')
  [ -n "$ref" ] && say "REMOTE $branch $ref" || { say "MISSING REMOTE $branch"; faults=$((faults+1)); }
}
inspect_worktree(){
  local name="$1" path="$2" branch="${3:-}" status local_head remote_head
  if ! test -d "$path/.git" && ! test -f "$path/.git"; then
    say "UNAVAILABLE $name local Git worktree: $path"
    return
  fi
  status=$(git -C "$path" status --porcelain | wc -l)
  local_head=$(git -C "$path" rev-parse HEAD)
  say "LOCAL $name $local_head tracked+untracked_entries=$status"
  if [ -n "$branch" ]; then
    remote_head=$(git -C "$REPO_ROOT" ls-remote origin "refs/heads/$branch" | awk '{print $1}')
    if [ -n "$remote_head" ] && [ "$local_head" != "$remote_head" ]; then
      say "PENDING_SYNC_RECHECK $name local=$local_head remote=$remote_head (may be a concurrent push)"
      faults=$((faults+1))
    fi
  fi
}

say "READ_ONLY_ASSPS_FOUR_MASTER_PREFLIGHT $(date -u +%FT%TZ)"
if [ ! -r "$FRONT_META" ] || [ ! -r "$BACK_META" ]; then
  say "MISSING LIVE ARTIFACT METADATA (cannot authorize any release)"
  faults=$((faults+1))
else
  node - "$FRONT_META" "$BACK_META" <<'NODE'
const fs=require('fs');
for(const [name,path] of [['FRONTEND',process.argv[2]],['BACKEND',process.argv[3]]]){
  const x=JSON.parse(fs.readFileSync(path,'utf8'));
  console.log('DEPLOYED_ARTIFACT',name,x.commit || 'UNKNOWN',x.deployedAt || 'UNKNOWN');
}
NODE
fi
branch_ref 'feat/paper-studio-master-phase7-20261008'
branch_ref 'feat/saas-core-phase7-signed-rls-clone-20261008'
branch_ref 'feat/grade910-academic-master-evidence-20261008'
inspect_worktree PaperStudio "$PAPER_ROOT" feat/paper-studio-master-phase7-20261008
inspect_worktree SaaSCore "$CORE_ROOT" feat/saas-core-phase7-signed-rls-clone-20261008
inspect_worktree GradeIX_X "$GRADE_ROOT" feat/grade910-academic-master-evidence-20261008
inspect_worktree APEXConnect "$CONNECT_ROOT"

REL=al-siddique-backend/src/services/paperStudioProjectionService.js
if [ -r "$PAPER_ROOT/$REL" ] && [ -r "$CORE_ROOT/$REL" ]; then
  paper_hash=$(sha_of "$PAPER_ROOT/$REL")
  core_hash=$(sha_of "$CORE_ROOT/$REL")
  if [ "$paper_hash" = "$core_hash" ]; then
    say "PARITY PASS PaperStudio/Core G43 metadata projection sha256=$paper_hash"
  else
    say "PARITY BLOCK PaperStudio/Core G43 service differs: paper=$paper_hash core=$core_hash"
    faults=$((faults+1))
  fi
else
  say "PARITY UNKNOWN G43 source not accessible"
  faults=$((faults+1))
fi

for REL in al-siddique-backend/src/routes/lessonPlanRoutes.js al-siddique-backend/src/routes/dailyDiaryRoutes.js; do
  if [ -r "$PAPER_ROOT/$REL" ] && [ -r "$CORE_ROOT/$REL" ]; then
    if cmp -s "$PAPER_ROOT/$REL" "$CORE_ROOT/$REL"; then
      say "SOURCE_EQUALS PaperStudio/Core $REL"
    else
      say "INTEGRATION_REQUIRED PaperStudio/Core $REL differs (Core does not yet contain Phase7 route corrections)"
    fi
  else
    say "UNKNOWN source comparison $REL"
    faults=$((faults+1))
  fi
done
say "HOLD release gates: non-BYPASS runtime+tenant actor RLS; ingress; archived-worktree reconciliation; privileged paths; academic review; authenticated browser and physical print; rollback"
say "LIMITS: No production DB query, authenticated HTTP test, external firewall probe, or paper print is performed by this script."
if [ "$faults" -gt 0 ]; then
  say "PREFLIGHT_DATA_ERRORS=$faults (release HOLD)"
  exit 3
fi
say "READ_ONLY_PREFLIGHT_OK (NOT RELEASE CERTIFICATION)"
