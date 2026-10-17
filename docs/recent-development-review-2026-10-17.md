# Classic Games Hub — recent development and commit review

**Reviewed:** 17 October 2026  
**Repository:** [blobbyofficial/classic-games-hub](https://github.com/blobbyofficial/classic-games-hub)  
**Scope:** 100 most recent commits returned by the connected GitHub commit search, newest first. This is a bounded historical snapshot, not the complete repository history.  
**Source:** GitHub commit subjects and linked commit pages; relevant current source files were also inspected for the roadmap and SEO fixes.

> **Evidence standard:** A Git commit proves that a change was recorded in the repository. It does not prove a deployment succeeded, a database migration ran, a feature works on production, or a test passed. Roadmap-only commits are proposals, not shipped updates. The curated historical release ledger remains in `lib/update-log.ts`; this review does not allocate new release numbers.

## Overview

The recent activity is unusually concentrated on **17 October 2026**. It combines large roadmap additions, targeted SEO fixes, branding and loading indicators, mobile-layout changes, Halloween UI work, curated shop changes, dependency maintenance, and regression checks. The changelog and release ledger currently describe earlier named releases; do not silently assign these commits to a release.

## Areas of change

### Roadmap and research

Recent changes expanded the unscheduled idea backlog across retention, community, player acquisition, search discovery and new arcade experiments. Ideas are **not** implementations.

Relevant commit subjects include: [`86807f7c`](https://github.com/blobbyofficial/classic-games-hub/commit/86807f7ca86134a796c867e9c233f5ca5201901b), [`e32e3cb3`](https://github.com/blobbyofficial/classic-games-hub/commit/e32e3cb3be6f9f3f4d40e02ec567b4d03c2e5c92), [`c4a0c5e7`](https://github.com/blobbyofficial/classic-games-hub/commit/c4a0c5e75032eef39fce6886dd53793dcfed1428), [`1a897ef2`](https://github.com/blobbyofficial/classic-games-hub/commit/1a897ef239c6faeefe4b2531ce591f7d3c62bf2b), [`9cd22630`](https://github.com/blobbyofficial/classic-games-hub/commit/9cd2263037a0f2feb6967d8096038f1e7854c47f), [`c1457122`](https://github.com/blobbyofficial/classic-games-hub/commit/c14571228c8caba0f4f038ca1bb7ef4afbcb4839), [`55c22b51`](https://github.com/blobbyofficial/classic-games-hub/commit/55c22b514a89ed0b58fb6baf39cf5b90f16987a1).

### Search engine metadata

Two targeted source changes were committed: actual status informs VideoGame offer availability, and static sitemap entries no longer claim a new modification time on every regeneration. Search ranking and production crawl behaviour remain unverified.

Relevant commit subjects include: [`b853f5ac`](https://github.com/blobbyofficial/classic-games-hub/commit/b853f5aca9442a1aa13a4b97e5e493d41a673439), [`2581218f`](https://github.com/blobbyofficial/classic-games-hub/commit/2581218ffe056e3a90f652230d6f4db74749b17e).

### Brand and game loading

The navigation was switched to the shared icon asset. Loading indication and animated-mark handling were adjusted, including a static reduced-motion fallback.

Relevant commit subjects include: [`d271b47d`](https://github.com/blobbyofficial/classic-games-hub/commit/d271b47d3101226e26bf2f2bafaf303fc2ada7f6), [`e4054ed6`](https://github.com/blobbyofficial/classic-games-hub/commit/e4054ed66110370df4b83685f7be11968ba1915d), [`038a558a`](https://github.com/blobbyofficial/classic-games-hub/commit/038a558ae9a7b0f9559fcb9485851f1dc475e23a), [`7bee71f8`](https://github.com/blobbyofficial/classic-games-hub/commit/7bee71f8265137b1e2f51994959bf4489dd46bc7), [`8abef929`](https://github.com/blobbyofficial/classic-games-hub/commit/8abef92952bb5f54314aadde959ccbdc8898a9b4), [`56d45458`](https://github.com/blobbyofficial/classic-games-hub/commit/56d4545867ac497301cce155cdf99f49d217d7ae), [`cc78776e`](https://github.com/blobbyofficial/classic-games-hub/commit/cc78776eafd31be1537c935bf16f7a452c0ec36d).

### Shop and cosmetics

Shop work includes a curated fifteen-item permanent paid catalogue, bespoke artwork, category-filter accessibility work and ledger-refund migrations. Database execution and refunds are **not** verified by a Git commit alone.

Relevant commit subjects include: [`be7b7025`](https://github.com/blobbyofficial/classic-games-hub/commit/be7b7025f1891a9694693dbf870018d4ef17504d), [`f16d1236`](https://github.com/blobbyofficial/classic-games-hub/commit/f16d123681fc93bdaad1a3d7fa0e1322e03194b6), [`bc9e7870`](https://github.com/blobbyofficial/classic-games-hub/commit/bc9e78705b3e0cccb8cb8b746a0d91af7024d5b8), [`5bb501e1`](https://github.com/blobbyofficial/classic-games-hub/commit/5bb501e12bf6ae17a9f1a6acefb5e60be44964e3), [`de6a7053`](https://github.com/blobbyofficial/classic-games-hub/commit/de6a7053b58b0755102faf2fe5a87ab5a560df84), [`0dc75f2e`](https://github.com/blobbyofficial/classic-games-hub/commit/0dc75f2e8742c5d12b081ee85f4e394fec9c4d72), [`33d68ff2`](https://github.com/blobbyofficial/classic-games-hub/commit/33d68ff2624086da0e9f8142d3a01343d51abb0a).

### Mobile and low-power devices

Mobile shell fixes address compact headers, overflow and drawers. The roadmap additionally moves touch and low-power device work earlier in the rebuild.

Relevant commit subjects include: [`65a5e09f`](https://github.com/blobbyofficial/classic-games-hub/commit/65a5e09f6d23857a0f0563583a641f7c91fa42f1), [`6a86d446`](https://github.com/blobbyofficial/classic-games-hub/commit/6a86d446a93a90086f5fdbaff7367c2b3126b4a1), [`2458308d`](https://github.com/blobbyofficial/classic-games-hub/commit/2458308dd150177862a8fd8aea5e213efd0ff87c), [`68b06cdc`](https://github.com/blobbyofficial/classic-games-hub/commit/68b06cdce032130a756dbe50b7681ccff14f8cbc).

### Seasonal experience

The Halloween theme gained user-selectable settings and additional visual, accessibility and integration fixes. The season may affect UI presentation without proving live deployment.

Relevant commit subjects include: [`dee293fd`](https://github.com/blobbyofficial/classic-games-hub/commit/dee293fdb8dcdb938f14cdc476e6f0ea45b16c60), [`5726d25c`](https://github.com/blobbyofficial/classic-games-hub/commit/5726d25ca97cdfc79e6b37a92ab06c13fe194c42), [`c639c2ff`](https://github.com/blobbyofficial/classic-games-hub/commit/c639c2ff8d2a764948bd2e94fee61b0f7188d651), [`0c109627`](https://github.com/blobbyofficial/classic-games-hub/commit/0c1096277a957c6f175db3c125e5a401cfad45c6), [`14af4379`](https://github.com/blobbyofficial/classic-games-hub/commit/14af43797f0577f7a0141f37e7cbf77659d62219), [`e7f064ff`](https://github.com/blobbyofficial/classic-games-hub/commit/e7f064ffc10cc278c9c0e86d8773eeba87dddcc4), [`0283bcc2`](https://github.com/blobbyofficial/classic-games-hub/commit/0283bcc21e6614d39788e37e644ad11889661d35).

### Operations, safety and testing

Recent changes cover maintenance-window handling, automated integration checks, dependency lockfiles and regression validation.

Relevant commit subjects include: [`be7b7025`](https://github.com/blobbyofficial/classic-games-hub/commit/be7b7025f1891a9694693dbf870018d4ef17504d), [`31c2c461`](https://github.com/blobbyofficial/classic-games-hub/commit/31c2c46109ac2831c493472afe051eaef2af344a), [`a2f271d6`](https://github.com/blobbyofficial/classic-games-hub/commit/a2f271d64aed2298f1c0dc43341afa6fe4588dd1), [`2458308d`](https://github.com/blobbyofficial/classic-games-hub/commit/2458308dd150177862a8fd8aea5e213efd0ff87c), [`dee293fd`](https://github.com/blobbyofficial/classic-games-hub/commit/dee293fdb8dcdb938f14cdc476e6f0ea45b16c60), [`cb67610a`](https://github.com/blobbyofficial/classic-games-hub/commit/cb67610a9567d662a47733c5784bcb2f6235e9b8), [`e9fd9264`](https://github.com/blobbyofficial/classic-games-hub/commit/e9fd9264d9e0c2547a8e718e00c6188d8627776f).


## Key changes requiring follow-up verification

1. **Shop migration safety:** Verify catalogue and refund migrations on the actual target database, use read-only impact reports, and reconcile credited refunds before describing them as completed.
2. **SEO deployment:** Validate production sitemap and JSON-LD for published, in-development and coming-soon games; inspect indexing and Search Console, then measure actual search results.
3. **Mobile and loading:** Test the navbar, menu, game load transitions and static reduced-motion fallback on narrow real devices.
4. **Halloween preference:** Verify saved opt-out and reduced-motion behaviour, including after the seasonal period ends.
5. **Automated checks:** Inspect the CI statuses and actual test results for the deployed commit, not just the presence of scripts.
6. **Roadmap display:** The roadmap page can use an admin JSON override, so new source entries may not appear on the production page until the override is reconciled.
7. **Release hygiene:** Classify these commits into a reviewed next release or an unreleased section only after production status is confirmed; do not mark ideas as shipped.

## Full sampled commit ledger

| UTC date | Commit | Subject |
|---|---|---|
| 2026-10-17 | [`86807f7c`](https://github.com/blobbyofficial/classic-games-hub/commit/86807f7ca86134a796c867e9c233f5ca5201901b) | docs(roadmap): add 15 new arcade experiments |
| 2026-10-17 | [`b853f5ac`](https://github.com/blobbyofficial/classic-games-hub/commit/b853f5aca9442a1aa13a4b97e5e493d41a673439) | fix(seo): reflect game availability in VideoGame structured data |
| 2026-10-17 | [`e32e3cb3`](https://github.com/blobbyofficial/classic-games-hub/commit/e32e3cb3be6f9f3f4d40e02ec567b4d03c2e5c92) | docs(roadmap): add 20 longer-term SEO and organic traffic initiatives |
| 2026-10-17 | [`2581218f`](https://github.com/blobbyofficial/classic-games-hub/commit/2581218ffe056e3a90f652230d6f4db74749b17e) | fix(seo): stop claiming unchanged sitemap pages update every hour |
| 2026-10-17 | [`c4a0c5e7`](https://github.com/blobbyofficial/classic-games-hub/commit/c4a0c5e75032eef39fce6886dd53793dcfed1428) | docs(roadmap): add 50 evidence-led SEO growth proposals |
| 2026-10-17 | [`1a897ef2`](https://github.com/blobbyofficial/classic-games-hub/commit/1a897ef239c6faeefe4b2531ce591f7d3c62bf2b) | docs(roadmap): add 60 competition, community and engineering ideas |
| 2026-10-17 | [`9cd22630`](https://github.com/blobbyofficial/classic-games-hub/commit/9cd2263037a0f2feb6967d8096038f1e7854c47f) | docs(roadmap): add 60 exploration ideas for discovery and sharing |
| 2026-10-17 | [`c1457122`](https://github.com/blobbyofficial/classic-games-hub/commit/c14571228c8caba0f4f038ca1bb7ef4afbcb4839) | docs(roadmap): add additive player growth and community research proposals |
| 2026-10-17 | [`d271b47d`](https://github.com/blobbyofficial/classic-games-hub/commit/d271b47d3101226e26bf2f2bafaf303fc2ada7f6) | Fix in-app reduced-motion static icon fallback |
| 2026-10-17 | [`33b88d74`](https://github.com/blobbyofficial/classic-games-hub/commit/33b88d74bdb5af09eafe151b550c47e6ffcec9a2) | Provide static reduced-motion image fallback |
| 2026-10-17 | [`e4054ed6`](https://github.com/blobbyofficial/classic-games-hub/commit/e4054ed66110370df4b83685f7be11968ba1915d) | Respect in-app reduced motion for animated loading GIF |
| 2026-10-17 | [`038a558a`](https://github.com/blobbyofficial/classic-games-hub/commit/038a558ae9a7b0f9559fcb9485851f1dc475e23a) | Show uploaded animated mark while game engine loads |
| 2026-10-17 | [`7bee71f8`](https://github.com/blobbyofficial/classic-games-hub/commit/7bee71f8265137b1e2f51994959bf4489dd46bc7) | Add lightweight branded game loading indicator |
| 2026-10-17 | [`8abef929`](https://github.com/blobbyofficial/classic-games-hub/commit/8abef92952bb5f54314aadde959ccbdc8898a9b4) | Use canonical icon.svg in shared navbar and navigation branding |
| 2026-10-17 | [`e01503a8`](https://github.com/blobbyofficial/classic-games-hub/commit/e01503a8f5970c6477cdcd8d216c33d9adb50649) | rename |
| 2026-10-17 | [`56d45458`](https://github.com/blobbyofficial/classic-games-hub/commit/56d4545867ac497301cce155cdf99f49d217d7ae) | Create icon.gif |
| 2026-10-17 | [`be7b7025`](https://github.com/blobbyofficial/classic-games-hub/commit/be7b7025f1891a9694693dbf870018d4ef17504d) | Merge pull request #58 from blobbyofficial/feature/curated-shop-cosmetics |
| 2026-10-17 | [`f16d1236`](https://github.com/blobbyofficial/classic-games-hub/commit/f16d123681fc93bdaad1a3d7fa0e1322e03194b6) | fix(shop): close curated report CTEs correctly |
| 2026-10-17 | [`bc9e7870`](https://github.com/blobbyofficial/classic-games-hub/commit/bc9e78705b3e0cccb8cb8b746a0d91af7024d5b8) | fix(shop): close curated report CTEs correctly |
| 2026-10-17 | [`5bb501e1`](https://github.com/blobbyofficial/classic-games-hub/commit/5bb501e12bf6ae17a9f1a6acefb5e60be44964e3) | docs(shop): align preview reports with hand-picked catalogue |
| 2026-10-17 | [`de6a7053`](https://github.com/blobbyofficial/classic-games-hub/commit/de6a7053b58b0755102faf2fe5a87ab5a560df84) | docs(shop): align preview reports with hand-picked catalogue |
| 2026-10-17 | [`0dc75f2e`](https://github.com/blobbyofficial/classic-games-hub/commit/0dc75f2e8742c5d12b081ee85f4e394fec9c4d72) | design(shop): use unique vector art for all curated permanent cosmetics |
| 2026-10-17 | [`33d68ff2`](https://github.com/blobbyofficial/classic-games-hub/commit/33d68ff2624086da0e9f8142d3a01343d51abb0a) | design(shop): draw fifteen bespoke SVG thumbnails for the retained cosmetics |
| 2026-10-17 | [`670addce`](https://github.com/blobbyofficial/classic-games-hub/commit/670addce76819e22cc05c39becc63dcda24f1073) | feat(shop): hand-curate fifteen permanent paid cosmetics for retention |
| 2026-10-17 | [`31c2c461`](https://github.com/blobbyofficial/classic-games-hub/commit/31c2c46109ac2831c493472afe051eaef2af344a) | Merge pull request #56 from blobbyofficial/feature/shop-catalogue-reduction |
| 2026-10-17 | [`55c22b51`](https://github.com/blobbyofficial/classic-games-hub/commit/55c22b514a89ed0b58fb6baf39cf5b90f16987a1) | roadmap: plan Windows-first desktop app after cross-device relaunch |
| 2026-10-17 | [`65a5e09f`](https://github.com/blobbyofficial/classic-games-hub/commit/65a5e09f6d23857a0f0563583a641f7c91fa42f1) | roadmap: move multi-input and low-power game foundations ahead of game reopening |
| 2026-10-17 | [`6a86d446`](https://github.com/blobbyofficial/classic-games-hub/commit/6a86d446a93a90086f5fdbaff7367c2b3126b4a1) | roadmap: prioritise mobile and Chromebook foundations alongside reliability |
| 2026-10-17 | [`bd7398ea`](https://github.com/blobbyofficial/classic-games-hub/commit/bd7398ea0f31715e45df01c07a9b42fa09e686ad) | design(shop): replace generic gradient thumbnails with illustrated item artwork |
| 2026-10-17 | [`cc78776e`](https://github.com/blobbyofficial/classic-games-hub/commit/cc78776eafd31be1537c935bf16f7a452c0ec36d) | design(shop): support pigment styles on product preview icons |
| 2026-10-17 | [`a2f271d6`](https://github.com/blobbyofficial/classic-games-hub/commit/a2f271d64aed2298f1c0dc43341afa6fe4588dd1) | design(shop): create item-specific illustrated thumbnail compositions for every cosmetic type |
| 2026-10-17 | [`d78db429`](https://github.com/blobbyofficial/classic-games-hub/commit/d78db4296acdc1a0a00b8977e046bf17da50497e) | docs(shop): list retained and retired cosmetics from live catalogue before rollout |
| 2026-10-17 | [`c0de7fdf`](https://github.com/blobbyofficial/classic-games-hub/commit/c0de7fdf6700849191b9aac26070b28a84fe3be3) | fix(shop): ensure preflight report runs before refund table exists |
| 2026-10-17 | [`2458308d`](https://github.com/blobbyofficial/classic-games-hub/commit/2458308dd150177862a8fd8aea5e213efd0ff87c) | Merge pull request #57 from blobbyofficial/fix/mobile-shell-layout-2026-10 |
| 2026-10-17 | [`569656cd`](https://github.com/blobbyofficial/classic-games-hub/commit/569656cdfb250e4007a7b304166c21024aab147a) | docs(shop): add read-only impact report for catalogue reduction and refund totals |
| 2026-10-17 | [`68b06cdc`](https://github.com/blobbyofficial/classic-games-hub/commit/68b06cdce032130a756dbe50b7681ccff14f8cbc) | fix: keep mobile header compact across all phone widths |
| 2026-10-17 | [`d6fa6efa`](https://github.com/blobbyofficial/classic-games-hub/commit/d6fa6efa35d667fc986a4db34785fd7472feab94) | fix: prevent narrow-screen shell overflow and improve drawer sizing |
| 2026-10-17 | [`a04db621`](https://github.com/blobbyofficial/classic-games-hub/commit/a04db6215107bb94beb0bfdf132d8ce2d67e2395) | fix: prevent narrow-screen shell overflow and improve drawer sizing |
| 2026-10-17 | [`ef551679`](https://github.com/blobbyofficial/classic-games-hub/commit/ef551679b13f2e671e24a46a60a9f6d20e321b24) | fix: prevent narrow-screen shell overflow and improve drawer sizing |
| 2026-10-17 | [`af797407`](https://github.com/blobbyofficial/classic-games-hub/commit/af7974073ca4da1b6eb131d08df0bd4f50aefefa) | fix: prevent narrow-screen shell overflow and improve drawer sizing |
| 2026-10-17 | [`cd9b24df`](https://github.com/blobbyofficial/classic-games-hub/commit/cd9b24df1894ceed6474d936b064b15d70e62b89) | design(shop): hide empty category tabs and use accessible filter buttons |
| 2026-10-17 | [`0ae87a28`](https://github.com/blobbyofficial/classic-games-hub/commit/0ae87a28b392d06b65df39fe03347de84581c85f) | feat(shop): retire excess cosmetics and issue idempotent purchase-ledger refunds |
| 2026-10-17 | [`dee293fd`](https://github.com/blobbyofficial/classic-games-hub/commit/dee293fdb8dcdb938f14cdc476e6f0ea45b16c60) | Merge pull request #55 from blobbyofficial/feature/halloween-selectable-theme |
| 2026-10-17 | [`5726d25c`](https://github.com/blobbyofficial/classic-games-hub/commit/5726d25ca97cdfc79e6b37a92ab06c13fe194c42) | fix(theme): validate selectable seasonal state and settings JSX |
| 2026-10-17 | [`c639c2ff`](https://github.com/blobbyofficial/classic-games-hub/commit/c639c2ff8d2a764948bd2e94fee61b0f7188d651) | fix(theme): validate selectable seasonal state and settings JSX |
| 2026-10-17 | [`0c109627`](https://github.com/blobbyofficial/classic-games-hub/commit/0c1096277a957c6f175db3c125e5a401cfad45c6) | fix(theme): show saved Halloween selection after season without allowing reactivation |
| 2026-10-17 | [`14af4379`](https://github.com/blobbyofficial/classic-games-hub/commit/14af43797f0577f7a0141f37e7cbf77659d62219) | feat(db): allow free Halloween theme and default October registrations |
| 2026-10-17 | [`e7f064ff`](https://github.com/blobbyofficial/classic-games-hub/commit/e7f064ffc10cc278c9c0e86d8773eeba87dddcc4) | fix(theme): respect chosen colour theme in homepage seasonal messaging |
| 2026-10-17 | [`0283bcc2`](https://github.com/blobbyofficial/classic-games-hub/commit/0283bcc21e6614d39788e37e644ad11889661d35) | feat(theme): offer opt-out Halloween theme in site preferences |
| 2026-10-17 | [`bf67f83e`](https://github.com/blobbyofficial/classic-games-hub/commit/bf67f83eb8fb8f0fa101bcc0a2a89316e5335b70) | feat(theme): offer opt-out Halloween theme in site preferences |
| 2026-10-17 | [`8aa7a00d`](https://github.com/blobbyofficial/classic-games-hub/commit/8aa7a00da48c96005f8e95d6c1af493d8df9f895) | feat(theme): offer opt-out Halloween theme in site preferences |
| 2026-10-17 | [`47a21532`](https://github.com/blobbyofficial/classic-games-hub/commit/47a215322c625b89a8d3f717f201d7b760edd2f4) | feat(theme): offer opt-out Halloween theme in site preferences |
| 2026-10-17 | [`f372538e`](https://github.com/blobbyofficial/classic-games-hub/commit/f372538ecc000ffbdce80816f3cab3be410eef5f) | feat(theme): offer opt-out Halloween theme in site preferences |
| 2026-10-17 | [`cb67610a`](https://github.com/blobbyofficial/classic-games-hub/commit/cb67610a9567d662a47733c5784bcb2f6235e9b8) | Merge branch 'main' of https://github.com/blobbyofficial/classic-games-hub |
| 2026-10-17 | [`bafc5eaf`](https://github.com/blobbyofficial/classic-games-hub/commit/bafc5eafe5c609eb6a92c51819d4e9d8a6a1cde7) | new icon rollout pt1 |
| 2026-10-17 | [`e9fd9264`](https://github.com/blobbyofficial/classic-games-hub/commit/e9fd9264d9e0c2547a8e718e00c6188d8627776f) | Merge pull request #54 from blobbyofficial/fix/close-expired-maintenance-admin |
| 2026-10-17 | [`d98ea3ee`](https://github.com/blobbyofficial/classic-games-hub/commit/d98ea3eee13882eba29e1f64fcc7304b39353561) | feat(admin): add one-click complete maintenance action |
| 2026-10-17 | [`32721c03`](https://github.com/blobbyofficial/classic-games-hub/commit/32721c03ed1370472b233a109ec301961dc349e3) | fix(admin): show expired but unresolved maintenance windows |
| 2026-10-17 | [`09bb69ae`](https://github.com/blobbyofficial/classic-games-hub/commit/09bb69ae2df59cbda7cde874d87cbf1195d8e688) | docs(roadmap): track outstanding site audit defects and verification gates |
| 2026-10-17 | [`d624242c`](https://github.com/blobbyofficial/classic-games-hub/commit/d624242c114a788c74b840f756253f5310d8d7f4) | Merge pull request #53 from blobbyofficial/feature/halloween-haunted-arcade |
| 2026-10-17 | [`09580b3d`](https://github.com/blobbyofficial/classic-games-hub/commit/09580b3d61a0f3b08e33678f94cdc9b493683e3d) | design(halloween): reduce decorative clutter and unify surfaces |
| 2026-10-17 | [`11b59e1c`](https://github.com/blobbyofficial/classic-games-hub/commit/11b59e1cdd4619f2b1b739449e93bf22318b0bb3) | design(halloween): simplify homepage messaging and remove redundant promotional labels |
| 2026-10-17 | [`230304e5`](https://github.com/blobbyofficial/classic-games-hub/commit/230304e58fcc866118811e70a057b45f6f5e4f82) | Merge pull request #50 from blobbyofficial/feature/halloween-haunted-arcade |
| 2026-10-17 | [`a73d1015`](https://github.com/blobbyofficial/classic-games-hub/commit/a73d1015530ce43838f86349961380a6615d3c9d) | fix(test): run actual game loop under TypeScript 7 without retired compiler API |
| 2026-10-17 | [`33ffd6ef`](https://github.com/blobbyofficial/classic-games-hub/commit/33ffd6eff6cc033a8d0f08b67564e7f3f4bb5e7d) | fix(ci): narrow optional worker heartbeat value without invalid never access |
| 2026-10-17 | [`335da574`](https://github.com/blobbyofficial/classic-games-hub/commit/335da574aa36fbe9a97c2deb0dde7857b303b26c) | ci(halloween): require game regressions and production build before release |
| 2026-10-17 | [`c01cd5d0`](https://github.com/blobbyofficial/classic-games-hub/commit/c01cd5d00b17d9ef3f7c59c13b9ce127d62fa9f8) | fix: regenerate valid dependency lockfile for Halloween release |
| 2026-10-17 | [`9c30f631`](https://github.com/blobbyofficial/classic-games-hub/commit/9c30f631d5e97f314389ea9640476925c8c1cec6) | ci: regenerate and validate malformed lockfile on Halloween branch |
| 2026-10-17 | [`539cb21f`](https://github.com/blobbyofficial/classic-games-hub/commit/539cb21fd7af690d99b093f201370719487f726a) | fix: normalize duplicated dependency declarations against current main |
| 2026-10-17 | [`f44833e8`](https://github.com/blobbyofficial/classic-games-hub/commit/f44833e8c800064d2f2920d08618e57ea5f1daaf) | Merge latest main into Halloween branch, preserving current fixes |
| 2026-10-17 | [`4cc21ce2`](https://github.com/blobbyofficial/classic-games-hub/commit/4cc21ce22e6955b9567de6ee08e49ff38d4a2ade) | Merge pull request #46 from blobbyofficial/dependabot/npm_and_yarn/production-0bc331b978 |
| 2026-10-17 | [`be4db670`](https://github.com/blobbyofficial/classic-games-hub/commit/be4db67087511e0f312e96601f332ca453660551) | Merge branch 'main' into dependabot/npm_and_yarn/production-0bc331b978 |
| 2026-10-17 | [`b2b1acf3`](https://github.com/blobbyofficial/classic-games-hub/commit/b2b1acf3fc72b8da8440c7864e672999a7fc265a) | Merge pull request #47 from blobbyofficial/dependabot/npm_and_yarn/radix-063e217681 |
| 2026-10-17 | [`a10bf891`](https://github.com/blobbyofficial/classic-games-hub/commit/a10bf891e94c439c32f595cca444612a2a1657c7) | Merge branch 'main' into dependabot/npm_and_yarn/radix-063e217681 |
| 2026-10-17 | [`313cfd74`](https://github.com/blobbyofficial/classic-games-hub/commit/313cfd74f6d8dbe286bdb400a08cf05f7ecae25a) | fix(halloween): retain latest homepage copy and metadata alongside seasonal hero |
| 2026-10-17 | [`468d54d9`](https://github.com/blobbyofficial/classic-games-hub/commit/468d54d98eb63236a07fb2fcf0f6261951582a36) | fix(halloween): preserve current main behavior in package.json |
| 2026-10-17 | [`f8430631`](https://github.com/blobbyofficial/classic-games-hub/commit/f8430631cda905ba98171c0853360b74aafd1b23) | fix(halloween): preserve current main behavior in features/games/games-library.tsx |
| 2026-10-17 | [`e2c347d4`](https://github.com/blobbyofficial/classic-games-hub/commit/e2c347d478a04597799fc7bc98b76743d67a31c0) | fix(halloween): preserve current main behavior in components/games/game-card.tsx |
| 2026-10-17 | [`3bb6d7a6`](https://github.com/blobbyofficial/classic-games-hub/commit/3bb6d7a6fd40f46a5c395d24092e4764dc39c659) | fix(halloween): consistently honor personal and OS reduced-motion preferences |
| 2026-10-17 | [`da2e026f`](https://github.com/blobbyofficial/classic-games-hub/commit/da2e026f002bce25ad3e8858f13730af62f85054) | ci: validate Halloween integration on pull requests |
| 2026-10-17 | [`a0e97d11`](https://github.com/blobbyofficial/classic-games-hub/commit/a0e97d113811b55463f3a43ae7f82c090534a719) | test: expose Halloween integration check as npm script |
| 2026-10-17 | [`1a105a29`](https://github.com/blobbyofficial/classic-games-hub/commit/1a105a29eb2936ad151d3630092a21bf9cfbc4b3) | test(halloween): expand static integration regression coverage |
| 2026-10-17 | [`5f483e5d`](https://github.com/blobbyofficial/classic-games-hub/commit/5f483e5d2751e5770cd4c1ad55221a28ed659a3e) | fix(halloween): refresh banner dismissal when event content changes |
| 2026-10-17 | [`28e59ed7`](https://github.com/blobbyofficial/classic-games-hub/commit/28e59ed7ebdd485b9e7bb703afd893a11aa65370) | test(halloween): add repeatable static seasonal integration checks |
| 2026-10-17 | [`adf9e365`](https://github.com/blobbyofficial/classic-games-hub/commit/adf9e365abfccd050db9210a284a72c1a4be66fd) | feat(halloween): integrate lightweight night sky illustration |
| 2026-10-17 | [`badc9341`](https://github.com/blobbyofficial/classic-games-hub/commit/badc9341ba6758905e9a02098a99574154fbc372) | feat(halloween): add lightweight reusable bat and moon illustration |
| 2026-10-17 | [`b6648eef`](https://github.com/blobbyofficial/classic-games-hub/commit/b6648eef935fb68236c27176691c6e3d0066ade6) | feat(halloween): integrate community events with seasonal art direction |
| 2026-10-17 | [`6c6b32ea`](https://github.com/blobbyofficial/classic-games-hub/commit/6c6b32ead48b03812c50c86b27cc050ce785879f) | feat(halloween): improve seasonal event messaging and accessible event UI |
| 2026-10-17 | [`454d5219`](https://github.com/blobbyofficial/classic-games-hub/commit/454d52191a4c7c0d9d46757f55a9c6c5f833184e) | feat(halloween): improve seasonal event messaging and accessible event UI |
| 2026-10-17 | [`8e74f7ed`](https://github.com/blobbyofficial/classic-games-hub/commit/8e74f7ed2cd0e1b4ac255a4d429c74f7da8affc7) | feat(halloween): improve seasonal event messaging and accessible event UI |
| 2026-10-17 | [`899ef7b3`](https://github.com/blobbyofficial/classic-games-hub/commit/899ef7b38b06e96a083262dc9873518767dc9874) | feat(halloween): finish component-level catalogue and control visuals |
| 2026-10-17 | [`813a6124`](https://github.com/blobbyofficial/classic-games-hub/commit/813a6124183f30d90ffc6fbf9d503f41777a53c3) | feat(halloween): finish catalogue, player and shared control styling hooks |
| 2026-10-17 | [`cb0c35d6`](https://github.com/blobbyofficial/classic-games-hub/commit/cb0c35d615e21d1dd9ef2cd587720b7110a99daf) | feat(halloween): finish catalogue, player and shared control styling hooks |
| 2026-10-17 | [`8223e7ac`](https://github.com/blobbyofficial/classic-games-hub/commit/8223e7acad4a489ce400fb78baf7524d3500ccc6) | feat(halloween): finish catalogue, player and shared control styling hooks |
| 2026-10-17 | [`6261a357`](https://github.com/blobbyofficial/classic-games-hub/commit/6261a35752cf9e9da888d663e757b96246e6877f) | feat(halloween): finish catalogue, player and shared control styling hooks |
| 2026-10-17 | [`7998f5f5`](https://github.com/blobbyofficial/classic-games-hub/commit/7998f5f5420cb257203fe8306743612ef198126b) | feat(halloween): finish catalogue, player and shared control styling hooks |
| 2026-10-17 | [`252ab89e`](https://github.com/blobbyofficial/classic-games-hub/commit/252ab89eaa47b0dd8a88dac44e091b6bea40568b) | feat(halloween): finish catalogue, player and shared control styling hooks |
| 2026-10-17 | [`bea545fc`](https://github.com/blobbyofficial/classic-games-hub/commit/bea545fcbc9f8b940b1cb5b3022147117cb35cae) | refactor(halloween): clean home hero and expose seasonal label to assistive tech |
| 2026-10-17 | [`496adf47`](https://github.com/blobbyofficial/classic-games-hub/commit/496adf47511a733abfe51df3178de5e07decb8f8) | refactor(halloween): remove obsolete heading and duplicate scene rules |
| 2026-10-17 | [`1708ef46`](https://github.com/blobbyofficial/classic-games-hub/commit/1708ef467f4faaa8ce785fe74257bfb49410a123) | refactor: simplify shared home hero title |

## Reference documentation

- [Existing repository chronology](repository-history.md)
- [Detailed changelog](../CHANGELOG.md)
- [Curated release ledger](../lib/update-log.ts)
- [Unreleased ideas and planned rebuild](../lib/roadmap.ts)
- [Recent commit history](https://github.com/blobbyofficial/classic-games-hub/commits/main)

**Maintenance note:** This review is a historical snapshot. Append a newly dated review instead of overwriting verified past summaries, and never interpret a roadmap addition as a production feature.
