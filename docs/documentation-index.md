# Documentation index

Use this index before writing another independent release summary.

| Need | Authoritative location |
|---|---|
| Shipped changes | [Public release data](../lib/update-log.ts), [changelog](../CHANGELOG.md), [commit audit](repository-history.md) |
| Future work | [Roadmap](../lib/roadmap.ts) |
| Game implementation | [Adding a game](adding-a-game.md), [registry](../lib/games/registry.ts) |
| Status and uptime | [Status](status.md), [cron jobs](cron-jobs.md) |
| Discord integration | [Discord guide](discord-bot.md), [bot instructions](../bot/README.md) |
| Social matches | [Parties](parties.md) |
| Shop and cosmetics | [Cosmetics](cosmetics.md), [seasons](seasons.md) |
| Account security | [Two-factor authentication](two-factor.md) |

## Documentation standards

Specify whether a claim is **present in source**, **merged**, **deployed**, **verified**, or **planned**. Source files do not establish live deployment. Keep the old migration files immutable, preserve historical renumberings and link relevant commits. Do not publish secrets or claim that empty status data means healthy uptime.

## Known follow-ups

- Reconcile package version 2.0.0 with the v1.5 public release ledger and v1.6-v1.9 roadmap.
- Check all migration filenames and links, and refresh README counts after confirming deployed game availability.
- Compare the full first-parent Git log with the `LANDED` index, extending beyond the current 100-result retrieval.
- Check tags and GitHub Releases, production Vercel SHA and cron job output to verify deployment claims.
