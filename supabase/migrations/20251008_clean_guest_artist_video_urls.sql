/*
  Migration: normalize guest_artists video fields
  - Converts empty-string or whitespace-only values for video/video_url/youtube_url/watch_live_url to NULL
  - Idempotent and safe to run multiple times
*/

UPDATE guest_artists
SET video = NULL
WHERE video IS NOT NULL AND trim(video) = '';

UPDATE guest_artists
SET video_url = NULL
WHERE video_url IS NOT NULL AND trim(video_url) = '';

UPDATE guest_artists
SET youtube_url = NULL
WHERE youtube_url IS NOT NULL AND trim(youtube_url) = '';

UPDATE guest_artists
SET watch_live_url = NULL
WHERE watch_live_url IS NOT NULL AND trim(watch_live_url) = '';
