# MySoft Office

**Your work. Your space.**

MySoft Office is an independent, local-first productivity suite with four browser-based editors. Version **0.5.8 Data Integrity & Recovery** retains native DOCX/XLSX/PPTX support and adds a redesigned, responsive workspace with orangered/color theme options, denser editing ribbons and new functional commands. This remains a local-first prototype, not full Microsoft Office parity. It is NOT at full Microsoft Office parity; consult [OFFICE_PARITY_ROADMAP.md](OFFICE_PARITY_ROADMAP.md) for an explicit capability inventory and engineering plan.

## Quick start

Node.js 20+:

```bash
git clone https://github.com/KuduKhan/mysoft-office.git
cd mysoft-office
npm run dev
```

Open http://localhost:4173. No installation step or external npm dependencies are required for the local editor prototype. This repository includes static output configuration for Vercel, but the Vercel project is not connected yet.

## New in v0.5.8 — Local storage reliability

- **IndexedDB workspace storage:** files, recycle bin and revision records now commit in a single IndexedDB transaction. No cloud account is required.
- **Safe one-time migration:** existing `mysoft-office-v1` localStorage data is imported before the app opens. Legacy keys are **not deleted**, so a pre-migration recovery copy remains available.
- **Verified save status:** Ctrl/Cmd+S, command-palette saves and autosave report `Saved on device` only after the database transaction completes. Failed writes show a visible error and backup warning.
- **Recovery precautions:** edits are staged to a small synchronous localStorage recovery journal before asynchronous writes. Pending snapshots replay after interrupted reloads; malformed legacy data offers raw recovery export instead of silently replacing documents. Failed JSON/cloud workspace restoration leaves the current workspace untouched.
- **Regression tests:** unit tests cover migration parsing and ordered write failures; Chromium tests cover migration, save errors, failed import and corrupt-legacy recovery.
- **Limitations:** browser data can still be cleared by users or storage eviction; export external backups. The localStorage recovery journal is quota-bound and not a guaranteed substitute for IndexedDB transactions. Per-file writes are currently full-workspace transactional replacements.

## New in v0.5.7 — Keyboard workflow refinement

- Consistent Ctrl/Cmd+K command search, Ctrl/Cmd+S local save, Ctrl/Cmd+Shift+E export and Ctrl/Cmd+Shift+N new-file dialog.
- Centralized shortcut mapping with unit tests and prevention of browser default Save Page for the local-first app.
- This is a limited productivity improvement, **not** full Microsoft Office or WPS parity. Advanced document editing, full XLSX calculation, vector slide editing and fidelity remain on the roadmap.
- v0.6 cloud infrastructure remains deferred.

## New in v0.5.6 — Editing Productivity Studio

- **Studio Command Search (Ctrl+K):** keyboard and mobile-accessible command palette for creating any editor file, navigating, reopening recent files, saving, exporting and customizing. Includes live filtering and keyboard Enter.
- **Docs:** find next and previous in rich document content, with visible selection and match count; navigation never rewrites or flattens formatting.
- **Sheets:** conditional-format rules per worksheet, with supported numeric greater/less/equal and text-contains comparisons. Highlight palettes are safe, bounded and persisted locally. Uses a **Rules** ribbon; rules are local MySoft features and are not preserved by XLSX export.
- **Slides:** 90-degree left/right rotation of MySoft text boxes and simple shapes; visual transforms survive MySoft PPTX round-trips as DrawingML rotation.
- **Notes:** pin/unpin important notes, which appear above other notes in their notebook section. Pin state is retained in file revisions.
- **UI/UX:** upgraded interactive focus states, improved orangered ribbons, compact command access on phones, better shape controls, and explicit 320–1440px overflow checks.
- Continued local-first editing and v0.5.x upgrades; **no v0.6 cloud infrastructure**.

## New in v0.5.5 — Studio editing depth and visual polish

- **Docs Structure ribbon:** Promote/demote paragraphs to headings, move top-level document blocks, insert new sections and semantic page breaks. Page-break markers persist and produce browser print page breaks. This remains a contenteditable-based incremental structured workflow, **not** a fully transactional Word-class editor.
- **Sheets:** A bounded dependency graph now updates dependent cell results live when a source cell changes; direct and chained formula links refresh without waiting for navigation. Recalculate command and cache invalidation. This does **not** add cross-sheet formulas, external functions, pivots or complete Excel dependency calculation.
- **Slides:** Arrange freeform objects by layer (forward, backward, front, back), optional 2% snap-to-grid when dragging, keyboard-focused objects and arrow-key movement (Shift for larger step).
- **UI/UX:** Improved ribbon scrolling and focus, better visible selection states, consistent orangered highlights, page-break labels, mobile containment and print rules.
- Unit and Chromium browser tests cover new editing, dependent formulas, saved layering and responsive behavior. **All cloud v0.6 infrastructure work remains deferred.**

