/**
 * The update log - everything that has actually shipped.
 *
 * The roadmap (lib/roadmap.ts) is for what is *coming*; the moment something
 * ships it moves here, so neither page has to carry both jobs.
 *
 * ## How versions are assigned
 *
 * Releases are grouped into **series** - the `v1.4` line, the `v1.5` line -
 * and every change that has ever reached production belongs to exactly one
 * release inside one series. A release is a *unit of work*, not a unit of
 * time and not a unit of commit count: three small fixes landed in one
 * afternoon are one patch release, and a single pull request that rewrites
 * the interface is a patch release on its own. Each release says why it was
 * drawn where it was in `scope`, so the grouping can be argued with rather
 * than guessed at.
 *
 * Numbers run forwards in time within a series, which is the one property
 * that makes a version number worth reading. Assigning them retrospectively
 * cost two renumberings, and both say so on their card:
 *
 *   - The interface redesign was published as v1.4.1 while a *different*
 *     release - the games and themes overhaul, eight days earlier - carried
 *     the same number in its commit message and its changelog heading. The
 *     earlier one keeps v1.4.1; the redesign became v1.4.10.
 *   - "Sanded Down" was published as v1.5.1, but two runs of Discord work
 *     landed earlier the same day carrying no version at all. They take
 *     v1.5.1 and v1.5.2; it became v1.5.3.
 *
 * Both carry `formerly`, so the old number still finds them.
 *
 * `LANDED` is generated from `git log --first-parent main` - every change
 * that reached production, whether it arrived through a pull request or as a
 * direct commit. Regenerate it after a release rather than editing by hand.
 * `UNASSIGNED` is derived from it, so a sha that reached production without
 * being versioned surfaces on the page as a question rather than as nothing.
 */

export interface UpdateItem {
  title: string;
  description: string;
  /** A plan that was announced and then abandoned. Rendered struck through. */
  dropped?: boolean;
}

export interface UpdateGroup {
  heading: string;
  /** lucide-react icon name, mapped to a component in the page. */
  icon: string;
  blurb?: string;
  items: UpdateItem[];
}

export interface UpdateRelease {
  version: string;
  codename: string;
  date: string;
  /** Set when a release was added to after its first ship date. */
  dateNote?: string;
  /** A version number this release was published under before renumbering. */
  formerly?: string;
  /** Why these changes are one release - the reasoning behind the grouping. */
  scope: string;
  summary: string;
  groups: UpdateGroup[];
  /** `LANDED` shas that make up this release, newest first. */
  commits: string[];
  /** Merged pull requests that make up this release, newest first. */
  prs?: number[];
}

/** One major/minor line, holding its `.0` and every patch after it. */
export interface ReleaseSeries {
  /** The `.0` of the line - the label the outer dropdown carries. */
  version: string;
  codename: string;
  /** Span of the whole line, e.g. "22 - 29 Jul 2026". */
  dates: string;
  summary: string;
  /** Newest first, so the dropdown opens on the most recent patch. */
  releases: UpdateRelease[];
}

/** One entry per change that landed on `main`, newest first. */
export interface LandedChange {
  sha: string;
  date: string;
  subject: string;
  /** Present when the change arrived as a merged pull request. */
  pr?: number;
}

export const REPO_URL = "https://github.com/blobbyofficial/classic-games-hub";

