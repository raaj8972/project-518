# Schedule Linking Guide

This document explains how schedule entries link to Events or Guest Artists so that LIVE / Opens in / NOT LIVE badges stay accurate across the site.

## Concepts
- **Schedule Entry (schedule_events)**: A row representing an item in the public schedule timeline.
- **Event**: A richer object (e.g. performances, showcases) with start time, registration state, and optional `watch_live_url`.
- **Guest Artist**: A performer or speaker that can also have a `watch_live_url` and start time context.
- **Foreign Keys Added**: `event_id` and `guest_artist_id` (mutually exclusive) on `schedule_events`.

## Live Status Logic (Centralized)
Implemented in `utils/eventTime.ts`:
- `parseEventDateTime(raw: string | Date | null)` – Normalizes various stored date/time formats.
- `computeLiveStatus(start: Date | null, now: Date, registrationOpen: boolean, leadMinutes: number)` → `{ isLive, isPreLive, msUntilStart }`
- `formatPreLiveCountdown(msUntilStart: number)` – Returns compact `MM:SS` or `H:MM:SS` string.

Configured lead window: `LIVE_LEAD_MINUTES = 60` (in `liveStream.ts`).

A linked entry is considered LIVE if:
1. `now >= startTime`, OR
2. The linked entity (event) has `registration_open = true` (forced early live)

It is considered PRE-LIVE ("Opens in …") if within 60 minutes of start.
Otherwise it is NOT LIVE.

## Derivation Order for Schedule Entries
For each schedule entry row:
1. If `event_id` is set → resolve that Event and use its:
   - `start_time` (or equivalent field used previously)
   - `registration_open`
   - `watch_live_url`
2. Else if `guest_artist_id` is set → resolve that Guest Artist and use its:
   - `start_time` if defined (guest artist must provide or else fallback to schedule entry's own start field)
   - `registration_open` (if applicable) or treat as false
   - `watch_live_url`
3. Else (no links) → fallback to the schedule entry's own `start_time` (legacy behavior) and it will only show NOT LIVE unless future enhancement adds per-entry watch links.

## Mutual Exclusivity
The update mutation enforces that only one of `event_id` or `guest_artist_id` can be non-null. Setting one clears the other automatically (in `updateScheduleEvent`). This prevents ambiguous source-of-truth conflicts.

## Admin Workflow
1. Navigate to **Admin → Schedule Management**.
2. Select (or create) a schedule entry.
3. Use the **Event Link** dropdown to associate with an Event OR the **Guest Artist Link** dropdown to associate with a Guest Artist.
4. Saving will:
   - Persist the foreign key
   - Clear the other key if set
5. The public Schedule page immediately reflects the LIVE / Opens in countdown sourced from the linked entity.
6. To unlink, choose the blank/"None" option (or click the unlink control if provided) which sets both keys to null.

## Visual Indicators
- `LIVE` badge (pulsing) – Active; clicking related Watch button (future enhancement) will open `watch_live_url`.
- `Opens in MM:SS` – Within the 60 minute lead window.
- `NOT LIVE` – Outside lead window or missing valid start/watch info.

## Edge Cases & Fallbacks
| Scenario | Behavior |
|----------|----------|
| Linked event missing `start_time` | Treated as NOT LIVE; no countdown (logically could be enhanced to warn admin). |
| Guest artist lacks `watch_live_url` | Still can show LIVE status if time criteria met; button may be hidden until URL added. |
| Both FKs somehow set (manual DB edit) | Frontend picks `event_id` first; mutation path should prevent this. Recommend DB cleanup. |
| registration_open true but start in far future (> lead window) | Shows LIVE (forced) per product decision. |
| Clock drift / user local time mismatch | All calculations use client `Date.now()`; consider future server time sync if critical. |

## Future Enhancements (Optional)
- Inline `WatchLiveButton` inside each schedule row when a `watch_live_url` is available.
- Distinct styling for "FORCED LIVE" (early via registration) vs natural start.
- Typeahead searchable selects for large event/artist lists.
- Admin warning badge if linked entity missing start time or URL.<br>
- Server-driven time sync endpoint to avoid client clock skew.

## Forced Live Override
Some contexts (e.g. `events.registration_open`, `guest_artists.live_now_enabled`, or featured spotlighting) may intentionally surface the Watch button in a LIVE state before the scheduled start. The `WatchLiveButton` now supports a `forceLive` prop to:
1. Skip the 60‑minute gating entirely.
2. Render the button as LIVE immediately.
3. Still fire analytics click events identically to a naturally-live state.

When `forceLive` is true:
- Time delta / countdown chip is suppressed (shows as LIVE).
- Lead window check (`delta > leadMs`) is bypassed.
- Upstream logic MUST ensure this override is intentional to avoid premature exposure of streams.

Current usage:
- Events page: forceLive when `registration_open` is true OR event is `featured`.
- Guest Artist modal & homepage carousel: forceLive when `live_now_enabled` or `is_featured`.
- Schedule page: forceLive when linked event `registration_open` or featured, or guest artist `live_now_enabled` / `is_featured`, or raw schedule row `registration_open` / `force_live_override` flag.

Potential refinement: visually differentiate forced vs natural live (e.g., subtle striped glow or tooltip "Early Access Live").

### Styling Implementation
- Forced (Early Access) buttons use a multicolor gradient (amber→rose→fuchsia) with a subtle diagonal hatch overlay.
- Dot indicator gets a ring (amber) and optional blended glow.
- Badge text: `EARLY LIVE` instead of `LIVE` on schedule entries.
- Tooltip is prefixed with `EARLY ACCESS •`.

### Analytics Extension
`fireLiveClick` payload now supports optional `isForcedLive`.
Handler signature:
```
({ url, startTime, clickedAt, isLive, isForcedLive? }) => void
```
Use this to distinguish natural vs forced activation in dashboards.

## Developer Notes
- Keep `liveStream.ts` as single source for timing constants to avoid divergence.
- When changing schema, add idempotent migration with `IF NOT EXISTS` guards.
- If adding feature artist linkage later, mirror pattern: add `feature_artist_id` nullable FK and extend exclusivity logic.

## Quick Reference
```
LIVE if: now >= start OR registration_open
PRE-LIVE if: !LIVE AND start - now <= 60min
Else: NOT LIVE
Countdown: formatPreLiveCountdown(msUntilStart)
```

---
Last updated: (auto-generated doc)
