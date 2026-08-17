-- 0076_two_factor_recovery.sql
--
-- Recovery codes for two-factor authentication.
--
-- The second factor itself is Supabase's own TOTP MFA: factors live in
-- `auth.mfa_factors`, the enrol/challenge/verify dance is the auth API, and the
-- `aal` claim in the access token is what says whether a session has cleared
-- it. None of that needs a table here and none of it is duplicated below.
--
-- What Supabase does *not* give you is a way back in when the authenticator app
-- is gone - a lost phone with no escape hatch is an account nobody can reach,
-- including support. So this migration stores single-use recovery codes, and
-- only their hashes: a stolen database row must not be a working second factor.
--
-- Consuming a code happens while the session is still `aal1` (that is the whole
-- point of it), so `mfa_recovery_consume` is callable by `authenticated` rather
-- than gated on a verified factor. It only ever burns a code and reports
-- whether that worked; removing the factors afterwards is the auth admin API's
-- job, in actions/two-factor.ts, where the service key lives.

-- ───────────────────────── 1. The codes ─────────────────────────

create table if not exists public.mfa_recovery_codes (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  -- Hex sha-256 of the normalised code. Never the code itself.
  code_hash  text        not null,
  created_at timestamptz not null default now(),
  used_at    timestamptz,
  primary key (user_id, code_hash)
);

comment on table public.mfa_recovery_codes is
  'Single-use 2FA recovery codes, stored as sha-256 hashes. Reached only through the mfa_recovery_* functions.';

-- Used codes are kept rather than deleted so "3 of 10 remaining" can be shown
-- honestly, and so a replay attempt fails as *used* rather than as unknown.
create index if not exists mfa_recovery_codes_unused_idx
  on public.mfa_recovery_codes (user_id)
  where used_at is null;

alter table public.mfa_recovery_codes enable row level security;

-- No policies on purpose: nothing outside the definer functions below has any
-- business reading a hash, not even its owner.
revoke all on table public.mfa_recovery_codes from public, anon, authenticated;

-- ───────────────────────── 2. Issuing a set ─────────────────────────
--
-- Replaces the caller's whole set in one statement, which is what "generate new
-- recovery codes" means: the old ones stop working the moment the new list is
-- shown. Hashing happens in the application, so this function never sees a code.

create or replace function public.mfa_recovery_replace(p_hashes text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_hashes is null or array_length(p_hashes, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'no_codes');
  end if;

  -- A generous ceiling rather than an exact count: the application decides how
  -- many codes a set holds, the database only refuses an absurd one.
  if array_length(p_hashes, 1) > 32 then
    return jsonb_build_object('ok', false, 'error', 'too_many_codes');
  end if;

  delete from public.mfa_recovery_codes where user_id = v_uid;

  insert into public.mfa_recovery_codes (user_id, code_hash)
  select v_uid, h from unnest(p_hashes) as h
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'issued', array_length(p_hashes, 1));
end;
$$;

-- ───────────────────────── 3. Spending one ─────────────────────────

create or replace function public.mfa_recovery_consume(p_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_used timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Locking the row makes two simultaneous submissions of the same code spend
  -- it once, which matters because spending it is what unlocks the account.
  select used_at into v_used
    from public.mfa_recovery_codes
   where user_id = v_uid and code_hash = p_hash
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_code');
  end if;

  if v_used is not null then
    return jsonb_build_object('ok', false, 'error', 'code_already_used');
  end if;

  update public.mfa_recovery_codes
     set used_at = now()
   where user_id = v_uid and code_hash = p_hash;

  return jsonb_build_object(
    'ok', true,
    'remaining', (select count(*) from public.mfa_recovery_codes
                   where user_id = v_uid and used_at is null)
  );
end;
$$;

-- ───────────────────────── 4. Clearing and counting ─────────────────────────

create or replace function public.mfa_recovery_clear()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  delete from public.mfa_recovery_codes where user_id = v_uid;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.mfa_recovery_status()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'total',     count(*),
    'remaining', count(*) filter (where used_at is null)
  )
  from public.mfa_recovery_codes
  where user_id = auth.uid();
$$;

revoke execute on function public.mfa_recovery_replace(text[]) from public, anon;
revoke execute on function public.mfa_recovery_consume(text)   from public, anon;
revoke execute on function public.mfa_recovery_clear()         from public, anon;
revoke execute on function public.mfa_recovery_status()        from public, anon;

grant execute on function public.mfa_recovery_replace(text[]) to authenticated;
grant execute on function public.mfa_recovery_consume(text)   to authenticated;
grant execute on function public.mfa_recovery_clear()         to authenticated;
grant execute on function public.mfa_recovery_status()        to authenticated;

-- ───────────────────────── 5. Schema version ─────────────────────────

insert into public.status_meta (key, value)
values ('schema', jsonb_build_object('version', '0076'))
on conflict (key) do update set value = excluded.value, updated_at = now();
