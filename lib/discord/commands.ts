/**
 * Slash-command definitions for the serverless bot, in Discord's raw REST
 * shape. Registered by POSTing to /api/discord/register (see that route).
 */

const USER = 6; // ApplicationCommandOptionType.User
const INTEGER = 4;
const STRING = 3;

const MODERATE_MEMBERS = String(1n << 40n);
const BAN_MEMBERS = String(1n << 2n);

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
];
