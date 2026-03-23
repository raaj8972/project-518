-- ==========================================
-- OPTIMIZE ADMIRERS VIEW PERFORMANCE
-- ==========================================
-- This script adds functional indices to speed up the TEXT-cast joins
-- and filters used in the view_profile_admirers.

-- 1. Add functional indices for liker_id and profile_id casts
CREATE INDEX IF NOT EXISTS idx_profile_likes_liker_id_text 
ON public.profile_likes ((liker_id::TEXT));

CREATE INDEX IF NOT EXISTS idx_profile_likes_profile_id_text 
ON public.profile_likes ((profile_id::TEXT));

-- 2. Ensure profiles join is efficient
CREATE INDEX IF NOT EXISTS idx_profiles_id_text 
ON public.profiles (id); -- Should already be indexed as PK, but good to ensure.

-- 3. Add index on student_xp for the join
CREATE INDEX IF NOT EXISTS idx_student_xp_id_text 
ON public.student_xp (id);

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload schema';
