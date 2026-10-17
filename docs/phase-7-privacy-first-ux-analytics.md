# Phase 7 — Privacy-first player experience intelligence

**Status:** proposal only; no tracking activated. **Purpose:** find accessibility, device and gameplay problems through useful aggregates, not monitor children or build individual profiles.

## External product practice and UK requirements
- Google Analytics 4 commonly reports page events, screen resolution, language and device dimensions; this is a menu of possible metrics, **not** blanket permission to gather them.
- UK ICO Children's Code applies to online games likely accessed by children: high-privacy defaults, minimum necessary data, privacy impact assessment, transparent explanations and safeguards against harmful profiling.
- UK PECR normally requires consent for optional cookies and similar device storage/access. Obtain valid purpose-specific choice before optional analytics; offer equivalent service when refused. Confirm any applicable audience-measurement exceptions with qualified counsel rather than assume them.
- Consult current ICO guidance before launch: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ and https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/ .

## Proposed collection matrix
| Metric | Use | Minimized representation | Collection rule |
| --- | --- | --- | --- |
| Device/input support | Discover phone/keyboard/trackpad game failures | width buckets, touch/keyboard/pointer capabilities, not model/UA string | Consented aggregate usage analytics |
| Rendering performance | Prioritize slow games | p75/p95 frame time and dropped-frame bucket per game/release, not raw keystrokes | Optional diagnostic opt-in; sample conservatively |
| Web performance | Identify slow journeys | LCP/INP/CLS aggregate per route and broad viewport bucket | Optional telemetry with clear notice |
| Game starts/completions | Identify load and UX bugs | count by game, difficulty, device class | Consented event counters |
| Input errors | Identify broken controls | aggregated unrecognized-action/error counts, no input contents | Optional diagnostics |
| Navigation/search usability | Fix dead ends | filter-used, empty-results, menu-open, task-completion aggregates; never search terms | Consented events |
| Errors | Fix regressions | release + sanitized error code/stack fingerprint; no message bodies, account IDs or raw URL queries | Optional crash reports |
| Retention | Detect whether improvements last | Cohort counts at 1/7/30 days, with conservative minimum cohort size; do not create individual cross-device tracking IDs | Only if justified by DPIA, consent and privacy review |
| Player ages | Determine accessibility appropriateness | Prefer optional anonymous age *bands* survey (e.g., under 13 / 13–15 / 16–17 / 18+) published only when large enough to prevent re-identification | Never require DOB for UX analytics; do not infer age from device, friends, chat or behaviour |
| Feedback | Understand subjective friction | Optional structured issue categories and rating, sanitized; no unrestricted uploads by default | Explicit voluntary submission and moderation controls |

## Explicitly excluded
No precise geolocation, IP or persistent raw user-agent retention, advertising IDs, browser fingerprinting/canvas fingerprinting, contact graphs, keystroke capture, chat/DM content, search queries, exact DOB collection for analytics, biometric inference, age prediction, third-party ad tracking, invisible heatmaps/session replay, or person-level leaderboards of engagement.

## Architecture
1. Document the lawful basis, data controller, retention/deletion process and whether a Children's Code DPIA is required **before** schema or SDK work. Assess UK GDPR/PECR with a qualified adult/legal adviser.
2. Start with **no analytics collected by default**. Design an accessible notice and separate optional controls for usage and diagnostics; refusing cannot disable normal gameplay. Existing consent preferences must be reviewed rather than assumed equivalent.
3. Client computes broad non-identifying buckets; server allowlists event names/fields, strips URL query strings and network identifiers, validates type/ranges and caps event rate. Do not persist untrusted arbitrary JSON.
4. Keep aggregation private, restrict database writes to a constrained server endpoint, apply RLS and short TTL on any pre-aggregation raw events; no public individual-level records. Set a proposed 30-day raw-event maximum and 13-month aggregate maximum **subject to review**, with regular deletion jobs and consent withdrawal/delete paths.
5. Implement deduplicated aggregate counters by day, route/game, broad viewport/input class, anonymized error code and release. Suppress small counts (e.g., fewer than 20 participants); do not provide drilldowns that permit singling out.
6. For cohort retention, prefer aggregate counts from first-party account activity already collected for providing the service if legal review permits that *specific* purpose; otherwise use explicit opt-in. Never repurpose private social data.
7. Build admin dashboard with high-level device categories, mobile breakpoints, per-game completion, LCP/INP/CLS, crash rate, feedback themes and sparse-data suppression. No personal profile/age lookup.
8. Test refusing consent, withdrawing, unauthorized inserts, event payload abuse, small cohorts, deletion and device misclassification using synthetic accounts. Monitor that no events fire prior to valid consent.
9. Publish plain-language child-accessible privacy copy, data inventory, retention schedule and contact/rights process. Review third-party processors and data transfers before adding any SDK.

## Implementation milestones and acceptance
- **7.1 Legal/privacy design:** DPIA and data map approved; UX analytics off pending approval.
- **7.2 Consent + controls:** accessible opt-in, withdrawal, export/delete flows; verified no pre-consent events.
- **7.3 Device capability + quality diagnostics:** 5 mobile widths, touch Chromebook hybrid, keyboard, reduced motion; no raw identifiers.
- **7.4 Event ingestion + aggregation:** validated schema, throttling, SQL RLS, partition/TTL tests, small-cohort suppression.
- **7.5 Admin experience dashboard:** actionable aggregate findings with test fixtures and clear sample sizes/limits.
- **7.6 Retention/feedback experiments:** approved cohort-only and optional feedback; independent privacy and accessibility review.
- **7.7 Deployment audit:** documented staged rollout, consent tests, privacy rights, production deletion-job evidence.

## Product principles
Optimize **task success, accessibility, crashes and responsiveness**, not time-on-site or compulsive return visits. Especially for children, do not pressure longer sessions. Use measured improvements as success metrics, including fewer failed starts and faster task completion.