export const SERIES: ReleaseSeries[] = [
  // ─────────────────────────────── v1.5 ───────────────────────────────
  {
    version: "v1.5.0",
    codename: "Collector's Edition",
    dates: "2 - 16 Aug 2026",
    summary:
      "Things worth keeping, and the machinery around them: seasons and collectable sets, cosmetics that layer three deep, two new games - a Discord server that now finishes its own setup, keeps itself in step with the site, and writes down everything that happens in it - and a pass over the rough edges underneath all of it.",
    releases: [
      {
        version: "v1.5.11",
        codename: "Housekeeping",
        date: "16 Aug 2026",
        scope:
          "One release because it is one question answered: are the four platforms this site runs on actually being used, or merely paid for. Everything here came out of that audit, and none of it is a feature - it is the scaffolding that should have been there already. Splitting it into five patches would file the same afternoon's work under five headings nobody would search for.",
        summary:
          "An audit of what Supabase, Vercel, GitHub and Cloudflare were actually doing for the site, and the gaps it turned up. CI that had never run once, a scheduler living in somebody's free third-party account, thirty-three unindexed foreign keys, and every shared link on the site rendering the same picture. Nothing here changes how the arcade plays; it changes how much of it is checked, watched and shareable.",
        groups: [
          {
            heading: "Continuous integration, for the first time",
            icon: "GitBranch",
            blurb:
              "The workflow file existed. It was in `.github/`, which is not `.github/workflows/`, so GitHub had never read it.",
            items: [
              {
                title: "Lint, typecheck and build now run on every pull request",
                description:
                  "The Definition of Done has asked for all three since it was written, and until now every one of them was a manual promise made by whoever remembered. The file moved one directory and started working. The bot is a second job, because it is a separate package with its own dependencies and its own typecheck that nothing had ever run.",
              },
              {
                title: "Dependabot, grouped rather than firehosed",
                description:
                  "Both npm packages and the workflows themselves, weekly, batched into a handful of pull requests instead of one per Radix package. Security updates are their own group so they are never buried in a routine bump.",
              },
              {
                title: "CodeQL scanning, weekly as well as on push",
                description:
                  "Weekly matters more than it sounds: it means a rule published next month finds today's code, rather than waiting for someone to happen to edit the file it applies to.",
              },
              {
                title: "Releases cut from the update log",
                description:
                  "This file is the most structured record in the project and GitHub had zero releases and zero tags. A workflow now reads it and cuts a tagged release for every version that does not have one, so a version number in the changelog resolves to a diff you can click. It refuses to run against a shallow clone, because that would tag all thirty-one releases at HEAD.",
              },
            ],
          },
          {
            heading: "The schedule moved into the database",
            icon: "Clock",
            blurb:
              "`docs/cron-jobs.md` listed Supabase cron as the option that 'needs no third party', and then recommended a third party.",
            items: [
              {
                title: "pg_cron and pg_net run the four sub-daily jobs",
                description:
                  "The status probe, role sync, counter channels and the audit poller now fire from Postgres at the cadences they actually want, instead of from a free account on an external scheduler with no alerting. The objection was never that the scheduler was unreliable - it is that `status_record_checks` counts a failed check as five minutes of downtime, so a probe that quietly stops does not leave a gap in the graph, it leaves a wrong one.",
              },
              {
                title: "The token is in Vault, and its absence is loud",
                description:
                  "`CRON_SECRET` is not in the migration and never will be. Until it is set, every tick is skipped with a warning naming the fix, rather than firing unauthenticated at a route that would return 401 four times a minute forever. Rotating it is one update with no redeploy.",
              },
              {
                title: "`admin_cron_status()` answers 'is it running?'",
                description:
                  "Each job's schedule, whether it is active, when it last ran and how that run ended - plus whether the token is set, which is the first thing to check when everything is firing and nothing is happening. A schedule you cannot inspect is exactly what this replaced.",
              },
            ],
          },
          {
            heading: "Shared links became worth sharing",
            icon: "Image",
            blurb:
              "Every profile, every game and the site itself rendered one generic card - and the card had a decorative row that rendered as nothing at all.",
            items: [
              {
                title: "Profile cards",
                description:
                  "Paste a profile into Discord and you get the avatar, the name, the level, how far into it they are, four numbers and what they are best at. Profiles are what people actually send each other, so this is the share surface that was wasting the most posts.",
              },
              {
                title: "Game cards",
                description:
                  "The thumbnail in a frame that fits, next to the title, the tagline, the category, the play count and the rating. Previously the raw square thumbnail was handed to each platform to crop however it liked, with no title on it anywhere.",
              },
              {
                title: "The emoji nobody could see",
                description:
                  "The site card carried four emoji across the top. `next/og` ships no emoji font, so all four rendered as nothing and the card had a band of empty space where the decoration was meant to be. Removed - which is what it already looked like. The same card also still advertised 23 games; there are 26.",
              },
              {
                title: "A dead avatar degrades to a letter",
                description:
                  "Remote images are fetched with a three-second budget and inlined, so a deleted avatar or a slow host produces a plain card instead of a broken one. `next/og` fetching it directly would throw and take the whole image down.",
              },
            ],
          },
          {
            heading: "Indexes, policies and a policy",
            icon: "ShieldCheck",
            items: [
              {
                title: "Thirty-three foreign keys got covering indexes",
                description:
                  "Postgres does not index the referencing side for you. Without one, every join across that key is a sequential scan and - the part that bites later - deleting a single shop item has to scan the whole of `inventory_items`, `gift_tokens` and `wishlist_items` to check the constraint.",
              },
              {
                title: "Ten RLS policies stopped re-checking who you are per row",
                description:
                  "A bare `auth.uid()` in a policy is treated as volatile and evaluated once per candidate row; wrapped as `(select auth.uid())` it becomes an InitPlan evaluated once per query. Same rows out, and the gap widens with every row the table gains. It matters most on the two party policies, where it was scaling with party size.",
              },
              {
                title: "A Content-Security-Policy, in report-only",
                description:
                  "The static security headers have been right for a while; the one that actually contains an XSS was missing, on a site that renders usernames, bios, chat messages and third-party GIFs. Shipped report-only on purpose - a policy written from reading the code is a hypothesis, and the browser is the thing that knows. Promoting it to enforcing is renaming one header.",
              },
              {
                title: "Custom analytics events",
                description:
                  "Pageviews can say someone opened Snake. They cannot say how many runs get finished, what the shop converts at, or which difficulty people give up on. Five events, scalars only, nothing identifying, behind the same consent gate as everything else.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.10",
        codename: "No Host Required",
        date: "15 Aug 2026",
        scope:
          "Its own release rather than a patch onto v1.5.9, because it is a different answer to the same question. v1.5.9 built the logs; this one is about the fact that they could not be switched on, and the shape of what runs without a host is a design decision worth being able to find on its own.",
        summary:
          "The logging feature shipped in v1.5.9 lives in the gateway worker, and the worker needs an always-on host this deployment does not have. Discord's audit log is pollable over plain REST, so there is now a second way to run the logs: a cron route, any free scheduler, no hosted process - covering every structural change in the server, and honest about the four things it can never see.",
        groups: [
          {
            heading: "Logs without a host",
            icon: "ScrollText",
            blurb:
              "A feature that cannot be switched on is worth exactly as much as one that was never built.",
            items: [
              {
                title: "Discord's own audit log, polled",
                description:
                  "It needs no persistent connection, which is the entire problem with the gateway worker, and it already contains every structural change: channels created, renamed, moved, re-permissioned and deleted; roles created, recoloured, re-permissioned and deleted; members kicked, banned, unbanned, timed out, renamed and given roles; invites, webhooks, emoji, stickers, threads, server settings, and messages deleted by a moderator. Point any free scheduler at one route every five minutes - the same one already running the status probe.",
              },
              {
                title: "Named permissions, not bitfields",
                description:
                  "A role that gained Manage Server says so. Printing `1071698660929 → 1071698660961` either side of an arrow is technically the same information and answers nobody's question, which is the difference between a log and a diff of a log.",
              },
              {
                title: "It says what it cannot do",
                description:
                  "Message content, message edits, self-deleted messages, joins, leaves and voice are absent from Discord's audit log and always will be - so they are absent here, permanently, rather than being a gap that a later version quietly closes. The docs carry a comparison table rather than a claim of parity, because discovering the limit while looking for a specific deleted message is the worst possible time to find out.",
              },
              {
                title: "A cursor, and a quiet first run",
                description:
                  "The poller records where it has read to, so it never repeats an entry or skips one. Its first run records the position and posts nothing at all: switching a log on should not begin by dumping a hundred historical entries into the channel. It also ignores the bot's own actions, which are already reported by whatever performed them.",
              },
              {
                title: "Run one or the other",
                description:
                  "The worker and the poller write the same structural entries to the same channels, so running both duplicates every line. It is in the docs and in the failure-modes list, because 'every entry appears twice' is otherwise a genuinely confusing thing to debug.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.9",
        codename: "On the Record",
        date: "15 Aug 2026",
        scope:
          "One release, because it is one audit of one thing. The logging feature is the headline, but it was written after reading the bot end to end, and what that reading turned up - a cross-guild hole in the interactions endpoint, a worker that ran on every server it was in, two maps that only ever grew - belongs with it rather than in a separate 'and also some fixes' release nobody would connect to it.",
        summary:
          "The bot now writes down everything that happens in the server: messages deleted and edited, channels and roles created, renamed, moved and re-permissioned, members joining, leaving, being kicked, banned, timed out or renamed, emoji, invites, webhooks and voice. Each entry names who did it. Alongside it, the audit that produced it: a real privilege-escalation hole closed, the worker scoped to one server, and six bugs that were each quietly costing something.",
        groups: [
          {
            heading: "Server logs",
            icon: "ScrollText",
            blurb:
              "The last thing Sapphire still did better, and the one part that genuinely needs the gateway worker - none of these events are ever sent to an HTTP endpoint.",
            items: [
              {
                title: "Twenty-seven events, one channel (or five)",
                description:
                  "Messages deleted, edited and bulk-purged; channels created, renamed, moved, re-permissioned and deleted; roles created, recoloured, re-permissioned and deleted; members joining, leaving, kicked, renamed, given and stripped of roles; bans, unbans, timeouts; emoji, stickers, threads, invites, webhooks, voice movement and the server's own settings. Five categories, each routable to its own channel and all falling back to one catch-all, so the simple setup is a single channel and the loud category can be moved out later without touching anything else.",
              },
              {
                title: "Every entry names who did it",
                description:
                  "Gateway events carry no actor at all - a deleted message and a recoloured role both arrive anonymous - so each one is matched against Discord's own audit log, live where the entry arrives in time and by a fetch where it doesn't. It needs the View Audit Log permission, and when that is missing the bot says so once at startup rather than silently writing 'Unknown actor' forever and leaving somebody to work out why.",
              },
              {
                title: "Diffed to the property, not to the object",
                description:
                  "A role change reads `Colour #5865f2 → #ff0000`. A permission change lists the permissions that moved, not two bitfields that technically contain the same information and answer nobody's question. A channel update names the overwrite that changed and whose it was. 'Role updated' is a notification; this is a log.",
              },
              {
                title: "Built so it doesn't get muted",
                description:
                  "The way a log dies is a single channel carrying four hundred message edits a day next to the one role change somebody needed to find. So: every event switchable on its own, ignore lists for channels, roles and users, an ignore-bots switch, and content quoting that can be turned off outright because writing down what people said is a decision worth making deliberately. A channel deletion is logged even when that channel is ignored - hiding that is the one thing an ignore list must never do.",
              },
              {
                title: "A burst costs a handful of requests, not hundreds",
                description:
                  "Entries queue per channel and go out ten to a message on a fixed tick, which is what stops a raid or a 100-message purge rate-limiting the log into uselessness at the exact moment it matters. The queue is bounded and drops rather than growing: an out-of-memory worker loses chat XP, automod, the counters and the online dot too.",
              },
            ],
          },
          {
            heading: "A hole worth naming",
            icon: "ShieldAlert",
            items: [
              {
                title: "Any server the bot joined could moderate this one",
                description:
                  "Every command handler acts on `DISCORD_GUILD_ID` - this server - while the permission check only ever read the permissions Discord sent for the guild the command was *used* in. So anybody who could add the bot to a server they administered could run `/ban` there and have it land here, with their own server's permissions as the only gate. Adding a bot needs Manage Server in the server you're adding it to and nothing else, so 'we only invited it to one server' was never the control it appeared to be. Interactions from any other guild are now refused before they reach a handler.",
              },
              {
                title: "You can no longer ban yourself, or the bot",
                description:
                  "The dashboard has refused both since it was written. The slash commands sent them to Discord and returned a bare 'couldn't ban that member' - an error that reads like a permissions problem and reliably sends people off to check role hierarchy for a fault that was never there.",
              },
            ],
          },
          {
            heading: "The worker, read end to end",
            icon: "Bug",
            blurb: "Six things that were each costing something quietly.",
            items: [
              {
                title: "It ran on every server it was in",
                description:
                  "Chat XP, automod and the welcome message were never scoped to the configured guild, so anyone who added the bot elsewhere got Hub XP awarded against their server's chat. Every listener is now scoped, and the worker says so at startup if it isn't in the guild it was configured for.",
              },
              {
                title: "Two maps that only ever grew",
                description:
                  "The XP cooldown map kept one entry per person who has ever spoken, for the lifetime of a process meant to run for months. Automod's flood map 'bounded' itself by wiping everyone's history the moment it passed 5000 entries - including, necessarily, the person mid-flood the rule exists to catch. Both now age entries out on a timer, which bounds them without ever helping a spammer.",
              },
              {
                title: "An uncaught exception was logged and ignored",
                description:
                  "Which produced the worst outcome available: a process that passes its health check and has stopped doing its job, so the host never restarts it and nothing looks wrong. It now exits, and the host brings up a clean one.",
              },
              {
                title: "A database blip became a request storm",
                description:
                  "A failed config read wasn't cached, so the RPC was retried on every single message until Supabase came back - turning a momentary blip into sustained load at the worst possible time. The answer was never going to change inside the same second anyway.",
              },
              {
                title: "Boosting reached the site a day late",
                description:
                  "The worker never listened for member updates, and its role sync had drifted from the website's - no `__booster__` key, no call to stamp the boost onto the profile - so a new booster paid for a month and waited for the nightly reconcile before anything happened. The two implementations now do the same thing, which is the actual fix: drift between them is how someone ends up with different roles depending on which one happened to run.",
              },
              {
                title: "Automod never looked at edits",
                description:
                  "Posting something innocuous and editing an invite into it a second later walked past every rule, because a message was only ever checked once.",
              },
            ],
          },
          {
            heading: "Smaller, still wrong",
            icon: "Wrench",
            items: [
              {
                title: "Long ticket transcripts were logged as their middle",
                description:
                  "The last 3800 characters were taken and then the first 1900 of *those* were posted - so a long ticket lost the question at the start and the resolution at the end, and kept the part in between. Transcripts are chunked now, and when they still don't fit it is the end that survives, because the end of a support ticket is where the answer is.",
              },
              {
                title: "Someone else's rank card had your name on it",
                description:
                  "The fallback for an unresolved target was the invoker's name, so a lookup that failed produced a confident, wrong answer instead of an obviously incomplete one.",
              },
              {
                title: "The worker's version was blank on /status",
                description:
                  "It read `npm_package_version`, which only exists when npm started the process - and the Docker image, which is what everyone actually deploys, runs `node dist/index.js` directly. `BOT_VERSION` now covers it.",
              },
            ],
          },
        ],
        commits: ["5d23669"],
      },
      {
        version: "v1.5.8",
        codename: "Not Two Yet",
        date: "14 Aug 2026",
        scope:
          "A documentation-only release, drawn on its own because renumbering the whole forward plan is the kind of change that has to be findable later. Nothing shipped to the site; what changed is what the roadmap claims and what the Discord setup instructions tell you to do.",
        summary:
          "The plan stopped awarding itself a major version. The relaunch, Head to Head and Player Made were v2.0.0, v2.1.0 and v2.2.0 for work that has not started; they are now v1.7.0, v1.8.0 and v1.9.0, and 2.0.0 is left deliberately unclaimed. Two pieces of Discord setup guidance that were actively wrong were corrected at the same time.",
        groups: [
          {
            heading: "Renumbering",
            icon: "Tag",
            items: [
              {
                title: "The forward plan runs in one continuous line",
                description:
                  "The relaunch, Head to Head and Player Made carried v2.0.0, v2.1.0 and v2.2.0 - a major version awarded to work nobody had started. They became v1.7.0, v1.8.0 and v1.9.0, so the rebuild at v1.6.0-v1.6.3 and the three releases behind it read as one sequence rather than as a plan that crosses a boundary for no stated reason.",
              },
              {
                title: "2.0.0 is deliberately unclaimed",
                description:
                  "A planned number is not a reservation, so nothing inherits it. Whatever eventually deserves to be called 2.0.0 will take it because there is a reason to, not because a sketch written months earlier said so. The relaunch's summary used to justify its own number; it now says why it isn't 2.0.0, which is the more useful sentence.",
              },
            ],
          },
          {
            heading: "Corrections",
            icon: "Bot",
            items: [
              {
                title: "Discord setup named two migrations out of seventy",
                description:
                  "It told you to apply `0033` and `0041`. The schema was at `0071`, and publishing needs `0063` and `0068` - so following the instructions literally left a database that could not run the bot. It now says to apply everything in order and check `status_meta.schema` on /status, which is the check that would have caught it.",
              },
              {
                title: "A credential that looks wrong may only be missing",
                description:
                  "Env vars set between 3 and 13 August never reached a running build, because the redeploy they need could not happen while `vercel.json` was refusing every deployment. Written down, because the symptom - a variable that is present in the dashboard and absent at runtime - reads as a wrong value and sends you looking in the wrong place.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.7",
        codename: "Unblocked",
        date: "13 Aug 2026",
        scope:
          "One release for one fault, even though the fix is a four-line file. The size of a change and the size of what it unblocked are different measurements, and ten days in which every push silently vanished is worth its own entry in the history.",
        summary:
          "Nothing had deployed since 3 August - not because builds were failing, but because none were ever started. Vercel's Hobby plan rejects a sub-daily cron expression when the deployment is created, producing no build, no error and nothing in the dashboard. `vercel.json` is back to two daily entries and the jobs that need a tighter cadence moved to an external scheduler.",
        groups: [
          {
            heading: "Ten days of pushes that never built",
            icon: "Rocket",
            blurb:
              "The application code was fine throughout - typecheck, lint and build all passed on the stuck commit.",
            items: [
              {
                title: "No failed build to find, because there was no build",
                description:
                  "Vercel's Hobby plan caps cron jobs at two, each running at most once a day, and it rejects a sub-daily expression at the moment the deployment is *created*. So there is nothing to look at: no failed build, no error in the dashboard, no clue in the repository. Every push simply vanished, which is exactly why reconnecting the git integration - the obvious first move - changed nothing at all.",
              },
              {
                title: "The culprit was the first commit that never shipped",
                description:
                  "`de6cfc9` moved role sync from `30 4 * * *` to `*/2 * * * *`. `c0d2064` then added a `*/15` job and v1.5.6 a `*/5` one, so by the time anyone counted there were five crons, four of them sub-daily - and each of those commits was itself invisible, having never deployed.",
              },
              {
                title: "Two daily entries, and the rest moved out",
                description:
                  "`vercel.json` carries `discord-publish` at 05:00 and `booster-drops` at 06:00, both of which a daily run genuinely serves. The status probe deliberately did not stay: `status_record_checks` counts a failed check as five minutes of downtime, so a daily probe would not merely be coarse, it would report wrong uptime percentages on the page whose entire job is being right about that.",
              },
              {
                title: "docs/cron-jobs.md, and a warning in CLAUDE.md",
                description:
                  "Which job wants which cadence, which two are on Vercel and why, how to point an external scheduler at the rest, and what to move back if the plan ever changes. Repeated in CLAUDE.md because the failure is silent and the first instinct is wrong.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.6",
        codename: "Is It Just Me?",
        date: "13 Aug 2026",
        scope:
          "One release, because a status page and the API behind it are the same piece of work seen from two sides: the page is the API's first consumer, the Discord command is its second, and building either without the other would have meant writing the definition of 'is the shop up' twice and watching the two drift.",
        summary:
          "/status stopped being a list of counters and became a status page: ten services with ninety days of uptime each, incidents with timelines, a probe that opens and closes them by itself, and a Downdetector-style report button so players can say something is broken before our own checks notice. All of it is a public, keyless API, which is what /status in Discord now reads.",
        groups: [
          {
            heading: "A page that answers the question people came with",
            icon: "Activity",
            blurb:
              "The old page counted players online and plays today. Interesting, and no help at all with 'is the arcade broken'.",
            items: [
              {
                title: "Ten services, ninety days of uptime each",
                description:
                  "One bar per day per service, which is the shape you read at a glance: a single red notch in a field of green is visible from across a room in a way '99.87% uptime' never is. A day with no checks is drawn as no data and left out of the percentage - a day before we were watching did not have perfect uptime, and rounding it up would be the one lie a status page cannot tell.",
              },
              {
                title: "Incidents have a timeline, not just a state",
                description:
                  "Investigating, identified, monitoring, resolved - each update timestamped and attributed, newest first. A page showing only the current state makes people refresh it; a page showing 'identified twenty minutes ago, monitoring since ten' tells them whether to keep waiting. Scheduled maintenance gets its own section and its own words, because planned work is not an outage.",
              },
              {
                title: "The busy-ness numbers are still there",
                description:
                  "Players online, plays today, credits earned - kept, and moved below the answer. They are a different question, and a page that led with them was answering the one nobody asked.",
              },
              {
                title: "Someone else's vocabulary, on purpose",
                description:
                  "The statuses are Statuspage's - operational, degraded performance, partial outage, major outage - as is the none/minor/major/critical indicator on top. Inventing our own would have cost nothing here and everything at the edges, because the API this feeds is meant to be read by tools already written against a status page. It also settles a hundred small naming arguments by deferring to prior art.",
              },
            ],
          },
          {
            heading: "Players can say it is broken",
            icon: "Megaphone",
            blurb:
              "Downdetector's idea: one tap, counted in aggregate, compared against the site's own normal.",
            items: [
              {
                title: "A report button that needs no account",
                description:
                  "Two taps - what is going wrong, and where - and no sign-in, because the person best placed to tell us sign-in is broken is the person who cannot sign in. The problems are phrased as symptoms rather than causes, since nobody reporting one can know the cause and guessing at it makes the total useless.",
              },
              {
                title: "The half automated checks cannot do",
                description:
                  "A game that renders a blank canvas returns HTTP 200 all day long, and every probe we have will call it healthy. Forty people saying otherwise in a quarter of an hour is the only signal that catches it - which is exactly why it is worth the machinery underneath.",
              },
              {
                title: "A signal that needs a floor and a multiple",
                description:
                  "Reports are bucketed by quarter hour against a rolling baseline, and the alert needs both to fire. A multiple alone makes a quiet site hysterical - two reports against a baseline of 0.3 is a sixfold spike and means nothing - and a floor alone makes a busy site deaf. The baseline also excludes the last hour, so an outage in progress cannot raise the bar it is being measured against.",
              },
              {
                title: "Counted, never quoted",
                description:
                  "The page shows totals and a percentage breakdown of what is being reported. The free-text notes people leave are staff-only and are read in the admin console, because they are evidence for whoever is on call rather than page content.",
              },
              {
                title: "Deliberately expensive to fake",
                description:
                  "The whole value of a report count is that it is hard to poison, so the submit function is service-role only rather than reachable with the key that ships in the browser; the fingerprint that rate-limits it is derived from the request rather than chosen by the sender; and both the per-service cooldown and the hourly cap are enforced in the database. No address is stored - the fingerprint is a daily hash, so it cannot be matched across days into a way of following anyone around.",
              },
            ],
          },
          {
            heading: "Checks that run themselves",
            icon: "Radar",
            items: [
              {
                title: "Four round trips cover ten services",
                description:
                  "Every five minutes: the site's own front page, Supabase auth, Discord's gateway, and one self-check inside the database that times a representative read per area and reads the bot's heartbeat on the way past. Adding a service to the page does not add a round trip to the probe.",
              },
              {
                title: "Two failures open an incident, two successes close it",
                description:
                  "One failed check is a network blip far more often than an outage, and an incident opened for every blip trains everyone to ignore the page. Two in a row at this cadence means the fault has survived five minutes. A partial unique index guarantees at most one open automatic incident per service, so a flapping probe cannot bury the page in duplicates.",
              },
              {
                title: "Three sources of truth, and a defined winner",
                description:
                  "Probes write what they measured; an open incident carries its own claim about each service it names, because a human saying 'leaderboards are degraded' must be able to say so while the probe is still happily getting a 200; and a staff pin beats both. The pin is the only one that can make the board look better than the evidence, which is why it records who set it and why, in public.",
              },
              {
                title: "Uptime that stays cheap to draw",
                description:
                  "Each check folds into a daily rollup, so ninety bars for ten services is a ninety-row scan rather than an aggregate over a quarter of a million samples - and it is what lets the raw samples be thrown away after a fortnight without losing the history.",
              },
            ],
          },
          {
            heading: "An API, and the same answer everywhere",
            icon: "Code2",
            items: [
              {
                title: "Public, keyless, and open to anyone",
                description:
                  "Summary, components, one component, incidents, uptime and reports, all as JSON with CORS open and a short shared cache so polling it does not become load. Add format=statuspage to the summary and it comes back in the shape existing status widgets and uptime tools already understand.",
              },
              {
                title: "A badge for anywhere else",
                description:
                  "An SVG badge in shields.io's proportions, because a badge that does not sit level with the row of badges already in a README is worse than no badge.",
              },
              {
                title: "503, never an empty list",
                description:
                  "When the database cannot be read the API says so and the page says so. Answering 'no incidents' because nothing could be fetched is precisely the failure that makes a status page worthless, and it is the one thing every endpoint here is written to avoid.",
              },
              {
                title: "/status in Discord, reading the same endpoints",
                description:
                  "Public rather than ephemeral, because 'is the site down' is a question a whole channel is usually asking at once. The service option autocompletes from the live component list, so a service added to the page appears in Discord with no code change and no re-registration, and incidents, reports and versions are offered alongside the services so nobody has to know they exist.",
              },
            ],
          },
          {
            heading: "Versions, and running an incident",
            icon: "Tag",
            items: [
              {
                title: "Four versions that can disagree, shown together",
                description:
                  "The release, the deployed commit, the database schema and the bot worker's own version. Migrations are applied to Supabase separately from deploys, so the schema and the app drift apart routinely and used to do it silently - the page now compares what the database reports against what the build expects and says when they differ.",
              },
              {
                title: "One screen to run an incident from",
                description:
                  "Declare it, post updates, close it, pin a service, and read what players actually wrote - all in one place, because whoever is using it is using it while something is on fire and a flow spread across three pages is a flow nobody finishes.",
              },
              {
                title: "Closing an incident is its final update",
                description:
                  "There is no separate close button, so a resolved incident can never have a timeline that stops mid-sentence. Resolving also releases the incident's claim on the services it named, so the board goes back to whatever the checks say without anyone having to remember to unpick it.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.5",
        codename: "Under Construction",
        date: "12 Aug 2026",
        scope:
          "One release, because the two halves only make sense together: taking every game offline to normal players is indefensible without publishing what is being done to them, and publishing a rebuild plan for twenty-six games while they all still sit there marked Published would be a plan nobody believed.",
        summary:
          "Every game on the site is now marked in development - still listed, still holding its leaderboards, but playable only by staff while it is rebuilt - and the roadmap now says exactly what is wrong with each of the twenty-six and what it becomes.",
        groups: [
          {
            heading: "Every game is being rebuilt",
            icon: "Gamepad2",
            blurb:
              "A new game status meaning shipped, and being rebuilt. Not the same as coming soon, which means never released.",
            items: [
              {
                title: "All 26 games are staff-only for now",
                description:
                  "They stay listed, badged and clickable, and keep every leaderboard, rating, favourite and play count they had - nothing is reset. Only admins and moderators may record a play, so each overhaul gets played on the real site, on a real phone, before it opens to everyone. A game comes back by being set to Published from Admin → Games, one at a time, as each rebuild finishes.",
              },
              {
                title: "The lock is in the database, not the page",
                description:
                  "The trigger that already enforced booster early access now enforces both rules, so no non-staff account can record a score for an in-development game by any route. The two compose deliberately: boosting does not get you in, because early access is a head start on a release and this is not a release.",
              },
              {
                title: "Widening one word touched five places",
                description:
                  "'published' was not a label, it was a literal that the row-level security policy, submit_score, set_party_game, platform_status and the command palette all tested for. Missing any one of them would not have degraded the arcade, it would have emptied it - the security policy alone would have hidden all twenty-six games from everyone who is not staff.",
              },
            ],
          },
          {
            heading: "A plan for each of the twenty-six",
            icon: "Rocket",
            blurb:
              "Not a repair list. Every game gets a new look, animation on essentially everything, a mobile pass, and a stage that fills your screen.",
            items: [
              {
                title: "Five releases, and every game gets the same four promises",
                description:
                  "v1.6.0 'Ground Up' builds the platform and reopens nothing. Three waves then rebuild and reopen the games a category at a time, and inside them every game is its own section carrying the same four items - the look, the animation, the feel and mobile, and what it does with the whole screen. All twenty-six have all four, and the repetition is deliberate: a game receiving less than the others is visible at a glance. The relaunch closes the series, and Head to Head moves behind all of it.",
              },
              {
                title: "The platform comes first",
                description:
                  "A stage that fills your whole screen rather than a small box on a page - and rather than today's fullscreen, which deliberately letterboxes the canvas, so Snake uses about 56% of a laptop screen and Tetris about 35%. An effects library, so animation stops being something eight games happen to have and fourteen do not. Skins and arenas for every game, free, earned, bought or boosted. A mixer, so the sound slider does something. And input that does not throw your presses away.",
              },
              {
                title: "Written from measurements, not impressions",
                description:
                  "Four of the twenty-six engines respond to the difficulty picker. Three honour reduced motion. Six have a pause button that does not pause. Eighteen freeze their layout the moment they start, so they cannot be resized at all. Twenty-one hardcode their text sizes in pixels. And the sound slider in settings saves what you set and is read by nothing.",
              },
              {
                title: "Some of what reading all 26 engines turned up",
                description:
                  "Neon Runner's touch button only ever sends a jump, so ducking under its overhead obstacles is impossible on a phone. Frogger has no lily pads to fill. Space Invaders' own description promises barricades the game does not have. Connect Four advertises keyboard controls it never implemented. Gem Cascade's timer keeps draining behind the pause overlay. 2048 works out how far each tile should slide and then throws the number away, which is why nothing animates. And Snake has been reporting the length of the snake where the number of seconds played belongs, on every run ever recorded.",
              },
            ],
          },
          {
            heading: "Smaller things",
            icon: "Sparkles",
            items: [
              {
                title: "Copy that had drifted from the truth",
                description:
                  "The games page claimed there were 23 games; there are 26. The guide for adding a game never mentioned the status column at all, and now documents all five values and who each one lets in.",
              },
              {
                title: "Tidying on the way past",
                description:
                  "Removed an unused feature-flag fetch from the game page, and changing a game's status now refreshes the home page too - so reopening a game puts it back on the featured rail immediately rather than at the next deploy.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.4",
        codename: "Broadcast",
        date: "4 Aug 2026",
        scope:
          "One release: the update log gained its version tree and the Discord channels that mirror it, and neither half is much use without the other.",
        summary:
          "Every change that has ever shipped now has a version number and a place in a tree, and the log no longer lives only on the website - releases and announcements are mirrored into Discord and kept there in step, rather than typed out twice and left to drift.",
        groups: [
          {
            heading: "The update log",
            icon: "History",
            blurb: "Twenty-four releases across six lines, instead of eight releases and a long list of loose commits.",
            items: [
              {
                title: "Every change has a version",
                description:
                  "All 60 changes in production are now assigned to a release. Previously eight releases covered part of the history and the rest - the March prototype, the rebuild, the whole run of Discord work between 26 July and 3 August - sat in a flat list with no version at all.",
              },
              {
                title: "Grouped by size, not by count",
                description:
                  "Three small fixes in one afternoon are one patch; a single pull request that redesigns the interface is a patch on its own. Each release says which changes it holds and why it was drawn there, so the grouping is something you can disagree with rather than something you have to take on trust.",
              },
              {
                title: "A tree, not a list",
                description:
                  "Releases nest inside their series: open v1.4.0 to find v1.4.10 down to v1.4.0, each opening onto its own notes. The newest line and the newest release inside it are open when the page loads, so the thing you almost certainly came for needs no clicks.",
              },
              {
                title: "Two renumberings, both labelled",
                description:
                  "The interface redesign shipped as v1.4.1 while the games and themes overhaul - eight days earlier - carried the same number. \"Sanded Down\" shipped as v1.5.1 while two runs of Discord work from earlier the same day carried none. Chronology wins in both cases, so they became v1.4.10 and v1.5.3 and each says so on its card. Nothing else moved.",
              },
            ],
          },
          {
            heading: "Discord",
            icon: "Bot",
            blurb: "The website is the source of truth; Discord is a mirror of it.",
            items: [
              {
                title: "The update log, in Discord",
                description:
                  "Every release posts as its own embed in an update-log channel, oldest first, so the channel reads in the order things happened. Re-syncing edits the message that is already there rather than posting a second copy - each one is fingerprinted, so a sync with nothing to say writes nothing at all.",
              },
              {
                title: "Announcements, in both places",
                description:
                  "Publishing an announcement on the website posts it to the Discord announcements channel in the same breath, with its call-to-action link and an optional role ping. Editing one edits the Discord message; unpublishing or deleting one removes it. It is a mirror, not a one-way fire-and-forget post.",
              },
              {
                title: "Channels it can create itself",
                description:
                  "Full setup now provisions the two channels as well: readable by everyone, writable by nobody, adopted by name if the server already has them. Both are still overridable with an id from Admin → Discord bot → Publishing.",
              },
              {
                title: "Kept in step without anyone pressing anything",
                description:
                  "A cron job re-syncs both every fifteen minutes, so a message deleted by hand comes back and a release added by a deploy appears without an admin remembering. It is idempotent by fingerprint, so the usual run costs one database read.",
              },
            ],
          },
        ],
        commits: [],
      },
      {
        version: "v1.5.3",
        codename: "Sanded Down",
        formerly: "v1.5.1",
        date: "3 - 4 Aug 2026",
        scope:
          "Three commits carrying one intention - go round the site and fix what was merely wrong. Published as v1.5.1, but two runs of Discord work landed earlier the same day; numbers that run backwards in time are not worth reading, so this took the next free one and kept its old number in `formerly`.",
        summary:
          "The rough edges. No new headline features - the naming that was wrong, the date that was never right, the settings page that never grew past a list of switches, and the consent story a site collecting anything at all is expected to have.",
        groups: [
          {
            heading: "Corrections",
            icon: "SlidersHorizontal",
            blurb: "Three things that were simply wrong, in rising order of how long they had been wrong.",
            items: [
              {
                title: "Noughts and Crosses",
                description:
                  "Renamed in the game title, the party picker and the docs. The rest of the site is written in British English, so this was the odd one out from launch. The slug stays `tictactoe` - it is the join key for every score and play session and is baked into the party protocol, so renaming it would break all of that to change a string nobody sees.",
              },
              {
                title: "The \"Rebuilt for 2026\" banner is gone",
                description: "A launch flag is only useful while it is news.",
              },
              {
                title: "\"Last seen\" finally means last seen",
                description:
                  "It reported the day the account was created, for everyone, since launch - and it was never a display bug. A Supabase query builder is a lazy thenable that only sends its request inside `then()`, and the presence heartbeat was written as fire-and-forget, so it was built and thrown away without ever reaching the network. Every profile in the database had `last_seen_at` exactly equal to `created_at`, to the microsecond. Now awaited, with failures logged rather than swallowed - the silence is what let it survive this long.",
              },
            ],
          },
          {
            heading: "Settings, privacy and consent",
            icon: "SlidersHorizontal",
            items: [
              {
                title: "A Gameplay section in settings",
                description:
                  "Default difficulty, sound and music as separate sliders, high contrast, time zone and date format. Volumes save when you let go of the slider rather than on every pixel of the drag, and every row explains what it actually changes - most of them used to restate their own label.",
              },
              {
                title: "Analytics is opt-in, properly",
                description:
                  "Nothing optional loads until you allow it - not loaded and silenced, genuinely not rendered. Reject carries the same weight as Allow, there is no dismiss-without-choosing, and the banner is not modal, because refusing must not cost you anything. Global Privacy Control counts as a refusal. The stored consent record carries the policy version, so a policy that widens what is collected asks again instead of carrying an old answer over. A new /legal/cookies page generates its tables from the same constants the banner uses, so it cannot describe cookies the site does not set.",
              },
            ],
          },
          {
            heading: "Social",
            icon: "MessageSquare",
            items: [
              {
                title: "Stories you can manage",
                description:
                  "Delete your own, and post more than one. The database always allowed both - the strip had a single button that chose between viewing and composing, so the composer became unreachable the moment you had a story.",
              },
              {
                title: "Report a message",
                description:
                  "A report action on any message, and the conversation around it in the admin queue - because a given message reads as a joke or as abuse depending entirely on what surrounds it. Scoped deliberately: the lookup resolves the message from the report row rather than taking a conversation id, so staff get what they need to judge one report and cannot page through an inbox with it.",
              },
            ],
          },
          {
            heading: "Playing",
            icon: "Gamepad2",
            items: [
              {
                title: "Fullscreen that fits the screen",
                description:
                  "It used to stretch a small canvas buffer across a large display, which is what made it look soft, and reserved a hardcoded 170 pixels for the controls whatever the screen was. The buffer now tracks the element's real size, and the layout measures its own leftover space.",
              },
              {
                title: "Choose your difficulty",
                description:
                  "On Frogger, Snake, Minesweeper and Hangman, starting from your saved default. Each is tuned on its own terms rather than by one global scalar - doubling speed makes Snake harder and Whack-a-Mole easier, so only the engine knows which way \"harder\" points. Rewards scale with the choice, so easy is a comfort setting rather than the best way to farm credits.",
              },
              {
                title: "A leaderboard per difficulty",
                description:
                  "Each difficulty ranks on its own board, with tabs on the game page and the leaderboards page. Separate boards rather than one mixed list, because a ranking only means something between runs that faced the same game - sorted together, every easy run outranks every hard one and it stops being a leaderboard. Achievements, the podium badge, the friends feed and your \"best game\" all still read the regular board only: an easy run should not quietly unlock something written for a real one.",
              },
            ],
          },
        ],
        commits: ["0f5d18e", "2007b71", "560609a"],
      },
      {
        version: "v1.5.2",
        codename: "Server Export",
        date: "3 Aug 2026",
        scope:
          "One substantial change plus the roadmap edit that shipped beside it. The export is groundwork for reorganising the server, which is why it is its own release rather than part of the setup work before it.",
        summary:
          "A way to see the whole Discord server at once - and the diagnostics that answer most 'the bot is broken' reports before anyone has to ask.",
        groups: [
          {
            heading: "Seeing the server",
            icon: "Bot",
            items: [
              {
                title: "/export, and Sync → Export the server",
                description:
                  "Both produce the same JSON: every channel nested under its category in draw order, every role, every permission overwrite - with ids resolved to names and bitfields decoded, because `\"deny\": \"1024\"` on an id says nothing and `deny: [\"ViewChannel\"]` on @everyone says all of it. In Discord it arrives as a file attachment, since a modest server exports past the 2,000-character message limit and a truncated server map is worse than none.",
              },
              {
                title: "Problems, listed above the data",
                description:
                  "The export reports what cannot be seen from inside Discord: the bot's own highest role and which roles sit above it, its effective permissions, every configured id that no longer resolves, and whether the gateway worker has ever checked in.",
              },
              {
                title: "Role sync every two minutes",
                description:
                  "It was nightly, which cannot hold up a promise of the same roles and level as the website. Costs one database round trip when nobody is linked.",
              },
            ],
          },
        ],
        commits: ["9191368", "de6cfc9"],
      },
      {
        version: "v1.5.1",
        codename: "Setup, Finished",
        date: "3 Aug 2026",
        scope:
          "Three commits about the same button, including the hotfix for the one before it - one release, because shipping the fix as its own version would suggest the feature was ever usable without it.",
        summary:
          "Full setup stopped two steps short of doing anything useful. It now provisions the channels its panels live in, and there is a way to clear a dashboard that has been pointed at the wrong server.",
        groups: [
          {
            heading: "Setup",
            icon: "Sparkles",
            items: [
              {
                title: "Full setup provisions the panel channels",
                description:
                  "It created the verification and level roles and the counter channels, then reported both panels as skipped - so a fresh server finished setup holding verification roles with nothing handing them out. It now creates and posts into a verify channel, a support channel, a Tickets category and a Staff role, adopting any that already exist by name rather than duplicating them.",
              },
              {
                title: "Reset all settings",
                description:
                  "The point is the ids, not the toggles: a dashboard pointed at one server accumulates role, channel, category and panel-message ids, and a stale id is worse than an empty one because setup reads it as an instruction to use that exact channel. Deletes the rows rather than writing defaults into them, touches nothing inside Discord, and is audit-logged.",
              },
              {
                title: "The reset that safeupdate rejected",
                description:
                  "The first cut failed the first time the button was pressed - \"DELETE requires a WHERE clause\". The migration applied cleanly because DDL runs as `postgres`; the dashboard connects as `authenticator`, which preloads `safeupdate` and rejects an unqualified delete even inside a `SECURITY DEFINER` function. Qualified by the same key allowlist the other two config writers already enforce.",
              },
              {
                title: "Panels post into the channel just resolved",
                description:
                  "The panel steps re-read the config to find the channel the step before them had written. Depending on that write having landed turned one failed round trip into a panel that silently never posted - the exact failure the channel step was added to remove.",
              },
            ],
          },
        ],
        commits: ["55026b9", "5c39b29", "8c775bb"],
      },
      {
        version: "v1.5.0",
        codename: "Collector's Edition",
        date: "2 Aug 2026",
        scope:
          "Two hundred and twenty-nine files in one pull request, plus the changelog regeneration that followed it. The largest release the site has had.",
        summary:
          "Things worth keeping. Seasons and collectable sets give the long game a shape, cosmetics now layer three deep and finally include the expressive extras that have been promised since v1.2.0, and the arcade gained two games - a playable Rubik's cube, and the first title rendered with the camera inside the scene.",
        groups: [
          {
            heading: "The arcade",
            icon: "Gamepad2",
            blurb: "Two new games, and the renderer that makes a third one cheap.",
            items: [
              {
                title: "Cube",
                description:
                  "The classic 3x3 twisty puzzle. Drag a sticker in the direction you want it to travel and that layer turns, drag the background to look around, or use the standard letters on a keyboard. Scored on moves and time, so a tidy solve beats a lucky one.",
              },
              {
                title: "Labyrinth",
                description:
                  "A first-person maze in real 3D: corridors you cannot see round, walls that light properly as you turn, and a map that fills itself in only where you have actually been. Three mazes to a run, each bigger than the last.",
              },
              {
                title: "A 3D renderer, not a 3D library",
                description:
                  "Both games are drawn on the same plain 2D canvas as everything else in the arcade. Adding a 3D library would have put back more weight than every game engine here carries put together, and undone the work v1.4.1 did to make pages lighter. The renderer is shared, so the next 3D game starts from a camera rather than from trigonometry.",
              },
            ],
          },
          {
            heading: "Cosmetics & profile",
            icon: "Palette",
            blurb: "Layered, optional, and never pay-to-win.",
            items: [
              {
                title: "Decorations and profile frames",
                description:
                  "Two new layers that sit alongside the ones you already wear rather than replacing them: a decoration over your avatar, and a frame around the whole profile card. An avatar frame, a decoration, a profile frame, a nameplate and an effect can all be on at once.",
              },
              {
                title: "Entrances, cursor trails and profile music",
                description:
                  "The last of the extras promised back in v1.2.0. Your profile can arrive with an animation, leave a trail behind a visitor's cursor, and play a track you already own from the music library. The music is click-to-play, never automatic - a profile that starts making noise on its own is nobody's favourite feature.",
              },
              {
                title: "Now playing, and an optional view counter",
                description:
                  "A chip under your name shows what you are playing, or last played, worked out from your sessions rather than anything new being recorded, and it follows the online-status setting you already had. The visitor counter is off by default, counts unique people per day rather than refreshes, and never counts you.",
              },
              {
                title: "Loadout presets",
                description:
                  "Save everything you are wearing as a set and switch between them. Unlocked at level 20.",
              },
            ],
          },
          {
            heading: "Collecting",
            icon: "Gift",
            blurb: "The long game: sets to complete, seasons to climb, and perks for boosters.",
            items: [
              {
                title: "Seasons",
                description:
                  "A tier track that fills as you play, with a reward at each tier. Progress is worked out from what you have actually done rather than a stored counter, so it can never drift; the only thing recorded is whether you have taken a reward.",
              },
              {
                title: "Collections",
                description:
                  "Cosmetic sets with an exclusive badge for finishing one. Owning the set is derived from your inventory, so items arriving by any route count.",
              },
              {
                title: "Booster perks",
                description:
                  "A monthly exclusive cosmetic, a monthly token to gift any cosmetic to a friend for 30 days, and early access to new games before everyone else. Locked games stay visible with a countdown, because a perk nobody can see is a perk nobody wants.",
              },
            ],
          },
          {
            heading: "Social",
            icon: "Users",
            items: [
              {
                title: "Friends activity feed",
                description:
                  "Recent achievements, purchases and new friendships from the people you follow, in one place.",
              },
            ],
          },
          {
            heading: "Under the hood",
            icon: "Rocket",
            items: [
              {
                title: "Loading states everywhere",
                description:
                  "Ten more routes now show a skeleton of the page instead of a blank screen, and spinners wait 200ms before appearing so a fast load never flashes one.",
              },
              {
                title: "One thumbnail system",
                description:
                  "Every game card is generated from the same near-black base, grid and vignette, with a single accent hue giving each game its identity. Twenty-six cards now read as one product rather than twenty-six pieces of unrelated art.",
              },
            ],
          },
        ],
        commits: ["970ed6a", "7479a8f"],
        prs: [22],
      },
    ],
  },

  // ─────────────────────────────── v1.4 ───────────────────────────────
  {
    version: "v1.4.0",
    codename: "New Dimensions",
    dates: "22 - 29 Jul 2026",
    summary:
      "The longest line the site has had: a step into 3D and real multiplayer at one end, one bot replacing four at the other, and eight patch releases of Discord and dashboard work in between.",
    releases: [
      {
        version: "v1.4.10",
        codename: "Refined",
        formerly: "v1.4.1",
        date: "29 Jul 2026",
        scope:
          "Sixty-nine files in one pull request. Published as v1.4.1, which the games and themes overhaul eight days earlier already held - renumbered to the end of the line it actually shipped at.",
        summary:
          "A ground-up pass over how the site looks, feels and performs. One design system instead of many near-copies, motion that stays out of the way, and a lighter page on every device - the whole animation runtime and the query cache left the bundle entirely.",
        groups: [
          {
            heading: "Design system",
            icon: "Palette",
            blurb:
              "The parts every page is built from, fixed once so eight screens stop drifting into eight slightly different looks.",
            items: [
              {
                title: "Elevation, motion and type tokens",
                description:
                  "Shadows are now brand-tinted tokens that deepen properly in dark mode, headings scale fluidly instead of jumping at breakpoints, and every transition uses one of two shared easing curves. Body text meets AA contrast in both themes.",
              },
              {
                title: "One page header, one empty state",
                description:
                  "Every top-level page opens with the same masthead, and every 'nothing here yet' surface - no friends, no messages, an empty inventory, no search results - uses the same component, with a real explanation and a way forward rather than a bare sentence.",
              },
              {
                title: "Rebuilt primitives",
                description:
                  "Buttons gained a proper loading state that doesn't resize mid-click, cards gained surface variants, inputs and selects finally match each other, and dialogs stay inside a short phone screen instead of overflowing off it.",
              },
            ],
          },
          {
            heading: "Motion & interaction",
            icon: "Sparkles",
            blurb: "Enough to feel alive, little enough to stay out of the way.",
            items: [
              {
                title: "Micro-interactions throughout",
                description:
                  "Cards lift on hover, grids stagger in, the credit balance rolls when it changes, menus scale from the button that opened them, and the play button on a game card springs up under the pointer. All of it is transform and opacity only, so it runs on the compositor.",
              },
              {
                title: "Reduced motion is a real mode",
                description:
                  "Every animation is gated behind a motion-safe check rather than merely shortened, so choosing 'reduce motion' gives a genuinely still interface instead of a fast one.",
              },
            ],
          },
          {
            heading: "Performance",
            icon: "Rocket",
            blurb: "Fewer bytes to download, fewer pixels to repaint.",
            items: [
              {
                title: "Two dependencies removed",
                description:
                  "The animation library was doing six small jobs that CSS does natively, and the query cache existed for a single call in the command palette. Both are gone; the palette now caches the game list in module scope, and every animation they powered still works.",
              },
              {
                title: "Cheaper painting",
                description:
                  "Hero and auth backdrops swapped full-viewport blur filters for background gradients, skeleton shimmer became a transform instead of an animated gradient position, and below-the-fold sections skip layout and paint until they approach the viewport.",
              },
              {
                title: "Faster first paint",
                description:
                  "Fonts swap in rather than blocking, the mono face no longer preloads, and the image size ladder was trimmed to the widths the layout actually requests.",
              },
            ],
          },
          {
            heading: "Accessibility & responsiveness",
            icon: "Users",
            items: [
              {
                title: "Keyboard and screen-reader fixes",
                description:
                  "A skip link opens every page, focus rings are consistent everywhere and never fire on a mouse click, navigation marks the current page, loading skeletons announce themselves, and progress bars report their value.",
              },
              {
                title: "Built for touch first",
                description:
                  "The favourite button no longer hides behind a hover state on phones, tab bars and filter rows scroll instead of wrapping, every tap target clears 44px, text inputs stay at 16px so iOS won't zoom, and toasts sit above the mobile tab bar.",
              },
              {
                title: "Grids that fit every width",
                description:
                  "Game grids fill available space rather than snapping between fixed column counts, which fixes the awkward tablet range where four columns were too many and three left a gap.",
              },
            ],
          },
        ],
        commits: ["0785bc3"],
        prs: [20],
      },
      {
        version: "v1.4.9",
        codename: "The Dashboard, Tidied",
        date: "28 - 29 Jul 2026",
        dateNote: "two pull requests, a day apart",
        scope:
          "Two pull requests doing the same job from opposite ends - one grouped the Discord page into tabs, the other rebuilt the shell around every admin page. Six hundred lines together, and neither reads as a release on its own.",
        summary:
          "The admin dashboard stopped being eleven equal links above a page and became a sidebar, three groups and one set of shared pieces.",
        groups: [
          {
            heading: "Admin dashboard",
            icon: "LayoutDashboard",
            items: [
              {
                title: "A sidebar instead of a nav bar",
                description:
                  "The nav sat above the content, so every page opened by pushing what you came for below the fold. It now sits beside the content on desktop and stays put as you scroll.",
              },
              {
                title: "Every page has a heading",
                description:
                  "Pages used to begin however their author felt that day - a bare paragraph, a search box, a heading at whatever size. The heading now comes from the route, so a new page gets a consistent one by adding an entry rather than by remembering to match ten other pages.",
              },
              {
                title: "One set of shared pieces",
                description:
                  "Result lines, the Discord-ID field and empty states, in one file. The result line existed in five separate copies and the ID field in two; they had already started to diverge.",
              },
              {
                title: "Four tabs on the Discord page",
                description:
                  "One page carrying thirteen cards and several hundred form fields became Actions, Sync, Levelling and Server - grouped by why you came, not by which part of Discord the setting touches. Same URL, so bookmarks still work.",
              },
              {
                title: "Three nav groups instead of eleven links",
                description:
                  "Community, Content and System, with Overview above them. Eleven items get re-scanned every visit; three groups are learned once. Open reports now surface as a banner rather than a number to notice.",
              },
            ],
          },
        ],
        commits: ["f91cbea", "2479a5e"],
        prs: [21, 19],
      },
      {
        version: "v1.4.8",
        codename: "Settings That Take Effect",
        date: "28 Jul 2026",
        scope:
          "Three fix-shaped pull requests inside ninety minutes, four hundred lines between them. Each is a paragraph; together they are a release.",
        summary:
          "Settings that saved but never applied, linked roles that were duplicated rather than used, and a bot that was still called something else in half its own strings.",
        groups: [
          {
            heading: "Fixes",
            icon: "SlidersHorizontal",
            items: [
              {
                title: "Linked roles and channels are used, not replaced",
                description:
                  "Pointing a setting at an existing role or channel created a second one beside it. A configured id is now an instruction to use that exact one - renamed or recoloured to match if need be - and an id pointing at something since deleted is reported as missing rather than silently replaced.",
              },
              {
                title: "Three dashboard settings that could never take effect",
                description:
                  "Fields that were dropped on save, so the value could not survive a reload - including the ticket panel channel, which meant re-posting the panel was impossible.",
              },
              {
                title: "The bot is Classic Games Bot",
                description:
                  "One name, defined once, rather than a dozen string literals drifting apart - plus four bugs found in the sweep that renaming it required.",
              },
            ],
          },
        ],
        commits: ["3221adc", "3ce4e03", "a13d56c"],
        prs: [18, 17, 16],
      },
      {
        version: "v1.4.7",
        codename: "Run It From the Dashboard",
        date: "28 Jul 2026",
        scope:
          "One pull request, a thousand lines, and a structural change: every Discord operation moved out of the slash-command handlers into functions both surfaces call.",
        summary:
          "The dashboard could only store settings - the Discord side of a change happened when someone ran the matching slash command, and until then the panel and the server disagreed.",
        groups: [
          {
            heading: "The dashboard does the work",
            icon: "LayoutDashboard",
            items: [
              {
                title: "Every operation, from the website",
                description:
                  "Announce, moderate, purge, slowmode and lock all call the same functions the slash commands call, so a case raised from the dashboard is numbered, DM'd and logged exactly like one raised in Discord. There is no second implementation to drift.",
              },
              {
                title: "Saving applies",
                description:
                  "A save writes to Postgres and then pushes the section to Discord, and the result says what actually changed there. The push is best-effort: a Discord outage is reported as a warning against a successful save, never as a failure that leaves you wondering whether to retype everything.",
              },
            ],
          },
        ],
        commits: ["d3986d0"],
        prs: [15],
      },
      {
        version: "v1.4.6",
        codename: "Failures That Name Themselves",
        date: "28 Jul 2026",
        scope:
          "Three small fixes in one afternoon, all about the same thing: a Discord call failing without saying why. Two hundred and thirty lines between them - one release, not three.",
        summary:
          "Setup failures stopped being opaque. Every one of these was costing a round trip of debugging a permissions problem that was never there.",
        groups: [
          {
            heading: "Diagnostics",
            icon: "Bot",
            items: [
              {
                title: "Missing credentials are named",
                description:
                  "A checklist of which Discord environment variables are actually set, instead of a setup that fails opaquely when one of four is absent.",
              },
              {
                title: "Discord's own error, reported",
                description:
                  "When `/setup` cannot create something, the reply is Discord's own message and status code. Any guess we could make about the cause is worse than the answer Discord already sent.",
              },
              {
                title: "The audit-log reason that broke every write",
                description:
                  "HTTP header values must be Latin-1, and the audit reason contained an em dash - so `fetch` threw before the request was ever sent, which surfaced as a network error. The header is now URL-encoded, which is how Discord documents it.",
              },
            ],
          },
        ],
        commits: ["1c16784", "1da5a10", "13ceba6"],
        prs: [14, 13, 12],
      },
      {
        version: "v1.4.5",
        codename: "The Update Log",
        date: "28 Jul 2026",
        scope:
          "One pull request that split the roadmap in two and gave the shipped half its own page - the release this very page came from.",
        summary:
          "The roadmap had grown into an archive. Everything shipped moved to /updates, the roadmap became forward-only, and registering slash commands stopped needing a terminal.",
        groups: [
          {
            heading: "Documentation as a page",
            icon: "History",
            items: [
              {
                title: "An update log at /updates",
                description:
                  "Past releases, merged pull requests and every change that has landed on `main`, generated from git rather than maintained by hand.",
              },
              {
                title: "A forward-only roadmap",
                description:
                  "The roadmap now carries what is coming and nothing else. When something ships it moves out rather than being marked shipped and left in place - which is how it became an archive the first time.",
              },
              {
                title: "Register commands without a terminal",
                description:
                  "A button in the dashboard, or one authenticated POST. Registration is a full replace, so it is safe to repeat.",
              },
            ],
          },
        ],
        commits: ["88a3df3"],
        prs: [11],
      },
      {
        version: "v1.4.4",
        codename: "Parties",
        date: "28 Jul 2026",
        scope:
          "Forty-five files in one pull request. This is where multiplayer and parties actually shipped - v1.4.0 promised them, and carried an 'extended' note for a week to cover the gap.",
        summary:
          "Play with other people: across accounts online, or on one device in the same room - plus a status page, vanity URLs, and the heartbeat that makes the bot's Online light mean something.",
        groups: [
          {
            heading: "Multiplayer & parties",
            icon: "Gamepad2",
            blurb: "Play with other people - across accounts online, or on one device in the same room.",
            items: [
              {
                title: "Real multiplayer games",
                description:
                  "Games multiple people can play together, online across accounts. Tic-Tac-Toe, Connect 4 and Reversi are true head-to-head matches on one shared board with alternating turns; every other game becomes a score race - same game, same moment, live standings. Local pass-and-play remains in Tic-Tac-Toe via the 2P toggle.",
              },
              {
                title: "Parties",
                description:
                  "Group up into a party to jump into multiplayer games together. Create one, share a six-character code or invite friends straight from your friends list, and the leader picks the game and starts it for everyone at once.",
              },
            ],
          },
          {
            heading: "Elsewhere",
            icon: "LayoutDashboard",
            items: [
              {
                title: "Customisable home screen",
                description:
                  "Rearrange the homepage straight from the admin dashboard - reorder or hide any section from Admin → Site, no code required.",
              },
              {
                title: "A status page",
                description:
                  "One page saying whether the site, the database and the bot are up - including the gateway worker's heartbeat, which until now had nothing writing it.",
              },
              {
                title: "Vanity URLs and booster dailies",
                description:
                  "Claim a custom profile link, and an extra daily challenge for boosters that everyone can see but only boosters can claim.",
              },
            ],
          },
        ],
        commits: ["f5da50b"],
        prs: [10],
      },
      {
        version: "v1.4.3",
        codename: "One Bot",
        date: "27 Jul 2026",
        scope:
          "Thirty-three files and five thousand lines replacing four separate bots. Nothing else went near it, and nothing else belongs with it.",
        summary:
          "One bot doing what Appy, Sapphire, Arcane and ServerStats were doing between them - and running for free, because the commands are served by the website itself.",
        groups: [
          {
            heading: "Four bots become one",
            icon: "Bot",
            items: [
              {
                title: "Join verification (replaces Appy)",
                description:
                  "A button panel, a verified role, a minimum account age and an optional welcome message or DM - with the log of who got in and when.",
              },
              {
                title: "Moderation, announcements and tickets (replaces Sapphire)",
                description:
                  "Numbered cases with DMs and a mod-log channel, an announcement command with scoped role pings, automod for invites, links, mentions and spam, and a ticket system with its own category and staff role.",
              },
              {
                title: "Levels and milestone roles (replaces Arcane)",
                description:
                  "Chat XP with configurable rates, cooldowns and curve, milestone roles handed out as people climb, and level-up announcements.",
              },
              {
                title: "Live counters (replaces ServerStats)",
                description:
                  "Voice-channel counters for players online, total members, plays today and Discord members, from templates you can edit.",
              },
              {
                title: "Staying online",
                description:
                  "An optional always-on gateway worker for chat XP, automod, join handling and the live feed - and the heartbeat that lets the site say whether it is actually running.",
              },
            ],
          },
        ],
        commits: ["36848c8"],
        prs: [9],
      },
      {
        version: "v1.4.2",
        codename: "Housekeeping",
        date: "26 - 27 Jul 2026",
        scope:
          "Three unrelated small commits across two quiet days between feature releases. None is worth a version on its own; leaving them unversioned was the thing worth fixing.",
        summary:
          "Two fixes worth having and one chore: a boost that was being thrown away, and five RPCs reachable by more roles than intended.",
        groups: [
          {
            heading: "Fixes",
            icon: "SlidersHorizontal",
            items: [
              {
                title: "Queued boosts are no longer lost",
                description:
                  "Buying a boost beyond the stack cap puts it in a queue to take over when the current one expires. The queue was not being drained, so the boost was simply gone. Fixed in the database, where the rule belongs - and the duplicated auth round-trips around it were removed while the code was open.",
              },
              {
                title: "Revoked from PUBLIC, not just anon",
                description:
                  "Five RPCs meant for signed-in players were revoked from `anon` but not from `PUBLIC`, which grants to every role including `anon`. Revoking from `anon` alone does nothing while the `PUBLIC` grant stands.",
              },
            ],
          },
        ],
        commits: ["4488be0", "bb4b7cf", "7e8bfdc"],
      },
      {
        version: "v1.4.1",
        codename: "Every Pixel",
        date: "22 Jul 2026",
        scope:
          "Nineteen files in one commit, all about how games look and feel on the device you are actually holding. Its commit message and changelog heading both said v1.4.1, and it keeps the number by right of arriving first.",
        summary:
          "Every canvas game re-rendered at device resolution, fullscreen that takes the whole player rather than the page, and a colour theme for the entire site.",
        groups: [
          {
            heading: "Games",
            icon: "Gamepad2",
            items: [
              {
                title: "Eight games playable again",
                description:
                  "Tic-Tac-Toe, Connect Four, Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and Reversi were rebuilt to the quality bar in v1.2.2 and are now republished.",
              },
              {
                title: "HiDPI rendering and proper fullscreen",
                description:
                  "Every canvas renders at device resolution up to 2×, so games are pin-sharp on retina screens. Fullscreen takes the whole player - score, controls and touch pads - onto an ambient themed backdrop with the game letterboxed, and it works on mobile.",
              },
              {
                title: "Device-aware controls, and auto-pause",
                description:
                  "The Controls tab shows touch controls on touch devices and keyboard controls on desktop, with a toggle to peek at the other. Games pause themselves when the tab loses visibility.",
              },
            ],
          },
          {
            heading: "Global colour themes",
            icon: "Palette",
            items: [
              {
                title: "Recolour the whole site",
                description:
                  "Arcade Violet, Midnight, Ocean and Emerald free for everyone; Crimson, Gold Rush, Neon Rose and the animated Synthwave and Aurora reserved for boosters and staff, with a lock shown on the swatches. The gate is enforced in the database, applied before first paint, and the animated ones respect reduced motion.",
              },
            ],
          },
          {
            heading: "Performance",
            icon: "Rocket",
            items: [
              {
                title: "Route-shaped loading skeletons",
                description:
                  "The games library, game pages, shop, leaderboards, messages and profiles now show the shape of the page while it loads, and the document preconnects to Supabase for a faster first fetch.",
              },
            ],
          },
        ],
        commits: ["d0c55c9"],
      },
      {
        version: "v1.4.0",
        codename: "New Dimensions",
        date: "22 Jul 2026",
        scope:
          "One commit: the first 3D title and the engine behind it. The parties and multiplayer this release originally promised shipped six days later and are recorded at v1.4.4, where they belong.",
        summary: "The step out of two dimensions - a pseudo-3D racer running smoothly on a phone.",
        groups: [
          {
            heading: "3D games",
            icon: "Box",
            blurb: "Beyond the 2D arcade - fully playable 3D games in the browser.",
            items: [
              {
                title: "Turbo Horizon",
                description:
                  "An OutRun-style pseudo-3D racer: a projected road, hills and curves that read correctly at speed, and traffic to weave through - drawn on the same 2D canvas as everything else in the arcade.",
              },
              {
                title: "Pass-and-play",
                description:
                  "Two players on one device, taking turns on the same board - the simplest multiplayer there is, and the one that needs no network code at all.",
              },
            ],
          },
        ],
        commits: ["fc67f53"],
      },
    ],
  },

  // ─────────────────────────────── v1.3 ───────────────────────────────
  {
    version: "v1.3.0",
    codename: "Living Arcade",
    dates: "22 Jul 2026",
    summary:
      "One release, and a deliberately short line: the loops meant to hold someone for a year rather than a fortnight.",
    releases: [
      {
        version: "v1.3.0",
        codename: "Living Arcade",
        date: "22 Jul 2026",
        scope:
          "Twenty-four files, two thousand lines, one commit. Every part of it serves the same goal, so splitting it would have made five releases that each explain a fifth of an idea.",
        summary:
          "Turn the hub into somewhere players return to for years, not weeks: original music, stacking events, long-term streaks, deep booster and level rewards, and a proper analytics control centre.",
        groups: [
          {
            heading: "Long-term engagement",
            icon: "Repeat",
            blurb: "Daily streaks alone won't hold someone for a year - these loops are designed to.",
            items: [
              {
                title: "Community mega-events",
                description:
                  "Server-wide co-op goals where everyone pulls in the same direction - e.g. 'play 500 games together this weekend' - with a live progress bar and an achievement plus bonus credits for everyone who took part.",
              },
              {
                title: "Level-milestone unlocks",
                description:
                  "Hitting a level milestone unlocks a real feature, giving levelling a point beyond a number: L5 background music · L10 create groups · L15 stories · L30 a vanity profile URL. Two further milestones are planned for v1.5.0.",
              },
              {
                title: "Message streaks",
                description:
                  "A Snapchat-style daily streak, but with messages instead of images - keep a conversation going day after day with a friend to build a streak and earn rewards, giving people a reason to check in on each other.",
              },
            ],
          },
          {
            heading: "Booster rewards",
            icon: "Heart",
            blurb:
              "Boosters keep the community's home running - the perks should feel genuinely worth it, while never becoming pay-to-win.",
            items: [
              {
                title: "Bonus daily challenges",
                description:
                  "An extra daily challenge on top of everyone else's - more ways to earn, every day. Everyone can see it, so the perk is visible, but only boosters can claim it.",
              },
              {
                title: "Boost-tenure badge tiers",
                description:
                  "The Booster badge evolves the longer you've boosted (1 month → 3 → 6 → 12), with a visibly fancier treatment at each tier to recognise loyalty.",
              },
              {
                title: "Bigger daily & streak bonuses",
                description: "A larger daily reward and a faster-growing streak multiplier while your boost is active.",
              },
              {
                title: "Vanity profile URL",
                description:
                  "Claim a custom profile link (e.g. /u/yourname). Unlocked by boosting, by reaching level 30, or by being staff - claim or change it from Settings.",
              },
            ],
          },
          {
            heading: "Rewards & economy",
            icon: "Gift",
            items: [
              {
                title: "Background music tracks",
                description:
                  "Level 5+ players can buy original 'tracks' from the shop and play them in the background while they browse and play. Every track is composed in-house, so there are zero copyright concerns - and boosters can set one as their profile theme song.",
              },
              {
                title: "Stacking boosts + effect queue",
                description:
                  "Credit boosts stack up to 5× (10× for Discord boosters). Buy another beyond the cap and it doesn't go to waste - it joins an effect queue and automatically takes over the moment the current boost runs out, so your boosts are always working.",
              },
            ],
          },
          {
            heading: "Analytics & admin",
            icon: "BarChart3",
            items: [
              {
                title: "Admin analytics centre",
                description:
                  "A dedicated admin section for analytics - site clicks, popular games, active players and retention - plus control over which surfaces appear across the site, without touching code.",
              },
              {
                title: "Editable roadmap from admin",
                description:
                  "Manage this very roadmap from the admin dashboard - add, edit and reorder releases and items without touching code, so plans stay fresh with a few clicks.",
              },
              {
                title: "Rewarded ads & NitroPay",
                description:
                  "The plan to run ads - the simulated 'watch to double your credits' flow and a NitroPay integration - has been dropped. It complicated the reward maths and there was never a network behind it, so the whole programme was removed rather than left half-built. Credits now come from playing, streaks and boosts alone.",
                dropped: true,
              },
            ],
          },
        ],
        commits: ["389595f"],
      },
    ],
  },

  // ─────────────────────────────── v1.2 ───────────────────────────────
  {
    version: "v1.2.0",
    codename: "Identity & Connection",
    dates: "21 - 22 Jul 2026",
    summary:
      "The line that gave the site a personality: profiles worth looking at, a messenger worth using, an arcade rebuilt to a quality bar, and the first version of the Discord bot.",
    releases: [
      {
        version: "v1.2.3",
        codename: "The Bot Update",
        date: "22 Jul 2026",
        scope:
          "Four commits on one day, all platform-level: the bot, the legal pages, the share image and the analytics that arrived with them.",
        summary:
          "The Discord bot becomes a first-class citizen - rebuilt serverlessly so it runs for free, with secure account linking, an Arcane-replacing level system, automatic role sync, and a proper legal foundation for the whole platform.",
        groups: [
          {
            heading: "Discord bot 2.0",
            icon: "Bot",
            blurb: "One bot, wired straight into your Hub account - no paid hosting anywhere.",
            items: [
              {
                title: "Serverless slash commands",
                description:
                  "All commands (/link, /rank, /levels, /daily, /pay, /profile, /leaderboard, /sync, moderation) now run through Discord HTTP interactions served by the website itself - signature-verified, free, and always on.",
              },
              {
                title: "Secure account linking",
                description:
                  "Link Discord from Settings → Connections via Discord OAuth, or with a one-time /link code minted in the server. Both paths prove you own the Discord account; unlink any time.",
              },
              {
                title: "Discord levels (goodbye Arcane)",
                description:
                  "Chat XP with configurable rates, cooldowns and level curve - anti-spam enforced in the database. /rank and /levels leaderboards, level-up announcements, website notifications, and an optional XP trickle into your Hub level.",
              },
              {
                title: "Role sync",
                description:
                  "Hub badges, achievements, staff status, nameplates and levels map to Discord roles. Synced on change, on join, on /sync and nightly - the website is always the source of truth.",
              },
              {
                title: "Admin bot controls",
                description:
                  "A new Admin → Discord bot page to tune XP rates, curves, announcements and the role map without touching code.",
              },
            ],
          },
          {
            heading: "Platform",
            icon: "Sparkles",
            items: [
              {
                title: "Level-milestone unlocks",
                description:
                  "Levelling now unlocks real features: create groups at level 10 and post stories at level 15 - or link Discord for instant access, as before.",
              },
              {
                title: "Admin analytics",
                description:
                  "A new Admin → Analytics page: daily/weekly/monthly active players, plays per day, sign-ups per day and average session length - computed from existing data, no extra tracking.",
              },
              {
                title: "Terms of Service & Privacy Policy",
                description:
                  "Proper, readable legal pages written for UK GDPR and linked from the footer, sign-up and settings - describing exactly what the platform actually collects.",
              },
              {
                title: "Social share card",
                description: "Links to the Hub now unfurl with a proper branded preview image.",
              },
            ],
          },
        ],
        commits: ["d240a91", "9b72ea1", "fcf723d", "c36ed76"],
      },
      {
        version: "v1.2.2",
        codename: "Arcade & Chat Polish",
        date: "21 Jul 2026",
        scope:
          "Nine commits over one long day, all of them the same quality pass held to the bar Tic-Tac-Toe set in the first of them.",
        summary:
          "A quality pass on the two things people do most - play and chat. Six more games rebuilt to a modern, tactile bar; the kept cosmetics given a Discord-tier animation glow-up; and messaging made genuinely reliable, now with GIFs.",
        groups: [
          {
            heading: "Messaging",
            icon: "MessageSquare",
            blurb: "Chat should feel instant and alive - and a little more fun.",
            items: [
              {
                title: "Send GIFs",
                description:
                  "A Discord-style GIF picker in the composer, powered by Giphy: search or browse trending GIFs and tap one to send. It arrives as a message that renders inline as an image. You pick from Giphy only - no uploading or pasting your own image URLs - so it stays clean and safe.",
              },
              {
                title: "Reliable sending",
                description:
                  "Messages no longer get stuck on 'Sending…' until you refresh. A sent message now resolves the instant the server confirms it, independent of the realtime echo.",
              },
              {
                title: "Live, lightweight updates",
                description:
                  "The thread stays live for both sent and received messages without ever reloading the whole page - a cheap background sync fills in anything realtime misses, so you see new messages within seconds.",
              },
            ],
          },
          {
            heading: "Games",
            icon: "Gamepad2",
            blurb: "Every game held to the standard set by Tic-Tac-Toe and Connect Four.",
            items: [
              {
                title: "Six games rebuilt",
                description:
                  "Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and Reversi rebuilt from scratch as animated, mobile-first, tactile canvas games - glowing feedback, satisfying motion and smarter opponents where it counts.",
              },
            ],
          },
          {
            heading: "Cosmetics & shop",
            icon: "Sparkles",
            items: [
              {
                title: "Cosmetics glow-up",
                description:
                  "The kept nameplates, frames, effects, themes, banners, badges and boosts had their particles and animations reworked to a Discord-tier bar - flowing gradients, travelling sheens, rotating rims and layered particle systems, all reduced-motion friendly.",
              },
              {
                title: "Shop refinement",
                description:
                  "A curated cull of overlapping cosmetics with automatic credit refunds, and the group-creation bug fixed so groups always create cleanly.",
              },
            ],
          },
        ],
        commits: [
          "43fef05",
          "90c5192",
          "2b4d810",
          "d514f0b",
          "f72cb90",
          "b4e9788",
          "1767a9c",
          "778eede",
          "63e5495",
        ],
      },
      {
        version: "v1.2.1",
        codename: "Notifications & Polish",
        date: "21 Jul 2026",
        scope:
          "Five small commits the same day v1.2.0 shipped - the corrections you only find once a release is in front of people.",
        summary:
          "A small polish release on top of v1.2.0: richer notifications, linkable announcements, a redesigned podium and a handful of quality-of-life fixes.",
        groups: [
          {
            heading: "Notifications & announcements",
            icon: "Megaphone",
            items: [
              {
                title: "Notification detail overlay",
                description:
                  "Tap any notification to open it in full - the complete message, the exact date and time it was sent, and an Open button when a link is attached. Opening marks it read.",
              },
              {
                title: "Linkable announcements",
                description:
                  "Admins can attach a call-to-action link to an announcement, and publishing with 'Notify everyone' now actually sends a notification (with that link) to every player - the toggle previously did nothing.",
              },
            ],
          },
          {
            heading: "Polish",
            icon: "Sparkles",
            items: [
              {
                title: "Podium glow-up",
                description:
                  "The global leaderboard's top three now sit on a proper tiered gold/silver/bronze podium with rank badges, a crowned #1 and equipped nameplates.",
              },
              {
                title: "Group chat menu",
                description:
                  "Group conversations gained a header menu to copy the invite link again or leave the group.",
              },
              {
                title: "Wishlist gifting from a profile",
                description:
                  "Gift straight from someone's wishlist, and the weakest games were pulled back to 'coming soon' rather than left on the shelf in the state they were in.",
              },
            ],
          },
        ],
        commits: ["97223b9", "4ea3e49", "a74459c", "1861209", "2da428b"],
      },
      {
        version: "v1.2.0",
        codename: "Identity & Connection",
        date: "21 Jul 2026",
        scope: "Fifty-nine files in one commit. The largest single release until v1.5.0.",
        summary:
          "The release that makes your profile unmistakably yours and the community feel alive: Discord-grade cosmetics, expressive identity, richer friendships, group chats, a modern messenger, and a shop and inventory that are finally a pleasure to use.",
        groups: [
          {
            heading: "Profile customisation",
            icon: "Palette",
            blurb:
              "Your profile should say who you are before you type a word. We're taking cues from Discord, Roblox, Steam and the big social platforms - layered, expressive, and never pay-to-win.",
            items: [
              {
                title: "Nameplates everywhere",
                description:
                  "Your equipped nameplate stops living only on your profile page and follows you across the whole site - search results, friends lists, leaderboards, chat headers and message bubbles - so people recognise you instantly wherever you show up.",
              },
              {
                title: "Avatar decorations 2.0",
                description:
                  "Discord-style avatar decorations that render everywhere your avatar appears: animated frames, orbiting particles, soft pulsing glows and looping effects. Layered above your picture and tuned to stay readable at small sizes.",
              },
              {
                title: "Tiered custom banners",
                description:
                  "Banners scale with how invested you are: a clean solid colour for email-only accounts; animated gradients and a curated library of premade art for Discord-linked players; and full custom PNG/JPEG uploads (with sensible size limits and moderation) for server boosters.",
              },
              {
                title: "Rich profile effects",
                description:
                  "A real effects engine, not just a flair badge. Pick a background colour or gradient, add ambient animated layers (falling snow, drifting stars, aurora, embers, confetti), set intensity, and stack multiple accents together for a look that's genuinely yours.",
              },
              {
                title: "Profile themes & accents",
                description:
                  "Recolour your whole profile card - buttons, highlights and dividers - with a curated accent theme, so a visitor feels your vibe the moment the page loads. Hand-picked palettes only, so nothing ever clashes.",
              },
              {
                title: "Display-name styles",
                description:
                  "A curated set of display fonts plus particle, glow, shimmer and gradient treatments for your name - expressive but always legible.",
              },
              {
                title: "Trophy case & showcases",
                description:
                  "Steam-style showcases: pin your rarest cosmetics, proudest achievements, favourite games and best scores to the top of your profile so the first thing people see is what you're proud of.",
              },
              {
                title: "Featured achievement pin",
                description: "Choose one achievement to headline your profile with its full art and rarity.",
              },
              {
                title: "About-me widgets",
                description:
                  "Optional profile fields - pronouns, a one-line status, favourite game, join date and a short bio - arranged as tidy widgets you can show or hide.",
              },
              {
                title: "Cosmetic rarity tiers",
                description:
                  "Every cosmetic gets a rarity - common through mythic - with matching visual treatment and a clear label in the shop and inventory, so rare items actually feel rare.",
              },
              {
                title: "Staff-exclusive cosmetics",
                description:
                  "Genuinely special, unbuyable cosmetics for admins, mods and developers - distinct animated nameplates, frames and decorations - so staff are recognisable at a glance and the role feels earned.",
              },
              {
                title: "Discord link on profile",
                description:
                  "An optional 'Connect' button that surfaces your Discord for verified players who want it shown - off by default, entirely your call.",
              },
            ],
          },
          {
            heading: "Friends & social",
            icon: "Users",
            blurb: "Make the hub somewhere you come to hang out, not just to play.",
            items: [
              {
                title: "Mutual friends (opt-in)",
                description:
                  "See the friends you have in common with someone - shown only for users who choose to make their friends list visible, so it's discovery without exposure.",
              },
              {
                title: "Follow users",
                description:
                  "A lightweight one-way follow alongside two-way friendships - keep up with players you admire without needing them to accept, and they're notified when you do.",
              },
              {
                title: "Friends-list visibility",
                description:
                  "Per-user control over who can see your friends list: private, friends only, followers, or fully public.",
              },
              {
                title: "Friend nicknames & notes",
                description:
                  "Set a private nickname for a friend that only you see, and leave a private note on anyone's profile as a personal reminder of who they are.",
              },
              {
                title: "Group chats",
                description:
                  "Create a group with a shareable invite link (e.g. /invite/<groupId>), managed by a group admin who can add, remove and promote members. Limited to boosters, mods and admins at first to keep it clean and spam-free.",
              },
              {
                title: "Modern messenger",
                description:
                  "Rework messaging to feel like WhatsApp - minus file/image/video/audio sharing and calls: clean threads, emoji reactions, replies, pinned and favourite chats, and delivered/seen receipts done right.",
              },
              {
                title: "Emoji & a better mobile keyboard",
                description:
                  "A proper emoji picker and a solid mobile typing experience across the site - including fixing the frustrating built-in keyboard in Snakes & Ladders while we're in there.",
              },
              {
                title: "Stories",
                description:
                  "Post text or an achievement to a story that expires after a day. Boosters, mods and admins only for now while we prove out the format and moderation.",
              },
              {
                title: "Rich presence",
                description:
                  "Upgrade online status to online / offline / do-not-disturb / sleep, add a 'last online' time, and even an optional 'playing now' game - each with fine-grained controls over exactly who can see it.",
              },
              {
                title: "Wishlist & gifting",
                description:
                  "Add store items to a wishlist you can view and manage from your inventory, and gift items to other players at 75% of the normal price - deliberately cheaper than buying for yourself, so gifting is the generous and the smart move.",
              },
            ],
          },
          {
            heading: "Store & inventory",
            icon: "ShoppingBag",
            blurb: "Buying, previewing and managing cosmetics should be effortless - and fun.",
            items: [
              {
                title: "Live item previews",
                description:
                  "Click any shop item to open a full preview page (in a new tab) that renders the effect live - see exactly how a nameplate, banner, effect or decoration looks on a real profile before you spend a single credit.",
              },
              {
                title: "Apply straight from the shop",
                description:
                  "Already own an item? Apply it to your profile or avatar right from the shop page - no detour through the inventory required.",
              },
              {
                title: "Inventory search & filters",
                description:
                  "A search bar plus filters - by cost, rarity/exclusivity, date acquired and item type - so even a huge collection stays easy to browse and organise.",
              },
              {
                title: "Better boost display",
                description:
                  "Fix the boost countdown timer and multiplier readout so active boosts always show the correct time remaining and the true stacked multiplier at a glance.",
              },
            ],
          },
          {
            heading: "Interface & quality of life",
            icon: "SlidersHorizontal",
            items: [
              {
                title: "Redesigned navigation",
                description:
                  "A proper mobile hamburger menu - today's bar is far too cramped for the space - plus a cleaner desktop nav with more breathing room between items, better spacing and smoother animations. It should simply look and feel good.",
              },
              {
                title: "Organised inventory",
                description:
                  "A rebuilt inventory with clear 'applied' indicators on every item and one-tap apply/disable.",
              },
              {
                title: "Easier event customisation",
                description:
                  "Spin up an event and set things like a credit multiplier, duration and banner in a couple of clicks - no fiddly config.",
              },
              {
                title: "Faster economy adjustments",
                description:
                  "Give or take XP, credits and levels from the admin panel with far less friction - search a player, adjust, done, with an audit trail.",
              },
              {
                title: "Auto device-appropriate controls",
                description:
                  "Detect the player's device and show on-screen touch controls on mobile and keyboard/desktop hints on desktop automatically - whichever they're actually using, without a manual toggle.",
              },
            ],
          },
        ],
        commits: ["4c94d75"],
      },
    ],
  },

  // ─────────────────────────────── v1.1 ───────────────────────────────
  {
    version: "v1.1.0",
    codename: "Rebuilt",
    dates: "19 - 20 Jul 2026",
    summary:
      "The rebuild: the hand-written static site replaced by a Next.js app on Supabase, deployed, corrected, and given a public plan.",
    releases: [
      {
        version: "v1.1.2",
        codename: "Open Plans",
        date: "20 Jul 2026",
        scope: "Three commits about one page - two of them edits to the page the first one added.",
        summary: "The roadmap stopped being a document nobody outside the project could read.",
        groups: [
          {
            heading: "The roadmap",
            icon: "History",
            items: [
              {
                title: "A public roadmap at /roadmap",
                description:
                  "What is planned, grouped by release, with a status on each item - and the definition of done every shipped feature is held to, stated in public.",
              },
              {
                title: "Restructured into v1.2.0, v1.3.0 and v1.4.0",
                description:
                  "The first plan was a flat list of wants. Splitting it into three named releases is what made the next fortnight's work legible - and is the reason those three releases exist at all.",
              },
            ],
          },
        ],
        commits: ["c5be7ec", "7fa939d", "842ac66"],
        prs: [8],
      },
      {
        version: "v1.1.1",
        codename: "Sharp Edges",
        date: "20 Jul 2026",
        scope: "The first pass of corrections after launch, and the upload that carried them.",
        summary: "Five things that were visibly wrong in front of the first people to use the site.",
        groups: [
          {
            heading: "Fixes",
            icon: "SlidersHorizontal",
            items: [
              {
                title: "Gradient text rendered as a solid block",
                description: "The headline treatment used everywhere fell back to a filled rectangle on some browsers.",
              },
              {
                title: "Long-press to flag in Minesweeper",
                description: "There was no way to flag a mine on a phone at all - the game was unplayable on touch.",
              },
              {
                title: "Fullscreen stretching and resolution",
                description: "Games stretched to fill rather than scaling, and rendered at CSS pixels rather than device ones.",
              },
              {
                title: "The rewarded-ads flag removes every ad",
                description: "Turning ads off in the admin panel left several surfaces still showing them.",
              },
              {
                title: "sitemap.xml and robots.txt",
                description: "The two files every search engine asks for, and the site had neither.",
              },
            ],
          },
        ],
        commits: ["cc319b6", "b4de700"],
        prs: [7],
      },
      {
        version: "v1.1.0",
        codename: "Feature Complete",
        date: "19 Jul 2026",
        dateNote: "first deploy 20 Jul 2026",
        scope:
          "The rebuild and the six commits that made deploying it repeatable. One release because none of them is any use without the others - an app that cannot be built is not a version of anything.",
        summary:
          "Rebuilt from scratch as a Next.js app on Supabase: Discord-only sign-in, mobile-first games, an admin control centre, profile customisation and a living economy.",
        groups: [
          {
            heading: "The rebuild",
            icon: "Rocket",
            items: [
              {
                title: "Discord-only login and usernames",
                description:
                  "Accounts, sign-in and a username that is yours across the site - with Discord as the only identity provider, so there are no passwords to lose.",
              },
              {
                title: "Mobile-first games",
                description:
                  "Touch controls, responsive canvases, per-game tuning, and safe-area and overscroll handling - the arcade built for a phone first rather than adapted to one.",
              },
              {
                title: "An admin control centre",
                description: "Users, games, announcements, reports, economy and feature flags, in one place.",
              },
              {
                title: "Profile customisation",
                description: "Nameplates, staff flair and profile effects - the first version of the cosmetics engine.",
              },
              {
                title: "A living economy and events",
                description: "Credits, XP, levels, daily rewards and timed events with multipliers.",
              },
            ],
          },
          {
            heading: "Making it deployable",
            icon: "SlidersHorizontal",
            items: [
              {
                title: "PWA assets, error and loading boundaries, README and CI",
                description:
                  "Everything a build needs to fail loudly rather than quietly - with the raster icons generated at build time from one source rather than committed as a dozen files.",
              },
              {
                title: "Zero-config deploy",
                description:
                  "Production defaults for the publishable environment values, and its own dedicated Supabase project rather than one shared with something else.",
              },
            ],
          },
        ],
        commits: ["8ceae6e", "bccb0cd", "5099af4", "1dfa001", "5feca91", "4aad195", "1efeb47"],
        prs: [6],
      },
    ],
  },

  // ─────────────────────────────── v1.0 ───────────────────────────────
  {
    version: "v1.0.0",
    codename: "First Cabinet",
    dates: "21 Mar 2026",
    summary:
      "The original site, four months before the rebuild: hand-written pages, two games and no server. Its commits are no longer reachable from `main`, so the pull requests are all that is left of it.",
    releases: [
      {
        version: "v1.0.0",
        codename: "First Cabinet",
        date: "21 Mar 2026",
        scope:
          "Five pull requests merged in one morning, none of which stands alone. Together they are the entire first version of the site.",
        summary:
          "A static arcade of hand-written pages, with scores kept in the browser because there was nowhere else to put them.",
        groups: [
          {
            heading: "The first arcade",
            icon: "Gamepad2",
            items: [
              {
                title: "Snake and Tetris",
                description: "The two launch titles, playable in the browser with no account and no server.",
              },
              {
                title: "Game pages built from metadata",
                description:
                  "One manifest describing every game, with the landing page and each game's detail content generated from it rather than written twice.",
              },
              {
                title: "Shared frontend assets",
                description:
                  "The CSS and scripts every page carried its own copy of, pulled into one place - which is what kept the pages small enough to go on hand-writing.",
              },
              {
                title: "A stats dashboard in your browser",
                description:
                  "High scores and plays kept in localStorage: the first version of a profile, with nowhere to sign in.",
              },
            ],
          },
        ],
        commits: [],
        prs: [5, 4, 3, 2, 1],
      },
    ],
  },
];

/** Every release, newest first - for anything that wants the flat list. */
export const RELEASES: UpdateRelease[] = SERIES.flatMap((s) => s.releases);

export const LANDED: LandedChange[] = [
  { sha: "5d23669", date: "15 Aug 2026", subject: "feat(discord): server audit logging, and the audit that produced it (0072)" },
  { sha: "67285b3", date: "5 Aug 2026", subject: "chore: verify the git integration fires after reconnecting" },
  { sha: "358a871", date: "5 Aug 2026", subject: "chore: trigger a build of 573a225" },
  { sha: "573a225", date: "4 Aug 2026", subject: "feat(leaderboards): a board per difficulty, and fix an ambiguity 0067 introduced" },
  { sha: "0f5d18e", date: "4 Aug 2026", subject: "feat(v1.5.1): difficulty picker and message reports, completing the release" },
  { sha: "2007b71", date: "3 Aug 2026", subject: "feat(v1.5.1): cookie consent, with analytics gated behind it (0065)" },
  { sha: "560609a", date: "3 Aug 2026", subject: "feat(v1.5.1): rename, banner, presence heartbeat, stories, fullscreen, settings" },
  { sha: "9191368", date: "3 Aug 2026", subject: "docs(roadmap): plan v1.5.1 and v1.6.0, plus an unscheduled ideas list" },
  { sha: "de6cfc9", date: "3 Aug 2026", subject: "feat(discord): server export command, and role sync every two minutes" },
  { sha: "55026b9", date: "3 Aug 2026", subject: "fix(discord): qualify the reset delete, which safeupdate rejected at runtime" },
  { sha: "5c39b29", date: "3 Aug 2026", subject: "feat(discord): reset-all-settings control, and post panels into the resolved channel" },
  { sha: "8c775bb", date: "3 Aug 2026", subject: "feat(discord): full setup provisions the panel channels instead of skipping" },
  { sha: "970ed6a", date: "2 Aug 2026", subject: "docs(updates): regenerate LANDED and the merged pull request list" },
  { sha: "7479a8f", date: "2 Aug 2026", subject: "Merged pull request from v1-5-0-dev-plan-gmjufz", pr: 22 },
  { sha: "0785bc3", date: "29 Jul 2026", subject: "Merged pull request from website-ui-ux-redesign-fn7ric", pr: 20 },
  { sha: "f91cbea", date: "29 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 21 },
  { sha: "2479a5e", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 19 },
  { sha: "3221adc", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 18 },
  { sha: "3ce4e03", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 17 },
  { sha: "a13d56c", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 16 },
  { sha: "d3986d0", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 15 },
  { sha: "1c16784", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 14 },
  { sha: "1da5a10", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 13 },
  { sha: "13ceba6", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 12 },
  { sha: "88a3df3", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 11 },
  { sha: "f5da50b", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 10 },
  { sha: "36848c8", date: "27 Jul 2026", subject: "Merged pull request from discord-bot-consolidation-2gq23j", pr: 9 },
  { sha: "4488be0", date: "27 Jul 2026", subject: "Add permissions configuration to settings.local.json" },
  { sha: "bb4b7cf", date: "26 Jul 2026", subject: "fix(security): revoke from PUBLIC, not just anon, on 5 signed-in-only RPCs" },
  { sha: "7e8bfdc", date: "26 Jul 2026", subject: "fix(economy): queued boosts no longer lost; dedupe auth round-trips" },
  { sha: "d0c55c9", date: "22 Jul 2026", subject: "feat(v1.4.1): games & fullscreen overhaul, global colour themes, perf polish" },
  { sha: "fc67f53", date: "22 Jul 2026", subject: "feat(v1.4): Turbo Horizon pseudo-3D racer + pass-and-play; roadmap/changelog/docs" },
  { sha: "389595f", date: "22 Jul 2026", subject: "feat(v1.3): Living Arcade - stacking boosts, streaks, mega-events, music, admin surfaces" },
  { sha: "d240a91", date: "22 Jul 2026", subject: "feat(admin): analytics centre; level-milestone unlocks; v1.2.3 roadmap + changelog" },
  { sha: "9b72ea1", date: "22 Jul 2026", subject: "feat(seo)+chore(security): OG share image; security-hardening migration" },
  { sha: "fcf723d", date: "22 Jul 2026", subject: "feat(legal): Terms of Service + Privacy Policy (UK GDPR)" },
  { sha: "c36ed76", date: "22 Jul 2026", subject: "feat(discord): serverless bot v2 - interactions endpoint, secure linking, role sync, leveling" },
  { sha: "43fef05", date: "21 Jul 2026", subject: "docs: roadmap + changelog for v1.2.2 (games, cosmetics, messaging, GIFs)" },
  { sha: "90c5192", date: "21 Jul 2026", subject: "feat(messages): Giphy GIF picker - send GIFs in chat (Discord-style)" },
  { sha: "2b4d810", date: "21 Jul 2026", subject: "fix(messages): resolve sent messages instantly + live incremental updates" },
  { sha: "d514f0b", date: "21 Jul 2026", subject: "v1.2.2: revamp kept shop cosmetics to a Discord-tier quality bar" },
  { sha: "f72cb90", date: "21 Jul 2026", subject: "v1.2.2: rebuild 6 coming-soon games to the quality bar" },
  { sha: "b4e9788", date: "21 Jul 2026", subject: "fix(groups): repair create_group invite-code generation" },
  { sha: "1767a9c", date: "21 Jul 2026", subject: "Add permissions to settings.json for Bash commands" },
  { sha: "778eede", date: "21 Jul 2026", subject: "v1.2.2: shop cull + refunds; rebuild Connect Four" },
  { sha: "63e5495", date: "21 Jul 2026", subject: "v1.2.2: rebuild Tic-Tac-Toe (quality-bar exemplar)" },
  { sha: "97223b9", date: "21 Jul 2026", subject: "v1.2.1 finish + v1.2.2 start: profile wishlist gifting; weak games -> coming soon" },
  { sha: "4ea3e49", date: "21 Jul 2026", subject: "v1.2.1: roadmap + changelog" },
  { sha: "a74459c", date: "21 Jul 2026", subject: "v1.2.1: group chat header menu (copy invite / leave)" },
  { sha: "1861209", date: "21 Jul 2026", subject: "v1.2.1: podium glow-up" },
  { sha: "2da428b", date: "21 Jul 2026", subject: "v1.2.1: notification detail overlay + announcement links & real broadcast" },
  { sha: "4c94d75", date: "21 Jul 2026", subject: "Release v1.2.0 - Identity & Connection" },
  { sha: "c5be7ec", date: "20 Jul 2026", subject: "Merged pull request from classic-games-hub-deploy-r2yvgc", pr: 8 },
  { sha: "7fa939d", date: "20 Jul 2026", subject: "Roadmap: expand and deepen v1.2.1 and v1.3.0 plans" },
  { sha: "842ac66", date: "20 Jul 2026", subject: "Add public roadmap page" },
  { sha: "cc319b6", date: "20 Jul 2026", subject: "Merged pull request from classic-games-hub-deploy-r2yvgc", pr: 7 },
  { sha: "b4de700", date: "20 Jul 2026", subject: "Add files via upload" },
  { sha: "8ceae6e", date: "20 Jul 2026", subject: "Merged pull request from classic-games-hub-deploy-r2yvgc", pr: 6 },
  { sha: "bccb0cd", date: "19 Jul 2026", subject: "Point app at dedicated classic-games-hub Supabase project" },
  { sha: "5099af4", date: "19 Jul 2026", subject: "Add files via upload" },
  { sha: "1dfa001", date: "19 Jul 2026", subject: "Add production env defaults (publishable values) for zero-config deploy" },
  { sha: "5feca91", date: "19 Jul 2026", subject: "Relocate CI workflow out of .github/workflows" },
  { sha: "4aad195", date: "19 Jul 2026", subject: "Generate PWA raster icons at build time via sharp" },
  { sha: "1efeb47", date: "19 Jul 2026", subject: "Add PWA assets, error/loading boundaries, README, CI" },
];

/**
 * Every pull request merged into `main`, from the GitHub API.
 *
 * This is a longer list than the merge commits visible in `LANDED`: #1–#5 were
 * merged in March 2026, before the repository was rebuilt as a Next.js app, and
 * their merge commits are no longer reachable from `main`. GitHub still records
 * them, so they are kept here rather than lost.
 */
export interface MergedPullRequest {
  number: number;
  title: string;
  date: string;
}

export const PULL_REQUESTS: MergedPullRequest[] = [
  { number: 22, title: "v1.5.0 \"Collector's Edition\": cosmetics, seasons, collections & social", date: "2 Aug 2026" },
  { number: 20, title: "feat(ui): redesign the interface and cut two runtime dependencies", date: "29 Jul 2026" },
  { number: 21, title: "Admin dashboard: sidebar layout, shared page furniture, one set of primitives", date: "29 Jul 2026" },
  { number: 19, title: "Tidy the admin dashboard: tabs for the Discord page, grouped nav", date: "28 Jul 2026" },
  { number: 18, title: "Rename the bot to Classic Games Bot, and fix four bugs found in a sweep", date: "28 Jul 2026" },
  { number: 17, title: "Fix three dashboard settings that could never take effect", date: "28 Jul 2026" },
  { number: 16, title: "Use a linked role or channel, and update it - never replace it", date: "28 Jul 2026" },
  { number: 15, title: "Run the bot from the dashboard, and make saving actually apply", date: "28 Jul 2026" },
  { number: 14, title: "Fix: audit-log reason header broke every write to Discord", date: "28 Jul 2026" },
  { number: 13, title: "Report Discord's actual error when /setup can't create something", date: "28 Jul 2026" },
  { number: 12, title: "Show which Discord credentials are missing instead of failing opaquely", date: "28 Jul 2026" },
  { number: 11, title: "Update log at /updates, a forward-only roadmap, and one-click slash-command registration", date: "28 Jul 2026" },
  { number: 10, title: "Parties & online multiplayer, /status, vanity URLs - plus the missing bot heartbeat", date: "28 Jul 2026" },
  { number: 9, title: "feat(discord): one bot replacing Appy, Sapphire, Arcane and ServerStats", date: "27 Jul 2026" },
  { number: 8, title: "Roadmap: restructure into v1.2.0 / v1.3.0 / v1.4.0 with new plans", date: "20 Jul 2026" },
  { number: 7, title: "Deploy: classic-games-hub", date: "20 Jul 2026" },
  { number: 6, title: "Deploy: classic-games-hub", date: "20 Jul 2026" },
  { number: 5, title: "Add playable Snake and Tetris launch titles", date: "21 Mar 2026" },
  { number: 4, title: "Add richer game metadata support", date: "21 Mar 2026" },
  { number: 3, title: "Extract shared frontend assets and slim page HTML", date: "21 Mar 2026" },
  { number: 2, title: "Enhance game landing page with metadata-driven content", date: "21 Mar 2026" },
  { number: 1, title: "Add browser-persisted player stats dashboard", date: "21 Mar 2026" },
];

/** sha → the release it shipped in, for the "everything that landed" list. */
export const RELEASE_OF_COMMIT: Record<string, string> = Object.fromEntries(
  RELEASES.flatMap((release) => release.commits.map((sha) => [sha, release.version])),
);

const LANDED_BY_SHA = new Map(LANDED.map((change) => [change.sha, change]));

/** Shas assigned to a release, resolved against `LANDED`. */
export function commitsOf(release: UpdateRelease): LandedChange[] {
  return release.commits.flatMap((sha) => {
    const change = LANDED_BY_SHA.get(sha);
    return change ? [change] : [];
  });
}

/**
 * Changes in production that no release claims.
 *
 * Empty is the goal, and right now it is not the truth: regenerating `LANDED`
 * surfaced three commits from 4-5 August that reached `main` without a version
 * - the per-difficulty leaderboards and two build triggers behind them. They
 * are listed rather than assigned, because guessing at a release boundary for
 * someone else's work is how the two renumberings above happened. Whoever
 * versions them next has the shas to hand.
 *
 * It is derived rather than asserted precisely so this shows up on the page as
 * a question, instead of quietly falling out of the history the way the whole
 * run between 26 July and 3 August did.
 */
export const UNASSIGNED: LandedChange[] = LANDED.filter((c) => !RELEASE_OF_COMMIT[c.sha]);

/** Totals shown at the top of /updates, derived so they can never drift. */
export const UPDATE_STATS = {
  series: SERIES.length,
  releases: RELEASES.length,
  features: RELEASES.reduce((n, r) => n + r.groups.reduce((m, g) => m + g.items.length, 0), 0),
  landed: LANDED.length,
  pullRequests: PULL_REQUESTS.length,
};
