# Sports temporarily hidden

Owner request, 8 November 2026: remove Sports everywhere in the visible site for now, while remembering and preserving the implementation for later.

The switch is `SITE_FEATURES.sports` in `src/constants/siteFeatures.ts`, currently **false**. This controls public navigation/routes, owner and delegated admin sections, permission-picker choices, student navigation/statistics/upcoming items, Sports gallery content, announcements, site-settings controls and Sports data-domain loading. Existing Sports landing-page preferences are ignored while hidden to prevent redirects back into the disabled section.

Preserved inventory:

- Seasons, teams, matches, auction, registrations, registration forms and announcements.
- Annual Sports events, schedule, registrations and forms.
- Legacy Sports teams.
- Public Sports page and student Sports page, registration UI and media.
- Existing tables, records, photos, permissions, navigation preferences, page locks and settings.

No database migrations, destructive deletes or permission revocations were performed. Hidden permissions remain in existing users' stored grants when other page assignments are edited. Public Sports and student Sports URLs redirect to Home and Dashboard respectively. Hidden admin routes fall back to Overview/the user's first assigned section without mounting the Sports editor.

For restoration: set the switch to true, verify the existing sports-mode rules and stored grants, and restore the public sitemap entry for `https://ricorrenza.fun/sports` (monthly, priority 0.6). Run the normal type/build checks and Sports tests; `tests/sports-hidden.test.tsx` intentionally asserts the current disabled default and will need updating when the owner requests restoration.

This is a presentation/routing feature switch, not a backend access-control change. Arbitrary user-authored prose or historical records mentioning sports have not been rewritten.
