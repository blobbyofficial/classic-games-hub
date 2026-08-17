# Changelog

All notable changes to Classic Games Hub. Dates are release targets; see the
live roadmap at `/roadmap`.

## v1.5.12 - "Second Factor" (two-factor authentication)

### 🔐 A second factor at login

- **TOTP through Supabase Auth.** Settings → Security → *Set up two-factor*:
  scan the QR with any authenticator app, enter one code, done. Enrol,
  challenge and verify are the auth API's, and the `aal2` claim it writes into
  the access token is the single signed answer to "has this session cleared its
  second factor?" - no flag in a table that could disagree with it.
- **Enrolling is not enabling.** A factor stays unverified until a code from the
  app is accepted, so opening the dialog and wandering off is free, and closing
  it cleans the attempt up instead of leaving a half-made factor behind.
- **Turning it off costs a code.** Disabling verifies against the authenticator
  first, so a session left open on a shared computer cannot quietly remove the
  protection it is sitting behind.
- **No dependency for the QR.** The setup dialog inlines it as a base64 data
  URL, so it fetches nothing. `totp.qr_code` is sometimes already a data URL and
  sometimes raw SVG markup - Supabase's type and its own example disagree - so
  `svgDataUrl()` detects which arrived rather than assuming. Assuming shipped a
  QR that did not render: the payload decoded to the *text*
  `data:image/svg+xml;utf-8,<svg…>`. Base64 either way also stops the `;utf-8,`
  form's raw `#` truncating the URL at the first colour literal.

### 🔑 Recovery codes (0076)

- **Ten single-use codes**, issued the moment 2FA goes on and shown exactly
  once, from an alphabet with no `I`, `L`, `O`, `U`, `0` or `1` - these get
  copied by hand off a screenshot.
- **Hashes only.** `mfa_recovery_codes` holds sha-256 and is reachable solely
  through four `security definer` functions with no row-level policy behind
  them: not even the owner of a code can read its hash.
- **Using one turns 2FA off, deliberately.** A recovery code cannot raise a
  session to `aal2` - only the authenticator can - so it spends the code,
  removes the factor through the auth admin API, clears the remaining codes and
  hands back a signed-in session with two-factor off and instructions to set it
  up again. Requires `SUPABASE_SECRET_KEY`; without it the action says recovery
  is unavailable rather than burning a code for nothing.
- **Replay is rejected as *used*,** not as unknown: spent codes are kept, which
  is also what makes "3 of 10 remaining" honest.

### 🚧 The login gate

- **A pending session can reach three pages** - `/two-factor`, the legal pages
  and `/status`. Everything else redirects to the challenge, because a session
  at `aal1` on an account that owes `aal2` is authenticated in every way that
  matters to `getUser()` and should be trusted with nothing. Signing out still
  works: the form posts to the one page the gate allows.
- **It costs no round trip.** The proxy compares the `aal` claim in the token it
  is already holding with the factors on the session. This runs on every request
  on the site, so a version that asked the auth server would have taxed every
  page load.
- **Password login redirects straight to the challenge** when the account has a
  verified factor, rather than bouncing off the gate a moment later.

### 📚 Docs

- `docs/two-factor.md` - where each piece lives, why a recovery code does not
  produce `aal2`, and what to re-test when any of it changes.

## v1.5.11 - "Housekeeping" (an audit of the platforms underneath the site)

### 🔁 Continuous integration, running for the first time

- **The CI workflow had never executed.** `ci-workflow.yml` was sitting in
  `.github/`, and GitHub only reads `.github/workflows/`. Lint, typecheck and
  build had run on zero pull requests. The file moved one directory. The
  Definition of Done has asked for all three since it was written, and until
  now every one was a manual promise.
- **The bot gets its own job.** Separate package, separate dependencies,
  separate `tsconfig`, and a `tsc --noEmit` that nothing had ever run - so a
  change breaking only the gateway worker now fails CI instead of being
  discovered when the worker next restarts.
- **Dependabot, grouped.** Both npm packages plus the workflows, weekly,
  batched into a handful of PRs rather than one per Radix package. Security
  updates are their own group so they are never buried in a routine bump.
- **CodeQL, weekly as well as on push.** Weekly is the part that matters: a
  rule published next month finds today's code instead of waiting for someone
  to edit the file it applies to.
- **GitHub Releases are now cut from `lib/update-log.ts`.** The repo had 0
  releases and 0 tags despite the most structured release data in the project
  sitting in that file. A version number in this changelog now resolves to a
  tag and a diff. The script refuses to run against a shallow clone, which
  would otherwise tag every release at `HEAD`.

### ⏰ The schedule moved into the database

- **`pg_cron` + `pg_net` now drive the four sub-daily jobs** - status probe,
  role sync, counter channels, audit poller - at the cadences they actually
  want. `docs/cron-jobs.md` has listed this as the option that "needs no third
  party" for a while and then recommended a third party.
- **Why it was worth moving.** Not reliability: the schedule for the site's
  most timing-sensitive job lived in a free external account with no alerting,
  and nothing in this repository could tell you whether it still ran.
  `status_record_checks` counts a failed check as five minutes of downtime, so
  a probe that quietly stops leaves a *wrong* graph rather than a gap.
- **The token lives in Vault and its absence is loud.** `CRON_SECRET` is not in
  the migration. Until it is set, every tick is skipped with a warning naming
  the fix, instead of firing unauthenticated at a 401 four times a minute
  forever. Rotation is one update, no redeploy, no reschedule.
- **`admin_cron_status()`** reports each job's schedule, whether it is active,
  when it last ran and how it ended - plus whether the token is set, which is
  the first thing to check when everything fires and nothing happens.
- **`vercel.json` is untouched and stays untouched.** Two entries, both daily.

### 🖼️ Shared links became worth sharing

- **Profile cards.** A pasted profile now renders the avatar, name, level, XP
  progress, four stats and best game. Profiles are what people actually send
  each other, so this was the share surface wasting the most posts.
- **Game cards.** The thumbnail in a frame that fits, beside the title,
  tagline, category, play count and rating. Before, the raw square thumbnail
  was handed to each platform to crop as it pleased, with no title on it.
- **Four emoji nobody has ever seen.** The site card carried a row of them
  across the top; `next/og` ships no emoji font, so all four rendered as
  nothing and the card had a band of empty space where the decoration was
  meant to be. Removed - which is what it already looked like. The same card
  also still advertised 23 games. There are 26.
- **A dead avatar degrades to a letter.** Remote images are fetched with a
  three-second budget and inlined, so a deleted avatar or a slow host gives a
  plain card rather than a broken one - `next/og` fetching it directly throws
  and takes the whole image with it.

### 🛡️ Indexes, policies, and a policy

- **33 foreign keys got covering indexes** (`0074`). Postgres does not index
  the referencing side for you, so every join across those keys was a
  sequential scan - and deleting one shop item had to scan the whole of
  `inventory_items`, `gift_tokens` and `wishlist_items` to check the constraint.
- **10 RLS policies stopped re-checking who you are for every row.** A bare
  `auth.uid()` is treated as volatile and evaluated per candidate row; wrapped
  as `(select auth.uid())` it is an InitPlan evaluated once per query. Same
  rows out. It mattered most on the two party policies, where the cost was
  scaling with party size.
- **A Content-Security-Policy, shipped report-only** (`lib/security-headers.ts`).
  The static headers have been right for a while; the one that actually
  contains an XSS was missing, on a site rendering usernames, bios, chat
  messages and third-party GIFs. Report-only because a policy written from
  reading the code is a hypothesis and the browser is what knows. Promoting it
  is renaming one header - see the note about `next-themes` first.
- **Custom analytics events.** Pageviews say someone opened Snake; they cannot
  say how many runs finish, what the shop converts at, or which difficulty
  people abandon. `game_start`, `game_end`, `purchase` and `party_join` -
  scalars only, nothing identifying, behind the existing consent gate.
- **Still to do, by hand:** enable leaked-password protection in Supabase Auth,
  and decide whether Vercel Web Analytics is on - the script ships to every
  visitor and the API reports the project has none.

## v1.5.10 - "No Host Required" (server logs without an always-on process)

### 📝 Logging that runs on free infrastructure

- **v1.5.9 shipped a logging feature nobody here could switch on.** It lives in
  the gateway worker, and the worker needs a host that stays up - which this
  deployment has not got and is not going to buy. A built feature that cannot
  run is worth the same as no feature.
- **`/api/cron/discord-audit-log` is the way round it.** Discord's own audit log
  is pollable over plain REST, needs no persistent connection, and contains
  every *structural* change in the server. Point any free scheduler at it every
  five minutes - the same one already driving the status probe - and the log
  channels fill up with no hosted process anywhere.
- **What it covers:** channels created, renamed, moved, re-permissioned and
  deleted; roles created, recoloured, re-permissioned and deleted; members
  kicked, banned, unbanned, timed out, renamed and given roles; invites,
  webhooks, emoji, stickers, threads, server settings, and messages deleted by
  a moderator. Permission changes are named, not printed as bitfields.
- **What it cannot cover, ever:** message *content*, message edits, messages
  people delete themselves, joins, leaves and voice. None of those exist in
  Discord's audit log, so this is a permanent limit rather than a gap to close
  later. `docs/discord-bot.md` has the full comparison table.
- **A cursor, so it never repeats or skips** (`logging_state`, migration
  `0073`). The first run records where it is and posts nothing, because
  switching it on should not dump a hundred historical entries into a channel.
  It also skips the bot's own actions - those are already reported by whatever
  performed them, and logging them twice is how a mod-log becomes noise.
- **Run one or the other.** The worker and the poller write the same structural
  entries to the same channels, so running both duplicates every line. Said in
  the docs and in the failure-modes list, because "every entry appears twice" is
  otherwise a genuinely confusing symptom.

## v1.5.9 - "On the Record" (server logs, and the bot's own audit)

### 📝 Server logging (the last thing Sapphire still did better)

- **Every change in the server now gets an entry**: messages deleted and edited,
  channels created, renamed, moved, re-permissioned and deleted, roles created,
  recoloured, re-permissioned and deleted, members joining, leaving, being
  kicked, renamed or given roles, bans, timeouts, emoji, stickers, invites,
  webhooks, voice movement and the server's own settings. Twenty-seven events.
- **Each entry names who did it.** Gateway events carry no actor at all, so
  every one is matched against Discord's audit log - live via
  `GuildAuditLogEntryCreate`, falling back to a fetch. Needs **View Audit Log**;
  without it entries still appear, say "Unknown actor", and the worker warns
  about it once at startup rather than leaving you to discover it.
- **Updates are diffed to the property.** A role change reads
  `Colour #5865f2 → #ff0000`; a permission change lists the permissions that
  moved rather than two bitfields; a channel update names the overwrite that
  changed and whose it was. "Role updated" is not an audit log entry.
