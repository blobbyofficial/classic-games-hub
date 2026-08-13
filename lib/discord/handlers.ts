import "server-only";
import { botDb } from "./bot-db";
import { earnedMilestones, getBotConfig, template } from "./config";
import { discordEnv } from "./env";
import { discordRest } from "./rest";
import { syncMemberRoles } from "./role-sync";
import {
  postTicketPanel,
  postVerificationPanel,
  refreshStatChannels,
  setupLevelRoles,
  setupStatsChannels,
  setupVerificationRoles,
} from "./setup";
import type { Embed } from "./types";

/**
 * Slash-command handlers for the HTTP interactions endpoint. Each returns a
 * Discord interaction-response payload (type 4 message). Longer jobs (role
 * sync, moderation REST calls) are still fast enough for the 3-second window
 * because they are a handful of sequential REST calls, but they run through
 * `deferred` handlers wired in the route with next/server `after()`.
 */

import { BOT_NAME, brandEmbed, errorEmbed } from "./embeds";
import { announce as opsAnnounce, recordModAction } from "./ops";

const EPHEMERAL = 64;

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://classic-games-hub.blobbyofficial.com";

export { brandEmbed, errorEmbed };

export function reply(embeds: Embed[], ephemeral = false) {
  return { type: 4, data: { embeds, flags: ephemeral ? EPHEMERAL : 0 } };
}

const RPC_ERRORS: Record<string, string> = {
  not_linked: "You haven't linked a Hub account yet. Run `/link` to get started.",
  sender_not_linked: "You need a linked Hub account first - run `/link`.",
  recipient_not_linked: "That player hasn't linked a Hub account yet.",
  already_claimed: "You've already claimed your daily reward today. Come back tomorrow!",
  insufficient: "You don't have enough credits for that.",
  bad_amount: "Enter a positive amount.",
  self: "You can't pay yourself.",
  suspended: "Your account is suspended.",
  no_xp: "No chat XP yet - say something in the server first!",
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
          "Signed up with Discord already? Then you're linked automatically - this is only for email accounts.",
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
      title: `📊 ${targetName} - server rank #${r.rank}`,
      description: [
        `**Level ${r.level}** · ${fmt(r.xp)} XP · ${fmt(r.messages)} messages`,
        `\`${bar}\` ${fmt(intoLevel)} / ${fmt(needed)} XP to level ${(r.level ?? 0) + 1}`,
        r.hub_username ? `Linked to Hub account **${r.hub_username}**` : "Not linked - run `/link` to connect your Hub account.",
      ].join("\n"),
    }),
  ]);
}

/**
 * `/level` - the friendly, Arcane-style card: level, progress bar, and what
 * the next milestone role is. (`/rank` stays as the terse power-user view.)
 */
export async function handleLevel(targetId: string, targetName: string, isSelf: boolean) {
  const [r, cfg] = await Promise.all([botDb.discordRank(targetId), getBotConfig("level_roles")]);
  if (!r?.ok) {
    return reply(
      [
        errorEmbed(
          r?.error === "no_xp"
            ? isSelf
              ? "You haven't earned any XP yet - send a message in the server and check back!"
              : "That member hasn't earned any XP yet."
            : friendlyError(r?.error),
        ),
      ],
      true,
    );
  }

  const level = r.level ?? 0;
  const intoLevel = (r.xp ?? 0) - (r.level_floor_xp ?? 0);
  const needed = (r.next_level_xp ?? 0) - (r.level_floor_xp ?? 0);
  const pct = needed > 0 ? Math.min(1, intoLevel / needed) : 0;
  const bar = "█".repeat(Math.round(pct * 16)).padEnd(16, "░");

  const milestones = [...(cfg.milestones ?? [])].sort((a, b) => a - b);
  const earned = earnedMilestones(cfg, level);
  const nextMilestone = milestones.find((m) => m > level);
  const currentRole = earned.length ? cfg.roles[String(earned[0])] : undefined;

  const fields: Embed["fields"] = [
    { name: "Level", value: `**${level}**`, inline: true },
    { name: "XP", value: fmt(r.xp), inline: true },
    { name: "Rank", value: `#${r.rank}`, inline: true },
  ];
  if (currentRole) {
    fields.push({ name: "Current reward role", value: `<@&${currentRole}>`, inline: true });
  }
  if (nextMilestone) {
    const roleId = cfg.roles[String(nextMilestone)];
    fields.push({
      name: "Next milestone",
      value: `Level **${nextMilestone}**${roleId ? ` → <@&${roleId}>` : ""}`,
      inline: true,
    });
  }

  return reply([
    brandEmbed({
      title: `⭐ ${targetName}`,
      description: [
        `\`${bar}\` ${Math.round(pct * 100)}%`,
        `${fmt(intoLevel)} / ${fmt(needed)} XP to level **${level + 1}** · ${fmt(r.messages)} messages`,
        r.hub_username
          ? `Linked to **${r.hub_username}** - [Hub profile](${profileUrl(r.hub_username)})`
          : "Run `/link` to connect your Hub account and earn website XP too.",
      ].join("\n"),
      fields,
    }),
  ]);
}

