-- =============================================================================
-- RPC: obtener perfiles por UUID para gestión RBAC
-- =============================================================================
-- Objetivo:
-- Permitir que admins de módulo obtengan id/email/full_name de usuarios
-- sin abrir una policy global de SELECT sobre public.profiles.
--
-- Uso esperado desde frontend:
--   supabase.rpc('rbac_get_profiles_by_ids', { p_user_ids: ['uuid-1', ...] })
--
-- Requisitos:
-- - Existe la vista public.v_my_permissions (usada por el sistema RBAC actual).
-- - El usuario invocador está autenticado.

create or replace function public.rbac_get_profiles_by_ids(p_user_ids uuid[])
returns table (
  id uuid,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo usuarios autenticados.
  if auth.uid() is null then
    return;
  end if;

  -- Permitir si:
  -- 1) Tiene algún permiso admin en RBAC, o
  -- 2) Está solicitando su propio perfil.
  if not (
    exists (
      select 1
      from public.v_my_permissions perms
      where perms.user_id = auth.uid()
        and lower(perms.action_code) = 'admin'
    )
    or auth.uid() = any (coalesce(p_user_ids, '{}'::uuid[]))
  ) then
    return;
  end if;

  return query
  select p.id, p.email, p.full_name
  from public.profiles p
  where p.id = any (coalesce(p_user_ids, '{}'::uuid[]));
end;
$$;

revoke all on function public.rbac_get_profiles_by_ids(uuid[]) from public;
grant execute on function public.rbac_get_profiles_by_ids(uuid[]) to authenticated;
