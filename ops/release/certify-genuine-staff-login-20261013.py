#!/usr/bin/env python3
"""Interactive REAL staff login acceptance. Never sign JWTs, reuse demo fallbacks, or save passwords.

Run from a trusted, interactive SSH terminal only. Read-only HTTP tests; never save Marks.
All tokens and passwords remain transient in memory, and no staff PII is logged.
"""
import argparse
import getpass
import http.cookiejar
import json
import re
import sys
import urllib.error
import urllib.request

PUBLIC = 'https://app.assps.edu.pk'
GREEN = 'http://127.0.0.1:5091'
AGENT = 'ASSPS-Authorized-Staff-Acceptance/20261013'
PRINCIPAL = {'admin', 'school_admin', 'principal'}
MAX_BODY = 1024 * 1024


class GateError(RuntimeError):
    pass


class Session:
    def __init__(self):
        self.cookiejar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookiejar))
        self.token = None

    def request(self, base, path, method='GET', body=None, authenticated=True):
        headers = {'User-Agent': AGENT, 'Accept': 'application/json'}
        if authenticated and self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        if base == GREEN:
            headers['Host'] = 'app.assps.edu.pk'
        payload = json.dumps(body).encode() if body is not None else None
        if payload is not None:
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(base + path, data=payload,
                                     method=method, headers=headers)
        try:
            resp = self.opener.open(req, timeout=10)
        except urllib.error.HTTPError as e:
            resp = e
        except Exception as e:
            raise GateError('HTTP_TRANSPORT_' + type(e).__name__) from None
        with resp:
            status = resp.status
            content = resp.read(MAX_BODY + 1)
        if len(content) > MAX_BODY:
            raise GateError('OVERSIZE_HTTP_RESPONSE')
        try:
            parsed = json.loads(content)
        except (json.JSONDecodeError, UnicodeDecodeError):
            parsed = {}
        return status, parsed


def user_from(payload):
    if not isinstance(payload, dict):
        return None
    user = payload.get('user') or (payload.get('data') or {}).get('user')
    return user if isinstance(user, dict) else None


def identity(user):
    if not user:
        raise GateError('MISSING_ACTOR_IDENTITY')
    role = str(user.get('role', '')).lower().strip()
    uid = str(user.get('id', '')).strip()
    school = str(user.get('school_id', '')).strip()
    if not role or not uid or not school or school == 'None':
        raise GateError('MISSING_STAFF_ROLE_OR_SCHOOL')
    return role, uid, school


def login_staff(category):
    login = input('Authorized ' + category + ' login ID: ').strip()
    password = getpass.getpass('Authorized ' + category + ' password (hidden): ')
    if not login or not password:
        raise GateError('REQUIRED_AUTHENTIC_LOGIN_MISSING')
    session = Session()
    status, payload = session.request(PUBLIC, '/api/auth/login', method='POST',
                                      body={'email': login, 'password': password},
                                      authenticated=False)
    password = None
    if status != 200 or not isinstance(payload, dict):
        raise GateError(category.upper() + '_REAL_LOGIN_HTTP_' + str(status))
    if 'demo' in str(payload.get('message', '')).lower():
        raise GateError('DEMO_FALLBACK_IS_NOT_GENUINE_STAFF_LOGIN')
    token = payload.get('token')
    if not isinstance(token, str) or token.count('.') != 2:
        raise GateError(category.upper() + '_NO_SERVER_ISSUED_JWT')
    login_user = user_from(payload)
    if not login_user:
        raise GateError(category.upper() + '_LOGIN_USER_MISSING')
    session.token = token
    status, me_payload = session.request(PUBLIC, '/api/auth/me')
    if status != 200:
        raise GateError(category.upper() + '_SESSION_CONTINUITY_HTTP_' + str(status))
    actor = identity(user_from(me_payload))
    if actor != identity(login_user):
        raise GateError(category.upper() + '_LOGIN_AND_ME_ACTOR_MISMATCH')
    if category == 'principal' and actor[0] not in PRINCIPAL:
        raise GateError('REAL_PRINCIPAL_ROLE_MISMATCH')
    if category == 'teacher' and actor[0] != 'teacher':
        raise GateError('REAL_TEACHER_ROLE_MISMATCH')
    if category == 'peer' and actor[0] not in PRINCIPAL:
        raise GateError('REAL_PEER_ADMIN_ROLE_MISMATCH')
    print('REAL_' + category.upper() + '_LOGIN_AND_SESSION=PASS', flush=True)
    return session, actor