/** `/rewards` - the milestone ladder, so members know what they're chasing. */
export async function handleRewards() {
  const cfg = await getBotConfig("level_roles");
  const milestones = [...(cfg.milestones ?? [])].sort((a, b) => a - b);
  if (!cfg.enabled || milestones.length === 0) {
    return reply([errorEmbed("Level rewards aren't set up on this server yet.")], true);
  }
  const lines = milestones.map((m) => {
    const roleId = cfg.roles[String(m)];
    return `**Level ${m}** - ${roleId ? `<@&${roleId}>` : "_role not created yet_"}`;
  });
  return reply([
    brandEmbed({
      title: "🎖️ Level rewards",
      description: [
        lines.join("\n"),
        "",
        cfg.remove_previous
          ? "_Only your highest milestone role is kept._"
          : "_Milestone roles stack - you keep every one you earn._",
        "Check your progress with `/level`.",
      ].join("\n"),
    }),
  ]);
}

export async function handleLevels() {
  const rows = await botDb.discordLeaderboard(10);
  if (!rows || rows.length === 0) {
    return reply([errorEmbed("No chat XP recorded yet - start talking!")], true);
  }
  const medals = ["🥇", "🥈", "🥉"];
  const lines = rows.map(
    (r) =>
      `${medals[r.rank - 1] ?? `**${r.rank}.**`} <@${r.discord_id}> - Lvl ${r.level} · ${fmt(r.xp)} XP`,
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
      `${medals[r.rank - 1] ?? `**${r.rank}.**`} ${r.display_name ?? r.username} - Lvl ${r.level} · ${fmt(r.xp)} XP`,
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
        title: `🎮 ${BOT_NAME}`,
        description: [
          "**Account**",
          "`/link` - connect your Discord to your Hub account",
          "`/unlink` - disconnect it",
          "`/sync` - sync your Discord roles with your Hub account",
          "",
          "**Economy**",
          "`/balance` - your credits & level",
          "`/daily` - claim your daily reward",
          "`/pay @user amount` - send credits",
          "",
          "**Levels & leaderboards**",
          "`/level [@user]` - your level, progress and next reward role",
          "`/rewards` - every milestone level and its role",
          "`/rank [@user]` - the terse rank card",
          "`/levels` - Discord chat leaderboard",
          "`/profile [@user]` - a Hub profile",
          "`/leaderboard` - top Hub players",
          "",
          "**Server**",
          "`/verify` - verify yourself and unlock the server",
          "`/ticket [subject]` - open a private support ticket",
          "`/status [service]` - is the site working? uptime, incidents and versions",
          "",
          "**Staff only**",
          "`/warn` `/timeout` `/untimeout` `/kick` `/ban` `/unban` `/warnings`",
          "`/purge` `/slowmode` `/lock` `/unlock` `/announce` `/setup`",
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
      res.failed.length ? `⚠️ Couldn't touch ${res.failed.length} role(s) - check the bot's role position.` : "",
    ].filter(Boolean);
    embed = brandEmbed({
      title: "🎖️ Roles synced",
      description: parts.length ? parts.join("\n") : "You're all up to date.",
    });
  }
  await discordRest.editOriginalResponse(discordEnv.appId, token, { embeds: [embed] });
}

const ACTION_EMOJI: Record<string, string> = {
  warn: "⚠️",
  timeout: "🔇",
  untimeout: "🔊",
  kick: "👢",
  ban: "🔨",
  unban: "♻️",
  purge: "🧹",
  lock: "🔒",
  unlock: "🔓",
  automod: "🤖",
};

