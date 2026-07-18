-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0002 games platform
-- Games catalog, ratings, favorites, play sessions, leaderboards, activity
-- ═══════════════════════════════════════════════════════════════════════════

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  tagline text,
  description text,
  how_to_play text,
  category text not null,
  tags text[] not null default '{}',
  controls jsonb not null default '[]'::jsonb,
  thumbnail_url text,
  banner_url text,
  engine_id text not null,
  status text not null default 'published' check (status in ('published', 'draft', 'archived', 'coming_soon')),
  featured boolean not null default false,
  sort_weight int not null default 0,
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'hard')),
  play_count bigint not null default 0,
  rating_sum bigint not null default 0,
  rating_count int not null default 0,
  -- reward tuning / anti-cheat bounds
  max_score bigint,
  credit_divisor int not null default 100 check (credit_divisor > 0),
  max_credits_per_session int not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index games_category_idx on public.games (category) where status = 'published';
create index games_featured_idx on public.games (featured, sort_weight desc) where status = 'published';
create index games_popularity_idx on public.games (play_count desc) where status = 'published';
create index games_tags_idx on public.games using gin (tags);

create trigger games_touch before update on public.games
for each row execute function public.touch_updated_at();

-- ── ratings ─────────────────────────────────────────────────────────────────
create table public.game_ratings (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text check (char_length(review) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index game_ratings_game_idx on public.game_ratings (game_id, created_at desc);
create index game_ratings_user_idx on public.game_ratings (user_id);

create trigger game_ratings_touch before update on public.game_ratings
for each row execute function public.touch_updated_at();

-- Keep aggregate rating on games in sync.
create or replace function public.sync_game_rating()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.games
    set rating_sum = rating_sum + new.rating, rating_count = rating_count + 1
    where id = new.game_id;
  elsif tg_op = 'UPDATE' then
    update public.games
    set rating_sum = rating_sum - old.rating + new.rating
    where id = new.game_id;
  elsif tg_op = 'DELETE' then
    update public.games
    set rating_sum = rating_sum - old.rating, rating_count = rating_count - 1
    where id = old.game_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger game_ratings_sync
after insert or update or delete on public.game_ratings
for each row execute function public.sync_game_rating();

-- ── favorites ───────────────────────────────────────────────────────────────
create table public.game_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index game_favorites_game_idx on public.game_favorites (game_id);

-- ── play sessions (raw history) ─────────────────────────────────────────────
create table public.play_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  score bigint not null default 0,
  duration_seconds int not null default 0,
  xp_earned int not null default 0,
  credits_earned int not null default 0,
  ads_doubled boolean not null default false,
  created_at timestamptz not null default now()
);

create index play_sessions_user_idx on public.play_sessions (user_id, created_at desc);
create index play_sessions_game_idx on public.play_sessions (game_id, created_at desc);
create index play_sessions_rate_idx on public.play_sessions (user_id, game_id, created_at desc);

-- ── leaderboards (best score per player per game) ───────────────────────────
create table public.leaderboard_scores (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  best_score bigint not null default 0,
  plays int not null default 0,
  achieved_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index leaderboard_scores_rank_idx on public.leaderboard_scores (game_id, best_score desc, achieved_at asc);
create index leaderboard_scores_user_idx on public.leaderboard_scores (user_id);

-- ── activity feed ───────────────────────────────────────────────────────────
create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_user_idx on public.activity_events (user_id, created_at desc);
create index activity_events_recent_idx on public.activity_events (created_at desc);

-- ── row level security ──────────────────────────────────────────────────────
alter table public.games enable row level security;
alter table public.game_ratings enable row level security;
alter table public.game_favorites enable row level security;
alter table public.play_sessions enable row level security;
alter table public.leaderboard_scores enable row level security;
alter table public.activity_events enable row level security;

create policy "published games are public" on public.games
  for select using (status in ('published', 'coming_soon') or public.is_staff());

create policy "staff manage games" on public.games
  for all using (public.is_staff()) with check (public.is_staff());

create policy "ratings are public" on public.game_ratings
  for select using (true);

create policy "users manage own ratings" on public.game_ratings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "favorites are public" on public.game_favorites
  for select using (true);

create policy "users manage own favorites" on public.game_favorites
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own play history" on public.play_sessions
  for select using ((select auth.uid()) = user_id or public.is_staff());

create policy "leaderboards are public" on public.leaderboard_scores
  for select using (true);

create policy "activity is public" on public.activity_events
  for select using (true);

-- Sessions, leaderboards and activity are written only by definer functions.
revoke insert, update, delete on public.play_sessions from authenticated, anon;
revoke insert, update, delete on public.leaderboard_scores from authenticated, anon;
revoke insert, update, delete on public.activity_events from authenticated, anon;
