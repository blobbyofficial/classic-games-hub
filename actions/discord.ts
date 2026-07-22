"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { syncMemberRoles } from "@/lib/discord/role-sync";
import { botDb } from "@/lib/discord/bot-db";

export type DiscordActionState = { error?: string; message?: string } | null;

/**
 * Begin the OAuth link flow: attaches a Discord identity to the CURRENT
 * signed-in user (Supabase manual linking). Discord verifies ownership of the
 * Discord account, so nobody can link an account they don't control.
 */
export async function linkDiscordOAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "discord",
    options: { redirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent("/settings?linked=discord")}` },
  });
  if (error) {
    return {
      error:
        "Couldn't start the Discord link flow. If this keeps happening, use the /link command in our Discord server instead.",
    };
  }
  if (data.url) redirect(data.url);
  return null;
}

/** Consume a one-time code minted by the bot's /link command. */
export async function claimDiscordLinkCode(
  _prev: DiscordActionState,
  formData: FormData,
): Promise<DiscordActionState> {
  const code = formData.get("code");
  if (typeof code !== "string" || code.trim().length < 6) {
    return { error: "Enter the code from the /link command." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_discord_link", { p_code: code.trim() });
  if (error) return { error: "Something went wrong. Try again." };

  const res = data as { ok?: boolean; error?: string; discord_username?: string } | null;
  if (!res?.ok) {
    const messages: Record<string, string> = {
      auth_required: "You need to be signed in.",
      account_already_linked: "This Hub account already has a Discord account linked.",
      invalid_code: "That code is invalid or has expired. Run /link again for a fresh one.",
      discord_already_linked: "That Discord account is already linked to another Hub account.",
    };
    return { error: messages[res?.error ?? ""] ?? "Couldn't link your Discord account." };
  }

  // Give them their roles straight away (best-effort, after the response).
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    after(async () => {
      const discordId = await botDb.discordIdFor(userData.user.id);
      if (discordId) await syncMemberRoles(discordId);
    });
  }

  revalidatePath("/settings");
  return {
    message: `Discord account${res.discord_username ? ` (${res.discord_username})` : ""} linked successfully.`,
  };
}

/**
 * Unlink Discord. Removes a code-based link via RPC; for OAuth links it
 * detaches the Discord identity (only when another sign-in method remains, so
 * nobody locks themselves out).
 */
export async function unlinkDiscord(): Promise<DiscordActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "You need to be signed in." };

  // Remember the Discord id so we can strip managed roles after unlinking.
  const discordId = await botDb.discordIdFor(userData.user.id);

  // 1) Code-based link?
  const { data: rpcData } = await supabase.rpc("unlink_discord");
  const rpcRes = rpcData as { ok?: boolean; error?: string } | null;

  if (!rpcRes?.ok) {
    // 2) OAuth identity link.
    const { data: identities, error: idError } = await supabase.auth.getUserIdentities();
    const discordIdentity = identities?.identities.find((i) => i.provider === "discord");
    if (idError || !discordIdentity) {
      return { error: "No linked Discord account found." };
    }
    const hasOtherSignIn =
      (identities?.identities.length ?? 0) > 1 ||
      Boolean(userData.user.email && userData.user.identities?.some((i) => i.provider === "email"));
    if (!hasOtherSignIn) {
      return {
        error:
          "Discord is your only way to sign in. Set a password in Security first, then unlink.",
      };
    }
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(discordIdentity);
    if (unlinkError) return { error: "Couldn't unlink your Discord account. Try again." };
  }

  if (discordId) {
    after(async () => {
      await syncMemberRoles(discordId); // now unlinked → managed roles are removed
    });
  }

  revalidatePath("/settings");
  return { message: "Discord account unlinked." };
}