/** 403 from Discord almost always means role hierarchy, so say that. */
function restError(status: number, what: string): Embed {
  return errorEmbed(
    status === 403
      ? `I can't ${what} - check my permissions and that my role sits above theirs.`
      : `Couldn't ${what}.`,
  );
}

async function finish(token: string, embed: Embed) {
  await discordRest.editOriginalResponse(discordEnv.appId, token, {
    embeds: [embed],
    allowed_mentions: { parse: [] },
  });
}

export async function deferredWarn(
  actor: { id: string; name: string },
  targetId: string,
  targetName: string | null,
  reason: string,
  guildName: string,
  token: string,
) {
  const number = await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId,
    targetName,
    action: "warn",
    reason,
    dm: `⚠️ You were warned in **${guildName}**: ${reason}`,
  });
  await finish(
    token,
    brandEmbed({
      title: `⚠️ Warned${number ? ` - case #${number}` : ""}`,
      description: `<@${targetId}> - ${reason}`,
    }),
  );
}

export async function deferredTimeout(
  actor: { id: string; name: string },
  targetId: string,
  targetName: string | null,
  minutes: number,
  reason: string,
  token: string,
) {
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  const res = await discordRest.timeoutMember(discordEnv.guildId, targetId, until, reason);
  if (!res.ok) return finish(token, restError(res.status, "time out that member"));

  const number = await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId,
    targetName,
    action: "timeout",
    reason,
    minutes,
    dm: `🔇 You were timed out for ${minutes} minute(s): ${reason}`,
  });
  await finish(
    token,
    brandEmbed({
      title: `🔇 Timed out${number ? ` - case #${number}` : ""}`,
      description: `<@${targetId}> for ${minutes}m - ${reason}`,
    }),
  );
}

export async function deferredUntimeout(
  actor: { id: string; name: string },
  targetId: string,
  targetName: string | null,
  token: string,
) {
  const res = await discordRest.timeoutMember(discordEnv.guildId, targetId, null, "Timeout lifted");
  if (!res.ok) return finish(token, restError(res.status, "lift that timeout"));
  await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId,
    targetName,
    action: "untimeout",
    reason: "Timeout lifted",
    dm: "🔊 Your timeout has been lifted.",
  });
  await finish(token, brandEmbed({ title: "🔊 Timeout lifted", description: `<@${targetId}> can talk again.` }));
}

export async function deferredBan(
  actor: { id: string; name: string },
  targetId: string,
  targetName: string | null,
  reason: string,
  token: string,
) {
  // DM before the ban lands - you can't DM someone you no longer share a
  // server with.
  const cfg = await getBotConfig("moderation");
  if (cfg.dm_on_action) {
    await discordRest.dmUser(targetId, `🔨 You were banned: ${reason}`);
  }
  const res = await discordRest.banMember(discordEnv.guildId, targetId, reason);
  if (!res.ok) return finish(token, restError(res.status, "ban that member"));

  const number = await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId,
    targetName,
    action: "ban",
    reason,
  });
  await finish(
    token,
    brandEmbed({ title: `🔨 Banned${number ? ` - case #${number}` : ""}`, description: `<@${targetId}> - ${reason}` }),
  );
}

export async function deferredKick(
  actor: { id: string; name: string },
  targetId: string,
  targetName: string | null,
  reason: string,
  token: string,
) {
  const cfg = await getBotConfig("moderation");
  if (cfg.dm_on_action) {
    await discordRest.dmUser(targetId, `👢 You were kicked: ${reason}`);
  }
  const res = await discordRest.kickMember(discordEnv.guildId, targetId, reason);
  if (!res.ok) return finish(token, restError(res.status, "kick that member"));

  const number = await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId,
    targetName,
    action: "kick",
    reason,
  });
  await finish(
    token,
    brandEmbed({ title: `👢 Kicked${number ? ` - case #${number}` : ""}`, description: `<@${targetId}> - ${reason}` }),
  );
}

export async function deferredUnban(
  actor: { id: string; name: string },
  targetId: string,
  reason: string,
  token: string,
) {
  if (!/^\d{15,25}$/.test(targetId)) {
    return finish(token, errorEmbed("That doesn't look like a Discord user ID."));
  }
  const res = await discordRest.unbanMember(discordEnv.guildId, targetId, reason);
  if (!res.ok) {
    return finish(
      token,
      res.status === 404
        ? errorEmbed("That user isn't banned.")
        : restError(res.status, "lift that ban"),
    );
  }
  await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId,
    action: "unban",
    reason,
  });
  await finish(token, brandEmbed({ title: "♻️ Unbanned", description: `<@${targetId}> - ${reason}` }));
}

