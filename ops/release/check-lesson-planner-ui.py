#!/usr/bin/env python3
"""Read-only static artifact/source contract. NO production changes.

Checks the *reachable* JS import graph from HTML instead of trusting a directory
that may retain stale but unused LessonPlanModule chunks. This is a release
contract, not an absolute version lock. Improvements are permitted provided
the new module satisfies the reviewed UX contract; adjust the versioned
contract and regression tests in source review when intentional UX evolves.

Examples:
  python3 ops/release/check-lesson-planner-ui.py --dist al-siddique-frontend/dist
  python3 ops/release/check-lesson-planner-ui.py --dist /var/www/current --no-source
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

HERE = Path(__file__).resolve().parent
DEFAULT_CONTRACT = HERE / "lesson-planner-ui-contract-v5.json"
DEFAULT_REPO = HERE.parents[1]
ASSET_PATTERN = re.compile(r"(?<![\w.-])([A-Za-z0-9_-]+\.(?:js|css))")
HTML_PATTERN = re.compile(r'(?:src|href)="\/assets\/([^"]+\.(?:js|css))"')


def validate(dist, contract, source=None):
    checks = {}
    details = {}
    dist = Path(dist)
    assets = dist / 'assets'
    try:
        html = (dist / "index.html").read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        return {"pass": False, "checks": {"html_available": False},
                "error": type(error).__name__, "dist": str(dist)}
    html_files = HTML_PATTERN.findall(html)
    entry = re.search(r'<script[^>]*type="module"[^>]*src="/assets/([^"]+\.js)"', html)
    checks['html_module_entry'] = entry is not None
    details['entry'] = entry.group(1) if entry else None
    pending = list(dict.fromkeys(html_files))
    seen = set()
    missing = []
    # Every lookup stays under dist/assets; no path traversal is accepted.
    while pending:
        name = pending.pop()
        if name in seen:
            continue
        seen.add(name)
        if "/" in name or "\\" in name or name.startswith("."):
            missing.append(name)
            continue
        path = assets / name
        if not path.is_file():
            missing.append(name)
            continue
        if name.endswith('.js'):
            content = path.read_text(encoding="utf-8", errors="replace")
            # Bundled JavaScript also contains data/document filenames, which
            # are not imports. Follow only names present in the current dist;
            # the entry, route and LessonPlanModule are checked independently.
            pending.extend(x for x in ASSET_PATTERN.findall(content)
                           if x not in seen and '-' in x.rsplit('.', 1)[0] and
                           len(x.rsplit('.', 1)[0]) >= 9 and
                           (assets / x).is_file())
    checks['no_missing_reachable_assets'] = not missing
    details['reachable_files'] = len(seen)
    details['missing_assets'] = sorted(set(missing))[:15]
    route_prefix = contract.get('protected_route_entry', 'PaperGenerator') + '-'
    lesson_prefix = contract['protected_runtime_entry'] + '-'
    active_routes = sorted(x for x in seen if x.startswith(route_prefix) and x.endswith('.js'))
    active_lessons = sorted(x for x in seen if x.startswith(lesson_prefix) and x.endswith('.js'))
    checks['one_active_paper_generator_route'] = len(active_routes) == 1
    checks['one_active_lesson_planner_module'] = len(active_lessons) == 1
    details['active_paper_generator_routes'] = active_routes
    details['active_lesson_modules'] = active_lessons
    markers = {}
    if len(active_lessons) == 1:
        lesson = assets / active_lessons[0]
        text = lesson.read_text(encoding='utf-8', errors='replace')
        for marker in contract['required_lesson_module_markers']:
            markers[marker] = marker in text
        checks['all_runtime_ui_markers'] = all(markers.values())
        details['lesson_module_sha256'] = hashlib.sha256(lesson.read_bytes()).hexdigest()
        details['lesson_module_bytes'] = lesson.stat().st_size
    else:
        checks['all_runtime_ui_markers'] = False
    details['runtime_markers'] = markers
    if source is not None:
        repo = Path(source)
        checks['all_source_module_files'] = all((repo / p).is_file()
                                                  for p in contract['required_source_files'])
        for path, expected in contract['required_source_markers'].items():
            try:
                filetext = (repo / path).read_text(encoding='utf-8')
                checks['source_contract_' + Path(path).stem] = all(x in filetext for x in expected)
            except OSError:
                checks['source_contract_' + Path(path).stem] = False
        for sha in contract['protected_ancestor_shas']:
            try:
                result = subprocess.run(['git', '-C', str(repo), 'merge-base', '--is-ancestor',
                                         sha, 'HEAD'], timeout=12, capture_output=True)
                checks['preserves_ancestor_' + sha[:10]] = result.returncode == 0
            except (OSError, subprocess.TimeoutExpired):
                checks['preserves_ancestor_' + sha[:10]] = False
    return {"pass": all(checks.values()), "checks": checks,
            "contract_version": contract['version'], "dist": str(dist),
            "details": details, "result": "PASS" if all(checks.values()) else "FAIL"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dist', required=True)
    parser.add_argument('--repo', default=str(DEFAULT_REPO))
    parser.add_argument('--contract', default=str(DEFAULT_CONTRACT))
    parser.add_argument('--no-source', action='store_true')
    args = parser.parse_args()
    try:
        contract = json.loads(Path(args.contract).read_text(encoding='utf-8'))
        if contract.get('schema') != 'ASSPS_LESSON_PLANNER_UI_CONTRACT':
            raise ValueError('Wrong contract schema')
        result = validate(args.dist, contract, None if args.no_source else args.repo)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        result = {"pass": False, "error": type(exc).__name__, "result": "FAIL"}
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result['pass'] else 2


if __name__ == '__main__':
    sys.exit(main())
