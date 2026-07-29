import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Gamepad2,
  Trophy,
  Users,
  Award,
  Star,
  Coins,
  Calendar,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { getProfileByUsername, getProfileStats, getUserAchievements, getUserBestScores, getEquippedBadges, getNowPlaying } from "@/services/profiles";
import { getUserWishlist } from "@/services/shop";
import { ProfileWishlist } from "@/features/social/profile-wishlist";
import { getSessionUser, getReducedMotion } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { XpBar } from "@/components/profile/xp-bar";
import { DynamicIcon } from "@/components/dynamic-icon";
import { ProfileActions } from "@/features/social/profile-actions";
import { DiscordIcon } from "@/components/icons";
import { PresenceDot } from "@/components/profile/presence-dot";
import { bannerBackground } from "@/components/profile/profile-theme";
import { Nameplate } from "@/components/profile/nameplate";
import { NameStyle } from "@/components/profile/name-style";
import { ProfileEffects } from "@/components/profile/profile-effects";
import { ProfileBackdrop } from "@/components/profile/profile-backdrop";
import { ProfileFrame } from "@/components/profile/profile-frame";
import { NowPlayingChip } from "@/features/social/now-playing";
import { RARITY_META, formatNumber, timeAgo, cn } from "@/lib/utils";
import type { FriendshipRelation } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Player not found" };
  return {
    title: `${profile.display_name ?? profile.username} (@${profile.username})`,
    description: profile.bio ?? `${profile.username}'s Classic Games Hub profile - level ${profile.level}.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [user, stats, achievements, bestScores, badges, wishlist, reducedMotion, nowPlaying] = await Promise.all([
    getSessionUser(),
    getProfileStats(profile.id),
    getUserAchievements(profile.id),
    getUserBestScores(profile.id, 6),
    getEquippedBadges(profile.id),
    getUserWishlist(profile.id),
    getReducedMotion(),
    getNowPlaying(profile.id),
  ]);

  // Friendship, social stats, the viewer's private note and the showcase all
  // key off profile.id alone, so they go out together rather than as four more
  // sequential round trips. Only the pending-request lookup genuinely depends
  // on an earlier result (relation === "incoming"), so it stays behind.
  const supabaseSocial = await createClient();
  const isOther = Boolean(user && user.id !== profile.id);

  // Records the visit and returns the count in one call. Deliberately not
  // cache()-wrapped: it writes, and it is idempotent per viewer per day.
  const { data: viewData } = await supabaseSocial.rpc("record_profile_view", {
    p_profile: profile.id,
  });
  const views = viewData as { shown: boolean; views?: number } | null;
  const showcaseSlugs = Array.isArray(profile.showcase) ? (profile.showcase as string[]) : [];

  const [friendshipRes, socialRes, noteRes, showcaseRes] = await Promise.all([
    isOther ? supabaseSocial.rpc("friendship_status", { p_user: profile.id }) : null,
    supabaseSocial.rpc("profile_social", { p_target: profile.id }),
    isOther
      ? supabaseSocial
          .from("user_notes")
          .select("nickname, note")
          .eq("author_id", user!.id)
          .eq("target_id", profile.id)
          .maybeSingle()
      : null,
    showcaseSlugs.length
      ? supabaseSocial.from("games").select("slug, title, thumbnail_url").in("slug", showcaseSlugs)
      : null,
  ]);

  let relation: FriendshipRelation = "none";
  if (isOther) relation = (friendshipRes?.data as FriendshipRelation) ?? "none";
  else if (user?.id === profile.id) relation = "self";

  let requestId: number | undefined;
  if (relation === "incoming" && user) {
    const { data: req } = await supabaseSocial
      .from("friendships")
      .select("id")
      .eq("requester_id", profile.id)
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    requestId = req?.id;
  }

  const social = socialRes.data as {
    followers: number;
    following: number;
    is_following: boolean;
    friends_count: number;
    friends_visible: boolean;
    mutual: number;
  } | null;
  const myNote: { nickname: string | null; note: string | null } | null = noteRes?.data ?? null;

  // preserve the user's chosen order
  const showcaseGames = showcaseSlugs
    .map((s) => (showcaseRes?.data ?? []).find((g) => g.slug === s))
    .filter((g): g is { slug: string; title: string; thumbnail_url: string | null } => Boolean(g));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Banner, wrapped in the equipped profile frame (outermost layer). */}
      <ProfileFrame slug={profile.equipped?.profile_frame}>
        <div className="overflow-hidden rounded-3xl border border-border">
        <div className="relative h-40 sm:h-56" style={{ background: bannerBackground(profile.equipped) }}>
          {!profile.banner_url && <ProfileBackdrop equipped={profile.equipped} reduced={reducedMotion} />}
          {profile.banner_url && (
            <Image src={profile.banner_url} alt="" fill className="object-cover" sizes="1024px" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <ProfileEffects slug={profile.equipped?.effect} reduced={reducedMotion} />
        </div>

        <div className="relative px-5 pb-5 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <UserAvatar
                  src={profile.avatar_url}
                  name={profile.display_name ?? profile.username}
                  frame={profile.equipped?.avatar_frame}
                  decoration={profile.equipped?.decoration}
                  className="size-24 border-4 border-card sm:size-28"
                />
                <div className="absolute bottom-1 right-1">
                  <PresenceDot lastSeen={profile.last_seen_at} className="size-4" />
                </div>
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Nameplate slug={profile.equipped?.nameplate}>
                    <NameStyle style={profile.equipped?.nameplate ? undefined : profile.equipped?.name_style}>
                      <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
                    </NameStyle>
                  </Nameplate>
                  {profile.role === "admin" && (
                    <Badge variant="destructive">
                      <ShieldCheck className="size-3" /> Admin
                    </Badge>
                  )}
                  {profile.role === "moderator" && (
                    <Badge variant="neon">
                      <ShieldCheck className="size-3" /> Mod
                    </Badge>
                  )}
                  {profile.discord_linked && (
                    <Badge className="border-none bg-[#5865F2]/15 text-[#5865F2]">
                      <DiscordIcon className="size-3" /> Discord
                    </Badge>
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
                  <span>@{profile.username}</span>
                  {profile.pronouns && <span className="text-xs">· {profile.pronouns}</span>}
                  {myNote?.nickname && (
                    <span className="text-xs italic text-muted-foreground/80">· aka {myNote.nickname}</span>
                  )}
                </p>
                {profile.status_text && (
                  <p className="mt-0.5 text-sm text-foreground/80">{profile.status_text}</p>
                )}
                {nowPlaying && (
                  <div className="mt-2">
                    <NowPlayingChip playing={nowPlaying} />
                  </div>
                )}
              </div>
            </div>

            {relation !== "self" && user && (
              <ProfileActions
                targetId={profile.id}
                username={profile.username}
                relation={relation}
                requestId={requestId}
                isFollowing={social?.is_following ?? false}
                note={myNote?.note}
                nickname={myNote?.nickname}
              />
            )}
            {relation === "self" && (
              <Link
                href="/settings"
                className="focus-visible-ring inline-flex h-10 items-center gap-2 self-start rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
              >
                Edit profile
              </Link>
            )}
          </div>

          {profile.featured_achievement &&
            (() => {
              const feat = achievements.find((a) => a.slug === profile.featured_achievement);
              if (!feat) return null;
              return (
                <div className="mt-4 inline-flex items-center gap-2.5 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-gold/15 text-[oklch(0.6_0.13_85)] dark:text-gold">
                    <DynamicIcon name={feat.icon} className="size-5" />
                  </span>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Featured achievement</p>
                    <p className="text-sm font-semibold">{feat.name}</p>
                  </div>
                </div>
              );
            })()}

          {profile.bio && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{profile.bio}</p>}

          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((b) => {
                const shiny = b.rarity === "epic" || b.rarity === "legendary";
                return (
                  <span
                    key={b.slug}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-muted px-3 py-1 text-xs font-medium ring-1",
                      RARITY_META[b.rarity]?.color,
                      RARITY_META[b.rarity]?.ring ?? "ring-transparent",
                      b.rarity === "legendary" && "shadow-[0_0_12px_-2px] shadow-amber-400/60",
                    )}
                  >
                    {shiny && (
                      <span
                        className="pointer-events-none absolute -inset-y-1 -left-1/3 w-1/3 motion-safe:animate-sheen"
                        style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent)" }}
                        aria-hidden
                      />
                    )}
                    <DynamicIcon name={b.preview?.icon ?? "star"} className="relative size-3.5" />
                    <span className="relative">{b.name}</span>
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-5 max-w-md">
            <XpBar xp={profile.xp} level={profile.level} />
          </div>
          {social && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                <b className="tabular-nums">{formatNumber(social.followers)}</b>{" "}
                <span className="text-muted-foreground">followers</span>
              </span>
              <span>
                <b className="tabular-nums">{formatNumber(social.following)}</b>{" "}
                <span className="text-muted-foreground">following</span>
              </span>
              {relation !== "self" && social.mutual > 0 && (
                <span className="text-muted-foreground">
                  <b className="tabular-nums text-foreground">{social.mutual}</b> mutual friend
                  {social.mutual === 1 ? "" : "s"}
                </span>
              )}
            </div>
          )}

          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" /> Joined {timeAgo(profile.created_at)}
            </span>
            {views?.shown && (
              <span className="flex items-center gap-1.5">
                <Eye className="size-3.5" /> {formatNumber(views.views ?? 0)}{" "}
                {views.views === 1 ? "visitor" : "visitors"}
              </span>
            )}
          </p>
        </div>
        </div>
      </ProfileFrame>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Gamepad2} label="Games played" value={formatNumber(stats.total_plays)} />
        <StatTile icon={Award} label="Achievements" value={stats.achievements} accent="text-gold" />
        <StatTile icon={Users} label="Friends" value={stats.friends} accent="text-sky-400" />
        <StatTile icon={Coins} label="Credits" value={formatNumber(profile.credits)} accent="text-gold" />
      </div>

      {/* Trophy case / showcase */}
      {showcaseGames.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-gold" /> Trophy case
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {showcaseGames.map((g) => (
              <Link
                key={g.slug}
                href={`/games/${g.slug}`}
                className="focus-visible-ring group flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3 transition-colors hover:bg-gold/10"
              >
                <Image
                  src={g.thumbnail_url ?? "/games/thumbs/snake.svg"}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-lg object-cover"
                />
                <p className="truncate text-sm font-semibold">{g.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best scores */}
      {bestScores.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-gold" /> Top scores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bestScores.map((s) => (
              <Link
                key={s.game.slug}
                href={`/games/${s.game.slug}`}
                className="focus-visible-ring flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <Image
                  src={s.game.thumbnail_url ?? "/games/thumbs/snake.svg"}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.game.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Best {formatNumber(s.best_score)} · {s.plays} plays
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Wishlist */}
      <ProfileWishlist
        items={wishlist}
        ownerId={profile.id}
        ownerName={profile.display_name ?? profile.username}
        canGift={Boolean(user) && user!.id !== profile.id}
      />

      {/* Achievements */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Award className="size-5 text-primary" /> Achievements
          <span className="text-sm font-normal text-muted-foreground">({achievements.length})</span>
        </h2>
        {achievements.length === 0 ? (
          <Card className="grid place-items-center p-8 text-center text-sm text-muted-foreground">
            No achievements yet.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((a) => (
              <div key={a.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-[oklch(0.6_0.13_85)] dark:text-gold">
                  <DynamicIcon name={a.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
