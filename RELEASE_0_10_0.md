# MySoft Office v0.10.0 — Professional Editor Foundations

## Included in this incremental milestone
- Docs: block-level heading transitions retain paragraph formatting (style, class, id, dir, lang, title) and inline child nodes, while refusing invalid heading conversions from a table or list.
- Sheets: Data → Fill down supports existing relative formula grammar with row translation, data- and style-atomicity, 50-row cap and bounded A1:Z1000 refusal. The selected source stays unchanged; invalid translations do not partially overwrite existing cells.
- Slides: shape updates validate all properties against a draft and commit atomically to the existing object; resizing computes geometry without first moving the stored object.
- Regression tests for transactional operations, formula evaluation and browser save/reopen.

## Important constraints
This is NOT complete Office parity, cross-sheet calculations, an entire new rich-text engine, formula absolute references, full slide object groups or live collaboration. Existing editor models and IndexedDB storage do not change. All changes remain backwards compatible within their documented support subsets.

## Release quality gate
Require `npm run check:repo`, `npm test`, `npm run build`, the complete Playwright suite, and independent DOCX/XLSX/PPTX validation to pass on the PR head. Perform manual authoring and save/recovery checks for all six editors before any production deployment.