- **It is built not to be muted.** Five categories, each routable to its own
  channel, all falling back to one catch-all; every event individually
  switchable; ignore lists for channels, roles and users. Entries batch ten to
  a message on a 1.5-second tick, so a raid or a 100-message purge costs a
  handful of API calls rather than hundreds - and the queue is bounded, because
  the failure mode of an unbounded one is losing the whole worker.
- `/setup logging channel:#server-log`, and the full grid at
  **Admin → Discord bot → Server**. Migration `0072`.

### 🔒 A hole in the interactions endpoint

- **Any server the bot was added to could moderate this one.** Every handler
  acts on `DISCORD_GUILD_ID`, while the permission check only ever read the
  permissions Discord sent for the guild the command was *used* in - so someone
  who could invite the bot to a server they ran could `/ban` there and have it
  land here. Interactions from any other guild are now refused outright.
- `/ban`, `/kick`, `/timeout` and `/warn` refuse to target you or the bot. The
  dashboard has refused both since it was written; the slash commands sent them
  to Discord and returned a bare "couldn't do that", which reads like a
  permissions problem and sent people to check role hierarchy.

### 🐛 The worker

- **It ran on every server it was in.** Chat XP, automod and the welcome
  message were not scoped to `DISCORD_GUILD_ID`, so anyone who added the bot
  elsewhere got Hub XP awarded against it.
- **Two unbounded maps.** The XP cooldown map kept one entry per person who has
  ever spoken, forever; automod's flood map "bounded" itself by wiping
  *everyone's* history the moment it passed 5000 entries - including the person
  mid-flood it exists to catch. Both now age entries out on a timer.
- **An uncaught exception was logged and ignored**, leaving a process that
  passes its health check and has stopped working - the worst of both. It now
  exits so the host restarts a clean one.
- **A Supabase blip became a request storm**: a failed config read wasn't
  cached, so the RPC was retried on *every message* until it recovered.
- **Boosting reached the Hub a day late.** The worker never handled
  `GuildMemberUpdate` and its role sync had drifted from the website's - no
  `__booster__` key, no `bot_set_booster` call - so a new booster waited for the
  nightly reconcile. Both implementations now do the same thing.
- **Automod ignored edits.** Posting something innocuous and editing an invite
  into it walked past every rule.
- **The worker's version was blank on `/status`** for the deployment everyone
  actually uses: `npm_package_version` only exists when npm started the process,
  and the Docker image runs `node dist/index.js`. `BOT_VERSION` now works.
- The invite/link rules silently match nothing without the Message Content
  intent, which looks exactly like automod being broken. Said once, in the log.

### 🎫 Tickets and names

- **Long ticket transcripts were logged as their middle.** The last 3800
  characters were taken, then the first 1900 of *those* - losing the question at
  the start and the resolution at the end. Transcripts are now chunked, keeping
  the end when they don't fit.
- `/rank @someone` on an unresolved user showed **your** name on their card. The
  fallback was the invoker's name; it is now "that member".

## v1.5.8 - "Not Two Yet" (the plan stays in the 1.x line)

### 🗺️ Renumbering

- **The relaunch, Head to Head and Player Made were v2.0.0, v2.1.0 and v2.2.0**,
  which awarded a major version to work that has not started. They are now
  **v1.7.0, v1.8.0 and v1.9.0**, so the whole plan - the rebuild at v1.6.0-v1.6.3
  and the three releases behind it - runs in one continuous line.
- **2.0.0 is deliberately unclaimed.** A planned number is not a reservation, so
  there is nothing to inherit it: whatever eventually deserves to be called 2.0.0
  will take it when there is a reason to, rather than because a sketch said so.
- The relaunch's summary used to justify its own number ("the version number the
  rebuild has been heading for"). It now says why it *isn't* 2.0.0, which is the
  more useful sentence.

### 📌 Corrections

- Discord setup told you to apply two named migrations, `0033` and `0041`. The
  schema is at `0071` and publishing needs `0063` and `0068`, so following it
  literally left a database that could not run the bot. It now says to apply
  everything in order and check `status_meta.schema` on `/status`.
- Documented that env vars set between 3 and 13 August never reached a running
  build, because the redeploy they need could not happen while `vercel.json` was
  refusing every deployment. A credential that looks wrong may only be missing.

## v1.5.7 - "Unblocked" (the deployments start again)

### 🚀 Ten days of pushes that never built

- **Nothing had deployed since 3 August**, and not because a build was failing -
  because no build was ever *started*. Vercel's Hobby plan caps cron jobs at two,
  each running at most once a day, and it rejects a sub-daily expression when the
  deployment is **created**. There is no failed build to look at, no error in the
  dashboard, and no clue in the repository; every push simply vanished, which is
  why reconnecting the git integration changed nothing.
- The culprit was `de6cfc9`, which moved role sync from `30 4 * * *` to
  `*/2 * * * *` and was itself the first commit that never shipped. `c0d2064`
  then added a `*/15` job and v1.5.6 a `*/5` one, so by the time anyone counted
  there were five crons, four of them sub-daily. The application code was fine
  throughout - typecheck, lint and build all passed on the stuck commit.
- **`vercel.json` is back to two daily entries**: `discord-publish` at 05:00 and
  `booster-drops` at 06:00. Those two because a daily run still serves them -
  publishing mirrors announcements immediately and the cron only recovers what
  was missed, and the booster drop is daily by design.
- **The status probe deliberately did not stay.** `status_record_checks` counts
  a failed check as five minutes of downtime, so a daily probe would not merely
  be coarse, it would report wrong uptime percentages. It runs from an external
  scheduler along with role sync and the counter channels, all three authorised
  with the same `Authorization: Bearer $CRON_SECRET` header Vercel itself sends.
- **`docs/cron-jobs.md`** is new: which job wants which cadence, which two are on
  Vercel and why, how to point a scheduler at the rest, and what to move back if
  the plan ever changes. The warning is repeated in `CLAUDE.md`, because the
  failure is silent and the first instinct - relink the repository - is wrong.

## v1.5.6 - "Is It Just Me?" (a real status page, and an API for it)

### 📊 /status became a status page

- **It used to be a counter.** The old page showed players online, plays today
  and credits awarded - genuinely interesting, and no help at all with "is the
  arcade broken", which is the only question anyone opens a status page to ask.
  Those numbers are still there, in their own section, underneath the answer.
- **Ten services, each with 90 days of uptime**, drawn as a bar per day. A
  single red notch in a field of green is visible from across a room in a way
  "99.87% uptime" never is. A day with no checks is drawn as *no data* and left
  out of the percentage - a day before we were watching did not have perfect
  uptime, and rounding it up would be the one lie a status page cannot tell.
- **Incidents have timelines**, not just a current state: investigating →
  identified → monitoring → resolved, each update timestamped and attributed.
  Scheduled maintenance gets its own section and its own words, because planned
  work is not an outage.
- **The vocabulary is Statuspage's on purpose** - `operational`,
  `degraded_performance`, `major_outage`, and a `none`/`minor`/`major`/`critical`
  indicator. Inventing our own would have cost nothing here and everything at
  the edges, where the API is meant to be read by other people's tools.

### 📣 Players can report problems, Downdetector-style

- **A "Report a problem" button that needs no account**, because the person best
  placed to tell us sign-in is broken is the person who cannot sign in. Two
  taps: what is going wrong, and where.
- **Reports are counted, never quoted.** The page shows 15-minute buckets over
  24 hours against the site's own baseline, plus a percentage breakdown of what
  is being reported. The free-text notes are staff-only.
- **The signal needs a floor *and* a multiple** to fire. A multiple alone makes
  a quiet site hysterical - two reports against a baseline of 0.3 is a 6× spike
  and means nothing - and a floor alone makes a busy site deaf. The baseline
  also excludes the last hour, so an outage in progress cannot raise the bar it
  is being measured against.
- **It is deliberately hard to skew.** The submit RPC is service-role only, so
  it is not reachable with the key that ships in the browser; the fingerprint is
  derived from the request rather than chosen by the sender; and a per-component
  cooldown and hourly cap are enforced in the database, not the route. No IP
  address is stored - the fingerprint is a daily hash that cannot be matched
  across days.
- **This is the half automated checks cannot do.** A game that renders a blank
  canvas returns HTTP 200 all day long. Forty people saying so in a quarter of
  an hour is the only thing that catches it.

### 🤖 A probe, and incidents that open themselves

- **Every five minutes**, four round trips check ten services: the site's own
  front page, Supabase auth, Discord's gateway, and one `status_selfcheck()`
  that times a representative read per database-backed area. Adding a service to
  the page does not add a round trip to the probe.
- **Two consecutive failures open an incident; two successes close it.** One
  failed check is a network blip far more often than an outage, and an incident
  per blip trains everyone to ignore the page. A partial unique index guarantees
  at most one open automatic incident per service, so a flapping probe cannot
  fill the page with duplicates.
- **Three sources of truth, and a defined winner.** Probes write what they
  measured, incidents carry their own per-service claim, and a staff pin beats
  both - the only one that can make the board look *better* than the evidence,
  which is why it records who set it and why, in public.

### 🔌 An API anyone can use

- **`/api/status/*`, CORS-open and keyless**, cached 30 seconds at the edge with
  a stale-while-revalidate window so polling it does not become load and a slow
  database serves the last known answer rather than an error. Summary,
  components, one component, incidents, uptime, reports, and a POST to submit
  one.
- **`?format=statuspage`** returns Statuspage's `summary.json` shape, so an
  existing status widget or uptime tool can point at this site and just work.
- **`/api/status/badge`** is an SVG badge for READMEs and other sites, in
  shields.io's proportions so it sits level with its neighbours.
- **An unreachable database answers 503, never an empty list.** Reporting "no
  incidents" because nothing could be read is exactly the failure that makes a
  status page worthless.

### 💬 `/status` in Discord

- **`/status [service]`**, answering from the same endpoints as the page, and
  public rather than ephemeral - "is the site down" is a question a whole
  channel is usually asking at once.
- **The service option autocompletes from the live component list**, so a
  service added to the status page appears in Discord without a code change or a
  re-registration. `incidents`, `reports` and `versions` are offered alongside
  the services, so nobody has to know they exist.

### 🏷️ Versions you can actually check

- **Four numbers, side by side, because they can disagree**: the release, the
  deployed commit, the database schema, and the bot worker's own version.
- **Migrations are applied to Supabase separately from deploys**, so the schema
  and the app drift apart routinely - and used to do so silently. The page now
  compares what the database reports against what the build expects and says so
  when they differ.

### 🛠️ Running an incident

- **Admin → Status** is one screen: declare, update, resolve, pin a service, and
  read what players actually wrote. Whoever is using it is using it while
  something is on fire, and a flow across three pages is a flow nobody finishes.
