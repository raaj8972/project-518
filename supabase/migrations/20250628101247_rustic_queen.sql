/*
  # Add RLS policies for schedule management

  1. Security Updates
    - Add INSERT, UPDATE, DELETE policies for authenticated users on schedule_days
    - Add INSERT, UPDATE, DELETE policies for authenticated users on schedule_events

  This enables full CRUD operations on the schedule tables for authenticated users,
  which is required for the admin dashboard schedule management functionality.
*/

-- Add policies for schedule_days table
CREATE POLICY "Allow authenticated users to insert schedule_days"
  ON schedule_days
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update schedule_days"
  ON schedule_days
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete schedule_days"
  ON schedule_days
  FOR DELETE
  TO authenticated
  USING (true);

-- Add policies for schedule_events table
CREATE POLICY "Allow authenticated users to insert schedule_events"
  ON schedule_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update schedule_events"
  ON schedule_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete schedule_events"
  ON schedule_events
  FOR DELETE
  TO authenticated
  USING (true);