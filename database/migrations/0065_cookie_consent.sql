-- 0065_cookie_consent.sql
--
-- A durable record of what each person consented to, and when.
--
-- The banner's own choice lives in a first-party cookie, because it has to work
-- for signed-out visitors and has to be readable before React has rendered.
-- This table is the *evidence*: GDPR requires being able to demonstrate that
-- consent was given, and a cookie the user can clear is not evidence of
-- anything. Signed-in choices are mirrored here, so the record survives a
-- cleared browser and follows someone to a new device.
--
-- Rows are append-only by design. Changing your mind writes a new row rather
-- than editing the old one - the question "what was this person consenting to
-- in March" has an answer, which is the whole point of keeping a record.
--
-- Nothing here is legal advice. The mechanics follow GDPR/PECR as best we
-- understand them; the policy wording needs review by someone qualified.

create table if not exists public.consent_records (
  id bigint generated always as identity primary key,
  -- Nullable: signed-out visitors consent too, identified only by the anonymous
  -- id in their cookie. No attempt is made to link those to an account later.
  user_id uuid references public.profiles (id) on delete cascade,
  anonymous_id text,
  -- Which optional categories were granted. Strictly-necessary is not listed:
  -- it is not optional, so recording consent for it would be a lie.
  analytics boolean not null default false,
  -- Version of the cookie policy that was shown. A policy change that widens
  -- what is collected invalidates consent given against the older text, and
  -- without this there is no way to tell which people need asking again.
  policy_version int not null default 1,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists consent_records_user_idx
  on public.consent_records (user_id, created_at desc);

alter table public.consent_records enable row level security;

-- Read your own history, and nobody else's. There is no update or delete
-- policy: the record is append-only, and a consent log that can be rewritten
-- is not a log.
create policy "read own consent" on public.consent_records
  for select using (user_id = (select auth.uid()));

-- Records a choice. SECURITY DEFINER so a signed-out visitor can write their
-- own row without `anon` being handed a blanket insert on the table.
create or replace function public.record_consent(
  p_analytics boolean,
  p_anonymous_id text default null,
  p_policy_version int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  -- One of the two must identify the row, or it is a record of nobody.
  if v_me is null and coalesce(trim(p_anonymous_id), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'no_subject');
  end if;

  insert into public.consent_records (user_id, anonymous_id, analytics, policy_version)
  values (v_me, nullif(trim(p_anonymous_id), ''), coalesce(p_analytics, false), p_policy_version);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.record_consent(boolean, text, int) from public;
grant execute on function public.record_consent(boolean, text, int) to anon, authenticated;
