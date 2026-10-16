#!/usr/bin/env bash
# Safe weekly Academic QA daemon. Not academic publication or Core cutover.
set -euo pipefail
MODE=--check
if [[ $# -gt 0 ]]; then MODE="$1"; fi
[[ "$MODE" = --check || "$MODE" = --apply ]] || { echo "USAGE --check|--apply";exit 64; }
[[ $(id -u) -eq 0 ]] || { echo "ROOT_REQUIRED";exit 65; }
ROOT=/root/workspace/assps-core-school-zero-human-20261016
DST=/usr/local/libexec/assps-grade910-weekly-qa
PY=assps-grade910-weekly-self-qa-20261016.py
SVC=assps-grade910-weekly-qa.service
TIMER=assps-grade910-weekly-qa.timer
systemd-analyze verify "$ROOT/ops/release/$SVC" "$ROOT/ops/release/$TIMER"
python3 -m unittest discover -s "$ROOT/ops/tests" -p test_assps_grade910_weekly_self_qa_20261016.py -q
python3 "$ROOT/ops/qbank/$PY" --check
if [[ "$MODE" = --check ]];then
 echo "ASSPS_GRADE910_WEEKLY_QA_INSTALL_PREFLIGHT_PASS_NO_CHANGES"
 exit 0
fi
mkdir -p "$DST"
install -m 0644 "$ROOT/ops/qbank/$PY" "$DST/$PY"
install -m 0644 "$ROOT/ops/release/$SVC" "/etc/systemd/system/$SVC"
install -m 0644 "$ROOT/ops/release/$TIMER" "/etc/systemd/system/$TIMER"
systemctl daemon-reload
systemctl enable --now "$TIMER"
systemctl is-active --quiet "$TIMER"
echo "ASSPS_GRADE910_PRIVATE_WEEKLY_QA_TIMER_ACTIVE"
