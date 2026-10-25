# MySoft Office v0.12.0 — Cloud Snapshot Safety

## Changes
- **Review before transfer:** A read-only comparison of local/cloud workspace records classifies local-only, cloud-only and differing file IDs, including recycle bin locations and version history divergence.
- **Remote write protection:** New cloud snapshots use create-only insert. Existing cloud snapshots use an atomic PostgREST conditional update whose `updated_at` filter must match the reviewed revision; stale writers are refused, never silently upserted.
- **Safer restore:** Recheck the remote revision and local workspace signature immediately before applying. Ask for explicit destructive-replace approval. Download a JSON backup of the existing local workspace and atomically write the validated cloud copy through the existing IndexedDB store.
- **Non-destructive export:** Download a reviewed cloud snapshot as JSON without changing the local workspace.
- **Unit/browser coverage:** snapshot comparisons, unchanged source guarantee, create-only writes, stale-revision refusal, disabled-cloud UI and existing local save/reload.

## Critical limitations
This is **manual conflict-aware cloud snapshots**, not background sync, automatic merge, row-wise cloud collaboration, unlimited file storage or end-to-end encryption. The optional Supabase project is not configured by this PR and no account or remote database has been created/altered. The existing `public.mysoft_workspaces` table and per-user RLS setup remain required. Existing cloud writers must preserve the `updated_at` revision invariant for collision protection. Never use classified or otherwise highly sensitive content in this unencrypted cloud workflow.

## Quality / release gate
`npm run check:repo`, `npm test`, `npm run build`, full Playwright, and independent DOCX/XLSX/PPTX validation. Before enabling a dedicated cloud project, manually test real sessions A/B, RLS isolation, race conditions, key/permissions, offline failure, and backup/restore. Avoid production deployment until those gates pass.
