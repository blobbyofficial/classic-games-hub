/**
 * Slash-command definitions for the serverless bot, in Discord's raw REST
 * shape. Registered by POSTing to /api/discord/register (see that route).
 */

const USER = 6; // ApplicationCommandOptionType.User
const INTEGER = 4;
const STRING = 3;
const CHANNEL = 7;
const ROLE = 8;
const BOOLEAN = 5;

const KICK_MEMBERS = String(1n << 1n);
const BAN_MEMBERS = String(1n << 2n);
const MANAGE_CHANNELS = String(1n << 4n);
const MANAGE_GUILD = String(1n << 5n);
const MANAGE_MESSAGES = String(1n << 13n);
const MODERATE_MEMBERS = String(1n << 40n);

const TEXT_CHANNEL = 0;
const VOICE_CHANNEL = 2;
const CATEGORY_CHANNEL = 4;

export const SLASH_COMMANDS = [
  {
    name: "link",
    description: "Link your Discord account to your Classic Games Hub account.",
  },
  {
    name: "unlink",
    description: "Unlink your Discord account from your Classic Games Hub account.",
  },
  {
    name: "profile",
    description: "Show a player's Classic Games Hub profile.",
    options: [{ type: USER, name: "user", description: "Whose profile (defaults to you)" }],
  },
  {
    name: "balance",
    description: "Check your Classic Games Hub credits and level.",
  },
  {
    name: "daily",
    description: "Claim your daily credit reward.",
  },
  {
    name: "pay",
    description: "Send credits to another player.",
    options: [
      { type: USER, name: "user", description: "Who to pay", required: true },
      { type: INTEGER, name: "amount", description: "How many credits", required: true, min_value: 1 },
    ],
  },
  {
    name: "rank",
    description: "Your Discord chat level, XP and server rank.",
    options: [{ type: USER, name: "user", description: "Whose rank (defaults to you)" }],
  },
  {
    name: "level",
    description: "Check your level, XP and next milestone reward.",
    options: [{ type: USER, name: "user", description: "Whose level (defaults to you)" }],
  },
  {
    name: "rewards",
    description: "Every level milestone and the role you get for reaching it.",
  },
  {
    name: "levels",
    description: "The Discord chat-level leaderboard.",
  },
  {
    name: "leaderboard",
    description: "The top players on Classic Games Hub.",
  },
  {
    name: "sync",
    description: "Sync your Discord roles with your Hub account.",
  },
  {
    name: "help",
    description: "What can this bot do?",
  },
  {
    name: "warn",
    description: "Warn a member (DMs them and logs to the Hub audit trail).",
    default_member_permissions: MODERATE_MEMBERS,
    dm_permission: false,
    options: [
      { type: USER, name: "user", description: "Member to warn", required: true },
      { type: STRING, name: "reason", description: "Reason", required: true },
    ],
  },
  {
    name: "timeout",
    description: "Time a member out (mute) for a number of minutes.",
    default_member_permissions: MODERATE_MEMBERS,
    dm_permission: false,
    options: [
      { type: USER, name: "user", description: "Member", required: true },
      {
        type: INTEGER,
        name: "minutes",
        description: "Duration in minutes",
        required: true,
        min_value: 1,
        max_value: 40320,
      },
      { type: STRING, name: "reason", description: "Reason" },
    ],
  },
  {
    name: "ban",
    description: "Ban a member from the server.",
    default_member_permissions: BAN_MEMBERS,
    dm_permission: false,
    options: [
      { type: USER, name: "user", description: "Member", required: true },
      { type: STRING, name: "reason", description: "Reason" },
    ],
  },
  {
    name: "kick",
    description: "Kick a member from the server.",
    default_member_permissions: KICK_MEMBERS,
    dm_permission: false,
    options: [
      { type: USER, name: "user", description: "Member", required: true },
      { type: STRING, name: "reason", description: "Reason" },
    ],
  },
  {
    name: "unban",
    description: "Lift a ban.",
    default_member_permissions: BAN_MEMBERS,
    dm_permission: false,
    options: [
      { type: STRING, name: "user_id", description: "The banned user's ID", required: true },
      { type: STRING, name: "reason", description: "Reason" },
    ],
  },
  {
    name: "untimeout",
    description: "End a member's timeout early.",
    default_member_permissions: MODERATE_MEMBERS,
    dm_permission: false,
    options: [{ type: USER, name: "user", description: "Member", required: true }],
  },
  {
    name: "purge",
    description: "Bulk-delete recent messages in this channel.",
    default_member_permissions: MANAGE_MESSAGES,
    dm_permission: false,
    options: [
      {
        type: INTEGER,
        name: "count",
        description: "How many messages (1–100)",
        required: true,
        min_value: 1,
        max_value: 100,
      },
      { type: USER, name: "user", description: "Only delete this member's messages" },
    ],
  },
  {
    name: "slowmode",
    description: "Set this channel's slowmode.",
    default_member_permissions: MANAGE_CHANNELS,
    dm_permission: false,
    options: [
      {
        type: INTEGER,
        name: "seconds",
        description: "Seconds between messages (0 turns it off)",
        required: true,
        min_value: 0,
        max_value: 21600,
      },
    ],
  },
  {
    name: "lock",
    description: "Stop everyone sending messages in this channel.",
    default_member_permissions: MANAGE_CHANNELS,
    dm_permission: false,
    options: [{ type: STRING, name: "reason", description: "Reason" }],
  },
  {
    name: "unlock",
    description: "Re-open a locked channel.",
    default_member_permissions: MANAGE_CHANNELS,
    dm_permission: false,
  },
  {
    name: "warnings",
    description: "A member's moderation history.",
    default_member_permissions: MODERATE_MEMBERS,
    dm_permission: false,
    options: [{ type: USER, name: "user", description: "Member", required: true }],
  },
  {
    name: "announce",
    description: "Post an announcement embed to a channel.",
    default_member_permissions: MANAGE_GUILD,
    dm_permission: false,
    options: [
      {
        type: CHANNEL,
        name: "channel",
        description: "Where to post",
        required: true,
        channel_types: [TEXT_CHANNEL],
      },
      { type: STRING, name: "message", description: "The announcement (use \\n for line breaks)", required: true },
      { type: STRING, name: "title", description: "Embed title" },
      { type: ROLE, name: "ping", description: "Role to ping" },
      { type: STRING, name: "image", description: "Image URL" },
      { type: BOOLEAN, name: "plain", description: "Post as plain text instead of an embed" },
    ],
  },
  {
    name: "ticket",
    description: "Open a private support ticket.",
    dm_permission: false,
    options: [{ type: STRING, name: "subject", description: "What do you need help with?" }],
  },
  {
    name: "close",
    description: "Close the ticket in this channel.",
    dm_permission: false,
  },
  {
    name: "verify",
    description: "Verify yourself and unlock the server.",
    dm_permission: false,
  },
  {
    name: "setup",
    description: "One-command server setup for the Hub bot.",
    default_member_permissions: MANAGE_GUILD,
    dm_permission: false,
    options: [
      {
        type: 1, // sub-command
        name: "levels",
        description: "Create the milestone level roles (Level 1, 5, 10, …).",
      },
      {
        type: 1,
        name: "verification",
        description: "Create the Verified/Unverified roles and post the verify panel.",
        options: [
          {
            type: CHANNEL,
            name: "channel",
            description: "Channel for the verify panel",
            required: true,
            channel_types: [TEXT_CHANNEL],
          },
          {
            type: CHANNEL,
            name: "welcome_channel",
            description: "Where to post welcome messages",
            channel_types: [TEXT_CHANNEL],
          },
          {
            type: CHANNEL,
            name: "log_channel",
            description: "Where to log verifications",
            channel_types: [TEXT_CHANNEL],
          },
          { type: BOOLEAN, name: "captcha", description: "Ask a maths question instead of a plain button" },
        ],
      },
      {
        type: 1,
        name: "tickets",
        description: "Post the ticket panel and configure the ticket system.",
        options: [
          {
            type: CHANNEL,
            name: "channel",
            description: "Channel for the ticket panel",
            required: true,
            channel_types: [TEXT_CHANNEL],
          },
          {
            type: CHANNEL,
            name: "category",
            description: "Category new tickets are created in",
            channel_types: [CATEGORY_CHANNEL],
          },
          { type: ROLE, name: "staff_role", description: "Role that can see tickets" },
          {
            type: CHANNEL,
            name: "log_channel",
            description: "Where transcripts are posted",
            channel_types: [TEXT_CHANNEL],
          },
        ],
      },
      {
        type: 1,
        name: "stats",
        description: "Create the live counter voice channels (online players, plays today…).",
        options: [
          {
            type: CHANNEL,
            name: "online_channel",
            description: "Existing voice channel to use for the online counter",
            channel_types: [VOICE_CHANNEL],
          },
        ],
      },
      {
        type: 1,
        name: "modlog",
        description: "Set the channel moderation actions are logged to.",
        options: [
          {
            type: CHANNEL,
            name: "channel",
            description: "Mod-log channel",
            required: true,
            channel_types: [TEXT_CHANNEL],
          },
        ],
      },
      {
        type: 1,
        name: "refresh-stats",
        description: "Update the counter channel names right now.",
      },
      {
        type: 1,
        name: "status",
        description: "What's configured, what's missing.",
      },
    ],
  },
];
