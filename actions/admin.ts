"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { botDb } from "@/lib/discord/bot-db";
import { syncMemberRoles } from "@/lib/discord/role-sync";
import { requireStaff } from "@/lib/supabase/queries";
import {
  announcementSchema,
  bannerPayloadSchema,
  gameUpsertSchema,
  seasonalEventSchema,
  usernameSchema,
} from "@/lib/validators";
import type { PushSection } from "@/lib/discord/ops";
import type { RpcResult } from "@/types";

export async function adminAdjustCredits(userId: string, amount: number, reason: string): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_adjust_credits", {
    p_user: userId,
    p_amount: Math.trunc(amount),
    p_reason: reason.slice(0, 200) || "Manual adjustment",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adminSetRole(userId: string, role: "user" | "moderator" | "admin"): Promise<RpcResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  // Mirror the change onto their Discord roles (best-effort, post-response).
  after(async () => {
    const discordId = await botDb.discordIdFor(userId);
    if (discordId) await syncMemberRoles(discordId);
  });
  return { ok: true };
}

export async function adminSetUsername(userId: string, newName: string): Promise<RpcResult> {
  await requireStaff();
  const parsed = usernameSchema.safeParse(newName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_username", {
    p_user: userId,
    p_new: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return data as RpcResult;
}

export async function adminSetLevelXp(userId: string, level: number, xp: number): Promise<RpcResult> {
  await requireStaff();
  if (!Number.isFinite(level) || !Number.isFinite(xp)) {
    return { ok: false, error: "Enter valid numbers" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_level_xp", {
    p_user: userId,
    p_level: Math.trunc(level),
    p_xp: Math.trunc(xp),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return data as RpcResult;
}

export async function adminUpdateAnnouncement(id: string, input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      level: parsed.data.level,
      published: parsed.data.published,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function adminDeleteAnnouncement(id: string): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function adminSetBanned(userId: string, banned: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_banned", { p_user: userId, p_banned: banned });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  // Banned accounts lose their managed Discord roles (and get them back on unban).
  after(async () => {
    const discordId = await botDb.discordIdFor(userId);
    if (discordId) await syncMemberRoles(discordId);
  });
  return { ok: true };
}

export async function adminUpsertGame(input: unknown, id?: string): Promise<RpcResult> {
  await requireStaff();
  const parsed = gameUpsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    tagline: parsed.data.tagline || null,
    description: parsed.data.description || null,
  };
  const query = id
    ? supabase.from("games").update(payload).eq("id", id)
    : supabase.from("games").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/games");
  revalidatePath("/games");
  return { ok: true };
}

export async function adminToggleFeatured(id: string, featured: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("games").update({ featured }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/games");
  revalidatePath("/games");
  return { ok: true };
}

export async function adminSetGameStatus(
  id: string,
  status: "published" | "draft" | "archived" | "coming_soon",
): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("games").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/games");
  revalidatePath("/games");
  return { ok: true };
}

export async function adminPublishAnnouncement(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { title, body, level, published, notify, link_label, link_href } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("broadcast_announcement", {
    p_title: title,
    p_body: body,
    p_level: level,
    p_link_label: link_label ?? "",
    p_link_href: link_href ?? "",
    p_publish: published,
    p_notify: Boolean(notify) && published,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/", "layout");
  return data as RpcResult;
}

export async function adminResolveReport(
  id: number,
  status: "resolved" | "dismissed",
): Promise<RpcResult> {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_by: profile.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function adminSetFlag(key: string, enabled: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("feature_flags").update({ enabled }).eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/flags");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminSetSeasonalEvent(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = seasonalEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { enabled, ...payload } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, payload })
    .eq("key", "seasonal_event");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/flags");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminSetBannerPayload(key: string, input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = bannerPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({ payload: parsed.data })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/flags");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Discord bot configuration ──────────────────────────────────────────

const levelingConfigSchema = z.object({
  enabled: z.boolean(),
  xp_min: z.number().int().min(1).max(1000),
  xp_max: z.number().int().min(1).max(1000),
  cooldown_seconds: z.number().int().min(5).max(3600),
  curve_quad: z.number().int().min(0).max(100),
  curve_linear: z.number().int().min(0).max(1000),
  curve_base: z.number().int().min(1).max(10000),
  announce_level_ups: z.boolean(),
  announce_channel_id: z.string().regex(/^\d{5,25}$/).nullable().or(z.literal("").transform(() => null)),
  no_xp_channel_ids: z.array(z.string().regex(/^\d{5,25}$/)).max(50),
  hub_xp_share: z.number().min(0).max(1),
});

const roleSyncConfigSchema = z.object({
  enabled: z.boolean(),
  role_map: z.record(z.string().min(1).max(64), z.string().regex(/^\d{5,25}$/)),
});

/** A Discord snowflake, or null when the field is cleared. */
const snowflake = z
  .string()
  .trim()
  .regex(/^\d{5,25}$/)
  .nullable()
  .or(z.literal("").transform(() => null));

const verificationConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["button", "captcha"]),
  verified_role_id: snowflake,
  unverified_role_id: snowflake,
  panel_channel_id: snowflake,
  log_channel_id: snowflake,
  min_account_age_hours: z.number().int().min(0).max(8760),
  panel_title: z.string().max(200),
  panel_body: z.string().max(2000),
  button_label: z.string().max(80),
  success_message: z.string().max(1000),
  welcome_channel_id: snowflake,
  welcome_message: z.string().max(1000),
  dm_on_join: z.boolean(),
  dm_message: z.string().max(1000),
});

const moderationConfigSchema = z.object({
  log_channel_id: snowflake,
  dm_on_action: z.boolean(),
  automod: z.object({
    enabled: z.boolean(),
    block_invites: z.boolean(),
    block_links: z.boolean(),
    max_mentions: z.number().int().min(0).max(50),
    spam_messages: z.number().int().min(0).max(50),
    spam_window_seconds: z.number().int().min(1).max(120),
    action: z.enum(["delete", "timeout"]),
    timeout_minutes: z.number().int().min(1).max(40320),
    exempt_role_ids: z.array(z.string().regex(/^\d{5,25}$/)).max(50),
    exempt_channel_ids: z.array(z.string().regex(/^\d{5,25}$/)).max(50),
  }),
});

const ticketsConfigSchema = z.object({
  enabled: z.boolean(),
  // Without this the field was silently dropped on every save, so the panel
  // channel could never be remembered and re-posting was impossible.
  panel_channel_id: snowflake,
  category_id: snowflake,
  staff_role_id: snowflake,
  log_channel_id: snowflake,
  panel_title: z.string().max(200),
  panel_body: z.string().max(2000),
  button_label: z.string().max(80),
  open_message: z.string().max(2000),
  max_open_per_user: z.number().int().min(0).max(10),
});

const statsConfigSchema = z.object({
  enabled: z.boolean(),
  channels: z.object({
    online: snowflake,
    members: snowflake,
    plays: snowflake,
    discord_members: snowflake,
  }),
  templates: z.object({
    online: z.string().min(1).max(100),
    members: z.string().min(1).max(100),
    plays: z.string().min(1).max(100),
    discord_members: z.string().min(1).max(100),
  }),
});

const levelRolesConfigSchema = z.object({
  enabled: z.boolean(),
  announce: z.boolean(),
  remove_previous: z.boolean(),
  milestones: z.array(z.number().int().min(1).max(500)).max(50),
  name_template: z.string().min(1).max(80),
  roles: z.record(z.string(), z.string().regex(/^\d{5,25}$/)),
});

const BOT_SECTIONS = {
  verification: verificationConfigSchema,
  moderation: moderationConfigSchema,
  tickets: ticketsConfigSchema,
  stats: statsConfigSchema,
  level_roles: levelRolesConfigSchema,
} as const;

export type BotSection = keyof typeof BOT_SECTIONS;

/** Saves one of the newer bot config sections (migration 0037). */
/**
 * Saves a settings section - and applies it to Discord.
 *
 * Saving used to write to Postgres and stop there, so the dashboard and the
 * server disagreed until someone ran the matching `/setup` command. Now the
 * save is followed by a push, and the result says what actually changed in
 * Discord.
 *
 * The push is best-effort on purpose: the settings are saved either way. A
 * Discord outage or a missing permission must not cost you your edit, so a
 * failed push is reported as a warning against a successful save, not as a
 * failure that leaves you wondering whether to retype everything.
 */
export async function adminSetBotSection(
  section: BotSection,
  input: unknown,
  push = true,
): Promise<RpcResult & { detail?: string; warning?: string }> {
  await requireStaff();
  const schema = BOT_SECTIONS[section];
  if (!schema) return { ok: false, error: "Unknown settings section" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_bot_config", {
    p_key: section,
    p_value: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to save" };
  revalidatePath("/admin/discord");

  if (!push || !PUSHABLE.has(section)) return { ok: true, detail: "Saved." };

  const { pushSection } = await import("@/lib/discord/ops");
  const applied = await pushSection(section as PushSection);
  return {
    ok: true,
    detail: applied.ok ? `Saved and pushed to Discord - ${applied.detail}` : "Saved.",
    warning: applied.ok ? applied.error : `Saved, but couldn't push to Discord: ${applied.error}`,
  };
}

/**
 * Clears every bot setting back to its default.
 *
 * The point is the ids, not the toggles. A dashboard that has been pointed at
 * one server accumulates role, channel, category and panel-message ids, and
 * they are exactly what you cannot fix by editing one field: a stale id is
 * worse than an empty one, because setup reads it as "use that exact channel"
 * and reports it missing rather than creating a replacement. Clearing the lot
 * is the honest way to start again on a new server, or after one was rebuilt.
 *
 * Nothing is touched inside Discord. Roles and channels the bot created stay,
 * and a panel it posted stays where it is - the next setup posts a fresh one
 * rather than editing it, because the message id it would have edited is gone.
 */
export async function adminResetBotConfig(): Promise<RpcResult & { detail?: string }> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_reset_bot_config");
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string; cleared?: string[] } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to reset" };
  revalidatePath("/admin/discord");

  const cleared = res.cleared ?? [];
  return {
    ok: true,
    detail: cleared.length
      ? `Cleared ${cleared.length} section(s): ${cleared.join(", ")}. Every setting is back to its default.`
      : "Nothing to clear - every setting was already at its default.",
  };
}

/**
 * A full snapshot of the Discord server, as JSON, for pasting somewhere it can
 * be read - a support thread, an issue, an assistant.
 *
 * Returned as a formatted string rather than an object because the point is to
 * be copied verbatim. Reformatting it at the boundary would risk the copy and
 * the truth diverging.
 */
export async function adminExportDiscordServer(): Promise<
  RpcResult & { json?: string; problems?: string[] }
> {
  await requireStaff();
  const { exportServer } = await import("@/lib/discord/export");
  const res = await exportServer();
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, json: JSON.stringify(res.data, null, 2), problems: res.data.problems };
}

/** Sections with something to apply in Discord; the rest are read on use. */
const PUSHABLE = new Set<string>(["verification", "level_roles", "tickets", "stats"]);

/** Creates any missing milestone level roles in Discord and stores their IDs. */
export async function adminCreateLevelRoles(): Promise<RpcResult & { detail?: string }> {
  await requireStaff();
  const { setupLevelRoles } = await import("@/lib/discord/setup");
  const res = await setupLevelRoles();
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.error === "missing_permissions"
          ? "The bot needs the Manage Roles permission (and its role must sit above the roles it creates)."
          : "Couldn't reach Discord - check DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.",
    };
  }
  revalidatePath("/admin/discord");
  const summary = [
    `Created ${res.created.length}`,
    `updated ${res.updated.length}`,
    `already correct ${res.reused.length}`,
    `failed ${res.failed.length}`,
  ].join(", ") + ".";
  const missing = res.missing.length
    ? ` Linked roles not found in the server: ${res.missing.join(", ")} - left alone rather than replaced. Clear the ID to have a new one created.`
    : "";
  // Same reasoning as the Discord embed: report what Discord said rather than
  // a guess, so a permissions problem and a role-limit problem look different.
  return {
    ok: true,
    detail: (res.detail ? `${summary} Discord said: ${res.detail}` : summary) + missing,
  };
}

