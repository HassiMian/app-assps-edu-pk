"""Protect the 166 historical long-answer proposal crosswalk in one 6-phase receipt."""
import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def load(name,p):
    spec=importlib.util.spec_from_file_location(name,p)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    return m
phase=load('phase_research_crosswalk',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
old=load('prior_phase_synthetic',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
subject=load('subject_risk_synthetic',ROOT/'ops/tests/test_grade910_subjective_six_phase_gate_20261016.py')
DEF={
 'schema':'ASSPS_GRADE910_EXISTING_166_LONG_ANSWER_RESEARCH_LIVE_CROSSWALK_V1',
 'liveQuestionRevisionsLinked':2411,
 'uniqueHistoricalResearchLongIds':166,
 'historicalLongIdsWithAnySupplementalExplanatoryDraft':165,
 'historicalLongIdsWithoutSupplementalDraft':1,
 'liveLongQuestionIdsWithPriorResearchDraft':164,
 'liveRiskIdsWithPriorResearchDraft':154,
 'liveRiskIdsWithoutPriorResearchDraft':450,
 'highPriorityRiskIdsWithPriorResearchDraft':128,
 'highPriorityRiskIdsWithoutPriorResearchDraft':229,
 'previousTwentyPacketsAuthenticatedOriginalSha':20,
 'publicOutputContainsNoSchoolStemOrModelAnswer':True,
 'researchCandidatesAreNotIndependentTeacherReviews':True,
 'schoolAdoptedEditionVerifiedByThisAudit':False,
 'qualifiedAcademicApprovalsCreated':0,
 'academicallySelectableCreated':0,
 'productionDatabaseWrites':0,
 'records':[{'questionId':str(i)} for i in range(166)]
}
def evaluate(proof=DEF,risk=subject.RISKS):
    return phase.evaluate(*old.fixtures(),subjective_risk=risk,historic_answer_drafts=proof)
class PriorAnswerResearchPhaseTests(unittest.TestCase):
    def test_real_proposals_count_but_no_fake_staff_signatures(self):
        o=evaluate()
        self.assertEqual(o['liveLongQuestionsWithPriorUnapprovedExplanatoryResearch'],164)
        self.assertEqual(o['subjectiveDepthRiskFlagsWithPriorResearch'],154)
        self.assertEqual(o['subjectiveDepthRiskFlagsNeedingFreshModelResearch'],450)
        self.assertEqual(o['highPriorityAnswerRiskWithoutPriorResearch'],229)
        self.assertFalse(o['academicVerifiedPublicationReady'])
        self.assertTrue(o['priorLongAnswerDraftsAreNotTeacherReviews'])
    def test_missing_subjective_hash_crosswalk_refused(self):
        with self.assertRaisesRegex(ValueError,'HISTORICAL_ANSWER_RESEARCH_CROSSWALK_INVALID'):
            evaluate(risk=None)
    def test_forged_publication_or_changed_counts_refused(self):
        mutations={
         'qualifiedAcademicApprovalsCreated':1,
         'academicallySelectableCreated':1,
         'productionDatabaseWrites':1,
         'schoolAdoptedEditionVerifiedByThisAudit':True,
         'researchCandidatesAreNotIndependentTeacherReviews':False,
         'liveRiskIdsWithoutPriorResearchDraft':449,
         'liveRiskIdsWithPriorResearchDraft':155,
         'highPriorityRiskIdsWithPriorResearchDraft':129,
         'previousTwentyPacketsAuthenticatedOriginalSha':19
        }
        for k,v in mutations.items():
            with self.subTest(k=k):
                d=dict(DEF);d[k]=v
                with self.assertRaisesRegex(ValueError,'HISTORICAL_ANSWER_RESEARCH_CROSSWALK_INVALID'):
                    evaluate(proof=d)
    def test_missing_optional_historical_packets_backward_compatible(self):
        x=phase.evaluate(*old.fixtures(),subjective_risk=subject.RISKS)
        self.assertIsNone(x['liveLongQuestionsWithPriorUnapprovedExplanatoryResearch'])
        self.assertFalse(x['academicVerifiedPublicationReady'])
if __name__=='__main__':unittest.main()
