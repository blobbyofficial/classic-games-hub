import type { GuildMember } from "discord.js";
import { config } from "../config.js";
import { db } from "../db.js";

export interface SyncResult {
  ok: boolean;
  error?: string;
  added: string[];
  removed: string[];
}

/**
 * Reconciles a member's Discord roles with their Hub awards using ROLE_MAP.
 * Keys in the map: award slugs (badges/achievements), "__staff__" for
 * admins/mods, and "nameplate-<slug>" for the equipped color role. Only roles
 * that appear in ROLE_MAP are ever touched.
 */
export async function syncMemberRoles(member: GuildMember): Promise<SyncResult> {
  const map = config.roleMap;
  const managed = new Set(Object.values(map));
  if (managed.size === 0) return { ok: false, error: "no_role_map", added: [], removed: [] };

  const awards = await db.userAwards(member.id);
  if (!awards?.ok) return { ok: false, error: awards?.error ?? "not_linked", added: [], removed: [] };

  const earnedKeys = new Set<string>([...(awards.badges ?? []), ...(awards.achievements ?? [])]);
  if (awards.is_staff) earnedKeys.add("__staff__");
  if (awards.nameplate) earnedKeys.add(`nameplate-${awards.nameplate}`);

  const desired = new Set<string>();
  for (const [key, roleId] of Object.entries(map)) {
    if (earnedKeys.has(key)) desired.add(roleId);
  }

  const added: string[] = [];
  const removed: string[] = [];

  for (const roleId of desired) {
    if (!member.roles.cache.has(roleId)) {
      try {
        await member.roles.add(roleId, "Hub award sync");
        added.push(roleId);
      } catch {
        /* missing role or permission — skip */
      }
    }
  }
  for (const roleId of managed) {
    if (!desired.has(roleId) && member.roles.cache.has(roleId)) {
      try {
        await member.roles.remove(roleId, "Hub award sync");
        removed.push(roleId);
      } catch {
        /* skip */
      }
    }
  }

  return { ok: true, added, removed };
}
