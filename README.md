# Pawprint

Know the dog rules before you drive. Pawprint shows a dated, source-linked dog rule and a
Go/No-Go summary for Bay Area trails, parks and beaches.

React + Vite + TypeScript front end, backed by Supabase (Postgres, Row Level Security, Auth).
The app requires an account: people sign up and log in with an email and password.
Without Supabase env vars it falls back to the bundled seed file and `localStorage`, so it still
runs with no backend.

## Run it

Requires Node 22+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and publishable key
npm run dev                  # http://localhost:5173
```

| Command                 | What it does                                   |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Dev server                                     |
| `npm run build`         | Typecheck and production build to `dist/`      |
| `npm run typecheck`     | TypeScript, strict                             |
| `npm run lint`          | ESLint                                         |
| `npm test`              | Vitest (unit and component tests)              |
| `npm run validate:seed` | Validate `data/places.seed.json`, list sources |
| `npm run format`        | Prettier                                       |

## What is in it

- `/signup`, `/login`, `/forgot-password` and `/reset-password`: email and password accounts (Supabase Auth).
  Every other page needs a login
- `/` map and list, with filters (rule, outing length, area, water, shade) kept in the URL
- `/place/:slug` Go/No-Go card, source link, verified stamp, hazards, live weather and heat warning,
  "Report an issue"
- `/sunday` hand-picked Sunday Picks (3 to 5 verified places)
- `/admin` edit picks, triage reports, view and export events (Supabase Auth, admins only)

## Data integrity (the rules the app enforces)

- Dog rules are never guessed. Every place has an official `source_url`.
- If a rule could not be confirmed, the place is `needs_verification`, has no stored rule, and the UI shows
  "Unverified, check the agency page". The Zod schema rejects a confident rule on such a place.
- Freshness: a verified rule is shown as **Verified `<date>`** until `verified_on + recheck_days`
  (default 90), then **Recheck due** for 30 days, then it falls back to **Unverified** automatically.
- `src/lib/dogStatus.ts` `getDisplayRule()` is the single gate every component uses; tests prove
  unverified and stale places never render a rule.
- Water, shade, hazards and outing length are **editor estimates** (`details_basis: "editorial"`), labelled as
  such in the UI. They are not dog rules.
- See `docs/seed-verification.md` for which seed entries are verified and which are not.

## Backend (Supabase)

Project: `oovptnuvewvhjnbylxzq` (Dog Trails App). Schema and security live in `supabase/migrations/`;
`supabase/seed.sql` is generated from `data/places.seed.json` (`npm run seed:sql`).

**Who can do what** (the publishable key plus the user's login, enforced by Row Level Security):

|                    | places, rule history, Sunday picks | reports              | events       |
| ------------------ | ---------------------------------- | -------------------- | ------------ |
| Not signed in      | nothing                            | nothing              | nothing      |
| Any signed-in user | read                               | file (always `open`) | log          |
| Admins only        | create, edit, delete               | read, triage, delete | read, delete |

- Reports and events do **not** store who sent them (no user id column), though a login is needed to send one.
- Integrity is in the database too: a `CHECK` forbids a rule on a `needs_verification` place, and
  `save_sunday_picks()` refuses unverified places and more than 5 picks.
- Changing a place's `dog_status` writes a `place_rule_history` row automatically (trigger).
- The browser only ever holds the **publishable** key. Never put the `service_role` key in a `VITE_` variable.

### Setting up an admin

Admins sign in at `/admin` with Supabase Auth (email and password). No signup screen exists in the app.

1. Supabase dashboard, Authentication, Users, **Add user** (tick _Auto Confirm User_).
2. In the SQL editor, make that user an admin:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'you@example.com';
```

Other accounts that open `/admin` are told they are not an admin, and the database refuses their writes anyway.

**Dashboard settings that matter** (not controllable from this repo): Authentication, Sign In / Providers, Email.
If _Confirm email_ is on, new users are told to check their inbox before logging in; if off, they are logged in
immediately. Set a minimum password length of 8 or more to match the app's own check.

**Password reset setup.** The emailed link only works if its address is allowed: Authentication, URL
Configuration, Redirect URLs, add `http://localhost:5173/reset-password` (and your production address when you
deploy). Supabase's built-in email sender is rate limited to a few messages an hour and can land in spam.

## Architecture

```
data/places.seed.json         reviewable seed (source of truth for places and rules)
supabase/migrations/          schema, RLS policies, functions
supabase/seed.sql             generated from the seed JSON
src/data/client.ts            DataClient interface
src/data/supabaseClient.ts    Supabase implementation
src/data/localClient.ts       seed + localStorage fallback (no env vars needed)
src/data/index.ts             picks the implementation from env vars
src/data/schemas.ts           Zod schemas (rows from the database are validated too)
src/lib/                      dog status logic, filters, weather, tracking, admin helpers
src/components/, src/pages/
```

## Known limitations

- Map tiles default to the public OpenStreetMap server, fine for development but not for production traffic.
  Set `VITE_MAP_STYLE_URL` to another style (OpenFreeMap, Protomaps, MapTiler) before launch.
- Report and event inserts are not rate limited yet, and anyone can create an account: add limits and consider
  CAPTCHA or email confirmation before real traffic.
- No email change or account deletion yet.
- No drive times (needs a routing API); the list shows area instead.
- Open-Meteo is called from the browser with the place's coordinates only.
- PWA basics only: manifest and icon, no offline shell.
- Without Supabase configured, `/admin` falls back to a placeholder password from `VITE_ADMIN_PASSWORD`.
  That is **not secure** (it ships in the JS bundle); it exists only so local development works offline.
