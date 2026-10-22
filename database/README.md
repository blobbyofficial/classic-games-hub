# Database migration operations

The numbered files under `database/migrations/` are an **append-only historical log**. Do not rename, reorder, squash, amend, or delete migrations already applied in any environment. The SQL sequence numbers are repository-specific and **are not** Supabase CLI timestamps.

## Local verification

- `node --test scripts/test-migration-versions.cjs` checks uniqueness, current expected schema version, naming, empty SQL and merge conflict markers. It does **not** execute SQL or prove schema correctness.
- `node --test scripts/test-local-supabase-preparation.cjs` verifies preparation logic.
- `node scripts/prepare-local-supabase-migrations.cjs` copies SQL into a local Supabase-compatible timestamp layout. This tool creates files, not database changes; its generated layout is **not** a production migration history.
- Use the repository's local Supabase acceptance workflow and disposable test database to test actual SQL execution, RLS and replay requirements.

## Before any production SQL change

1. Identify the exact production project, its current deployed app commit and migration history. Compare every applied migration version/checksum with the committed source. Do not guess from the highest filename.
2. Capture a tested backup/recovery point and verify service permissions and maintenance window.
3. Run all unapplied migrations, in order, against a disposable staging copy with matching extensions, then run security and game-data integrity tests.
4. Deploy application code and apply SQL in a documented dependency order. Merging GitHub code **does not apply SQL**.
5. Confirm rows, RLS, dependent functions and core game/account flows; record precise applied versions and rollback actions.

## Special caution

- Migrations containing refunds, rewards, backfills, or writes to player data are **not assumed replay-safe** merely because they have an `IF NOT EXISTS` clause.
- Slithery restoration is proposed in PR #76 as migration `0112`. It must be checked against any migration changes that land before merge and run on isolated staging first.
- Never paste service-role secrets or production database connection strings into PRs, documentation or CI logs.
- Create a new corrective migration for existing installations rather than editing an applied historical SQL file.

## Audit gaps

An automated filename test cannot establish whether production has all migrations or whether SQL operations are semantically safe. Environment migration histories, clean-install execution and data-preserving upgrade tests remain required evidence.
