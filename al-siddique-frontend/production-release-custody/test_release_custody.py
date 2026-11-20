#!/usr/bin/env python3
"""Regression checks for immutable production release integrity."""
from __future__ import annotations
import importlib.util
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent/'2026-11-20-1713'
spec = importlib.util.spec_from_file_location('a335_release_guard_under_test', ROOT/'release_guard.py')
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class A335ReleaseGateTests(unittest.TestCase):
    def test_unmodified_custody_passes(self):
        output=module.analyze(ROOT,ROOT)
        self.assertEqual(output['verdict'],'PASS')
        self.assertEqual(output['blockers_total'],0)
    def test_missing_navigation_script_is_blocked(self):
        html=(ROOT/'index.html').read_bytes()
        script=b'/assets/assps-a336-unified-navigation-20261120.js'
        self.assertEqual(html.count(script),1)
        mutation=html.replace(script,b'/assets/NAVIGATION_MISSING.js')
        result=module.analyze(ROOT,ROOT,mutation)
        self.assertEqual(result['verdict'],'BLOCK')
        self.assertTrue(any('navigation' in x.lower() for x in result['blockers']))
    def test_import_map_replacement_is_blocked(self):
        original=(ROOT/'index.html').read_bytes()
        mapping=module.parse_index(original)[0]
        target=mapping['/assets/PTSPaperGenerator-BpXA1Uc2.js']
        self.assertEqual(original.count(target.encode()),1)
        mutated=original.replace(target.encode(),b'/assets/OUTDATED_PAPER_EDITOR.js')
        result=module.analyze(ROOT,ROOT,mutated)
        self.assertEqual(result['verdict'],'BLOCK')
        self.assertTrue(any('import-map overlay' in x for x in result['blockers']))
    def test_non_original_asset_is_blocked(self):
        # Read-only source: copy 40 vetted assets into a temporary candidate tree.
        with tempfile.TemporaryDirectory(prefix='assps-a335-candidate-') as folder:
            target=Path(folder)
            for rel in [x['path'] for x in json.loads((ROOT/'manifest.json').read_text())['reference_files']]:
                dest=target/rel.lstrip('/')
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(ROOT/rel.lstrip('/'),dest)
            shutil.copyfile(ROOT/'index.html',target/'index.html')
            altered=target/'assets/assps-a336-unified-navigation-20261120.js'
            altered.write_bytes(altered.read_bytes()+b'\n// tampered fixture')
            check=module.analyze(ROOT,target)
            self.assertEqual(check['verdict'],'BLOCK')
            self.assertTrue(any('Changed asset hash' in x for x in check['blockers']))
    def test_compare_exact_a342_a343_changes(self):
        tool=Path(__file__).resolve().parent/'compare_static_releases.py'
        sp=importlib.util.spec_from_file_location('a335_delta_under_test',tool)
        assert sp and sp.loader
        delta=importlib.util.module_from_spec(sp);sp.loader.exec_module(delta)
        old=delta.load_snapshot(ROOT.parent/'2026-11-20')
        new=delta.load_snapshot(ROOT)
        d=delta.changes(old,new)
        self.assertEqual(len(d['changed_import_map_targets']),2)
        self.assertEqual(d['files_added_count'],2)
        self.assertEqual(d['files_removed_count'],0)
        self.assertEqual(d['files_modified'],['index.html'])
        self.assertTrue(d['requires_explicit_release_review'])

if __name__ == '__main__':
    unittest.main(verbosity=2)

