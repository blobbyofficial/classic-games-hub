import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { botDb } from "./bot-db";
import { getBotConfig, template, type TicketsConfig, type VerificationConfig } from "./config";
import { discordEnv } from "./env";
import { ChannelType, Permissions, discordRest, type PermissionOverwrite } from "./rest";
import { syncMemberRoles } from "./role-sync";
import {
  ButtonStyle,
  CustomId,
  EPHEMERAL,
  InteractionResponseType,
  button,
  row,
  type Embed,
  type Interaction,
} from "./types";

/**
 * Button + modal handlers for the two persistent panels: join verification
 * (the Appy replacement) and support tickets (the Sapphire replacement).
 * Both are pure HTTP interactions, so they run serverlessly alongside the
 * slash commands — no gateway process involved.
 */

import { BRAND_COLOR, brandEmbed } from "./embeds";

const DISCORD_EPOCH = 1420070400000n;

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://classic-games-hub.blobbyofficial.com";

const brand = brandEmbed;

function fail(message: string): Embed {
  return { color: 0xef4444, description: `❌ ${message}` };
}

function invoker(i: Interaction) {
  const u = i.member?.user ?? i.user;
  return {
    id: u?.id ?? "",
    username: u?.username ?? "player",
    name: u?.global_name ?? u?.username ?? "player",
  };
}

/** Account creation time encoded in a Discord snowflake. */
export function snowflakeDate(id: string): Date | null {
  try {
    return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));
  } catch {
    return null;
  }
}

async function editOriginal(token: string, embeds: Embed[]) {
  await discordRest.editOriginalResponse(discordEnv.appId, token, { embeds });
}

async function log(channelId: string | null, embed: Embed) {
  if (!channelId) return;
  await discordRest.createMessage(channelId, { embeds: [embed] });
}

// ── Captcha signing ──────────────────────────────────────────────────
// The expected answer never travels to the client: the modal's custom_id
// carries an HMAC of it, keyed with the bot token, and we re-derive the MAC
// from whatever the user types.

function answerMac(answer: string): string {
  return createHmac("sha256", discordEnv.botToken || "cgh-fallback")
    .update(answer.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

function macMatches(answer: string, mac: string): boolean {
  const a = Buffer.from(answerMac(answer));
  const b = Buffer.from(mac);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Challenge {
  question: string;
  answer: string;
}

function makeChallenge(): Challenge {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  return { question: `What is ${a} + ${b}?`, answer: String(a + b) };
}

// ── Panels ───────────────────────────────────────────────────────────

export function verificationPanel(cfg: VerificationConfig) {
  return {
    embeds: [brand({ title: cfg.panel_title, description: cfg.panel_body })],
    components: [
      row(button(CustomId.Verify, cfg.button_label || "Verify me", ButtonStyle.Success, "✅")),
    ],
  };
}

export function ticketPanel(cfg: TicketsConfig) {
  return {
    embeds: [brand({ title: cfg.panel_title, description: cfg.panel_body })],
    components: [
      row(button(CustomId.TicketOpen, cfg.button_label || "Open a ticket", ButtonStyle.Primary, "🎫")),
    ],
  };
}

// ── Verification ─────────────────────────────────────────────────────

/** Synchronous response to the Verify button: either a modal or a defer. */
export async function handleVerifyClick() {
  const cfg = await getBotConfig("verification");
  if (!cfg.enabled) {
    return {
      type: InteractionResponseType.ChannelMessage,
      data: { embeds: [fail("Verification is currently disabled.")], flags: EPHEMERAL },
    };
  }
  if (cfg.mode !== "captcha") {
    return { type: InteractionResponseType.DeferredChannelMessage, data: { flags: EPHEMERAL } };
  }

  const challenge = makeChallenge();
  return {
    type: InteractionResponseType.Modal,
    data: {
      custom_id: `${CustomId.VerifyModal}:${answerMac(challenge.answer)}`,
      title: "Quick check",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4, // text input
              custom_id: "answer",
              style: 1,
              label: challenge.question.slice(0, 45),
              placeholder: "Type the number",
              required: true,
              max_length: 8,
            },
          ],
        },
      ],
    },
  };
}

