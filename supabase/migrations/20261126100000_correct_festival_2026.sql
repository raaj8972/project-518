-- Owner confirmed on 26 Nov 2026: this festival and the Dec 19–23 prelims are 2026.
-- Keep other editions, historic days and event records intact.
BEGIN;
UPDATE public.homepage_settings SET brand_year=2026,updated_at=now() WHERE id=1 AND brand_year=2027;
UPDATE public.schedule_days d SET date=correction.full_date,updated_at=now()
FROM (VALUES
 ('December 19','2026-12-19'),('December 20','2026-12-20'),
 ('December 21','2026-12-21'),('December 22','2026-12-22'),
 ('December 23','2026-12-23')
) AS correction(legacy_date,full_date)
WHERE d.date=correction.legacy_date AND d.schedule_type='prelims';
COMMIT;
