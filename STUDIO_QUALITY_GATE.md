# MySoft Studio — UI and Editing Quality Gate (v0.5.1)

**Release line stays at 0.5.x.** This is a professional interface and editing-tools milestone before any v0.6 cloud work.

MySoft's design direction draws on the discoverability and tabbed ribbons of full Office suites, and a colorful creative workspace aesthetic. This is an original application, not a copy of proprietary Office/WPS/ArtCraft UI assets.

## Shipped in this Studio refinement

### Cross-app design system
- Eight named color schemes including **Orangered, Coral, Saffron, Ocean, Jade, Violet, Rose and Graphite**.
- Preserved local theme preference; color swatches; light/dark, density and UI scale.
- Responsive editor frame, container-based scrolling, reduced long-header crowding and adaptive panels.
- Horizontally scrollable, **collapsible Ribbon** to avoid wrapping tools over the page/canvas.
- Compact local-save status and persistent editor zoom controls.

### Docs and Notes
- Bold, italic, underline, superscript, subscript, strike, clear formatting, alignment, bullet and numbered lists.
- Insert formatted quotes, page separators, links, small pictures, tables, dates, checklists, headings and dividers.
- Existing pages, margins, print, color, version history, outline, and save/export remain available.
- Current printing uses browser pagination; page separators are visual, not Word-compatible pagination.

### Sheets
- New Ribbon category for **cell alignment** and formatting.
- Find and replace in text cells on active worksheet, protecting formulas by default.
- Bounded Fill Down (1–50 rows) and clear selected cell/style.
- Existing multiple sheets, functions, chart preview, sorting, 26×1000 virtual window and XLSX conversion stay available.
- Fill Down deliberately refuses formulas until reference translation is correct.

### Slides
- Six slide color presets: Ivory, Sunset, Coral, Ocean, Jade and Night.
- Backdrop and foreground adapt together for contrast on stage and in presentation mode.
- Existing slide arrangements, theme choices, transitions, speaker notes and PPTX subset remain.

### Visual quality baseline
- Layout test viewport widths: **360, 390, 768, 1024, 1440px**.
- Assertions cover page-level horizontal overflow and collisions between editor-header buttons in Docs, Sheets, Slides and Notes.
- Internal sheets and Ribbon content scroll *inside their own containers* by design.
- Keyboard focus indicators and reduced-motion support.
- Very long text and table contents wrap or scroll inside the correct editor surfaces.

## Still missing before Microsoft Office/WPS-class feature parity

The app is not yet equivalent to WPS or Microsoft Office. We must extend the v0.5 line with:
1. A transactional rich document editor (instead of deprecated contenteditable commands), proper pagination, styles, citations, footnotes, advanced tables and review mode.
2. A workbook calculation engine with cross-sheet references, named ranges, dependency tracking, formatting, filters, validation, pivot tables, linked editable charts, advanced XLSX roundtrips.
3. A true freeform slide scene graph for individual shapes, text boxes, images, transforms, editable charts, animation timelines and full PPTX preservation.
4. A full notebook/section/page structure with drawing, ink, file attachments, audio, clipping and advanced search.
5. Extended Office-file compatibility fixtures, security testing, keyboard/screen-reader accessibility, cross-browser/mobile UX audit.
6. A reliable local database (IndexedDB) before any cloud move, avoiding localStorage capacity/data-loss limitations.

**Milestone policy:** Do not progress to v0.6 cloud/back-end scope merely because the studio looks polished. Functional editor depth, data integrity, interoperability and responsive quality must first meet practical release gates.
