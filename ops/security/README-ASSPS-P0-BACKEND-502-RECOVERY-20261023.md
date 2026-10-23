# ASSPS P0 backend 502 incident and reviewed safe boot dependency fix
23 October 2026. SOURCE REVIEW NOTE ONLY. DO NOT APPLY TO STALE MAIN AS A COMPLETE DEPLOYMENT.

## Incident and recovery
The school API genuinely returned HTTP502, anonymous exam-results HTTP502, and no port5000 listener despite homepage HTTP200. PM2 entered a restart loop. Actual fatal import error was Unexpected token brace in the optional market ESM argus-mt5-orchestrator.mjs at getLatestRecommendation following a duplicated warning and extra closing braces. Actual previous source changed around 16:47 UTC, root cause found at 16:51 UTC; NO actor attribution supported. Minimal duplicate-brace cleanup with root-only original archive, Node parse checks, PM2 restart restored school API HTTP200, anonymous results HTTP401.

## Prevent optional JARVIS/market module from crashing core SaaS
Old school WhatsApp top-level require('../services/whatsapp/jarvisCognitiveCore') transitively imported optional market ESM. Actual live reviewed hotfix:
- top-level school route does NOT eagerly import optional jarvisCognitiveCore
- define function runSchoolCognitiveMessage(from,text) which returns Promise.resolve().then(() => require('../services/whatsapp/jarvisCognitiveCore').processMessage(from,text))
- only call AFTER Meta HMAC verification, full per-value school phone scope validation, school market-intent deny check, and normal event preflight; retain existing error catch -> school WhatsAppRouter fallback
- do NOT relax signed event phone-ID policy or allow market/broker requests from the SCHOOL channel

Live tested: school home/API HTTP200, guest Results401, unsigned webhook403. All THREE new after-change REAL signed HMAC wrong-phone negative payloads rejected HTTP403 with zero new school event rows (1755 before and after). These are negative security tests, not actual valid Meta positive delivery or independent School2 authenticated acceptance.

Root-private live original backup evidence must remain outside public GitHub. Original malformed ESM SHA256 cf3321b5412fbe73a23fa085fa35a967ec536e6efcbfc912156bc54f3aa6f318; minimal working ESM SHA256 51c432636766580829628f06beda1d5feb0490b1a3b36c2ac156ccf9dac78b23. Reviewed live school route after isolation SHA256 59612be9c3d98b1b76c4b0912842d107f3e744cc08e4847f7a745dd235d1ce08. A synthetic isolated no-DB/no-network Node VM test proved optional loader import failure cannot prevent school route registration and school fallback runs when a fake signed school message reaches it. The independently verified runtime preflight checks seven active school-referenced JS/CJS/ESM sources and listener 5000.

Warning: This remote review branch is based on stale main, which does NOT match live backend/frontend and has unresolved school privileged role protections; NEVER auto-merge entire tree or overwrite live PM2/Nginx. Preserve Exam9 original results (1854 records, 213 numeric zeros), all 12 unexplained original-score/grade deviations, School Owner authenticity, Ed25519 Biology pilot identity/signing holds, user ResultCards ranking file, and DBA-owned original immutable guards. Full SaaS release remains HOLD. No scheduled ChatGPT task.
