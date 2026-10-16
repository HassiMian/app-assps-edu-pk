"""Static, pure source safety contracts; real Chrome on Windows is separate."""
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name('verify_windows_jameel_pdf_embedding_20261016.ps1')

class WindowsLocalPdfA4Contract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.script = SCRIPT.read_text(encoding='utf-8').lstrip('\ufeff')

    def test_css_explicit_iso_a4(self):
        self.assertIn('@page{size:A4;margin:12mm}', self.script)

    def test_pdf_mediabox_actually_checked(self):
        for condition in ('/MediaBox', "if (!$mediaBox.Success)", '$pageWidth', '$pageHeight'):
            with self.subTest(condition=condition):self.assertIn(condition,self.script)

    def test_a4_points_and_tolerance(self):
        self.assertIn('$pageWidth - 595.28',self.script)
        self.assertIn('$pageHeight - 841.89',self.script)
        self.assertGreaterEqual(self.script.count('-gt 4'),2)

    def test_jameel_font_and_embedding_binary_still_checked(self):
        for target in ('Jameel#20Noori#20Nastaleeq#20Kasheeda', '/FontFile2', '/FontFile3'):
            with self.subTest(target=target):self.assertIn(target,self.script)

    def test_fails_closed_when_mediabox_is_absent_or_not_a4(self):
        for target in ('A4_MEDIABOX_MISSING', 'PDF_NOT_A4'):
            with self.subTest(target=target):self.assertGreaterEqual(self.script.count(target),2)

    def test_never_accesses_printer_queue_or_school_site(self):
        for target in ('Start-PrintJob', 'Out-Printer', 'Start-Process -Verb Print', 'app.assps.edu.pk', 'api.assps.edu.pk'):
            with self.subTest(target=target):self.assertNotIn(target,self.script)
        self.assertIn('physicalPrinterUsed=$false',self.script)
        self.assertIn('releaseAuthorized=$false',self.script)

    def test_temporary_browser_profile_and_pdf_removed(self):
        for target in ('--user-data-dir=$work\\chrome-profile','--headless=new','Remove-Item -LiteralPath $work -Recurse -Force'):
            with self.subTest(target=target):self.assertIn(target,self.script)

    def test_not_an_actual_school_printer_certification(self):
        for target in ('officialPaperPrintCertified=$false',"'WINDOWS_LOCAL_JAMEEL_EMBEDDED_PASS_NOT_RELEASE'"):
            with self.subTest(target=target):self.assertIn(target,self.script)

if __name__=='__main__': unittest.main()
