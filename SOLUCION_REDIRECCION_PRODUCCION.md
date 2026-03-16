# 🔧 Solución: Redirección a localhost en Producción

## Problema

Después de hacer login con Google en producción (https://rrs1.onrender.com/), el usuario es redirigido a localhost en lugar de volver a la URL de producción.

## Solución

### 1. Verificar Configuración en Supabase Dashboard

Es **CRÍTICO** que configures las URLs de redirección correctamente en Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **URL Configuration**
3. En **Redirect URLs**, asegúrate de tener:
   ```
   https://rrs1.onrender.com/**
   http://localhost:3000/**
   ```
   (El `**` permite cualquier ruta dentro de ese dominio)

4. En **Site URL**, configura:
   ```
   https://rrs1.onrender.com
   ```

### 2. Verificar Configuración en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Navega a **APIs & Services** → **Credentials**
3. Selecciona tu OAuth 2.0 Client ID
4. En **Authorized redirect URIs**, asegúrate de tener:
   ```
   https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback
   https://rrs1.onrender.com
   http://localhost:3000
   ```

   ⚠️ **IMPORTANTE**: El callback de Supabase (`https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`) es el que realmente maneja la autenticación. Las otras URLs son para referencia.

### 3. Verificar el Código

El código ya está actualizado para usar `window.location.origin + window.location.pathname`, lo que debería funcionar correctamente en producción.

Si aún tienes problemas, verifica en la consola del navegador:
- Abre las herramientas de desarrollador (F12)
- Ve a la pestaña **Console**
- Busca el mensaje: `🔗 URL de redirección:`
- Verifica que muestre `https://rrs1.onrender.com` (no localhost)

### 4. Limpiar Cache y Cookies

A veces el problema es cache del navegador:

1. Abre las herramientas de desarrollador (F12)
2. Ve a **Application** → **Storage**
3. Haz clic en **Clear site data**
4. O específicamente:
   - **Cookies** → Elimina todas las cookies del sitio
   - **Local Storage** → Elimina todas las entradas
   - **Session Storage** → Elimina todas las entradas

### 5. Verificar Variables de Entorno (si las usas)

Si estás usando variables de entorno, asegúrate de que en producción estén configuradas:

```env
VITE_SUPABASE_URL=https://pugasfsnckeyitjemvju.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

## Pasos de Verificación

1. ✅ **Supabase Dashboard** → **Authentication** → **URL Configuration**
   - Site URL: `https://rrs1.onrender.com`
   - Redirect URLs: `https://rrs1.onrender.com/**`

2. ✅ **Google Cloud Console** → **Credentials** → OAuth Client
   - Authorized redirect URIs incluye: `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`

3. ✅ **Código actualizado** en `components/Login.tsx`
   - Usa `window.location.origin + window.location.pathname`

4. ✅ **Probar en producción**
   - Ir a https://rrs1.onrender.com/
   - Hacer login con Google
   - Verificar que redirija a https://rrs1.onrender.com/ (no localhost)

## Si el Problema Persiste

Si después de verificar todo lo anterior aún redirige a localhost:

1. **Verifica la consola del navegador** para ver qué URL se está usando
2. **Revisa los logs de Supabase** en el Dashboard → Logs
3. **Prueba en modo incógnito** para descartar problemas de cache
4. **Verifica que no haya un proxy o redirección** en Render.com que esté causando el problema

## Nota Importante

El flujo de OAuth funciona así:
1. Usuario hace click en "Continuar con Google"
2. Se redirige a Google para autenticarse
3. Google redirige a Supabase: `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`
4. Supabase procesa la autenticación y redirige a la URL que especificaste en `redirectTo`
5. Tu aplicación recibe al usuario autenticado

Por eso es **MUY IMPORTANTE** que la URL en `redirectTo` y en Supabase Dashboard coincidan exactamente.

