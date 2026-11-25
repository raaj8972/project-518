# Sponsor page reference implementation

The `/sponsors` page follows the approved emerald-and-gold desktop and mobile references: a laurel heading, edition timeline, partner statistics, category filters, featured title sponsors, horizontal logo rows, previous-edition carousel and sponsorship invitation.

Partner counts and categories come from published records. Current partners and archives are displayed together. No brands, historical counts or festival duration have been invented to fill the reference layout; the third statistic identifies the current edition.

## Managing the page

In Sponsors, use the existing publication controls on a sponsor card:

- **Edition** chooses current or previous partners.
- **Archive year** assigns a previous partner to a specific year. Unassigned older records appear under **Earlier editions**.
- **Partner category** accepts Food, Travel, Study, Technology, Health, Lifestyle, Media or a custom label. Save category independently of the sponsorship tier.
- Existing page and homepage visibility controls continue to apply. Owner approval restrictions are preserved.

These fields are stored in the existing `homepage_settings.sponsor_logos` placement JSON. They are retained when editing visibility and never sent as unsupported columns to the sponsors table. Changing editions clears an outdated archive year. Legacy logos remain editable through the earlier setup archive.

The sponsorship invitation opens a keyboard-accessible dialog with saved contact sections, the official enabled Instagram link, an available brochure and enabled sponsorship packages. The public management data loader now fetches the configured contact sections and listens for their updates. No fallback email address or phone number is fabricated.

## Motion and responsive behavior

The page uses viewport reveals, spring-based filter selection, short filter and archive transitions, title-card sheen and ambient mist movement. Content is visible before animation initializes. Continuous CSS effects pause in a hidden tab or outside the viewport; reduced-motion preferences suppress animation. The old page-wide scroll listener and direct mutations of other page elements have been removed.

Mobile layouts use horizontally scrollable category filters and sponsor rails, an independently scrollable title showcase and a two-column expanded logo grid. Archive summaries move above the logos on small screens to free their full width. Logo dimensions scale with the viewport and available space; a single archived or expanded partner gets a larger centered presentation, while multiple partners use balanced columns. The former 29–48px image areas and 155px image cap have been removed. Logos sit directly on the themed background without white tiles or duplicate visible name captions. They preserve their original artwork and aspect ratio, retain accessible brand names and have a readable failure fallback.

## Verification

- TypeScript application type-check passes.
- Production build and the postbuild security scan pass.
- 38 tests pass across directory interactions, categorization, archives, metadata editing, public contact fetching, existing homepage selection, sponsor administration, lighting and smoke.
- Safari desktop and a 390px iframe viewport were visually checked using temporary local preview files and illustrative test fixtures. Travel filtering, expanded lists, archive switching, and the contact dialog were exercised. The temporary preview files were removed and no live records were changed.
- ESLint cannot initialize with the repository's existing AJV dependency mismatch (`Cannot set properties of undefined (setting 'defaultMeta')`). Dependency versions were left unchanged.
