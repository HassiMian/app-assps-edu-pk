# Employee directory secrets query hardening

Production source read of staff employee list and detail no longer SELECTs portal_password from the database.
Existing employeePublicRecord output projection and create/edit password reject remain unchanged.
A database-column-derived explicit non-password SELECT preserved all prior non-secret employee fields.
Source patch is a live-to-review artifact; canonical repo still needs integration/review before main merge.
Four contract tests PASS; live core73/73 PASS; API health200; no database rows mutated.