export interface DiscordEnvStatus {
  botToken: boolean;
  appId: boolean;
  publicKey: boolean;
  guildId: boolean;
  cronSecret: boolean;
}

/**
 * Which Discord environment variables are present on this deployment.
 *
 * Booleans only - never the values. Without this, an unset variable surfaces
 * as "could not be verified" from Discord or a generic failure here, and the
 * only way to tell which one is missing is to guess.
 */
export async function adminDiscordEnvStatus(): Promise<DiscordEnvStatus> {
  await requireStaff();
  const { discordEnv } = await import("@/lib/discord/env");
  return {
    botToken: Boolean(discordEnv.botToken),
    appId: Boolean(discordEnv.appId),
    publicKey: Boolean(discordEnv.publicKey),
    guildId: Boolean(discordEnv.guildId),
    cronSecret: Boolean(discordEnv.cronSecret),
  };
}

/**
 * Registers the slash commands with Discord.
 *
 * The same job as POST /api/discord/register, but reachable from the admin UI
 * instead of a terminal - the cron route needs a bearer token, which is fine
 * for a scheduler and awkward for a person. Both call the same Discord
 * endpoint with the same command set, so either route is safe to use.
 *
 * Registration is a full replace (PUT), so running it twice is harmless - it
 * is how you push a changed command set, not something that accumulates.
 */
