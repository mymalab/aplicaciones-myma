# 🔧 Configuración para Nueva URL de Render

## URL Nueva: `https://myma-acreditacion.onrender.com`

Necesitas actualizar **2 lugares críticos** para que el login funcione correctamente:

---

## ✅ Paso 1: Configurar Supabase Dashboard

### 1.1 Configurar Site URL y Redirect URLs

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **URL Configuration**
3. Configura lo siguiente:

   **Site URL:**
   ```
   https://myma-acreditacion.onrender.com
   ```

   **Redirect URLs:** (agrega todas estas líneas, una por línea)
   ```
   https://myma-acreditacion.onrender.com/**
   http://localhost:3000/**
   ```

   ⚠️ **IMPORTANTE**: El `**` permite cualquier ruta dentro del dominio.

4. Haz clic en **Save**

---

## ✅ Paso 2: Configurar Google Cloud Console

### 2.1 Actualizar Authorized Redirect URIs

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Navega a **APIs & Services** → **Credentials**
3. Busca y selecciona tu **OAuth 2.0 Client ID** (el que usas para MyMA)
4. En la sección **Authorized redirect URIs**, asegúrate de tener estas URLs:

   ```
   https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback
   https://myma-acreditacion.onrender.com
   http://localhost:3000
   ```

   ⚠️ **CRÍTICO**: La URL de Supabase (`https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`) es la más importante, ya que es la que realmente procesa la autenticación.

5. Haz clic en **Save**

### 2.2 (Opcional) Actualizar Authorized JavaScript origins

En la misma página de configuración de OAuth Client, en **Authorized JavaScript origins**, agrega:

```
https://myma-acreditacion.onrender.com
http://localhost:3000
https://pugasfsnckeyitjemvju.supabase.co
```

6. Haz clic en **Save**

---

## ✅ Paso 3: Verificar que el Código Esté Correcto

El código ya está configurado para usar dinámicamente la URL actual. Verifica que en `components/Login.tsx` línea 63 esté así:

```63:63:components/Login.tsx
      const redirectUrl = `${window.location.origin}/auth/callback`;
```

Esto debería funcionar automáticamente con cualquier URL, incluyendo `https://myma-acreditacion.onrender.com`.

---

## ✅ Paso 4: Limpiar Cache y Probar

### 4.1 Limpiar Cache del Navegador

1. Abre las herramientas de desarrollador (F12)
2. Ve a **Application** → **Storage**
3. Haz clic en **Clear site data** (o elimina manualmente cookies y localStorage)
4. O prueba en modo incógnito

### 4.2 Probar el Login

1. Ve a `https://myma-acreditacion.onrender.com/login`
2. Haz clic en **"Continuar con Google Workspace"**
3. Completa el login con Google
4. Deberías ser redirigido a `https://myma-acreditacion.onrender.com/app`

---

## 🔍 Verificación y Debugging

### Verificar la URL de Redirección en la Consola

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña **Console**
3. Antes de hacer login, deberías ver:
   ```
   🔗 URL de redirección: https://myma-acreditacion.onrender.com/auth/callback
   ```
4. Si ves `localhost:3000`, hay un problema de cache - limpia el cache y prueba de nuevo

### Verificar en Supabase Logs

1. Ve a Supabase Dashboard → **Logs** → **Auth Logs**
2. Busca los intentos de login recientes
3. Verifica que no haya errores de "redirect_uri_mismatch"

---

## 🚨 Errores Comunes y Soluciones

### Error: "redirect_uri_mismatch"

**Causa**: La URL no está configurada en Google Cloud Console o Supabase.

**Solución**:
- Verifica que agregaste `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback` en Google Cloud Console
- Verifica que agregaste `https://myma-acreditacion.onrender.com/**` en Supabase Dashboard

### Error: Después del login vuelve a `/login` en lugar de `/app`

**Causa**: La sesión no se está guardando correctamente o hay un problema con las cookies.

**Solución**:
- Verifica que no tengas bloqueadores de cookies activos
- Limpia el cache del navegador
- Verifica en la consola si hay errores de CORS o cookies

### Error: "Invalid redirect URL"

**Causa**: La URL en `redirectTo` no coincide con las URLs permitidas en Supabase.

**Solución**:
- Verifica en Supabase Dashboard → Authentication → URL Configuration
- Asegúrate de que `https://myma-acreditacion.onrender.com/**` esté en Redirect URLs
- El `**` es importante para permitir cualquier ruta dentro del dominio

---

## 📝 Checklist de Verificación

Antes de considerar que está resuelto, verifica:

- [ ] **Supabase Dashboard**: Site URL configurado a `https://myma-acreditacion.onrender.com`
- [ ] **Supabase Dashboard**: Redirect URLs incluye `https://myma-acreditacion.onrender.com/**`
- [ ] **Google Cloud Console**: Authorized redirect URIs incluye `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`
- [ ] **Google Cloud Console**: Authorized JavaScript origins incluye `https://myma-acreditacion.onrender.com`
- [ ] **Navegador**: Cache limpiado o probado en modo incógnito
- [ ] **Login**: Funciona y redirige correctamente a `/app`
- [ ] **Consola**: No hay errores de redirección

---

## 🎯 Resumen de URLs Importantes

### Para Supabase Dashboard:
- **Site URL**: `https://myma-acreditacion.onrender.com`
- **Redirect URLs**: 
  - `https://myma-acreditacion.onrender.com/**`
  - `http://localhost:3000/**`

### Para Google Cloud Console:
- **Authorized redirect URIs**:
  - `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback` ⚠️ **OBLIGATORIO**
  - `https://myma-acreditacion.onrender.com`
  - `http://localhost:3000`

- **Authorized JavaScript origins**:
  - `https://myma-acreditacion.onrender.com`
  - `http://localhost:3000`
  - `https://pugasfsnckeyitjemvju.supabase.co`

---

## ✅ Listo

Una vez que hayas configurado ambos lugares (Supabase y Google Cloud Console), el login debería funcionar correctamente. Si aún tienes problemas, verifica los logs en Supabase Dashboard y la consola del navegador para más detalles.















