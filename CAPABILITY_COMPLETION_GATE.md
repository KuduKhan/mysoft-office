# MySoft Office — Capability completion gate

**Status: IN PROGRESS.** This is a capability-completion initiative on top of v0.12.0, **not** a declaration that the requested PDF and Media suites are production-complete. Do not bump the product version or declare this gate complete until all acceptance tests and supported-platform checks below pass.

## 1 — Notes and knowledge graph (highest priority)
**Implemented in this tranche:** stable `linkedFileIds` for Docs, Sheets, Slides, Notes, PDF and Media; outgoing/incoming backlinks and broken-target counts; add/remove/open controls; id-based linking immune to renames; 50-link bounds; full-notebook or selected-section relocation without rewriting note content; IndexedDB/backup compatibility. Earlier note sections, tags, pinning, rename, search remain supported.

**Additional foundations delivered:** a dedicated Knowledge Studio read-only integrity view with active links, missing/recycled targets and unified per-file revision timeline; shared revision snapshots now include file links, PDF forms and annotation metadata. **Still needed:** explicit notebook/section tree operations (including empty containers), editable collection metadata, large-library navigation and migration handling, cross-file search results with link previews, change tracking for links to trashed/restored files, two-tab conflict acceptance testing, and complete browser keyboard/mobile accessibility checks.

**Acceptance:** two files from different apps can be linked, renamed, saved, reloaded, backed up/restored and opened by backlinks without losing identity or file contents. Reject self-links/duplicates and preserve unrelated records. Test interrupted saves and recovery journals.

## 2 — PDF utility suite (highest priority: annotation/form/export integrity)
**Already supported before this tranche:** bounded local import/reading, text extraction for machine-readable pages, search, page order/duplicate/remove/extract, rotation/crop, stamps/page numbering, handout/resize export, merge and source-page bookmarks **in MySoft only**.

**Implemented in this tranche:** inspect/edit native AcroForm text and checkbox values without modifying the source bytes; preserve interactive fields in ordinary-order PDF export, including form-edit undo/redo. Unsupported form types are displayed as such; reordering/merging with modified form fields is refused rather than silently losing user data. Forms with >100 fields or values >2,000 characters are rejected.

**Not implemented / NOT approved for production claims:**
- Original-text and embedded-image editing with faithful retained PDF text layout
- Structured highlight, ink, sticky-note and drawing annotations with interoperable native PDF export
- Full AcroForm/XFA fidelity, field appearances and third-party validation beyond the bounded text/checkbox subset
- Searchable OCR for scanned PDFs and quality evaluation across languages/script types
- Native embedded outline bookmarks, structured document comparison or tracked changes
- Cryptographically verifiable electronic signatures, certificate validation and signature preservation
- **Permanent content redaction**. Cropping and painted opaque rectangles do **not** delete concealed underlying text or other objects; do not expose them as permanent redaction

**PDF acceptance:** inspect output with an independent PDF reader, assert all filled fields remain real widgets and text is retrievable; render before/after page-by-page and detect visual regressions. Annotation coordinate mapping must be verified across page rotations, crop boxes and zoom levels. A separate redaction implementation must remove sensitive data from text extraction, content streams, annotations, metadata and embedded resources, then independently verify absence and re-rendering; fail closed for unsupported/complex PDFs. Never certify an overlay-only feature as redaction.

## 3 — Media production (highest priority: non-destructive edit and verified encodes)
**Already supported before this tranche:** source-media preservation, vector drawing overlays and appearance changes, global visual adjustments, WAV export, WebM recording on supporting browsers, drawing undo/redo, source comparison, trim/fades, audio compressor, storyboard and frames.

**Implemented in this tranche:** persisted lock/unlock on drawing layers (prevent changes, deletion, global transforms, reset/clear while locked); disabled destructive controls for locked layers, safe undo; WebM download now checks that its bytes begin with an EBML container header. A valid header is **not** equivalent to a full decode/transcode test.

**Not yet implemented:** real independent raster pixel layers, masks/background segmentation, per-layer adjustment stacks, reliable histograms with colorspace management, spectral audio denoise, independent multitrack audio/video editing, keyframes, subtitle authoring/import/export, timed transitions and a tested MP4 encoder/muxer. Renaming `.webm` to `.mp4` is forbidden.

**Media acceptance:** original bytes byte-for-byte preserved through all edit/reload cycles; compositing/render order, layer lock, opaque and transparent preview tested across 3 output formats and responsive device sizes; exported audio/video independently decoded to verify duration, timestamps, audio continuity, dimensions, and playable streams. MP4 requires a genuine MP4 container with independently verified codec tracks (not just MIME string or magic bytes), cancellation/retry/quota handling, and representative Android/iOS/desktop tests.

## 4 — Release & security requirements
- Check repo integrity, unit tests, complete Playwright E2E, existing DOCX/XLSX/PPTX independent checks and storage save/recovery.
- Use bounded imports and schema validation for any new persisted annotation/media objects; no silent migrations or destructive backups.
- Manual testing on phone, tablet, laptop and desktop; keyboard, touch, focus and contrast checks.
- Data remains local unless the user opts into a separately configured dedicated Cloud instance; never claim end-to-end encryption where none exists.
- Do not merge or deploy failing tests. Mark individual modules complete only when the corresponding acceptance gates pass, then review this complete checklist before a new numbered release.
