# Legacy Ops Scripts

These scripts were moved out of the repository root to reduce clutter.

## What lives here

- legacy deployment helpers
- emergency patch scripts
- one-off migration utilities

## Important

- many of these scripts were written for narrow situations
- do not run them blindly against production
- prefer reviewed deployment processes over ad hoc scripts

## Environment Variables

Some legacy scripts now expect:

- `ASSPS_VPS_HOST`
- `ASSPS_VPS_USER`
- `ASSPS_VPS_PASSWORD`

