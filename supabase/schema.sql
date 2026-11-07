-- DRAFT schema for the Supabase backend. Reference only: not executed by this project.
-- Mirrors src/data/schemas.ts. Review before running.

create extension if not exists postgis;

create type dog_status as enum ('no_dogs', 'leash_required', 'off_leash_zones', 'off_leash_ok');
create type verification_status as enum ('verified', 'needs_verification');
create type place_type as enum ('trail', 'park', 'beach');
create type region as enum ('east_bay', 'san_francisco', 'marin', 'peninsula', 'south_bay');
create type report_type as enum ('wrong_rule', 'closure', 'other');
create type report_status as enum ('open', 'reviewed', 'resolved');

create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  place_type place_type not null,
  agency text not null,
  lat double precision not null,
  lng double precision not null,
  geog geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  region region not null,
  city text not null,
  dog_status dog_status,
  rule_summary text,
  off_leash_notes text,
  source_url text not null,
  verification_status verification_status not null default 'needs_verification',
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
  -- A place without a confirmed rule must not carry one.
  constraint rule_requires_verification check (
    (verification_status = 'verified' and dog_status is not null and rule_summary is not null
       and verified_on is not null and verified_by is not null)
    or (verification_status = 'needs_verification' and dog_status is null and rule_summary is null)
  )
);
create index places_geog_idx on places using gist (geog);
create index places_region_idx on places (region);

create table place_rule_history (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places (id) on delete cascade,
  previous_status dog_status,
  new_status dog_status,
  changed_on date not null,
  source_url text not null,
  note text not null default ''
);
create index place_rule_history_place_idx on place_rule_history (place_id, changed_on desc);

-- Write a history row whenever the stored rule changes.
create function log_rule_change() returns trigger language plpgsql as $$
begin
  if new.dog_status is distinct from old.dog_status then
    insert into place_rule_history (place_id, previous_status, new_status, changed_on, source_url, note)
    values (new.id, old.dog_status, new.dog_status, coalesce(new.verified_on, current_date), new.source_url, 'Rule changed');
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger places_rule_change before update on places for each row execute function log_rule_change();

create table reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places (id) on delete cascade,
  report_type report_type not null,
  message text not null check (char_length(message) between 5 and 1000),
  created_at timestamptz not null default now(),
  status report_status not null default 'open'
);

create table sunday_picks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,              -- Monday of the week
  place_id uuid not null references places (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 280),
  sort_order int not null default 0,
  unique (week_start, place_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in
    ('place_viewed', 'gonogo_opened', 'source_link_clicked', 'report_submitted', 'filter_used', 'sunday_viewed')),
  place_id uuid references places (id) on delete set null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index events_name_time_idx on events (event_name, created_at desc);

-- Row Level Security (draft). Public can read places and picks, and insert reports and events.
-- Everything else needs an authenticated admin (add an `admins` table or use a custom claim).
alter table places enable row level security;
alter table place_rule_history enable row level security;
alter table reports enable row level security;
alter table sunday_picks enable row level security;
alter table events enable row level security;

create policy "public read places" on places for select using (true);
create policy "public read history" on place_rule_history for select using (true);
create policy "public read picks" on sunday_picks for select using (true);
create policy "public insert reports" on reports for insert with check (status = 'open');
create policy "public insert events" on events for insert with check (true);
-- TODO: admin policies for update/delete on places, sunday_picks, reports and select on reports/events.
