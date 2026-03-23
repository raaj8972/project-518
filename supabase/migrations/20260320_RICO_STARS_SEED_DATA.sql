-- RICO STARS REAL SEED DATA
-- This ensures the "Social Feed" and "RICO STARS" carousel have high-quality, real-looking data.

-- 1. Create a set of "Star" profiles
-- Note: We use fixed UUIDs so this is repeatable and doesn't create infinite duplicates.
INSERT INTO public.profiles (id, full_name, avatar_url, aura_color, background_url, batch, is_approved, likes_count)
VALUES 
  ('a1111111-1111-4111-a111-111111111111', 'Arjun Mehta', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun', '#f59e0b', 'https://images.unsplash.com/photo-1614850523296-d811ca9ea017?q=80&w=1000', 'B.Tech 2024', true, 142),
  ('a2222222-2222-4222-a222-222222222222', 'Priya Sharma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', '#22d3ee', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000', 'M.Tech 2025', true, 128),
  ('a3333333-3333-4333-a333-333333333333', 'Rahul Roy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', '#10b981', 'https://images.unsplash.com/photo-1634157703702-3c124b455499?q=80&w=1000', 'BCA 2023', true, 95),
  ('a4444444-4444-4444-a444-444444444444', 'Sneha Kapur', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha', '#f472b6', 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1000', 'UG 2026', true, 87),
  ('a5555555-5555-4555-a555-555555555555', 'Ishaan Verma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ishaan', '#8b5cf6', 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000', 'B.Design 2024', true, 76),
  ('a6666666-6666-4666-a666-666666666666', 'Anjali Das', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali', null, null, 'B.Tech 2025', true, 64),
  ('a7777777-7777-4777-a777-777777777777', 'Vikram Singh', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram', null, null, 'MBA 2024', true, 58),
  ('a8888888-8888-4888-a888-888888888888', 'Kavita Iyer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kavita', null, null, 'B.Com 2023', true, 42),
  ('a9999999-9999-4999-a999-999999999999', 'Siddharth Rao', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siddharth', null, null, 'UG 2026', true, 35),
  ('b1111111-1111-4111-b111-111111111111', 'Meera Nair', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Meera', null, null, 'M.Tech 2024', true, 28)
ON CONFLICT (id) DO UPDATE SET
  is_approved = EXCLUDED.is_approved,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  aura_color = EXCLUDED.aura_color,
  background_url = EXCLUDED.background_url,
  likes_count = EXCLUDED.likes_count;

-- 2. Seed XP data for these stars
INSERT INTO public.student_xp (id, xp_total, tier)
VALUES 
  ('a1111111-1111-4111-a111-111111111111', 2450, 'elite'),
  ('a2222222-2222-4222-a222-222222222222', 1850, 'elite'),
  ('a3333333-3333-4333-a333-333333333333', 1200, 'elite'),
  ('a4444444-4444-4444-a444-444444444444', 950, 'gold'),
  ('a5555555-5555-4555-a555-555555555555', 820, 'gold'),
  ('a6666666-6666-4666-a666-666666666666', 450, 'silver'),
  ('a7777777-7777-4777-a777-777777777777', 380, 'silver'),
  ('a8888888-8888-4888-a888-888888888888', 210, 'silver'),
  ('a9999999-9999-4999-a999-999999999999', 150, 'silver'),
  ('b1111111-1111-4111-b111-111111111111', 95, 'bronze')
ON CONFLICT (id) DO UPDATE SET
  xp_total = EXCLUDED.xp_total,
  tier = EXCLUDED.tier,
  updated_at = NOW();

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
