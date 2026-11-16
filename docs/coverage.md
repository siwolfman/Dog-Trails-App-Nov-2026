# Coverage

Checked **2026-11-15** (batch 1) and **2026-11-16** (batch 2). Every rule below was read from an official page and is marked
"pending human review" like the original 20 places. Where an official page could not be read,
the place is shown as **Unverified** rather than guessed. Coordinates are approximate map pins
(looked up from park addresses with OpenStreetMap's geocoder, or from Wikipedia), not surveyed trailheads.

## Added in batch 1

| Area                                                                                                  | Agency                                      | Source read                                                                                                                                                                                                                                 | Places                                  |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Sonoma County                                                                                         | Sonoma County Regional Parks                | Each park's own page ("Dogs" line)                                                                                                                                                                                                          | 28 parks, preserves, beaches and trails |
| Sonoma, Marin, Napa, Solano, Contra Costa, Santa Clara, San Francisco, Santa Cruz and San Mateo coast | California State Parks                      | The statewide dog table (parks.ca.gov/Dogs), plus the park page for Sonoma Coast, Annadel, Sugarloaf Ridge, Armstrong Redwoods (also Austin Creek), Wilder Ranch, Henry Cowell, Natural Bridges, Lighthouse Field, Nisene Marks and Benicia | 36 state parks and beaches              |
| Santa Cruz County                                                                                     | Santa Cruz County Parks                     | Dogs at County Parks page                                                                                                                                                                                                                   | 6 county parks and beaches              |
| Livermore, Pleasanton, Sunol, Fremont, Hayward, Brentwood                                             | East Bay Regional Park District             | ebparks.org/dogs (district-wide rule and its list of no-dog parks)                                                                                                                                                                          | 11 preserves and parks                  |
| Livermore                                                                                             | Livermore Area Recreation and Park District | Sycamore Grove FAQ                                                                                                                                                                                                                          | 1 park                                  |
| Solano County                                                                                         | Solano County Parks                         | Lynch Canyon park page                                                                                                                                                                                                                      | 1 park                                  |

## Added in batch 2 (Marin and Napa)

| Area                                | Agency                                            | Source read                                                                                                                                                                        | Places                                                                           |
| ----------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Marin County                        | Marin County Parks and Open Space District        | Each preserve's or park's own page (its "Dogs" line and rules box), plus the county Rules & Regulations page. Pages that blocked automated fetching were read in a normal browser. | 39 preserves, beaches, pathways and parks                                        |
| Mount Tamalpais watershed           | Marin Municipal Water District (Marin Water)      | Mt. Tam Watershed visitor information page                                                                                                                                         | 4 (the watershed, Lake Lagunitas, Bon Tempe Lake, Phoenix Lake)                  |
| Point Reyes                         | National Park Service                             | Point Reyes "Pets" page                                                                                                                                                            | 5 (the Seashore, Kehoe Beach, Limantour Beach, Great Beach, Tomales Point Trail) |
| Marin Headlands, Stinson, Muir area | Golden Gate National Recreation Area              | Superintendent's Compendium and the Tennessee Valley page                                                                                                                          | 4 (Rodeo Beach, Stinson Beach, Tennessee Valley, Oakwood Valley Trail)           |
| Napa County                         | Napa County Regional Park and Open Space District | Each park's page on napaoutdoors.org                                                                                                                                               | 9 parks and trails (Moore Creek is two entries, one for each unit)               |
| Napa                                | Skyline Wilderness Park                           | The park's notices ("No dogs allowed on the trails")                                                                                                                               | 1                                                                                |
| Marin, Napa, Sonoma                 | California State Parks                            | Statewide dog table                                                                                                                                                                | 4 historic parks                                                                 |

Ring Mountain (Marin) moved from Unverified to **Leash required** now that the county's own preserve page could be read.

### How the county's rules map to the app

- "Dogs may be off-leash on fire roads only if kept under voice control; dogs on signed trails must be leashed" is shown as **Off-leash zones**, with the fire-road limit in the notes.
- Preserves that say "leashed at all times" are shown as **Leash required**.
- Tennessee Valley and Stinson Beach are shown as **No dogs** because the park limits dogs to a short on-leash stretch or the parking and picnic areas.
- Point Reyes allows dogs on three beaches and one trail only; it is shown as **Leash required** with that list and the plover and elephant-seal closures in the summary.

## Shown as Unverified (official page could not be read automatically)

- **Lagoon Valley Regional Park** (Vacaville) and **Rockville Hills Regional Park** (Fairfield): the city pages returned an error to automated access.
- **Lake Sonoma Recreation Area** (Geyserville): the Army Corps of Engineers page returned an error.
- **Berryessa Peak Trail** (Napa): the district's page does not say whether dogs are allowed.
- Still Unverified from before: Pillar Point Bluff, Mount Tamalpais State Park (the state's own pages disagree about trails).

## How to read the rules

- State parks: many say "dogs allowed" but only in developed areas, campgrounds or on paved roads. Those are shown as **No dogs**
  with the exact allowed areas in the summary, because a person wanting to walk a trail with their dog cannot.
- State parks whose entry on the statewide page has no extra detail are shown as **Leash required** with a caveat that the
  page gives no park-specific limits and that statewide, dogs are generally not allowed on trails unless a park allows them.
- Sonoma County parks and trails: "Allowed on leash" is shown as Leash required, even where the park has a fenced off-leash dog park (shown as Off-leash zones).

## Still to do

The rest of EBRPD (about 50 more parks), Contra Costa and Alameda County and city systems, San Mateo County Parks and the rest of
Midpen, Santa Clara County Parks, San Jose, the remaining Santa Cruz County and city of Santa Cruz parks, Solano County parks
(Lake Solano), Sonoma land trust preserves, and the Marin Headlands trails (the park's own pages were unavailable).
Places that could not be pinned reliably yet: Quail Hollow Ranch, Pinnacle Gulch trail, Cedar Mountain Ridge (batch 1), Upton Beach,
the Napa River and Bay Trail and Berryessa Vista Wilderness Park (batch 2). Photos and trail facts have not been added for the new
places yet; they keep the generic header.
