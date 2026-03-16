# Instrucciones para Configurar Permisos en Supabase

Este documento explica cómo configurar el sistema de permisos por área en Supabase.

## Paso 1: Ejecutar el Script SQL

1. Abre el Dashboard de Supabase
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `sql/create_user_areas_permissions.sql`
4. Ejecuta el script

## Paso 2: Verificar la Estructura

Después de ejecutar el script, verifica que se hayan creado:

- ✅ Tabla `user_areas`
- ✅ Políticas RLS
- ✅ Funciones RPC: `get_user_areas`, `has_area_access`, `has_permission`
- ✅ Índices

## Paso 3: Asignar Permisos a Usuarios

### Opción A: Desde el Dashboard de Supabase

1. Ve a **Table Editor** > `user_areas`
2. Haz clic en **Insert row**
3. Completa:
   - `user_id`: UUID del usuario (desde `auth.users`)
   - `area_id`: `'acreditacion'`, `'finanzas'`, o `'operaciones'`
   - `permissions`: JSON array, ej: `["acreditacion:view", "acreditacion:create"]`

### Opción B: Usando SQL

```sql
-- Ejemplo: Dar acceso a acreditaciones con permisos de view y create
INSERT INTO user_areas (user_id, area_id, permissions)
VALUES (
  'user-uuid-aqui',
  'acreditacion',
  '["acreditacion:view", "acreditacion:create"]'::jsonb
);

-- Ejemplo: Dar acceso completo a todas las áreas (admin)
INSERT INTO user_areas (user_id, area_id, permissions)
VALUES
  ('user-uuid-aqui', 'acreditacion', '["acreditacion:view", "acreditacion:create", "acreditacion:edit", "acreditacion:delete", "acreditacion:admin"]'::jsonb),
  ('user-uuid-aqui', 'finanzas', '["finanzas:view", "finanzas:create", "finanzas:edit", "finanzas:delete", "finanzas:admin"]'::jsonb),
  ('user-uuid-aqui', 'operaciones', '["operaciones:view", "operaciones:create", "operaciones:edit", "operaciones:delete", "operaciones:admin"]'::jsonb);
```

## Paso 4: Actualizar el Código de la Aplicación

Los hooks `useAreas()` y `usePermissions()` ya están implementados, pero necesitan ser actualizados para usar las funciones RPC reales en lugar de la simulación actual.

### Actualizar `useAreas.ts`

Reemplaza la lógica de simulación con:

```typescript
const { data, error } = await supabase.rpc('get_user_areas', {
  p_user_id: user.id
});

if (data) {
  setAreas(data.map((item: any) => item.area_id));
}
```

### Actualizar `usePermissions.ts`

Similarmente, usa la función RPC `has_permission` para verificar permisos específicos.

## Paso 5: Probar los Permisos

1. Asigna diferentes permisos a diferentes usuarios
2. Inicia sesión con cada usuario
3. Verifica que solo vean las áreas y funcionalidades permitidas

## Notas Importantes

- **Admins**: Los usuarios con `role = 'admin'` en la tabla `profiles` tienen acceso a todas las áreas (esto se maneja en el código de la app)
- **Permisos por defecto**: Si un usuario no tiene registros en `user_areas`, no tendrá acceso a ninguna área
- **Seguridad**: Las políticas RLS aseguran que los usuarios solo puedan ver sus propios permisos

## Troubleshooting

### Error: "permission denied"
- Verifica que las políticas RLS estén correctamente configuradas
- Asegúrate de que el usuario tenga el rol correcto en `profiles`

### Usuario no ve ninguna área
- Verifica que existan registros en `user_areas` para ese usuario
- Verifica que los `area_id` coincidan exactamente con los definidos en el enum

### Funciones RPC no funcionan
- Verifica que las funciones estén creadas: `get_user_areas`, `has_area_access`, `has_permission`
- Asegúrate de que `SECURITY DEFINER` esté configurado correctamente











