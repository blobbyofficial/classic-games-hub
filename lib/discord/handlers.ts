import "server-only";
import { botDb } from "./bot-db";
import { discordEnv } from "./env";
import { discordRest } from "./rest";
import { syncMemberRoles } from "./role-sync";

/**
 * Slash-command handlers for the HTTP interactions endpoint. Each returns a
 * Discord interaction-response payload (type 4 message). Longer jobs (role
 * sync, moderation REST calls) are still fast enough for the 3-second window
 * because they are a handful of sequential REST calls, but they run through
 * `deferred` handlers wired in the route with next/server `after()`.
 */

const BRAND_COLOR = 0x7a3dff;
const EPHEMERAL = 64;

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://classic-games-hub.blobbyofficial.com";

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
};

export function brandEmbed(extra: Embed = {}): Embed {
  return { color: BRAND_COLOR, footer: { text: "Classic Games Hub" }, ...extra };
}

export function errorEmbed(message: string): Embed {
  return { color: 0xef4444, description: `❌ ${message}` };
}

export function reply(embeds: Embed[], ephemeral = false) {
  return { type: 4, data: { embeds, flags: ephemeral ? EPHEMERAL : 0 } };
}

const RPC_ERRORS: Record<string, string> = {
  not_linked: "You haven't linked a Hub account yet. Run `/link` to get started.",
  sender_not_linked: "You need a linked Hub account first — run `/link`.",
  recipient_not_linked: "That player hasn't linked a Hub account yet.",
  already_claimed: "You've already claimed your daily reward today. Come back tomorrow!",
  insufficient: "You don't have enough credits for that.",
  bad_amount: "Enter a positive amount.",
  self: "You can't pay yourself.",
  suspended: "Your account is suspended.",
  no_xp: "No chat XP yet — say something in the server first!",
  already_linked: "That Discord account is already linked to a Hub account.",
  discord_already_linked: "That Discord account is already linked to a Hub account.",
  account_already_linked: "Your Hub account already has a Discord account linked.",
};

export function friendlyError(code: string | undefined): string {
  return (code && RPC_ERRORS[code]) || "Something went wrong. Try again later.";
}

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("en-GB");

export const profileUrl = (username: string) => `${siteUrl()}/u/${encodeURIComponent(username)}`;

// ── Command handlers ─────────────────────────────────────────────────

export async function handleLink(discordId: string, discordUsername: string) {
  await botDb.purgeLinkCodes();
  const res = await botDb.createLinkCode(discordId, discordUsername);
  if (!res?.ok) {
    if (res?.error === "already_linked") {
      return reply(
        [
          brandEmbed({
            title: "🔗 Already linked",
            description: `This Discord account is already linked to **${res.username ?? "a Hub account"}**.\nRun \`/unlink\` first if you want to move it.`,
          }),
        ],
        true,
      );
    }
    return reply([errorEmbed(friendlyError(res?.error))], true);
  }
  return reply(
    [
      brandEmbed({
        title: "🔗 Link your Hub account",
        description: [
          `Your one-time code: \`${res.code}\``,
          "",
          `1. Sign in at **${siteUrl()}**`,
          `2. Open **Settings → Connections**`,
          `3. Enter the code (it expires in ${res.expires_in_minutes ?? 10} minutes)`,
          "",
          "Signed up with Discord already? Then you're linked automatically — this is only for email accounts.",
        ].join("\n"),
        url: `${siteUrl()}/settings`,
      }),
    ],
    true,
  );
}

export async function handleUnlink(discordId: string) {
  const res = await botDb.unlink(discordId);
  if (!res?.ok) {
    if (res?.error === "oauth_link") {
      return reply(
        [
          brandEmbed({
            title: "🔗 Linked through Discord sign-in",
            description: `This account is linked because you sign in to the Hub with Discord. Manage it at **${siteUrl()}/settings** → Connections.`,
          }),
        ],
        true,
      );
    }
    return reply([errorEmbed("This Discord account isn't linked to a Hub account.")], true);
  }
  return reply(
    [brandEmbed({ title: "🔓 Unlinked", description: "Your Discord account is no longer connected to a Hub account." })],
    true,
  );
}

