# Instrucciones: Vista de Onboarding para Usuarios Sin Permisos

## 📋 Descripción

Esta funcionalidad muestra una pantalla de onboarding cuando un usuario autenticado no tiene permisos en ningún módulo del sistema. El usuario puede solicitar acceso mediante un formulario.

## 🚀 Configuración

### Paso 1: Verificar la tabla de solicitudes de acceso

La aplicación utiliza la tabla `fct_rbac_solicitud_acceso` que debe existir en Supabase con la siguiente estructura:

```sql
create table public.fct_rbac_solicitud_acceso (
  id bigserial not null,
  user_id uuid not null,
  modulo_solicitado text not null,
  mensaje text null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  resuelto_por uuid null,
  resuelto_at timestamp with time zone null,
  constraint fct_rbac_solicitud_acceso_pkey primary key (id),
  constraint fct_rbac_solicitud_acceso_resuelto_por_fkey foreign KEY (resuelto_por) references profiles (id),
  constraint fct_rbac_solicitud_acceso_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
);
```

**Nota importante:** Por cada módulo seleccionado en el formulario, se crea un registro separado en esta tabla. Esto permite gestionar cada solicitud de módulo de forma independiente.

### Paso 2: Verificar la vista v_my_permissions

Asegúrate de que la vista `v_my_permissions` en Supabase:
- Filtra automáticamente por el usuario autenticado (`auth.uid()`)
- Retorna `{ module_code, action_code }` para cada permiso
- Retorna un array vacío si el usuario no tiene permisos

Ejemplo de estructura esperada:
```sql
-- La vista debe retornar algo como:
-- module_code | action_code
-- acreditacion | view
-- proveedores | view
```

## 🎯 Comportamiento

### Flujo de Usuario

1. **Usuario se autentica por primera vez**
   - Se crea su registro en `profiles`
   - Se le asigna automáticamente el rol `system:pending`
   - No tiene permisos en ningún módulo

2. **Al iniciar la app**
   - Se consulta `v_my_permissions`
   - Si la respuesta viene vacía:
     - Se muestra la pantalla de "Sin acceso"
     - El usuario puede ver un formulario para solicitar acceso

3. **Formulario de solicitud**
   - Permite seleccionar uno o más módulos (ej: Acreditaciones, Proveedores)
   - Permite ingresar un mensaje opcional (se aplica a todos los módulos seleccionados)
   - Al enviar, se crea **un registro por cada módulo seleccionado** en `fct_rbac_solicitud_acceso` con estado `pendiente`

4. **Después de enviar la solicitud**
   - Se muestra un mensaje de confirmación
   - El usuario debe esperar a que un administrador apruebe su solicitud

### Flujo de Administrador

Los administradores pueden:
- Ver todas las solicitudes pendientes en la tabla `access_requests`
- Aprobar o rechazar solicitudes
- Agregar notas de revisión

## 📝 Estructura de la Tabla fct_rbac_solicitud_acceso

```sql
- id: bigserial (PK)
- user_id: UUID (FK a profiles)
- modulo_solicitado: TEXT (un solo módulo por registro)
- mensaje: TEXT (mensaje opcional, puede ser null)
- estado: TEXT (default 'pendiente')
- created_at: TIMESTAMP (auto)
- updated_at: TIMESTAMP (nullable)
- resuelto_por: UUID (FK a profiles, nullable)
- resuelto_at: TIMESTAMP (nullable)
```

**Importante:** 
- Se crea **un registro por cada módulo seleccionado**
- El mismo mensaje se aplica a todos los registros creados en la misma solicitud
- Cada módulo puede ser aprobado/rechazado independientemente

## 🔧 Componentes Creados

### 1. `useHasPermissions` Hook
**Ubicación:** `apps/web/src/shared/rbac/useHasPermissions.ts`

Verifica si el usuario tiene permisos en algún módulo. Retorna:
- `hasPermissions`: `boolean | null` - `true` si tiene permisos, `false` si no, `null` mientras carga
- `loading`: `boolean` - Estado de carga
- `permissions`: `PermissionsByModule` - Permisos del usuario organizados por módulo

