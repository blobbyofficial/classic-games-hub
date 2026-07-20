import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { db } from "../db.js";
import { brandEmbed, errorEmbed } from "../lib/embeds.js";
import type { Command } from "../types.js";

const warn: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member (DMs them and logs to the Hub audit trail).")
    .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    await db.logMod(interaction.user.id, target.id, "warn", reason);
    try {
      await target.send(`⚠️ You were warned in **${interaction.guild?.name}**: ${reason}`);
    } catch {
      /* DMs closed */
    }
    await interaction.editReply({
      embeds: [brandEmbed().setTitle("⚠️ Warned").setDescription(`${target} — ${reason}`)],
    });
  },
};

const timeout: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Time a member out (mute) for a number of minutes.")
    .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("minutes").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser("user", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "No reason given";
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.editReply({ embeds: [errorEmbed("That member isn't in this server.")] });
      return;
    }
    if (!member.moderatable) {
      await interaction.editReply({ embeds: [errorEmbed("I can't time out that member.")] });
      return;
    }
    await member.timeout(minutes * 60_000, reason);
    await db.logMod(interaction.user.id, target.id, "timeout", `${minutes}m — ${reason}`);
    await interaction.editReply({
      embeds: [brandEmbed().setTitle("🔇 Timed out").setDescription(`${target} for ${minutes}m — ${reason}`)],
    });
  },
};

const ban: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server.")
    .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason given";
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.editReply({ embeds: [errorEmbed("I can't ban that member.")] });
      return;
    }
    await interaction.guild.members.ban(target.id, { reason });
    await db.logMod(interaction.user.id, target.id, "ban", reason);
    await interaction.editReply({
      embeds: [brandEmbed().setTitle("🔨 Banned").setDescription(`${target} — ${reason}`)],
    });
  },
};

export const moderationCommands: Command[] = [warn, timeout, ban];
