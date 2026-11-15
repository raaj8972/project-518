# Workspace organized by public page

The owner and admin sidebar now has a Website pages group matching the public website: Home, Events, Schedule, Gallery, Home Bound, Rico Family and Sponsors. Its order follows the saved public navigation order, normalizing public slugs such as `home` and `home-bound` to their existing admin routes. Missing pages stay reachable; paused Sports does not reappear.

Existing editing tools are grouped under the page where their content appears:

| Page | Connected controls |
| --- | --- |
| Home | Existing integrated homepage studio, artists and chief guests |
| Events | Event records, categories, Events background media |
| Schedule | Existing programme and venue/time editor |
| Gallery | Gallery records and face indexing |
| Home Bound | Page settings and band profiles |
| Rico Family | Existing faculty, council, committee, head and member sections |
| Sponsors | Sponsor records, Previous / Current edition, visibility and homepage featured selection, all managed here |

Each page workspace identifies the public route, offers a View page link, and displays the connected edit options. Nested editors retain their parent page context. Existing admin URLs and data remain in place; a registry supplies relationships rather than duplicate forms. Shared navigation settings have the clear sidebar label Navigation & site settings. Registrations, support and account/security operations stay outside public-page editing.

Search includes connected page tools, including the Events background route, and presents primary sections before a query is entered. Tool links require all relevant grants. A delegated category-only or media-only user retains the directly granted editor and is not redirected to an inaccessible Home workspace. Regular admins use the same page-oriented layout with an Admin workspace label.

Events background editing uses `/admin/events?edit=background`, fixes the media resource to `events`, and shows the same modern separate-device media controls used by Home. It cannot switch to or save Home from that view. The public Events hero subscribes to its own saved media, selects desktop/mobile assets, and respects image mode, enabled state and crop values. Homepage media editing and its resource drafts are retained separately.

Verification covers page grouping and public URLs, saved navigation order, permission filtering, parent context, selected edit options, page-scoped media writes and the Events hero's live/device/image/visibility behavior. Browser host access was checked and is unavailable; authenticated visual interaction has not been verified through computer use. No live database content was changed.

Community messages (the shout-out board) belongs to Workspace, with its original `/admin/shoutouts` URL and permission ID retained. It is no longer a Home child or edit option. Messages publish automatically; there is no approval queue. Admin controls cover board availability, daily limits, expiry and deleting unwanted messages.
