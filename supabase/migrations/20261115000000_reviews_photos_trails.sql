-- Reviews (1-5 paw prints, comment, optional GIPHY GIF), display-name profiles, place photos and
-- dog-friendly trail facts.
--
-- Privacy: reviews show a display name from `profiles`. Emails live only in auth.users, which the
-- app can never read, so a review can never expose an email.

-- ------------------------------------------------------------ place photo + trail facts
alter table public.places
  add column photo jsonb,
  add column dog_trails jsonb;

-- ---------------------------------------------------------------------- profiles
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint display_name_shape check (
    display_name = btrim(display_name)
    and char_length(display_name) between 2 and 30
    and position('@' in display_name) = 0
  )
);
-- Names are unique ignoring case, so nobody can pose as someone else with "MAYA" vs "maya".
create unique index profiles_display_name_key on public.profiles (lower(display_name));

-- ---------------------------------------------------------------------- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  -- {id, url, title}. Only GIPHY-hosted images are allowed, so a review cannot embed any other site.
  gif jsonb check (
    gif is null
    or (gif ->> 'url') ~ '^https://(media[0-9]*|i)\.giphy\.com/[A-Za-z0-9_./%~+-]+$'
  ),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One review per person per place; they edit it rather than posting again.
  unique (place_id, user_id)
);
create index reviews_place_idx on public.reviews (place_id);

create function public.reviews_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
revoke execute on function public.reviews_before_update() from public, anon, authenticated;
create trigger reviews_before_update before update on public.reviews
  for each row execute function public.reviews_before_update();

-- ---------------------------------------------------------------------- security
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;

revoke all on public.profiles, public.reviews from anon;

-- Signed-in users may read display names (needed to show who wrote a review) and create their own.
create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);
create policy "users create their own profile" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Everyone signed in sees visible reviews; authors also see their own hidden one, admins see all.
create policy "signed-in users read visible reviews" on public.reviews
  for select to authenticated
  using (not hidden or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "users write their own review" on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()) and hidden = false);
create policy "users edit their own review" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users or admins delete reviews" on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Authors may change only the review content. `hidden` can be changed by admins only, through the
-- function below, so an author cannot un-hide a review an admin removed.
revoke update on public.reviews from authenticated;
grant update (rating, comment, gif) on public.reviews to authenticated;

create function public.set_review_hidden(p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can hide reviews';
  end if;
  update public.reviews set hidden = p_hidden where id = p_id;
end $$;
revoke execute on function public.set_review_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_review_hidden(uuid, boolean) to authenticated;
