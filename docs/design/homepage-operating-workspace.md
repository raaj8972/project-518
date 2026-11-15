# Homepage operating workspace

Implemented for the owner’s request on 8 November 2026. Entry: `/admin/homepage`.

## Editing areas

- **Background** is the default for owners and authorized media admins. Separate laptop/desktop and mobile uploads, hosted URLs, loading posters and crop settings write to the existing `hero_media` row for `home`. Publishing video changes requires both device clips. Published assets are retained when replacements are uploaded or removed from a draft.
- **Content / Branding** edit the existing homepage settings.
- **Auto sections** shows the actual selected featured events and live Rico Stars ranking. Featured events use visible events dated today or later, with India dates first and published `events.current_registrations` counts breaking same-day ties; undated events follow dated ones. Past and hidden events are excluded. Manual `featured` flags no longer determine the homepage selection. The date refreshes on a 30-second clock/focus; event data has realtime and a 60-second events-only recovery refresh.
- **People** combines homepage visibility/timing with editable faculty, committee-head and council profiles, including real images. Saves use the existing personnel mutations. New committee/council profiles require a committee. Existing profile fields outside this editor are preserved.
- **Partners** on Home edits appearance only: heading, subtitle and strip movement. Sponsors is the single publication workspace for names, logos, URLs, order, Previous / Current edition, per-record homepage featuring and the overall homepage section switch. Home and Sponsors share the active edition; Home displays its featured subset. Sponsor catalog fields remain authoritative, and old standalone logos remain editable in Sponsors. Existing `homepage_settings.sponsor_logos` stores edition/visibility metadata linked by sponsor ID without requiring a schema change. Home saves exclude this metadata and the master section switch to avoid overwriting Sponsors changes. See `sponsor-single-workspace.md` for the current flow.
- **About** edits the existing `about_settings` row: visibility, headings, paragraphs, tracks/zones and configured statistics. About content now receives realtime updates; unconfigured statistics do not invent attendance counts.
- **Films** retains trailer/aftermovie controls, distinct from the actual background video.

## Save and access behavior

One save bar handles changed resources in sequence. Every successful resource is marked saved independently. If a later write fails, only remaining drafts are retried, and feedback names the already-saved parts. Profile drafts are removed individually after success to avoid replaying earlier profile mutations. Drafts persist locally between section changes/reloads.

Page grants are respected: media needs `hero-media`, About needs `about`, personnel editing needs `rico-family` or applicable legacy grants, and partner-logo editing needs `sponsors`. Explicit page grants take precedence over legacy personnel flags. Homepage-only admins retain page display settings and read-only automatic information without receiving these additional mutations. Owner legacy media/About bookmarks redirect into the integrated studio; other delegated routes remain available under existing grants.

The public hero respects separate device sources, image/video choice, background visibility, crop and shading. Rico Stars retains the existing scoring model, shares cached ranking reads, subscribes to result/registration/XP/profile changes, and has a 60-second/focus recovery refresh. Its explicit refresh bypasses the cache.

No live content was published, uploaded or deleted by the agent. Automated checks use fixtures/mocked writes. Browser rendering and a live storage upload still require verification in an authenticated session; the computer-use browser host is unavailable in this environment.


## Social and Roadmap consolidation

Social Media and Roadmap are now first-class tabs inside the same studio, with the common draft/save/retry flow. The extra sibling navigation is removed; owner bookmarks and search results go to `?edit=social` or `?edit=roadmap`. Delegated users with both Homepage and the specific page grant also use the integrated route; single-page grants keep their authorized standalone route.

Social links validate platform hosts/protocols and write only `social_media_settings`; website footers receive realtime updates. Roadmap edits write only changed/new `roadmap_milestones`, preserving successful writes after a later error. Built-in history can be explicitly copied into editable draft entries.

Roadmap visibility is backward compatible: absence of `roadmap_enabled` means visible, and this missing column is never included in a save payload. If the deployment already has an explicit boolean visibility field, the studio exposes the switch and preserves an explicit off setting. Individual milestones always retain their enabled controls.

Public milestone text is visible without waiting for vehicle animation or IntersectionObserver. SVG measurement has a static geometry fallback, saved side metadata stays with sorted/filtered milestones, and all-disabled records do not resurrect fallback content. Road styling has sufficient separation from its background to remain identifiable.


## Nullable data and draft recovery audit

The media table allows null URL columns. Spreading database rows over defaults let null override required editor strings; save validation then crashed at `video_url.trim()`. Media fetch, realtime updates, standalone draft restore and saves now use the same runtime normalizer. Missing URLs become empty strings, explicit visibility is retained, crop values are finite and bounded, unknown metadata is excluded, and partial saves preserve other saved device assets. DELETE realtime events restore clean defaults and callbacks after unsubscribe are ignored.

Homepage, About, Social, lead and Roadmap drafts validate their runtime shape before rendering. Known usable draft edits survive recovery; malformed values fall back to saved values or safe editable defaults. Nested lists reject null/invalid entries, optional numeric settings cannot serialize NaN, and partner/catalog data receives the same string guards. Discard, delayed media loading and source refreshes are covered by regression tests so restored defaults do not leave phantom unsaved changes.

Verification: all 42 test files / 246 tests pass, including nullable database fixtures, malformed/partial local drafts across all 10 tabs, missing-device validation, save failures, partial saves, realtime cleanup and async load/discard. Production build passes. Authenticated browser interaction and live uploads remain outside these automated checks.

## Current media visibility

A read-only check against the configured Supabase project found `hero_media.home` with null desktop/mobile video and image URLs, and null `homepage_settings.hero_media_url`; homepage copy was present. The visible video was the existing deployed `/hero-preview.mp4` file (localhost returned 200, video/mp4), which the old editor omitted because its upload cards only displayed saved database URLs.

Public hero, studio preview and device cards now share the effective asset resolver. Both device cards show the active built-in video when no saved asset exists, and mobile clearly identifies when it inherits the saved desktop clip. The uploader can show a read-only fallback preview while retaining replacement controls; it never treats the fallback as an uploaded asset, cannot delete it, and does not dirty the form or publish defaults on load. Saved Supabase URLs take precedence. Crop/poster/visibility changes preserve existing fallback or desktop-only playback; replacement video URL changes still require both device clips.

Verified with all 43 test files / 250 tests, type-check and production build. The real upload component is covered for fallback playback, replacement control, no implicit mutation and saved URL precedence. No Supabase content was changed during diagnosis.
