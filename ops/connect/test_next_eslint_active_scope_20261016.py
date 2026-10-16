"""Fail-closed source integrity checks for the reviewed, non-release Next lint handoff."""
import hashlib
from pathlib import Path
import unittest

FILE = Path(__file__).with_name('recovery') / 'reviewed-next-eslint-active-scope-20261016.mjs'
SHA256 = 'b064360d718fdfbfcdb177dfdf30884505cddabc757d2c155c37dadc22648aff'

class ReviewedLintScopeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = FILE.read_text()

    def test_exact_bytes(self):
        self.assertEqual(hashlib.sha256(FILE.read_bytes()).hexdigest(), SHA256)

    def test_react_is_registered_not_disabled(self):
        self.assertIn('plugins: { react: reactPlugin }', self.source)
        self.assertIn('"react/no-unescaped-entities": "warn"', self.source)

    def test_commonjs_override_is_narrow(self):
        self.assertIn('files: ["**/*.cjs"]', self.source)
        for path in ('find_client_issues.js', 'scan_client_missing.js', 'scan_client_routes.js', 'prisma/lock-assps-data.js', 'prisma/seed-demo.js'):
            self.assertIn('"' + path + '"', self.source)
        self.assertEqual(self.source.count('"@typescript-eslint/no-require-imports": "off"'), 2)
        self.assertNotIn('files: ["**/*.js"]', self.source)

    def test_only_archived_snapshot_glob_ignored(self):
        self.assertIn('"src-backup-*/**"', self.source)
        self.assertNotIn('"src/**"', self.source)

    def test_active_react_and_typescript_enforcement_preserved(self):
        self.assertIn('"@typescript-eslint/no-explicit-any": "warn"', self.source)
        self.assertIn('"@typescript-eslint/no-unused-vars": "warn"', self.source)
        self.assertNotIn('files: ["**/*.ts", "**/*.tsx"]', self.source)

if __name__ == '__main__':
    unittest.main()
