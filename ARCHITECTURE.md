# Architecture and development direction

## v0.1: deliberately simple and independently deployable

The current app is a dependency-free browser application using ES modules, HTML and CSS.

- `index.html`: app mounting point, accessible document metadata.
- `src/app.js`: workspace shell, file CRUD, editing flows, browser persistence, import/export.
- `src/formulas.js`: safe recursive-descent spreadsheet formula evaluator.
- `src/styles.css`: responsive MySoft UI system.
- `scripts/server.mjs`: local HTTP server (Node.js built-ins).
- `scripts/build.mjs`: static build validation and packaging.
- `tests/`: Node native test runner.

Persistence: `localStorage` namespace `mysoft-office-v1`. Data is not encrypted, synced or backed up automatically. Do not confuse a browser prototype with a production document storage service.

## Planned evolution

**Stage 1: Quality + editor engines**
- Add Playwright browser flows: create → edit → reload → export → reopen.
- Add editor-specific modules and automated accessibility checks.
- Move Docs to a maintained structured-document editor such as Tiptap/ProseMirror.
- Move Sheets to a virtualized grid, typed cell model, richer formula engine, and undo history.
- Introduce an actual element-based slide layout model.

**Stage 2: Secure multi-user foundation**
- React + TypeScript app with stable contracts, isolated components and state.
- Identity provider, per-workspace authorization, auditability.
- PostgreSQL metadata, object storage for files and revision snapshots.
- Transactional save APIs with conflict resolution, quotas and recoverability.

**Stage 3: File interoperability**
- Real DOCX, XLSX and PPTX import/export pipelines.
- Roundtrip fixtures for tables, fonts, page layout, formulas, charts, images and speaker notes.
- Any unsupported file feature must be reported rather than silently discarded.

**Stage 4: AI and collaboration**
- User-approved context scoping, audit logs, rate limits and safe tool execution.
- Collaborative editing with established CRDT infrastructure and access controls.
- Offline cache, version reconciliation and robust sync indicators.

## Acceptance criteria for next milestone

1. No user content is lost after refresh or navigation in local browser smoke tests.
2. Every editor has reliable undo/redo and consistent keyboard navigation.
3. Backup → restore preserves every supported type.
4. Exported documents pass the corresponding format validation.
5. New code passes automated tests and a deployed preview review.
6. All documented capabilities are distinguishable from roadmap-only features.

## v0.4 editor foundations (October 2026)

- `src/sheet-window.js`: pure navigation, viewport and bounded TSV operations for a 26 × 1,000 grid.
- `src/sheet-grid.js`: renders only 48 rows at a time and replaces that window on scroll rather than creating 26,000 inputs.
- `src/document-history.js`: explicit in-session rich editor undo/redo and H1–H3 heading outline extraction, separate from persistent version snapshots.
- The app retains existing `localStorage` keys and file models. Dense sheets may hit browser quota limits; moving to IndexedDB and a transactional editor remain mandatory before professional availability.
- GitHub browser tests cover last-row editing, keyboard navigation, outline persistence and editor history.

## v0.5 — Office Open XML adapters

The dependency-free ZIP/Open Packaging Conventions adapter in src/ooxml-zip.js validates archive size, CRC, paths, entry counts, compression ratio and XML payloads. Format-specific DOCX, XLSX and PPTX modules convert only the documented supported semantic subset into MySoft editor files. Import review is explicit and never modifies the source Office file. Export uses ZIP STORE with native OOXML package metadata. See OFFICE_COMPATIBILITY.md for a detailed matrix.

CI now tests browsers with independently generated compressed Office fixtures and opens our exported documents in python-docx, openpyxl and python-pptx to catch structural compatibility defects. This is not comprehensive file security auditing nor full OOXML fidelity.
