-- Pawprint initial schema. Mirrors src/data/schemas.ts.
-- Security model: the public (anon) can READ places, rule history and Sunday picks, and can
-- INSERT reports and events. Everything else (writes to places/picks, reading reports/events)
-- requires an admin: a signed-in user listed in public.admins.

create extension if not exists postgis with schema extensions;

create type public.dog_status as enum ('no_dogs', 'leash_required', 'off_leash_zones', 'off_leash_ok');
create type public.verification_status as enum ('verified', 'needs_verification');
create type public.place_type as enum ('trail', 'park', 'beach');
create type public.region as enum ('east_bay', 'san_francisco', 'marin', 'peninsula', 'south_bay');
create type public.report_type as enum ('wrong_rule', 'closure', 'other');
create type public.report_status as enum ('open', 'reviewed', 'resolved');

-- ---------------------------------------------------------------- admins
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: nobody can read or write this table through the API. Manage it in the SQL editor.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- places
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  place_type public.place_type not null,
  agency text not null,
  lat double precision not null check (lat between 36.5 and 38.5),
  lng double precision not null check (lng between -123.5 and -121.2),
  geog extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  region public.region not null,
  city text not null,
  dog_status public.dog_status,
  rule_summary text,
  off_leash_notes text,
  source_url text not null check (source_url ~ '^https?://'),
  verification_status public.verification_status not null default 'needs_verification',
  verified_on date,
  verified_by text,
  verification_note text,
  recheck_days int not null default 90 check (recheck_days between 7 and 365),
  details_basis text not null default 'editorial' check (details_basis in ('editorial', 'agency')),
  hazards text[] not null default '{}',
  water_access text check (water_access in ('none', 'seasonal', 'yes')),
  shade_level text check (shade_level in ('none', 'some', 'lots')),
  parking_notes text,
  typical_duration_minutes int check (typical_duration_minutes between 10 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A place without a confirmed rule must not carry one. Never a confident rule without a source check.
  constraint rule_requires_verification check (
    (verification_status = 'verified'
       and dog_status is not null and rule_summary is not null
       and verified_on is not null and verified_by is not null)
    or (verification_status = 'needs_verification' and dog_status is null and rule_summary is null)
  )
);
create index places_geog_idx on public.places using gist (geog);
create index places_region_idx on public.places (region);

-- ---------------------------------------------------------------- rule history
create table public.place_rule_history (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  previous_status public.dog_status,
  new_status public.dog_status,
  changed_on date not null,
  source_url text not null,
  note text not null default ''
);
create index place_rule_history_place_idx on public.place_rule_history (place_id, changed_on desc);

-- Record a history row whenever the stored rule changes, and keep updated_at fresh.
create function public.places_before_update() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.dog_status is distinct from old.dog_status then
    insert into public.place_rule_history (place_id, previous_status, new_status, changed_on, source_url, note)
    values (new.id, old.dog_status, new.dog_status, coalesce(new.verified_on, current_date), new.source_url, 'Rule changed');
  end if;
  new.updated_at = now();
  return new;
end
$$;
revoke execute on function public.places_before_update() from public, anon, authenticated;
create trigger places_before_update before update on public.places
  for each row execute function public.places_before_update();

-- ---------------------------------------------------------------- reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  report_type public.report_type not null,
  message text not null check (char_length(message) between 5 and 1000),
  created_at timestamptz not null default now(),
  status public.report_status not null default 'open'
);
create index reports_created_idx on public.reports (created_at desc);

-- ---------------------------------------------------------------- sunday picks
create table public.sunday_picks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null, -- Monday of the week
  place_id uuid not null references public.places (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 280),
  sort_order int not null default 0,
  unique (week_start, place_id)
);
create index sunday_picks_week_idx on public.sunday_picks (week_start desc, sort_order);

-- ---------------------------------------------------------------- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in
    ('place_viewed', 'gonogo_opened', 'source_link_clicked', 'report_submitted', 'filter_used', 'sunday_viewed')),
  place_id uuid references public.places (id) on delete set null,
  properties jsonb not null default '{}' check (octet_length(properties::text) <= 1000),
  created_at timestamptz not null default now()
);
create index events_name_time_idx on public.events (event_name, created_at desc);
create index events_place_idx on public.events (place_id) where place_id is not null;

-- ---------------------------------------------------------------- Sunday picks save (atomic, admin only)
create function public.save_sunday_picks(p_week date, p_picks jsonb) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if jsonb_array_length(p_picks) > 5 then
    raise exception 'at most 5 picks per week';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_picks) e
    join public.places p on p.id = (e ->> 'place_id')::uuid
    where p.verification_status <> 'verified'
  ) then
    raise exception 'only verified places can be picked';
  end if;

  delete from public.sunday_picks where week_start = p_week;
  insert into public.sunday_picks (week_start, place_id, note, sort_order)
  select p_week, (e ->> 'place_id')::uuid, coalesce(e ->> 'note', ''), (ord - 1)::int
  from jsonb_array_elements(p_picks) with ordinality as t (e, ord);
end
$$;
revoke execute on function public.save_sunday_picks(date, jsonb) from public, anon;
grant execute on function public.save_sunday_picks(date, jsonb) to authenticated;

-- ---------------------------------------------------------------- Row Level Security
alter table public.places enable row level security;
alter table public.place_rule_history enable row level security;
alter table public.reports enable row level security;
alter table public.sunday_picks enable row level security;
alter table public.events enable row level security;

-- Public reads
create policy "places are public" on public.places for select to anon, authenticated using (true);
create policy "history is public" on public.place_rule_history for select to anon, authenticated using (true);
create policy "picks are public" on public.sunday_picks for select to anon, authenticated using (true);

-- Public writes: reports and events only, and reports always start open
create policy "anyone can file a report" on public.reports
  for insert to anon, authenticated with check (status = 'open');
create policy "anyone can log an event" on public.events
  for insert to anon, authenticated with check (true);

-- Admin: everything else
create policy "admin manages places" on public.places
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages history" on public.place_rule_history
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages picks" on public.sunday_picks
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin reads and triages reports" on public.reports
  for select to authenticated using ((select public.is_admin()));
create policy "admin updates reports" on public.reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes reports" on public.reports
  for delete to authenticated using ((select public.is_admin()));
create policy "admin reads events" on public.events
  for select to authenticated using ((select public.is_admin()));
create policy "admin deletes events" on public.events
  for delete to authenticated using ((select public.is_admin()));
