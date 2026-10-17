# Classic Games Hub — Collector Exchange & Market Simulator

**Status:** product/engineering proposal, not shipped. **Prepared:** 17 October 2026.  
**Scope:** Cosmetic trading hub; collectible limited editions; fictional market simulator; administrative recovery.  
**Dependency:** Existing account, shop, inventory, credits, audit, Discord, and game-progression systems. The recently added `0080_admin_inventory_corrections.sql` requires independent migration, permission, concurrency and loadout testing before production.

## Product position

A player should enjoy CGH when alone, without collecting anything. The Collector Exchange adds an optional social layer through meaningful customization and responsible collecting. Players may exchange cosmetics with other consenting players, showcase collections and preserve records of where special items came from. No real-money conversion, off-platform trades, speculative prizes or pay-to-win effects.

**What we can learn from established systems:** Roblox separates limited-time availability from fixed-count numbered editions, and its trading UI distinguishes eligible items and requires agreement. Steam's published confirmation and hold mechanisms demonstrate why ownership safety matters. These are interaction references, not a mandate to reproduce external economies, fees or platform branding.

## A. Trading Hub: complete product plan

### Player journeys

1. **Discover:** From navigation, inventory, another player's public profile or a shareable official listing, open `/trading`. An introductory explanation shows eligible item types and safe trading rules. Nonparticipants can browse public opt-in listings.
2. **Prepare:** A user chooses eligible owned cosmetics, can mark a cosmetic *not for trade*, and creates an optional wishlist. Never list private inventories without consent.
3. **Propose:** Pick a friend or an opted-in listing, select exact items from each side, and submit a direct offer. The system validates each item at submission.
4. **Review:** Both players see *giving* and *receiving* in equally prominent panels, with item name, image, edition ID, trade eligibility and a plain-language difference summary. The server computes the offer hash.
5. **Change:** Any edit clears both approvals and generates a new version. Neither party can approve a different offer than the one shown.
6. **Confirm:** Both independently confirm a read-only summary. For significant or newly acquired collectible items, a security check or cancellable processing hold may be required.
7. **Complete:** The database applies all item transfers atomically, records before/after owners and the offer version, updates equipped state, and creates one notification per account.
8. **Recover:** Failed validations or network retries are safe to repeat. No half-transfer. A report/appeal route links to the immutable trade record.

### Interfaces

- **Trading dashboard:** Received/Sent/Completed/Cancelled; search and filters; safety guide.
- **Exchange studio:** Two symmetric item grids; each person sees exactly what leaves and enters their inventory; no ambiguous icon-only offers.
- **Offers board:** Optional asynchronous requests showing *what I offer* and *what I seek*. Listing expiry is for stale-data cleanup, not pressure.
- **Collection wishlist:** Opt-in wishlist of items and editions with no purchase obligation.
- **Player profile integration:** 'Propose trade' only when permissions allow; honour block and visibility settings.
- **Trade locker:** User-controlled 'not tradable' flags, with extra protection for high-significance gifts or developer awards.
- **Audit:** Personal receipts and accessible support ticket links.

### Security and database architecture

Proposed entities: `collectible_instances` (individual ownership IDs where necessary), `trade_offers`, `trade_offer_lines`, `trade_approvals`, `trade_events`, `trade_restrictions`, `trade_reports`. Define immutable snapshots of name, edition and item ID on offer creation while rechecking live ownership at acceptance.

- Implement a **security-definer transaction** (with independent role/participant checks and tight EXECUTE permissions) for a trade, never a pair of browser-side updates.
- Lock instance rows in a deterministic order; verify owner, eligibility, state, not expired, not held, version match and no existing destination duplicate where uniqueness applies.
- Pair each operation with an idempotency key. Use database constraints to prevent duplicate ownership and duplicate completion.
- Cancel if either participant becomes banned, blocked, restricted or ineligible.
- Clear equipped selections and saved presets when items leave; make all ownership-dependent appearance grants check the actual inventory.
- Require explicit consent; do not support external money, account transfers, informal middlemen or 'trust trades'.
- Report disputed items; staff may place temporary trade holds pending investigation. Moderators should have view/report tools, while administrator correction remains independently authorised and audited.
- Add rate limits, abuse signals, permission audits and a staged rollout. Any fraud signal is a review cue, not automatic public accusation.

### MVP and subsequent releases

**T0 — Inventory integrity:** Fix and test admin corrections, equipped-state cleanup, refund provenance, existing inventory uniqueness and audit. No player trading.

**T1 — Friend trades:** Two-player item-for-item swaps of a restricted allowlist, verified by simultaneous confirmation and a single atomic database operation. Manual quality assurance with test accounts.

**T2 — Asynchronous offers:** Offer inbox, counteroffers, opt-in activity indicators and favourites/wishlists, with expiry and cancel actions.

