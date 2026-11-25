# Homebound admin controls

Open `/admin/homebound` for the page editor and `/admin/band` for the artist roster. Existing admin page permissions and approval rules still apply.

## Page editor

- **Page text:** edit the band title, subtitle, About writing, band heading, All filter label and footer text. Show or hide each page section. `{member_count}` in About text follows the published artist count automatically.
- **Photos & title:** upload or replace the stage photo, About photo and title artwork; edit descriptions or paste image URLs. Changing the typed band title switches off the reference title artwork so the new text appears immediately.
- **Categories:** add any category, including Beatboxing, choose an icon, rename, reorder, hide or remove it. Aliases associate older category names such as Guitar/Bass with a shared filter. Renaming preserves stable artist assignments.
- **Our journey:** add, edit, reorder, hide or remove cards and change their photos and captions.
- **Links & buttons:** change the Instagram profile and visibility, button labels and gallery link. Audition availability remains in the existing form settings.

Use **Save Homebound settings** to publish a draft. A failed save keeps the draft for retry. **Cancel changes** reloads the saved version. Replacing or removing a photo in a draft keeps the already published file available. **Reset page draft** restores the reference design in the draft; save is still required to publish it.

Deleting a category removes its filter, not its artists. Those artists stay in All until reassigned. Empty category and journey lists remain empty after save and reload.

## Add a Beatboxing artist

1. In Categories, enter `Beatboxing`, select its icon, click Add category and save the page.
2. Open Band Members, click Add artist, enter the name and role, and select Beatboxing.
3. Add a photo, biography, specialty, social links and achievements as desired. Set visibility, featured status and display order, then save.

The public page derives category counts from visible artists. Featured artists appear first, followed by display order. Hide/show and delete actions are available on each artist. Approval-managed accounts submit changes for approval before they appear publicly; AI bulk imports use the same approval flow.

## Persistence and verification

The additive migration `20261125010000_homebound_page_content.sql` adds the page document to the existing Homebound settings row and enables its existing public reads through Realtime. It does not rewrite the roster, Instagram settings or access policies.

The isolated audit script is read-only by default:

```sh
node scripts/audit-homebound-content.mjs
```

`--apply` applies only this migration. `--verify` checks editing and removals in a rolled-back transaction. The migration was applied to the configured database and those verification checks passed, including the public API, photo bucket scope and unchanged row-security policies. No test content was left published.
