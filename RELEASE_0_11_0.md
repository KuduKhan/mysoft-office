# MySoft Office v0.11.0 — Advanced Editor Workflows

## Delivered
- **Docs** — duplicate a top-level paragraph, heading or quote via Structure without losing inline markup. Cloned DOM IDs and inline event handlers are stripped; tables and lists are deliberately not duplicated by this command.
- **Sheets** — formula- and style-aware **Fill right** with a 25-column maximum. All destination formulas and styles are validated prior to a write. References leaving A1:Z1000 are rejected before modifying the grid. Absolute references and cross-sheet formula rewriting remain unsupported.
- **Slides** — distribute all native editable, unrotated slide objects across a horizontal or vertical axis within a 4% margin. Resizing is not automatic; oversized sets are refused instead of risking overlap or clipping.
- **Notes** — tag every note in the current notebook (up to 500) after validating its entire tag capacity, excluding other notebooks and file types. Duplicate tags are ignored case-insensitively; existing note bodies are unchanged.

## Compatibility and QA
Existing file models and IndexedDB workspace schema are unchanged. PDF and Media tools are retained as-is in this incremental milestone, and continue to run through the full cross-editor browser regression suite.
Require successful `npm run check:repo`, `npm test`, `npm run build`, complete Playwright browser tests and DOCX/XLSX/PPTX independent-reader checks, before merging. Retain local backups, perform physical-device QA and verify post-merge main before any release deployment.
