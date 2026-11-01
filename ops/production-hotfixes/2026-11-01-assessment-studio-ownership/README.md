# Assessment Studio teacher-ownership authorization, 1 November 2026

Live production hardening: teacher accounts may only read/edit/release their own
Assessment Studio papers and view/change their own print jobs. School Admin and
Principal retain school-wide authorized workflow. A new paper may still be created
at revision 0; a pre-existing other-teacher paper is not writable. A percent-encoded
identifier does not bypass the owner check, and DB outages fail closed.

The original canonical GitHub source predates Assessment Studio entirely. The
currently deployed runtime route and helper are therefore preserved here as an
independent reviewed live-source snapshot. They are intentionally NOT auto-mounted
into that older canonical server; route integration requires full source parity.
Never claim this snapshot alone provides the complete app integration.

Live QA: 9 pure owner tests plus 4 isolated HTTP route tests = 13/13 PASS,
original 69 core tests PASS, read-only first-term marks checksum unchanged.
No genuine staff login acceptance or Principal approval was fabricated.
