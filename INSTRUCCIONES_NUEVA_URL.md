# 🔄 Actualizar Configuración para Nueva URL de Render.com

## Nueva URL
**Nueva URL:** `https://pruebawebservice-1977.onrender.com`  
**URL anterior:** `https://rrs1.onrender.com`

## ⚠️ Cambios Necesarios

### 1. Actualizar URLs en Supabase Dashboard

Es **CRÍTICO** actualizar las URLs de redirección:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. Actualiza:

   **Site URL:**
   ```
   https://pruebawebservice-1977.onrender.com
   ```

   **Redirect URLs:**
   ```
   https://pruebawebservice-1977.onrender.com/**
   https://pruebawebservice-1977.onrender.com/auth/callback
   http://localhost:5173/**
   http://localhost:5173/auth/callback
   ```

   ⚠️ **IMPORTANTE:** Mantén también las URLs de localhost para desarrollo

### 2. Actualizar Google Cloud Console (si es necesario)

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Navega a **APIs & Services** → **Credentials**
3. Selecciona tu OAuth 2.0 Client ID
4. En **Authorized JavaScript origins**, agrega:
   ```
   https://pruebawebservice-1977.onrender.com
   ```

5. En **Authorized redirect URIs**, asegúrate de tener:
   ```
   https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback
   ```

   ⚠️ **NOTA:** El callback de Supabase (`https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`) no cambia, solo agrega la nueva URL si la necesitas para referencia.

### 3. Verificar Variables de Entorno en Render.com

Si tienes variables de entorno en Render.com que contengan la URL anterior, actualízalas:

1. Ve a tu nuevo servicio en Render.com
2. Ve a **Environment**
3. Verifica variables como:
   - `VITE_SUPABASE_URL` (no debería cambiar)
   - `VITE_SUPABASE_ANON_KEY` (no debería cambiar)
   - Cualquier variable que contenga `rrs1.onrender.com`

### 4. El Código NO Necesita Cambios

El código en `components/Login.tsx` usa:
```javascript
const redirectUrl = `${window.location.origin}/auth/callback`;
```

Esto automáticamente usa la URL actual, así que **no necesitas cambiar nada en el código**.

### 5. Probar la Nueva Configuración

1. Ve a `https://pruebawebservice-1977.onrender.com/login`
2. Intenta iniciar sesión con Google
3. Verifica que:
   - Redirija a `/auth/callback` sin error 404
   - Procese la autenticación correctamente
   - Redirija a `/app` después del login

## ✅ Checklist

- [ ] Actualizar Site URL en Supabase Dashboard
- [ ] Actualizar Redirect URLs en Supabase Dashboard
- [ ] Agregar nueva URL en Google Cloud Console (Authorized JavaScript origins)
- [ ] Verificar variables de entorno en Render.com
- [ ] Probar login en la nueva URL
- [ ] Verificar que el callback funcione correctamente

## 🎯 Resumen

**Lo que SÍ cambia:**
- URLs en Supabase Dashboard (Site URL y Redirect URLs)
- URLs en Google Cloud Console (Authorized JavaScript origins)

**Lo que NO cambia:**
- El código (usa `window.location.origin` automáticamente)
- El callback de Supabase (`https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`)
- Las variables de entorno de Supabase (URL y ANON KEY)