**T3 — Trading Hub:** Listings board, permission-aware search and reputation based only on verified conduct; optional community trading rooms *after* enough active participants exist.

**T4 — Advanced protections:** Instance provenance display, special-item holds, staff dispute queue and independent security review. Do not make marketplace pricing or auction mechanics part of the initial releases.

### Success and failure criteria

Track opted-in active traders, properly completed swaps, repeated voluntary use, support issues per trade, confirmation abandonments, disputed item rate, reports, and trust/satisfaction feedback. Pause rollout if duplications, unauthorised transfers or irrecoverable losses occur. Growth in trade count alone is not success.

## B. Limited Editions: complete product plan

### Product taxonomy

- **Standard:** Ordinary cosmetics with repeatable distribution.
- **Event edition:** Obtained through a defined event or season; display the event, acquisition criteria and whether future returns are possible.
- **Fixed-supply numbered edition:** Exactly N units minted, with serial number #k/N, permanent edition ID, source and issuance time; the cap cannot silently be increased.
- **Recognition edition:** Awards for creation, helpful contributions or verified tournament achievements, with configurable non-tradable status.
- **Legacy archive:** Existing cosmetics can receive accurate historic labels where provenance is verifiable; don't invent serials or imply a supply cap retroactively.

### Example player experience

A player earns an **Arcade Anniversary Frame**, serial #18/250, through a published skill or participation objective. Its detail page shows artwork, edition, original release, eligibility, current holder (only if public), serial and acquisition chain in a privacy-preserving form. A player can display the item without selling or trading it.

### Distribution rules

- Make a full supply and eligibility disclosure before an edition is issued. Never sell a 'one of 100' claim if copies can be minted without that limit.
- Allocate sequential unique serials in an atomic transaction; ensure cancelled distribution does not create duplicate numbers.
- Offer fair, accessible routes (community events, skill achievements with accessible alternatives, creator contribution). Do not sell random chances at limited items.
- Make promotion and exclusivity transparent. Do not create pressure around time limits or advertise ownership as an investment.
- Document whether free items may be redistributed, whether editions are ever re-released and whether individual copies can be traded.
- Cosmetics must not change ranked scoring or account privileges.
- Provide creator attribution, ownership privacy settings and an authenticity verifier.

### Data model and operations

`cosmetic_editions`: edition_id, underlying cosmetic, classification, supply_cap, minted_count, issuance policy, event ID, tradeable, created/published timestamps, immutable published rule snapshot.  
`collectible_instances`: instance ID, edition ID, serial, owner ID, status, grant reason, timestamps. Unique (edition_id, serial).  
`collectible_history`: append-only grant, transfer, recovery and revocation events with actor, recipient, reason, signed operation ID.  
`collectible_holds`: disputed status and staff review metadata.

Keep existing `inventory_items` compatibility while designing migration: current model has a unique (user_id, item_id), which cannot represent multiple numbered copies of the same cosmetic. Decide whether instances link to inventory entitlements or replace a subset; never migrate blindly. Legacy purchases and equips must remain valid.

### Release stages

**L0:** Metadata and gallery only for existing event items, with accurate labels.  
**L1:** First fixed-supply *earned* edition issued through audited server-side grant logic.  
**L2:** Individual serials, transparent edition gallery, protected display and authenticity links.  
**L3:** Controlled, opt-in trades of eligible instances using the Trading Hub infrastructure.  
**L4:** Creator/jam commemorative editions with editorial and abuse review.

Success: claim integrity, player understanding, voluntary showcases, no minted-over-cap events, no false edition information or unresolved ownership disputes.

## C. Fictional stock-style Market Simulator

### Scope and crucial separation

This is **a strategy/learning mini-game**, not a marketplace in which users stake their CGH credits, XP or valuable collectible items. No cash value, no real securities, no crypto, no cash-out, no real-money entry, no buying virtual stakes, no random-reward bets, and no time-pressure mechanics. Use **practice points** that cannot transfer outside the simulation.

Players learn how a hypothetical market responds to changes through visible fictional events and simple choices. Scores should favour comprehension of rules or completing objectives instead of rewarding huge risky gains.

### Theme and player journeys

Five fictional businesses could serve the game world: a pinball factory, arcade repair shop, controller manufacturer, puzzle studio and pixel-art theatre. Each has a visible product, a fictional financial health indicator and clearly explained game events.

- **Tutorial:** A guided example explains what a virtual share and changing price mean.
- **Practice round:** Receive the same fixed practice-point allocation as everyone else. Explore a hypothetical portfolio without spending account credits.
- **Scenario cards:** Fictional developments have disclosed or learnable effects; e.g. a product release may affect the controller maker. Avoid opaque random movement for its own sake.
- **Pause and replay:** The entire simulation can be paused, restarted and replayed without losing account progression.
- **Post-round review:** Explain which decisions matched a chosen strategy, how conditions changed and where uncertainty remained.
- **Collaborative classroom-style mode:** Friends can compare reasoning on the same seeded scenario; no purchase-linked leaderboard rewards.

