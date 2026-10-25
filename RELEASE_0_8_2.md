# MySoft Office v0.8.2 — Reliability & Quality Gate

**Scope:** stabilization only; no changes to local workspace storage schema, editor document models, Office compatibility promises or Supabase credentials.

## Root-cause repair

- The 25 October 2026 `main` commit 48ccd578 tracked a `mysoft-office` Gitlink (mode 160000, SHA ba310ec2) without a `.gitmodules` file.
- Both GitHub workflows stopped in `actions/checkout` while clearing auth, reporting: `fatal: No url found for submodule path 'mysoft-office' in .gitmodules`.
- v0.8.2 deletes **only this invalid Git tree entry**; it does not delete the separately tracked application files in the repository root.
- `scripts/check-repository.mjs` checks for nested Gitlinks and missing literal relative JavaScript imports. In CI it requires Git metadata. Exported ZIP/source archives can run this check without Git metadata locally.

## Mandatory verification

1. Both GitHub Actions jobs checkout successfully and `npm run check:repo` passes.
2. `npm test` passes all existing and new editor, storage and interoperability unit tests.
3. `npm run build` packages a clean static application without missing modules.
4. Playwright Chromium browser tests pass, including create/edit/save/reopen/reload; DOCX, XLSX and PPTX independent-reader checks pass.
5. Manually export a JSON backup, create/edit/reload Docs, Sheets, Slides, Notes, PDF and Media files, then restore into a **separate test browser profile**. Confirm data parity, revision behavior and no lost edits.
6. Test 360px, 390px, 768px, 1024px and 1440px layouts and keyboard access before deployment.
7. Require both workflow jobs to succeed on feature branches before merging; protect `main` against unchecked PR merges.

## GitHub branch protection setup (administrative action)

GitHub Settings → Rules → Rulesets → New branch ruleset, target `main`, require a pull request, require status checks **test-build** and **browser**, and forbid force pushes. Verify the exact status-check context names in the repository UI before enabling a ruleset. GitHub feature support and plan restrictions may apply.

## Rollback and data safety

- Keep an external JSON export before any version upgrade; the browser's IndexedDB workspace is origin-specific and not a guaranteed backup.
- Existing workspaces are retained without migrations or destructive operations in v0.8.2.
- To undo the app change, roll back to the last validated deployment; do **not** restore the accidental Gitlink.
- The local save/conflict detection and bounded OOXML features are still prototypes. No production compliance or full Office fidelity certification is claimed.

## Verification record

CI success must be confirmed from the branch head commit and post-merge `main` before calling this release production-ready. Do not treat this checklist itself as evidence that any test passed.
