"""Fail-closed, read-only verification of owner-issued Ed25519 release acceptance receipts.

This module never creates keys, user sessions, approvals, or evidence. An authentic
SaaS Core release attestor must sign every real browser/security test. Until such
a pinned, trusted attestor and actual receipts exist, all acceptance gates are HOLD.
"""
import base64
import datetime as dt
import json
import re
from pathlib import Path

from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

PUBLIC_KEY = Path('/etc/assps/release-evidence-ed25519.pub')
KINDS = ('teacher_save_reload_print', 'real_peer_school_denial', 'traffic_rollback', 'grade_revision_authenticated')
EXPECTED_SCHOOL = 1
EXPECTED_EXAM = 9


def _nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def _parse_time(value):
    if not isinstance(value, str):
        return None
    try:
        x = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        return x if x.tzinfo is not None else None
    except ValueError:
        return None


def _valid_claim(kind, c):
    if not isinstance(c, dict):
        return False
    if c.get('school_id') != EXPECTED_SCHOOL or c.get('exam_id') != EXPECTED_EXAM:
        return False
    if c.get('environment') != 'production' or c.get('auth_session_verified') is not True:
        return False
    if not _nonempty(c.get('backend_commit')) or not _nonempty(c.get('core_release_id')):
        return False
    if not _nonempty(c.get('evidence_digest')) or not re.fullmatch(r'[a-f0-9]{64}', c['evidence_digest']):
        return False
    if kind == 'teacher_save_reload_print':
        return (
            c.get('actor_role') == 'teacher'
            and isinstance(c.get('actor_user_id'), int) and c['actor_user_id'] > 0
            and c.get('actor_school_id') == EXPECTED_SCHOOL
            and c.get('actor_scope_exact') is True
            and c.get('save_http_status') in (200, 201)
            and c.get('idempotent_existing_score') is True
            and c.get('reloaded_score_matches') is True
            and c.get('browser_print_window_opened') is True
            and c.get('original_marks_unchanged') is True
        )
    if kind == 'real_peer_school_denial':
        return (
            c.get('actor_role') in ('teacher', 'admin', 'principal')
            and isinstance(c.get('actor_user_id'), int) and c['actor_user_id'] > 0
            and isinstance(c.get('actor_school_id'), int)
            and c['actor_school_id'] != EXPECTED_SCHOOL
            and c.get('peer_token_cryptographically_verified') is True
            and c.get('cross_tenant_http_status') in (403, 404)
            and c.get('requested_school_id') == EXPECTED_SCHOOL
            and c.get('same_school_positive_verified') is True
            and c.get('no_school_a_records_returned') is True
        )
    if kind == 'grade_revision_authenticated':
        return (
            c.get('actor_role') in ('principal', 'admin')
            and isinstance(c.get('actor_user_id'), int) and c['actor_user_id'] > 0
            and c.get('actor_school_id') == EXPECTED_SCHOOL
            and c.get('approved_grade_changes') == 112
            and c.get('revision_actor_bound_to_session') is True
            and c.get('original_scores_preserved') is True
            and c.get('grade_change_ledger_verified') is True
            and c.get('old_301_grade_digest') == '0376ec1d25555b0dfc963857564b36aa'
            and c.get('new_301_grade_digest') == '0e0115e1bdafa8c56edb174da6241f3a'
            and c.get('original_301_score_digest') == 'bcdc098a3e6cabb6f4c31736b14e39b9'
        )
    if kind == 'traffic_rollback':
        return (
            c.get('actor_role') in ('admin', 'release_operator')
            and c.get('traffic_canary_switched') is True
            and c.get('traffic_rollback_executed') is True
            and c.get('nginx_check_passed') is True
            and c.get('pm2_healthy_after_rollback') is True
            and c.get('result_row_counts_identical') is True
            and c.get('original_score_digest_identical') is True
            and c.get('school_ingress_http_status') == 200
            and c.get('connect_health_http_status') == 200
            and _nonempty(c.get('restored_release_id'))
        )
    return False


def verified_receipt_gates(path, now=None, public_key=PUBLIC_KEY):
    """Return verified booleans, never a claimed approval. Untrusted or absent => all false."""
    gates = {kind: False for kind in KINDS}
    if not path or not public_key:
        return gates
    path, public_key = Path(path), Path(public_key)
    if not path.is_file() or not public_key.is_file():
        return gates
    if path.is_symlink() or public_key.is_symlink():
        return gates
    if path.stat().st_size > 128 * 1024 or public_key.stat().st_size > 4096:
        return gates
    try:
        pem = public_key.read_bytes()
        verifier = load_pem_public_key(pem)
        if not isinstance(verifier, Ed25519PublicKey):
            return gates
        doc = json.loads(path.read_text(encoding='utf-8'))
        if doc.get('schema') != 'assps-school-release-receipts-v1':
            return gates
        events = doc.get('events')
        if not isinstance(events, list) or len(events) > 16:
            return gates
        current = now or dt.datetime.now(dt.timezone.utc)
        seen = set()
        for event in events:
            if not isinstance(event, dict) or set(event) != {'kind', 'claims', 'signature'}:
                continue
            kind, claims = event['kind'], event['claims']
            if kind not in KINDS or kind in seen or not _valid_claim(kind, claims):
                continue
            issued = _parse_time(claims.get('verified_at'))
            if issued is None or not dt.timedelta(0) <= current - issued <= dt.timedelta(hours=24):
                continue
            signed = json.dumps({'kind':kind, 'claims':claims}, sort_keys=True, separators=(',', ':')).encode('utf-8')
            sig = base64.b64decode(event['signature'], validate=True)
            verifier.verify(sig, signed)
            gates[kind] = True
            seen.add(kind)
    except (OSError, ValueError, TypeError, KeyError):
        return {kind: False for kind in KINDS}
    except Exception:
        # Includes any cryptographic signature error. Never trust a partly valid set.
        return {kind: False for kind in KINDS}
    return gates
