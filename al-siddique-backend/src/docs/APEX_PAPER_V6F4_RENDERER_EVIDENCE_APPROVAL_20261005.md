# V6-F4 — renderer evidence-bound approval

Renderer parity is no longer a standalone boolean gate. `PAPER_CANONICAL_RENDERER_PARITY_APPROVED=true` only becomes effective when the backend can independently verify a pinned F4 evidence manifest and the currently running Connect build.

Required coordinates:
- `PAPER_CANONICAL_RENDERER_EVIDENCE_PATH`
- `PAPER_CANONICAL_RENDERER_EVIDENCE_SHA256`
- `PAPER_CANONICAL_RENDERER_SOURCE_COMMIT`
- `PAPER_CONNECT_BUILD_PROVENANCE_URL`
- `PAPER_CANONICAL_RENDERER_PARITY_APPROVED=true`

Verifier requirements:
- manifest architecture `v6-f4-golden-render-evidence-1`;
- evidence-only manifest with no self-approval claim;
- exactly English, Urdu and Dual variants;
- semantic screen/print parity true and no horizontal overflow;
- screenshot/print/PDF artifact SHA-256 files match the manifest;
- Urdu and Dual evidence include RTL Nastaliq nodes;
- evidence renderer commit, build ID and renderer file hashes exactly match the live Connect `/build-provenance` response.

Any manifest tamper, artifact tamper, missing coordinate, stale build ID, source commit drift or renderer file drift automatically makes `canonicalRendererParityApproved=false` even if the environment approval flag remains set.

Current reviewed evidence was generated from the exact preview artifact built from Connect source commit `1e5e87457599e5bb437cba3f2bc8340e248f2bd0`, build ID `DpeUflTtgNJ8Hii7M-no0`. F4 evidence manifest SHA-256: `6fb59fa7f7c7418de45e43e2b95feb0ca83edfc85112818e18b75bb3f7e4306f` under the root-only secure archive. Golden run: English/Urdu/Dual 3/3 PASS. Synthetic fixtures were removed.

This software parity approval does not claim physical-printer, iPhone/Samsung hardware or human typography signoff. It only closes the canonical renderer software parity gate. Canonical write remains disabled until the separate curriculum publisher and explicit registry-write gates are approved.
