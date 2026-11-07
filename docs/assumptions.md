# Assumptions and kill criteria

Three hypotheses this prototype exists to test. Thresholds are **proposals** for you to adjust before
collecting data. Events are logged by `src/lib/track.ts` (first party, no cookies, no accounts).

## H1. Owners get surprised by dog rules often enough to care

Owners regularly arrive at a trail and find dogs are banned, leash rules differ from what they expected, or
an app was wrong.

**How we measure**

- `docs/audit-template.csv`: compare AllTrails (or BringFido) against the official agency rule for 30+ places.
  This measures how often existing apps are wrong. Logged events cannot measure surprise by themselves.
- Short interviews (10+ owners like Emily): "In the last 6 months, did a dog rule surprise you on arrival?"
- In-app signals: `report_submitted` with `type = wrong_rule` (people correcting us), and `place_viewed` where
  `state` is `no_dogs` or `unverified` (rules that would have surprised someone).

**Kill or pivot if** the audit finds existing apps wrong in under 10% of places **and** fewer than 3 of 10
interviewed owners recall a recent surprise.

## H2. A verified, dated rule makes a new place feel safe

Seeing an official source and a check date turns "I think dogs are OK" into "I will drive there".

**How we measure**

- `gonogo_opened / place_viewed`: did people actually see the card. `gonogo_opened` fires when half the card is on screen.
- `source_link_clicked / gonogo_opened`: do people check the source. Read together with a one-question exit
  survey ("Did this make you more willing to try a new place?"), because clicks can mean trust or doubt.
- `filter_used` with `filter = off_leash` or `rule`: people choosing by rule.
- `place_viewed` for places the person is new to (needs a survey or interview, not an event).

**Kill or rethink if** after 200 place views fewer than 40% reach the card (`gonogo_opened / place_viewed < 0.4`)
**or** fewer than half of surveyed users say the verified rule made them more willing to try a new place.

## H3. People return weekly for curated picks

Emily decides on Thursday or Friday night. A weekly "Sunday picks" habit is the retention loop.

**How we measure**

- `sunday_viewed` per week (a small addition beyond your five events), and `place_viewed` with `from = sunday`.
- Weekly return needs an anonymous repeat-visitor id, which is **not** implemented: the session id is in
  memory per tab, by design. Decision for you: add an optional random id in `localStorage` (no PII), or use
  email or push sign-ups as the return signal.

**Kill or rethink if** after 4 weeks with at least 30 weekly Sunday-picks viewers, fewer than 20% of week-1
viewers view again in weeks 2 to 4, or fewer than 30% of Sunday-pick views lead to a `place_viewed` with
`from = sunday`.

## Other assumptions we are making

- Drive area and outing length matter more than precise drive time for the first decision.
- Emily trusts agency pages over crowd-sourced flags.
- Volunteers or the owner can keep ~20 to 50 rules fresh on a 90-day recheck cycle (watch the Recheck due count).
- Bay Area agencies change dog rules rarely enough that a dated stamp is useful, but often enough that stale
  data is a real risk. Rule changes are tracked in `place_rule_history`.
