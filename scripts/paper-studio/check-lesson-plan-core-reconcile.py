#!/usr/bin/env python3
"""Read-only Paper Studio Lesson Planning source parity gate for Core handoff."""
import argparse
import subprocess
import sys

TARGET='al-siddique-frontend/src/Modules/Paper-Generator/LessonPlanningWorkspace.jsx'
MARKERS=(
 'Previous lesson plan selection could not be saved. Current editor selection was not submitted.',
 'all.map(item=>String(item.id)===String(saved.id)',
 'Number(item.serverRevision??item.revision??0)>Number(saved.serverRevision??saved.revision??0)',
 'JSON.stringify(latestDocumentRef.current)===JSON.stringify(normalized)',
)

def source(ref):
 return subprocess.check_output(['git','show',f'{ref}:{TARGET}'],text=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('--candidate',required=True);p.add_argument('--approved',required=True);a=p.parse_args()
 try:
  candidate=source(a.candidate);approved=source(a.approved)
 except (subprocess.CalledProcessError, OSError) as exc:
  print(f'PARITY_BLOCKED missing_ref_or_file: {exc}',file=sys.stderr);return 2
 if any(marker not in approved for marker in MARKERS):
  print('PARITY_BLOCKED approved_ref_missing_required_guard',file=sys.stderr);return 2
 if candidate!=approved:
  lines=subprocess.check_output(['git','diff','--numstat',a.candidate,a.approved,'--',TARGET],text=True).strip()
  print(f'PARITY_HOLD core_candidate_not_owner_exact: {lines}')
  return 1
 print('PARITY_PASS exact_paper_owner_lesson_planning_source')
 return 0
if __name__=='__main__':sys.exit(main())