export async function handleProfile(targetId: string, targetName: string, ephemeral: boolean) {
  const p = await botDb.profile(targetId);
  if (!p?.ok) return reply([errorEmbed(friendlyError(p?.error))], true);
  return reply(
    [
      brandEmbed({
        title: `${p.display_name ?? p.username ?? targetName}`,
        url: p.username ? profileUrl(p.username) : undefined,
        fields: [
          { name: "Level", value: `${p.level ?? 0}`, inline: true },
          { name: "XP", value: fmt(p.xp), inline: true },
          { name: "Credits", value: fmt(p.credits), inline: true },
          ...(p.role && p.role !== "user" ? [{ name: "Role", value: p.role, inline: true }] : []),
        ],
        description: p.username ? `[View full profile](${profileUrl(p.username)})` : undefined,
      }),
    ],
    ephemeral,
  );
}

export async function handleBalance(discordId: string) {
  const p = await botDb.profile(discordId);
  if (!p?.ok) return reply([errorEmbed(friendlyError(p?.error))], true);
  return reply(
    [
      brandEmbed({
        title: `💰 ${p.display_name ?? p.username}`,
        fields: [
          { name: "Credits", value: `**${fmt(p.credits)}**`, inline: true },
          { name: "Level", value: `${p.level ?? 0}`, inline: true },
          { name: "XP", value: fmt(p.xp), inline: true },
        ],
      }),
    ],
    true,
  );
}

export async function handleDaily(discordId: string) {
  const res = await botDb.claimDaily(discordId);
  if (!res?.ok) return reply([errorEmbed(friendlyError(res?.error))], true);
  return reply(
    [
      brandEmbed({
        title: "🎁 Daily reward claimed!",
        description: `You earned **${res.credits}** credits.\n🔥 Streak: **${res.streak}** day(s)`,
      }),
    ],
    true,
  );
}

export async function handlePay(fromId: string, toId: string, toIsBot: boolean, amount: number) {
  if (toIsBot) return reply([errorEmbed("You can't pay a bot.")], true);
  const res = await botDb.pay(fromId, toId, amount);
  if (!res?.ok) return reply([errorEmbed(friendlyError(res?.error))], true);
  return reply([
    brandEmbed({
      title: "💸 Payment sent",
      description: `<@${fromId}> paid **${fmt(amount)}** credits to <@${toId}>.`,
    }),
  ]);
}

export async function handleRank(targetId: string, targetName: string) {
  const r = await botDb.discordRank(targetId);
  if (!r?.ok) return reply([errorEmbed(friendlyError(r?.error))], true);
  const intoLevel = (r.xp ?? 0) - (r.level_floor_xp ?? 0);
  const needed = (r.next_level_xp ?? 0) - (r.level_floor_xp ?? 0);
  const pct = needed > 0 ? Math.min(1, intoLevel / needed) : 0;
  const bar = "█".repeat(Math.round(pct * 12)).padEnd(12, "░");
  return reply([
    brandEmbed({
      title: `📊 ${targetName} — server rank #${r.rank}`,
      description: [
        `**Level ${r.level}** · ${fmt(r.xp)} XP · ${fmt(r.messages)} messages`,
        `\`${bar}\` ${fmt(intoLevel)} / ${fmt(needed)} XP to level ${(r.level ?? 0) + 1}`,
        r.hub_username ? `Linked to Hub account **${r.hub_username}**` : "Not linked — run `/link` to connect your Hub account.",
      ].join("\n"),
    }),
  ]);
}

export async function handleLevels() {
  const rows = await botDb.discordLeaderboard(10);
  if (!rows || rows.length === 0) {
    return reply([errorEmbed("No chat XP recorded yet — start talking!")], true);
  }
  const medals = ["🥇", "🥈", "🥉"];
  const lines = rows.map(
    (r) =>
      `${medals[r.rank - 1] ?? `**${r.rank}.**`} <@${r.discord_id}> — Lvl ${r.level} · ${fmt(r.xp)} XP`,
  );
  return reply([
    brandEmbed({ title: "💬 Discord chat leaderboard", description: lines.join("\n") }),
  ]);
}

export async function handleLeaderboard() {
  const rows = await botDb.topPlayers(10);
  if (!rows || rows.length === 0) {
    return reply([errorEmbed("No players on the leaderboard yet.")], true);
  }
  const medals = ["🥇", "🥈", "🥉"];
  const lines = rows.map(
    (r) =>
      `${medals[r.rank - 1] ?? `**${r.rank}.**`} ${r.display_name ?? r.username} — Lvl ${r.level} · ${fmt(r.xp)} XP`,
  );
  return reply([
    brandEmbed({
      title: "🏆 Top Hub players",
      description: lines.join("\n"),
      url: `${siteUrl()}/leaderboards`,
    }),
  ]);
}

