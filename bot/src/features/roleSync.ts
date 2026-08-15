import type { GuildMember } from "discord.js";
import { db, type RoleState } from "../db.js";
import { getConfig } from "../hubConfig.js";

/**
 * Join-time / level-up role sync. Mirrors lib/discord/role-sync.ts on the
 * website: the role map and the milestone level roles live in Supabase and the
 * website is the source of truth. This runs when a member joins (or rejoins)
 * and right after a level-up, so rewards land immediately.
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

export interface SyncOutcome {
  added: string[];
  removed: string[];
}

export async function syncMemberRoles(member: GuildMember): Promise<SyncOutcome> {
  const outcome: SyncOutcome = { added: [], removed: [] };
  const cfg = await getConfig();
  if (cfg.role_sync.enabled === false) return outcome;

  const map = cfg.role_sync.role_map ?? {};
  const milestoneRoles = cfg.level_roles.enabled ? (cfg.level_roles.roles ?? {}) : {};
  const managed = new Set([...Object.values(map), ...Object.values(milestoneRoles)].filter(Boolean));
  if (managed.size === 0) return outcome;

  const state = await db.roleState(member.id);
  if (!state?.ok) return outcome;

  // Mirror the website's sync exactly (lib/discord/role-sync.ts): boost status
  // is stamped onto the Hub profile, and `__booster__` is a mappable key. The
  // two implementations drifting is how a member ends up with a different set
  // of roles depending on which one happened to run.
  if (state.linked) {
    await db.setBooster(member.id, member.premiumSince?.toISOString() ?? null);
  }

  const keys = desiredKeys(state);
  if (state.linked && !state.is_banned && member.premiumSince) keys.add("__booster__");

  const desired = new Set<string>();
  for (const [key, roleId] of Object.entries(map)) {
    if (!roleId) continue;
    if (keys.has(key) || (!state.is_banned && levelKeySatisfied(key, state))) desired.add(roleId);
  }

  // Milestone level roles - the Arcane-style level rewards.
  if (!state.is_banned && cfg.level_roles.enabled) {
    const earned = [...(cfg.level_roles.milestones ?? [])]
      .filter((m) => (state.discord_level ?? 0) >= m)
      .sort((a, b) => b - a);
    const grant = cfg.level_roles.remove_previous ? earned.slice(0, 1) : earned;
    for (const level of grant) {
      const roleId = milestoneRoles[String(level)];
      if (roleId) desired.add(roleId);
    }
  }

  for (const roleId of desired) {
    if (member.roles.cache.has(roleId)) continue;
    const ok = await member.roles
      .add(roleId, "Hub role sync")
      .then(() => true)
      .catch(() => false);
    if (ok) outcome.added.push(roleId);
  }
  for (const roleId of managed) {
    if (desired.has(roleId) || !member.roles.cache.has(roleId)) continue;
    const ok = await member.roles
      .remove(roleId, "Hub role sync")
      .then(() => true)
      .catch(() => false);
    if (ok) outcome.removed.push(roleId);
  }
  return outcome;
}
