# Student rewards and first-login overview

Implemented with `20261123030000_student_rewards_and_onboarding.sql`, applied to the configured Supabase project and recorded in its migration ledger.

## Student experience

- The first approved dashboard visit opens a seven-step tour: Home, Events and teams, Entry pass, Notifications, points, Help, and Profile. Each step explains where the feature lives on desktop and mobile and links to the relevant page.
- Back, Next, Skip, Escape, and Finish are supported. Native modal-dialog focus behaviour keeps keyboard navigation inside the tour. The decision is stored per account and tour version in the database, with a local device fallback.
- Home has Quick tour and How to earn points links. The desktop sidebar and mobile menu include **Guide & points** at `/dashboard/guide`. The guide explains every earning rule, tiers, a worked example, support routes, and the student's own XP / verified-event progress towards Elite.
- Community separates **Rico Stars · Performance** from **Crowd Favourite · Likes**. The edition selector opens past performance records. Equal positive scores share a rank; zero scores are unranked. Profile and event-winner screens use the same authoritative scoreboard.

## Active earning rules

| Activity | XP | R Points |
| --- | ---: | ---: |
| Approved account with name, phone, and batch completed | 50 once per account | 0 |
| Daily dashboard check-in, once per India calendar day | 5 | 0 |
| Staff-verified participation | 100 per event | 20 per event |
| Each qualified non-final round | 50 | 10 |
| Each qualified final round | 50 | 20 instead of 10 |
| Highest placement in an event: first / second / third | 0 extra | 50 / 30 / 20 once |
| Likes, unlikes, shoutouts, registration approval | 0 | 0 |

XP carries across festival editions. Bronze starts at 0, Silver at 100, Gold at 500. Elite requires **1,000 XP and two distinct verified event participations**. A qualified round also proves participation. All verified events contribute XP; only the **best three event scores in that edition** contribute competitive R Points.

Duplicate registrations and duplicate round records do not multiply rewards. Only approved, non-deleted registrations qualify. Rejected/cancelled entries and staff corrections affect the derived totals. Finals are recognised by round names such as Final, Finals, and Finale; semi/quarter finals use the non-final rate. Events receive a persistent `festival_year`, backfilled from their date where possible; the current edition comes from `homepage_settings.brand_year`.

## Staff workflow and protection

- Coordinator dashboard → event rounds → **Verify event participation · XP & leaderboard**.
- Admin dashboard → Registrations → same verification panel, with an event selector.
- Assigned coordinators and staff with registration-management access can verify or undo participation. Students cannot award themselves event points or edit qualifications. A qualification remains evidence until the recorded result is corrected.
- `get_student_scoreboard` exposes only public profile fields and reward totals. Direct writes to XP caches and the award ledger are revoked; private score views and recomputation helpers cannot be called by students. The daily award RPC validates identity, eligibility, amount, and a unique India-date source.
- The legacy registration and like XP triggers are retired. Existing balances are retained in the private `student_legacy_xp_snapshot`; current balances are recomputed from the new verified evidence. The old activity log is retained.
- Historic competition totals are derived from event records and remain correctable. They are not immutable year-end snapshots. Crowd Favourite uses current lifetime likes, including when viewing a past performance edition.

## Validation

Database integration tests apply the migration twice and cover scoped staff verification, direct-write rejection, repeated check-ins, legacy-trigger compatibility, distinct rounds, placement selection, best-three scoring, tied ranks, historic editions, Elite eligibility, and account-isolated tour preferences. Component tests cover tour navigation, Skip/Finish/replay, support routing, staff verification/undo, and visible errors. Live metadata checks verified protected writes, enabled row security, zero legacy XP triggers, and matching personal XP caches. Browser visual verification was unavailable in this environment.
