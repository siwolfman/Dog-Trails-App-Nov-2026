# Pawprint

Know the dog rules before you drive. Pawprint shows a dated, source-linked dog rule and a
Go/No-Go summary for Bay Area trails, parks and beaches.

This first milestone is **front end only** (React + Vite + TypeScript). Data comes from a
reviewable seed file and persists reports, Sunday Picks edits and events in the browser's
`localStorage`. The Supabase backend plugs in later behind one interface (see below).

## Run it

Requires Node 22+ and npm.

```bash
npm install
cp .env.example .env.local   # then set VITE_ADMIN_PASSWORD
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
- `/admin` edit picks, triage reports, view and export events (see the caveat below)

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

## Architecture

```
data/places.seed.json     reviewable seed (places, rule history, default Sunday picks)
src/data/client.ts        DataClient interface: the Supabase seam
src/data/localClient.ts   bundled seed + localStorage implementation
src/data/index.ts         the one line to change when Supabase arrives
src/data/schemas.ts       Zod schemas (mirror the planned tables)
src/lib/                  dog status logic, filters, weather, tracking, admin helpers
src/components/, src/pages/
supabase/schema.sql       DRAFT Postgres/PostGIS schema, not executed
```

### Moving to Supabase

1. Run `supabase/schema.sql` in a new project and load the seed rows.
2. Write `src/data/supabaseClient.ts` implementing `DataClient` and export it from `src/data/index.ts`.
3. Replace the `/admin` placeholder gate with Supabase Auth and Row Level Security (draft policies are in
   the schema file).

## Known limitations

- **`/admin` is not secure.** Any `VITE_` variable ships in the JS bundle, so the password is only a
  placeholder gate (it also fails closed if unset). Do not rely on it for anything that matters.
- Reports, Sunday Picks edits and events live in one browser until the backend exists.
- Map tiles default to the public OpenStreetMap server, fine for development but not for production traffic.
  Set `VITE_MAP_STYLE_URL` to another style (OpenFreeMap, Protomaps, MapTiler) before launch.
- No drive times (needs a routing API); the list shows area instead.
- Open-Meteo is called from the browser with the place's coordinates only.
- PWA basics only: manifest and icon, no offline shell.
