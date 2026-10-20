# MySoft Office v0.2 — Cloud snapshot setup

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

Select **Cloud snapshots** in the sidebar, create an account or sign in, then choose **Upload snapshot**. On another browser, sign in and choose **Download snapshot**. Downloading **replaces** local files after confirmation. Always export a local JSON backup first.

This is manual one-snapshot-at-a-time transfer; it is **not** automatic cloud save, merging, cross-device real-time collaboration or encryption of end-user document content. Both browser storage and cloud content remain inappropriate for classified/sensitive material.

## 5. Verification checklist

- [ ] Register and verify user A
- [ ] Save and fetch user A's snapshot
- [ ] User B cannot read or modify user A's snapshot
- [ ] Sign out and confirm cloud actions are blocked
- [ ] Backup and restore both v0.1 and v0.2 workspaces
- [ ] Verify deploy preview and project origin before enabling configuration
