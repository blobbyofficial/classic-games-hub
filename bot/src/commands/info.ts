import { SlashCommandBuilder } from "discord.js";
import { db } from "../db.js";
import { config } from "../config.js";
import { brandEmbed, errorEmbed, friendlyError, profileUrl } from "../lib/embeds.js";
import type { Command } from "../types.js";

const profile: Command = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show a player's Classic Games Hub profile.")
    .addUserOption((o) => o.setName("user").setDescription("Whose profile (defaults to you)")),
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("user") ?? interaction.user;
    const p = await db.profile(target.id);
    if (!p?.ok) {
      await interaction.editReply({ embeds: [errorEmbed(friendlyError(p?.error))] });
      return;
    }
    const embed = brandEmbed()
      .setTitle(`${p.display_name ?? p.username}`)
      .setURL(profileUrl(p.username!))
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Level", value: `${p.level}`, inline: true },
        { name: "XP", value: `${p.xp?.toLocaleString()}`, inline: true },
        { name: "Credits", value: `${p.credits?.toLocaleString()}`, inline: true },
      )
      .setDescription(`[View full profile](${profileUrl(p.username!)})`);
    if (p.role && p.role !== "user") embed.addFields({ name: "Role", value: p.role, inline: true });
    await interaction.editReply({ embeds: [embed] });
  },
};

const leaderboard: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top players on Classic Games Hub."),
  async execute(interaction) {
    await interaction.deferReply();
    const rows = await db.topPlayers(10);
    if (!rows || rows.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed("No players on the leaderboard yet.")] });
      return;
    }
    const medals = ["🥇", "🥈", "🥉"];
    const lines = rows.map(
      (r) => `${medals[r.rank - 1] ?? `**${r.rank}.**`} ${r.display_name ?? r.username} — Lvl ${r.level} · ${r.xp.toLocaleString()} XP`,
    );
    const embed = brandEmbed()
      .setTitle("🏆 Top players")
      .setDescription(lines.join("\n"))
      .setURL(`${config.siteUrl}/leaderboards`);
    await interaction.editReply({ embeds: [embed] });
  },
};

const help: Command = {
  data: new SlashCommandBuilder().setName("help").setDescription("What can this bot do?"),
  async execute(interaction) {
    const embed = brandEmbed()
      .setTitle("🎮 Classic Games Hub bot")
      .setDescription(
        [
          "**Economy**",
          "`/balance` — your credits & level",
          "`/daily` — claim your daily reward",
          "`/pay @user amount` — send credits",
          "",
          "**Profiles**",
          "`/profile [@user]` — view a Hub profile",
          "`/leaderboard` — top players",
          "`/sync` — sync your badges & roles",
          "",
          `Sign in at ${config.siteUrl} with Discord to link your account.`,
        ].join("\n"),
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const infoCommands: Command[] = [profile, leaderboard, help];
