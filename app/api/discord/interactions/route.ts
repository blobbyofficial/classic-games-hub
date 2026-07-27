import { NextResponse, after } from "next/server";
import { verifyDiscordRequest } from "@/lib/discord/verify";
import { discordEnv } from "@/lib/discord/env";
import {
  checkCaptcha,
  deferredCaptchaFailed,
  deferredTicketClose,
  deferredTicketOpen,
  deferredVerify,
  handleVerifyClick,
} from "@/lib/discord/components";
import {
  handleLink,
  handleUnlink,
  handleProfile,
  handleBalance,
  handleDaily,
  handlePay,
  handleRank,
  handleLevel,
  handleRewards,
  handleLevels,
  handleLeaderboard,
  handleHelp,
  handleWarnings,
  deferredSync,
  deferredWarn,
  deferredTimeout,
  deferredUntimeout,
  deferredBan,
  deferredKick,
  deferredUnban,
  deferredPurge,
  deferredSlowmode,
  deferredLock,
  deferredAnnounce,
  deferredSetupLevels,
  deferredSetupVerification,
  deferredSetupTickets,
  deferredSetupStats,
  deferredSetupModlog,
  deferredRefreshStats,
  deferredSetupStatus,
  reply,
  errorEmbed,
} from "@/lib/discord/handlers";
import {
  CustomId,
  EPHEMERAL,
  InteractionResponseType,
  InteractionType,
  type Interaction,
  type InteractionOption,
} from "@/lib/discord/types";

/**
 * Discord "Interactions Endpoint URL" — the serverless heart of the Classic
 * Games Hub bot. Set this route's public URL in the Discord Developer Portal
 * (General Information → Interactions Endpoint URL):
 *
 *   https://<your-domain>/api/discord/interactions
 *
 * Discord signs every request with Ed25519; anything unverifiable is rejected
 * with 401 (Discord requires this to activate the endpoint). Slash commands,
 * the verification button, the captcha modal and the ticket panel all run
 * entirely on Vercel — no hosted gateway process is needed for any of them.
 */

export const runtime = "nodejs";

/** Belt-and-braces permission check on top of default_member_permissions. */
function hasPermission(i: Interaction, bit: bigint): boolean {
  const perms = i.member?.permissions;
  if (!perms) return false;
  try {
    return (BigInt(perms) & bit) === bit;
  } catch {
    return false;
  }
}
const KICK_MEMBERS = 1n << 1n;
const BAN_MEMBERS = 1n << 2n;
const MANAGE_CHANNELS = 1n << 4n;
const MANAGE_GUILD = 1n << 5n;
const MANAGE_MESSAGES = 1n << 13n;
const MODERATE_MEMBERS = 1n << 40n;

const deferEphemeral = () =>
  NextResponse.json({
    type: InteractionResponseType.DeferredChannelMessage,
    data: { flags: EPHEMERAL },
  });

const denied = (permission: string) =>
  NextResponse.json(reply([errorEmbed(`You need the **${permission}** permission for that.`)], true));

function opt<T>(options: InteractionOption[] | undefined, name: string): T | undefined {
  return options?.find((o) => o.name === name)?.value as T | undefined;
}

function invoker(i: Interaction) {
  const u = i.member?.user ?? i.user;
  return { id: u?.id ?? "", name: u?.global_name ?? u?.username ?? "player" };
}

function resolvedUser(i: Interaction, id: string | undefined) {
  if (!id) return undefined;
  return i.data?.resolved?.users?.[id];
}

function displayName(i: Interaction, id: string | undefined, fallback: string) {
  const u = resolvedUser(i, id);
  return u?.global_name ?? u?.username ?? fallback;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = await verifyDiscordRequest(
    discordEnv.publicKey,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    rawBody,
  );
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as Interaction;

  // PING → PONG (Discord's endpoint validation).
  if (interaction.type === InteractionType.Ping) {
    return NextResponse.json({ type: InteractionResponseType.Pong });
  }

  try {
    if (interaction.type === InteractionType.MessageComponent) {
      return await handleComponent(interaction);
    }
    if (interaction.type === InteractionType.ModalSubmit) {
      return handleModal(interaction);
    }
    if (interaction.type === InteractionType.ApplicationCommand && interaction.data?.name) {
      return await handleCommand(interaction);
    }
    return NextResponse.json(reply([errorEmbed("Unsupported interaction.")], true));
  } catch (err) {
    console.error(
      `[discord] interaction ${interaction.data?.name ?? interaction.data?.custom_id} errored:`,
      err,
    );
    return NextResponse.json(reply([errorEmbed("Something went wrong running that.")], true));
  }
}

// ── Buttons & modals (verification panel, ticket panel) ──────────────

