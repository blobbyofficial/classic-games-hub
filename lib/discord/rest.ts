import { discordEnv } from "./env";

/**
 * Minimal Discord REST client for the serverless bot. Uses the bot token;
 * every helper returns a discriminated result instead of throwing so callers
 * can degrade gracefully on missing permissions, unknown members, etc.
 */

const API = "https://discord.com/api/v10";

export interface RestResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function discordFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<RestResult<T>> {
  if (!discordEnv.botToken) return { ok: false, status: 0, error: "bot_token_missing" };
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${discordEnv.botToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (res.status === 204) return { ok: true, status: 204 };
    const body = await res.json().catch(() => undefined);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (body as { message?: string } | undefined)?.message ?? `http_${res.status}`,
      };
    }
    return { ok: true, status: res.status, data: body as T };
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
}

export interface GuildMember {
  user?: { id: string; username: string; global_name?: string | null };
  roles: string[];
  communication_disabled_until?: string | null;
}

export interface GuildRole {
  id: string;
  name: string;
  position: number;
}

export const discordRest = {
  getGuildMember: (guildId: string, userId: string) =>
    discordFetch<GuildMember>(`/guilds/${guildId}/members/${userId}`),

  listGuildRoles: (guildId: string) => discordFetch<GuildRole[]>(`/guilds/${guildId}/roles`),

  addMemberRole: (guildId: string, userId: string, roleId: string, reason: string) =>
    discordFetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: "PUT",
      headers: { "X-Audit-Log-Reason": reason },
    }),

  removeMemberRole: (guildId: string, userId: string, roleId: string, reason: string) =>
    discordFetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": reason },
    }),

  timeoutMember: (guildId: string, userId: string, untilIso: string | null, reason: string) =>
    discordFetch(`/guilds/${guildId}/members/${userId}`, {
      method: "PATCH",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify({ communication_disabled_until: untilIso }),
    }),

  banMember: (guildId: string, userId: string, reason: string) =>
    discordFetch(`/guilds/${guildId}/bans/${userId}`, {
      method: "PUT",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify({ delete_message_seconds: 0 }),
    }),

  /** DM a user (best-effort — users can have DMs closed). */
  async dmUser(userId: string, content: string): Promise<RestResult> {
    const channel = await discordFetch<{ id: string }>(`/users/@me/channels`, {
      method: "POST",
      body: JSON.stringify({ recipient_id: userId }),
    });
    if (!channel.ok || !channel.data) return channel;
    return discordFetch(`/channels/${channel.data.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  /** Edit the original response of a deferred interaction. */
  editOriginalResponse: (appId: string, token: string, payload: unknown) =>
    discordFetch(`/webhooks/${appId}/${token}/messages/@original`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