## New in v0.5.4 — Layout and editing reliability

- Docs: print-page geometry for A4/Letter/Legal, orientations/margins, editable header/footer text saved independently of document content, and print stylesheet applying paper settings. **Editor remains a continuous document; this is not full Word-quality pagination.**
- Sheets: formula audit reports evaluation errors and counts; cell trace shows direct dependencies and dependents within active worksheet. **Not a full dependency/recalculation graph.**
- Slides: precise align-to-slide controls (left, center, right, top, middle, bottom), controlled resizing, persisted geometry.
- Notes: search across notebooks, sections, titles, tags and text, with a mobile-accessible search box and zero-results message.
- All apps: unit tests for safe geometry and search/audit, and browser tests for editor actions, reload persistence and mobile overflow. Cloud infrastructure is still deferred.

## New in v0.5.3 — Deeper editing in all four applications

- **Docs:** comments tied to selected text, with resolve/reopen/delete and revision recovery. These are review annotations, not track changes.
- **Sheets:** eight additional safe numeric functions: MOD, INT, SIGN, CEILING, FLOOR, SUMSQ, STDEV, VAR.
- **Slides:** editable text boxes, rectangles and ellipses on the slide canvas. Move, duplicate, delete, recolor and adjust text size. Basic MySoft shapes now roundtrip in MySoft PPTX.
- **Notes:** notebooks and sections, organized sidebar navigation and explicit note relocation, retained in revision history.
- Responsive, local-first operation continues across the Studio UI. No cloud deployment or new cloud schema.

## New in v0.5.2 — Editing depth and data integrity

- MySoft Docs: a dedicated Table ribbon enables inserting/removing table rows and columns, using the actual editable table cursor position (simple rectangular tables only).
- MySoft Sheets: a new Range ribbon operates on validated ranges of up to 2,600 cells: bulk bold/highlight, clear contents, copy as tab-separated values, numeric series fill, and statistical summaries.
- **Fixed potential data loss**: sorting now keeps cells and styles from all 1,000 supported rows instead of discarding populated rows after row 30.
- New pure range model with validation, unit tests and browser tests covering real edit/reload behavior.
- This is a targeted v0.5.x editor refinement. Cloud development remains deferred until deeper Office-class editing goals are met.

## New in v0.5.1 — MySoft Studio UI and editing tools

- Studio design system with Orangered, Coral, Saffron, Ocean, Jade, Violet, Rose and Graphite themes.
- Customized accent swatches, light/dark interface, adjustable zoom and collapsible contextual Ribbon.
- Editors get a fitted header, local-save status bar, scrollable toolgroups and responsive layouts.
- Docs/Notes add rich-text alignment, lists, quotes and extra formatting shortcuts.
- Sheets adds a Format Ribbon, alignments, text Find/Replace, Fill Down (1–50), and clear cell actions.
- Slides gains backdrop/foreground design presets that carry into the slideshow.
- Playwright checks for page overflow and header button collisions at 360, 390, 768, 1024 and 1440px.
- Dedicated [Studio quality gate](STUDIO_QUALITY_GATE.md) keeps editor maturity ahead of cloud milestones.

**Scope:** This is not yet feature-parity with Microsoft Office, WPS or ArtCraft. Advanced editing engines, pivots, shape-based slides, rich notebook structures and full-format fidelity remain to be built.

## New in v0.5 — Native Office files

- DOCX import/export: basic editable paragraphs, headings, text emphasis and simple tables.
- XLSX import/export: up to 20 worksheets, A1:Z1000 values, supported formulas and basic cell styles.
- PPTX import/export: up to 200 slides, editable title and body text.
- Explicit import/export conversion warnings, ZIP archive safety checks and independent-reader tests.
- **Formatting fidelity is limited.** Images, advanced objects, charts, precise layouts and other unsupported features can be lost.
- Read the complete [Office compatibility matrix](OFFICE_COMPATIBILITY.md) before relying on imported documents.

## New in v0.4 — Editor foundations