async function handleComponent(interaction: Interaction) {
  const customId = interaction.data?.custom_id ?? "";

  if (customId === CustomId.Verify) {
    const response = await handleVerifyClick();
    // A modal opens the captcha flow; a defer means "verify me now".
    if (response.type === InteractionResponseType.DeferredChannelMessage) {
      after(() => deferredVerify(interaction, "button"));
    }
    return NextResponse.json(response);
  }

  if (customId === CustomId.TicketOpen) {
    after(() => deferredTicketOpen(interaction));
    return deferEphemeral();
  }

  if (customId === CustomId.TicketClose) {
    after(() => deferredTicketClose(interaction));
    return deferEphemeral();
  }

  return NextResponse.json(reply([errorEmbed("That button isn't wired up any more.")], true));
}

function handleModal(interaction: Interaction) {
  const customId = interaction.data?.custom_id ?? "";
  if (customId.startsWith(CustomId.VerifyModal)) {
    const passed = checkCaptcha(interaction);
    after(() =>
      passed ? deferredVerify(interaction, "captcha") : deferredCaptchaFailed(interaction),
    );
    return deferEphemeral();
  }
  return NextResponse.json(reply([errorEmbed("Unknown form.")], true));
}

// ── Slash commands ───────────────────────────────────────────────────

async function handleCommand(interaction: Interaction) {
  const me = invoker(interaction);
  const name = interaction.data?.name ?? "";
  const options = interaction.data?.options;
  const token = interaction.token;
  const guildId = interaction.guild_id ?? discordEnv.guildId;
  const channelId = interaction.channel_id ?? "";

  switch (name) {
    case "link":
      return NextResponse.json(await handleLink(me.id, me.name));
    case "unlink":
      return NextResponse.json(await handleUnlink(me.id));
    case "profile": {
      const targetId = opt<string>(options, "user") ?? me.id;
      return NextResponse.json(
        await handleProfile(targetId, displayName(interaction, targetId, me.name), targetId === me.id),
      );
    }
    case "balance":
      return NextResponse.json(await handleBalance(me.id));
    case "daily":
      return NextResponse.json(await handleDaily(me.id));
    case "pay": {
      const toId = opt<string>(options, "user") ?? "";
      const amount = Number(opt<number>(options, "amount") ?? 0);
      return NextResponse.json(
        await handlePay(me.id, toId, Boolean(resolvedUser(interaction, toId)?.bot), amount),
      );
    }
    case "rank": {
      const targetId = opt<string>(options, "user") ?? me.id;
      return NextResponse.json(await handleRank(targetId, displayName(interaction, targetId, me.name)));
    }
    case "level": {
      const targetId = opt<string>(options, "user") ?? me.id;
      return NextResponse.json(
        await handleLevel(targetId, displayName(interaction, targetId, me.name), targetId === me.id),
      );
    }
    case "rewards":
      return NextResponse.json(await handleRewards());
    case "levels":
      return NextResponse.json(await handleLevels());
    case "leaderboard":
      return NextResponse.json(await handleLeaderboard());
    case "help":
      return NextResponse.json(handleHelp());

    // ── Verification & tickets ──
    case "verify": {
      if (!interaction.guild_id) {
        return NextResponse.json(reply([errorEmbed("Use this in the server.")], true));
      }
      after(() => deferredVerify(interaction, "button"));
      return deferEphemeral();
    }
    case "ticket": {
      if (!interaction.guild_id) {
        return NextResponse.json(reply([errorEmbed("Use this in the server.")], true));
      }
      const subject = opt<string>(options, "subject") ?? null;
      after(() => deferredTicketOpen(interaction, subject));
      return deferEphemeral();
    }
    case "close": {
      after(() => deferredTicketClose(interaction));
      return deferEphemeral();
    }

    // ── Deferred: reply now, do the REST work after the response is sent ──
    case "sync": {
      if (!interaction.guild_id) {
        return NextResponse.json(reply([errorEmbed("Use this in the server.")], true));
      }
      after(() => deferredSync(me.id, token));
      return deferEphemeral();
    }
    case "warn": {
      if (!hasPermission(interaction, MODERATE_MEMBERS)) return denied("Moderate Members");
      const targetId = opt<string>(options, "user") ?? "";
      const reason = String(opt<string>(options, "reason") ?? "");
      const targetName = displayName(interaction, targetId, "member");
      after(() => deferredWarn(me, targetId, targetName, reason, "the Classic Games Hub server", token));
      return deferEphemeral();
    }
    case "timeout": {
      if (!hasPermission(interaction, MODERATE_MEMBERS)) return denied("Moderate Members");
      const targetId = opt<string>(options, "user") ?? "";
      const minutes = Number(opt<number>(options, "minutes") ?? 0);
      const reason = String(opt<string>(options, "reason") ?? "No reason given");
      after(() =>
        deferredTimeout(me, targetId, displayName(interaction, targetId, "member"), minutes, reason, token),
      );
      return deferEphemeral();
    }
    case "untimeout": {
      if (!hasPermission(interaction, MODERATE_MEMBERS)) return denied("Moderate Members");
      const targetId = opt<string>(options, "user") ?? "";
      after(() => deferredUntimeout(me, targetId, displayName(interaction, targetId, "member"), token));
      return deferEphemeral();
    }
    case "ban": {
      if (!hasPermission(interaction, BAN_MEMBERS)) return denied("Ban Members");
      const targetId = opt<string>(options, "user") ?? "";
      const reason = String(opt<string>(options, "reason") ?? "No reason given");
      after(() => deferredBan(me, targetId, displayName(interaction, targetId, "member"), reason, token));
      return deferEphemeral();
    }
    case "kick": {
      if (!hasPermission(interaction, KICK_MEMBERS)) return denied("Kick Members");
      const targetId = opt<string>(options, "user") ?? "";
      const reason = String(opt<string>(options, "reason") ?? "No reason given");
      after(() => deferredKick(me, targetId, displayName(interaction, targetId, "member"), reason, token));
      return deferEphemeral();
    }
    case "unban": {
      if (!hasPermission(interaction, BAN_MEMBERS)) return denied("Ban Members");
      const targetId = String(opt<string>(options, "user_id") ?? "").trim();
      const reason = String(opt<string>(options, "reason") ?? "No reason given");
      after(() => deferredUnban(me, targetId, reason, token));
      return deferEphemeral();
    }
    case "warnings": {
      if (!hasPermission(interaction, MODERATE_MEMBERS)) return denied("Moderate Members");
      const targetId = opt<string>(options, "user") ?? "";
      return NextResponse.json(
        await handleWarnings(targetId, displayName(interaction, targetId, "member")),
      );
    }
    case "purge": {
      if (!hasPermission(interaction, MANAGE_MESSAGES)) return denied("Manage Messages");
      const count = Number(opt<number>(options, "count") ?? 0);
      const onlyUser = opt<string>(options, "user");
      after(() => deferredPurge(me, channelId, count, onlyUser, token));
      return deferEphemeral();
    }
    case "slowmode": {
      if (!hasPermission(interaction, MANAGE_CHANNELS)) return denied("Manage Channels");
      const seconds = Number(opt<number>(options, "seconds") ?? 0);
      after(() => deferredSlowmode(channelId, seconds, token));
      return deferEphemeral();
    }
    case "lock":
    case "unlock": {
      if (!hasPermission(interaction, MANAGE_CHANNELS)) return denied("Manage Channels");
      const reason = String(opt<string>(options, "reason") ?? "Channel moderation");
      after(() => deferredLock(me, guildId, channelId, name === "lock", reason, token));
      return deferEphemeral();
    }
    case "announce": {
      if (!hasPermission(interaction, MANAGE_GUILD)) return denied("Manage Server");
      after(() =>
        deferredAnnounce(
          opt<string>(options, "channel") ?? channelId,
          String(opt<string>(options, "message") ?? ""),
          opt<string>(options, "title"),
          opt<string>(options, "ping"),
          opt<string>(options, "image"),
          Boolean(opt<boolean>(options, "plain")),
          me,
          token,
        ),
      );
      return deferEphemeral();
    }
    case "setup": {
      if (!hasPermission(interaction, MANAGE_GUILD)) return denied("Manage Server");
      return handleSetup(interaction, token);
    }
    default:
      return NextResponse.json(reply([errorEmbed("Unknown command.")], true));
  }
}

