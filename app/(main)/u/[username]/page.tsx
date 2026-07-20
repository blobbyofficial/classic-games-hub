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
} from "lucide-react";
import { getProfileByUsername, getProfileStats, getUserAchievements, getUserBestScores, getEquippedBadges } from "@/services/profiles";
import { getSessionUser } from "@/lib/supabase/queries";
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
import { ProfileEffects } from "@/components/profile/profile-effects";
import { RARITY_META, formatNumber, timeAgo } from "@/lib/utils";
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
    description: profile.bio ?? `${profile.username}'s Classic Games Hub profile — level ${profile.level}.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [user, stats, achievements, bestScores, badges] = await Promise.all([
    getSessionUser(),
    getProfileStats(profile.id),
    getUserAchievements(profile.id),
    getUserBestScores(profile.id, 6),
    getEquippedBadges(profile.id),
  ]);

  // Relationship for the action bar.
  let relation: FriendshipRelation = "none";
  let requestId: number | undefined;
  if (user && user.id !== profile.id) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("friendship_status", { p_user: profile.id });
    relation = (data as FriendshipRelation) ?? "none";
    if (relation === "incoming") {
      const { data: req } = await supabase
        .from("friendships")
        .select("id")
        .eq("requester_id", profile.id)
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      requestId = req?.id;
    }
  } else if (user?.id === profile.id) {
    relation = "self";
  }

  // Social stats (followers/following/mutual) + the viewer's private note.
  const supabaseSocial = await createClient();
  const { data: socialData } = await supabaseSocial.rpc("profile_social", { p_target: profile.id });
  const social = socialData as {
    followers: number;
    following: number;
    is_following: boolean;
    friends_count: number;
    friends_visible: boolean;
    mutual: number;
  } | null;
  let myNote: { nickname: string | null; note: string | null } | null = null;
  if (user && user.id !== profile.id) {
    const { data } = await supabaseSocial
      .from("user_notes")
      .select("nickname, note")
      .eq("author_id", user.id)
      .eq("target_id", profile.id)
      .maybeSingle();
    myNote = data;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Banner */}
      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="relative h-40 sm:h-56" style={{ background: bannerBackground(profile.equipped) }}>
          {profile.banner_url && (
            <Image src={profile.banner_url} alt="" fill className="object-cover" sizes="1024px" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <ProfileEffects slug={profile.equipped?.effect} />
        </div>

        <div className="relative px-5 pb-5 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <UserAvatar
                  src={profile.avatar_url}
                  name={profile.display_name ?? profile.username}
                  frame={profile.equipped?.avatar_frame}
                  className="size-24 border-4 border-card sm:size-28"
                />
                <div className="absolute bottom-1 right-1">
                  <PresenceDot lastSeen={profile.last_seen_at} className="size-4" />
                </div>
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Nameplate slug={profile.equipped?.nameplate}>
                    <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
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

          {profile.bio && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{profile.bio}</p>}

          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.slug}
                  className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium ${RARITY_META[b.rarity]?.color}`}
                >
                  <DynamicIcon name={b.preview?.icon ?? "star"} className="size-3.5" />
                  {b.name}
                </span>
              ))}
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

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" /> Joined {timeAgo(profile.created_at)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Gamepad2} label="Games played" value={formatNumber(stats.total_plays)} />
        <StatTile icon={Award} label="Achievements" value={stats.achievements} accent="text-gold" />
        <StatTile icon={Users} label="Friends" value={stats.friends} accent="text-sky-400" />
        <StatTile icon={Coins} label="Credits" value={formatNumber(profile.credits)} accent="text-gold" />
      </div>

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
