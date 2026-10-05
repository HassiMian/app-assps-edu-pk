# V6-E2 native render policy — 2026-10-05

V6-E2 does not unlock print by relabeling a legacy exporter as canonical. It consumes the exact reviewed SaaS `PaperDocumentShadow` contract and pins its source/classifier/hash files by SHA-256.

For verified Blank/Manual legacy paper sources, the reviewed policy is `SOURCE_NATIVE_RENDER_ONLY` with renderer `PTSPaperGenerator (existing per-type sections)`. Source mutation changes the protected SHA. `cutoverReady` remains false until independent golden screenshot/print approval. Delivery manifests therefore report exact native renderer evidence but keep Print/PDF/Word BLOCKED with `SOURCE_NATIVE_RENDER_GOLDEN_APPROVAL_PENDING`.

Unknown/unrecognized legacy objects are not inferred as Blank/Manual and retain the generic canonical-renderer parity blocker. Historical V13/new-authoring families continue through their reviewed validators.

Acceptance: native policy unit 3/3 PASS; revision-bound delivery manifest 8/8 PASS; browser Delivery Center rev1/rev2 3/3 PASS; four-role shell PASS; mobile Paper Studio 6/6 PASS. Existing V6-D revision 9/9 and attendance 16/16 remained green before deployment.
