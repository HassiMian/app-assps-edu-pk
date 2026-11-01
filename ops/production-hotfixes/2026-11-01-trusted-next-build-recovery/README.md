# Trusted ASSPS Connect Next.js build recovery

The official Connect release-provenance script requires the exact commit
e13a401a24e5617c69ea8788e54bb7c2060057cf for its six signed
Paper Studio renderer files. Original source was recovered in VPS worktree
assps-connect-official-marks-release-qa-20261013. Six file SHA256 values
were matched with deployed live sources; the original source lock was
not disabled, bypassed or faked.

The pre-existing APEX CSS module uses exclusively global selectors. The
unmodified module fails Next.js 16 Webpack strict CSS Module validation
because of non-pure :global(:root). The accompanying global stylesheet
is an exact transform removing the :global wrappers without changing
selector meanings; the page import changes only to use it as a global CSS
file.

A stale October 5 source backup directory was also inside the Next.js
TypeScript glob and caused unrelated typechecking failures. The backup
was independently archived, manifest-checked and SHA256 verified before
being removed from the active compiler tree in isolated QA. The live
green production tree and public Nginx host were NOT cut over to this
review candidate.

A full Next.js build with the ORIGINAL trust script returned success;
a separate local canary served login HTTP200 and protected teacher
routes 302. Blue QA can use a separate NEXT_DIST_DIR without touching
the public green release. Real signed-in staff acceptance is still HOLD.