export function handleHelp() {
  return reply(
    [
      brandEmbed({
        title: "🎮 Classic Games Hub bot",
        description: [
          "**Account**",
          "`/link` — connect your Discord to your Hub account",
          "`/unlink` — disconnect it",
          "`/sync` — sync your Discord roles with your Hub account",
          "",
          "**Economy**",
          "`/balance` — your credits & level",
          "`/daily` — claim your daily reward",
          "`/pay @user amount` — send credits",
          "",
          "**Levels & leaderboards**",
          "`/rank [@user]` — your Discord chat level",
          "`/levels` — Discord chat leaderboard",
          "`/profile [@user]` — a Hub profile",
          "`/leaderboard` — top Hub players",
          "",
          `Play at ${siteUrl()}`,
        ].join("\n"),
      }),
    ],
    true,
  );
}

// ── Deferred handlers (run via after(), edit the original response) ──

export async function deferredSync(discordId: string, token: string) {
  const res = await syncMemberRoles(discordId);
  let embed: Embed;
  if (!res.ok) {
    const messages: Record<string, string> = {
      disabled: "Role sync is currently disabled.",
      no_role_map: "Role sync isn't configured on this server yet.",
      not_configured: "The bot isn't fully configured yet.",
      not_in_guild: "Join the Discord server first, then run `/sync` there.",
      state_unavailable: "Couldn't read your Hub account. Try again later.",
      missing_permissions: "The bot is missing permissions to manage roles.",
    };
    embed = errorEmbed(messages[res.error ?? ""] ?? "Something went wrong.");
  } else {
    const parts = [
      res.added.length ? `Added: ${res.added.map((r) => `<@&${r}>`).join(", ")}` : "",
      res.removed.length ? `Removed: ${res.removed.map((r) => `<@&${r}>`).join(", ")}` : "",
      res.failed.length ? `⚠️ Couldn't touch ${res.failed.length} role(s) — check the bot's role position.` : "",
    ].filter(Boolean);
    embed = brandEmbed({
      title: "🎖️ Roles synced",
      description: parts.length ? parts.join("\n") : "You're all up to date.",
    });
  }
  await discordRest.editOriginalResponse(discordEnv.appId, token, { embeds: [embed] });
}

export async function deferredWarn(
  actorId: string,
  targetId: string,
  reason: string,
  guildName: string,
  token: string,
) {
  await botDb.logMod(actorId, targetId, "warn", reason);
  await discordRest.dmUser(targetId, `⚠️ You were warned in **${guildName}**: ${reason}`);
  await discordRest.editOriginalResponse(discordEnv.appId, token, {
    embeds: [brandEmbed({ title: "⚠️ Warned", description: `<@${targetId}> — ${reason}` })],
  });
}

export async function deferredTimeout(
  actorId: string,
  targetId: string,
  minutes: number,
  reason: string,
  token: string,
) {
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  const res = await discordRest.timeoutMember(discordEnv.guildId, targetId, until, reason);
  const embed = res.ok
    ? brandEmbed({ title: "🔇 Timed out", description: `<@${targetId}> for ${minutes}m — ${reason}` })
    : errorEmbed(
        res.status === 403
          ? "I can't time out that member (missing permissions or their role is above mine)."
          : "Couldn't time out that member.",
      );
  if (res.ok) await botDb.logMod(actorId, targetId, "timeout", `${minutes}m — ${reason}`);
  await discordRest.editOriginalResponse(discordEnv.appId, token, { embeds: [embed] });
}

export async function deferredBan(actorId: string, targetId: string, reason: string, token: string) {
  const res = await discordRest.banMember(discordEnv.guildId, targetId, reason);
  const embed = res.ok
    ? brandEmbed({ title: "🔨 Banned", description: `<@${targetId}> — ${reason}` })
    : errorEmbed(
        res.status === 403
          ? "I can't ban that member (missing permissions or their role is above mine)."
          : "Couldn't ban that member.",
      );
  if (res.ok) await botDb.logMod(actorId, targetId, "ban", reason);
  await discordRest.editOriginalResponse(discordEnv.appId, token, { embeds: [embed] });
}
