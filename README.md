## v0.8.1 — Office fidelity and PDF navigation reliability (scoped release)

- **DOCX:** Safe HTTP(S) hyperlinks now export as proper Word relationship targets and import back as editable links, including links inside table cells. Unsupported schemes and MySoft-local links remain visible text with explicit conversion warnings. Strike, superscript and subscript runs round-trip for the supported inline subset.
- **PPTX:** Plain-text speaker notes now export as notes-slide parts and import from related notes slides, with notes-master and package relationships. Unsupported master layouts, media, animations and complex note objects are not preserved. Export fails early if the bounded Office ZIP part count would be exceeded.
- **PDF:** Clicking a saved source-page bookmark during an asynchronous PDF load queues the correct destination instead of silently ignoring the click.
- **Testing:** Browser-level DOCX/PPTX round trips, external Office fixture imports, independent python-docx/python-pptx validation, plus the existing storage and editor regression gates.
- **Scope:** Still not Word/PowerPoint parity, automatic PDF embedding of internal bookmarks, full XLSX formula fidelity, or production-grade multi-user synchronization.

# MySoft Office

## v0.8.0 — Professional editing workflows (bounded preview)

- Docs can refresh an existing manually inserted heading contents list from H1–H3, with explicit user action. This is not real page-aware TOC automation.
- Sheets adds **Copy to…** with transactional preflight, relative A1 formula shifts and cell style preservation. Absolute and cross-sheet references remain unsupported, as do destinations beyond Z1000.
- PDF source-page bookmarks are included in the local MySoft file/revision/backup models and are not embedded in PDF exports. Media image/video editors add an unsaved, non-destructive Compare original preview toggle. See release tests and Office compatibility documentation.
- The v0.7.0 data safety and v0.7.1 conditional formulas, local cross-app links and Slides shapes remain in effect.

## v0.7.1 — Calculation correctness, cross-app links and PPTX shapes

- Numeric IF, AND and OR formulas now avoid executing unselected expressions. Syntax remains validated, while selected errors such as division by zero are still reported.
- Docs and Notes Tools add stable, local file links and outgoing/incoming reference discovery across MySoft files. Links can target Sheets, Slides, PDF and Media files, but do not embed their content or update automatically.
- Slides adds editable diamond and hexagon objects, with CSS silhouettes and supported DrawingML preset-geometry import/export; triangle and rounded rectangle rendering are refined.
- Unit and Chromium regression tests cover formula short-circuiting, local links and native PPTX shapes.

## v0.7.0 — Incremental local persistence foundation

- Workspace saves now patch only changed IndexedDB file/trash/revision records while keeping the same atomic read/write transaction and committed-revision conflict detection. Previously each save cleared and rewrote every collection.
- A pure change planner is tested for edits, source-to-trash moves, revision updates, and same-metadata content changes. The full saved workspace remains the authoritative data model; this is **not** cloud collaboration or automatic conflict merging.
- Existing browser workspaces, legacy migration, JSON backups and recovery journal compatibility remain unchanged.


**Your work. Your space.**