### 2. `OnboardingView` Component
**Ubicación:** `apps/web/src/shared/onboarding/OnboardingView.tsx`

Componente que muestra:
- Pantalla de "Sin acceso"
- Formulario para solicitar acceso a módulos
- Mensajes de éxito/error

### 3. Integración en `MainLayout`
**Ubicación:** `apps/web/src/app/layouts/MainLayout.tsx`

El `MainLayout` ahora:
- Verifica permisos usando `useHasPermissions`
- Muestra `OnboardingView` si el usuario no tiene permisos
- Muestra el contenido normal si el usuario tiene permisos

## 🧪 Pruebas

### Probar el flujo completo:

1. **Crear un usuario de prueba sin permisos:**
   ```sql
   -- Verificar que el usuario no tenga permisos en v_my_permissions
   SELECT * FROM v_my_permissions WHERE user_id = 'user-uuid-aqui';
   -- Debe retornar vacío
   ```

2. **Iniciar sesión con ese usuario:**
   - Debe ver la pantalla de onboarding
   - Debe poder seleccionar módulos
   - Debe poder enviar una solicitud

3. **Verificar las solicitudes en Supabase:**
   ```sql
   SELECT * FROM fct_rbac_solicitud_acceso WHERE user_id = 'user-uuid-aqui';
   -- Debe mostrar un registro por cada módulo seleccionado con estado = 'pendiente'
   ```

4. **Como administrador, aprobar una solicitud:**
   ```sql
   UPDATE fct_rbac_solicitud_acceso
   SET 
     estado = 'aprobado', -- o el valor que uses para aprobado
     resuelto_por = 'admin-user-uuid',
     resuelto_at = NOW(),
     updated_at = NOW()
   WHERE id = [id-del-registro];
   ```

5. **Asignar permisos al usuario:**
   - Asignar permisos en el sistema RBAC según corresponda
   - El usuario debería poder acceder a los módulos aprobados

## ⚠️ Notas Importantes

1. **La vista `v_my_permissions` debe existir y funcionar correctamente**
   - Si no existe, el sistema no podrá verificar permisos
   - Asegúrate de que filtre por el usuario autenticado

2. **El fallback en `useAreas` fue eliminado**
   - Anteriormente, si no había permisos, se daba acceso por defecto
   - Ahora, si no hay permisos, se muestra el onboarding

3. **Los módulos disponibles en el formulario**
   - Se obtienen de `@contracts/areas` (AreaId enum)
   - Incluye: Acreditaciones, Proveedores, Finanzas, Operaciones

4. **Seguridad**
   - Los usuarios solo pueden ver y crear sus propias solicitudes
   - Solo los administradores pueden ver todas las solicitudes y aprobarlas
   - Las políticas RLS están configuradas en el script SQL

## 🐛 Solución de Problemas

### El onboarding no se muestra cuando debería

1. Verifica que `v_my_permissions` retorne vacío para el usuario:
   ```sql
   SELECT * FROM v_my_permissions WHERE user_id = 'user-uuid';
   ```

2. Verifica los logs de la consola del navegador
   - Debe mostrar los permisos consultados
   - Debe mostrar si `hasPermissions` es `false`

3. Verifica que el usuario esté autenticado correctamente

### Error al enviar solicitud

1. Verifica que la tabla `fct_rbac_solicitud_acceso` existe:
   ```sql
   SELECT * FROM fct_rbac_solicitud_acceso LIMIT 1;
   ```

2. Verifica que el usuario tiene un registro en `profiles`:
   ```sql
   SELECT * FROM profiles WHERE id = auth.uid();
   ```

3. Verifica las políticas RLS (si están configuradas):
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'fct_rbac_solicitud_acceso';
   ```

3. Verifica que el usuario esté autenticado:
   ```sql
   SELECT auth.uid();
   ```

## 📚 Referencias

- Sistema RBAC: `apps/web/src/shared/rbac/`
- Servicio de permisos: `apps/web/src/shared/rbac/permissionsService.ts`
- Hook de áreas: `apps/web/src/shared/rbac/useAreas.ts`

