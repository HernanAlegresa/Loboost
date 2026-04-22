CREATE OR REPLACE FUNCTION get_exercise_prev_max(
  p_exercise_id uuid,
  p_client_id uuid,
  p_exclude_session_id uuid
)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT MAX(ss.weight_kg)
  FROM session_sets ss
  JOIN sessions s ON s.id = ss.session_id
  JOIN client_plan_day_exercises cpde ON cpde.id = ss.client_plan_day_exercise_id
  WHERE cpde.exercise_id = p_exercise_id
    AND s.client_id = p_client_id
    AND s.status = 'completed'
    AND ss.completed = true
    AND ss.weight_kg IS NOT NULL
    AND s.id != p_exclude_session_id
$$;
