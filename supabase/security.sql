-- Run after the application schema has created public.users, category,
-- payment_method, and task_list. The app uses the service role key server-side.

alter table public.users
  add column if not exists role text not null default 'user';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users add constraint users_role_check
      check (role in ('admin', 'user'));
 end if;
end;
$$;

-- No browser client should access these tables directly. The server's
-- service_role client bypasses RLS; there are deliberately no user policies.
alter table public.users enable row level security;
alter table public.category enable row level security;
alter table public.payment_method enable row level security;
alter table public.task_list enable row level security;

create table if not exists public.login_attempts (
  email text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);
alter table public.login_attempts enable row level security;

create or replace function public.check_login_rate_limit(p_email text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select blocked_until is null or blocked_until <= now()
       from public.login_attempts
      where email = lower(trim(p_email))),
    true
  );
$$;

create or replace function public.record_login_failure(p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.login_attempts (email, attempts, window_started_at)
  values (lower(trim(p_email)), 1, now())
  on conflict (email) do update set
    attempts = case
      when public.login_attempts.window_started_at <= now() - interval '15 minutes' then 1
      else public.login_attempts.attempts + 1
    end,
    window_started_at = case
      when public.login_attempts.window_started_at <= now() - interval '15 minutes' then now()
      else public.login_attempts.window_started_at
    end,
    blocked_until = case
      when public.login_attempts.window_started_at <= now() - interval '15 minutes' then null
      when public.login_attempts.attempts + 1 >= 5 then now() + interval '15 minutes'
      else public.login_attempts.blocked_until
    end;
end;
$$;

create or replace function public.clear_login_failures(p_email text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.login_attempts where email = lower(trim(p_email));
$$;

revoke all on public.login_attempts from public, anon, authenticated;
revoke all on function public.check_login_rate_limit(text) from public, anon, authenticated;
revoke all on function public.record_login_failure(text) from public, anon, authenticated;
revoke all on function public.clear_login_failures(text) from public, anon, authenticated;
grant execute on function public.check_login_rate_limit(text) to service_role;
grant execute on function public.record_login_failure(text) to service_role;
grant execute on function public.clear_login_failures(text) to service_role;

-- After creating the first account, promote it explicitly:
-- update public.users set role = 'admin' where email = lower('owner@example.com');