- **Closing an incident is posting its final update**, not a separate button, so
  a resolved incident can never have a timeline that stops mid-sentence.
  Resolving also releases its claim on the affected services automatically.

## v1.5.5 - "Under Construction" (the whole arcade goes into development)

### 🚧 Every game is being rebuilt

- **All 26 games are now `in_development`**, a new game status meaning *shipped,
  and being rebuilt*. They stay listed, badged and clickable, and they keep every
  leaderboard, rating, favourite and play count they had. Only admins and
  moderators may record a play while a game is in this state, so each overhaul
  can be played on the real site - on a real phone - before it reopens to
  everyone. A game comes back by being set to Published from Admin → Games.
- **Not the same thing as "coming soon"**, which means never released and
  disables the card outright. These games have history; pretending otherwise
  would have thrown away favourites and told players something untrue.
- **The gate is in the database, not the page.** The existing `play_sessions`
  trigger that enforces booster early access now enforces both rules, so a
  non-staff account cannot record a score for an in-development game by any
  route. The two compose deliberately: boosting does *not* get you in, because
  early access is a head start on a release and this is not a release.
- Widening the status meant widening everything that tested for the literal
  `'published'` - the row-level security policy, `submit_score`, `set_party_game`,
  `platform_status` and the command palette. Missing any one of them would not
  have degraded the arcade, it would have emptied it.

### 🗺️ A plan for each of the 26 games

- **The roadmap is now a five-release rebuild programme.** v1.6.0 "Ground Up"
  builds the platform and reopens nothing; three waves then rebuild and reopen
  the games a category at a time; v2.0.0 is the relaunch. Head to Head moves
  behind all of it to v2.1.0, because multiplayer written against engines that
  are still being replaced would only have to be written twice.
- **Every game is now its own section carrying the same four promises** - the
  look, the animation, the feel and mobile, and what it does with the whole
  screen. All 26 have all four. The repetition is the point: a game receiving
  less than the others is visible at a glance.
- **The platform comes first because it is what makes 26 overhauls affordable.**
  A stage that fills your screen instead of a letterboxed square, an effects
  library so animation stops being something eight games happen to have, skins
  and arenas, a mixer so the volume slider does something, and input that does
  not throw your presses away.
- Written from measurements, not impressions: 4 of 26 engines respond to the
  difficulty picker, 3 honour reduced motion, 6 have a pause button that does
  not pause, 18 freeze their layout at startup so they cannot be resized, 21
  hardcode their text sizes in pixels, and the sound slider saves what you set
  and is read by nothing.
- Some of what reading all 26 engines turned up: Neon Runner's touch button only
  sends a jump, so ducking under its overhead obstacles is impossible on a
  phone; Frogger has no lily pads to fill; Space Invaders' own description
  promises barricades the game does not have; Connect Four advertises keyboard
  controls it never implemented; Gem Cascade's timer keeps draining behind the
  pause overlay; 2048 works out how far each tile should slide and then throws
  the number away, which is why nothing animates; and Snake has been reporting
  the length of the snake where the number of seconds played belongs.

### 🧹 Smaller things

- The games page claimed there were 23 games. There are 26.
- `docs/adding-a-game.md` never mentioned `status`; it now documents all five
  values and who each one lets in.
- Removed an unused feature-flag fetch from the game page, and changing a game's
  status now refreshes the home page too, so reopening a game restores it to the
  featured rail immediately.

## v1.5.4 - "Broadcast" (versioned update log, and Discord mirroring)

### 🗂️ Every change has a version

- **`lib/update-log.ts` is now a tree**: releases grouped into series, and every
  one of the 60 changes in production assigned to exactly one release. Before
  this, eight releases covered part of the history and the rest - the March
  prototype, the July rebuild, the whole run of Discord work between 26 July
  and 3 August - sat in a flat list with no version at all.
- **Grouped by size, not by count.** Three small fixes in one afternoon are one
  patch (v1.4.6, v1.4.8); a single pull request that redesigns the interface is
  a patch on its own (v1.4.10). Each release carries a `scope` line saying why
  it was drawn where it was, so the grouping can be argued with rather than
  taken on trust - and its `commits` and `prs`, so the claim is checkable.
- **`UNASSIGNED` is derived, not asserted.** A landed change nobody versioned
  shows up on `/updates` as a question instead of quietly falling out of the
  history the way the 26 July - 3 August run did.
- **Two renumberings, both labelled.** The interface redesign shipped as v1.4.1 while the games
  and themes overhaul - eight days earlier, and labelled v1.4.1 in its own
  commit message and changelog heading - held the same number. Chronology wins,
  so the earlier one keeps v1.4.1 and the redesign is v1.4.10, carrying
  `formerly` so its old number still finds it. "Sanded Down" moved the same
  way and for the same reason: it shipped as v1.5.1, but two runs of Discord
  work landed earlier the same day carrying no version at all, so it becomes
  v1.5.3 and they take v1.5.1 and v1.5.2.
- `/updates` renders it as nested dropdowns - a line, then its releases, then
  their notes and the commits behind them. Native `<details>`, so the whole tree
  works with JavaScript off and costs the page nothing.

### 📡 The update log and announcements, in Discord

- **Two channels, mirrored from the website** (`lib/discord/publish.ts`,
  migration `0063`): one message per release in an update-log channel, and one
  per published announcement in an announcements channel. Configured under
  Admin → Discord bot → Sync → Publishing, or created by **Run full setup**.
- **A mirror, not a series of posts.** Every mirrored thing records its message
  id and a fingerprint of what was in it, so a second sync *edits* rather than
  duplicating, an edit on the website reaches Discord, unpublishing an
  announcement deletes its message, and a sync with nothing to say makes no
  Discord calls at all.
- **One direction, on purpose.** The update log is a file in the repository and
  announcements are rows an admin publishes, so the website owns both and
  Discord is a view of them - the same rule role sync follows. Reading messages
  back would give one fact two owners, with no answer when they disagreed.
- **Releases post oldest first**, so the channel reads in the order things
  happened. Discord orders by post time and nothing reorders it afterwards, so
  it is the one part a later sync could not repair.
- **Publishing an announcement mirrors it after the response**, never before: a
  Discord outage must not turn a successful publish into an error the admin
  retries, which would notify every player a second time.
- **`/api/cron/discord-publish` every 15 minutes** is recovery, not timeliness -
  a deploy adds releases with nobody pressing anything, an outage drops a post,
  someone deletes a message by hand. Idempotent by fingerprint, so the usual run
  costs two database reads.
- A message deleted by hand answers `404` to the edit that follows; the record
  is forgotten and the message re-posted, rather than the sync failing forever
  against an id that will never exist again.
- Only the newest 25 announcements are kept in step, and older ones are left
  alone rather than deleted - scrolling out of the window is not the same as
  being withdrawn, and deleting on that basis would quietly clear the channel.

---

## v1.5.3 - "Sanded Down"

> Published as v1.5.1. Two runs of Discord work landed earlier the same day and
> had no version at all; numbers that run backwards in time are not worth
> reading, so this took the next free one. See `/updates`.

### 🎮 Difficulty, and reports with context

- **Difficulty picker** on Frogger, Snake, Minesweeper and Hangman, starting
  from a new saved default. Tuned per engine via a `tune()` helper rather than
  one global scalar: doubling speed makes Snake harder and Whack-a-Mole easier,
  and halving a grid makes Minesweeper trivial but Match-3 impossible - only the
  engine knows which direction "harder" points. Shown only on engines that
  actually read it, because a control that changes nothing is worse than none.
- Rewards scale with difficulty (easy 0.75x, hard 1.25x). Without it easy is
  strictly the best way to earn and the picker becomes a farming setting.
- **A leaderboard per difficulty** (`0069`). Separate boards rather than one
  mixed list: a ranking only means something between runs that faced the same
  game, and sorting them together would put every easy run above every hard one.
  Tabs on the game page and the leaderboards page.
- Deciding this needed the live catalogue, not the migration files. Grepping the
  files suggested three separate upserts into `leaderboard_scores`; asking
  Postgres showed the `0013` and `0036` ones were superseded years of migrations
  ago and no longer exist. The real surface is two writers, three readers and one
  direct table query.
- Every reader needed a decision rather than a filter, because "best score" stops
  being unambiguous once a player holds three rows for one game. Achievements,
  the podium badge, the friends feed and profile "best game" all read the
  **regular** board only - an easy run must not quietly unlock something written
  for a real one.
- **Fixed a live bug from `0067`:** giving the new four-argument `submit_score` a
  default on `p_difficulty` while the three-argument overload still existed made
  a three-argument call ambiguous - `function public.submit_score(unknown,
  bigint, integer) is not unique`. The deployed app calls it with exactly three
  arguments, so that sat between every finished game and its score. Dropping the
  default is what disambiguates. Both old signatures are now thin wrappers that
  delegate, so there is one body rather than a sixth divergent copy.
- **Report a message** (`0066`), extending the existing reports table rather
  than adding a second system - `target_type = 'message'` has been accepted
  since `0004` and was never used. The admin queue loads the surrounding
  conversation on demand, because a message reads as a joke or as abuse
  depending entirely on what surrounds it. The RPC resolves the message from the
  report row rather than taking a conversation id, so it cannot be pointed at an
  inbox, and it is staff-gated in place of the participant RLS it steps around.

---

## v1.5.2 - "Server Export"

### 🗺️ Seeing the whole server

- **`/export`, and Sync → Export the server.** Both produce the same JSON: every
  channel nested under its category in draw order, every role, every permission
  overwrite - ids resolved to names and bitfields decoded, because `"deny":
  "1024"` on a raw id says nothing and `deny: ["ViewChannel"]` on @everyone says
  all of it. In Discord it arrives as a file attachment, since a modest server
  exports past the 2,000-character message limit and a truncated server map is
  worse than none.
- **Problems, above the data**: the bot's own highest role and which roles sit
  above it, its effective permissions, every configured id that no longer
  resolves, and whether the gateway worker has ever checked in.
- **Role sync every two minutes**, not nightly - nightly cannot hold up a
  promise of the same roles and level as the website. Costs one database round
  trip when nobody is linked.

---

## v1.5.1 - "Setup, Finished"

### ♻️ Reset all settings

- New control in Admin → Discord bot → Sync, on `admin_reset_bot_config`
  (migrations `0061` + `0062`): clears every section back to its defaults.
- **Fixed in `0062`:** the first cut failed at runtime with "DELETE requires a
  WHERE clause". PostgREST connects as `authenticator`, which carries
  `session_preload_libraries = supautils, safeupdate`, and `safeupdate` rejects
  an unqualified `DELETE` - inside a `SECURITY DEFINER` function too, since that
  changes the privileges but not the session. A migration applies as `postgres`,
  which has no such preload, so the DDL succeeded and only the first real press
  of the button found it. The delete is now qualified by the same key allowlist
  `bot_patch_config` and `admin_set_bot_config` already enforce, rather than a
  `where true` written only to get past the check.
