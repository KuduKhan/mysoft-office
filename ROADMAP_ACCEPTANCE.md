# MySoft Office — Full capability acceptance roadmap
**Status: OPEN.** This document tracks the user's nine-area specification; no blanket feature-complete claims.

## Phase 1: universal dependability
- [x] Existing local-first transactional autosave, cross-tab conflict checks, recovery journals, manual backups, and clear save state.
- [x] Shared file metadata: nested path (up to four levels), tags, favorites, possible duplicate discovery by matching title+type, search, recycle bin.
- [x] Named local revision milestones, basic changed-field comparison, whole/content-only/organization-only restores.
- [x] Pin browser CI to supported Ubuntu 24.04; align package-lock to v0.12.0.
- [ ] Prove crash restoration and undo/redo consistency for all media objects, spreadsheet batch operations, slide transforms, document formatting, and PDF annotations with round-trip E2E.
- [ ] First-class empty folder/collection records, smart-rule collections, full-content duplicate hashing, retention beyond 12 snapshots, side-by-side visual diff, conflict-free shared editing.
- [ ] Session resume for every page/slide/cell/selection/zoom/panel and multi-tab concurrency.
- [ ] Export progress, cooperative cancellation, background-worker cancellation and recovery; compatibility preview against import fixtures.
- [ ] Full keyboard/screen-reader/touch/contrast audits, cross-browser and physical-device gates.

## Phase 2: editing engines
- [ ] Docs: structured transactional text model, pagination, mixed-orientation section breaks, master page/rulers, typography style inheritance, tables and floating objects, references/citations, track changes, mail-merge/protection.
- [ ] Sheets: cross-sheet dependency model, named ranges/formulas, arrays and genuine spills, structured data tables, native pivot/slicer/chart objects, calculation debugger, print fidelity and extensive XLSX fixtures.
- [ ] Slides: editable visual scene graph with groups/guides/rulers, native text and image objects, slide masters/brand kit, accessibility metadata, media playback, animation timeline and PPTX fidelity.
- [ ] Notes: nested durable notebook and section containers, rich attachments, recording, task scheduling/calendar/history, source-linked note-to-doc/slide actions.

## Phase 3: specialist suites
- [ ] PDF: robust large-document virtualization, original text/image editing, true OCR layers and correction, full AcroForm creation, native highlights/ink, signature verification and **verified destructive redaction** with independent extraction + rendering audit. No overlay is redaction.
- [ ] Media: raster/composite layers and masks, non-destructive node-based effects, vector node/boolean/gradient editing, noise reduction and multitrack audio, video timeline/captions/keyframes with independently decoded MP4 exports.

## Phase 4: connected content and optional services
- [ ] Reusable assets, fonts/license tracking, linked Sheets charts, linked PDF excerpts and note-to-deck conversions; explicit refresh and stable source references.
- [ ] Batch workflow recipes, compatible project bundles, template/brand system.
- [ ] Optional cloud collaboration, role-scoped service + proper authorization tests, opt-in AI with source provenance, extensions.

**Every feature's release gate:** actionable UI; correct local saves and rollback; reload and backup restoration; responsive and accessible usage; independent format validation; accurate error reporting and explicit limitations.
