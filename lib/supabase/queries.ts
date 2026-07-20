import { cache } from "react";
import { createClient } from "./server";
import type { BannerConfig, BannerVariant, Profile, UserSettings } from "@/types";

const BANNER_VARIANTS: BannerVariant[] = ["info", "success", "warning", "promo"];

function coerceBanner(payload: unknown, fallbackMessage: string): BannerConfig {
  const p = (payload ?? {}) as Record<string, unknown>;
  const message = typeof p.message === "string" && p.message.trim() ? p.message.trim() : fallbackMessage;
  const variant = BANNER_VARIANTS.includes(p.variant as BannerVariant)
    ? (p.variant as BannerVariant)
    : "info";
  const linkLabel = typeof p.link_label === "string" && p.link_label.trim() ? p.link_label.trim() : null;
  const linkHref = typeof p.link_href === "string" && p.link_href.trim() ? p.link_href.trim() : null;
  return { message, variant, linkLabel, linkHref: linkLabel ? linkHref : null };
}

/**
 * Server-side auth + profile helpers. Wrapped in React `cache` so multiple
 * components in one render share a single round-trip.
 */

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});

export const getCurrentSettings = cache(async (): Promise<UserSettings | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  return data;
});

export const getFeatureFlags = cache(async (): Promise<Record<string, boolean>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("key, enabled");
  return Object.fromEntries((data ?? []).map((f) => [f.key, f.enabled]));
});

/**
 * Resolves the two site-wide banners (maintenance + generic) from their feature
 * flags. Returns `null` for a banner that is disabled or has no message so the
 * layout can render each independently.
 */
export const getBanners = cache(
  async (): Promise<{ maintenance: BannerConfig | null; site: BannerConfig | null }> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("key, enabled, payload")
      .in("key", ["maintenance_banner", "site_banner"]);

    const rows = Object.fromEntries((data ?? []).map((f) => [f.key, f]));
    const maint = rows.maintenance_banner;
    const site = rows.site_banner;

    const maintenance = maint?.enabled
      ? coerceBanner(maint.payload, "Scheduled maintenance in progress — some features may be temporarily unavailable.")
      : null;

    let siteConfig: BannerConfig | null = null;
    if (site?.enabled) {
      const cfg = coerceBanner(site.payload, "");
      if (cfg.message) siteConfig = cfg;
    }

    return { maintenance, site: siteConfig };
  },
);

export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
});

export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    throw new Error("forbidden");
  }
  return profile;
}
