# Phase 3 — Backend security acceptance register

**Roadmap source:** `lib/roadmap.ts` → `v1.6.0-maintenance` → **Security and account integrity**. This is the maintenance release, *not* the separate `v1.6.0 Ground Up` game-engine rebuild.

**Evidence standard:** "Implemented" = source committed to PR #62; "CI passed" = checked GitHub workflow result; "Verified" = behavior proven in an isolated migrated database and, where applicable, a browser with separate permissioned test accounts. Never substitute the first two for the third.

| Exact roadmap item | Implemented evidence | Remaining acceptance tests | Verdict |
| --- | --- | --- | --- |
| Test score and reward tampering | `actions/games.ts` validates score/duration and difficulty; migration `0083` serializes the hourly reward-window count; CI source contracts | Run malformed RPC inputs as real authenticated clients, parallel submissions, score boundary conditions; establish game-specific score authenticity since client still supplies score and duration | **Partial; not verified** |
| Audit permissions across roles | `database/tests/phase3_role_contracts.sql` checks execution grants and sensitive RLS on an isolated DB | Apply full migrations, run SQL test; verify distinct anon/player/mod/admin accounts, denied admin writes, rollback and audit logs | **Partial; not verified** |
| Test account and social edge cases | Server Actions use Supabase auth checks (source inspection) | Separate-account browser tests: sign-up/login, reset, MFA, expiry, friend/block/DM/party/reconnect, notification privacy | **Outstanding** |
| Test purchase and gifting concurrency | `0082` locks balance on purchase and aborts on paid gift insert conflict; gifting Server Actions validate recipient UUID | In disposable DB, parallel purchase/gifts, insufficient funds, repeated attempts, independent gift senders, transaction ledger unchanged on failed gift | **Partial; not verified** |

## Safe repeatable verification (no production writes)

1. Run the standard PR site/bot CI. It verifies lint, TypeScript, unit/source contracts and build but cannot verify RLS semantics or concurrent RPC execution.
2. Provision disposable Supabase/Postgres with the complete migration chain **including the existing 0080 admin correction, and 0082 and 0083**; confirm no existing production data is used.
3. Run `psql -X -v ON_ERROR_STOP=1 "$STAGING_DATABASE_URL" -f database/tests/phase3_role_contracts.sql` using an authorized test-only admin connection. This is read-only and must not be mistaken for a privilege-context test.
4. Create synthetic anon/player/mod/admin fixtures and check both allowed and denied RPC/mutation paths; keep access tokens and credentials out of PR logs.
5. Run real simultaneous purchases/gifts/score submissions. Assert nonnegative balance, one ownership outcome, correct credit ledger, maximum intended reward count, rollback after failure and no duplicate notifications.
6. Complete browser tests for auth/session/social cases using disposable accounts.
7. Only then mark the roadmap items shipped, with test run links, deployed schema version, affected device and UTC time.

### Important unresolved architecture risk — score authenticity

The `submit_score` RPC accepts a browser-supplied score and duration and clamps those values. Rate limits and transaction locks do not prove gameplay took place. Authentic competitive scoring requires server-verifiable game events, deterministic replay verification, or per-game authoritative logic and a migration plan. Do not declare this resolved based on validation or caps.

### Current completion readout (strict roadmap acceptance)

- **Security group:** **0/4 roadmap items end-to-end verified**; code has been implemented for portions of three. No claim of 100%.
- **Whole `v1.6.0-maintenance`:** 21 planned items across six groups. Source and PR work exists, but completion requires actual deployed and device/runtime evidence, not estimated percentages.
- **Separate `v1.6.0 Ground Up`:** different roadmap entry, and this PR should not be represented as progress on its engine rebuild.

This register is a release gate, not a status-inflation exercise.