- Sheets: a 26-column × 1,000-row windowed grid (A1:Z1000). Only 48 rows are drawn at once for lower DOM cost.
- Sheets: editable address box for direct navigation (e.g., Z1000); keyboard movement with Enter, Tab and arrow keys, plus Ctrl+G to jump.
- Sheets: bounded multi-cell TSV paste and CSV imports/exports up to the expanded grid.
- Docs: live hierarchical outline from H1/H2/H3 headings, with jump-to-section controls.
- Docs and Notes: independent in-session undo/redo engine, with Ctrl+Z and Ctrl+Y/Ctrl+Shift+Z. Saved file history remains available separately.
- Backward compatible with files from prior versions; dedicated v0.4 unit and browser regression tests.

**Limits:** The spreadsheet remains a lightweight prototype, not a virtualized Excel computation engine. It does not yet support cross-sheet formula references, pivots, charts as editable objects or large XLSX roundtrips. The rich-text editor still uses contenteditable for input, with a separate explicit undo stack; replacing this with a transactional structured document editor remains the next major architecture task.

## v0.3 Office Power Tools

**Shared workspace**
- Unified launcher, search, templates, recycle bin, local version history, backup and restore.
- Customizable light/dark theme, accent color, compact or comfortable spacing, and UI scale.
- App-specific contextual tool ribbons, including more discoverable commands.

**MySoft Docs**
- Paragraph styles, common rich-text formatting, and text alignment.
- Custom font, font size, text color, highlight, superscript/subscript and strikethrough.
- Tables (including custom dimensions), small embedded pictures (up to 150 KB, PNG/JPEG/WebP), hyperlinks, dividers, checklists, dates and text find/replace.
- Page size (A4/Letter/Legal), orientation, margins, page color, line spacing, print-to-PDF.

**MySoft Sheets**
- 26×1,000 windowed grid with up to 20 worksheets in each file, rename, duplicate and delete.
- Cell text/background colors, bold/italic styles, number display presets (KES, percent).
- Sorting with formula reference safeguards, auto SUM/AVERAGE, bar and line previews.
- Arithmetic and aggregates: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, PRODUCT, MEDIAN, ROUND, ABS, SQRT, POWER.
- CSV import/export and basic formula evaluation.

**MySoft Slides**
- Slide creation, deletion, duplication, ordering and design themes.
- Title, section and minimal layouts, text scales, speaker notes.
- In-browser slide show, keyboard navigation and fade/slide transitions.
- Export to basic printable HTML.

**MySoft Notes**
- Rich text, tags, checklists, formatting and text export.

## Data protection and limitations

This is still a browser prototype, now using IndexedDB for the authoritative workspace and retaining previous localStorage keys as read-only migration recovery copies. Large or dense spreadsheets can exceed browser storage quotas. It is not an appropriate sole archive for critical work, and it does not provide classification-grade security. Browser cleanup, corruption or device loss can remove local files. Export JSON backups routinely. Cloud authentication and manual workspace snapshot code exists but **remains disabled** until a separately authorized MySoft Supabase project is configured. Do not use your KHANIVERSITY database for this app.

File interoperability adds a defined subset of DOCX/XLSX/PPTX alongside TXT, CSV and sanitized HTML. **Full-fidelity DOCX/XLSX/PPTX editing, real PDF authoring, advanced chart objects, equations, pivot tables, macros, co-authoring and complete accessibility are not implemented.**

MySoft Docs still uses native contenteditable/execCommand as an intermediate editor. Production-level Word-style editing needs a modern structured editor and extensive file-fidelity tests. Do not store classified, military operational, health or other regulated sensitive content here.

## Engineering checks

```bash
npm test
npm run build
npm run dev
```

GitHub Actions runs Node unit/build checks and Playwright Chromium browser smoke tests. See `tests/`.

Architecture documentation:
- [STUDIO_QUALITY_GATE.md](STUDIO_QUALITY_GATE.md) — editor and responsive quality targets before v0.6.
- [OFFICE_COMPATIBILITY.md](OFFICE_COMPATIBILITY.md) — supported Office file subset and conversion limits.
- [OFFICE_PARITY_ROADMAP.md](OFFICE_PARITY_ROADMAP.md) — full Word, Excel, PowerPoint, OneNote-class targets.
- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture decisions and evolution.
- [CLOUD_SETUP.md](CLOUD_SETUP.md) — optional dedicated cloud setup.

## Development principles

- Feature quality, recoverability and compatibility before cosmetic Ribbon parity.
- Existing v0.1/v0.2 browser workspaces continue to load.
- Advanced desktop/Office file formats are not advertised until round-trip tests prove them.
- All server-side storage and collaboration must be designed with strict access control.
