#!/usr/bin/env python3
"""Read-only attendance aggregate integrity gate for ASSPS's distinct Nine and Pre Nine.

A clean database record set does not certify an unsafe published UI.
No employee/student identity data, roster IDs, passwords or attendance marks are written.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import shutil
import hashlib
import math

EXPECTED={("Nine","Fatima"),("Nine","Usman"),("Pre Nine","Blue")}
EXPECTED_STATUSES={"present","absent","late"}
ROOT=Path("/root/workspace/assps-mission-20261107-a222-private")
LIVE=Path("/var/www/assps-releases/assps-diary-a205-grid-visibility-20261105")
MIN_HEADROOM_BYTES=16*1024**3

SQL="""BEGIN READ ONLY;
WITH target(class_name,section_name) AS (
 VALUES ('Nine'::text,'Fatima'::text),
        ('Nine'::text,'Usman'::text),
        ('Pre Nine'::text,'Blue'::text)
),
rosters AS (
 SELECT t.class_name,t.section_name,count(s.id)::integer AS active_students
 FROM target t
 LEFT JOIN students s ON s.school_id=1 AND s.is_active IS TRUE
 AND s.class=t.class_name AND s.section=t.section_name
 GROUP BY t.class_name,t.section_name
),
daily AS (
 SELECT a.date::text AS day,s.class AS class_name,s.section AS section_name,
 count(a.id)::integer AS entries,
 count(DISTINCT a.student_id)::integer AS unique_students
 FROM attendance a
 JOIN students s ON s.id=a.student_id AND s.school_id=a.school_id
 JOIN target t ON t.class_name=s.class AND t.section_name=s.section
 WHERE a.school_id=1 AND a.date>=DATE '2026-11-01'
 GROUP BY a.date,s.class,s.section
),
duplicates AS (
 SELECT count(*)::integer AS count FROM (
  SELECT school_id,student_id,date FROM attendance
  WHERE school_id=1
  GROUP BY school_id,student_id,date HAVING count(*)>1
 ) q
),
wrong_owner AS (
 SELECT count(*)::integer AS count FROM attendance a
 LEFT JOIN students s ON s.id=a.student_id AND s.school_id=a.school_id
 WHERE a.school_id=1 AND s.id IS NULL
),
cross_tenant AS (
 SELECT count(*)::integer AS count FROM attendance a
 JOIN students s ON s.id=a.student_id
 WHERE s.school_id IS DISTINCT FROM a.school_id
),
statuses AS (
 SELECT lower(coalesce(status,'null')) AS status,count(*)::integer AS count
 FROM attendance WHERE school_id=1 AND date>=DATE '2026-11-01'
 GROUP BY lower(coalesce(status,'null'))
)
SELECT row_to_json(payload) FROM (
 SELECT
 (SELECT coalesce(json_agg(row_to_json(r) ORDER BY r.class_name,r.section_name),'[]'::json)
 FROM rosters r) AS rosters,
 (SELECT coalesce(json_agg(row_to_json(d) ORDER BY d.day,d.class_name,d.section_name),'[]'::json)
 FROM daily d) AS daily,
 (SELECT count FROM duplicates) AS "duplicateStudentDateRows",
 (SELECT count FROM wrong_owner) AS "orphanSchool1AttendanceRows",
 (SELECT count FROM cross_tenant) AS "mismatchedSchoolStudentJoins",
 (SELECT coalesce(json_agg(row_to_json(s) ORDER BY s.status),'[]'::json) FROM statuses s) AS "statusCounts",
 (SELECT count(*)::integer FROM students WHERE school_id=1 AND is_active IS TRUE) AS "school1Active"
) payload;
ROLLBACK;
"""

def capture_read_only():
    proc=subprocess.run(["runuser","-u","postgres","--","psql","-X","-q","-At",
       "-d","apexos","-v","ON_ERROR_STOP=1"],
       input=SQL,capture_output=True,text=True,timeout=25,check=True)
    rows=[r for r in proc.stdout.splitlines() if r.startswith("{")]
    if len(rows)!=1:raise ValueError("Expected exactly one aggregate JSON row")
    parsed=json.loads(rows[0])
    if not isinstance(parsed,dict):raise ValueError("Expected aggregate dictionary")
    return parsed

def published_graph_shape(published):
    if not isinstance(published,dict):raise ValueError("Invalid published graph")
    evidence=published.get("entryEvidence")
    if not isinstance(evidence,list):raise ValueError("Missing entryEvidence")
    unsafe=sum(v.get("attendanceModuleHasImportMapReplacement") is False and
       v.get("nineToPreNineSectionFallbackPresent") is True for v in evidence if isinstance(v,dict))
    safe_marks=sum(v.get("replacementPreservesPreNineIdentity") is True for v in evidence if isinstance(v,dict))
    return {
       "entryCount":len(evidence),
       "unsafeAttendanceModules":unsafe,
       "safeMarkAttendanceOverrides":safe_marks,
       "activeGraphIndependentBrowserCertified":published.get("importMapReplacementObservedInBrowser") is True
    }

def validate_aggregates(record,published,*,free_bytes):
    if not isinstance(record,dict):raise ValueError("No school attendance aggregate")
    if isinstance(free_bytes,bool) or not isinstance(free_bytes,int) or free_bytes<0:
        raise ValueError("Invalid free disk bytes")
    rosters=record.get("rosters")
    daily=record.get("daily")
    statuses=record.get("statusCounts")
    if not isinstance(rosters,list) or not isinstance(daily,list) or not isinstance(statuses,list):
        raise ValueError("Missing aggregate sections")
    blockers=[]
    names=[]
    roster_counts={}
    for row in rosters:
        if not isinstance(row,dict):raise ValueError("Malformed roster row")
        key=(row.get("class_name"),row.get("section_name"))
        count=row.get("active_students")
        if not isinstance(count,int) or isinstance(count,bool) or count<0:raise ValueError("Malformed roster count")
        names.append(key);roster_counts[key]=count
    if len(names)!=len(set(names)) or set(names)!=EXPECTED:
        blockers.append("DISTINCT_NINE_AND_PRENINE_ROSTER_SCOPE_NOT_PROVEN")
    if not all(roster_counts.get(key,0)>0 for key in EXPECTED):
        blockers.append("ONE_OR_MORE_ATTENDANCE_GROUPS_EMPTY")
    dates={}
    for row in daily:
        if not isinstance(row,dict):raise ValueError("Malformed daily attendance aggregate")
        key=(row.get("class_name"),row.get("section_name"))
        day=row.get("day")
        entries=row.get("entries")
        unique=row.get("unique_students")
        if key not in EXPECTED or not isinstance(day,str) or len(day)!=10:
            raise ValueError("Unrecognized daily date or class")
        if not isinstance(entries,int) or isinstance(entries,bool) or entries<0:
            raise ValueError("Invalid attendance count")
        if not isinstance(unique,int) or isinstance(unique,bool) or unique<0:
            raise ValueError("Invalid distinct student count")
        if entries!=unique:
            blockers.append("DUPLICATE_ATTENDANCE_FOR_SAME_DATE_AND_SECTION")
        if unique>roster_counts.get(key,0):
            blockers.append("ATTENDANCE_EXCEEDS_CURRENT_ACTIVE_ROSTER")
        if key in dates.setdefault(day,{}):
            blockers.append("DUPLICATE_DAY_CLASS_SECTION_AGGREGATE")
        dates[day][key]=entries
    for name in ("duplicateStudentDateRows","orphanSchool1AttendanceRows","mismatchedSchoolStudentJoins"):
        count=record.get(name)
        if not isinstance(count,int) or isinstance(count,bool) or count<0:
            raise ValueError("Invalid integrity count "+name)
        if count:
            blockers.append("DATABASE_"+name)
    bad_status=[]
    for s in statuses:
        if not isinstance(s,dict) or not isinstance(s.get("status"),str) or type(s.get("count")) is not int or s["count"]<0:
            raise ValueError("Invalid status aggregate")
        if s["status"] not in EXPECTED_STATUSES:
            bad_status.append(s["status"])
    if bad_status:blockers.append("UNKNOWN_ATTENDANCE_STATUS")
    graph=published_graph_shape(published)
    if graph["entryCount"]!=4:
        blockers.append("FOUR_PUBLISHED_ENTRY_MODULES_NOT_PROVEN")
    if graph["unsafeAttendanceModules"]>0:
        blockers.append("PUBLISHED_ATTENDANCE_MODULE_UNSAFE_NINE_PRENINE_FALLBACK")
    if graph["safeMarkAttendanceOverrides"]!=4:
        blockers.append("MARK_ATTENDANCE_IMPORTMAP_NOT_ALL_SAFE")
    if free_bytes<MIN_HEADROOM_BYTES:
        blockers.append("ROOT_FILESYSTEM_BELOW_16_GIB_FREE")
    # Critical: valid data is not Principal acceptance, not offsite restore,
    # not front-end publication approval.
    blockers.extend(("PRINCIPAL_TEACHER_PUBLISHED_UI_ACCEPTANCE_NOT_PROVEN",
        "OFFHOST_RECOVERABLE_FULL_DATABASE_ROLES_PASSWORDS_ACL_NOT_PROVEN",
        "SIGNED_SAAS_CORE_ROLLBACK_NOT_PROVEN"))
    return {
       "release":"HOLD",
       "blockers":sorted(set(blockers)),
       "blockerCount":len(set(blockers)),
       "activeStudentsInScope":sum(roster_counts.get(k,0) for k in EXPECTED),
       "activeWholeSchool":record.get("school1Active"),
       "distinctConfiguredRosterGroups":len(set(names)),
       "distinctDaysWithAttendance":len(dates),
       "observedDailyRecords":sum(r["entries"] for r in daily),
       "aggregateGroups":len(daily),
       "published":graph,
       "unverifiedDaysAreNotInterpretedAsAbsence":True,
       "anonymousAggregatesNotProofOfTeacherAction":True,
       "noProductionWrites":True,
       "liveCutoverCertified":False
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--published-graph-json",required=True)
    p.add_argument("--out",required=True)
    args=p.parse_args()
    graph=Path(args.published_graph_json).resolve()
    output=Path(args.out).resolve()
    if output.parent!=ROOT or output.suffix!=".json" or not output.name.startswith("A222_"):
        raise ValueError("Private A222 output only")
    if not graph.is_file() or graph.is_symlink():
        raise ValueError("Trusted published graph required")
    evidence=json.loads(graph.read_text())
    raw=capture_read_only()
    decision=validate_aggregates(raw,evidence,free_bytes=shutil.disk_usage("/").free)
    result={
       "mission":"A222_NINE_PRENINE_READONLY_DB_VS_PUBLISHED_GRAPH",
       "checkedUtc":datetime.now(timezone.utc).isoformat(),
       "postgresReadOnlyTransaction":True,
       "sourceStudentRowsOrIdsStored":False,
       "sourceSchoolTenant":1,
       "sourceAggregate":raw,
       "decision":decision,
       "productionWrites":0,"deletions":0,"deployment":False}
    tmp=output.with_suffix(".tmp")
    tmp.write_text(json.dumps(result,indent=2)+"\n")
    os.chmod(tmp,0o600);os.replace(tmp,output)
    print(json.dumps({"groupCount":decision["distinctConfiguredRosterGroups"],
        "activeStudents":decision["activeStudentsInScope"],
        "observedDays":decision["distinctDaysWithAttendance"],
        "observedAttendanceRecords":decision["observedDailyRecords"],
        "unsafePublishedModules":decision["published"]["unsafeAttendanceModules"],
        "release":decision["release"],"blockers":decision["blockerCount"]}))
    return 3

if __name__=="__main__":
    try:sys.exit(main())
    except (OSError,ValueError,subprocess.SubprocessError,TypeError) as e:
        print("A222 refused untrusted evidence: "+type(e).__name__+": "+str(e),file=sys.stderr)
        sys.exit(2)