- The point is the **ids**, not the toggles. A dashboard pointed at one server
  accumulates role, channel, category and panel-message ids, and those are what
  you cannot fix by editing one field - a stale id is worse than an empty one,
  because setup reads it as "use that exact channel" and reports it missing
  rather than creating a replacement. This is the way to start again on a new
  server, or after one was rebuilt.
- It **deletes** the config rows rather than writing defaults into them.
  `bot_get_config` returns null for an absent key and every caller already
  merges over its own defaults, so no row *is* the default; writing them out
  would duplicate the defaults in a second place and let the two drift.
- Nothing is deleted inside Discord. Roles and channels the bot created stay,
  and so does any panel it posted - but the link to that panel is cleared, so
  the next setup posts a fresh one rather than editing it. The card says so
  plainly rather than leaving admins to discover a second panel.
- Confirmation is a second press, not a dialog - the page has no dialog pattern
  and the destructive wording only appears once you have reached for the button.
  Audit-logged as `bot_config_reset`.

### 🪄 Full setup now finishes the job

- **Run full setup** used to stop two steps short. It created the verification
  and level roles and the counter channels, then reported the verification and
  ticket panels as *skipped* with "pick a channel below, then save" - so a fresh
  server came out of setup holding roles with nothing handing them out.
- It now provisions what those panels need and posts them: a `✅-verify`
  channel, a `🎫-support` channel, a `🎫 Tickets` category and a `Staff` role.
  Which channel members should see is a human decision, but "somewhere
  newcomers can press verify" has one obvious answer, and asking for it was
  costing every fresh server the one step that makes the rest do anything.
- **Nothing is duplicated.** Every role and channel is matched by name first, so
  a server that already runs a `#verify` or a `Staff` role keeps using it. A
  configured id still wins over a name, and a configured id that has since been
  deleted is reported as missing rather than silently replaced with a new
  default-named one the admin then has to hunt down.
- Both panel channels are readable by everyone and writable by nobody - a panel
  is one button, and letting members chat there buries it. The verify channel
  allows View Channel explicitly rather than inheriting it, because the gate
  works by denying `@everyone` elsewhere and a gate members cannot see is just a
  locked server.
- The ticket category hides itself from `@everyone`, closing the window where a
  freshly created ticket was visible server-wide until its own overwrites
  landed. The staff role is resolved before the category that grants it access,
  so tickets are never filed somewhere staff cannot read.
- Each panel posts into the channel the step before it **just resolved**, rather
  than into a re-read of the config. The id is written back either way, but
  depending on that write having landed turns one failed round trip into a panel
  that silently never appears - the exact failure the step exists to remove. The
  report now names the channel it posted into, so "posted" can be checked rather
  than taken on trust.

## v1.5.0 - "Collector's Edition"

### 🌀 Labyrinth - the first true-3D title

- A first-person maze, and the last item on the v1.5.0 roadmap (`0060`). Three
  mazes to a run, rising in size, with a map that fills in only where you have
  actually been.
- The interesting part is underneath it: **`lib/games/engine3d.ts`**, a shared
  software renderer. Cube got away with hand-rolled maths because flat stickers
  never cross the camera plane and never need lighting. A camera *inside* a
  scene needs both, so this one has a real pipeline - free camera, perspective,
  **near-plane clipping**, backface culling, depth sorting, Lambert shading and
  distance fog.
- Near-plane clipping is the whole game. Without it, a wall you are standing
  next to divides by a depth at or behind the eye and flings its corners across
  the screen; it is the single thing separating a first-person camera from a
  diorama.
- **Still no WebGL.** v1.4.1 spent a release taking an animation runtime and a
  query cache out of the bundle, and a 3D library would put back more than every
  engine here weighs combined. A few hundred polygons is nothing to transform in
  JavaScript, and `fill()` on a convex polygon is hardware accelerated anyway.
  Making the renderer shared rather than part of the game is what makes "titles"
  plural affordable.
- Lighting is computed from **world-space normals, before the view transform**,
  so it stays fixed to the world as you turn. A light that swings with your head
  is the classic tell of a fake 3D scene.
- Two things came out of actually looking at it rather than trusting the maths:
  the player spawned nose-first into a wall, which showed a flat rectangle and
  told them nothing; and a flat-shaded wall up close is a screen of uniform
  colour with no cue at all. Fixed by facing the open direction on spawn, and by
  panelling walls into a 2x2 grid with per-panel shading and edge outlines.
- Depth sorting is per-face painter's algorithm rather than a z-buffer. A
  z-buffer in JavaScript means per-pixel work and giving up `fill()`, which is
  where all the speed is; the tradeoff is that large interpenetrating faces can
  sort wrongly, which axis-aligned level geometry never does.

### 🧊 Cube - a playable Rubik's cube

- The roadmap's "more 3D titles" item, and the arcade's 25th game (`0058`).
  Drag a sticker in the direction you want it to go and that layer turns; drag
  the background to orbit. Keyboard players get the standard notation - U, D,
  L, R, F, B, with Shift for anticlockwise.
- **Canvas 2D with hand-rolled 3D maths, not three.js.** Every other engine
  here is canvas 2D, and 54 stickers is a trivial amount of geometry to
  transform by hand. Adding a WebGL runtime would have cost more bytes than the
  entire rest of the games bundle, and undone the work v1.4.1 did to shed the
  animation runtime and the query cache.
- **No permutation tables.** Each sticker carries a cubie coordinate, a face
  normal and a colour; a face turn rotates those two integer vectors 90 degrees
  and the colour travels with the sticker. That means there is no lookup table
  to get subtly wrong, and no floating-point drift accumulating over a long
  solve - the model is still exact on the thousandth move. "Solved" falls out of
  it for free: every sticker sharing a normal shares a colour.
- Turn direction is derived from the gesture rather than hard-coded per face:
  the layer that moves is perpendicular to both the face normal and the
  direction you dragged, so a drag does what it looks like it should from any
  orientation.
- Scored on **moves and time**, like Lights Out, so a tidy solve beats a lucky
  one. The scramble avoids undoing its own previous move, which would otherwise
  leave a cube far easier than its move count suggests.

### ✨ The last three expressive extras

- Profile **entrances**, **cursor trails** and **profile music** (`0059`) - the
  remainder of the stretch-cosmetic backlog that has been carried since v1.2.0.
  All three were previously blocked on "the animation work", which v1.4.1
  shipped, so the blocker is gone.
- **Entrances** are how a profile card arrives: Rise, Unfold, Sweep, Glitch, and
  Warp at level 25 - which fills the gap between the L20 loadout presets and the
  L30 vanity URL. Pure CSS keyframes, so there is no JavaScript on the page for
  them at all, and every variant is gated behind `motion-safe:` - reduced motion
  gets the card already in place rather than one that opens at zero opacity and
  never resolves.
- **Cursor trails** (Sparkle, Comet, Bubbles, Ribbon) follow the pointer while
  someone is looking at your profile. Drawn on **one canvas** rather than a
  swarm of DOM nodes: a trail spawns particles on every pointer move, and
  creating and destroying absolutely-positioned spans at that rate is exactly
  what the v1.4.1 performance pass was undoing. The loop stops itself when the
  last particle dies and restarts on the next move, so an idle profile costs
  nothing.
- **Profile music** needed **no new shop rows and no new audio**. The v1.3 track
  library already existed, was already bought and owned, and is already rendered
  procedurally in the browser; it was simply only playable from the shell
  player. Equipping a track gives it a second place to be heard.
- It is deliberately **click-to-play**. Browsers block autoplay with sound
  outright, so an auto-starting version would mostly be silent and occasionally
  ambush someone - and a profile that starts making noise on its own is the
  reason people remember profile music badly. The chip names the track before
  anything plays.
- Shop item cards were also missing kind labels for decorations and profile
  frames, which have been there since `0049`; both now show one.

### 👀 Profile views and "now playing"

- Two of the expressive extras from the roadmap (`0057`).
- **"Now playing"** on a profile shows what someone is playing, or last played,
  as a small chip under their name. Entirely derived from `play_sessions`, so
  there is nothing to record, nothing to keep in sync, and no way for it to
  claim someone is playing a game they stopped playing last week. It respects
  the **existing** "show online status" switch rather than adding a second one -
  "playing Snake right now" is presence arriving through a different door.
- **Profile views** are opt-in and off by default, under Settings → Privacy. A
  view counter is fun for some people and quietly stressful for others, which is
  why the roadmap called it optional.
- It counts **unique visitors per day, not raw hits**: a raw counter measures
  how often someone refreshed, which is not interesting and is trivially
  inflated. Self-views never count. Views are recorded even while the setting is
  off, so turning it on shows a real history rather than starting from zero and
  implying nobody ever visited - only the display is optional, not the
  recording.
- Nobody can read the rows directly; the count comes back through the RPC, so a
  visitor can never enumerate who looked at whom.

### 🔓 Booster early access

- A game can now go out to boosters ahead of everyone else (`0056`). Set it from
  Admin → Games: 3 days, 1 week, 2 weeks, or open it to everyone early.
- **The game stays visible to everyone**, shown with a lock badge on its card
  and, on its page, a countdown and a prompt to boost. A perk nobody can see is
  a perk nobody wants, and half the point of early access is that other people
  know it is running.
- The gate is a **trigger on `play_sessions`**, not a check inside
  `submit_score()`. That function is a hundred lines and has already been
  re-declared across five migrations; a sixth copy to insert one `if` would be
  another chance for the rest of it to drift from what is live. A trigger states
  the rule once and keeps holding however `submit_score` is rewritten later.
- It gates **earning, not the page**. A determined non-booster could still load
  the engine; what they cannot do is record a score, XP or credits for it. The
  UI hides the player, the database refuses the result.

### 🎟️ Monthly gift token

- Boosters get one token a month to give a friend any cosmetic for **30 days,
  free** (`0055`). It appears as a second button on the gift dialog of any shop
  item, and on `/collections` alongside the other booster perks.
- **30 days** matches the token's own cadence: a friend gifted every month keeps
  the cosmetic continuously, and one gifted once gets a proper trial rather than
  a glimpse. Tokens do **not** stack - left to accumulate, a long-time booster
  could hand out a dozen at once, turning a steady trickle into a windfall.
- The temporary grant rides `inventory_items.expires_at`, which already existed
  for boosts and is already respected by `equip_item`, `apply_loadout_preset`
  and every ownership check, so nothing new had to learn about expiry.