export async function deferredPurge(
  actor: { id: string; name: string },
  channelId: string,
  count: number,
  onlyUserId: string | undefined,
  token: string,
) {
  const fetched = await discordRest.getMessages(channelId, onlyUserId ? 100 : count);
  if (!fetched.ok || !fetched.data) {
    return finish(token, restError(fetched.status, "read this channel"));
  }
  const twoWeeksAgo = Date.now() - 13.5 * 24 * 3600_000;
  const ids = fetched.data
    .filter((m) => new Date(m.timestamp).getTime() > twoWeeksAgo)
    .filter((m) => !onlyUserId || (m as { author?: { id?: string } }).author?.id === onlyUserId)
    .slice(0, count)
    .map((m) => m.id);

  if (ids.length === 0) {
    return finish(token, errorEmbed("Nothing to delete (Discord can't bulk-delete messages older than 14 days)."));
  }

  const res =
    ids.length === 1
      ? await discordRest.deleteMessage(channelId, ids[0], `Purge by ${actor.name}`)
      : await discordRest.bulkDelete(channelId, ids, `Purge by ${actor.name}`);
  if (!res.ok) return finish(token, restError(res.status, "delete those messages"));

  const cfg = await getBotConfig("moderation");
  if (cfg.log_channel_id) {
    await discordRest.createMessage(cfg.log_channel_id, {
      embeds: [
        brandEmbed({
          title: "🧹 Messages purged",
          description: `<@${actor.id}> deleted **${ids.length}** message(s) in <#${channelId}>${onlyUserId ? ` from <@${onlyUserId}>` : ""}.`,
          timestamp: new Date().toISOString(),
        }),
      ],
      allowed_mentions: { parse: [] },
    });
  }
  await finish(token, brandEmbed({ title: "🧹 Purged", description: `Deleted **${ids.length}** message(s).` }));
}

export async function deferredSlowmode(channelId: string, seconds: number, token: string) {
  const res = await discordRest.modifyChannel(channelId, { rate_limit_per_user: seconds }, "Slowmode");
  if (!res.ok) return finish(token, restError(res.status, "change slowmode here"));
  await finish(
    token,
    brandEmbed({
      title: seconds > 0 ? "🐌 Slowmode on" : "⚡ Slowmode off",
      description: seconds > 0 ? `One message every **${seconds}s**.` : "Slowmode disabled.",
    }),
  );
}

export async function deferredLock(
  actor: { id: string; name: string },
  guildId: string,
  channelId: string,
  lock: boolean,
  reason: string,
  token: string,
) {
  // Same care as the dashboard path: an overwrite edit replaces the whole
  // overwrite, so read it first rather than flattening every other rule on the
  // channel - and clear an explicit allow, which would otherwise beat the deny.
  const SEND_MESSAGES = 1n << 11n;
  const channel = await discordRest.getChannel(channelId);
  const existing = channel.data?.permission_overwrites?.find((o) => o.id === guildId);
  const allow = BigInt(existing?.allow ?? "0");
  const deny = BigInt(existing?.deny ?? "0");

  const res = await discordRest.editChannelPermissions(
    channelId,
    guildId, // @everyone's role id is the guild id
    {
      type: 0,
      allow: String(lock ? allow & ~SEND_MESSAGES : allow),
      deny: String(lock ? deny | SEND_MESSAGES : deny & ~SEND_MESSAGES),
    },
    reason,
  );
  if (!res.ok) return finish(token, restError(res.status, `${lock ? "lock" : "unlock"} this channel`));

  const cfg = await getBotConfig("moderation");
  if (cfg.log_channel_id) {
    await discordRest.createMessage(cfg.log_channel_id, {
      embeds: [
        brandEmbed({
          title: lock ? "🔒 Channel locked" : "🔓 Channel unlocked",
          description: `<#${channelId}> by <@${actor.id}>${reason ? ` - ${reason}` : ""}`,
          timestamp: new Date().toISOString(),
        }),
      ],
      allowed_mentions: { parse: [] },
    });
  }
  await finish(
    token,
    brandEmbed({
      title: lock ? "🔒 Locked" : "🔓 Unlocked",
      description: lock
        ? "Only staff can send messages here now."
        : "Everyone can send messages here again.",
    }),
  );
}

