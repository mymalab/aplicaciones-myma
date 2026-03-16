# Solución: Módulo de Adendas no visible en Producción

## Problema

El módulo de Adendas no aparece en la aplicación desplegada en Render, aunque:
- Funciona correctamente en localhost
- El usuario tiene las credenciales y permisos correctos
- Cerrar sesión y volver a ingresar no resuelve el problema

## Causas Posibles

1. **Caché de permisos desactualizado**: El `sessionStorage` puede tener datos antiguos sin el módulo de adendas
2. **Problemas con la consulta a la base de datos**: La vista `v_my_permissions` puede no estar retornando los datos correctos en producción
3. **Problemas de sesión de Supabase**: La sesión puede no estar sincronizada correctamente entre localhost y producción

## Soluciones Implementadas

### 1. Detección Automática de Problemas en Producción

El código ahora detecta automáticamente cuando está en producción y fuerza la recarga de permisos si detecta problemas:

```typescript
// En useAreas.ts
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const shouldForceReload = isProduction && rawPerms.length > 0 && rawPerms.length < 3;
```

### 2. Limpieza Automática del Caché

El caché se limpia automáticamente cuando:
- El usuario cierra sesión
- Se detectan módulos faltantes en el caché
- Se fuerza una recarga en producción

### 3. Función Manual para Limpiar el Caché

Se agregó una función global que puedes usar desde la consola del navegador:

```javascript
// En la consola del navegador (F12)
window.clearPermissionsCache()
```

Esto limpiará el caché y deberás recargar la página para ver los cambios.

### 4. Mejor Logging y Debugging

El código ahora incluye logs más detallados que te ayudarán a identificar el problema:

- ✅ Módulos encontrados en la base de datos
- ⚠️ Advertencias específicas para el módulo de adendas
- 🔍 Información detallada sobre la verificación de permisos

## Pasos para Resolver el Problema

### Paso 1: Verificar en la Consola del Navegador

1. Abre la aplicación en Render
2. Abre la consola del navegador (F12)
3. Busca los logs que empiezan con:
   - `🔍 Consultando permisos raw desde la base de datos...`
   - `📊 Módulos encontrados:`
   - `🔍 Verificando área adendas:`

### Paso 2: Limpiar el Caché Manualmente

Si el módulo de adendas no aparece, ejecuta en la consola:

```javascript
window.clearPermissionsCache()
```

Luego recarga la página (F5 o Ctrl+R).

### Paso 3: Verificar Permisos en la Base de Datos

Ejecuta este query en Supabase SQL Editor para verificar tus permisos:

```sql
-- Verificar que el módulo adendas existe
SELECT * FROM rbac_module WHERE code = 'adendas';

-- Verificar tus roles de adendas
SELECT 
  u.email,
  r.code as role_code,
  r.name as role_name
FROM auth.users u
JOIN rbac_user_role ur ON u.id = ur.user_id
JOIN rbac_role r ON ur.role_id = r.id
WHERE u.email = 'TU_EMAIL_AQUI' -- Reemplaza con tu email
  AND r.code LIKE 'adendas:%';

-- Verificar la vista v_my_permissions
SELECT * FROM v_my_permissions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI')
  AND module_code = 'adendas';
```

### Paso 4: Verificar la Vista v_my_permissions

Asegúrate de que la vista `v_my_permissions` esté funcionando correctamente:

```sql
-- Verificar la estructura de la vista
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'v_my_permissions';

-- Verificar que la vista retorna datos
SELECT COUNT(*) FROM v_my_permissions;
```

### Paso 5: Reasignar Permisos (si es necesario)

Si los permisos no están asignados correctamente, ejecuta:

```sql
-- Obtener tu user_id
SELECT id, email FROM auth.users WHERE email = 'TU_EMAIL_AQUI';

-- Asignar todos los roles de adendas (reemplaza 'TU_USER_ID' con tu UUID)
INSERT INTO rbac_user_role (user_id, role_id)
SELECT 
  'TU_USER_ID'::uuid as user_id,
  r.id as role_id
FROM rbac_role r
WHERE r.code IN ('adendas:view', 'adendas:create', 'adendas:edit', 'adendas:delete', 'adendas:admin')
ON CONFLICT (user_id, role_id) DO NOTHING;
```

## Verificación Final

Después de seguir los pasos anteriores:

1. **Limpia el caché**: `window.clearPermissionsCache()` en la consola
2. **Recarga la página**: F5 o Ctrl+R
3. **Verifica en la consola**: Deberías ver logs como:
   ```
   ✅ Módulo "adendas" encontrado en permisos
   ✅ Área adendas agregada a la lista
   ```
4. **Verifica en la UI**: El módulo de Adendas debería aparecer en el selector de áreas

## Prevención

Para evitar este problema en el futuro:

1. **Limpia el caché después de asignar nuevos permisos**: Usa `window.clearPermissionsCache()`
2. **Verifica los logs en producción**: Revisa la consola del navegador regularmente
3. **Usa el modo incógnito para testing**: Esto evita problemas de caché

## Notas Técnicas

- El caché se guarda en `sessionStorage` con la clave `rbac_permissions_cache`
- El caché se limpia automáticamente al cerrar sesión
- En producción, el código fuerza la recarga si detecta menos de 3 módulos (para evitar problemas de caché)
- Los permisos se consultan desde la vista `v_my_permissions` que filtra por `user_id`

## Contacto

Si el problema persiste después de seguir estos pasos, verifica:
1. Los logs en la consola del navegador
2. Los logs en Supabase Dashboard → Logs
3. Que la vista `v_my_permissions` esté funcionando correctamente

