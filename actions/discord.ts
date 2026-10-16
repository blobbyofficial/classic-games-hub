"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { syncMemberRoles } from "@/lib/discord/role-sync";
import { botDb } from "@/lib/discord/bot-db";

export type DiscordActionState = { error?: string; message?: string } | null;

const linkCodeSchema = z.string().trim().min(6).max(128);

function refreshConnections(): void {
  revalidatePath("/settings");
}

/**
 * A Discord role update is a best-effort consequence of an already committed
 * account-link change. Never turn a successful link/unlink into a false failure.
 * A retry/reconciliation worker is still advisable for durable delivery.
 */
function scheduleRoleSync(discordId: string | null): void {
  if (!discordId) return;
  after(async () => {
    try {
      await syncMemberRoles(discordId);
    } catch (error) {
      console.error("[discord-link] Failed to reconcile member roles", error);
    }
  });
}

/** Begin linking a Discord OAuth identity to the currently signed-in user. */
export async function linkDiscordOAuth(): Promise<DiscordActionState> {
  const supabase = await createClient();
  const { data: auth, error: userError } = await supabase.auth.getUser();
  if (userError || !auth.user) return { error: "Sign in before linking Discord." };

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "discord",
    options: {
      redirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent("/settings?linked=discord")}`,
    },
  });
  if (error || !data.url) {
    return {
      error: "Couldn't start Discord linking. Try again, or use the /link command in the Discord server.",
    };
  }
  redirect(data.url);
}

/** Claim a one-time linking code created by the Discord bot's /link command. */
export async function claimDiscordLinkCode(
  _prev: DiscordActionState,
  formData: FormData,
): Promise<DiscordActionState> {
  const parsed = linkCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { error: "Enter a valid code from the /link command." };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("claim_discord_link", { p_code: parsed.data });
  if (error) {
    console.error("[discord-link] Link RPC failed", error.code);
    return { error: "Couldn't link Discord right now. Try again." };
  }

  const result = data as { ok?: boolean; error?: string; discord_username?: string } | null;
  if (!result?.ok) {
    const messages: Record<string, string> = {
      auth_required: "You need to be signed in.",
      account_already_linked: "This Hub account already has a Discord account linked.",
      invalid_code: "That code is invalid or has expired. Run /link again for a fresh one.",
      discord_already_linked: "That Discord account is already linked to another Hub account.",
    };
    return { error: messages[result?.error ?? ""] ?? "Couldn't link your Discord account." };
  }

  // Look up the committed association, not a Discord ID supplied by the client.
  try {
    scheduleRoleSync(await botDb.discordIdFor(auth.user.id));
  } catch (error) {
    console.error("[discord-link] Could not schedule role reconciliation", error);
  }

  refreshConnections();
  const displayName = typeof result.discord_username === "string"
    ? result.discord_username.slice(0, 80)
    : "";
  return { message: `Discord account${displayName ? ` (${displayName})` : ""} linked successfully.` };
}

/**
 * Unlink the current user's Discord account.
 *
 * OAuth and code-based links are handled separately: an RPC error must not be
 * interpreted as evidence that there is no code-based link. When an OAuth
 * identity exists, remove that identity only if another OAuth/email identity
 * remains. An email address on the user record is NOT proof of a usable password.
 *
 * NOTE: Projects allowing both linking mechanisms simultaneously need a
 * unified, transactional unlink contract in the database/auth layer.
 */
export async function unlinkDiscord(): Promise<DiscordActionState> {
  const supabase = await createClient();
  const { data: auth, error: userError } = await supabase.auth.getUser();
  if (userError || !auth.user) return { error: "You need to be signed in." };

  const { data: identityData, error: identitiesError } = await supabase.auth.getUserIdentities();
  if (identitiesError) return { error: "Couldn't check your sign-in methods. Try again." };

  const identities = identityData?.identities ?? [];
  const discordIdentity = identities.find((identity) => identity.provider === "discord");

  let discordId: string | null;
  try {
    discordId = await botDb.discordIdFor(auth.user.id);
  } catch (error) {
    console.error("[discord-link] Discord ID lookup failed", error);
    return { error: "Couldn't check your linked Discord account. Try again." };
  }

  if (discordIdentity) {
    if (!identities.some((identity) => identity.id !== discordIdentity.id)) {
      return {
        error: "Discord is your only verified sign-in identity. Add another sign-in method before unlinking.",
      };
    }

    const { error } = await supabase.auth.unlinkIdentity(discordIdentity);
    if (error) return { error: "Couldn't unlink your Discord account. Try again." };
  } else {
    const { data, error } = await supabase.rpc("unlink_discord");
    if (error) {
      console.error("[discord-link] Unlink RPC failed", error.code);
      return { error: "Couldn't unlink Discord right now. Try again." };
    }
    const result = data as { ok?: boolean; error?: string } | null;
    if (!result?.ok) {
      return {
        error: result?.error === "auth_required"
          ? "You need to be signed in."
          : result?.error === "not_linked"
            ? "No linked Discord account found."
            : "Couldn't unlink your Discord account. Try again.",
      };
    }
  }

  // Discord sync uses the previously linked ID, since it may no longer be
  // discoverable from the database after unlinking.
  scheduleRoleSync(discordId);
  refreshConnections();
  return { message: "Discord account unlinked." };
}
