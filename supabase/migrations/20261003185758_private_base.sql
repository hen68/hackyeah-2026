-- Shared plumbing: the non-exposed `private` schema and generic helpers.
-- PostgREST only exposes `public`, so nothing here is callable over the API.

create schema if not exists private;
revoke all on schema private from public, anon;
-- RLS policies evaluated for signed-in users call helpers from this schema.
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_anonymous()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.is_anonymous() from public;
grant execute on function private.is_anonymous() to authenticated;
