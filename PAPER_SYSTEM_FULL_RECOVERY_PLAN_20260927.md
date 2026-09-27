# ASSPS Paper System Full Recovery Plan — 27 Sep 2026

## Objective
Restore the existing Paper Generator without starting over. The release must preserve teacher content while fixing layout, editor behavior, print parity, Urdu RTL behavior, MCQ/table rendering, and Early Years duplex printing.

## Architecture decision
1. **Official First Term papers (Classes 1–8)** use **Paper Studio** as the primary preview/edit/print route.
2. **Canonical Editor V2** remains available for canonical/custom documents and keeps its Word-like rich-text engine.
3. Official source data remains immutable; presentation changes are applied by a shared semantic renderer.
4. **Early Years** stays a separate worksheet renderer because its visual/child-response layout is fundamentally different.
5. No backend or database migration is required.

## Official paper rendering pipeline
Saved paper -> route resolver -> Paper Studio -> official semantic classifier -> shared OfficialSectionRenderer -> print iframe.

The semantic classifier determines: MCQ, short, long, table/matching, true-false, fill blank, vertical math, list, or section marker.

## Language rules
- English: heading starts left; marks badge sits right.
- Urdu/Islamiyat/Pak Studies/Tarjuma Quran: heading starts right; marks badge sits left.
- Urdu uses Jameel Noori first on screen and in print.
- English defaults to Times New Roman; mathematical grids prefer Cambria Math / Times New Roman.
## Editor control contract
- Manual Edit never replaces the live structured preview. It exposes edit inputs while the formatted paper remains visible.
- MCQ layout must visibly switch among Table, Grid and Classic.
- Short-question layout must visibly switch among 1-column, balanced 2-column and Table.
- Page Border changes the actual printable page edge.
- Question Border changes actual question/section containers.
- Answer Lines render in preview and print.
- Font size, line height, letter spacing and word spacing must alter the rendered paper and persist on Save.
- Print excludes all editor-only controls.

## MCQ and structural rules
- MCQ headings are recognized semantically in English and Urdu.
- Every detected MCQ section must parse into one or more real MCQ rows.
- Markdown/source tables render as proper bordered tables.
- Serial order follows source order; no serial is invented for section banners.
- Marks are displayed from the source heading/field only; academic marks are never redistributed by presentation code.

## Early Years duplex architecture
Starter, Mover and Flyer remain in the dedicated Early Years worksheet system. A compact child-friendly print profile reduces page margins, visual sizes, tracing glyphs, internal gaps and decorative whitespace without changing academic content. The hard print gate is **no more than two A4 pages per paper**, so one physical sheet can be used double-sided.

## Release gates
1. Production build passes.
2. All 43 official Class 1–8 papers route to Paper Studio.
3. Every detected MCQ section parses successfully.
4. Every paper is opened live and checked for source order, heading/marks side, structural rendering and console errors.
5. Representative editor interactions are tested in English and Urdu.
6. All nine Early Years papers are PDF-rendered and page-counted; none may exceed two pages.
7. Frontend-only deployment with timestamped rollback snapshot; backend/database remain untouched.
