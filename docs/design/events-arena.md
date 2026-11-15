# Events arena

The events page uses a cinematic emerald and aged-gold palette, a full-width masthead, two-column landscape posters, dark fades behind live text, category filters and a four-event opening selection. View all reveals the remaining published events. Mobile uses one column.

The filter has exactly **All, Cultural and Academic**, fitted into three columns on mobile as well as desktop. Each option has a chamfered gold frame; the selected option has a brighter gold edge and green inset. The heading uses a solid light-gold fill for contrast. Event creation/editing offers Cultural and Academic only. Existing retired labels such as Fashion are presented under Cultural until an admin reassigns the event; no existing events are deleted or hidden by this presentation change.

The Hall of Fame uses an opaque emerald honour roll with gold laurel crests, readable cream winner names and numbered placements. Cards resolve the actual event title from event data instead of a generic “Event” label. Ties share a placement, Special Mentions remain visible, and names with a connected student profile can open it. A single event uses a centred wide panel; multiple events use two columns on desktop and one on mobile. No winners or unfilled placements are fabricated.

Winner event IDs retain their original string/UUID or numeric representation throughout merging. Converting UUIDs with `Number()` previously broke the title lookup. Round-winning registrations also provide their stored event title as a fallback for archived events. The honour card labels its event explicitly and provides an Event details button for currently published events. An integration regression test follows a UUID-linked winner through the honour card into the correct event dialog.

The admin event catalog has search by name/venue, Cultural/Academic filtering, publication filtering and a result count. Its cards use two columns on desktop, one on mobile, lazy images and two-line titles. Filtering the catalog does not change the reorder list or modify stored event data. Automated coverage includes 25 published events, long titles, all 25 revealed without duplicates, 21 lazy images after the first four, and 12 Cultural / 13 Academic results. Admin filtering is also exercised with a 25-event fixture.

Clicking a poster opens a silk-web reveal and a detail dialog with the original poster, description, date, time in IST, venue, eligibility/team format, highlights, coordinator names and phone links. Rules open a separate numbered rulebook. Both current admin rule formats are supported. Missing logistics stay “To be announced”; coordinator names are never invented.

Registration opens the existing student registration form and payment step. Anonymous visitors receive a sign-in prompt that preserves their selected event. Existing registrations link to the student dashboard. A saved team prefills the standard team form; it follows the same confirmation, invitation and payment flow as a manually entered team. All submit paths check whether registration is still open.

## Poster specification

- **1600 × 1000 px, 8:5 landscape.** PNG, JPG or WebP.
- Use realistic artwork without baked-in titles, dates or category labels.
- Keep the main subject in the upper half or toward the right. The lower portion fades into dark green behind live event information.
- Existing portrait posters fill the listing card. The full original is available in the desktop detail view.
- The admin add/edit screens use the same live poster component, crop ratio and field values as the public card.
- The Events page background remains connected to **Hero Media → Events**, including mobile media and crop settings.

## Artwork and validation

The hero uses the user's original reference artwork from `public/images/events-reference-source.png`. `EventsHeroCharacter` displays the masked figure through a silhouette and lower fade, excluding the reference navigation, headings and event cards. The castle backdrop reuses `public/images/ricorrenza-emerald-city.webp`; the page backdrop reuses `public/images/ricorrenza-emerald-environment.webp`. The silk is the existing `public/images/effects/real-silk-web.webp`. A small medical emblem SVG supplies the masthead fallback; an uploaded brand logo takes precedence.

The attempted generated transparent extraction was rejected by the image tool. The original reference PNG was subsequently located in Downloads and copied into the project unchanged. Its character is now rendered as a masked foreground layer rather than substituting a different character. This is a page mask, not a separately exported transparent PNG.

Opening the Events hamburger menu reveals a second foreground character above the menu header, overlapping the masthead. The menu fades and slides, its links enter in sequence, and the character settles into place. Escape and clicking the backdrop close the menu and return focus to its toggle. Reduced-motion preferences disable these transitions. The reference's horizontal masthead rule is covered with adjacent original image pixels rather than leaving a transparent slit through the face.

The closed-menu hero also overlaps the navbar: `EventsHeroForeground` measures the hero and portals its crown above the navbar's stacking context. The duplicate is clipped to the masthead band so the cloak stays behind the heading. It scrolls with the document, follows hero resizing, and is removed when the Events hero unmounts. While navigation is open, the menu character takes precedence.

Dialogs support Escape, keyboard focus containment, returning focus to the trigger, nested scroll locks and reduced-motion settings. Automated tests cover category filtering, unpublished events, deep links, registration wiring, nested dialogs, rulebook formats and submission state. Browser visual verification was unavailable because the computer-use browser host could not be reached.
