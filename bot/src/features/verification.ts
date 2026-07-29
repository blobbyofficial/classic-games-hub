import { EmbedBuilder, type GuildMember } from "discord.js";
import { BRAND_COLOR, config } from "../config.js";
import { getConfig, template } from "../hubConfig.js";
import { syncMemberRoles } from "./roleSync.js";

/**
 * The join half of the verification gate (the Appy replacement). The button,
 * captcha and role grant all live in the website's serverless interactions
 * endpoint; the only part that needs the gateway is *noticing a member joined*
 * so we can put them behind the gate straight away.
 */
export async function handleMemberJoin(member: GuildMember): Promise<void> {
  if (member.guild.id !== config.guildId) return;
  if (member.user.bot) return;

  const cfg = (await getConfig()).verification;

  if (cfg.enabled && cfg.unverified_role_id) {
    await member.roles
      .add(cfg.unverified_role_id, "Awaiting verification")
      .catch(() => console.warn("[verification] couldn't add the unverified role - check my role position"));
  }

  if (cfg.enabled && cfg.dm_on_join && cfg.dm_message) {
    await member
      .send(template(cfg.dm_message, { server: member.guild.name, user: member.user.username, site: config.siteUrl }))
      .catch(() => undefined); // DMs closed - nothing we can do
  }

  if (cfg.log_channel_id) {
    const created = member.user.createdAt;
    const ageDays = Math.floor((Date.now() - created.getTime()) / 86_400_000);
    const channel = await member.client.channels.fetch(cfg.log_channel_id).catch(() => null);
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(BRAND_COLOR)
              .setTitle("📥 Member joined")
              .setDescription(
                `${member} (\`${member.user.username}\`)\nAccount created ${ageDays} day(s) ago${ageDays < 7 ? " ⚠️" : ""}`,
              )
              .setTimestamp(),
          ],
        })
        .catch(() => undefined);
    }
  }

  // Linked players get their Hub roles back the moment they (re)join.
  await syncMemberRoles(member).catch(() => undefined);
}

/**
 * When verification is off entirely, a join is the welcome moment. (With
 * verification on, the welcome is posted after they pass the gate, by the
 * serverless handler.)
 */
export async function maybeWelcome(member: GuildMember): Promise<void> {
  const cfg = (await getConfig()).verification;
  if (cfg.enabled || !cfg.welcome_channel_id || !cfg.welcome_message) return;
  const channel = await member.client.channels.fetch(cfg.welcome_channel_id).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) return;
  await channel
    .send({
      content: template(cfg.welcome_message, {
        user: `<@${member.id}>`,
        username: member.user.username,
        server: member.guild.name,
        count: member.guild.memberCount,
        site: config.siteUrl,
      }),
      allowedMentions: { users: [member.id] },
    })
    .catch(() => undefined);
}
