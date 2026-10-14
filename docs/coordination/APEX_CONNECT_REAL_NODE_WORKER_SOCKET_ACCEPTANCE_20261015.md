# APEX Connect / SaaS Core — Real restricted Node/PG worker acceptance

Date: 15 October 2026, Pakistan time. SOURCE + DISPOSABLE QA ONLY.
Parent/source: 4c2d50888fb6ca4d38ab914764e1079f34a49699,
the verified current Core teacher-auth and Blue recovery candidate.
New isolated branch: test/core-worker-node-real-socket-20261015.

## Gap resolved

The prior Core six-global role segregation work passed SQL grant tests but
did not demonstrate that its actual Node.js aiQueueWorkerDatabase adapter
could successfully authenticate and query PostgreSQL using a distinct
LOGIN plus genuine SCRAM-256 password. This gap is now covered by new
executable source in al-siddique-backend/src/services/ai/
qa-ai-worker-real-socket-20261015.js and root-private runner in
ops/release/signed-bluegreen/replay-real-ai-worker-node-55477-20261015.sh.
Its independent static contract tests are in the same directory.

## Real executed QA evidence

Using the protected full-ACL snapshot core-six-global-precutover-20261014T183510Z,
the runner restores actual original PostgreSQL table ownership, policies,
grants, data and signed school guard catalog on a new disposable PostgreSQL16
Unix-socket-only port 55477. No real employee password is copied.
The approved QA-only six-global isolation SQL is staged.

Each run generates independent ephemeral 256-bit random SCRAM worker login
password and independent test-only HMAC secret, both never printed, committed,
placed in a persistent file or sent to production. Temporary worker user is
assps_core_qa_login, inheriting only assps_core_qa_ai_worker. The adapter is
called through real node-postgres connections with signed Green mode enabled
in QA and the generic legacy backend startup probe disabled.

Actual real Node / PostgreSQL QA checks **8/8 PASS**:
1. Authenticated SQL current_user matches exactly the ephemeral worker login.
2. SELECT works on ai_jobs.
3. SELECT works on ai_queue_events.
4. SELECT works on ai_queue_state.
5. INSERT and UPDATE operate via the real restricted worker adapter on a
   synthetic QA-only ai_queue_state record.
6. Organizations SELECT fails with SQLSTATE 42501.
7. Campuses SELECT fails with SQLSTATE 42501.
8. Admin block audit log SELECT fails with SQLSTATE 42501.

Full restricted Node/PG runner passed twice, each against its own disposable
restored clone and independently generated SCRAM credentials, with automatic
cluster removal verified. Exam ID9 restored marks remained exactly 1,762,
including 213 genuine numeric zero scores. Eight guard source tests PASS.
These are actual isolated Node/DB requests, not mock acceptances.

## Production security remains legitimately HOLD

Actual deployed backend adapter is absent from the live PM2 backend. The
current live signed tenant runtime, authenticated separate production
worker identity, independent genuine school1-vs-school2 negative HTTP
acceptance, authenticated existing Muhammad Imran teacher challenge/re-login,
owner-pinned Ed25519 trust root and independent encrypted off-host rollback
remain UNVERIFIED. A browser check reached the current public teacher login
selector without any authenticated teacher session. Public Next still serves
old BUILD_ID XI7EvxpUMkKOxK5ByM2BH and Nginx redirects /dashboard to
/admin. The independently reviewed corrected BUILD_ID is
ONDwxEIZlx5onDIKY7wYf but has not been promoted.

This source-only mission does NOT provision production accounts, create
human signatures or approvals, access teacher passwords, alter school marks,
modify SaaS database grants or apply Nginx/PM2 deployment. SaaS Core must
review and forward-port on its latest owner production SQL/inverse, provision
the genuinely scoped worker under Core-controlled credentials and test
background queue/settings services and true authenticated peer-school denial,
then execute an independently authorized Next+Nginx login-only cutover with
real postflight and traffic rollback. Academic result/paper publication is
entirely separate. No routine Principal approval is needed for source QA,
but no agent may impersonate an institutional signer.

Conclusion: production-compatible restricted Node/PG path proven in a
full-ACL restored QA environment; real production certification is HOLD.