export async function handleWarnings(targetId: string, targetName: string) {
  const cases = await botDb.listCases(targetId, 15);
  if (!cases || cases.length === 0) {
    return reply([brandEmbed({ title: `🕊️ ${targetName}`, description: "No moderation history - clean record." })], true);
  }
  const lines = cases.map((c) => {
    const when = new Date(c.at).toISOString().slice(0, 10);
    const dur = c.minutes ? ` (${c.minutes}m)` : "";
    return `\`#${c.case}\` ${ACTION_EMOJI[c.action] ?? "•"} **${c.action}**${dur} - ${c.reason ?? "no reason"} · ${when}`;
  });
  return reply(
    [
      brandEmbed({
        title: `📋 ${targetName} - ${cases.length} case(s)`,
        description: lines.join("\n").slice(0, 4000),
      }),
    ],
    true,
  );
}

// ── Announcements ────────────────────────────────────────────────────

export async function deferredAnnounce(
  channelId: string,
  message: string,
  title: string | undefined,
  pingRoleId: string | undefined,
  imageUrl: string | undefined,
  plain: boolean,
  actor: { id: string; name: string },
  token: string,
) {
  void actor;
  const res = await opsAnnounce({ channelId, message, title, pingRoleId, imageUrl, plain });
  if (!res.ok) return finish(token, errorEmbed(res.error ?? "Couldn't post that."));
  await finish(token, brandEmbed({ title: "📣 Announcement posted", description: `Sent to <#${channelId}>.` }));
}

// ── /setup … (admin, run once per server) ────────────────────────────

function setupSummary(
  title: string,
  res: {
    created: string[];
    reused: string[];
    updated?: string[];
    missing?: string[];
    failed: string[];
    detail?: string;
  },
): Embed {
  const parts = [
    res.created.length ? `✅ Created: ${res.created.join(", ")}` : "",
    res.updated?.length ? `✏️ Updated: ${res.updated.join(", ")}` : "",
    res.reused.length ? `♻️ Already correct: ${res.reused.join(", ")}` : "",
    // A configured ID that no longer resolves is called out rather than
    // quietly replaced - a surprise duplicate is worse than a clear warning.
    res.missing?.length
      ? `🔗 Not found: ${res.missing.join(", ")} - I left these alone rather than making replacements. Clear the ID to have me create a fresh one.`
      : "",
    res.failed.length ? `⚠️ Failed: ${res.failed.join(", ")}` : "",
    // Discord's own words beat a guess. "Missing Permissions" and "Maximum
    // number of guild roles reached" need completely different fixes, and the
    // old catch-all sent people to check role hierarchy for both - which is
    // never the cause of a failed *creation*, since a new role starts at the
    // bottom regardless of who made it.
    res.failed.length && res.detail ? `Discord said: **${res.detail}**` : "",
    res.failed.length ? hintFor(res.detail) : "",
  ].filter(Boolean);
  return brandEmbed({ title, description: parts.join("\n") || "Nothing to do - already set up." });
}

/** Turns Discord's error text into the thing to actually go and change. */
function hintFor(detail: string | undefined): string {
  const d = (detail ?? "").toLowerCase();
  if (d.includes("missing permissions") || d.includes("50013")) {
    return "→ Give my role **Manage Roles** (and **Manage Channels** for channel setup). If I already have Administrator, check you granted it to *my* role - the one with my name - and not a role I don't hold.";
  }
  if (d.includes("missing access") || d.includes("50001")) {
    return "→ I'm not properly in this server. Re-invite me using an OAuth2 URL that ticks **both** the `bot` and `applications.commands` scopes - commands can appear without the `bot` scope, but I can't act.";
  }
  if (d.includes("maximum number of guild roles")) {
    return "→ This server has hit Discord's 250-role limit. Delete some unused roles and run this again.";
  }
  if (d.includes("http 429") || d.includes("rate limit")) {
    return "→ Discord is rate-limiting me. Wait a minute and run it again; anything already made will be reused.";
  }
  return "→ Check that my role has the permission for this action, then run it again.";
}

