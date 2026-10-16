import importlib.util
import tempfile
import unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/"qbank"/"audit-grade910-live-answer-integrity-20261016.py"
spec=importlib.util.spec_from_file_location("answerqa",P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def base(id,kind="short"):
    return {"id":str(id),"grade":"9th","subject":"Biology","type":kind,
            "medium":"english","answer":"An accurate scientific description.","correct":None,
            "options":None,"chapter":1,"topic":"Science", "marks":2,
            "difficulty":"easy","approved":False,"urdu":None,
            "english":"Independent research task"}
def dataset():
    rows=[base(i) for i in range(2409)]
    for i in range(2409,2411):
        r=base(i,"mcq");r["answer"]="Oxygen.";r["correct"]="B"
        r["options"]=[{"id":"A","text":"Carbon"},{"id":"B","text":"Oxygen"},{"id":"C","text":"Hydrogen"},{"id":"D","text":"Nitrogen"}]
        rows.append(r)
    return rows
class LiveAnswerValidationTests(unittest.TestCase):
    def test_terminal_punctuation_only_does_not_fake_answer_error(self):
        r=m.check(dataset())
        self.assertEqual(r["terminalPunctuationOnlyDifferences"],2)
        self.assertEqual(r["substantiveOrStructuralAnswerConflicts"],0)
        self.assertEqual(r["unexpectedApprovedWithoutAuthenticatedReviewerEvidence"],0)
    def test_changed_true_scientific_answer_is_detected(self):
        rows=dataset();rows[-1]["answer"]="Carbon."
        r=m.check(rows)
        self.assertEqual(r["substantiveOrStructuralAnswerConflicts"],1)
        self.assertEqual(r["privateConflictingQuestionIdAndTypeOnly"][0]["id"],rows[-1]["id"])
    def test_same_id_cannot_pass(self):
        rows=dataset();rows[-1]["id"]=rows[0]["id"]
        with self.assertRaises(ValueError):m.check(rows)
    def test_urdu_blank_field_detected(self):
        rows=dataset();rows[0]["medium"]="Urdu";rows[0]["urdu"]=None
        self.assertEqual(m.check(rows)["recordCompletenessIssues"]["MISSING_LANGUAGE_TEXT"],1)
    def test_approved_flag_triggers_unverified_status(self):
        rows=dataset();rows[0]["approved"]=True
        self.assertEqual(m.check(rows)["unexpectedApprovedWithoutAuthenticatedReviewerEvidence"],1)
    def test_options_with_duplicate_normalized_text_fail(self):
        rows=dataset();rows[-1]["options"][2]["text"]="oxygen!"
        self.assertEqual(m.check(rows)["substantiveOrStructuralAnswerConflicts"],1)
    def test_private_receipt_atomic_permissions(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"rootprivate"/"receipt.json"
            m.write_private(p,{"academicApproved":False})
            self.assertEqual(p.stat().st_mode&0o777,0o600)
if __name__=="__main__":unittest.main()
