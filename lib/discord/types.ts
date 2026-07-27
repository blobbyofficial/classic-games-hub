/**
 * Minimal shapes for the Discord interaction payloads this bot handles.
 * Shared by the interactions route and the component/modal handlers.
 */

export const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
  MessageComponent: 3,
  ModalSubmit: 5,
} as const;

export const InteractionResponseType = {
  Pong: 1,
  ChannelMessage: 4,
  DeferredChannelMessage: 5,
  DeferredUpdateMessage: 6,
  UpdateMessage: 7,
  Modal: 9,
} as const;

export const EPHEMERAL = 64;

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  bot?: boolean;
}

export interface InteractionOption {
  name: string;
  value?: string | number | boolean;
}

export interface InteractionMember {
  user: DiscordUser;
  permissions?: string;
  roles?: string[];
  joined_at?: string;
}

export interface ModalComponentRow {
  components?: { custom_id?: string; value?: string }[];
}

export interface Interaction {
  type: number;
  id: string;
  token: string;
  guild_id?: string;
  channel_id?: string;
  application_id?: string;
  data?: {
    name?: string;
    custom_id?: string;
    component_type?: number;
    options?: InteractionOption[];
    components?: ModalComponentRow[];
    resolved?: { users?: Record<string, DiscordUser> };
  };
  member?: InteractionMember;
  user?: DiscordUser;
  message?: { id: string };
}

export interface Embed {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  image?: { url: string };
  timestamp?: string;
}

/** Message component shapes (buttons only — that's all the bot needs). */
export const ButtonStyle = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5,
} as const;

export interface Button {
  type: 2;
  style: (typeof ButtonStyle)[keyof typeof ButtonStyle];
  label: string;
  custom_id?: string;
  url?: string;
  emoji?: { name: string };
}

export interface ActionRow {
  type: 1;
  components: (Button | Record<string, unknown>)[];
}

export function row(...components: (Button | Record<string, unknown>)[]): ActionRow {
  return { type: 1, components };
}

export function button(
  custom_id: string,
  label: string,
  style: Button["style"] = ButtonStyle.Success,
  emoji?: string,
): Button {
  return { type: 2, style, label, custom_id, ...(emoji ? { emoji: { name: emoji } } : {}) };
}

/** Custom IDs used by the persistent panels. */
export const CustomId = {
  Verify: "cgh:verify",
  VerifyModal: "cgh:verify_modal",
  TicketOpen: "cgh:ticket_open",
  TicketClose: "cgh:ticket_close",
  TicketConfirmClose: "cgh:ticket_close_confirm",
} as const;