/** The actual verification work — runs after the response is sent. */
export async function deferredVerify(interaction: Interaction, method: "button" | "captcha") {
  const me = invoker(interaction);
  const cfg = await getBotConfig("verification");
  const guildId = interaction.guild_id || discordEnv.guildId;

  if (cfg.min_account_age_hours > 0) {
    const created = snowflakeDate(me.id);
    const ageHours = created ? (Date.now() - created.getTime()) / 3_600_000 : Infinity;
    if (ageHours < cfg.min_account_age_hours) {
      await editOriginal(interaction.token, [
        fail(
          `Your Discord account is too new to verify here. Accounts must be at least **${cfg.min_account_age_hours} hour(s)** old.`,
        ),
      ]);
      await log(
        cfg.log_channel_id,
        fail(`Blocked verification for <@${me.id}> — account age below the minimum.`),
      );
      return;
    }
  }

  const res = await botDb.verifyMember(me.id, me.name, method);
  if (!res?.ok) {
    await editOriginal(interaction.token, [
      fail(res?.error === "disabled" ? "Verification is currently disabled." : "Couldn't verify you — try again shortly."),
    ]);
    return;
  }

  const problems: string[] = [];
  if (cfg.verified_role_id) {
    const add = await discordRest.addMemberRole(guildId, me.id, cfg.verified_role_id, "Verified");
    if (!add.ok) problems.push("couldn't add the verified role");
  }
  if (cfg.unverified_role_id) {
    await discordRest.removeMemberRole(guildId, me.id, cfg.unverified_role_id, "Verified");
  }

  // Linked members get their Hub roles straight away too.
  void syncMemberRoles(me.id).catch(() => undefined);

  const description = [
    cfg.success_message || "You're verified — welcome in! 🎮",
    problems.length ? `\n⚠️ Almost: ${problems.join(", ")}. Ping a staff member.` : "",
    res.linked ? "" : `\nTip: run \`/link\` to connect your **${siteUrl().replace(/^https?:\/\//, "")}** account.`,
  ]
    .filter(Boolean)
    .join("\n");

  await editOriginal(interaction.token, [brand({ title: "✅ Verified", description })]);

  if (res.first_time) {
    await log(
      cfg.log_channel_id,
      brand({
        title: "✅ Member verified",
        description: `<@${me.id}> (\`${me.username}\`) verified via ${method}.`,
        timestamp: new Date().toISOString(),
      }),
    );
    if (cfg.welcome_channel_id && cfg.welcome_message) {
      const counts = await discordRest.getGuildCounts(guildId);
      await discordRest.createMessage(cfg.welcome_channel_id, {
        content: template(cfg.welcome_message, {
          user: `<@${me.id}>`,
          username: me.username,
          server: "the server",
          count: counts.data?.approximate_member_count ?? 0,
          site: siteUrl(),
        }),
        allowed_mentions: { parse: ["users"] },
      });
    }
  }
}

/** Modal submit for the captcha flow. Returns true when the answer was right. */
export function checkCaptcha(interaction: Interaction): boolean {
  const mac = (interaction.data?.custom_id ?? "").split(":")[2] ?? "";
  const answer =
    interaction.data?.components?.[0]?.components?.find((c) => c.custom_id === "answer")?.value ?? "";
  if (!mac || !answer) return false;
  return macMatches(answer, mac);
}

export async function deferredCaptchaFailed(interaction: Interaction) {
  await editOriginal(interaction.token, [
    fail("That wasn't the right answer. Press the button and try again."),
  ]);
}

// ── Tickets ──────────────────────────────────────────────────────────

function ticketOverwrites(
  guildId: string,
  openerId: string,
  staffRoleId: string | null,
): PermissionOverwrite[] {
  const member =
    Permissions.ViewChannel |
    Permissions.SendMessages |
    Permissions.ReadMessageHistory |
    Permissions.AttachFiles |
    Permissions.EmbedLinks |
    Permissions.AddReactions;
  const overwrites: PermissionOverwrite[] = [
    { id: guildId, type: 0, allow: "0", deny: String(Permissions.ViewChannel) },
    { id: openerId, type: 1, allow: String(member), deny: "0" },
  ];
  if (staffRoleId) overwrites.push({ id: staffRoleId, type: 0, allow: String(member), deny: "0" });
  return overwrites;
}

