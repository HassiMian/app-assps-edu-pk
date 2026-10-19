#!/usr/bin/env python3
"""Live read-only catalog preflight for candidate code, not signed-user acceptance."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DB_SOURCE = ROOT / "al-siddique-backend/src/config/database.js"
GUARD = ROOT / "al-siddique-backend/src/config/signedRlsCatalogGuard.js"

def sql_result(query):
    statement = "BEGIN TRANSACTION READ ONLY;\n" + query.rstrip("; \n") + ";\nROLLBACK;\n"
    result = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1",
         "-d", "apexos", "-Atq"],
        input=statement, text=True, capture_output=True, timeout=20, check=False)
    if result.returncode:
        raise SystemExit("HOLD: protected read-only PostgreSQL catalog query failed")
    records = result.stdout.strip().splitlines()
    if len(records) != 1:
        raise SystemExit("HOLD: unexpected read-only result count")
    return records[0]

source = DB_SOURCE.read_text()
marker = "const gate = await client.query(`"
if source.count(marker) != 1:
    raise SystemExit("HOLD: candidate signed catalog query changed or missing")
query = source.split(marker, 1)[1].split("`", 1)[0]
if query.count("$1::name=ANY(p.roles)") != 1:
    raise SystemExit("HOLD: signed role-binding predicate drifted")
query = query.replace("$1::name", "'assps_core_green_runtime'::name")
actual = sql_result(query).split("|")
expected_core = ["85", "85", "77", "73", "4"]
if actual != expected_core:
    raise SystemExit("HOLD: signed core catalog mismatch " + json.dumps(actual))
print("PASS signed core catalog: forced=85 enabled=85 restrictive=77 school=73 tenant=4")

js = "const g=require(" + json.dumps(str(GUARD)) + ");process.stdout.write(JSON.stringify({a:g.additionalPolicySql,d:g.documentPolicySql}));"
node = subprocess.run(["node", "-e", js], capture_output=True, text=True, timeout=8, check=True)
queries = json.loads(node.stdout)
for label, sql, expected in (("approved academic policies", queries["a"], "5"),
                              ("scoped document policies", queries["d"], "3")):
    value = sql_result(sql)
    if value != expected:
        raise SystemExit("HOLD: " + label + " count " + value)
    print("PASS " + label + ": " + expected)
print("Source catalog ready for further isolated signed-actor validation; NO DB writes performed.")
