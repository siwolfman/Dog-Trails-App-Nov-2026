# Seed data verification

Checked **2026-11-07** by fetching the official pages (`verified_by` in the seed says
"claude (official page fetch), pending human review"). **Please review before relying on any rule.**
Water, shade, hazards and outing length are editor estimates, not agency data.

## Verified from an official page (16)

| Place                                                                       | Rule stored     | Source read                                                                                                                |
| --------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Point Isabel                                                                | Off-leash OK    | ebparks.org/dogs (park-specific rule)                                                                                      |
| Tilden, Briones, Redwood Regional, Sibley                                   | Off-leash zones | ebparks.org/dogs, **district-wide rule** (no park-specific rule on that page); Tilden and Redwood also list named closures |
| Fort Funston, Crissy Field, Ocean Beach, Baker Beach, Lands End, Muir Beach | Off-leash zones | NPS GGNRA Superintendent's Compendium (2025): "leashed or under Voice Control", with listed closures                       |
| Muir Woods                                                                  | No dogs         | nps.gov/muwo pets page                                                                                                     |
| Pulgas Ridge                                                                | Off-leash zones | openspace.org dogs page (marked off-leash area)                                                                            |
| Windy Hill                                                                  | Leash required  | openspace.org dogs page (designated trails only)                                                                           |
| Devil's Slide Trail, Junipero Serra Park                                    | Leash required  | smcgov.org/parks/dogs-san-mateo-county-parks                                                                               |

Notes that matter:

- The **EBRPD parks** (not Point Isabel) rely on the district-wide rule, so posted signs in a specific park can
  differ. The card says so.
- The **GGNRA** compendium lists whole sites as "leashed or voice control" with closures. We label these
  "Off-leash zones" and tell people to follow posted signs and maps, because the compendium does not draw the
  voice-control boundaries.
- **Muir Beach**: the visual concept shows it as "Leash required". The official compendium says leashed or
  voice control, so the app does not follow the concept's example.
- Ocean Beach and Crissy Field: the dates "July 1 to May 15" are copied as written in the compendium.

## Could not verify (4), shown as Unverified

| Place                      | Why                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| Rancho San Antonio         | Midpen's dog page lists 11 dog-friendly preserves and does not mention it      |
| Pillar Point Bluff         | County page lists it as dog-friendly but is unclear on off-leash status        |
| Ring Mountain              | Marin County Parks pages returned 403 to automated access                      |
| Mount Tamalpais State Park | The official page contradicts itself on which trails and dirt roads allow dogs |

## Not covered

No Midpen, San Mateo or state-park places beyond the above; no Marin County Parks place could be confirmed.
Coordinates are approximate map pins, not surveyed trailheads.

## Dog-friendly trails (checked 2026-11-15)

Shown only where an official page states it. Pages were fetched and read; `verified_by` for trail facts is the
same "pending human review" as the rules. Most agency pages do **not** say which trails allow dogs or give
per-trail lengths, so most places show park-wide facts or "not published".

| Place                                                                         | What is recorded                                                                                                                      | Source                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Windy Hill                                                                    | 9 named dog trails (Midpen dog page); lengths for 2 (Anniversary 0.6 mi, Sausal Pond Loop 1.6 mi)                                     | openspace.org preserve page and dog page     |
| Pulgas Ridge                                                                  | 4 named trails, all marked dogs on leash; lengths for 3 (0.8, 2, 1 mi); six miles of trails total                                     | openspace.org preserve page                  |
| Devil's Slide                                                                 | Devil's Slide Trail, 1.3 mi, listed dog-friendly                                                                                      | smcgov.org trail page and dogs page          |
| Tilden, Sibley, Redwood Regional, Briones, Point Isabel, Fort Funston         | park-wide facts only (no per-trail dog list or lengths)                                                                               | ebparks.org pages, nps.gov Fort Funston page |
| Muir Woods                                                                    | none: dogs not allowed                                                                                                                | rule                                         |
| Baker Beach, Crissy Field, Ocean Beach, Muir Beach, Lands End, Junipero Serra | "not published": the official pages fetched did not state it, or could not be fetched (NPS Baker/Crissy/Muir Beach URLs returned 404) |                                              |
| Rancho San Antonio, Pillar Point Bluff, Ring Mountain, Mount Tamalpais        | "not verified": the dog rule itself is unverified                                                                                     |                                              |

**Open question for you:** Midpen's Rancho San Antonio preserve page says "Dogs are not allowed in this
Preserve", but the app still shows that place as Unverified (you chose to leave it until you confirm; the
preserve adjoins a Santa Clara County park, so check which rule applies where).
