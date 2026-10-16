#!/usr/bin/env python3
"""Prevent regression of the reviewed Next.js ESLint configuration repair."""
import hashlib
from pathlib import Path
import unittest

FILE=Path(__file__).with_name("recovery")/"reviewed-next-eslint-config-20261016.mjs"
EXPECTED_SHA256="520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83"

def validate(text:str)->bool:
    # ESLint 9 flat config requires react plugin registered in the same config
    # object as react/no-unescaped-entities; only CommonJS gets the override.
    normalized=text.replace(' ', '').replace('\n','')
    return (
      'import reactPlugin from "eslint-plugin-react";' in text
      and 'plugins: { react: reactPlugin }' in text
      and '"react/no-unescaped-entities": "warn"' in text
      and 'files: ["**/*.cjs"]' in text
      and 'rules: { "@typescript-eslint/no-require-imports": "off" }' in text
      and '"@typescript-eslint/no-explicit-any": "warn"' in text
      and '"@typescript-eslint/no-unused-vars": "warn"' in text
      and 'files: ["**/*.ts", "**/*.tsx"]' not in text
      and 'rules: { "@typescript-eslint/no-require-imports": "off" },\n  // Override' not in text
    )

class EslintConfigRecoveryTests(unittest.TestCase):
    def test_checksum_pins_exact_reviewed_source(self):
        self.assertEqual(hashlib.sha256(FILE.read_bytes()).hexdigest(),EXPECTED_SHA256)
    def test_reviewed_config_valid(self):
        self.assertTrue(validate(FILE.read_text()))
    def test_missing_plugin_import_fails(self):
        self.assertFalse(validate(FILE.read_text().replace('import reactPlugin from "eslint-plugin-react";','')))
    def test_missing_plugin_registration_fails(self):
        self.assertFalse(validate(FILE.read_text().replace('plugins: { react: reactPlugin },','')))
    def test_missing_commonjs_override_fails(self):
        self.assertFalse(validate(FILE.read_text().replace('files: ["**/*.cjs"]','files: ["**/*.js"]')))
    def test_disabled_react_safety_rule_fails(self):
        self.assertFalse(validate(FILE.read_text().replace('"react/no-unescaped-entities": "warn"','"react/no-unescaped-entities": "off"')))
    def test_no_unrestricted_typescript_any(self):
        self.assertFalse(validate(FILE.read_text().replace('"@typescript-eslint/no-explicit-any": "warn"','"@typescript-eslint/no-explicit-any": "off"')))
    def test_no_generic_unused_var_suppression(self):
        self.assertFalse(validate(FILE.read_text().replace('"@typescript-eslint/no-unused-vars": "warn"','"@typescript-eslint/no-unused-vars": "off"')))
if __name__=='__main__':
    unittest.main()
