# Owner workspace review

Reviewed: 8 November 2026. Scope: current local source, owner navigation, overview, content editors, people management, registration/access entry points and theme CSS. Browser access host was unavailable, so rendered appearance, authenticated interactions and backend writes were not verified. No application behavior was changed in this review.

## Findings and concrete fixes

1. **High — Sports navigation can lead to empty content.** `AdminDashboard.tsx` lists sports teams and auction for owners unconditionally, but renders their components only when `annual_sports_mode_enabled` is false (lines 663–664). Derive menu availability and route rendering from the same mode rule. An existing bookmarked route should explain the current mode or redirect to its equivalent, rather than showing an empty body.

2. **High — Hero device switching can overwrite unsaved edits.** In `HeroMediaManagement.tsx`, the data-fetch effect depends on both `selectedPage` and `activeTab` (line 38), and replaces `form` and `baselineForm`. Switching desktop/mobile therefore refetches and can discard a draft. Fetch on page identity only, retain both device values in one draft, and handle dirty drafts before changing pages. Failed fetches also need a visible error/retry state: `!form` currently keeps displaying the loading view after failure.

3. **Medium — One page has several titles.** `OwnerAdminLayout.tsx:65` inserts a page heading; children add their own headings (`StudentManagement.tsx:51`, `HomepageManagement.tsx:363`, `HeroMediaManagement.tsx:68`, `RicoFamilyManagement.tsx:41`). A student page can read “Student ID approvals” and then “Student System”. Give the shell one title, description and action area; embedded children should render section headings only. Do not remove headings globally with CSS because some components also run outside this shell.

4. **Medium — Navigation exposes too many implementation-level sections.** The tab list in `AdminDashboard.tsx:353` mixes tasks, website sections, form configuration, operational tools and legacy tools at the same level. Categories, separate registration form editors, face indexing and legacy teams do not need permanent top-level prominence. Keep them reachable within their parent area, with searchable links to their exact subpage.

5. **Medium — Legacy routes and render branches disagree.** The dashboard still renders `faculty`, `core-team` and `form-settings`, but those IDs are absent from its visible tab list. Its active-tab validation redirects them to the first available page. Unlike old access routes, they have no explicit migration. Redirect faculty/core-team to the correct Rico Family section and decide where form settings belongs. Preserve permissions through the migration; do not silently grant a parent area's full access.

6. **Medium — Rico Family repeats section selection and loses location.** `RicoFamilyManagement.tsx` renders the same five sections as clickable stats cards and accordion headings. Its `toggle` always returns the selected ID, so the open accordion cannot close. Section selection lives only in local state. Choose one tab/section navigation, put selection in the URL, and allow overview directory links to open Committees or Members directly. Currently both overview links go to `/admin/rico-family`, whose initial section is Faculty.

7. **Medium — Sponsor content has competing authoring paths.** Homepage edits `homepageSettings.sponsor_logos`, while Sponsors manages sponsor records. The public FeaturedSponsors component receives `sponsors.filter(sponsor => sponsor.featured)` from Home.tsx. This creates ambiguity about which list controls the public output. Document the consumers first, then make Sponsors the canonical record editor and keep only display settings/record selection under Homepage. Migrate referenced logos before retiring the old field.

8. **Medium — Hero editing is split across two places.** Homepage contains hero copy, branding, and legacy media fields in its save payload; Hero Media Studio edits the separate hero media service used by HomeHero. Copy and device media are distinct responsibilities, but their split is unclear to the owner. Put copy and desktop/mobile media under one Homepage → Hero area, backed by their existing services initially. Remove legacy media writes only after checking every consumer.

9. **Medium — “ID approvals” understates the destination.** StudentManagement also contains profile-field settings and Google authentication controls. The institution visibility field is edited in both StudentManagement and SiteSettingsPanel. Give this destination the name “Students”, with Approvals, Profiles and Login settings sections; keep a single canonical editor for each setting and link to it from elsewhere.

10. **Medium — Theme compatibility rules conceal inconsistent component styles.** DashboardTheme.css remaps long lists of Tailwind classes with `!important`; OwnerWorkspace.css forces heading font and weight. Child panels still hardcode dark backgrounds, gradients, white text and uppercase microcopy. This makes future styles fragile. Introduce shared surface/text/border/status tokens and migrate components incrementally. Remove a compatibility rule only after its consumers migrate; verify both appearances and dialogs rendered outside the workspace root.

11. **Medium — Typography is too small in important areas.** OwnerWorkspace.css sets navigation groups to 9px, account email to 8px and brand subtitle to 7px; overview and footer also use very small labels. Increase essential labels to roughly 12–14px and secondary copy to 11–12px, then check wrapping, zoom and mobile behavior. These are source measurements, not a rendered contrast/accessibility audit.

