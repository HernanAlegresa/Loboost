-- Fix: coach_notes INSERT/UPDATE policy now verifies client belongs to coach
-- Previously a coach could insert a note with any client_id regardless of ownership
DROP POLICY IF EXISTS "coach manages own" ON coach_notes;

CREATE POLICY "coach manages own" ON coach_notes
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = coach_notes.client_id
      AND coach_id = auth.uid()
    )
  );
