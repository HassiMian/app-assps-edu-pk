#!/bin/sh
# Fail closed: verifies ONLY dedicated disposable signed RLS harness prerequisites.
set -eu
host=127.0.0.1
port=55432
name=assps_core_signed_p7_20261008
role=assps_core_test_login
if ! pg_isready -q -h "$host" -p "$port"; then
 echo "BLOCKED: isolated signed PostgreSQL $host:$port is not accepting connections" >&2
 exit 2
fi
# No production DB host, secrets or connection strings are consumed.
if [ -z "${CORE_SIGNED_TEST_KEY:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
 echo "BLOCKED: isolated signed actor test credentials are not provided" >&2
 exit 2
fi
if [ "${DB_NAME:-}" != "$name" ] || [ "${DB_USER:-}" != "$role" ] || [ "${DB_HOST:-}" != "$host" ] || [ "${DB_PORT:-}" != "$port" ]; then
 echo "BLOCKED: signed test connection identity must match disposable harness" >&2
 exit 2
fi
printf '%s\n' 'SIGNED_RLS_HARNESS_PREFLIGHT_PASS'