12. **Low — Overview repeats navigation more than it prioritizes work.** Events appears in the banner, metrics and empty-state CTA; Registrations has three metrics, a review queue entry and a recent table. Those links can be useful, but the current Approved/Pending metrics all lead to the same unfiltered page, and recent-row links do not identify their participant. Keep total counts compact; link Approved/Pending to real filters and recent rows to a selected registration. Consolidate account-security prompts and make the main review queue the dominant action.

13. **Low — Save behavior and naming are inconsistent.** Hero uses a “Deploy” button and native alerts for a media save; Homepage has Open Editor, Save Branding, Save All Changes, Exit Editor and Cancel & Reset. Standardize action names and scope: “Save changes”, “Discard changes”, explicit saved/error feedback, and a consistent dirty-state policy. Keep independent partial saves only when their scope is clear.

14. **Low — Search and mobile navigation need targeted behavior checks.** The shell offers the same search from sidebar and topbar, which is a useful shortcut, not a duplicate feature to delete automatically. Search currently matches only section labels/groups. Add aliases and exact subpage results. The mobile sidebar moves focus inside but does not implement a modal focus boundary; verify keyboard focus, Escape and focus restoration before treating it as accessible.

## Proposed navigation

| Area | Contents |
| --- | --- |
| Overview | Counts, pending decisions, recent activity |
| Festival | Events, categories inside Events, schedule, sponsors, Homebound |
| Registrations | Festival/annual/sports applications, auditions, memberships; forms as a settings subpage |
| Students & passes | ID approvals, student profiles, entry passes, pass operations, registration photos |
| Website | Homepage with Hero/Branding sections, About, gallery, social, roadmap, shout-outs |
| People | Faculty, council, committees, heads, members, band, artists and guests |
| Sports | Mode-aware seasons, teams, matches and auction; explicit legacy access |
| Settings & access | Passwords & Access, site availability, protection, audit, diagnostics |

Announcements, notifications and support require a product distinction before consolidation: public broadcasts, recipient notifications and support conversations are different workflows. Similar names alone do not establish duplicated functionality.

## Implementation order and acceptance checks

1. Fix empty sports routes and Hero draft overwrite/error states. Check both sports modes and device/page switching with an unsaved edit.
2. Create one typed section registry for label, group, route, visibility, availability and component. Use it for the owner menu, search and route validation. Preserve existing non-owner page grants and migrate aliases explicitly.
3. Introduce shared page headers, buttons, panels, filters, empty/error/loading states and semantic theme tokens. Convert owner pages area by area.
4. Consolidate overlapping editors after tracing read/write consumers; migrate references without deleting user data. Add deep links for people sections, registration filters and individual records.
5. Verify owner and restricted-admin navigation, refresh/back/bookmarked routes, form save failures, unsaved draft transitions, light/dark dialogs, keyboard operation and narrow layouts. Existing shell tests alone do not cover these flows.

Success means each task has one clear authoring destination, every visible route produces usable content, old links reach the equivalent section, drafts survive harmless tab changes, and all management pages share the same visual and interaction rules.


## Implemented cleanup

- Extracted shared section metadata and parent relationships to `src/constants/adminSections.ts`; the owner sidebar now shows parent destinations and contextual navigation exposes child tools. Search includes internal people, student and access sections.
- Sports availability comes from that metadata. Unavailable teams/auction tools are omitted from owner navigation, while bookmarks show a mode explanation and an annual-events action.
- Fixed Hero media device refetch, page-switch draft loss, fetch error/retry handling and stale asynchronous loads. Drafts persist in session storage; save failures keep them, with explicit save/discard feedback. Public Hero reads retain their existing fallback behavior; editor reads report failures.
- Removed the extra shell title for pages with their own heading. Added consistent, theme-aware navigation, people/settings panels, action buttons and larger owner text. Existing compatibility CSS remains for older management components; this is an incremental migration, not a claim that every panel has been rewritten.
- Replaced Rico Family's repeated cards/accordion navigation with one URL-addressed section selector. Owner legacy Faculty/Core Team links redirect to equivalent sections; overview directory links open Members/Committees directly.
- Homepage opens directly, groups its settings into collapsible sections, uses one save/discard action including branding, and routes sponsor authoring to Sponsors. Legacy logo records are retained in storage and excluded from unrelated homepage saves. Removed obsolete hero-file deletion from homepage saves; media editing uses the dedicated Hero service.
- Students now has an accurate name and URL-addressed approvals/profile/login sections. Owner institution controls live under Students; delegated registration admins retain their existing assigned controls. Site Settings no longer writes stale copies of those institution fields.
- Overview Approved/Pending links apply status filters. Recent participant links apply search and expand the selected registration. Account-security shortcuts open the account section directly.
- Added regression coverage for drafts, failed reads/saves, contextual navigation, deep-linked people sections and consolidated homepage saving.

Validation: 18 targeted tests passed; TypeScript check passed; production build passed. Local `/admin` responds with HTTP 200. Authenticated browser rendering and live database writes were not exercised because the browser access host was unavailable. No live records were migrated or deleted.