export async function adminRegisterSlashCommands(): Promise<RpcResult & { detail?: string }> {
  await requireStaff();
  const { SLASH_COMMANDS } = await import("@/lib/discord/commands");
  const { discordEnv } = await import("@/lib/discord/env");

  if (!discordEnv.botToken || !discordEnv.appId) {
    return { ok: false, error: "Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID first." };
  }

  // Guild-scoped registration appears instantly; global can take up to an hour.
  const path = discordEnv.guildId
    ? `/applications/${discordEnv.appId}/guilds/${discordEnv.guildId}/commands`
    : `/applications/${discordEnv.appId}/commands`;

  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${discordEnv.botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(SLASH_COMMANDS),
  }).catch(() => null);

  if (!res) return { ok: false, error: "Couldn't reach Discord. Try again in a moment." };
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      error:
        res.status === 401
          ? "Discord rejected the bot token - check DISCORD_BOT_TOKEN."
          : `Discord returned ${res.status}. ${detail.slice(0, 200)}`,
    };
  }

  return {
    ok: true,
    detail: discordEnv.guildId
      ? `Registered ${SLASH_COMMANDS.length} commands to your server - they appear immediately.`
      : `Registered ${SLASH_COMMANDS.length} commands globally - Discord can take up to an hour to show them.`,
  };
}

