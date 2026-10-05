# V12 reference lock EOL correction — 2026-10-05

The protected `official-first-term-2026-v12.json` Git blob has always been LF bytes with SHA-256 `6e2ba2feae54f8e772357b5303cc569faefd6e01772ddc89adc9c2b4c9b2a014` since its introduction in commit `8609421`.

The later `referenceCorpusLock.json` recorded `d8fe0c5529c26a557444dc41331f67b8699e93bf06bae442c40ac274edbfd8a3` while labeling it `raw-bytes`. That value is exactly the SHA-256 obtained by materializing the same JSON with Windows CRLF line endings; it is not a different academic dataset.

Correction:
- protected V12 JSON content is unchanged;
- lock mode becomes `utf8-lf-normalized`;
- canonical LF hash is stored as the active lock;
- the original Windows CRLF raw hash remains preserved in `legacyWindowsCrlfRawSha256` with an explicit correction note;
- immutability test hashes an LF-normalized V12 byte stream, so Windows/Linux checkout EOL does not create a false source mutation.

Verification: `migrationV2_43.test.js` 17/17 PASS; combined `documentClassifier.test.js + migrationV2_43.test.js` 33/33 PASS.
