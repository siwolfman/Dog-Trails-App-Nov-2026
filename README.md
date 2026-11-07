# Pawprint

Know the dog rules before you drive. Pawprint shows a dated, source-linked dog rule and a
Go/No-Go summary for Bay Area trails, parks and beaches.

React + Vite + TypeScript front end, backed by Supabase (Postgres, Row Level Security, Auth).
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

**What the public can do** (the publishable key, enforced by Row Level Security):

|             | places, rule history, Sunday picks | reports              | events       |
| ----------- | ---------------------------------- | -------------------- | ------------ |
| Anyone      | read                               | file (always `open`) | log          |
| Admins only | create, edit, delete               | read, triage, delete | read, delete |

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

Anyone else who signs in is told they are not an admin, and the database refuses their writes anyway.

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
- Public report and event inserts are not rate limited yet; add a limit (Edge Function or `pg` trigger)
  before real traffic.
- No drive times (needs a routing API); the list shows area instead.
- Open-Meteo is called from the browser with the place's coordinates only.
- PWA basics only: manifest and icon, no offline shell.
- Without Supabase configured, `/admin` falls back to a placeholder password from `VITE_ADMIN_PASSWORD`.
  That is **not secure** (it ships in the JS bundle); it exists only so local development works offline.
