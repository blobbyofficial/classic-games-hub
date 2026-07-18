-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0001 core identity
-- Profiles, settings, credits ledger, XP/levels, storage, new-user bootstrap
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists citext;

-- ── helper: touch updated_at ────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique check (char_length(username) between 3 and 24 and username ~ '^[a-zA-Z0-9_]+$'),
  display_name text check (char_length(display_name) <= 40),
  avatar_url text,
  banner_url text,
  bio text check (char_length(bio) <= 500),
  level int not null default 1,
  xp bigint not null default 0,
  credits bigint not null default 0 check (credits >= 0),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  equipped jsonb not null default '{}'::jsonb,
  is_banned boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_level_idx on public.profiles (level desc, xp desc);
create index profiles_last_seen_idx on public.profiles (last_seen_at desc);

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- ── user settings (private) ─────────────────────────────────────────────────
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ads_enabled boolean not null default false,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  reduced_motion boolean not null default false,
  show_online_status boolean not null default true,
  allow_friend_requests boolean not null default true,
  allow_dms text not null default 'everyone' check (allow_dms in ('everyone', 'friends', 'none')),
  email_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger user_settings_touch before update on public.user_settings
for each row execute function public.touch_updated_at();

-- ── role helpers (security definer so RLS policies can use them) ────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'moderator')
  );
$$;

-- ── credits ledger ──────────────────────────────────────────────────────────
create table public.credit_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  balance_after bigint not null,
  reason text not null,
  ref_type text,
  ref_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_idx on public.credit_transactions (user_id, created_at desc);

-- Internal: move credits atomically and record the ledger row.
create or replace function public.award_credits(
  p_user uuid,
  p_amount bigint,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_balance bigint;
begin
  update public.profiles
  set credits = credits + p_amount
  where id = p_user
  returning credits into v_balance;

  if v_balance is null then
    raise exception 'profile % not found', p_user;
  end if;

  insert into public.credit_transactions (user_id, amount, balance_after, reason, ref_type, ref_id, metadata)
  values (p_user, p_amount, v_balance, p_reason, p_ref_type, p_ref_id, p_metadata);

  return v_balance;
end;
$$;

-- ── XP & levels ─────────────────────────────────────────────────────────────
-- Level curve: level n requires 100 * (n-1)^2 total XP.
create or replace function public.level_for_xp(p_xp bigint)
returns int
language sql immutable
as $$
  select greatest(1, floor(sqrt(p_xp / 100.0))::int + 1);
$$;

create or replace function public.add_xp(p_user uuid, p_amount bigint)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old_level int;
  v_new_level int;
  v_xp bigint;
begin
  update public.profiles
  set xp = xp + p_amount
  where id = p_user
  returning xp, level into v_xp, v_old_level;

  v_new_level := public.level_for_xp(v_xp);

  if v_new_level <> v_old_level then
    update public.profiles set level = v_new_level where id = p_user;
    if v_new_level > v_old_level then
      perform public.award_credits(p_user, v_new_level * 25, 'level_up', 'level', v_new_level::text);
      insert into public.notifications (user_id, type, title, body, data)
      values (
        p_user, 'level_up', 'Level up!',
        format('You reached level %s and earned %s credits.', v_new_level, v_new_level * 25),
        jsonb_build_object('level', v_new_level)
      );
    end if;
  end if;
end;
$$;

-- ── notifications (created here; used by many triggers) ────────────────────
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ── new-user bootstrap ──────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_base text;
  v_username text;
  v_suffix int := 0;
begin
  v_base := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'player'
  );
  v_base := regexp_replace(lower(v_base), '[^a-z0-9_]', '', 'g');
  if char_length(v_base) < 3 then
    v_base := 'player' || floor(random() * 10000)::text;
  end if;
  v_base := left(v_base, 20);

  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', v_username),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.user_settings (user_id) values (new.id);

  perform public.award_credits(new.id, 100, 'welcome_bonus');

  insert into public.notifications (user_id, type, title, body)
  values (new.id, 'welcome', 'Welcome to Classic Games Hub!',
          'You received 100 credits to get started. Have fun!');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ── presence heartbeat ──────────────────────────────────────────────────────
create or replace function public.heartbeat()
returns void
language sql security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = (select auth.uid());
$$;

-- ── row level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.notifications enable row level security;

create policy "profiles are public" on public.profiles
  for select using (true);

create policy "users update own profile" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "staff update any profile" on public.profiles
  for update using (public.is_staff());

create policy "own settings" on public.user_settings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own transactions" on public.credit_transactions
  for select using ((select auth.uid()) = user_id);

create policy "own notifications select" on public.notifications
  for select using ((select auth.uid()) = user_id);

create policy "own notifications update" on public.notifications
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own notifications delete" on public.notifications
  for delete using ((select auth.uid()) = user_id);

-- Column-level protection: players can't touch credits/xp/level/role/username
-- directly; those move only through security-definer functions.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, banner_url, bio, equipped)
  on public.profiles to authenticated;

revoke insert, update, delete on public.credit_transactions from authenticated, anon;
revoke insert on public.notifications from authenticated, anon;

-- ── storage buckets ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('banners', 'banners', true), ('game-assets', 'game-assets', true)
on conflict (id) do nothing;

create policy "public read user media" on storage.objects
  for select using (bucket_id in ('avatars', 'banners', 'game-assets'));

create policy "users manage own avatar" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users update own media" on storage.objects
  for update using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete own media" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "staff manage game assets" on storage.objects
  for insert with check (bucket_id = 'game-assets' and public.is_staff());
