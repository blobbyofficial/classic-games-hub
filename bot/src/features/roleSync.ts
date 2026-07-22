import type { GuildMember } from "discord.js";
import { db, type RoleState, type RoleSyncConfig } from "../db.js";

/**
 * Join-time role sync. Mirrors lib/discord/role-sync.ts on the website: the
 * role map lives in Supabase (discord_bot_config.role_sync) and the website
 * is the source of truth. This runs when a member joins (or rejoins) the
 * server so linked players get their roles back immediately.
 */

function desiredKeys(state: RoleState): Set<string> {
  const keys = new Set<string>();
  if (state.is_banned) return keys;
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

export async function syncMemberRoles(member: GuildMember): Promise<void> {
  const cfg = await db.getConfig<RoleSyncConfig>("role_sync");
  if (!cfg || cfg.enabled === false) return;
  const map = cfg.role_map ?? {};
  const managed = new Set(Object.values(map).filter(Boolean));
  if (managed.size === 0) return;

  const state = await db.roleState(member.id);
  if (!state?.ok) return;

  const keys = desiredKeys(state);
  const desired = new Set<string>();
  for (const [key, roleId] of Object.entries(map)) {
    if (!roleId) continue;
    if (keys.has(key) || (!state.is_banned && levelKeySatisfied(key, state))) desired.add(roleId);
  }

  for (const roleId of desired) {
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId, "Hub role sync").catch(() => undefined);
    }
  }
  for (const roleId of managed) {
    if (!desired.has(roleId) && member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId, "Hub role sync").catch(() => undefined);
    }
  }
}
