# MySoft Office

**Your work. Your space.**

MySoft Office is a browser-based productivity workspace. Version 0.2 provides a local-first workspace with functional document, spreadsheet, presentation, and note editors.

## Quick start

Prerequisite: Node.js 20+.

```bash
git clone https://github.com/KuduKhan/mysoft-office.git
cd mysoft-office
npm run dev
```

Open http://localhost:4173.

No npm dependencies or database are needed for this first release.

## Available in v0.2

- Workspace dashboard, searching, sorting, recent files, favorites, and document creation
- Docs: rich text formatting, autosave, HTML and plain-text export
- Sheets: 12-column grid, formulas including SUM/AVERAGE/MIN/MAX, CSV export
- Slides: editable titles and body, slides management, theme choices, printable HTML export
- Notes: distraction-free note editor, markdown/text export
- JSON backup and restore; all workspace data stored in this browser

## New in v0.2

- Recoverable recycle bin (restore or permanently delete files)
- Local version snapshots with a 12-revision limit and restore UI
- Import CSV, TXT, Markdown, and sanitized HTML
- Safer CSV exports that neutralize formula-like text values
- Editor routes retained on reload and browser back/forward
- Browser smoke tests using Playwright in GitHub Actions
- Optional, manual MySoft Cloud snapshot sign-in and transfer adapter
- A separate Supabase SQL schema with strict owner-only RLS; see [CLOUD_SETUP.md](CLOUD_SETUP.md)
- Cloud is **not connected** until a dedicated MySoft database and public configuration are supplied.

## Privacy and limits

By default, this version saves data locally in the browser's localStorage. Local revisions also consume browser storage. It **does not sync across devices** and is not suitable as the sole copy of critical files. Use *Export backup* regularly. Clearing site data erases locally stored work. Cloud authentication and manual snapshot uploads are implemented in an optional adapter but **not activated**; true OOXML import/export, cloud autosave, collaboration, and advanced editing are **not implemented yet**.

Do not use this build to store classified, sensitive military, or regulated personal information.

## Commands

```bash
npm run dev
npm test
npm run build
```

A dependency-free static build is generated in `dist/` for hosting. The project is configured for Vercel.

## Roadmap

1. Replace browser-only storage with authenticated workspace sync and revisions.
2. Adopt purpose-built document, spreadsheet, and slide engines with accessibility and fidelity testing.
3. Implement secure DOCX/XLSX/PPTX import/export.
4. Add server-side AI features with user controls, privacy protections, and usage limits.
5. Add shared editing, comments, audit logs, and offline synchronization.

## Architecture

`src/app.js` powers the workspace and editors. `src/formulas.js` contains the dependency-free sheet formula engine and is unit tested. `src/styles.css` contains the design system. `scripts/server.mjs` is the local development server and `scripts/build.mjs` packages static assets.
