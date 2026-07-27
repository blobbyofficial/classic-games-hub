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
  premium_since?: string | null;
  communication_disabled_until?: string | null;
}

export interface GuildRole {
  id: string;
  name: string;
  position: number;
  color?: number;
  managed?: boolean;
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  position?: number;
}

export interface PermissionOverwrite {
  id: string;
  /** 0 = role, 1 = member. */
  type: 0 | 1;
  allow: string;
  deny: string;
}

/** The channel types we create or touch. */
export const ChannelType = {
  GuildText: 0,
  GuildVoice: 2,
  GuildCategory: 4,
} as const;

/** Permission bits used by the ticket system and channel lockdowns. */
export const Permissions = {
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  ReadMessageHistory: 1n << 16n,
  AttachFiles: 1n << 15n,
  EmbedLinks: 1n << 14n,
  AddReactions: 1n << 6n,
  Connect: 1n << 20n,
} as const;

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

  kickMember: (guildId: string, userId: string, reason: string) =>
    discordFetch(`/guilds/${guildId}/members/${userId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": reason },
    }),

  unbanMember: (guildId: string, userId: string, reason: string) =>
    discordFetch(`/guilds/${guildId}/bans/${userId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": reason },
    }),

  createRole: (
    guildId: string,
    body: { name: string; color?: number; hoist?: boolean; permissions?: string; mentionable?: boolean },
    reason: string,
  ) =>
    discordFetch<GuildRole>(`/guilds/${guildId}/roles`, {
      method: "POST",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify({ permissions: "0", ...body }),
    }),

  listGuildChannels: (guildId: string) =>
    discordFetch<GuildChannel[]>(`/guilds/${guildId}/channels`),

  createChannel: (
    guildId: string,
    body: {
      name: string;
      type: number;
      parent_id?: string | null;
      topic?: string;
      permission_overwrites?: PermissionOverwrite[];
    },
    reason: string,
  ) =>
    discordFetch<GuildChannel>(`/guilds/${guildId}/channels`, {
      method: "POST",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify(body),
    }),

  getChannel: (channelId: string) => discordFetch<GuildChannel>(`/channels/${channelId}`),

  modifyChannel: (
    channelId: string,
    body: Record<string, unknown>,
    reason = "Classic Games Hub bot",
  ) =>
    discordFetch<GuildChannel>(`/channels/${channelId}`, {
      method: "PATCH",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify(body),
    }),

  deleteChannel: (channelId: string, reason: string) =>
    discordFetch(`/channels/${channelId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": reason },
    }),

  editChannelPermissions: (
    channelId: string,
    overwriteId: string,
    body: { type: 0 | 1; allow?: string; deny?: string },
    reason: string,
  ) =>
    discordFetch(`/channels/${channelId}/permissions/${overwriteId}`, {
      method: "PUT",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify(body),
    }),

  createMessage: (channelId: string, payload: unknown) =>
    discordFetch<{ id: string }>(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMessages: (channelId: string, limit: number) =>
    discordFetch<{ id: string; timestamp: string; content: string; author: { username: string; bot?: boolean } }[]>(
      `/channels/${channelId}/messages?limit=${Math.min(100, Math.max(1, limit))}`,
    ),

  /** Bulk delete (Discord refuses messages older than 14 days). */
  bulkDelete: (channelId: string, ids: string[], reason: string) =>
    discordFetch(`/channels/${channelId}/messages/bulk-delete`, {
      method: "POST",
      headers: { "X-Audit-Log-Reason": reason },
      body: JSON.stringify({ messages: ids }),
    }),

  deleteMessage: (channelId: string, messageId: string, reason: string) =>
    discordFetch(`/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": reason },
    }),

  /** Guild with approximate member/presence counts (for stat counters). */
  getGuildCounts: (guildId: string) =>
    discordFetch<{ approximate_member_count?: number; approximate_presence_count?: number }>(
      `/guilds/${guildId}?with_counts=true`,
    ),

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