const SETUP_ERRORS: Record<string, string> = {
  not_configured: "The bot isn't fully configured yet (missing token or guild ID).",
  missing_permissions: "I need **Manage Roles** and **Manage Channels** to set that up.",
  api: "Discord rejected the request. Try again in a moment.",
};

/**
 * `/export` - the whole server as a JSON attachment.
 *
 * An attachment rather than a message because the answer does not fit in one:
 * a modest server exports past Discord's 2000-character message limit and a
 * busy one past the 6000 an embed allows, and a truncated server map is worse
 * than none - it looks complete.
 *
 * The reply itself carries the problem list, so the useful part is readable
 * without downloading anything.
 */
export async function deferredExport(token: string) {
  const { exportServer } = await import("./export");
  const res = await exportServer();
  if (!res.ok) return finish(token, errorEmbed(res.error));

  const json = JSON.stringify(res.data, null, 2);
  const { problems } = res.data;
  const summary = brandEmbed({
    title: "📋 Server export",
    description: [
      `Attached as JSON (${(json.length / 1024).toFixed(1)} KB).`,
      "",
      problems.length
        ? `**${problems.length} thing${problems.length === 1 ? "" : "s"} worth fixing**\n${problems.map((p) => `• ${p}`).join("\n")}`.slice(0, 3800)
        : "✅ Nothing obviously wrong: permissions look right and every saved ID resolves.",
    ].join("\n"),
  });

  const sent = await discordRest.editOriginalWithFile(
    discordEnv.appId,
    token,
    { embeds: [summary], allowed_mentions: { parse: [] } },
    { name: `discord-server-${new Date().toISOString().slice(0, 10)}.json`, content: json },
  );
  // The attachment is the bulky half, not the useful half - if Discord refuses
  // it, the problem list is still worth delivering on its own.
  if (!sent.ok) await finish(token, summary);
}

export async function deferredSetupLevels(token: string) {
  const res = await setupLevelRoles();
  if (!res.ok) return finish(token, errorEmbed(SETUP_ERRORS[res.error ?? ""] ?? "Setup failed."));
  await finish(
    token,
    setupSummary("🎖️ Milestone level roles ready", res),
  );
}

export async function deferredSetupVerification(
  channelId: string,
  welcomeChannelId: string | undefined,
  logChannelId: string | undefined,
  captcha: boolean,
  token: string,
) {
  const roles = await setupVerificationRoles();
  if (!roles.ok) return finish(token, errorEmbed(SETUP_ERRORS[roles.error ?? ""] ?? "Setup failed."));

  await botDb.patchConfig("verification", {
    enabled: true,
    mode: captcha ? "captcha" : "button",
    ...(welcomeChannelId ? { welcome_channel_id: welcomeChannelId } : {}),
    ...(logChannelId ? { log_channel_id: logChannelId } : {}),
  });

  const posted = await postVerificationPanel(channelId);
  const summary = setupSummary("🛡️ Verification ready", roles);
  summary.description = [
    summary.description,
    posted.ok ? `✅ Panel posted in <#${channelId}>` : "⚠️ Couldn't post the panel - do I have Send Messages there?",
    roles.unverified
      ? `\n**One manual step:** in Server Settings → Roles, deny **View Channel** for <@&${roles.unverified}> (or @everyone) on the channels newcomers shouldn't see, and allow it for <@&${roles.verified ?? ""}>.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  await finish(token, summary);
}

export async function deferredSetupTickets(
  channelId: string,
  categoryId: string | undefined,
  staffRoleId: string | undefined,
  logChannelId: string | undefined,
  token: string,
) {
  await botDb.patchConfig("tickets", {
    enabled: true,
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(staffRoleId ? { staff_role_id: staffRoleId } : {}),
    ...(logChannelId ? { log_channel_id: logChannelId } : {}),
  });
  const posted = await postTicketPanel(channelId);
  await finish(
    token,
    posted.ok
      ? brandEmbed({
          title: "🎫 Ticket system ready",
          description: [
            `Panel posted in <#${channelId}>.`,
            categoryId ? `Tickets open under <#${categoryId}>.` : "Tickets open at the top of the channel list (no category set).",
            staffRoleId ? `<@&${staffRoleId}> can see every ticket.` : "⚠️ No staff role set - only admins will see tickets.",
            logChannelId ? `Transcripts go to <#${logChannelId}>.` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        })
      : errorEmbed("Couldn't post the ticket panel - check my permissions in that channel."),
  );
}

