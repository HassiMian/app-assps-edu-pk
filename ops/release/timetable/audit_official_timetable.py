#!/usr/bin/env python3
"""Read-only ASSPS Oct-16 official-source vs historical timetable reconciliation.

Never writes production data, never assigns teacher accounts, never infers
unverified class sections. All outputs are aggregate counts, not identities.
Usage: python3 ops/release/timetable/audit_official_timetable.py [--live]
"""
from __future__ import annotations
import argparse
import hashlib
import json
import pathlib
import subprocess

ROOT=pathlib.Path(__file__).resolve().parents[3]
FIXTURE=ROOT/'al-siddique-backend/src/domain/ASSPS_APPROVED_TIMETABLE_SOURCE_20261016.json'
QUERY="""BEGIN READ ONLY;
SELECT row_to_json(t)::text FROM (
 SELECT class_name,section,period_label,subject,teacher_display_name,
        TO_CHAR(start_time,'HH24:MI') start_time,
        TO_CHAR(end_time,'HH24:MI') end_time,
        teacher_id IS NOT NULL mapped,
        staff_identity_reviewed reviewed
 FROM public.timetable
 WHERE school_id=1 AND academic_session='2026–27'
 ORDER BY class_name,section,period_label
) t;
COMMIT;"""
def read_live():
    result=subprocess.run(
        ['runuser','-u','postgres','--','psql','-X','-A','-t','-d','apexos',
         '-v','ON_ERROR_STOP=1','-c',QUERY],
        text=True,capture_output=True,timeout=20,check=True)
    rows=[]
    for line in result.stdout.splitlines():
        if line.startswith('{'):
            rows.append(json.loads(line))
    return rows

def compare(approved,rows):
    cohorts=approved['allocations']
    official={}
    for cohort in cohorts:
        for period in cohort['periods']:
            key=(cohort['class_name'],cohort['section'],period['period'])
            official[key]=(period['subject'],period['teacher_display_name'])
    historical={}
    sections={}
    extra_rows=[]
    for row in rows:
        label=str(row.get('period_label') or '')
        if not label.startswith('Period '):
            continue
        try: period=int(label.split()[-1])
        except ValueError:
            extra_rows.append(row);continue
        class_name=row['class_name']
        section=row['section'] or None
        sections.setdefault(class_name,set()).add(section)
        key=(class_name,section,period)
        if key in historical:
            extra_rows.append(row)
        historical[key]=row
    mismatch=missing=timing_mismatch=mapped=reviewed=0
    ambiguous=[]
    for cohort in cohorts:
        cls,required_section=cohort['class_name'],cohort['section']
        if required_section is None:
            candidates=sections.get(cls,set())
            if len(candidates)!=1:
                ambiguous.append({'class':cls,'candidate_section_count':len(candidates)})
                continue
            observed_section=next(iter(candidates))
        else:
            observed_section=required_section
        for approved_period in cohort['periods']:
            number=approved_period['period']
            row=historical.get((cls,observed_section,number))
            if row is None:
                missing+=1;continue
            if (str(row['subject']).strip().casefold(),str(row['teacher_display_name']).strip().casefold()) != (
                str(approved_period['subject']).strip().casefold(),
                str(approved_period['teacher_display_name']).strip().casefold()):
                mismatch+=1
            expected=next(v for v in approved['regular_bells'] if v['label']==f'Period {number}')
            if row['start_time']!=expected['start'] or row['end_time']!=expected['end']:
                timing_mismatch+=1
            mapped+=bool(row['mapped'])
            reviewed+=bool(row['reviewed'])
    return {
      'status':'RELEASE_HOLD', 'school_id':approved['school_id'],
      'source_sha256':approved['source_pdf_sha256'],
      'teaching_slots_approved':sum(len(c['periods']) for c in cohorts),
      'teaching_slots_historical':len(historical),
      'subjects_or_display_teacher_mismatched':mismatch,
      'approved_rows_not_found':missing,
      'regular_period_time_mismatches':timing_mismatch,
      'mapped_employee_ids_count':mapped,
      'verified_employee_ids_count':reviewed,
      'duplicate_or_malformed_records':len(extra_rows),
      'class_sections_ambiguous':ambiguous,
      'source_sections_approved':False,
      'school_wide_friday_profile_in_old_rows':False,
      'production_update_permitted':False,
      'note':'No SQL DML, no teacher grants, no deduced section approvals.'
    }
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--live',action='store_true',help='Run read-only psql on this Hostinger VPS')
    p.add_argument('--fixture-rows',help='JSON fixture of synthetic historical rows')
    args=p.parse_args()
    approved=json.loads(FIXTURE.read_text(encoding='utf-8'))
    assert approved['publication_authorized'] is False
    assert approved['may_write_production_timetable'] is False
    if args.live==bool(args.fixture_rows):
        p.error('Specify exactly one of --live or --fixture-rows')
    rows=read_live() if args.live else json.loads(pathlib.Path(args.fixture_rows).read_text())
    print(json.dumps(compare(approved,rows),indent=2,sort_keys=True))
if __name__=='__main__':
    main()