- Spending is guarded by the update itself: it only matches an unused row, so
  two concurrent requests cannot both spend the same token. Every rule a paid
  gift respects - blocks, staff-only items, no boosts, no gifting yourself - a
  free one respects too.
- Granted by the existing daily booster cron rather than a new job, since it
  keys off the same `booster_since` the role sync refreshes an hour earlier.

### 🗓️ Seasons

- **Neon Summer**, the first season, runs on `/collections`: a five-tier track
  unlocked by season XP, each tier claimed once for credits and, at three of
  them, a cosmetic that is never sold.
- **Season XP is derived, never stored** (`0054`) - it is the XP you earned from
  play sessions inside the season's window. Because it is a sum over
  `play_sessions`, it can never drift from what actually happened, and seasons
  needed **no hook into `add_xp` or `submit_score`**: nothing on the hot path
  changed to add this feature.
- Three open product questions are answered as **data rather than schema**, so
  changing any of them later costs an `UPDATE` and not a migration:
  season length is `starts_at`/`ends_at` per season; there is no paid track (the
  free track only, and no payment integration exists to build one on); and a
  past season's cosmetics return only if someone deliberately adds them to a new
  season's tiers.
- Claiming re-derives progress server-side before paying out, so a stale page
  cannot claim a tier that has not been reached, and the claim row's primary key
  refuses a second attempt - the same guard collections use.

### 🎨 New icons and thumbnails

- **The favicon now matches the logo.** The app icon was an unrelated
  arrangement of dots and a cross while the site header uses a joystick, so a
  browser tab and the product did not look like the same thing. `public/icon.svg`
  is redrawn as that same joystick on the brand violet-to-pink gradient, and
  every PWA and Apple size regenerates from it.
- Drawn for 16px first: three solid shapes with generous gaps and nothing finer
  than a few pixels once scaled down, checked at 16, 32, 64, 128 and 256 on both
  light and dark backgrounds. The glyph sits inside the middle 60% so the
  maskable icon can crop to a circle without clipping it.
- **All twenty-four game thumbnails are now one visual system.** Each game
  previously had its own arbitrary dark gradient - teal, amber, slate, green -
  so the library read as a pile of unrelated art. They now share a near-black
  base, grid, vignette and glyph treatment, and a game's identity comes from a
  single accent hue drawn from a six-colour ramp.
- Two glyphs were redrawn because they did not read: the runner was a head and
  one rectangle that looked like a barbell, and Simon's wedges were hand-placed
  arcs that rendered lopsided.
- Still generated SVG, so the whole set is a few kB, stays sharp at any card
  size, and changing the system is one edit rather than twenty-four.

### 🖼️ Profile frames

- Six decorative frames around your **entire profile card** - Gilded, Obsidian,
  Sakura, Tide, Ember, and Prism at level 40. The third and outermost cosmetic
  layer, and all three can be worn together:

  | Kind | Where it sits |
  | --- | --- |
  | `avatar_frame` | rings the profile picture |
  | `decoration` | sits on top of the picture |
  | `profile_frame` | wraps the whole card |

  That is exactly why each is its own shop kind - `profiles.equipped` holds one
  slug per kind, so separate kinds are what let them stack instead of
  overwriting each other (`0053`).
- Drawn as CSS gradients rather than border images, so they stay sharp at any
  card width and add no requests. The ring sits *behind* the card rather than
  the card sitting inside a padded parent: rotating a padding box would carry
  the card around with it, whereas rotating a layer behind leaves the card
  still - the same approach the animated avatar frames already use.
- Reduced motion leaves a static frame rather than removing it, matching the
  call made for decorations.

### 👥 Friends activity feed

- `/friends` now shows a quiet feed of what your friends have been up to - high
  scores, achievements, purchases and new friendships - so the hub feels
  inhabited even when nobody is talking.
- Nothing new is recorded. `activity_events` has been filling up since `0002`
  and every profile already showed a player's own; `0052` just adds the other
  direction. It exposes nothing that was not already public either - those rows
  carry an "activity is public" policy, so the feed narrows what is readable
  rather than widening it.
- Blocks are enforced in both directions regardless. A feed that kept surfacing
  someone you blocked would be a conspicuous hole in that promise even though
  the underlying row is public.
- Keyset pagination on `(created_at, id)` rather than `OFFSET`, because the feed
  is append-heavy and an offset page two silently repeats or skips rows whenever
  something new lands between requests.
- Rendered on the server: it is read-only and nothing on it is interactive, so
  none of it needs to reach the browser as JavaScript. Unrecognised event types
  are skipped rather than rendered broken, since more will be added over time.

### 🪄 One-click Discord setup

- Admin → Discord bot → Sync → **Run full setup** registers the slash commands,
  creates the verification and level roles and the live counter channels, and
  posts both panels, in dependency order.
- It reports on **each step separately** rather than returning one success or
  failure. Discord setup fails in partial, unrelated ways - the bot can often
  create roles but not post in a channel it cannot see - so aborting at the
  first error would hide the four steps that would have worked, and "setup
  failed" sends an admin looking in the wrong place. Each row quotes what
  Discord itself said.
- Every step is idempotent, so the button doubles as a "fix whatever is still
  missing" control after granting the bot a permission it was lacking.
- Missing credentials are caught up front, so an unset token gives one clear
  message instead of six copies of "could not reach Discord".

### 💗 Monthly booster drop

- One exclusive cosmetic per calendar month for everyone boosting the Discord
  server, shown on `/collections` (`0051`). July is Booster Wings, August is the
  Bloom nameplate, September is the Comet effect. Holding one is proof you were
  boosting that month, and there is no way to get it afterwards.
- **Boost at any point in the month and it is yours.** Requiring a full month
  would mean nobody could earn the drop for the month they started boosting,
  which is exactly the month worth rewarding.
- The grant runs **daily**, not monthly. A once-a-month job gets one chance to
  fire, and a failure would silently cost a whole month of boosters their drop;
  a daily idempotent run has thirty chances and the repeats are free. It is
  scheduled after the Discord role sync, since that is what refreshes who is
  actually boosting.
- The drop is visible to non-boosters too. The point of a monthly exclusive is
  being able to see what you are missing while there is still time to get it.

### 🏆 Collections

- Five collectable sets at `/collections` - Aurora, Neon Nights, Deep Space,
  Head to Toe and Full Soundtrack. Own everything in a set and claim it for
  credits plus an exclusive badge that **cannot be bought at any price**. That
  badge is the point: it is proof you finished something, which is a different
  kind of prize from anything on the shelf.
- Progress is derived, never stored (`0050`). "Do you own these six things" is a
  join away at any moment, and a stored counter would just be a second copy of
  the truth that drifts when an item expires or a purchase is refunded.
- The claim row is the guard against double payouts: `claim_collection()`
  inserts it first and lets the primary key refuse a second attempt, rather than
  checking and then writing with a window in between. If the set turns out to be
  incomplete the claim is rolled back, so it can still be earned properly.

### 🎩 Layered avatar decorations

- Seven decorations that sit **on top of** your avatar rather than around it -
  cat ears, a halo, a crown, sparkles, flames, headphones and a personal
  thundercloud. They layer with frames, so you can wear one of each.
- A new `decoration` kind rather than more frame slugs, because
  `profiles.equipped` holds one slug per kind and that is exactly what lets the
  two stack (`0049`). No new mechanism: ownership, equipping and the staff-only
  gate all go through the existing `equip_item()` path.
- Drawn as inline SVG on a viewBox mapped to the avatar's own box, so they scale
  to any avatar size with no hard-coded pixels, no extra requests and no blurry
  upscaling - the same approach frames and profile effects already take.
- Reduced motion drops their animation but keeps the decoration. It is a
  cosmetic the player bought, not an effect; the setting exists to stop things
  moving, not to confiscate their crown.

### 🎚️ The last two level milestones

- **L20: saved looks.** A preset snapshots everything you have equipped, so
  switching your whole appearance is one tap instead of five. One slot to start
  with, five from level 20, and staff are uncapped. The limit lives in
  `preset_slot_limit()` and the UI reads it rather than hard-coding a number.
- Applying a preset re-derives the equipped map from what you **currently** own
  (`0047`). A saved slug is not proof of ownership - boosts expire, items get
  refunded, staff-only items must stay staff-only - so anything you no longer
  own is dropped rather than equipped, and the rest of the preset still applies.
  Writes go only through the RPCs; `loadout_presets` grants select and nothing
  else, so a direct insert cannot bypass the slot limit.
- **L50: Singularity.** The mythic effect was already being granted by `add_xp`
  on the way past level 50, but no renderer existed, so the reward was
  invisible. It now draws: a collapsing violet core with an accretion disc and
  matter spiralling inward. Players who passed level 50 before the grant existed
  are backfilled.

### ♿ Reduced motion

- The setting was stored, validated and switchable, but **nothing read it** - it
  had no effect at all. It now applies on the server-rendered `<html>` tag, so
  animations never play once before being switched off.
- It also drops `backdrop-filter`, stops the animated theme hues drifting, and
  skips rendering profile effects and backdrops entirely rather than hiding
  them, making it a genuine performance setting on a weaker device.

### ⚡ Performance

- **The Supabase client no longer ships in the first load.** At ~241 kB it was
  the largest dependency in the bundle, and three components pulled it into
  every route while rendering nothing until you interacted with them:
  `SessionSync` (mounted by the layout, no-ops when signed out), the navbar
  `MusicPlayer` (hidden unless you own a track) and `GiftDialog` (only queries
  once opened). All three now load it on demand. Per-route client JS fell about
  35% - the home page from 716 kB to 463 kB, and every route except `/party`
  and `/messages/[id]`, which need the realtime socket to show anything, by a
  similar margin.
- **Server reads run in parallel.** Six routes were awaiting queries in sequence
  that had no dependency on one another. The home page went from five round
  trips to one, `/u/[username]` from six to two, settings from four to two, and
  the `(main)` layout - which gates every single page - from two to one.
- **Loading states are route-shaped and no longer flicker.** Every route already
  had a fallback, but it was the home page's skeleton, so the shop, settings and
  admin all flashed the wrong layout. Nine routes now have skeletons matching
  their real content, with one shared admin skeleton covering twelve pages. New
  `Deferred` and `DeferredSpinner` primitives stay invisible for 300 ms before
  fading in, so quick loads show nothing at all instead of a flash.

## v1.4.10 - "Refined" (UI, UX and performance overhaul)

> Published as v1.4.1, which "Every Pixel" below already held. Renumbered to
> the end of the line it actually shipped at; see `/updates`.

A ground-up pass over how the site looks, feels and performs. No feature was
removed or replaced with a placeholder; everything below is the same
functionality, rebuilt on a shared foundation.

### 🎨 Design system

