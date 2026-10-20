# MySoft Office

**Your work. Your space.**

MySoft Office is an independent, local-first productivity suite with four browser-based editors. Version **0.3.0** expands editing tools and personal customization. It is NOT at full Microsoft Office parity; consult [OFFICE_PARITY_ROADMAP.md](OFFICE_PARITY_ROADMAP.md) for an explicit capability inventory and engineering plan.

## Quick start

Node.js 20+:

```bash
git clone https://github.com/KuduKhan/mysoft-office.git
cd mysoft-office
npm run dev
```

Open http://localhost:4173. No installation step or external npm dependencies are required for the local editor prototype. This repository includes static output configuration for Vercel, but the Vercel project is not connected yet.

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
- 12×30 grid with up to 20 worksheets in each file, rename, duplicate and delete.
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

This is still a browser prototype using localStorage. It is not an appropriate sole archive for critical work, and it does not provide classification-grade security. Browser cleanup, corruption or device loss can remove local files. Export JSON backups routinely. Cloud authentication and manual workspace snapshot code exists but **remains disabled** until a separately authorized MySoft Supabase project is configured. Do not use your KHANIVERSITY database for this app.

File interoperability is intentionally limited to simpler formats: TXT, CSV and sanitized HTML input; HTML, CSV, TXT and printable HTML output. **DOCX, XLSX and PPTX native editing, real PDF authoring, advanced chart objects, equations, pivot tables, macros, co-authoring and complete accessibility are not implemented.**

MySoft Docs still uses native contenteditable/execCommand as an intermediate editor. Production-level Word-style editing needs a modern structured editor and extensive file-fidelity tests. Do not store classified, military operational, health or other regulated sensitive content here.

## Engineering checks

```bash
npm test
npm run build
npm run dev
```

GitHub Actions runs Node unit/build checks and Playwright Chromium browser smoke tests. See `tests/`.

Architecture documentation:
- [OFFICE_PARITY_ROADMAP.md](OFFICE_PARITY_ROADMAP.md) — full Word, Excel, PowerPoint, OneNote-class targets.
- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture decisions and evolution.
- [CLOUD_SETUP.md](CLOUD_SETUP.md) — optional dedicated cloud setup.

## Development principles

- Feature quality, recoverability and compatibility before cosmetic Ribbon parity.
- Existing v0.1/v0.2 browser workspaces continue to load.
- Advanced desktop/Office file formats are not advertised until round-trip tests prove them.
- All server-side storage and collaboration must be designed with strict access control.
