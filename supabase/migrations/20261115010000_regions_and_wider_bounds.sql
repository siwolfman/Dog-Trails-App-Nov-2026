-- Wider coverage: new regions and a larger coordinate range (Geyserville is north of 38.5, Gualala is west of -123.5).
--
-- Regions: marin -> north_bay; peninsula -> south_bay; east_bay is split by place (Contra Costa County
-- places -> east_bay_north, northern Alameda County places -> east_bay_central). south_bay and
-- san_francisco keep their names. New east_bay_south has no places yet.

create type public.region_v2 as enum (
  'north_bay', 'east_bay_north', 'east_bay_central', 'east_bay_south', 'san_francisco', 'south_bay'
);

alter table public.places
  alter column region type public.region_v2
  using (
    case
      when region::text = 'marin' then 'north_bay'
      when region::text = 'peninsula' then 'south_bay'
      when region::text = 'east_bay' and slug in ('point-isabel', 'briones', 'sibley') then 'east_bay_north'
      when region::text = 'east_bay' then 'east_bay_central'
      else region::text
    end
  )::public.region_v2;

drop type public.region;
alter type public.region_v2 rename to region;

alter table public.places drop constraint places_lat_check;
alter table public.places add constraint places_lat_check check (lat between 36.5 and 39.2);
alter table public.places drop constraint places_lng_check;
alter table public.places add constraint places_lng_check check (lng between -123.8 and -121.2);
