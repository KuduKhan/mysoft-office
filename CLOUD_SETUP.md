# MySoft Office v0.12 — Optional cloud snapshot setup

**Current status:** optional infrastructure only. Cloud snapshots are disabled until configured. Never reuse the KHANIVERSITY database for MySoft Office.

## 1. Create a dedicated project

Create a separate MySoft Office Supabase project under the organization you approve (the project may affect billing). Enable Auth email/password and confirm email verification. Configure allowed redirect URLs and the application site URL for the deployed site.

## 2. Initialize tables and policies

Run the statements in [supabase/schema.sql](supabase/schema.sql) in the new project's SQL editor. It creates a \`mysoft_workspaces\` table with:
- one JSON snapshot per user,
- row level security (RLS) enabled,
- per-user SELECT/INSERT/UPDATE policies,
- limited table grants (no anonymous write access),
- payload size/shape checks.

Review database security advisors after applying schema and test users cannot fetch each other's rows before enabling production access.

## 3. Add public configuration

Edit \`src/cloud-config.js\` with that project's HTTPS URL and **publishable key** (\`sb_publishable_...\`). These are designed to be public in browser apps. NEVER embed secret, service role or admin keys. This first release does not require an application server.

Note: the Supabase client is loaded from a version-pinned external ESM endpoint *only* if cloud is configured. Consider bundling the audited dependency and committing a lockfile in the next release.

## 4. Use snapshots

Select **Cloud snapshots**, sign in and choose **Review cloud and local files**. The comparison displays local-only, remote-only and differing files. After explicitly confirming, upload with an atomic `updated_at` compare-and-swap guard, or restore the cloud snapshot only after checking that the cloud revision has not changed. Restoring downloads a local JSON backup before replacing IndexedDB files. You can also export the remote JSON snapshot without altering local files. Concurrent remote writes cause a conflict rather than silently replacing new data. Always independently preserve an offline backup.

This is a manual, single-snapshot transfer workflow with revision-checked writes. It is **not** live continuous synchronization, automated two-way merging, per-file conflict reconciliation, collaboration or end-to-end encryption. The `updated_at` token changes on accepted client writes; maintain it for all database writers and never bypass these checks with a privileged backend. Create and test on a **dedicated** Supabase project, not an existing unrelated workspace. Both browser storage and cloud content remain inappropriate for classified/sensitive material.

## 5. Verification checklist

- [ ] Register and verify user A
- [ ] Save and fetch user A's snapshot
- [ ] User B cannot read or modify user A's snapshot
- [ ] Sign out and confirm cloud actions are blocked
- [ ] Backup and restore both v0.1 and v0.2 workspaces
- [ ] Race two browser sessions against the same cloud revision; only the first upload succeeds
- [ ] Simulate a newer cloud snapshot before restore; confirm the outdated restore is blocked
- [ ] Verify downloading the local backup before applying a reviewed cloud snapshot
- [ ] Verify deploy preview and project origin before enabling configuration