export async function deferredSetupStats(existingOnlineChannel: string | undefined, token: string) {
  if (existingOnlineChannel) {
    const cfg = await getBotConfig("stats");
    await botDb.patchConfig("stats", {
      enabled: true,
      channels: { ...cfg.channels, online: existingOnlineChannel },
    });
  }
  const res = await setupStatsChannels();
  if (!res.ok) return finish(token, errorEmbed(SETUP_ERRORS[res.error ?? ""] ?? "Setup failed."));
  const refreshed = await refreshStatChannels();
  const summary = setupSummary("📊 Live counters ready", res);
  summary.description = [
    summary.description,
    `Updated now: ${refreshed.updated.length || 0} channel(s).`,
    "Counters refresh every 10 minutes (Discord rate-limits channel renames).",
  ].join("\n");
  await finish(token, summary);
}

export async function deferredSetupModlog(channelId: string, token: string) {
  await botDb.patchConfig("moderation", { log_channel_id: channelId });
  await finish(
    token,
    brandEmbed({ title: "🛡️ Mod log set", description: `Moderation actions will be logged to <#${channelId}>.` }),
  );
}

export async function deferredRefreshStats(token: string) {
  const res = await refreshStatChannels();
  await finish(
    token,
    res.ok
      ? brandEmbed({
          title: "📊 Counters refreshed",
          description: `Updated: ${res.updated.join(", ") || "none"}\nUnchanged: ${res.skipped.join(", ") || "none"}`,
        })
      : errorEmbed("No counter channels configured yet - run `/setup stats` first."),
  );
}

export async function deferredSetupStatus(token: string) {
  const [verification, tickets, stats, levelRoles, moderation, leveling] = await Promise.all([
    getBotConfig("verification"),
    getBotConfig("tickets"),
    getBotConfig("stats"),
    getBotConfig("level_roles"),
    getBotConfig("moderation"),
    botDb.getConfig("leveling"),
  ]);
  const tick = (on: unknown) => (on ? "✅" : "⬜");
  const chan = (id: string | null | undefined) => (id ? `<#${id}>` : "_not set_");

  await finish(
    token,
    brandEmbed({
      title: "🔧 Bot setup status",
      fields: [
        {
          name: "🛡️ Verification (replaces Appy)",
          value: [
            `${tick(verification.enabled)} enabled · mode: \`${verification.mode}\``,
            `Verified role: ${verification.verified_role_id ? `<@&${verification.verified_role_id}>` : "_not set_"}`,
            `Panel: ${chan(verification.panel_channel_id)} · Welcome: ${chan(verification.welcome_channel_id)}`,
          ].join("\n"),
        },
        {
          name: "🎫 Tickets (replaces Sapphire)",
          value: [
            `${tick(tickets.enabled)} enabled`,
            `Category: ${chan(tickets.category_id)} · Staff: ${tickets.staff_role_id ? `<@&${tickets.staff_role_id}>` : "_not set_"}`,
            `Transcripts: ${chan(tickets.log_channel_id)}`,
          ].join("\n"),
        },
        {
          name: "⚖️ Moderation",
          value: `Mod log: ${chan(moderation.log_channel_id)} · DM on action: ${tick(moderation.dm_on_action)} · Automod: ${tick(moderation.automod.enabled)}`,
        },
        {
          name: "⭐ Leveling (replaces Arcane)",
          value: [
            `${tick((leveling as { enabled?: boolean } | null)?.enabled ?? true)} XP enabled`,
            `Milestone roles created: ${Object.keys(levelRoles.roles ?? {}).length}/${(levelRoles.milestones ?? []).length}`,
          ].join("\n"),
        },
        {
          name: "📊 Live counters (replaces ServerStats)",
          value: [
            `Online players: ${chan(stats.channels.online)}`,
            `Members: ${chan(stats.channels.members)} · Plays today: ${chan(stats.channels.plays)}`,
          ].join("\n"),
        },
      ],
      description: "Run `/setup levels`, `/setup verification`, `/setup tickets`, `/setup stats` and `/setup modlog` to fill in the gaps.",
    }),
  );
}
