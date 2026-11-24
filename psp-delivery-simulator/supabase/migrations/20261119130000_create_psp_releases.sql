-- PSP v2.0.0 / Step 2A: database foundation only.
-- Keeps the entire validated v1 release record as JSONB. No data is imported.
-- Authentication, frontend wiring and migration are future steps.

create table public.psp_releases (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint psp_releases_pk primary key (owner_id, id),
  constraint psp_releases_nonblank_id check (length(btrim(id)) > 0),
  constraint psp_releases_revision_positive check (revision >= 1),
  constraint psp_releases_payload_shape check (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'id' = id
    and payload -> 'schemaVersion' = '1'::jsonb
    and payload ->> 'baselineStatus' in ('draft', 'established')
    and jsonb_typeof(payload -> 'draft') = 'object'
    and jsonb_typeof(payload -> 'completedSprintPoints') = 'array'
    and (
      (payload ->> 'baselineStatus' = 'draft'
        and payload -> 'establishedBaseline' = 'null'::jsonb)
      or
      (payload ->> 'baselineStatus' = 'established'
        and jsonb_typeof(payload -> 'establishedBaseline') = 'object')
    )
  )
);

create index psp_releases_owner_updated_idx
  on public.psp_releases (owner_id, updated_at desc);

comment on table public.psp_releases is
  'Per-user PSP release records. payload preserves the v1 release JSON, including frozen baseline snapshots.';

-- The browser must not alter record ownership, identifiers, creation timestamp
-- or an already established baseline. Actual-sprint updates remain possible.
create function public.psp_releases_before_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'Release identity and ownership cannot be changed';
  end if;

  if old.payload ->> 'baselineStatus' = 'established' then
    if new.payload ->> 'baselineStatus' is distinct from 'established'
       or new.payload -> 'establishedBaseline' is distinct from old.payload -> 'establishedBaseline'
       or new.payload -> 'draft' is distinct from old.payload -> 'draft'
       or (new.payload - 'updatedAt' - 'completedSprintPoints' - 'sprintResults')
          is distinct from
          (old.payload - 'updatedAt' - 'completedSprintPoints' - 'sprintResults')
    then
      raise exception 'Established PSP baseline is immutable';
    end if;
  end if;

  -- Prevent arbitrary client revision edits; increment on each successful write.
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger psp_releases_before_update_trg
  before update on public.psp_releases
  for each row execute function public.psp_releases_before_update();

alter table public.psp_releases enable row level security;

-- No policies for anon. All access requires a signed-in user.
create policy "PSP read own releases"
  on public.psp_releases for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "PSP insert own releases"
  on public.psp_releases for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "PSP update own releases"
  on public.psp_releases for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "PSP delete own releases"
  on public.psp_releases for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.psp_releases from anon;
grant select, insert, update, delete on public.psp_releases to authenticated;

-- Do not grant clients direct execution of the trigger function.
revoke all on function public.psp_releases_before_update() from public;
