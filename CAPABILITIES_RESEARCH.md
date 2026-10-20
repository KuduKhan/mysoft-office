# MySoft Office capability review

Reviewed 21 October 2026. This review uses the products' own help manuals to identify practical editing workflows. The implementation choices below are MySoft's; they do not imply feature parity or file compatibility with those products.

## Research and delivered workflows

| App | Primary reference | Requirement derived from the reference | Implemented in this update |
| --- | --- | --- | --- |
| Docs | [Word paragraph spacing](https://support.microsoft.com/en-us/word/change-the-line-spacing-in-word), [indentation](https://support.microsoft.com/en-us/word/adjust-indents-and-spacing) | Give authors explicit control over paragraph rhythm and indentation, with formatting preserved through save and export. | Paragraph dialog: current block or all paragraphs, before/after spacing, first-line indent, seven line spacings. Upper/lowercase block conversion preserves inline emphasis. Empty-paragraph cleanup retains images. Layout settings now participate in revision history. |
| Sheets | [Excel data cleaning](https://support.microsoft.com/en-us/excel/top-ten-ways-to-clean-your-data), [unique rows](https://support.microsoft.com/en-gb/excel/get-started/filter-for-unique-values-or-remove-duplicate-values?nochrome=true) | Clean whitespace, deduplicate rows using a clear key, and separate fields without silently destroying the source. | Whitespace cleanup skips formulas and rejects text that would become a formula. Unique rows compare all selected columns, with optional header retention. Split text accepts comma, semicolon, pipe, tab or space. Unique/split results go to a new worksheet. |
| Slides | [PowerPoint outline creation](https://support.microsoft.com/en-us/powerpoint/training/create-a-powerpoint-presentation-from-an-outline), [speaker notes](https://support.microsoft.com/en-us/powerpoint/training/add-speaker-notes-to-your-slides) | Provide a fast path from structured text to a deck, and preserve presenter context while organizing it. | Append slides from a plain-text outline; blank lines separate slides. Reverse the deck while keeping the current slide selected. Copy current theme, backdrop, layout, text scale and transition across the deck. Export a Markdown outline including speaker notes. |
| Notes | [OneNote internal links](https://support.microsoft.com/en-us/onenote/create-links-to-notebooks-sections-pages-and-paragraphs), [tagged notes](https://support.microsoft.com/en-us/onenote/onenote-help-and-learning/search-for-tagged-notes-in-onenote) | Link related pages and make follow-up work easy to find. | Link another note; browse outgoing links and backlinks; project/research templates; task dashboard across notes with reversible completion. Internal links use local file IDs. Switching editors saves departing content against its own file ID. |
| PDF | [Acrobat organize pages](https://experienceleague.adobe.com/en/docs/document-cloud-learn/acrobat-learning/60-second/organize?lang=en), [move/copy pages](https://helpx.adobe.com/acrobat/desktop/edit-documents/organize-pages/move-pages.html) | Reorder, duplicate, omit and extract pages, with document-wide text search and recoverable edits. | Source-page range editor, including descending ranges and duplicates; selected-page export; original-order reset; search through the current output sequence, with page-jump results. Order and rotations are metadata; original PDF bytes remain intact. |
| Media | [Clipchamp cropping/aspect presets](https://clipchamp.com/en/crop-video/), [GIMP color levels](https://docs.gimp.org/en_GB/gimp-tool-levels.html), [Audacity DC offset](https://manual.audacityteam.org/man/dc_offset.html) | Offer predictable framing, reversible color finishing, manageable annotations and real audio cleanup. | Square, portrait, story and landscape center-crop presets; sepia/hue controls; caption font/alignment/opacity; drawing-layer selection, duplication, deletion, ordering and bounded nudging; audio DC removal, stereo balance, preview looping and outer-silence trim; six-frame PNG video storyboard with timestamps. GIMP's histogram/levels workflow remains a future capability; the implemented color tools are explicit filters. |

## Interaction and data requirements

- Four document apps expose these workflows in a dedicated **Tools** tab. PDF and Media use their existing editor panels. Controls stay inside scrollable containers on small screens.
- Inputs are bounded before bulk changes. Failed table transformations leave source data untouched. Values-only output cannot acquire spreadsheet formula semantics.
- PDF search is text-based, scans at most the 500 permitted output pages and shows up to 50 matching pages. Repeated output pages can produce repeated results. Scanned images need OCR, which is not included.
- PDF organization references original source page numbers. Omission changes exported page content; it is not a redaction tool. Rebuilding a PDF may omit document-level bookmarks, forms, attachments or signature validity. Retain the original for those features.
- Paragraph styling is retained in MySoft HTML and printable output. The existing limited DOCX converter does not promise full paragraph-style round trips.
- Unique-row extraction and splitting are one-time values-only results, not live linked formulas. The 26-column, 1000-row worksheet and 2600-cell operation bounds remain in force.
- A task is a `☐` or `☑` marker in a note. The dashboard shows up to 300 tasks and edits those markers directly. It is not an external reminder service. Backlinks update from the current workspace; trashed or missing notes are not shown as destinations.
- Media presets crop centrally rather than stretch. Unusually extreme source aspects that need more than 45% crop on a side are rejected. Layer nudging keeps the entire annotation within normalized canvas bounds. Drawing exports do not add editor guides.
- Audio outer-silence trimming uses an absolute amplitude threshold of 0.01 (about -40 dBFS), retains 10 ms padding and leaves interior pauses intact. It does not remove background noise. DC correction and balance affect preview and WAV output. Looping affects preview only.
- Storyboards sample six points across the selected source range, show source timestamps and include current visual edits. The source video and its play position are retained. Existing video export remains real-time WebM, up to 120 seconds and 1080p.

## Broader professional editor requirements

These are useful future requirements, not features advertised as implemented:

| App | Existing foundation | Larger remaining work |
| --- | --- | --- |
| Docs | Formatting, tables, images, links, headings, comments, history, page settings and search | Structured editing engine, pagination, footnotes, citations, tracked changes and high-fidelity DOCX round trips |
| Sheets | Bounded grid, formulas, worksheets, range formatting, conditional rules, charts and auditing | Typed validation, filters, configurable freeze panes, pivot tables, richer charts and comprehensive XLSX fidelity |
| Slides | Editable text/shapes, themes, layout presets, speaker notes, layer order, alignment and slideshow | Slide masters, embedded media, transitions with precise timings, presenter console and comprehensive PPTX fidelity |
| Notes | Notebooks/sections, tags, search, templates, pinning, local links and tasks | Attachment indexing, handwriting/OCR, reminders and conflict-aware shared editing |
| PDF | Canvas reader, text extraction/search, page navigation/zoom, rotation and page organization | Text/image authoring, annotations, fillable forms, OCR, validated redaction and signatures |
| Media | Source-preserving raster, drawing, single-clip audio/video editing, WAV/PNG/JPEG/WebP/WebM exports | Histograms/levels, masks, multitrack composition, keyframes, subtitle timelines, compressed audio encoding and MP4 encoding |

## Verification criteria

Pure operation checks cover bounds, atomicity, formula safety, source preservation, PDF order parsing, audio samples and layer geometry. Browser flows exercise all six apps through editing, saving/reopening and real output parsing. PDF output is opened with an independent PDF parser; PNG dimensions and WAV samples are inspected; video storyboards are rendered as PNGs. Existing PDF/media flows and responsive editor/navigation checks remain part of regression verification.