### Modes and extensibility

- **First Day at the Exchange:** Interactive introduction.
- **Arcade District:** A short fictional market story with clear chapters.
- **Scenario Lab:** Curated changes in supply, demand and company performance.
- **Portfolio Builder:** Practice a variety of simulated strategies without ranking by gains.
- **Market Newsroom:** Optional creator-written, reviewed fictional event cards.
- **Community Learning Challenge:** Explain a decision and compare reasoning, not the amount of wealth accumulated.

### Engineering design

A deterministic scenario engine controls simulated prices and rules; store seed, version, event sequence and player practice choices. The browser may render local simulation while server results verify learning achievements where relevant. Do not connect to live stock-market feeds or allow market points to be exchanged with CGH currency. Provide accessibility support, clear educational disclaimers and predictable session end.

### Delivery phases

**M0:** Standalone prototype with no account persistence and no prizes.  
**M1:** Fully accessible scenario tutorial with explanatory feedback.  
**M2:** Curated scenario library and private progress saving.  
**M3:** Optional collaborative scenario comparison.  
**M4:** Only consider wider community features after feedback shows sustained learning value.

Success: players understand the rules, find the scenarios interesting, complete rounds comfortably and report useful learning. Never optimise for compulsive trading frequency.

## D. Connected ideas

1. **Collector's Museum:** A personal optional exhibition of earned and traded items, including game-event context.
2. **Item Origin Passport:** Clear in-app provenance attached to collectible instances.
3. **Anniversary Vault:** View authentic past event artwork and eligibility with no false scarcity.
4. **Collection Story Cards:** Optional share images showing a verified item, event and creator without exposing private ownership.
5. **Creator Signature Editions:** Official collaborative cosmetics credited to creators, released through fair published criteria.
6. **Community Craft Gallery:** Players submit non-tradable cosmetic colour palettes for moderation and showcase.
7. **Achievement-to-cosmetic collections:** Complete varied optional achievements for guaranteed cosmetic rewards.
8. **Fair Collection Quests:** No pay-to-enter or random-drop mechanics; disclose the exact objective and prize.
9. **Trade Preview Sandbox:** Practice a mock exchange with sample items before permission to make real trades.
10. **Ownership Dispute Casebook:** Staff tools to connect reports, transfers, grants and corrections with an appeal.
11. **Item Accessibility Review:** Check flashes, contrast and device performance of animated cosmetics.
12. **Restoration Receipts:** Automatically provide affected players with a clear explanation after an admin correction.
13. **Friends' Collection Showcase:** View only cosmetics the owner deliberately makes public.
14. **Non-tradable Achievement Trophies:** Some prestigious accomplishments stay bound to the original achiever.
15. **Small Community Collection Exhibition:** Opt-in curated themed galleries that work with a tiny player base.
16. **Trade Safety Tutorials:** Short interactive examples of changed offers, impersonation and blocked trades.
17. **Collector Notifications:** Explicit opt-ins for direct offers and relevant event results; no push pressure.
18. **Limited Mint Audit Dashboard:** Admin view of exact supply, issued serials, voided records and anomalies.
19. **Event Provenance Repair:** Staff workflow for correcting misattributed items with records and approval.
20. **Compatibility Testing Harness:** Verify inventory, game skins, tradeability and preset settings when new cosmetic types are added.

## Integration with existing CGH roadmap

Keep all current plans. Treat this document as the deeper design of Collector Exchange ideas, not approval to replace existing systems or to launch virtual-stakes products. Build in order: inventory integrity → safe collectibles model → private trades → limited editions → community display. The market simulator remains its own experimental game with a separate practice-only economy.

## Definition of done for a launched component

Permission and row-level security checks; migrations and rollback reviewed; concurrency/idempotency tested; error/empty/blocked states; production-like test accounts; loadouts and entitlements verified; privacy controls and moderation; mobile and keyboard accessibility; security and abuse review; visible truthful documentation; successful CI and deployment verification. None of these are inferred from a commit alone.

## Inspiration and verification

- Roblox official trading overview: https://en.help.roblox.com/hc/en-us/articles/203313310-Trading-on-Roblox
- Roblox official item details and Limited definitions: https://en.help.roblox.com/hc/en-us/articles/206142306-Understanding-an-item-s-details-page
- Steam official trade holds: https://help.steampowered.com/en/faqs/view/34A1-EA3F-83ED-54AB
- Steam official trade confirmations: https://help.steampowered.com/en/faqs/view/2E6E-A02C-5581-8904
