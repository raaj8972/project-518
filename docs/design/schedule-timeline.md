# Schedule timeline and Homebound card reference

Implemented on 26 November 2026 using the supplied Schedule and Homebound references.

## Schedule

The public `/schedule` page has a green-and-gold masthead, a masked-character hero, gold serif heading, day/date selectors and framed daily timelines. Desktop shows daily panels in two columns. At 900px and below the day buttons select the displayed panel. A filtered search automatically selects a day containing results. All days and titles come from `schedule_days`; event times, durations, venues, categories and links come from `schedule_events`. No sample festival dates or roster entries are published.

Prelims/Main festival selection keeps the configured default and does not reset a visitor's choice on a settings refresh. Search and category filtering remain available. Live/upcoming/ended status uses the parent day and India time, respects explicit time ranges and saved durations, and handles overnight events. Unannounced timing stays unannounced. Open registrations lead to the Events registration flow; closed registrations lead to event details. Hidden or deleted event records have no registration action.

The PDF download loads jsPDF only after a click, exports every day in the selected schedule edition regardless of the current search, handles pagination, and shows a retryable error when generation fails. Loading, unpublished, disconnected and no-result states are separate.

## Homebound comparison

The existing cards already used four neon accents, photo portraits, handwritten names and role labels. The supplied reference has distinct worn pass outlines and crease marks, red tape concentrated on the first card, tall guitar doodles, crossed drumsticks and a multicolour Instagram mark. These details now use lightweight SVG/CSS. Names, photos, ordering, categories, Instagram links and featured crowns remain tied to the published band data. Missing photos and unsafe or absent social links retain the existing fallback behavior. Real member portraits are not replaced by the illustrative people in the reference.

## Artwork

Generated with the built-in `image_gen` tool. This is illustrative fantasy festival artwork, not a documentary image of the actual college.

- `public/images/schedule/emerald-timeline.webp`: 1920 × 640, WebP quality 85, approximately 164 KiB.
- `public/images/schedule/emerald-timeline-mobile.webp`: 960 × 720 centre crop, WebP quality 82, approximately 80 KiB.

The source is retained under `/Users/raaj/.codex/generated_images/01a211c5-9c2d-7480-8ea6-dde557b8bd11/exec-76f7dfe5-6887-41d6-9208-2481587bc780.png`.

### Exact generation prompt

Use case: stylized-concept. Asset type: production website schedule HERO BACKGROUND, panoramic 3:1 landscape. Primary request: cinematic dark emerald and antique gold medical college festival fantasy world, realistic matte-painting poster quality. Subject: centrally placed upper-bust armored masked figure wearing a deep emerald hood, face silver metallic with small green glowing eyes, partly cropped at the top, occupying ONLY upper center 40 percent of the image; elaborate thin antique gold circular arcane clock ring behind the hood. Backdrop: ruined gothic city at left, majestic Indian medical college facade on right with lit warm windows and a gold winged medical insignia, towering tattered dark green and gold festival flags near both side edges, dark rocky ground and curling emerald smoke, luminous green magical streaks. Composition: extra wide 3:1, symmetrical cinematic panoramic world. Put all major character detail in TOP HALF. Lower center quarter is very dark uncluttered smoke so real HTML heading can overlay. Lighting: deep black-green shadows, gold metal highlights, acid lime rim light, green atmospheric smoke, subtle film grain. Constraints: ABSOLUTELY NO text, no numbers, no typography, no logos or letter shapes on flags, no watermark, no UI, no cards, no borders. This is artwork for a functioning website, not a website screenshot. Save the generated image.

## Verification boundary

Automated checks cover the published lineup, filtering, day and edition selection, event links, PDF download/retry, loading/error states and time calculations. Existing Homebound checks cover filtering, paging, profiles and safe social links. The computer-use browser host was unavailable during implementation, so a pixel-level browser comparison and a real browser download remain unverified.