- **Elevation, motion and type tokens** in `styles/globals.css`: brand-tinted
  shadow scale that deepens correctly in dark mode, two shared easing curves
  (`--ease-standard`, `--ease-spring`) that every transition now uses, and
  fluid `text-display` / `text-title` sizes that scale continuously instead of
  jumping at breakpoints. `--muted-foreground` was darkened in light mode so
  body copy clears AA contrast rather than only large text.
- **New shared components**: `PageHeader` (one masthead for every top-level
  page), `EmptyState` (one "nothing here yet" surface for the whole app),
  `Spinner`, and `SkeletonRegion` for announcing loading regions.
- **Rebuilt primitives**: `Button` gained a `loading` state that keeps its width
  while working; `Card` gained `default` / `flat` / `glass` / `dashed` variants
  and an `interactive` lift; `Input`, `Textarea` and `SelectTrigger` finally
  share one appearance; `Dialog` insets itself from the viewport and scrolls, so
  a tall dialog stays usable on a short phone.
- New utilities: `hover-lift`, `bg-aurora`, `rail`, `stagger`, `defer-paint`,
  `no-scrollbar`, `tnum`, `skip-link`.

### ✨ Motion

- Micro-interactions throughout - cards lift, grids stagger in, the credit
  balance rolls when it changes, menus scale from the trigger that opened them,
  a game card's play button springs up under the pointer. All transform and
  opacity only, so it composites instead of repainting.
- Every animation is gated behind `motion-safe`, so "reduce motion" yields a
  genuinely still interface rather than a fast one.

### ⚡ Performance

- **`framer-motion` removed.** It was powering six small effects (two active-nav
  pills, a counter transition, a tap scale, an overlay entrance, a filter pill).
  All six are now CSS and behave the same.
- **`@tanstack/react-query` removed** along with `QueryProvider`. Its single
  call site was the command palette's game list, which now caches in module
  scope - the list is identical for every visitor and changes about once a
  release.
- Hero and auth backdrops swapped full-viewport `blur-3xl` elements for
  background gradients; skeleton shimmer became a transform rather than an
  animated `background-position`; below-the-fold sections use
  `content-visibility: auto`.
- Fonts use `display: swap`, the mono face no longer preloads, and
  `deviceSizes` / `imageSizes` were trimmed to the widths the layout requests.

### ♿ Accessibility & usability

- A skip link is the first tab stop on every page, `<main>` is a real focus
  target, focus rings are defined once globally and never fire on pointer
  interaction, and navigation marks the current page with `aria-current`.
- Loading skeletons are announced via `SkeletonRegion`; progress bars report
  their value; the run-complete overlay is a labelled dialog that focuses its
  primary action.
- Error pages surface the Next.js digest for support, and `global-error`
  respects the reader's colour scheme without a stylesheet.

### 📱 Responsiveness

- The favourite button no longer hides behind hover on touch devices; tab bars
  and category filters scroll instead of wrapping; every tap target clears 44px;
  text inputs are 16px on touch so iOS won't zoom the viewport on focus.
- Game grids use `auto-fill` rather than fixed column counts, fixing the
  900–1100px range where four columns were too many and three left a gap.
- Toasts sit above the mobile tab bar; the footer and `<main>` clear it too, with
  `env(safe-area-inset-bottom)` respected throughout.

## v1.4.4 - v1.4.9 - parties, the bot, and the dashboard

Playing together stops being a plan and becomes a feature, and four migrations
that were live in the database finally have code to reach them - then six days
of Discord and dashboard work on top. Six releases; each section below says
which one it belongs to.

### 🎉 Parties (v1.4.4)

- `/party` creates or joins a party by six-character code, with a live roster,
  presence, leader controls and one-tap invites from your friends list.
- One party per person, size limits, block-list checks and leadership handover
  when the leader leaves are all enforced in the database (`0044`), not in the
  UI - the tables are RLS-locked to "you can only see a party you're in" and
  every write goes through a `SECURITY DEFINER` RPC.
- Party invites arrive as notifications carrying the code, so the recipient
  still chooses whether to join.

### 🎮 Online multiplayer (v1.4.4)

- **Head-to-head**: Tic-Tac-Toe, Connect 4 and Reversi become real online
  matches on one shared board with alternating turns and a fixed seat order.
  Engines opt in through an optional `net` context - every other engine is
  untouched and behaves exactly as before.
- **Score races**: every other game becomes a race - same game, same countdown,
  live standings.
- Live match state rides a Supabase Realtime broadcast channel keyed by party
  id and is never persisted; scores still go through the ordinary
  `submit_score` path, so party play earns exactly what solo play earns.

### 📊 Status page (v1.4.4)

- A public `/status` renders `platform_status()` in one round trip: players
  online, plays today, community and economy counts, and Discord worker
  liveness. Moderation counts are staff-only.
- The gateway worker now actually reports in - it calls `bot_heartbeat()` on
  connect and every 60 seconds. Without this the status page showed the bot as
  permanently offline no matter how healthy it was (`0043` shipped the RPC, but
  nothing ever called it).

### 🔗 Vanity URLs & booster dailies (v1.4.4)

- `/u/<slug>` resolves either a username or a vanity slug, so every profile
  link, share card and metadata route works with both. Claim or clear yours in
  Settings - unlocked by boosting, by reaching level 30, or by being staff
  (`0045`).
- The fourth daily challenge is a boosters' perk: visible to everyone, but only
  boosters can claim it (`0046`).

### 🧹 Rewarded ads removed (v1.4.4)

- The simulated rewarded-ad programme is gone root and branch: the opt-in
  setting, the "watch to double your credits" overlay, the admin ads centre and
  the feature flags that gated them. `0042` rewrites `claim_daily_reward` and
  `submit_score` without their ad branches and drops the columns that stored ad
  state; boost stacking, seasonal multipliers and challenge bumps are unchanged.
- The roadmap now records this as **Dropped** rather than quietly deleting it,
  and gained a status of that name to say so honestly.

### 🧹 Admin dashboard tidy-up (v1.4.9)

- **Sidebar layout.** The nav sat above the content, so every page opened by
  pushing what you came for below the fold. It now sits beside the content on
  desktop and stays put as you scroll.
- **Every page has a heading.** Pages used to begin however their author felt
  that day - a bare paragraph, a search box, an `h2` at whatever size. The
  heading now comes from the route, so a new page gets a consistent one by
  adding an entry rather than by remembering to match ten other pages.
- **One set of shared pieces** (`features/admin/ui.tsx`): result lines, the
  Discord-ID field, and empty states. The result line existed in five separate
  copies and the ID field in two; they had already started to diverge.
- Results now read as a tinted line rather than loose coloured text, so a
  success and a failure are distinguishable at a glance.
- **Open reports surface as a banner** on the Overview rather than a number to
  notice - with a link straight to them.
- The header is calmer: the shouty red shield is gone, and there's a "View
  site" link back out.

- **Admin → Discord bot** was one page carrying roughly thirteen cards and
  several hundred form fields. It is now four tabs grouped by why you came -
  **Actions** (announce, moderation, channel tools), **Sync** (register
  commands, credential checklist, push settings), **Levelling**, and
  **Server**. Same URL, so bookmarks still work.
- Registering commands and the environment checklist moved out of the settings
  form into Sync, where they belong: they are things you do once after a
  deploy, not settings you tune.
- The admin nav was eleven equal links in one scrolling row. Now three short
  labelled groups - Community, Content, System - with Overview above them.
  Eleven items get re-scanned every visit; three groups are learned once.
- Removed the now-unused `DiscordConsole` wrapper.

### 🏷️ The bot is "Classic Games Bot" (v1.4.8)

- The site and community are the Hub; the bot that serves them is now named
  separately, on every surface it signs - embed footers, audit-log entries and
  its help card. Kept in one constant (`BOT_NAME`), and `components.ts` no
  longer carries a second copy of the brand colour and footer that would have
  drifted the moment either changed.
- Copy that refers to the *site* or the *community* is untouched: `/link` still
  links your Classic Games Hub account, and a ban DM still says you were banned
  from Classic Games Hub, because that is the server.

### 🐞 Bugs found in a sweep of the bot (v1.4.8)

- **The live feed silently swallowed the first real event.** The worker primes
  itself on its first poll to skip the backlog, but returned early when that
  poll came back empty - so on a quiet server `primed` stayed false and the
  *next* poll, carrying the first genuine high score, was discarded as backlog.
- **Purging exactly one message failed.** Discord's bulk-delete endpoint takes
  2–100; the dashboard always called it, so a purge of one never worked. The
  slash command already handled this.
- **Locking a channel wiped its other @everyone rules.** Editing a permission
  overwrite replaces it wholesale, and both the command and the dashboard wrote
  a fresh overwrite containing only the send-messages bit. Unlocking was worse:
  it wrote `deny: 0`, clearing every other deny on the channel. Both now read
  the existing overwrite and change only that one bit - and locking clears an
  explicit *allow*, which would otherwise beat the deny and leave the channel
  unlocked.
- **Long name templates were rejected outright.** Discord caps role and channel
  names at 100 characters. The refresh pass clamped; creation didn't.

### 🩹 Three dashboard settings that couldn't take effect (v1.4.8)

- **Tickets: the panel channel was dropped on every save.** `panel_channel_id`
  was missing from the tickets validation schema, and zod strips unknown keys -
  so the field never persisted and the panel could never be posted or re-posted
  from the dashboard. The Tickets card now has the field, and saving posts the
  panel there.
- **Live counters ignored the Discord-members channel entirely.** Setup looped
  over three of the four counters, so an ID linked for that one was neither
  recognised nor used. All four are handled now.
- **Counter naming is left to the refresh pass.** Setup only knew three
  template variables and hard-coded the Discord member count to zero, so
  renaming there wrote a worse name than the refresh that immediately followed
  - and burned one of Discord's two renames per ten minutes doing it. Setup now
  adopts and creates; refresh names.
- Pushing counters while **Counters enabled** is off now says so, instead of
  quietly doing nothing.
- Panels are **edited in place** rather than re-posted. Now that saving pushes
  automatically, a re-posted panel meant a trail of duplicates down the channel
  after a few edits; the live panel also updates its own wording where people
  already see it.
- The push buttons say they use your **last saved** settings, and the "no panel
  channel" messages name the field to fill in rather than telling you to run a
  slash command.

### 🔗 Linked roles and channels are used, not duplicated (v1.4.8)

- Pasting a role or channel ID into **Admin → Discord bot** now means *use this
  one*. The bot adopts it and updates it to match your settings - a milestone
  role is renamed and recoloured, a counter channel renamed to show its number.
  Previously a linked ID was adopted but never updated, so your own role kept
  whatever name and colour it already had.
- A configured ID that no longer exists is reported as **not found and left
  alone**, instead of being silently replaced by a brand-new default-named
  role or channel. That silent replacement was the confusing part: one wrong
  digit and you got a duplicate to hunt down, with nothing saying why.