/** Renames the live counter channels right now. */
export async function adminRefreshStatChannels(): Promise<RpcResult & { detail?: string }> {
  await requireStaff();
  const { refreshStatChannels } = await import("@/lib/discord/setup");
  const res = await refreshStatChannels();
  if (!res.ok) return { ok: false, error: "No counter channels configured yet." };
  return {
    ok: true,
    detail: `Updated ${res.updated.length} channel(s); ${res.skipped.length} already current.`,
  };
}

export async function adminSetBotLeveling(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = levelingConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.xp_max < parsed.data.xp_min) {
    return { ok: false, error: "Max XP must be at least the min XP" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_bot_config", {
    p_key: "leveling",
    p_value: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to save" };
  revalidatePath("/admin/discord");
  return { ok: true };
}

export async function adminSetBotRoleSync(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = roleSyncConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Role map must map award keys to Discord role IDs" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_bot_config", {
    p_key: "role_sync",
    p_value: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to save" };
  revalidatePath("/admin/discord");
  return { ok: true };
}

export async function adminRunFullRoleSync(): Promise<RpcResult & { detail?: string }> {
  await requireStaff();
  const { syncAllMembers } = await import("@/lib/discord/role-sync");
  const result = await syncAllMembers(200);
  return {
    ok: true,
    detail: `Scanned ${result.scanned} linked member(s); updated ${result.changed}; ${result.errors} error(s).`,
  };
}

// ── Community mega-events ──────────────────────────────────────────────

export async function adminCreateCommunityEvent(input: {
  title: string;
  description: string;
  target: number;
  reward: number;
  hours: number;
}): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_community_event", {
    p_title: input.title,
    p_description: input.description,
    p_target: Math.trunc(input.target),
    p_reward: Math.trunc(input.reward),
    p_hours: Math.trunc(input.hours),
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed" };
  revalidatePath("/admin/events");
  revalidatePath("/");
  return { ok: true };
}

export async function adminEndCommunityEvent(id: string): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_end_community_event", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/events");
  revalidatePath("/");
  return { ok: true };
}

