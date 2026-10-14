# ASSPS SaaS Core — actual CYBERSPACE owner-key/off-VPS recovery evidence

**Checkpoint:** 2026-10-15 Pakistan local, 2026-10-14 UTC. **Parent:** `4c2d50888fb6ca4d38ab914764e1079f34a49699`, descendant of current Core worker/login integration `c2812948c0916a6886c1f88e8887c567402b4791`. **Coordination:** GitHub issue #4. **Deployment:** No Green activation, no Next+Nginx traffic switch and NO production ACL/employee/result alteration during this checkpoint. This document records real external recovery only, not institutional human acceptance.

## Independent owner-machine connectivity recovered

Windows workstation **CYBERSPACE** was reachable by Cloud Desktop Commander, but generic `ssh root@IP` initially failed BatchMode authentication. Existing Windows SSH configuration host alias **`assps-production`** used its established deploy key and returned authenticated Linux VPS `srv1769723` hostname with `BatchMode=yes` and `StrictHostKeyChecking=yes`. No staff, root, or database password guessing/extraction. This authenticated route transferred ONLY recipient/signer public key material to VPS, and later fetched ONLY AES-GCM encrypted recovery artifacts to Windows.

## Dedicated, separated owner-machine cryptographic key custody

Generated non-overwriting X25519 encryption recipient pair and distinct Ed25519 evidence signer pair **on CYBERSPACE** using isolated Windows Python venv/cryptography, with local private keys in owner-only ACL-controlled folder; explicitly restricted NTFS ACEs to Windows owner, SYSTEM and Administrators. The private keys were NEVER copied to VPS or GitHub. Fingerprints of PEM public keys verified on BOTH systems:

- Recovery recipient X25519 PEM SHA256: `c5e3ea31ae8f0e733afcc81dbf750710f751744512d366f77111c0696c8ca4c0`.
- Signing Ed25519 PEM SHA256: `b4ae52b8643fc6a053bab249a8ed254926ec09acba1bda2701783c6f1dfb8e6a`.

The **public** Ed25519 PEM (and only public key) was installed in `/etc/assps/release-evidence-ed25519.pub`, owner root/root mode `0644`, verified exact SHA. This is technical trust-root/key provisioning. **No real school officer, teacher, tenant security peer, disaster recovery reviewer or Principal approval was signed.** The owner must independently accept private-key custody before its signatures can be considered genuine institutional authorization. Agent-generated or self-asserted receipts must not pass the institution/person release gates.

## Genuine encrypted off-VPS evidence, not a VPS-local claim

Fresh read-only live PostgreSQL complete data/ACL custom-format dump (`pg_dump -Fc`) plus password-free global role definitions, manifest SHA checks and tar gzip package (1,235,401 B plaintext). The existing previously independently restored entire live original Blue Next+Nginx archive (249,921,158 B plaintext) was also preserved. At backup time school1 Exam9 still contained **1,762** genuine stored scores including **213** actual numeric zeros. The Node/Next Blue BUILD_ID remains `XI7EvxpUMkKOxK5ByM2BH` and original Nginx vhost SHA256 is `b425e52917470a1c8355b570097ca6fc22afa1e4d051b6d52d6c7f56bb3b89f9`.

On VPS, created two one-time X25519 ephemeral + HKDF-SHA256 + AES-256-GCM authenticated recovery envelopes using **only Windows recipient public key**. Random nonce/salt per payload, ciphertext authenticates exact JSON header, original bytes/hash and source archive name. VPS envelopes are held in root-only `/root/assps-release-backups/offsite-staging-20261015/`; no private recipient key on server. The two `.enc` files and SHA manifest were transferred over verified owner SSH alias to CYBERSPACE **off-VPS**. Windows ciphertext SHA256 checks matched VPS exactly:

- DB/roles `.enc` SHA256 `56c7f8945cca64619cde9c6da0e9b169f2ca3eb3a9a421b00069fb55d545fdf5`, 1,235,862 bytes.
- Complete original Blue Next+Nginx `.enc` SHA256 `6cea801472e28b3037d860a2813a8c1e50beff98ec492c5f85a31415bc17042e`, 249,921,622 bytes.

**Actual independent Windows AEAD decryption using PRIVATE X25519 recipient** completed for **both** packages, with original plaintext SHA256 and byte-length parity (2/2 PASS). Decrypted plaintext was only in Python process RAM on Windows and **never saved** to its disk. Owner folder retains encrypted copies and an unsigned machine verification report. This is genuine off-VPS copy/recovery encryption acceptance; it does **not** claim PostgreSQL was restored FROM the off-VPS ciphertext, nor that a person signed an institutional recovery receipt. Fresh backup has already been separately full-ACL restored and exact Core six-table migration+inverse tested on disposable PG55489 in the prior mission.

## Read-only Core login release recheck AFTER technical key pin

`verify-connect-login-only-core-20261014.py`, run with clearly unapproved placeholder release ID `QA_PREVIEW_UNAPPROVED_20261015`, reviewed proxy SHA and build ID, **exit2/HOLD**. It now confirms `trusted_external_owner_pinned_key=true`, `current_blue_rollback_archive_verified=true`, original marks intact and Nginx syntax valid, but correctly leaves `independent_offhost_current_recovery_certified=false` because **institutionally signed disaster recovery reviewer receipt absent**. Signed worker DB adapter/source parity, current production Green signed transport, six-table effective privileges and peer-school/subject authenticated negatives still fail. This verifier requires authentic actor-specific signed claims, not a copy/hash alone.

## Remaining hard cutover constraints

Actual separately provisioned **production** restricted worker login + source-matched deployed backend adapter (current live backend adapter absent), transactional production six-table migration with exact inverse and running worker checks, self-authenticated Muhammad Imran temporary-password rotation/relogin, independent real school/peer-school and unassigned-subject HTTP denial, owner-custodied signing and **genuinely reviewer-signed** release receipts, and atomic corrected Next.js + Nginx rollback-ready traffic promotion. Keep the public Blue available until an authorized Core release transaction; preserve staff/marks/paper/student/blank-vs-zero data. Real public traffic rollback NOT yet executed. Do not fabricate human attestations or sign on their behalf.
