#!/usr/bin/env python3
"""Frozen read-only School1 current-revision chapter/subject coverage inventory.

Counts live provisional records; never treats chapter labels as textbook mappings.
"""
from __future__ import annotations
import collections
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/question-bank/ASSPS_GRADE910_LIVE_SUBJECT_CHAPTER_COVERAGE_20261016.md'
STATE=Path('/var/lib/assps-grade910-sourceclaims/live-question-revisions.json')
EXPECTED={'9th':1530,'10th':881}
def build(rows,pinned,sha):
 if len(rows)!=2411 or pinned.get('revisions')!=2411:
  raise ValueError('LIVE_SUBJECT_COVERAGE_SCOPE_CHANGED')
 ids={r['questionId']:r['revisionSha256'] for r in pinned.get('records',[])}
 if len(ids)!=2411:raise ValueError('COVERAGE_REVISION_IDS_DUPLICATED')
 grade=collections.Counter()
 group=collections.defaultdict(lambda:{'type':collections.Counter(),'topics':set(),'chapters':set(),'count':0})
 ch=collections.defaultdict(collections.Counter)
 seen=set()
 for x in rows:
  id=x.get('id')
  if not id or id in seen:raise ValueError('DUPLICATE_OR_MISSING_SOURCE_ID')
  seen.add(id)
  if sha(x)!=ids.get(id):raise ValueError('LIVE_CHAPTER_COVERAGE_REVISION_DRIFT')
  g=str(x['grade']);subject=str(x['subject']);medium=str(x['medium'])
  if g not in EXPECTED:raise ValueError('UNEXPECTED_SCHOOL_GRADE')
  k=(g,subject,medium);b=group[k]
  key=str(x.get('chapter') or '').strip() or 'NOT_RECORDED'
  b['count']+=1;b['chapters'].add(key)
  if x.get('topic'):b['topics'].add(str(x['topic']).strip())
  b['type'][x['type']]+=1
  ch[(g,subject,medium,key)][x['type']]+=1
  grade[g]+=1
 if dict(grade)!=EXPECTED:raise ValueError('GRADE_CANDIDATE_INVENTORY_CHANGED')
 ordered=sorted(ids.items())
 digest=hashlib.sha256('\n'.join(id+'|'+sha for id,sha in ordered).encode()).hexdigest()
 lines=['# ASSPS Grade IX–X — Current Live Provisional Grade/Subject/Chapter Coverage',
        '',
        '**Read-only School1 snapshot, 16 October 2026. Research/triage only. NOT official textbook syllabus-completion proof or independently approved questions.**',
        '',
        'Source: all 2,411 current live provisional question rows, each checked against its current complete-content SHA256 revision ledger. No student data, staff details, question stems or answer text copied into this report.',
        '',
        '- Grade IX: **1,530 provisional candidates**; Grade X: **881 provisional candidates**.',
        '- SHA-256 of sorted stable-question-ID/full-current-content-revision pairs: `'+digest+'`.',
        '- Chapter numbers and topic names below are **stored research classifications**. Their textbook authority, adopted session/edition, correct printed page and exercise mapping remain independently UNVERIFIED.',
        '- Real qualified independently reviewed/approved/published items established by this inventory: **0**.',
        '- The count is NOT the full official syllabus coverage or guarantee of equal chapter-level depth. Do not seed, approve or publish from this report.',
        '',
        '## Grade/subject/medium summary',
        '',
        '| Grade | Subject | Medium | Provisional | Chapter labels | Topic labels | MCQ | Short | Long | Numeric | Other |',
        '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|']
 typecount=collections.Counter()
 for k in sorted(group,key=lambda k:(int(k[0].replace('th','')),k[1],k[2])):
  b=group[k];m=b['type'];typecount.update(m)
  rest=b['count']-sum(m.get(t,0) for t in ('mcq','short','long','numerical'))
  lines.append('| '+ ' | '.join([*k,str(b['count']),str(len(b['chapters'])),str(len(b['topics'])),
          str(m.get('mcq',0)),str(m.get('short',0)),str(m.get('long',0)),str(m.get('numerical',0)),str(rest)])+' |')
 lines+=['','## Stored chapter-label distribution (unverified)','',
         '| Grade | Subject | Medium | Stored chapter label | Provisional | Question types |',
         '|---|---|---|---|---:|---|']
 for k in sorted(ch,key=lambda k:(int(k[0].replace('th','')),k[1],k[2],str(k[3]))):
  c=ch[k]
  lines.append('| '+' | '.join([*k,str(sum(c.values())),
       ', '.join(t+':'+str(q) for t,q in sorted(c.items()))])+' |')
 lines+=['','## Publication protection',
          '',
          'Mechanical MCQ option parity, 80 live numerical recomputations and subjective-answer depth risk triage are separate machine QA. None provide teacher approval. Official PECTAA title listings, Grade IX annual exam-2026 ALP and Grade X 2026–27 public links **cannot** by themselves establish ASSPS-specific current textbook adoption or question-page verification.',
          '',
          'Proceed only after genuine adopted session/edition evidence, exact book page/exercise content corroboration, qualified independent subject/Urdu revision review and Core/Paper Studio authorized release.',
          '']
 if sum(typecount.values())!=2411:raise ValueError('TYPE_COUNTS_LOST')
 return '\n'.join(lines),len(group),len(ch)
def main():
 p=ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py'
 spec=importlib.util.spec_from_file_location('assps_coverage_existing',p)
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 pinned=json.loads(STATE.read_text())
 body,g,c=build(mod.read_live(),pinned,mod.revision_sha)
 OUT.write_text(body,encoding='utf8')
 print(json.dumps({'rows':2411,'gradeSubjectMediumGroups':g,
                   'storedChapterGroups':c,'productionDatabaseWrites':0,
                   'approvedOrPublishedByThisReport':0,'path':str(OUT)}))
if __name__=='__main__':main()
