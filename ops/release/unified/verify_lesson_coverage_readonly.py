#!/usr/bin/env python3
"""Read-only official timetable-to-lesson coverage reconciliation.

Counts exact subject-class matches only. Broad, unscoped or translated plan
headings remain review-required rather than being assumed academically valid.
No school data, grades, plans or permissions are changed.
"""
import json
import re
import subprocess

SQL = """
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='10000ms';
SELECT 'GRANT|'||class_name||'|'||section||'|'||subject
FROM public.teacher_class_assignments
WHERE school_id=1 AND is_active=true AND source='timetable_verified_20261019'
ORDER BY class_name,section,subject;
SELECT 'PLAN|'||coalesce(class_level,'')||'|'||coalesce(subject,'')||'|'||coalesce(sent_to_portal::text,'false')||'|'||coalesce(planning_scope,'')
FROM public.lesson_plans WHERE school_id=1 ORDER BY id;
COMMIT;
"""
WORDS={'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6',
       'seven':'7','eight':'8','nine':'9','ten':'10','pre-nine':'pre-nine'}

def class_key(label):
    s=re.sub(r'\s+',' ',str(label).strip().lower())
    s=re.sub(r'^(class|grade)\s+','',s)
    return WORDS.get(s,s)

def subject_key(label):
    return re.sub(r'\s+',' ',str(label).strip().lower())

def parse(raw):
    grants=[];plans=[]
    for line in raw.splitlines():
        parts=line.split('|')
        if len(parts)==4 and parts[0]=='GRANT':
            _,cls,section,subject=parts
            if not (cls.strip() and section.strip() and subject.strip()):
                raise ValueError('Unscoped approved subject mapping')
            grants.append((class_key(cls),section.strip().lower(),subject_key(subject)))
        elif len(parts)==5 and parts[0]=='PLAN':
            _,cls,subject,portal,scope=parts
            if portal not in ('true','false'):
                raise ValueError('Invalid portal publication metadata')
            plans.append({'class':class_key(cls),'subject':subject_key(subject),
                          'published':portal=='true','scope':scope.strip().lower()})
        else:
            raise ValueError('Unexpected lesson coverage evidence format')
    if not grants or len(set(grants)) != len(grants):
        raise ValueError('Missing or duplicated approved subject mappings')
    return grants,plans

def classify(grants,plans):
    # The schema has no plan section. This is *candidate coverage*, not proof
    # that the lesson has been approved for the exact section or curriculum.
    covered=set()
    for g in grants:
        if any(g[0]==p['class'] and g[2]==p['subject'] for p in plans):
            covered.add(g)
    unmapped=[p for p in plans if not any(g[0]==p['class'] and g[2]==p['subject'] for g in grants)]
    published=sum(p['published'] for p in plans)
    return {'pass':True,'official_active_subject_groups':len(grants),
            'existing_lesson_plans':len(plans),
            'exact_class_subject_candidate_matches':len(covered),
            'without_exact_class_subject_plan':len(grants)-len(covered),
            'unmapped_or_broad_plan_headings':len(unmapped),
            'published_plan_rows':published,
            'section_level_coverage_certified':False,
            'academic_content_approval_certified':False,
            'lesson_coverage_certified':False,
            'interpretation':'EXACT_METADATA_MATCH_IS_NOT_APPROVED_CURRICULUM_OR_PUBLICATION'}

def inspect():
    r=subprocess.run(['runuser','-u','postgres','--','psql','-p','5432',
        '-d','apexos','-X','-qAt','-v','ON_ERROR_STOP=1'],input=SQL,text=True,
        capture_output=True,timeout=16,check=False)
    if r.returncode:raise RuntimeError('Lesson coverage read-only query failed')
    grants,plans=parse(r.stdout)
    return classify(grants,plans)

if __name__=='__main__':
    try:
        print(json.dumps(inspect(),indent=2,sort_keys=True))
    except (OSError,RuntimeError,ValueError,subprocess.TimeoutExpired) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