def array_data(payload):
    if not isinstance(payload, dict):
        return None
    if isinstance(payload.get('data'), list):
        return payload['data']
    if isinstance(payload.get('results'), list):
        return payload['results']
    if isinstance(payload.get('exams'), list):
        return payload['exams']
    if isinstance(payload.get('data'), dict):
        for key in ('results', 'exams', 'records'):
            if isinstance(payload['data'].get(key), list):
                return payload['data'][key]
    return None


def must_get(session, category, base, path):
    status, body = session.request(base, path)
    if status != 200:
        raise GateError(category.upper() + '_READ_HTTP_' + str(status))
    return body


def run(require_peer):
    # Never ask for passwords in non-interactive jobs or print session material.
    if not sys.stdin.isatty():
        raise GateError('AUTHORIZED_INTERACTIVE_STAFF_LOGIN_REQUIRED')
    anonymous = Session()
    anon_status, _ = anonymous.request(PUBLIC, '/api/exams/results?exam_ids=9')
    if anon_status != 401:
        raise GateError('ANONYMOUS_RESULTS_NOT_DENIED')
    print('ANONYMOUS_RESULTS_DENIAL=PASS')

    principal, pi = login_staff('principal')
    teacher, ti = login_staff('teacher')
    if pi[2] != ti[2] or pi[1] == ti[1]:
        raise GateError('STAFF_ACTOR_OR_SCHOOL_RELATION_MISMATCH')
    print('DISTINCT_PRINCIPAL_TEACHER_SAME_SCHOOL=PASS')

    for name, sess in [('principal', principal), ('teacher', teacher)]:
        for base, label in [(PUBLIC, 'public'), (GREEN, 'restricted_green')]:
            must_get(sess, name, base, '/api/exams')
            must_get(sess, name, base, '/api/exams/results?exam_ids=9')
            print('REAL_' + name.upper() + '_' + label.upper() + '_MARKS_GET=PASS')

    # A forged token is not a generated signature and must fail without mutating data.
    original = principal.token
    sig = original.split('.')[-1]
    if not sig or not re.fullmatch('[A-Za-z0-9_-]+', sig):
        raise GateError('UNEXPECTED_JWT_SIGNATURE_FORMAT')
    principal.token = original.rsplit('.', 1)[0] + '.' + ('A' if sig[0] != 'A' else 'B') + sig[1:]
    try:
        tampered, _ = principal.request(GREEN, '/api/exams/results?exam_ids=9')
    finally:
        principal.token = original
    if tampered != 401:
        raise GateError('TAMPERED_STAFF_JWT_NOT_DENIED')
    print('TAMPERED_STAFF_TOKEN_DENIED=PASS')

    if require_peer:
        peer, pe = login_staff('peer')
        if pe[2] == pi[2]:
            raise GateError('PEER_MUST_BELONG_TO_DIFFERENT_SCHOOL')
        mine = array_data(must_get(principal, 'principal', GREEN, '/api/exams/results?exam_ids=9'))
        other = array_data(must_get(peer, 'peer', GREEN, '/api/exams/results?exam_ids=9'))
        if mine is None or other is None or len(mine) == 0 or len(other) != 0:
            raise GateError('PEER_RESULTS_ISOLATION_INCONCLUSIVE_OR_FAILED')
        print('REAL_PEER_SCHOOL_RESULT_DENIAL=PASS')
    else:
        print('REAL_PEER_SCHOOL_RESULT_DENIAL=NOT_TESTED')

    print('REAL_STAFF_READONLY_HTTP_ACCEPTANCE=' + ('PASS' if require_peer else 'PARTIAL'))
    print('MARKS_SAVE_RELOAD_PRINT_AND_FULL_PRODUCTION_CUTOVER=NOT_CERTIFIED_BY_THIS_GATE')
    return 0 if require_peer else 2


if __name__ == '__main__':
    try:
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--require-peer', action='store_true')
        parser.add_argument('--no-peer', action='store_true')
        args = parser.parse_args()
        if not (args.require_peer ^ args.no_peer):
            raise GateError('SPECIFY_EXACTLY_ONE_OF_REQUIRE_PEER_OR_NO_PEER')
        sys.exit(run(args.require_peer))
    except (GateError, KeyboardInterrupt, EOFError) as e:
        msg = str(e) if isinstance(e, GateError) else 'OPERATOR_CANCELLED'
        print('REAL_STAFF_AUTHENTICATION_CERTIFICATION=BLOCKED_' + msg, file=sys.stderr)
        sys.exit(2)
