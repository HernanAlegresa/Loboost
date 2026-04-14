-- Función atómica: completa sesión + sincroniza slot_status en una transacción.
-- Llamada desde complete-session.ts via supabase.rpc('complete_session', {...})
create or replace function public.complete_session(
  p_session_id uuid,
  p_client_id  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_id uuid;
begin
  -- 1. Completar sesión: solo si pertenece al cliente y está in_progress
  update sessions
  set    status       = 'completed',
         completed_at = now()
  where  id        = p_session_id
    and  client_id = p_client_id
    and  status    = 'in_progress'
  returning client_plan_day_id into v_day_id;

  -- Si no se actualizó nada: sesión no existe, no pertenece al cliente,
  -- o ya estaba completada. Lanzar error para que el caller lo maneje.
  if v_day_id is null then
    raise exception 'session_not_found_or_unauthorized';
  end if;

  -- 2. Sincronizar slot (misma transacción — si falla, sesión se revierte también)
  update client_plan_days
  set    slot_status = 'completed',
         updated_at  = now()
  where  id = v_day_id;
end;
$$;

-- Solo usuarios autenticados pueden llamar esta función.
-- RLS de sessions garantiza que solo el dueño puede completar su sesión.
grant execute on function public.complete_session(uuid, uuid) to authenticated;
