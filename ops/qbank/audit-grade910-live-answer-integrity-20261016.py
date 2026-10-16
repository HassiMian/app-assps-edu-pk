#!/usr/bin/env python3
"""ASSPS read-only Grade 9/10 mechanical option/answer/metadata QA.

Academic source, subject-answer truth, bilingual translation, and staff
publication approvals are explicitly NOT attested by this check.
"""
from __future__ import annotations
from collections import Counter
import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

RECEIPT = Path("/var/lib/assps-grade910-sourceclaims/live-answer-integrity.json")
SQL = """
BEGIN TRANSACTION READ ONLY;
SELECT json_agg(json_build_object(
 'id',metadata->>'seed_id',
 'grade',class_level,
 'subject',subject,
 'type',question_type,
 'medium',medium,
 'answer',answer,
 'correct',correct_option,
 'options',options,
 'chapter',chapter_no,
 'topic',topic_name,
 'marks',marks,
 'difficulty',difficulty,
 'approved',is_approved,
 'urdu',COALESCE(NULLIF(btrim(question_text_urdu),''),NULL),
 'english',COALESCE(NULLIF(btrim(question_text_english),''),NULL)
)) FROM question_bank
WHERE school_id=1 AND class_level IN ('9th','10th');
COMMIT;
"""

END_PUNCT = ".!?;:،۔؛"
def canonical_answer(value):
    if not isinstance(value,str):
        return ""
    x=unicodedata.normalize("NFKC",value).strip().casefold()
    x=re.sub(r"\s+"," ",x)
    return x.rstrip(END_PUNCT+" \t\n")

def check(rows):
    if len(rows)<2400: raise ValueError("LIVE_CANDIDATE_BANK_SUDDENLY_SHRANK")
    seedids=[r.get("id") for r in rows]
    if any(not i for i in seedids) or len(seedids)!=len(set(seedids)):
        raise ValueError("DUPLICATE_OR_NULL_STABLE_QUESTION_IDS")
    issues=[]
    shape=Counter()
    mcqs=0
    exact=0
    punctuation_only=0
    semantic_disagreements=0
    missing_answers=0
    unapproved=0
    grades=Counter()
    types=Counter()
    for row in rows:
        grade=row["grade"];grades[grade]+=1
        kind=row["type"];types[kind]+=1
        if row["approved"] is False:unapproved+=1
        actual_language_text = row.get("urdu") if str(row.get("medium") or "").casefold()=="urdu" else row.get("english")
        for code, flag in (
            ("BLANK_ANSWER",not isinstance(row.get("answer"),str) or not row["answer"].strip()),
            ("MISSING_CHAPTER",row.get("chapter") is None),
            ("MISSING_TOPIC",not str(row.get("topic") or "").strip()),
            ("BAD_MARKS",not isinstance(row.get("marks"),(float,int)) or row["marks"]<=0),
            ("MISSING_DIFFICULTY",not str(row.get("difficulty") or "").strip()),
            ("MISSING_LANGUAGE_TEXT",not isinstance(actual_language_text,str) or not actual_language_text.strip()),
        ):
            if flag:shape[code]+=1
        if not isinstance(row.get("answer"),str) or not row["answer"].strip():missing_answers+=1
        if kind!="mcq":continue
        mcqs+=1
        options=row.get("options")
        if not isinstance(options,list) or len(options)!=4:
            issues.append((row["id"],"MCQ_OPTION_COUNT"));continue
        keys=[str(o.get("id") or "").strip().upper() for o in options if isinstance(o,dict)]
        texts=[o.get("text") for o in options if isinstance(o,dict)]
        if len(keys)!=4 or set(keys)!={"A","B","C","D"} or not all(isinstance(x,str) and x.strip() for x in texts):
            issues.append((row["id"],"MCQ_OPTION_IDS_OR_TEXT"));continue
        if len({canonical_answer(x) for x in texts})!=4:
            issues.append((row["id"],"DUPLICATE_NORMALIZED_MCQS"));continue
        option_map=dict(zip(keys,texts))
        key=str(row.get("correct") or "").strip().upper()
        if key not in option_map:
            issues.append((row["id"],"CORRECT_KEY_MISSING"));continue
        expected=option_map[key]
        answer=row.get("answer") or ""
        if answer.strip().casefold()==expected.strip().casefold():
            exact+=1
        elif canonical_answer(answer)==canonical_answer(expected):
            punctuation_only+=1
        else:
            semantic_disagreements+=1
            issues.append((row["id"],"ANSWER_DISAGREES_WITH_SELECTED_OPTION"))
    result={
        "schema":"assps-grade910-live-answer-integrity-v1",
        "observedUTC":dt.datetime.now(dt.timezone.utc).isoformat(),
        "liveCandidateRows":len(rows),
        "byGrade":dict(sorted(grades.items())),
        "byType":dict(sorted(types.items())),
        "mcqCandidates":mcqs,
        "answerEqualsSelectedOptionExactly":exact,
        "terminalPunctuationOnlyDifferences":punctuation_only,
        "substantiveOrStructuralAnswerConflicts":len(issues),
        "missingAnswerRecords":missing_answers,
        "recordCompletenessIssues":dict(sorted(shape.items())),
        "unapprovedProvisionalRows":unapproved,
        "unexpectedApprovedWithoutAuthenticatedReviewerEvidence":len(rows)-unapproved,
        "realFacultyReviewSignaturesCreated":0,
        "independentAcademicAnswerCorrectnessCertified":0,
        "questionApprovalsPublished":0,
        "productionDatabaseWrites":0,
        "privateConflictingQuestionIdAndTypeOnly":[{"id":x,"code":c} for x,c in issues],
    }
    return result

def db_rows():
    run=subprocess.run(["runuser","-u","postgres","--","psql","-X","-At","-v","ON_ERROR_STOP=1","-d","apexos","-c",SQL],
                       capture_output=True,text=True,timeout=45)
    if run.returncode:raise RuntimeError("READONLY_ANSWER_SOURCE_QUERY_FAILED_"+run.stderr[:100])
    lines=[x for x in run.stdout.splitlines() if x.startswith("[")]
    if len(lines)!=1:raise RuntimeError("ANSWER_AGGREGATE_INVALID")
    return json.loads(lines[0])

def write_private(path,data):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if path.parent.stat().st_mode & 0o077:raise RuntimeError("PRIVATE_RECEIPT_DIRECTORY_REQUIRED")
    fd,temp=tempfile.mkstemp(prefix=".answerqa-",dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,"w") as f:
            json.dump(data,f,sort_keys=True,indent=2,ensure_ascii=False)
            f.write("\n");f.flush();os.fsync(f.fileno())
        os.replace(temp,path)
    finally:
        if os.path.exists(temp):os.unlink(temp)

if __name__=="__main__":
    r=check(db_rows())
    write_private(RECEIPT,r)
    print(json.dumps({k:v for k,v in r.items() if k!="privateConflictingQuestionIdAndTypeOnly"},sort_keys=True))
    if r["substantiveOrStructuralAnswerConflicts"]>0 or r["missingAnswerRecords"]>0 or r["recordCompletenessIssues"] or r["unexpectedApprovedWithoutAuthenticatedReviewerEvidence"]>0 or r["mcqCandidates"]<800:
        raise SystemExit("GRADE910_PROVISIONAL_ANSWER_DATA_INTEGRITY_HOLD")
