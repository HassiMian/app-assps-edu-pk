import importlib.util
from pathlib import Path
import tempfile
import unittest

p = Path(__file__).with_name("verify-urdu-pdf-font-20261012.py")
spec = importlib.util.spec_from_file_location("urdu_pdf", p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class TestUrduPdfPreflight(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def pdf(self, name, body):
        path = self.root / name
        path.write_bytes(b"%PDF-1.7\n" + body + b"\n%%EOF")
        return path

    def test_jameel_subset_name_visible_but_hardware_false(self):
        result = m.inspect(self.pdf("j.pdf", b"/FontName /AAAAAA+JameelNooriNastaleeq " + b" " * 70))
        self.assertEqual(result["status"], "PASS_JAMEEL_FONT_NAME_DETECTED_ONLY")
        self.assertFalse(result["print_hardware_certified"])

    def test_pdf_hash_escaped_name(self):
        result = m.inspect(self.pdf("j.pdf", b"/BaseFont /BBBB+Jameel#20Noori#20Nastaleeq" + b" " * 70))
        self.assertEqual(result["status"], "PASS_JAMEEL_FONT_NAME_DETECTED_ONLY")

    def test_noto_only_fails(self):
        result = m.inspect(self.pdf("n.pdf", b"/FontName /NotoNastaliqUrdu" + b" " * 70))
        self.assertEqual(result["status"], "HOLD_JAMEEL_NOT_VERIFIED")

    def test_fontfamily_claim_alone_cannot_pass(self):
        result = m.inspect(self.pdf("n.pdf", b"/FontFamily (Jameel Noori Nastaleeq)" + b" " * 70))
        self.assertEqual(result["status"], "HOLD_JAMEEL_NOT_VERIFIED")

    def test_no_font_metadata_fails(self):
        result = m.inspect(self.pdf("n.pdf", b"0" * 70))
        self.assertFalse(result["font_names_visible"])

    def test_symlink_refused(self):
        target = self.pdf("real.pdf", b"/FontName /JameelNoori" + b" " * 70)
        link = self.root / "link.pdf"
        link.symlink_to(target)
        with self.assertRaisesRegex(ValueError, "non-symlink"):
            m.inspect(link)

    def test_invalid_file_refused(self):
        invalid = self.root / "invalid.pdf"
        invalid.write_bytes(b"bad" * 35)
        with self.assertRaisesRegex(ValueError, "header"):
            m.inspect(invalid)

    def test_no_file_refused(self):
        with self.assertRaises(ValueError):
            m.inspect(self.root / "absent.pdf")


if __name__ == "__main__":
    unittest.main()
