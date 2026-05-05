-- Security fix: enforce auth.uid() inside SECURITY DEFINER functions and harden search_path.
--
-- Root issue: both functions accepted a p_client_id parameter without verifying that it
-- matches auth.uid(), so any authenticated user could pass an arbitrary client_id and
-- access or mutate another client's data — bypassing the RLS policies that protect the
-- underlying tables.

-- =============================================
-- Fix 1: get_exercise_prev_max (CRITICAL)
-- Any authenticated user could query any client's max weight per exercise.
-- Added: AND s.client_id = auth.uid() | SET search_path = '' | fully-qualified names
-- =============================================
CREATE OR REPLACE FUNCTION public.get_exercise_prev_max(
  p_exercise_id        uuid,
  p_client_id          uuid,
  p_exclude_session_id uuid
)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT MAX(ss.weight_kg)
  FROM public.session_sets ss
  JOIN public.sessions s ON s.id = ss.session_id
  JOIN public.client_plan_day_exercises cpde ON cpde.id = ss.client_plan_day_exercise_id
  WHERE cpde.exercise_id = p_exercise_id
    AND s.client_id      = p_client_id
    AND s.client_id      = auth.uid()
    AND s.status         = 'completed'
    AND ss.completed     = true
    AND ss.weight_kg     IS NOT NULL
    AND s.id             != p_exclude_session_id
$$;

-- =============================================
-- Fix 2: complete_session (MEDIUM)
-- Caller could complete another client's session if both UUIDs were known.
-- Added: AND client_id = auth.uid() | SET search_path = '' | fully-qualified names
-- =============================================
CREATE OR REPLACE FUNCTION public.complete_session(
  p_session_id uuid,
  p_client_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_day_id uuid;
BEGIN
  UPDATE public.sessions
  SET    status       = 'completed',
         completed_at = now()
  WHERE  id        = p_session_id
    AND  client_id = p_client_id
    AND  client_id = auth.uid()
    AND  status    = 'in_progress'
  RETURNING client_plan_day_id INTO v_day_id;

  IF v_day_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found_or_unauthorized';
  END IF;

  UPDATE public.client_plan_days
  SET    slot_status = 'completed',
         updated_at  = now()
  WHERE  id = v_day_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_session(uuid, uuid) TO authenticated;
