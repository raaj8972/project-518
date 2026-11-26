> **Current status — 26 November 2026:** Face indexing and face search have been removed at the owner’s request. The UI, scanning code and public selfie dialog are removed, the old endpoint returns 410, and Supabase matching/indexing RPC execution is revoked. Gallery photos, albums, editing and Drive import remain available. The indexing details below describe the earlier implementation and are historical.

# Gallery photo library — 26 November 2026

## Interface

The admin gallery is now a photo library with warm paper surfaces, copper controls, an album cover collection and a compact photo grid. It uses actual gallery photos throughout. Large gradient banners, always-open importer/settings forms and the table-oriented editor were replaced by album browsing and panels that open when needed.

- Albums are grouped by category, album name and edition. Opening one filters its photos; All albums returns to the collection.
- Search matches titles, album names, category and year. Year, category, highlight and face-scan filters work with the photo grid. Rendering is bounded to 40 photos per page.
- The side inspector previews the full frame and edits its title, category, year, album and featured status. An image source can be replaced without deleting the saved original. Save and dismissal lock during upload, and failed saves retain the draft.
- Selection is explicit, with highlight and removal actions in a bottom toolbar. Removal confirms the selected count and removes gallery links and their attached face index; original Drive/upload files are kept.
- Drive import, library/source health and appearance settings each have their own panel. Viewed photos with load failures can be retried. The health panel does not claim that unviewed photos were tested.
- Face search has a dedicated scan studio with real queue totals, pause/resume between photos, per-photo results and failed-photo retries. Closing its panel stops the browser loop after the current request; completed progress remains saved.

The album grid, photo preview/editor and face studio were inspected in authenticated Chrome. The photo grid was also inspected at an iPhone 16 viewport (393 × 852), then the desktop view was restored.

## Loading and Drive repairs

All 2,545 existing gallery records refer to public Drive photos. The previous proxy labelled original downloads as thumbnails, including a measured 4,371,100-byte original at its smallest preview URL. The new proxy returns actual resized WebP copies and uses a versioned R2 cache so old original-size objects are not reused. A live 320 px request returned a 17,208-byte WebP (about 99.6% smaller). Original Drive source IDs are retained.

Local development and production now use the same image endpoint. Image previews try the normal resized proxy, a fresh proxy request and a public Google image fallback. Cache failures can fall back to direct resized responses. The public gallery's thumbnail size is separate from its larger preview size.

Gallery data pages use a unique ID order; Drive imports can share timestamps, so ordering only by creation time could duplicate or miss records between pages. Partial reads preserve the last complete library and show a retry action. Gallery row updates from Realtime patch the relevant photo instead of fetching all 2,545 rows after every face scan. Mutation paths update local data and invalidate cached reads.

Drive folder listing now follows pagination. Single-album imports use the actual folder name, and repeat imports retain existing edited records instead of overwriting titles, highlights and albums. Failed database writes are reported as failures. Partial imports remain visible as partial; the UI does not invent a background job after a timeout. No whole-library Drive re-import was run during this task.

## Face indexing repair and verification

The live index initially had zero faces and zero scanned photos. The old server required a canvas binary compiled for a different machine architecture, and it marked failed downloads and failed face saves as successfully indexed. Public face search also used an empty SQL search path with an unqualified table, which prevented matching.

The repair uses Sharp to decode/resize images and TensorFlow WASM for descriptor extraction, with packaged models. It removes the native canvas dependency from this endpoint. Each photo is claimed with a lease, analysed and committed through an atomic database function: face records and successful completion commit together. Downloads/analysis/save failures remain retryable. Zero-face results have their own status. Changing a photo source clears its obsolete descriptors and resets its queue entry.

A real gallery photo was processed successfully: **8 faces saved**, then the public search RPC returned the indexed photo when checked with one of its descriptors. Raw embeddings were never printed or added to an artifact. This was a one-photo verification, not a full-library scan: 2,544 photos remained pending at verification time.

The selfie flow now attaches the camera stream after the video element mounts, selects the largest detected face, revokes temporary object URLs even on failure, deduplicates returned photo IDs and avoids a second, overly loose matching attempt.

## Live Supabase verification

`node scripts/audit-gallery-library.mjs --verify`

The repair migration is `supabase/migrations/20261126120000_gallery_library_repair.sql`. It adds explicit queue states, atomic claim/complete functions, safe public matching, page write guards and Realtime publication for gallery images/settings. The old gallery-settings policy allowed public updates to row 1; an explicit restrictive page guard now prevents those writes. Raw face descriptors remain restricted to Gallery admins. Public search returns only matching photo IDs and scores.

Rolled-back SQL role fixtures verified owner and assigned Gallery admin CRUD, denial of student/unrelated admin/anonymous writes, private raw descriptors, public matching and cascade removal of face records when a gallery entry is removed. The audit preserved 2,545 photos and 20 albums.

## Sources

Google Drive file listing uses `nextPageToken` for additional pages: [Drive API files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list). Runtime/model loading follows the installed library's Node/WASM implementation: [face-api project documentation](https://github.com/vladmandic/face-api/blob/master/README.md).

## Validation

The focused regression run passed 62 tests across 13 files, including the gallery library, scan pause/resume, image normalization, atomic-save failures, complete-load recovery, incremental Realtime updates, existing event/schedule workspaces and API authorization. The final gallery-only verification passed again after the last scan-state adjustment. TypeScript, the production build and built-bundle secret scanning passed. No full-library face scan or whole-library Drive re-import was started.
