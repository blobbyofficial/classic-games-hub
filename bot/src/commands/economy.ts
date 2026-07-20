import { SlashCommandBuilder } from "discord.js";
import { db } from "../db.js";
import { brandEmbed, errorEmbed, friendlyError, profileUrl } from "../lib/embeds.js";
import type { Command } from "../types.js";

const balance: Command = {
  data: new SlashCommandBuilder().setName("balance").setDescription("Check your Classic Games Hub credits and level."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const p = await db.profile(interaction.user.id);
    if (!p?.ok) {
      await interaction.editReply({ embeds: [errorEmbed(friendlyError(p?.error))] });
      return;
    }
    const embed = brandEmbed()
      .setTitle(`💰 ${p.display_name ?? p.username}`)
      .addFields(
        { name: "Credits", value: `**${p.credits?.toLocaleString()}**`, inline: true },
        { name: "Level", value: `${p.level}`, inline: true },
        { name: "XP", value: `${p.xp?.toLocaleString()}`, inline: true },
      )
      .setURL(profileUrl(p.username!));
    await interaction.editReply({ embeds: [embed] });
  },
};

const daily: Command = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily credit reward."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const res = await db.claimDaily(interaction.user.id);
    if (!res?.ok) {
      await interaction.editReply({ embeds: [errorEmbed(friendlyError(res?.error))] });
      return;
    }
    const embed = brandEmbed()
      .setTitle("🎁 Daily reward claimed!")
      .setDescription(`You earned **${res.credits}** credits.\n🔥 Streak: **${res.streak}** day(s)`);
    await interaction.editReply({ embeds: [embed] });
  },
};

const pay: Command = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Send credits to another player.")
    .addUserOption((o) => o.setName("user").setDescription("Who to pay").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("How many credits").setRequired(true).setMinValue(1),
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    if (target.bot) {
      await interaction.editReply({ embeds: [errorEmbed("You can't pay a bot.")] });
      return;
    }
    const res = await db.pay(interaction.user.id, target.id, amount);
    if (!res?.ok) {
      await interaction.editReply({ embeds: [errorEmbed(friendlyError(res?.error))] });
      return;
    }
    const embed = brandEmbed()
      .setTitle("💸 Payment sent")
      .setDescription(`${interaction.user} paid **${amount}** credits to ${target}.`);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const economyCommands: Command[] = [balance, daily, pay];