export async function deferredTicketOpen(interaction: Interaction, subject: string | null = null) {
  const me = invoker(interaction);
  const cfg = await getBotConfig("tickets");
  const guildId = interaction.guild_id || discordEnv.guildId;

  if (!cfg.enabled) {
    await editOriginal(interaction.token, [fail("Tickets are currently disabled.")]);
    return;
  }

  const open = await botDb.openTicketCount(me.id);
  if (open && cfg.max_open_per_user > 0 && open.count >= cfg.max_open_per_user) {
    await editOriginal(interaction.token, [
      fail(
        `You already have an open ticket: ${open.channels.map((c) => `<#${c}>`).join(", ")}. Close it before opening another.`,
      ),
    ]);
    return;
  }

  const number = open?.next ?? 1;
  const created = await discordRest.createChannel(
    guildId,
    {
      name: `ticket-${String(number).padStart(4, "0")}`,
      type: ChannelType.GuildText,
      parent_id: cfg.category_id ?? undefined,
      topic: `Ticket #${number} • opened by ${me.username} (${me.id})`,
      permission_overwrites: ticketOverwrites(guildId, me.id, cfg.staff_role_id),
    },
    `Ticket opened by ${me.username}`,
  );

  if (!created.ok || !created.data) {
    await editOriginal(interaction.token, [
      fail(
        created.status === 403
          ? "I need the **Manage Channels** permission to open tickets."
          : "Couldn't open a ticket right now — please ping a staff member.",
      ),
    ]);
    return;
  }

  await botDb.ticketOpen(created.data.id, me.id, me.name, subject);

  await discordRest.createMessage(created.data.id, {
    content: `<@${me.id}>${cfg.staff_role_id ? ` <@&${cfg.staff_role_id}>` : ""}`,
    embeds: [
      brand({
        title: `🎫 Ticket #${number}`,
        description: template(cfg.open_message, { user: `<@${me.id}>`, username: me.username }),
        ...(subject ? { fields: [{ name: "Subject", value: subject.slice(0, 1000) }] } : {}),
      }),
    ],
    components: [row(button(CustomId.TicketClose, "Close ticket", ButtonStyle.Danger, "🔒"))],
    allowed_mentions: { parse: ["users", "roles"] },
  });

  await editOriginal(interaction.token, [
    brand({ title: "🎫 Ticket opened", description: `Head over to <#${created.data.id}>.` }),
  ]);
}

async function transcript(channelId: string): Promise<string> {
  const msgs = await discordRest.getMessages(channelId, 100);
  if (!msgs.ok || !msgs.data) return "_Transcript unavailable._";
  const lines = [...msgs.data]
    .reverse()
    .filter((m) => m.content)
    .map((m) => `[${new Date(m.timestamp).toISOString().slice(0, 16).replace("T", " ")}] ${m.author.username}: ${m.content}`);
  const text = lines.join("\n");
  return text.length > 3800 ? `…\n${text.slice(-3800)}` : text || "_No messages._";
}

export async function deferredTicketClose(interaction: Interaction) {
  const me = invoker(interaction);
  const cfg = await getBotConfig("tickets");
  const channelId = interaction.channel_id ?? "";

  const res = await botDb.ticketClose(channelId, me.id);
  if (!res?.ok) {
    await editOriginal(interaction.token, [
      fail(
        res?.error === "already_closed"
          ? "This ticket is already closed."
          : "This channel isn't a ticket.",
      ),
    ]);
    return;
  }

  if (cfg.log_channel_id) {
    const body = await transcript(channelId);
    await discordRest.createMessage(cfg.log_channel_id, {
      embeds: [
        brand({
          title: `🎫 Ticket #${res.ticket} closed`,
          description: `Opened by <@${res.opener}> • closed by <@${me.id}>${res.subject ? `\nSubject: ${res.subject}` : ""}`,
          timestamp: new Date().toISOString(),
        }),
      ],
    });
    await discordRest.createMessage(cfg.log_channel_id, {
      content: `\`\`\`\n${body.replace(/```/g, "`​``").slice(0, 1900)}\n\`\`\``,
      allowed_mentions: { parse: [] },
    });
  }

  await editOriginal(interaction.token, [
    brand({ title: "🔒 Ticket closed", description: "This channel will be deleted in a few seconds." }),
  ]);
  await discordRest.createMessage(channelId, {
    embeds: [brand({ description: `🔒 Ticket closed by <@${me.id}>. Deleting this channel…` })],
  });
  await new Promise((r) => setTimeout(r, 5000));
  await discordRest.deleteChannel(channelId, `Ticket closed by ${me.username}`);
}
