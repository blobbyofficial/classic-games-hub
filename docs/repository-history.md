# Repository history and release evidence

Updated 16 October 2026. Evidence: [Git history](https://github.com/blobbyofficial/classic-games-hub/commits/main), [release ledger](../lib/update-log.ts), [changelog](../CHANGELOG.md), and [GitHub Releases](https://github.com/blobbyofficial/classic-games-hub/releases). **Commit coverage below is the 100 most recent commits exposed by the connected search, not the complete lifetime history.**

## Sources of truth

- Git commits show code recorded in Git, not proof of a live Vercel deployment.
- `lib/update-log.ts` and `/updates` provide the curated shipped release stories and associated SHAs/PRs; `CHANGELOG.md` contains detailed narrative.
- `lib/roadmap.ts` contains intended work, which is not yet shipped.
- GitHub releases and tags must be independently checked; release ledger entries do not automatically certify published tags.
- Confirm production status against deployed Vercel SHA and Supabase migration state.

## Curated release chronology

| Version | Name | Date recorded in ledger |
|---|---|---|
| v1.5.12 | Second Factor | 17 Aug 2026 |
| v1.5.11 | Housekeeping | 16 Aug 2026 |
| v1.5.10 | No Host Required | 15 Aug 2026 |
| v1.5.9 | On the Record | 15 Aug 2026 |
| v1.5.8 | Not Two Yet | 14 Aug 2026 |
| v1.5.7 | Unblocked | 13 Aug 2026 |
| v1.5.6 | Is It Just Me? | 13 Aug 2026 |
| v1.5.5 | Under Construction | 12 Aug 2026 |
| v1.5.4 | Broadcast | 4 Aug 2026 |
| v1.5.2 | Server Export | 3 Aug 2026 |
| v1.5.1 | Setup, Finished | 3 Aug 2026 |
| v1.5.0 | Collector's Edition | 2 Aug 2026 |
| v1.4.9 | The Dashboard, Tidied | 28 - 29 Jul 2026 |
| v1.4.8 | Settings That Take Effect | 28 Jul 2026 |
| v1.4.7 | Run It From the Dashboard | 28 Jul 2026 |
| v1.4.6 | Failures That Name Themselves | 28 Jul 2026 |
| v1.4.5 | The Update Log | 28 Jul 2026 |
| v1.4.4 | Parties | 28 Jul 2026 |
| v1.4.3 | One Bot | 27 Jul 2026 |
| v1.4.2 | Housekeeping | 26 - 27 Jul 2026 |
| v1.4.1 | Every Pixel | 22 Jul 2026 |
| v1.4.0 | New Dimensions | 22 Jul 2026 |
| v1.3.0 | Living Arcade | 22 Jul 2026 |
| v1.2.3 | The Bot Update | 22 Jul 2026 |
| v1.2.2 | Arcade & Chat Polish | 21 Jul 2026 |
| v1.2.1 | Notifications & Polish | 21 Jul 2026 |
| v1.2.0 | Identity & Connection | 21 Jul 2026 |
| v1.1.2 | Open Plans | 20 Jul 2026 |
| v1.1.1 | Sharp Edges | 20 Jul 2026 |
| v1.1.0 | Feature Complete | 19 Jul 2026 |
| v1.0.0 | First Cabinet | 21 Mar 2026 |

These are *ledger dates*, not independently confirmed deployment timestamps. The ledger explains historical renumberings: the interface redesign became **v1.4.10** after an older release also used v1.4.1; **Sanded Down** became **v1.5.3** after earlier Discord work was assigned v1.5.1 and v1.5.2. Retain its `formerly` aliases.

## Historical feature milestones

- **Games**: canvas engines and a lazy engine registry; 26 engines were placed in development for the v1.6 rebuild according to the August roadmap changes. A file existing does not imply that game is currently open to players.
- **Accounts**: Supabase Auth; authenticator-based 2FA and recovery codes were described as v1.5.12, tied to migration 0076.
- **Social/economy**: friends, chat, parties, credits, shops, collections, seasons and cosmetic loadouts evolved across the 1.x series.
- **Status**: status API and report infrastructure were introduced around migration 0071; Discord audit logs around 0072 and 0073; scheduled `pg_cron` jobs in 0075.
- **Privacy**: cookie consent gates analytics; migration 0042 removed the former simulated rewarded-ad implementation.
- **Vercel**: `docs/cron-jobs.md` documents a 3–13 August deployment interruption associated with an unsupported sub-daily Hobby cron expression. Treat precise production deployment dates as unverified until corroborated by the Vercel dashboard.

## Recorded recent commits (100 entries)

Entries below are commit **subjects**, not claims that changes were released. Merge commits and dependency-bot changes are deliberately retained.

| Date UTC | SHA | Subject |
|---|---|---|
| 2026-10-16 | [`2aa8a762`](https://github.com/blobbyofficial/classic-games-hub/commit/2aa8a76259750a06d3a1d14ab23937a283a9e86e) | icon update (stage 1) |
| 2026-10-16 | [`c42dab8d`](https://github.com/blobbyofficial/classic-games-hub/commit/c42dab8ddc742c8cd31c673e6bdadaac01d00235) | Update status.ts |
| 2026-10-16 | [`ab97516b`](https://github.com/blobbyofficial/classic-games-hub/commit/ab97516bd1e9e57b596295a41c80e4262a7ea563) | Update package-lock.json |
| 2026-10-16 | [`e712500e`](https://github.com/blobbyofficial/classic-games-hub/commit/e712500e6079439bd7a5a560e45712c619ed3939) | bug fix |
| 2026-10-16 | [`ba44d240`](https://github.com/blobbyofficial/classic-games-hub/commit/ba44d240bda86bcbff4f029382891519282cf4a2) | Update two-factor.ts |
| 2026-10-16 | [`85a1e469`](https://github.com/blobbyofficial/classic-games-hub/commit/85a1e46959304a82c55b0d637b8933dfc898985d) | Update status.ts |
| 2026-10-16 | [`2b6eb625`](https://github.com/blobbyofficial/classic-games-hub/commit/2b6eb625e73b1b4561f6891248d3f1852778fce1) | Update social.ts |
| 2026-10-16 | [`701ff49f`](https://github.com/blobbyofficial/classic-games-hub/commit/701ff49ff81663da72b4d31497f3cd784c5412a5) | Update profile.ts |
| 2026-10-16 | [`3af08155`](https://github.com/blobbyofficial/classic-games-hub/commit/3af08155dc9f7ad2c31a76cf7821d77f16625e93) | Update parties.ts |
| 2026-10-16 | [`825af979`](https://github.com/blobbyofficial/classic-games-hub/commit/825af9799d96c01b8d830963008cfd0b5598820a) | Update gifs.ts |
| 2026-10-16 | [`f88cfdb1`](https://github.com/blobbyofficial/classic-games-hub/commit/f88cfdb190f35e7e6972319a452299cf121a2029) | Update games.ts |
| 2026-10-16 | [`dd3d317a`](https://github.com/blobbyofficial/classic-games-hub/commit/dd3d317a3357a35ffdc02e8beb09732404d8eb88) | Update economy.ts |
| 2026-10-16 | [`45ea258a`](https://github.com/blobbyofficial/classic-games-hub/commit/45ea258a914fd04683a0441eb1e8b8d69cdb7f06) | Update discord.ts |
| 2026-10-16 | [`829b457f`](https://github.com/blobbyofficial/classic-games-hub/commit/829b457fb975d2e1e838ad800c317af4e77bf782) | Update discord-admin.ts |
| 2026-10-16 | [`56ec6e0d`](https://github.com/blobbyofficial/classic-games-hub/commit/56ec6e0de47253b8282185ad794bf6c5bfada1f3) | Update auth.ts |
| 2026-10-16 | [`0e57812f`](https://github.com/blobbyofficial/classic-games-hub/commit/0e57812f310c1df7e5375618a966819af8d41121) | Update admin.ts |
| 2026-08-25 | [`02567d61`](https://github.com/blobbyofficial/classic-games-hub/commit/02567d619be0d629901ece5295b40a3f4d82f5e3) | Update globals.css |
| 2026-08-25 | [`55075095`](https://github.com/blobbyofficial/classic-games-hub/commit/55075095b0a60982702c634dae581098846e71f0) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`9be92614`](https://github.com/blobbyofficial/classic-games-hub/commit/9be926149143ebec75f6fb68a2e31ba8fb257866) | Slithery |
| 2026-08-25 | [`c00713ae`](https://github.com/blobbyofficial/classic-games-hub/commit/c00713ae8b461509fb73b541e57d115e6e49b0cd) | Merge branch 'main' of https://github.com/blobbyofficial/classic-games-hub |
| 2026-08-25 | [`4c398bbf`](https://github.com/blobbyofficial/classic-games-hub/commit/4c398bbf147d8d1e59021f301ab875fc9714cc23) | Slithery |
| 2026-08-25 | [`41a605e7`](https://github.com/blobbyofficial/classic-games-hub/commit/41a605e72b0da7bbb824e491d9595dc5d8e5d77c) | Refactor snake game engine with type improvements |
| 2026-08-25 | [`19f9b6fd`](https://github.com/blobbyofficial/classic-games-hub/commit/19f9b6fd4e9319540784f17713e7f958af781623) | Refactor comments and clean up code formatting |
| 2026-08-25 | [`3bdd2805`](https://github.com/blobbyofficial/classic-games-hub/commit/3bdd2805ccb07548bc6a754c5108b0e8ff9c8324) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`51f144d0`](https://github.com/blobbyofficial/classic-games-hub/commit/51f144d0166bd8204ca7c5f16f720f178327f693) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`87fd1a28`](https://github.com/blobbyofficial/classic-games-hub/commit/87fd1a28c76f14423972b9ba3850ee2494650dea) | Clean up comments and adjust spacing in frogger.ts |
| 2026-08-25 | [`c301f345`](https://github.com/blobbyofficial/classic-games-hub/commit/c301f345ee9ed70dcbb14ff8b27435c21df770be) | Refactor object spawning logic in frogger.ts |
| 2026-08-25 | [`3ee11433`](https://github.com/blobbyofficial/classic-games-hub/commit/3ee114339d0b6636c92665ee9b3ddea7d208ed48) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`500f17c0`](https://github.com/blobbyofficial/classic-games-hub/commit/500f17c066673e809c707d0e1189fda2201ff114) | Refactor frogger.ts for code consistency and clarity |
| 2026-08-25 | [`b8f81e52`](https://github.com/blobbyofficial/classic-games-hub/commit/b8f81e52388404d9eec8934269b8d2b64188e232) | Fix typo in greeting message |
| 2026-08-25 | [`cbaafe36`](https://github.com/blobbyofficial/classic-games-hub/commit/cbaafe3659ef2c84a6e92d57b5a2900c378b21b4) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`31425a6d`](https://github.com/blobbyofficial/classic-games-hub/commit/31425a6df112348a894f4674340aacb885704ea8) | Refactor connect4.ts for better readability |
| 2026-08-25 | [`b506961a`](https://github.com/blobbyofficial/classic-games-hub/commit/b506961ad70163189441ad8bd1991510bb6eb9e0) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`ccb601b4`](https://github.com/blobbyofficial/classic-games-hub/commit/ccb601b49bf826ce9588db7506ee30734ab34949) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`f134a2ff`](https://github.com/blobbyofficial/classic-games-hub/commit/f134a2ff1236463b8137000e21908b7101b6bc7e) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`be1a3f2b`](https://github.com/blobbyofficial/classic-games-hub/commit/be1a3f2bc7b59dc0036fa5bed5c682b316ec09cb) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`4076c19f`](https://github.com/blobbyofficial/classic-games-hub/commit/4076c19f1a9d31909d87cb70b9339884266831d8) | Update print statement from 'Hello' to 'Goodbye' |
| 2026-08-25 | [`81a2ba9f`](https://github.com/blobbyofficial/classic-games-hub/commit/81a2ba9f95443622942f90ff4ab3910aeae84494) | Merge branch 'main' of https://github.com/blobbyofficial/classic-games-hub |
| 2026-08-25 | [`db9747a3`](https://github.com/blobbyofficial/classic-games-hub/commit/db9747a387cbe03da5d4308940152ae6d60f59a6) | Merge pull request #31 from blobbyofficial/dependabot/npm_and_yarn/radix-d075b773b3 |
| 2026-08-25 | [`8d498c44`](https://github.com/blobbyofficial/classic-games-hub/commit/8d498c44694d3cc025142c96d7923ac712fac65f) | Merge pull request #32 from blobbyofficial/dependabot/npm_and_yarn/types-bf53e8768d |
| 2026-08-25 | [`9513923d`](https://github.com/blobbyofficial/classic-games-hub/commit/9513923dc6b54b343248f7abc12b4834f5218b7f) | Merge branch 'main' into dependabot/npm_and_yarn/types-bf53e8768d |
| 2026-08-25 | [`56d238a0`](https://github.com/blobbyofficial/classic-games-hub/commit/56d238a0f0993b6097080366a532cd892d180805) | chore(deps): bump the radix group across 1 directory with 14 updates |
| 2026-08-25 | [`c274e451`](https://github.com/blobbyofficial/classic-games-hub/commit/c274e451654a624a27b201502e9c9a39826fd3c3) | chore(deps): bump the types group across 1 directory with 4 updates |
| 2026-08-25 | [`8fe0a9f8`](https://github.com/blobbyofficial/classic-games-hub/commit/8fe0a9f869ec4a7c1973efdc49a3797bb7c6355a) | Merge pull request #34 from blobbyofficial/dependabot/npm_and_yarn/development-484b35d1ea |
| 2026-08-25 | [`cda8a18b`](https://github.com/blobbyofficial/classic-games-hub/commit/cda8a18bd33284c6db34a1686e2ad2d57dacfd3d) | chore(deps): bump sharp in the development group across 1 directory |
| 2026-08-25 | [`dfaf61bc`](https://github.com/blobbyofficial/classic-games-hub/commit/dfaf61bc204cce4bf3e6e256ed50e037176e8671) | Merge pull request #33 from blobbyofficial/dependabot/npm_and_yarn/production-5626023f3d |
| 2026-08-25 | [`e49b3b5e`](https://github.com/blobbyofficial/classic-games-hub/commit/e49b3b5e5ac869cd9a6c25d179f3d8b4d6c04fa4) | Change 'Hello World' to 'Goodbye World' |
| 2026-08-25 | [`794019fd`](https://github.com/blobbyofficial/classic-games-hub/commit/794019fd854e56ee504fb8ab3307e32bcf2d010b) | Merge pull request #30 from blobbyofficial/dependabot/github_actions/actions-0e3d324e1b |
| 2026-08-25 | [`a6391dba`](https://github.com/blobbyofficial/classic-games-hub/commit/a6391dba7994f020e323cfe852dd3262183d3dc0) | Merge pull request #29 from blobbyofficial/dependabot/npm_and_yarn/bot/bot-18ee6836dd |
| 2026-08-25 | [`dabd185c`](https://github.com/blobbyofficial/classic-games-hub/commit/dabd185c5a8bf849daa0605f915f8d69d5a51d95) | Update asteroids.ts |
| 2026-08-25 | [`f1fc90f5`](https://github.com/blobbyofficial/classic-games-hub/commit/f1fc90f5c663c5b4efb5d6cbe0efef58208fbe94) | Update asteroids.ts |
| 2026-08-24 | [`d30d1db1`](https://github.com/blobbyofficial/classic-games-hub/commit/d30d1db185499e79b9544b423270e901ee8352d5) | chore(deps): bump the production group across 1 directory with 8 updates |
| 2026-08-24 | [`2a8da78c`](https://github.com/blobbyofficial/classic-games-hub/commit/2a8da78c7b8c38872714d2ccaca4d95134714b8c) | chore(deps,bot): bump the bot group across 1 directory with 5 updates |
| 2026-08-17 | [`abb6b72f`](https://github.com/blobbyofficial/classic-games-hub/commit/abb6b72fd79ff6996b287e99bbc72203ae16727c) | Merge pull request #36 — fix the 2FA enrolment QR |
| 2026-08-17 | [`ef066b68`](https://github.com/blobbyofficial/classic-games-hub/commit/ef066b68d558c10d1166c3eb23ee84944a8912d1) | fix(2fa): the enrolment QR rendered as a broken image |
| 2026-08-17 | [`d8f61007`](https://github.com/blobbyofficial/classic-games-hub/commit/d8f6100730086d5e0df40d4ff36ae97c4c114716) | Merge pull request #35 — v1.5.12 "Second Factor" |
| 2026-08-17 | [`074636c3`](https://github.com/blobbyofficial/classic-games-hub/commit/074636c3763c2ef3f247038c1e282b3f51ef6365) | feat(v1.5.12): two-factor authentication, with recovery codes (0076) |
| 2026-08-16 | [`f569daab`](https://github.com/blobbyofficial/classic-games-hub/commit/f569daaba29bea8af020dc90052bd84290e1abb1) | chore(ci): bump the actions group with 3 updates |
| 2026-08-16 | [`a50dcfdc`](https://github.com/blobbyofficial/classic-games-hub/commit/a50dcfdc8cbc5f9fed1715e80da659479f8c58ee) | Merge pull request #28 — v1.5.11 "Housekeeping" |
| 2026-08-16 | [`4123e9c5`](https://github.com/blobbyofficial/classic-games-hub/commit/4123e9c54b21e3713a0ce2d110da93714949c24a) | feat(v1.5.11): platform audit - CI, pg_cron, OG cards, indexes (0074, 0075) |
| 2026-08-15 | [`d47cfab3`](https://github.com/blobbyofficial/classic-games-hub/commit/d47cfab375231375ab6c561e462c32ec3aac13c4) | Merge pull request #27 — v1.5.10 "No Host Required" |
| 2026-08-15 | [`cf16de73`](https://github.com/blobbyofficial/classic-games-hub/commit/cf16de73e3412c163e9ef74ac998426f792b4e50) | fix(discord): correct what a full audit-log page actually means |
| 2026-08-15 | [`a7dc6cbb`](https://github.com/blobbyofficial/classic-games-hub/commit/a7dc6cbb6bfe92fba1c5f1087ffdc3f75f2e33c4) | fix(discord): say so when an audit-log poll may have missed entries |
| 2026-08-15 | [`c636974b`](https://github.com/blobbyofficial/classic-games-hub/commit/c636974b5189d30adb00f5e249a9d59c4c3be796) | feat(discord): server logs without an always-on host (0073) |
| 2026-08-15 | [`c3d3adc3`](https://github.com/blobbyofficial/classic-games-hub/commit/c3d3adc31cb7532aeca921b5854e4de0fd71ade3) | Merge pull request #26 — v1.5.9 "On the Record" |
| 2026-08-15 | [`c8adf915`](https://github.com/blobbyofficial/classic-games-hub/commit/c8adf915e4f868b4534a1db6d301c6cb9ddb2ac0) | docs(updates): backfill v1.5.7 and v1.5.8 into the update log |
| 2026-08-15 | [`0e1792c5`](https://github.com/blobbyofficial/classic-games-hub/commit/0e1792c5413ecf6de925efdad36fc29a297f8f4b) | docs(discord): correct the deployment state, and say resets are recoverable |
| 2026-08-15 | [`4099e5f3`](https://github.com/blobbyofficial/classic-games-hub/commit/4099e5f3f5b1ea6743c032f24888d18e310ebf29) | docs(updates): record v1.5.9 and regenerate LANDED |
| 2026-08-15 | [`5d23669c`](https://github.com/blobbyofficial/classic-games-hub/commit/5d23669c80f9cfc3d302d5b4e6205e604841e6dc) | feat(discord): server audit logging, and the audit that produced it (0072) |
| 2026-08-14 | [`0811c3d3`](https://github.com/blobbyofficial/classic-games-hub/commit/0811c3d3e6ad8067fc0c1894f7d15430a1d17dda) | docs(discord): record what the bot actually needs, and where to resume |
| 2026-08-14 | [`436b816e`](https://github.com/blobbyofficial/classic-games-hub/commit/436b816e0dd2522f756695a96b461452aa3835dc) | docs(roadmap): record the client-JS weight and the missing retention measure |
| 2026-08-14 | [`165e12c3`](https://github.com/blobbyofficial/classic-games-hub/commit/165e12c37a5536a3f757f3621fda448c4ebdf2c4) | feat(seo): structured data, canonicals, and a homepage that says its own name |
| 2026-08-14 | [`01cb5d91`](https://github.com/blobbyofficial/classic-games-hub/commit/01cb5d918d54200b6bba5e9d4bfed7004a3263fa) | perf(games): stop the stage jumping mid-game, and drop per-frame blur |
| 2026-08-13 | [`966e3e0f`](https://github.com/blobbyofficial/classic-games-hub/commit/966e3e0fea0000ecbe8e5bf08af178f39d12fde6) | feat(roadmap): keep the whole plan in the 1.x line, and unclaim 2.0.0 |
| 2026-08-13 | [`7db81590`](https://github.com/blobbyofficial/classic-games-hub/commit/7db81590d9f65ee30ee54b38eae6df9a1aa76fb1) | fix(status): tolerate a platform_status() that predates 0070 |
| 2026-08-13 | [`1ea40963`](https://github.com/blobbyofficial/classic-games-hub/commit/1ea40963dba3a6e1f7e0562c11f017a6a0215254) | Merge main into the vercel cron fix |
| 2026-08-13 | [`9baa2991`](https://github.com/blobbyofficial/classic-games-hub/commit/9baa2991d6b155370cdd1453c243a05af9ed77b4) | fix(vercel): trim vercel.json to the two daily crons Hobby allows |
| 2026-08-13 | [`675376d8`](https://github.com/blobbyofficial/classic-games-hub/commit/675376d89ffef1840b636543fc4758c769c02436) | fix(ui): keep glass surfaces opaque when motion is reduced (#25) |
| 2026-08-13 | [`9d693155`](https://github.com/blobbyofficial/classic-games-hub/commit/9d693155a5dcf0a4aee0fffd3a3a7cb8ed0e839c) | fix(ui): keep glass surfaces opaque when motion is reduced |
| 2026-08-13 | [`77317fd9`](https://github.com/blobbyofficial/classic-games-hub/commit/77317fd925e3919e17bcbb83f3d09c83eed05645) | feat(roadmap): plan player-made games as v2.2.0 "Player Made" |
| 2026-08-13 | [`44acf133`](https://github.com/blobbyofficial/classic-games-hub/commit/44acf133f6246e6b88f41663233cda18986feca5) | chore: allow the two read-only Vercel lookups used to check deploy state |
| 2026-08-13 | [`53bbde60`](https://github.com/blobbyofficial/classic-games-hub/commit/53bbde60b2eae146b114dd0513d34f42deff923c) | v1.5.6 — a real status page, with a public API and player reports (#24) |
| 2026-08-13 | [`e87c4934`](https://github.com/blobbyofficial/classic-games-hub/commit/e87c49343844e527307c88f7f3520af6c4548808) | fix(status): pin search_path on status_rank and status_indicator |
| 2026-08-13 | [`c6f1a77b`](https://github.com/blobbyofficial/classic-games-hub/commit/c6f1a77be12d166da6c9b19bd196bd180ac1a0b0) | feat(v1.5.6): a real status page, with an API and player reports (0071) |
| 2026-08-12 | [`033b8d3b`](https://github.com/blobbyofficial/classic-games-hub/commit/033b8d3b2f1ccde5cbdaece42f9745f8605da966) | feat(roadmap): plan a full rebuild of all 26 games, not a repair list |
| 2026-08-12 | [`95ae4dde`](https://github.com/blobbyofficial/classic-games-hub/commit/95ae4dde5ef4552e0990250621359ed80d6efb6a) | feat(games): mark all 26 games in development, and plan each rebuild |
| 2026-08-05 | [`67285b35`](https://github.com/blobbyofficial/classic-games-hub/commit/67285b35a0a2d69a5c170abf969fea32fb2862d4) | chore: verify the git integration fires after reconnecting |
| 2026-08-05 | [`358a8715`](https://github.com/blobbyofficial/classic-games-hub/commit/358a87150486a51b956596d12650bd80b4dec9ce) | chore: trigger a build of 573a225 |
| 2026-08-04 | [`573a225f`](https://github.com/blobbyofficial/classic-games-hub/commit/573a225f07e1ee8dead4a493881d8f9d1569e8a2) | feat(leaderboards): a board per difficulty, and fix an ambiguity 0067 introduced |
| 2026-08-04 | [`a67a11f6`](https://github.com/blobbyofficial/classic-games-hub/commit/a67a11f69ec025e38d9f6c6e40d72735a5095d5d) | Merge pull request #23 from blobbyofficial/claude/games-hub-release-org-n6vxiq |
| 2026-08-04 | [`63bf2cff`](https://github.com/blobbyofficial/classic-games-hub/commit/63bf2cff4ac46f4c9c16874208c107b1f0c5b552) | Merge main into the release-organisation branch |
| 2026-08-04 | [`0f5d18e4`](https://github.com/blobbyofficial/classic-games-hub/commit/0f5d18e4b663148e96393efc98fbaff34bba7ca1) | feat(v1.5.1): difficulty picker and message reports, completing the release |
| 2026-08-03 | [`c0d2064b`](https://github.com/blobbyofficial/classic-games-hub/commit/c0d2064b821a77f559051ddddb6c16b2c0a42db3) | feat(updates): version every landed change, and mirror the log into Discord |
| 2026-08-03 | [`2007b711`](https://github.com/blobbyofficial/classic-games-hub/commit/2007b71100f6f077aba7b2fd3d5a05869ba1e9d6) | feat(v1.5.1): cookie consent, with analytics gated behind it (0065) |
| 2026-08-03 | [`560609a5`](https://github.com/blobbyofficial/classic-games-hub/commit/560609a5ca28c7ffe357a8a4f0410e8046e0d685) | feat(v1.5.1): rename, banner, presence heartbeat, stories, fullscreen, settings |
| 2026-08-03 | [`91913689`](https://github.com/blobbyofficial/classic-games-hub/commit/919136892ea91a8a25a9eeb48866879c8a292ee9) | docs(roadmap): plan v1.5.1 and v1.6.0, plus an unscheduled ideas list |
| 2026-08-03 | [`de6cfc99`](https://github.com/blobbyofficial/classic-games-hub/commit/de6cfc999fbe328df7ae49692e0ead2c1f39fcd5) | feat(discord): server export command, and role sync every two minutes |
| 2026-08-03 | [`55026b92`](https://github.com/blobbyofficial/classic-games-hub/commit/55026b92e05f1c0399b73f089ff215f7b6c828d0) | fix(discord): qualify the reset delete, which safeupdate rejected at runtime |
| 2026-08-03 | [`5c39b29a`](https://github.com/blobbyofficial/classic-games-hub/commit/5c39b29aa618ebbee5d8b05d7cd6a6dada01a0cf) | feat(discord): reset-all-settings control, and post panels into the resolved channel |
| 2026-08-03 | [`8c775bb0`](https://github.com/blobbyofficial/classic-games-hub/commit/8c775bb076559cb35e916b01ef21ef8149bd14c6) | feat(discord): full setup provisions the panel channels instead of skipping |

## Documentation discrepancies and work remaining

1. `package.json` declares version **2.0.0**, but the public version is derived from `lib/update-log.ts` and the planned game rebuild continues through **1.x**. Reconcile metadata and enforce consistency in CI; don't rewrite history just to match the package field.
2. The former README said **23 playable games**, while later roadmap documents **26 engines under rebuild**. Verify current public availability rather than copying either count as fact.
3. The repository includes changes after the last curated v1.5.12 release, including August engine and dependency edits and October action updates. Establish deployment SHAs before assigning them to an official version.
4. Ensure every `LANDED` Git SHA is assigned or deliberately tracked in `UNASSIGNED`; regenerate from a **complete** `git log --first-parent main` export, rather than only this 100-commit register.
5. Verify GitHub Releases and tags separately, and document which official releases have distributable tag artifacts.
6. Migration 0075 schedules status monitoring in source; confirm the Vault cron secret, actual pg_cron execution and stored samples before promising that uptime graphs have data.
7. CI checks currently include lint, typechecking and builds; record functional and database tests once implemented.

## Procedure for new releases

1. Confirm the deployed SHA and applied migrations. 2. Update feature guides and `CHANGELOG.md` with verified behaviour. 3. Assign landed commits and PRs to one release in `lib/update-log.ts`. 4. Remove shipped items from `lib/roadmap.ts`. 5. Confirm package metadata and any GitHub tag. 6. Run tests and check `/updates`, `/roadmap`, `/status` and production health. 7. Keep planned, merged and deployed states explicitly separate.