Interface icons use locally bundled [Lucide](https://lucide.dev) SVGs (v0.468.0), with consistent strokes, accessible control labels, and no runtime icon service. The license is retained in `assets/lucide-license.txt`.

The default Indigo appearance coordinates workspace navigation, editor controls, cards and dialogs with cool slate surfaces in light and dark modes. Customize offers nine accent palettes. Existing appearance settings migrate automatically, with the former default orange updated to Indigo; authored document and slide colors are preserved.

Each app retains its native identity: Docs blue, Sheets green, Slides orange, Notes purple, PDF red and Media teal. App cards, file icons, navigation and recent tabs keep these colors across all workspace themes; opening an editor also applies its native accent to its editing controls and header.

App cards use neutral borders, with native colors reserved for their icons. The MySoft Office mark and favicon use the original tilted four-tile silhouette in Docs blue, Sheets green, Slides orange and Notes purple, without internal symbols.

Navigation uses compact app names and a two-column backup/import area. The header provides the single New file action, and Docs avoids duplicate formatting toolbars. Responsive layouts reserve room for the editor canvas, wrap and scroll tools within their own panels, and provide a collapsible document outline on smaller screens.

Interface finishing includes softer surface depth, consistent system typography, quieter desktop row actions, keyboard-accessible file titles, and labeled dialogs with contained focus and focus restoration.

MySoft Office is an independent, local-first productivity suite with Docs, Sheets, Slides, Notes, PDF and Media. Version **0.6.2 Editor Depth & Reliability Preview** retains native DOCX/XLSX/PPTX support and adds a redesigned, responsive workspace, denser editing ribbons and functional commands. Consult [OFFICE_PARITY_ROADMAP.md](OFFICE_PARITY_ROADMAP.md) for the capability inventory and compatibility limits.

## Expanded editor tools

See [CAPABILITIES_RESEARCH.md](CAPABILITIES_RESEARCH.md) for the dated research, primary references, supported workflows, bounds and future requirements across all six apps.

- **Docs → Tools:** paragraph spacing/indentation, uppercase/lowercase block conversion, and empty-paragraph cleanup.
- **Sheets → Tools:** trim text whitespace, extract unique rows, and split text into columns. Extraction/splitting create a new worksheet and preserve the source.
- **Slides → Tools:** create slides from an outline, reverse slide order, copy the current design across a deck, and export an outline with speaker notes.
- **Notes → Tools:** local page links and backlinks, project/research templates, and a task dashboard with reversible completion.
- **PDF:** search throughout the current page sequence, reorder/duplicate/omit source pages, extract ranges to a real PDF, and restore original order. Page edits are included in history and backups.
- **Media:** center-cropped output presets, sepia/hue finishing, caption typography, drawing layer management, DC correction/balance, loop preview, outer-silence trimming, and six-frame video storyboard PNG export.

## MySoft PDF

- Import PDFs from the PDF app or the workspace Import file action. Files stay on-device in IndexedDB and are included in JSON backups, favorites, duplication, search and recoverable Trash.
- View one page at a time with page navigation, fit-to-width, zoom and an accessible Page text disclosure. Workspace content search indexes the first page's extractable text.
- Rotate pages left/right, reset rotations, restore rotation history, and download a valid PDF copy. Original source bytes remain unchanged; rotation history stores metadata rather than repeated copies of the PDF.
- Limits: 8 MB per PDF, 500 pages. Encrypted PDFs, OCR, PDF text editing, forms, signatures and annotations are not supported. Rotation export can invalidate existing signatures; retain the original signed file. Some uncommon image encodings may not render because WASM decoding is disabled. The normal PDF export returns the original file when both order and rotations are unchanged. Page organization exports copy selected pages and may omit document-level features such as forms or bookmarks.
- Viewer dependencies are bundled locally: [PDF.js](https://mozilla.github.io/pdf.js/) 6.4.299 and [pdf-lib](https://pdf-lib.js.org/) 1.17.1, with licenses in `vendor/`. Local and deployed policies allow only same-origin workers; PDF evaluation and embedded content are not enabled. JSON backup restore accepts up to 128 MB; existing cloud snapshot limits still apply.

## Editor Productivity Preview — v0.6.0

- **Docs:** Insert an editable table-of-contents **snapshot** from Heading 1–3 blocks. This is not an auto-refreshing TOC with anchor links; regenerate after changing headings.
- **Sheets:** Range ribbon copies a rectangular selection in transposed orientation to a chosen cell. Existing source values remain unchanged; overlapping destinations are handled using a snapshot. Formula strings are copied **without relative-reference adjustment**. COUNT and COUNTA now distinguish numeric values from nonempty text cells.
- **Slides:** Arrange ribbon finds and replaces literal text (case-insensitive) throughout slide titles, body text and presenter notes. Shape text is not included.
- **Notes:** Organize ribbon inserts reusable meeting notes and daily planning templates into the editable page.
- **Verification:** New pure-function tests plus full four-editor Chromium tests. Existing OOXML import/export and storage behavior remain limited to documented subsets.

**Scope note:** v0.6.0 is an editor-productivity preview. The separately planned secure-backend, multi-tab conflict resolution and collaboration milestones are **not completed** by this release.

## v0.6.1 — Fixed navigation and workspace content search

- Fixed desktop sidebar with independently scrolling navigation and anchored local backup controls; compact icon rail keeps export/import actions accessible.
- Mobile drawer has focus containment, close button, background inertness while closed, Escape and backdrop dismissal, and restored keyboard focus. Collapsing the sidebar does not remount editor content.
- Arrow Up/Down, Home and End keyboard navigation in the sidebar; skip-to-main link.
- Local file search by title, tag, document body, note body, sheet content and slides/notes, with bounded scanning. No cloud index.
- Existing Office import/export, backup and IndexedDB recovery remain unchanged.

## v0.6.2 — editor depth and conflict/security release

- Docs/Notes: paragraph-level Heading 1, Heading 2, Body and Quote formatting controls (existing contenteditable model, not a structured collaborative editor).
- Sheets: bounded numeric comparison operators and IF / AND / OR / NOT formulas; existing XLSX import/export support remains a subset.
- Slides: editable rounded rectangles and triangles with PPTX preset geometry round-trip.
- Notes: rename notebooks or sections across matching local notes, without moving other notebooks.
- Local workspace: IndexedDB transactional revision check blocks stale tab writes and preserves unsaved in-memory work for JSON export. It does not merge tab edits automatically.
- Local server: only publicly deployed files are served and it binds to loopback; production Vercel config adds CSP, frame blocking, referrer, MIME sniffing and permissions headers.
- Compatibility limitations are tracked in OFFICE_COMPATIBILITY.md; features unsupported by DOCX/XLSX/PPTX must not be promised as fully faithful.

**Important:** Cloud endpoints are not pinned for CSP \`connect-src\` until a production project is configured. Multi-tab conflicts require exporting the unsaved copy and reloading. No unreviewed conflict merges are performed.

## Quick start

Node.js 20+:

```bash
git clone https://github.com/KuduKhan/mysoft-office.git
cd mysoft-office
npm run dev
```

Open http://localhost:4173. No installation step or external npm dependencies are required for the local editor prototype. This repository includes static output configuration for Vercel, but the Vercel project is not connected yet.


## v0.5.9 — Studio UX & navigation refinement

- Collapsible desktop sidebar with persisted state, touch-friendly mobile navigation overlay and breadcrumb hierarchy.
- Recent-file tabs inside the four editors; switch workspaces without revisiting file manager.
- Focus Mode reduces distractions while retaining editor ribbons and commands; Escape restores full workspace.
- Live Docs/Notes word/character counts, spreadsheet cell counts and slide totals.
- `/` focuses file search when not editing. Preferences include navigation layout alongside the existing themes, density, font scale and zoom.
- Unit and browser regression tests cover these flows.

This UI enhancement builds on the v0.5.8 IndexedDB/recovery branch. It does not claim new cloud capabilities or full Office format fidelity.

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

## MySoft Media

The Media app brings images, drawing, audio and video into the same local workspace. Open a media file or start a blank drawing from its launch screen. Media projects support title search, caption/source-name search, favorites, duplication, recycle bin, revision history and JSON backups. Original source bytes stay separate from the edits; **Original** downloads the untouched source, and **Reset edits** restores the editing defaults. Undo and redo cover the current editing session.

- **Images and drawings:** proportional resizing, percentage crop, rotation, horizontal flip, brightness, contrast, saturation, softness, five finishing looks, captions, background colors and transparency. Draw with a pen, eraser, line, rectangle or ellipse, with optional filled shapes. Export PNG, JPEG or WebP; JPEG uses a white background for transparent areas.
- **Audio:** waveform and processed playback preview, trimming, volume, speed, fades, normalization, reversal and stereo-to-mono mixing. Export actual edited 16-bit PCM WAV. Speed resamples the audio and also changes pitch.
- **Video:** preview and seek, trimming, speed, volume/mute, visual adjustments, captions and drawing overlays. Save an image of the current frame or export an edited WebM in real time, including supported source audio. Keep the tab visible during export; Cancel stops recording without downloading a partial file.

Media imports are limited to **16 MB per source**. Images support PNG, JPEG, WebP and GIF (first frame), up to 32 megapixels; edited output is limited to 4096 pixels per side and 12 megapixels. Audio supports browser-decodable mono/stereo clips up to 3 minutes, with output limited to 3 minutes. Video sources can be up to 10 minutes; exported segments are limited to 120 seconds and 1080p. MP4/WebM/MOV playback depends on the browser's installed codecs. Video export requires WebM MediaRecorder support; MP4 encoding, multitrack timelines, animated GIF export and AI generation are not included. A workspace JSON restore accepts up to 128 MB; browser storage capacity still applies.

All processing runs locally using browser canvas, Web Audio and MediaRecorder. Media is not uploaded by these editing tools. The existing optional cloud snapshot configuration is unchanged.

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