- The "📊 Hub stats" category is only created when a counter channel actually
  needs creating, so linking your own channels stops leaving an empty category
  behind on every push.
- Summaries now separate **created**, **updated**, **already correct** and
  **not found**, in Discord and in the dashboard alike.

### 🎛️ Run the bot from the dashboard (v1.4.7)

- **Admin → Discord bot** gains a console: **Announce**, **Moderation** (warn,
  timeout, remove timeout, kick, ban, unban), and **Channel tools** (purge,
  slowmode, lock, unlock) - the commands that *do* something, now runnable
  without opening Discord.
- **Saving a section applies it.** It used to write to Postgres and stop, so
  the dashboard and the server disagreed until someone ran the matching
  `/setup`. The push is best-effort on purpose: settings are saved either way,
  so a Discord problem costs a retry of the push, never your edit.
- **Push settings to Discord** re-applies one section or all of them - for
  after someone edits roles by hand, or to repair the server after the bot was
  offline. Idempotent, so pressing it twice is safe.
- Both surfaces call the same functions (`lib/discord/ops.ts`), so a case
  opened on the website is numbered, DM'd and mod-logged identically to one
  opened in Discord. Moderation from the site is attributed to the staff
  member's linked Discord account, and refused without one.
- The ticket panel's channel is now recorded when it's posted, so it can be
  re-posted from the dashboard - previously that was only possible by running
  `/setup tickets` again.

### 🐛 Audit-log reasons broke every write to Discord (v1.4.6)

- **`/setup levels`, `/setup verification` and `/setup stats` could never create
  anything**, and moderation commands failed on any reason containing an emoji
  or an accent. The audit-log reason goes in an HTTP header, header values must
  be Latin-1, and the bot's own reasons contain an em dash ("Classic Games Hub
  - …"). `fetch` threw before the request was sent.
- The reason is now URL-encoded, as Discord documents it. Reads were never
  affected - they send no reason header - which is why listing roles worked
  while creating them didn't, and why `/setup modlog` (database only) was the
  one setup command that succeeded.
- `discordFetch` reports the real exception instead of a bare "network". That
  one word hid a `TypeError` thrown by `fetch` itself and turned a five-minute
  fix into a hunt for a permissions problem that never existed.

### 🔎 Discord setup diagnostics (v1.4.6)

- `/setup` now quotes **Discord's own error** for a failed create, plus the
  thing to actually change. The old summary guessed - "check my permissions and
  that my role is high enough" - for every cause alike, and the hierarchy half
  of that guess is never right for a creation: a new role starts at the bottom
  no matter who made it. Missing permissions, a bot invited without the `bot`
  scope, and a server at the 250-role cap all need different fixes and now read
  differently. The admin panel's role button reports the same detail.

- **Admin → Discord bot** now lists which Discord environment variables the
  deployment actually has (presence only, never values). An unset variable
  previously surfaced as "could not be verified" from Discord, or a generic
  failure from the register button, with no way to tell which one was missing.
- The worker accepts `DISCORD_BOT_TOKEN` as well as `DISCORD_TOKEN`. It is the
  same secret under two names, and copying the whole set across from Vercel
  otherwise exits with "missing" for a variable that looks present.
- `docs/discord-bot.md` gains a table of every variable, where to get it, and
  what breaks without it - including the one that makes Discord reject the
  interactions endpoint URL.

### 🤖 Register commands without a terminal (v1.4.5)

- **Admin → Discord bot → "Register slash commands"** does what
  `POST /api/discord/register` does, but from the dashboard - the cron route
  needs a bearer token, which suits a scheduler and not a person. Both call the
  same Discord endpoint with the same command set, and registration is a full
  replace, so repeating it is harmless.

### 📗 CLAUDE.md (v1.4.5)

- Added, so a session starting cold finds the plan (`lib/roadmap.ts`), the
  history (`lib/update-log.ts`), the rule that shipped work *moves* between
  them, where invariants belong, and that `bot/` typechecks separately.

### 📜 Update log (v1.4.5)

- New public **`/updates`** page: every release and the features it brought,
  every merged pull request, and every individual change that has reached
  production - 51 of them, back to the first commit in March.
- The roadmap now covers **only what's coming**. Shipped releases moved out of
  `lib/roadmap.ts` into `lib/update-log.ts`, so `/roadmap` is a short statement
  of intent instead of an ever-growing archive, and a release is only ever
  moved once: out of the roadmap, into the log.
- `LANDED` is generated from `git log --first-parent main`, so the landing
  history can be regenerated after a release rather than hand-maintained.
- Added `/updates` and `/status` to the sitemap; `/status` had been missing
  since it shipped.

### 🗺️ Roadmap restructure (v1.4.5)

- Everything still unbuilt across v1.2.0–v1.4.0 - eleven items that had been
  left scattered as loose ends - is gathered into a new **v1.5.0 "Collector's
  Edition"** and removed from the releases that had moved on without them.
- With those carried forward, **v1.3.0 and v1.4.0 are now fully shipped** and
  marked as such. Two partly-done items were split rather than moved wholesale:
  the level milestones that are live (L5/L10/L15/L30) stay in v1.3.0 as shipped
  with only L20 and L50 carried forward, and Turbo Horizon stays in v1.4.0 with
  only the remaining 3D titles carried forward.

### 🗃️ Migrations (v1.4.5)

- `0042`–`0046` were applied to the database but never reached the repository,
  leaving git two migrations behind the deployed schema. The SQL is recovered
  verbatim from the migration ledger; only the file header comments are new.

## v1.4.3 - "One Bot" (Discord consolidation)

The Hub's own Discord bot now covers everything Appy, Sapphire, Arcane and
ServerStats did, so the server can run on one bot instead of five.

### 🛡️ Join verification (replaces Appy)

- Verify panel with a one-press button, or a captcha mode that asks a maths
  question in a modal (the answer never leaves the server - the modal carries
  an HMAC of it).
- `/setup verification` creates the Verified/Unverified roles, posts the panel
  and stores every ID; new joiners get the Unverified role automatically.
- Optional minimum account age, verification log channel, welcome message with
  `{user}` / `{server}` / `{count}` placeholders, and `/verify` for members who
  prefer a command.

### ⚖️ Moderation, announcements & tickets (replaces Sapphire)

- New commands: `/kick` `/unban` `/untimeout` `/purge` `/slowmode` `/lock`
  `/unlock` `/warnings`, alongside the existing `/warn` `/timeout` `/ban`.
- Every action creates a numbered case (`discord_mod_cases`), optionally DMs
  the member, posts to a mod-log channel and lands in the website audit trail.
- `/announce` posts branded embeds (or plain text) with scoped role pings.
- Ticket system: panel button or `/ticket [subject]` opens a private channel,
  `/close` posts a transcript to the log channel and deletes it.
- Opt-in automod: Discord invites, links, mass mentions and message floods,
  with exempt roles/channels and delete-or-timeout actions.

### ⭐ Levels & milestone roles (replaces Arcane)

- `/level` - progress bar, rank, current and next milestone role; `/rewards`
  lists the whole ladder.
- Milestone roles at levels 1, 5, 10, 20, 30, 40, 50, 75 and 100 (editable).
  `/setup levels` creates them in Discord, and they're granted the moment
  someone levels up - stacking, or highest-only if you prefer.

### 📊 Live counters (replaces ServerStats)

- `/setup stats` creates voice channels showing live numbers, including
  **online players on the website**, refreshed every 10 minutes.
- Also available serverlessly at `/api/cron/discord-stats`.

### 🟢 Staying online

- The gateway worker now sets an explicit presence, re-asserts it every 10
  minutes, auto-reconnects, and serves `/health` on `$PORT`. Added `fly.toml`
  (always-on) and `render.yaml` (free tier + keep-alive pinger).

### 🔧 Admin

- **Admin → Discord bot** gained sections for verification, milestone roles,
  counters, tickets and moderation/automod, plus one-click "create missing
  milestone roles" and "refresh counters".
- New migration `0041`.

## v1.4.1 - "Every Pixel" (games & themes overhaul)

### 🎮 Games

- **All eight "coming soon" games are playable again** - Tic-Tac-Toe, Connect
  Four, Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and Reversi were
  rebuilt to the quality bar in v1.2.2 and are now republished (migration
  `0038`).
- **HiDPI rendering** - every canvas game now renders at device resolution
  (up to 2×), so games are pin-sharp on retina screens and in fullscreen.
- **Fullscreen, done properly** - fullscreen now takes the whole player
  (score, controls and touch pads included) onto an ambient themed backdrop
  with the game letterboxed and glowing - and it works on mobile too.
- **Device-aware controls** - the Controls tab now shows touch controls on
  touch devices and keyboard controls on desktop, with a toggle to peek at
  the other, for every game.
- **Auto-pause** - games pause themselves when the tab loses visibility.

### 🎨 Global colour themes

- **Recolour the whole site** from Settings → Preferences: Arcade Violet,
  Midnight (true black), Ocean and Emerald free for everyone; Crimson, Gold
  Rush, Neon Rose and the animated **Synthwave** and **Aurora** (their hue
  slowly drifts) reserved for Discord boosters and staff, with a lock shown on
  the swatches. The gate is enforced in the database, applied before first
  paint, and animated themes respect reduced-motion.

### ⚡ Performance

- Route-shaped loading skeletons for the games library, game pages, shop,
  leaderboards, messages and profiles.
- Preconnect to Supabase from the document head for faster first data fetch.

---

## v1.3.0 - "Living Arcade" (first wave) + v1.4.0 first titles

The long-term-engagement update, and the first step into new dimensions.

### 💰 Economy

- **Stacking boosts + effect queue** - boosts now stack their multiplier up to
  **5×** (10× for Discord boosters). Buy past the cap and the extra boost
  joins a queue that takes over automatically the moment the current window
  ends. The inventory shows the live multiplier, countdown and queue depth.
- **Booster perks** - Discord server boosters are detected automatically via
  role sync: +50% daily rewards, a higher boost cap, tenure badges at
  1/3/6/12 months, and a `__booster__` role-map key.

### 🔥 Engagement

- **Message streaks** - keep a DM conversation going every day (both sides)
  to build a streak. A flame chip in the chat header tracks it, and milestone
  days (3 · 7 · 14 · 30 · 50 · 100) pay credits to both of you.
