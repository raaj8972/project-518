/*
  # Add Full Team Committee

  1. New Committee
    - Add "Full Team" committee to core_committees table
    - Set as core committee with high priority order
    - Use distinctive color for Full Team

  2. Security
    - Uses existing RLS policies from core_committees table
*/

-- Insert Full Team committee
INSERT INTO core_committees (id, name, description, color, is_core, order_position, enabled)
VALUES (
  11,
  'Full Team',
  'Complete team of organizers, coordinators, and contributors working together to make RICORRENZA 2025 a success',
  '#FF6B35',
  true,
  1,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_core = EXCLUDED.is_core,
  order_position = EXCLUDED.order_position,
  enabled = EXCLUDED.enabled;