/** `/setup <sub-command>` — a sub-command carries its own nested options. */
function handleSetup(interaction: Interaction, token: string) {
  const sub = interaction.data?.options?.[0] as
    | { name: string; options?: InteractionOption[] }
    | undefined;
  const subOptions = sub?.options;

  switch (sub?.name) {
    case "levels":
      after(() => deferredSetupLevels(token));
      break;
    case "verification":
      after(() =>
        deferredSetupVerification(
          opt<string>(subOptions, "channel") ?? interaction.channel_id ?? "",
          opt<string>(subOptions, "welcome_channel"),
          opt<string>(subOptions, "log_channel"),
          Boolean(opt<boolean>(subOptions, "captcha")),
          token,
        ),
      );
      break;
    case "tickets":
      after(() =>
        deferredSetupTickets(
          opt<string>(subOptions, "channel") ?? interaction.channel_id ?? "",
          opt<string>(subOptions, "category"),
          opt<string>(subOptions, "staff_role"),
          opt<string>(subOptions, "log_channel"),
          token,
        ),
      );
      break;
    case "stats":
      after(() => deferredSetupStats(opt<string>(subOptions, "online_channel"), token));
      break;
    case "modlog":
      after(() => deferredSetupModlog(opt<string>(subOptions, "channel") ?? "", token));
      break;
    case "refresh-stats":
      after(() => deferredRefreshStats(token));
      break;
    case "status":
      after(() => deferredSetupStatus(token));
      break;
    default:
      return NextResponse.json(reply([errorEmbed("Unknown setup step.")], true));
  }
  return deferEphemeral();
}
