import "server-only";
import { botDb, type RoleState } from "./bot-db";
import { discordEnv } from "./env";
import { discordRest } from "./rest";

/**
 * Role synchronisation — the website is the source of truth.
 *
 * The admin-editable `role_sync.role_map` (discord_bot_config) maps Hub facts
 * to Discord role ids. Supported keys:
 *
 *   __linked__           the member has linked their Hub account
 *   __staff__            admins and moderators
 *   __admin__            admins only
 *   __moderator__        moderators only
 *   <award-slug>         an owned badge or unlocked achievement slug
 *   nameplate-<slug>     the equipped nameplate
 *   hub-level-<N>        website level N or higher
 *   discord-level-<N>    Discord chat level N or higher
 *
 * Only role ids present in the map are ever added or removed, so the bot can
 * never touch roles it doesn't manage. Banned Hub accounts lose every managed
 * role.
 */

export interface RoleSyncOutcome {
  ok: boolean;
  error?:
    | "disabled"
    | "no_role_map"
    | "not_configured"
    | "not_in_guild"
    | "state_unavailable"
    | "missing_permissions";
  added: string[];
  removed: string[];
  failed: string[];
}

export function computeDesiredRoleKeys(state: RoleState): Set<string> {
  const keys = new Set<string>();
  if (state.is_banned) return keys; // banned = no managed roles at all
  if (state.linked) {
    keys.add("__linked__");
    if (state.role === "admin") {
      keys.add("__admin__");
      keys.add("__staff__");
    } else if (state.role === "moderator") {
      keys.add("__moderator__");
      keys.add("__staff__");
    }
    for (const slug of state.badges ?? []) keys.add(slug);
    for (const slug of state.achievements ?? []) keys.add(slug);
    if (state.nameplate) keys.add(`nameplate-${state.nameplate}`);
  }
  return keys;
}

function levelKeySatisfied(key: string, state: RoleState): boolean {
  const hub = key.match(/^hub-level-(\d+)$/);
  if (hub) return state.linked && (state.hub_level ?? 0) >= Number(hub[1]);
  const dis = key.match(/^discord-level-(\d+)$/);
  if (dis) return (state.discord_level ?? 0) >= Number(dis[1]);
  return false;
}

/** Reconcile one member's Discord roles with their Hub state. */
export async function syncMemberRoles(discordId: string): Promise<RoleSyncOutcome> {
  const none: Omit<RoleSyncOutcome, "ok" | "error"> = { added: [], removed: [], failed: [] };
  if (!discordEnv.botToken || !discordEnv.guildId) {
    return { ok: false, error: "not_configured", ...none };
  }

  const cfg = await botDb.getConfig("role_sync");
  if (cfg && cfg.enabled === false) return { ok: false, error: "disabled", ...none };
  const roleMap = (cfg?.role_map ?? {}) as Record<string, string>;
  const managed = new Set(Object.values(roleMap).filter(Boolean));
  if (managed.size === 0) return { ok: false, error: "no_role_map", ...none };

  const state = await botDb.roleState(discordId);
  if (!state?.ok) return { ok: false, error: "state_unavailable", ...none };

  const member = await discordRest.getGuildMember(discordEnv.guildId, discordId);
  if (!member.ok || !member.data) {
    // 404 = the user isn't in the server (yet) — that's fine, nothing to do.
    return {
      ok: false,
      error: member.status === 403 ? "missing_permissions" : "not_in_guild",
      ...none,
    };
  }

  // Stamp Discord-booster status onto the Hub profile (powers booster perks
  // and tenure badges) — best-effort, and only for linked members.
  if (state.linked) {
    await botDb.setBooster(discordId, member.data.premium_since ?? null);
  }

  const desiredKeys = computeDesiredRoleKeys(state);
  if (state.linked && !state.is_banned && member.data.premium_since) {
    desiredKeys.add("__booster__");
  }
  const desired = new Set<string>();
  for (const [key, roleId] of Object.entries(roleMap)) {
    if (!roleId) continue;
    if (desiredKeys.has(key) || (!state.is_banned && levelKeySatisfied(key, state))) {
      desired.add(roleId);
    }
  }

  const current = new Set(member.data.roles);
  const added: string[] = [];
  const removed: string[] = [];
  const failed: string[] = [];

  for (const roleId of desired) {
    if (current.has(roleId)) continue;
    const res = await discordRest.addMemberRole(discordEnv.guildId, discordId, roleId, "Hub role sync");
    // 403 = role above the bot / missing Manage Roles; 404 = role deleted.
    (res.ok ? added : failed).push(roleId);
  }
  for (const roleId of managed) {
    if (desired.has(roleId) || !current.has(roleId)) continue;
    const res = await discordRest.removeMemberRole(
      discordEnv.guildId,
      discordId,
      roleId,
      "Hub role sync",
    );
    (res.ok ? removed : failed).push(roleId);
  }

  return { ok: true, added, removed, failed };
}

/**
 * Reconcile every linked member (nightly cron). Serial with a small delay to
 * stay far inside Discord's rate limits; capped by the caller's time budget.
 */
export async function syncAllMembers(maxMembers = 500): Promise<{
  scanned: number;
  changed: number;
  errors: number;
}> {
  const ids = (await botDb.allLinked()) ?? [];
  let changed = 0;
  let errors = 0;
  const slice = ids.slice(0, maxMembers);
  for (const id of slice) {
    const res = await syncMemberRoles(id);
    if (res.ok && (res.added.length || res.removed.length)) changed++;
    if (!res.ok && res.error !== "not_in_guild") {
      errors++;
      // Config-level failures affect everyone — stop early instead of
      // hammering the API with the same error N times.
      if (res.error === "no_role_map" || res.error === "not_configured" || res.error === "disabled") break;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return { scanned: slice.length, changed, errors };
}
