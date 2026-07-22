import { NextResponse, after } from "next/server";
import { verifyDiscordRequest } from "@/lib/discord/verify";
import { discordEnv } from "@/lib/discord/env";
import {
  handleLink,
  handleUnlink,
  handleProfile,
  handleBalance,
  handleDaily,
  handlePay,
  handleRank,
  handleLevels,
  handleLeaderboard,
  handleHelp,
  deferredSync,
  deferredWarn,
  deferredTimeout,
  deferredBan,
  reply,
  errorEmbed,
} from "@/lib/discord/handlers";

/**
 * Discord "Interactions Endpoint URL" — the serverless heart of the Classic
 * Games Hub bot. Set this route's public URL in the Discord Developer Portal
 * (General Information → Interactions Endpoint URL):
 *
 *   https://<your-domain>/api/discord/interactions
 *
 * Discord signs every request with Ed25519; anything unverifiable is rejected
 * with 401 (Discord requires this to activate the endpoint). Slash commands
 * run entirely on Vercel — no hosted gateway process is needed.
 */

export const runtime = "nodejs";

const EPHEMERAL = 64;

interface InteractionOption {
  name: string;
  value?: string | number | boolean;
}

interface Interaction {
  type: number;
  token: string;
  guild_id?: string;
  data?: {
    name?: string;
    options?: InteractionOption[];
    resolved?: { users?: Record<string, { id: string; bot?: boolean; username: string; global_name?: string | null }> };
  };
  member?: {
    user: { id: string; username: string; global_name?: string | null };
    permissions?: string;
  };
  user?: { id: string; username: string; global_name?: string | null };
}

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
const MODERATE_MEMBERS = 1n << 40n;
const BAN_MEMBERS = 1n << 2n;

function opt<T>(i: Interaction, name: string): T | undefined {
  return i.data?.options?.find((o) => o.name === name)?.value as T | undefined;
}

function invoker(i: Interaction) {
  const u = i.member?.user ?? i.user;
  return { id: u?.id ?? "", name: u?.global_name ?? u?.username ?? "player" };
}

function resolvedUser(i: Interaction, id: string | undefined) {
  if (!id) return undefined;
  return i.data?.resolved?.users?.[id];
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
  if (interaction.type === 1) return NextResponse.json({ type: 1 });

  // Only application commands beyond this point.
  if (interaction.type !== 2 || !interaction.data?.name) {
    return NextResponse.json({ type: 4, data: { content: "Unsupported interaction.", flags: EPHEMERAL } });
  }

  const me = invoker(interaction);
  const name = interaction.data.name;

  try {
    switch (name) {
      case "link":
        return NextResponse.json(await handleLink(me.id, me.name));
      case "unlink":
        return NextResponse.json(await handleUnlink(me.id));
      case "profile": {
        const targetId = opt<string>(interaction, "user") ?? me.id;
        const target = resolvedUser(interaction, targetId);
        return NextResponse.json(
          await handleProfile(targetId, target?.global_name ?? target?.username ?? me.name, targetId === me.id),
        );
      }
      case "balance":
        return NextResponse.json(await handleBalance(me.id));
      case "daily":
        return NextResponse.json(await handleDaily(me.id));
      case "pay": {
        const toId = opt<string>(interaction, "user") ?? "";
        const amount = Number(opt<number>(interaction, "amount") ?? 0);
        const to = resolvedUser(interaction, toId);
        return NextResponse.json(await handlePay(me.id, toId, Boolean(to?.bot), amount));
      }
      case "rank": {
        const targetId = opt<string>(interaction, "user") ?? me.id;
        const target = resolvedUser(interaction, targetId);
        return NextResponse.json(
          await handleRank(targetId, target?.global_name ?? target?.username ?? me.name),
        );
      }
      case "levels":
        return NextResponse.json(await handleLevels());
      case "leaderboard":
        return NextResponse.json(await handleLeaderboard());
      case "help":
        return NextResponse.json(handleHelp());

      // Deferred: reply now, do the REST work after the response is sent.
      case "sync": {
        if (!interaction.guild_id) {
          return NextResponse.json(reply([errorEmbed("Use this in the server.")], true));
        }
        after(() => deferredSync(me.id, interaction.token));
        return NextResponse.json({ type: 5, data: { flags: EPHEMERAL } });
      }
      case "warn": {
        if (!hasPermission(interaction, MODERATE_MEMBERS)) {
          return NextResponse.json(reply([errorEmbed("You need the Moderate Members permission.")], true));
        }
        const targetId = opt<string>(interaction, "user") ?? "";
        const reason = String(opt<string>(interaction, "reason") ?? "");
        after(() => deferredWarn(me.id, targetId, reason, "the Classic Games Hub server", interaction.token));
        return NextResponse.json({ type: 5, data: { flags: EPHEMERAL } });
      }
      case "timeout": {
        if (!hasPermission(interaction, MODERATE_MEMBERS)) {
          return NextResponse.json(reply([errorEmbed("You need the Moderate Members permission.")], true));
        }
        const targetId = opt<string>(interaction, "user") ?? "";
        const minutes = Number(opt<number>(interaction, "minutes") ?? 0);
        const reason = String(opt<string>(interaction, "reason") ?? "No reason given");
        after(() => deferredTimeout(me.id, targetId, minutes, reason, interaction.token));
        return NextResponse.json({ type: 5, data: { flags: EPHEMERAL } });
      }
      case "ban": {
        if (!hasPermission(interaction, BAN_MEMBERS)) {
          return NextResponse.json(reply([errorEmbed("You need the Ban Members permission.")], true));
        }
        const targetId = opt<string>(interaction, "user") ?? "";
        const reason = String(opt<string>(interaction, "reason") ?? "No reason given");
        after(() => deferredBan(me.id, targetId, reason, interaction.token));
        return NextResponse.json({ type: 5, data: { flags: EPHEMERAL } });
      }
      default:
        return NextResponse.json(reply([errorEmbed("Unknown command.")], true));
    }
  } catch (err) {
    console.error(`[discord] command ${name} errored:`, err);
    return NextResponse.json(reply([errorEmbed("Something went wrong running that command.")], true));
  }
}