- **Community mega-events** - admins launch server-wide co-op goals ("500
  plays this weekend") from **Admin → Events**; a live progress bar sits on
  the home page and everyone who took part is paid and notified automatically
  the moment the goal lands.
- **Background music** - four original tracks (Neon Drift, Starlight, Arcade
  Heart, Deep Focus), procedurally rendered in the browser with the Web Audio
  API - zero copyright, nothing to download. Buy them in the shop from level
  5 and play them from the new navbar player.
- **Level 50: Singularity** - a mythic, unbuyable profile effect granted
  automatically at level 50. Mythic is a new top rarity tier.

### 🕹️ New dimensions (v1.4 first titles)

- **Turbo Horizon** - an OutRun-style pseudo-3D racer: a winding, hilly neon
  highway, traffic to slip past, overtake bonuses and full touch controls.
- **Pass-and-play** - Tic-Tac-Toe gained a 2P toggle for local two-player
  matches on one device.

### 🛠️ Admin

- **Admin → Site** - the ads centre (master kill-switch + placement toggles,
  ready for a future NitroPay integration), reorder/hide any home-page
  section, and a validated, editable roadmap override that `/roadmap` renders
  live.
- New migrations `0036`–`0037`.

## v1.2.3 - "The Bot Update"

The Discord bot becomes a first-class, free-to-run part of the platform - plus
the Hub's legal foundation.

### 🤖 Discord bot 2.0 (replaces Arcane for levelling)

- **Serverless slash commands** - `/link`, `/unlink`, `/profile`, `/balance`,
  `/daily`, `/pay`, `/rank`, `/levels`, `/leaderboard`, `/sync`, `/help`,
  `/warn`, `/timeout`, `/ban` now run through Discord HTTP interactions served
  by the website on Vercel (Ed25519-verified). No hosted bot process, no
  hosting bill. *(See `docs/discord-bot.md` for setup.)*
- **Secure account linking** - link Discord from **Settings → Connections**
  via Discord OAuth, or with a one-time `/link` code minted in the server.
  Both flows prove you own the Discord account; unlink any time (with
  lock-out protection for Discord-only sign-ins).
- **Discord levels** - chat XP with configurable rates, cooldown and level
  curve (MEE6/Arcane-style defaults), anti-spam enforced in Postgres,
  `/rank` + `/levels`, level-up announcements, website notifications for
  linked players, and an optional XP trickle into your Hub level.
- **Role sync** - Hub badges, achievements, staff status, nameplates and
  levels map to Discord roles via an admin-editable role map. Synced on
  change, on server join, on `/sync`, and nightly; the website is the source
  of truth, and banned accounts lose managed roles.
- **Admin → Discord bot** - tune XP rates, curves, announcements and the role
  map from the dashboard; run a full role sync on demand.
- The old always-on bot is now an optional **companion worker** (`bot/`) that
  only covers what webhooks can't: chat-message XP, the live feed, stat
  counters and join-time sync.

### 🏛️ Platform

- **Terms of Service & Privacy Policy** - readable, UK-GDPR-aware legal pages
  (`/legal/terms`, `/legal/privacy`) that describe exactly what the platform
  actually collects, linked from the footer, sign-up and settings.
- **Level-milestone unlocks** - create groups at level 10 and post stories at
  level 15, or link Discord for instant access as before.
- **Admin analytics** - active players (1/7/30 days), plays per day, sign-ups
  per day and average session length at **Admin → Analytics** - computed from
  existing data, no new tracking.
- **Social share card** - links to the Hub now unfurl with a branded preview
  image.
- **Security hardening** - tightened `EXECUTE` grants flagged by the Supabase
  security advisor (migration `0034`).

## v1.2.2 - "Arcade & Chat Polish"

A quality pass on playing and chatting.

### 💬 Messaging

- **Send GIFs** - a Discord-style GIF picker in the composer, powered by Giphy.
  Search or browse trending GIFs and tap one to send; it renders inline as an
  image. You pick from Giphy only (no uploads or pasted image URLs), and only
  Giphy links are ever embedded. *(Requires a `GIPHY_API_KEY`; without it the
  picker simply shows no results.)*
- **Reliable sending** - messages no longer get stuck on "Sending…" until a
  refresh. A sent message resolves the instant the server confirms it, rather
  than waiting on the realtime echo.
- **Live, lightweight updates** - the thread stays live for sent and received
  messages without reloading the whole page; a cheap background sync fills in
  anything realtime misses.

### 🎮 Games

- **Six games rebuilt** - Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush
  and Reversi rebuilt as animated, mobile-first, tactile canvas games to match
  the Tic-Tac-Toe and Connect Four bar.

### 🎨 Cosmetics & shop

- **Cosmetics glow-up** - the kept nameplates, frames, effects, themes, banners,
  badges and boosts had their particles and animations reworked to a
  Discord-tier bar, all reduced-motion friendly.
- **Shop refinement** - a curated cull of overlapping cosmetics with automatic
  credit refunds.
- **Group-creation fix** - creating a group no longer errors on the invite-code
  step; groups create cleanly.

---

## v1.2.1 - "Notifications & Polish"

A small point release on top of v1.2.0.

- **Notification detail overlay** - tap any notification to see the full
  message, the exact date & time it was sent, and an **Open** button when a
  link is attached (opening marks it read).
- **Linkable announcements** - admins can attach a call-to-action link to an
  announcement, and publishing with **Notify everyone** now actually sends a
  notification (with that link) to every player. *(The toggle previously did
  nothing - this also fixes that bug.)*
- **Podium glow-up** - the global leaderboard's top three now sit on a tiered
  gold/silver/bronze podium with rank badges, a crowned #1 and nameplates.
- **Group chat menu** - copy a group's invite link again or leave the group
  from the chat header.

---

## v1.2.0 - "Identity & Connection"

The biggest social and cosmetic update yet. v1.2.0 makes your profile
unmistakably yours and turns the Hub into somewhere to hang out, not just play -
with deep customisation, a real social graph, a modern messenger, group chats,
stories, and a store & inventory that are finally a pleasure to use.

Everything here is non-pay-to-win; cosmetics are earned or bought with credits
you win by playing.

### ✨ Profiles 2.0

- **Display-name styles** - a curated set of name treatments (Gold, Neon glow,
  Fire, Ocean, Rainbow, Elegant, Mono) with a live preview in settings.
- **Nameplates & name styles everywhere** - your equipped nameplate and name
  style now render across the whole site: player search, friends, the home
  leaderboard preview and the full leaderboards, not just your profile.
- **About-me** - add pronouns and a short status line alongside your bio.
- **Featured achievement** - pin one achievement to headline your profile.
- **Trophy case** - pin up to four favourite games to a showcase on your page.
- **Discord-linked badge** - verified Discord accounts get a badge on their
  profile, and follower / following / mutual-friend counts are shown.

### 🎨 Cosmetics engine

- **New cosmetics** - five profile themes, four banners, five avatar frames and
  two new profile effects (Aurora, Fireflies), all purchasable in the shop.
- **Tiered banners** - a free solid-colour banner for everyone (presets or a
  custom colour), shop gradient/premade banners, and custom banner-image uploads
  for Discord-linked members.
- **Rarity tiers** - every cosmetic shows its rarity (common → legendary) in the
  shop and inventory.
- **Staff cosmetics** - unbuyable, staff-only flair (e.g. the Developer Aura).

### 👥 Social

- **Follow** players one-way alongside two-way friendships - and they're
  notified when you do.
- **Mutual friends** and **friends-list visibility** (private / friends /
  followers / public).
- **Private notes & nicknames** - leave a private note or nickname on anyone's
  profile that only you can see.
- **Rich presence** - set your status (online / away / do-not-disturb / sleep /
  invisible / automatic) and choose exactly who can see it.

### 💬 Messaging

- **Message reactions** - react with emoji; reactions show as grouped chips and
  sync live to the other person.
- **Emoji picker** in the composer.
- **Timestamps, date separators and delivered / seen receipts** (from v1.1.1),
  with cleaner grouped bubbles.
- **Group chats** - create a group, share an invite link
  (`/invite/<code>`), and chat with everyone; groups show member counts and
  per-message sender names. *(Creating groups is currently limited to
  Discord-linked members and staff.)*
- **Stories** - post a 24-hour text story your friends can tap through, with a
  stories strip on the Messages page. *(Posting is currently limited to
  Discord-linked members and staff.)*

### 🛍️ Store & inventory

- **Live item previews** - every shop item opens a preview page (in a new tab)
  that renders the cosmetic on a mock profile before you spend.
- **Apply from the shop** - apply items you own straight from the shop.
- **Wishlist & gifting** - wishlist items (viewable and managed from your
  inventory) and gift them to friends at **75%** of the list price.
- **Inventory overhaul** - search, type/rarity filters, sorting, clear "Applied"
  state, and a live boost timer showing the correct time remaining and
  multiplier.

### 🧭 Interface & quality of life

- **Redesigned navigation** - a proper mobile hamburger drawer with the full
  navigation and account controls, plus a roomier desktop nav.
- **Device-appropriate game controls** - on-screen touch controls for touch
  devices and keyboard hints for pointer devices, based on your actual input
  rather than screen width.
- **Flexible sign-in** - email/username + password login and signup alongside
  Discord.

### 🔧 Under the hood

- New migrations `0020`–`0028`: `discord_linked` sync, presence/visibility
  settings, Profile-2.0 fields, the `follows`/`user_notes` social graph,
  `wishlist_items` + `gift_item`, `message_reactions`, group-chat columns +
  RPCs, `stories`, a cosmetics-catalogue seed, and follow notifications.
- All new tables use least-privilege Row Level Security; all currency and
  social mutations go through `SECURITY DEFINER` RPCs.

> **Note on the Discord-linked gate:** group creation, story posting and custom
> banner uploads are gated to Discord-linked members and staff as an interim
> stand-in for "boosters" until the free-tier Discord bot lands in a later
> release. It's a one-line change per RPC to switch to a real booster check.

---

## v1.1.2 - "Open Plans"

The roadmap became a page on the site rather than a document nobody outside
the project could read: `/roadmap`, with a status on every item and the
definition of done stated in public - then restructured from a flat list of
wants into v1.2.0, v1.3.0 and v1.4.0, which is what made the next fortnight
of work legible.

## v1.1.1 - "Sharp Edges"

Bug-fix release: fixed gradient text rendering as a solid block, added
long-press flagging to Minesweeper on mobile, fixed fullscreen stretching /
resolution on games, made the admin "rewarded ads" flag remove all ads
site-wide, and added `sitemap.xml` + `robots.txt`.

## v1.1.0 - "Feature Complete"

Discord-only login and usernames, mobile-first games (touch controls,
responsive canvases, per-game tuning, safe-area/overscroll), an admin control
centre, profile customisation (nameplates, staff flair, effects), a living
economy & events system, and a performance pass.

---

## v1.0.0 - "First Cabinet"

The original site, four months before the rebuild: a static arcade of
hand-written pages with Snake and Tetris, game pages generated from one
metadata manifest, shared CSS and scripts instead of a copy per page, and a
stats dashboard kept in `localStorage` because there was nowhere else to put
it. Its commits are no longer reachable from `main` - pull requests #1-#5 are
all that is left of it.
