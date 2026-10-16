#!/usr/bin/env python3
"""Build version-bound, private review priority for the 21 unproven live numericals."""
import collections,datetime,json,os,tempfile
from pathlib import Path
BASE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=BASE/'numerical-review-priority.json'
OK='LIVE_STEM_ANSWER_MATCH_DEEP_RECOMPUTED_ORIGINAL'
def build(src,review):
    if (src.get('schema')!='ASSPS_GRADE910_LIVE_NUMERICAL_REVISION_EVIDENCE_V1'
       or src.get('liveNumericals')!=80 or src.get('liveNumericStemAndAnswerIdenticalToDeepOriginal')!=59
       or src.get('liveNumericalCurrentRevisionMissingDeepComputation')!=21
       or review.get('schema')!='ASSPS_GRADE910_2581_LIVE_SOURCE_EVIDENCE_DELTA_V1'
       or review.get('liveContentRevisionHashEntries')!=2411):
        raise ValueError('NUMERIC_QA_OR_FACULTY_EVIDENCE_BASELINE_CHANGED')
    rmap={r['questionId']:r for r in review['records']}
    queue=[]
    for item in src['records']:
        qid=item['questionId']
        if qid not in rmap:raise ValueError('MISSING_FACULTY_SOURCE_CROSSWALK')
        r=rmap[qid]
        if (r['actualLiveContentRevisionSha256']!=item['currentLiveRevisionSha256']
            or str(r['grade'])!=str(item['grade']).replace('th','')
            or str(r['subject']).casefold()!=str(item['subject']).casefold()):
            raise ValueError('NUMERIC_LIVE_REVISION_DRIFT')
        if (item['qualifiedReviewerApproved'] or item['paperStudioVerifiedSelectable']
            or item['exactBookExercisePageVerified']):
            raise ValueError('UNVERIFIED_NUMERIC_PUBLICATION')
        if item['category']==OK:continue
        queue.append({'questionId':qid,'currentRevisionSha256':item['currentLiveRevisionSha256'],
          'frozenRevisionSha256':item['sourceFrozenOriginalRevisionSha256'],
          'grade':item['grade'],'subject':item['subject'],'facultyGroupKey':r['existingGroupKey'],
          'evidenceGap':item['category'],'reviewRequirements':[
             'independent_arithmetic_recomputation_from_current_stem_and_units',
             'compare_final_result_and_significant_figures_against_current_answer',
             'authenticate_source_book_edition_page_and_school_adoption',
             'qualified_faculty_review_for_exact_live_revision'],
          'machineApproved':False,'paperStudioSelectable':False})
    queue.sort(key=lambda x:(x['grade'],x['subject'],x['questionId']))
    if len(queue)!=21 or len({x['questionId'] for x in queue})!=21:
        raise ValueError('UNRESOLVED_NUMERICAL_COHORT_DRIFT')
    return {'schema':'ASSPS_GRADE910_21_NUMERIC_RECOMPUTATION_QUEUE_V1',
        'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'liveNumericals':80,'exactContentMatchedToDeeperMachineReference':59,
        'stillNeedCurrentRevisionIndependentRecomputation':21,
        'pendingByGradeSubject':[{'grade':g,'subject':s,'count':n} for (g,s),n in
             sorted(collections.Counter((r['grade'],r['subject']) for r in queue).items())],
        'qualifiedReviewerApprovals':0,'publicationEligibleFromThisEvidence':0,
        'databaseWrites':0,'rawQuestionTextPersisted':False,'records':queue}
def persist(report,path=OUT):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if path.parent.stat().st_mode&0o077:raise ValueError('PRIVATE_OUTPUT_DIR_REQUIRED')
    fd,p=tempfile.mkstemp(prefix='.numeric-review-',dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(report,f,sort_keys=True,indent=2);f.write('\n')
            f.flush();os.fsync(f.fileno())
        os.replace(p,path)
    finally:
        if os.path.exists(p):os.unlink(p)
if __name__=='__main__':
    x=build(json.loads((BASE/'live-numerical-evidence.json').read_text()),
            json.loads((BASE/'faculty-source-evidence-delta.json').read_text()))
    persist(x)
    print(json.dumps({k:v for k,v in x.items() if k!='records'}))