// ── Admin-configured site surfaces (home layout, roadmap override) ──

const HOME_SECTIONS = ["event", "daily", "recent", "featured", "categories", "all_games"] as const;

const homeLayoutSchema = z.object({
  order: z.array(z.enum(HOME_SECTIONS)).max(10),
  hidden: z.array(z.enum(HOME_SECTIONS)).max(10),
});

const roadmapItemSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  status: z.enum(["shipped", "in-progress", "next", "later", "idea"]).optional(),
});
const roadmapOverrideSchema = z.object({
  releases: z
    .array(
      z.object({
        version: z.string().min(1).max(20),
        codename: z.string().min(1).max(60),
        status: z.enum(["shipped", "in-progress", "next", "later", "idea"]),
        timeframe: z.string().min(1).max(60),
        summary: z.string().min(1).max(1000),
        groups: z.array(
          z.object({
            heading: z.string().min(1).max(80),
            icon: z.string().min(1).max(40),
            blurb: z.string().max(500).optional(),
            items: z.array(roadmapItemSchema).max(40),
          }),
        ).max(20),
      }),
    )
    .max(20),
});

const FLAG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  home_layout: homeLayoutSchema,
  roadmap_override: roadmapOverrideSchema,
};

export async function adminSetFlagConfig(
  key: "home_layout" | "roadmap_override",
  enabled: boolean,
  payload: unknown,
): Promise<RpcResult> {
  await requireStaff();
  const schema = FLAG_SCHEMAS[key];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue.path.join(".") || "payload"}: ${issue.message}` };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, payload: parsed.data as import("@/types/database").Json })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/site");
  revalidatePath("/", "layout");
  revalidatePath("/roadmap");
  return { ok: true };
}

/**
 * One-click full Discord setup: registers commands, creates the roles and
 * counter channels, and posts the panels, reporting on each step.
 *
 * Safe to run repeatedly - every underlying step reuses what already exists
 * rather than duplicating it, so this doubles as a "fix whatever is missing"
 * button after a permission change.
 */
export async function adminRunFullDiscordSetup() {
  await requireStaff();
  const { runFullSetup } = await import("@/lib/discord/setup");
  const res = await runFullSetup();
  revalidatePath("/admin/discord");
  return res;
}

/**
 * Puts a game into booster early access for a number of days, or opens it now
 * when `days` is 0.
 *
 * Days rather than a date picker: "out early for a week" is how the decision is
 * actually made, and it removes any chance of typing a date in the past and
 * silently shipping a game that is already open.
 */
export async function adminSetEarlyAccess(id: string, days: number): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const until =
    days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
  const { error } = await supabase.from("games").update({ early_access_until: until }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/games");
  revalidatePath("/games");
  revalidatePath("/", "layout");
  return { ok: true, until };
}
