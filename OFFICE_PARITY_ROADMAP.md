# MySoft Office — Microsoft Office-class capability roadmap

**Product direction:** develop a genuinely interoperable and configurable productivity suite, not a lookalike UI. The Microsoft 365 feature set evolves continuously; the inventory below is a set of engineering targets, not claims of equivalence.

## Status key
- **Implemented (v0.4)**: present in the browser prototype and covered by its release tests.
- **Partial**: useful basic capability but not Office-equivalent.
- **Planned**: requires new editor engines, services, formats or security architecture.

## Shared Office shell

| Capability | Status | Planned target |
|---|---|---|
| Unified dashboard, recent files, file search | Implemented | Folders, advanced search, permissions, audit trails |
| Multiple editing apps in one workspace | Implemented | Shared document model and reusable commands |
| Light/dark appearance, accent, density, UI scale | Implemented | Keyboard remapping, role-based Ribbon presets, accessibility profiles |
| Local autosave and JSON backup | Implemented | Durable revisioned backend, eventual consistency and recovery |
| Recycle bin and bounded revision history | Implemented | Server-managed retention and point-in-time restores |
| Import TXT/CSV/HTML, export HTML/CSV/TXT | Implemented | Full OOXML/PDF/ODF fidelity matrix |
| Cloud sign-in/manual snapshot adapter | Prepared but disabled | Dedicated authenticated multi-user workspace with encrypted transport |
| Real-time co-editing, presence, comments | Planned | CRDT, conflict resolution, permissions and notifications |
| Responsive layout, shortcuts | Partial | Full WCAG accessibility and mobile command ergonomics |

## MySoft Docs → Word-class target

**Working/partial v0.4:** headings, live document outline and in-session undo/redo,, emphasis, lists, text alignment, links, font/size/color/highlight, tables, dividers, checklists, dates, find-and-replace, page size/orientation/margins/background/line spacing, print/PDF through browser, word count.

**Planned professional authoring:** consistent document tree and transactions; headers, footers and page numbers; section breaks, columns, tab stops, paragraph styles, tables with merging/resizing; images, captions, floating layouts, footnotes/endnotes; automatic TOC, citations, bibliography, equations, cross-references; track changes, comments, spell and grammar checks, accessibility checker, mail merge, templates, document protection; pixel-respectful DOCX read/write.

Use a maintained structured editor such as ProseMirror/Tiptap or an audited permissively licensed alternative. Avoid relying on deprecated execCommand for long-term Word-class editing.

## MySoft Sheets → Excel-class target

**Working/partial v0.3:** 26×1,000 windowed grid with direct address navigation, multi-worksheet model (20 sheets), cell styles, numeric display presets, arithmetic, formula references, aggregates/statistics, formula-aware sorting safeguards, read-only bar/line previews, CSV import/export.

**Planned professional computation:** scalable virtualized grid; full formula parser, dependency graph and recalculation; cross-sheet references; names and ranges; cell editing/format inheritance; filters, typed tables, grouping and freeze panes; column/row dimensions; charts with linked editable series; conditional formatting and validation; pivot tables, data imports, Power Query-style transforms, connectors, pivot charts, large XLSX round-trip, locale-sensitive number formats, protection and collaboration.

Formula correctness, deterministic evaluation and Excel round-trip fixtures must be treated as release gates. Complex functions, date serials and large files should use a robust licensed engine rather than manually reimplementing all of Excel.

## MySoft Slides → PowerPoint-class target

**Working/partial v0.3:** slide creation and cloning, themes, layouts, speaker notes, ordering, text scale, fade/slide slideshow effects, fullscreen-style presentation overlay, printable HTML.

**Planned professional presentations:** freeform editable slide scene graph; text boxes, images, shapes, guides and alignment/snapping; master slides, themes and placeholders; vector drawing, tables, charts, media; entrance/emphasis/exit animation timeline, motion paths and advanced transitions; presenter mode, timings, recording, notes, collaborative review, accessibility checks, precise PPTX import/export, export to PDF/video.

Distinguish slide-wide transitions from per-element animations; they are separate subsystems.

## MySoft Notes → OneNote-class target

**Working/partial v0.3:** rich notes, titles, tags, checklists, local saving, plain text export, notebook-like side navigation.

**Planned professional knowledge capture:** notebook → section → page hierarchy; free-placement canvas; handwriting/ink, OCR, audio, files and clipped webpages; searchable tags, links, task integration, templates, offline sync, shared notebooks, access rights and OneNote/HTML/PDF export.

## Architecture to grow beyond v0.3

1. **v0.4 — editor foundations (implemented partially):** a 26×1,000 row-windowed grid, direct keyboard navigation, document outline, session history. Structured editor migration and full accessibility audits remain open.
2. **v0.5 — Office interoperability:** read/write DOCX/XLSX/PPTX using evaluated licensed libraries/services. Build golden-file regression suites before advertising format support.
3. **v0.6 — secure backend:** dedicated MySoft project, relational metadata and blob storage, identity and tenant isolation, least-privilege RLS, encrypted transport, backups and quota controls. Do not reuse KHANIVERSITY's database.
4. **v0.7 — collaborative workspace:** revision conflict resolution, shared documents, comments, notifications, granular roles and audit records.
5. **v0.8 — productivity intelligence:** user-controlled tool-calling assistant that works on typed document operations, with review-before-apply and source visibility. No direct arbitrary scripting or privileged prompt-generated SQL.
6. **v0.9 — professional editors:** advanced tables, pivots and charts, presenter tools, inking and notebook organization.
7. **v1.0 — public readiness:** load/latency targets, security review, WCAG tests, corruption/failure recovery drills, export fidelity scoreboard, documentation, support and upgrade strategy.

## Hard engineering rules

- Never claim "compatible with Microsoft Office" based solely on file extensions. Test formatting round-trip and clearly flag unsupported constructs.
- Maintain canonical typed document/workbook/presentation representations, separated from renderers.
- Keep imports sandboxed/sanitized, restrict remote resources, scan uploaded content, avoid macros by default.
- Treat collaboration security, end-to-end durability and privacy as core architecture—not UI polish.
- Protect users against silent data loss. Keep stable schema migrations and full backup/restore tests.
- Check licensing terms before embedding Microsoft-proprietary assets, icons, fonts or third-party engines.
- Provide privacy policy, clear cloud/local save indicators and accessibility for keyboard and assistive tech.

## v0.4 limitations (explicit)

This release still uses browser localStorage, native contenteditable editing and a small in-house spreadsheet engine. It is **not** an Office-equivalent production suite, does not offer full file format fidelity, doesn't yet have true cloud autosave or multi-user co-authoring, and should not hold classified, sensitive military or regulated information.

Focus on **depth, correctness and interoperability** rather than shipping hundreds of cosmetic Ribbon buttons.
