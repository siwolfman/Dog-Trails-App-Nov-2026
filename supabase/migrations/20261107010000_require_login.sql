-- The app now requires an account. Move every public (anon) policy to signed-in users only.
-- Anyone can still create an account (Supabase Auth, email + password), so this is "logged in",
-- not "invite only". Admin policies are unchanged: they already require is_admin().

drop policy "places are public" on public.places;
drop policy "history is public" on public.place_rule_history;
drop policy "picks are public" on public.sunday_picks;
drop policy "anyone can file a report" on public.reports;
drop policy "anyone can log an event" on public.events;

create policy "signed-in users read places" on public.places
  for select to authenticated using (true);
create policy "signed-in users read history" on public.place_rule_history
  for select to authenticated using (true);
create policy "signed-in users read picks" on public.sunday_picks
  for select to authenticated using (true);

-- Reports and events stay anonymous in the data (no user id column): being signed in is required
-- to submit them, but we do not record who submitted.
create policy "signed-in users file reports" on public.reports
  for insert to authenticated with check (status = 'open');
create policy "signed-in users log events" on public.events
  for insert to authenticated with check (true);
