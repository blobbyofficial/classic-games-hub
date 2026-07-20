import { SlashCommandBuilder } from "discord.js";
import { brandEmbed, errorEmbed, friendlyError } from "../lib/embeds.js";
import { syncMemberRoles } from "../features/roleSync.js";
import type { Command } from "../types.js";

const sync: Command = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sync your Discord roles with your Hub badges, achievements and nameplate."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.inCachedGuild()) {
      await interaction.editReply({ embeds: [errorEmbed("Use this in the server.")] });
      return;
    }
    const res = await syncMemberRoles(interaction.member);
    if (!res.ok) {
      if (res.error === "no_role_map") {
        await interaction.editReply({
          embeds: [errorEmbed("Role sync isn't configured on this server yet.")],
        });
        return;
      }
      await interaction.editReply({ embeds: [errorEmbed(friendlyError(res.error))] });
      return;
    }
    const embed = brandEmbed()
      .setTitle("🎖️ Roles synced")
      .setDescription(
        res.added.length === 0 && res.removed.length === 0
          ? "You're all up to date."
          : [
              res.added.length ? `Added: ${res.added.map((r) => `<@&${r}>`).join(", ")}` : "",
              res.removed.length ? `Removed: ${res.removed.map((r) => `<@&${r}>`).join(", ")}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
      );
    await interaction.editReply({ embeds: [embed] });
  },
};

export const roleCommands: Command[] = [sync];
