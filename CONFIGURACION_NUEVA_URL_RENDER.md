# ðŸ”§ ConfiguraciÃ³n para Nueva URL de Render

## URL Nueva: `https://aplicaciones-myma.onrender.com`

Necesitas actualizar **2 lugares crÃ­ticos** para que el login funcione correctamente:

---

## âœ… Paso 1: Configurar Supabase Dashboard

### 1.1 Configurar Site URL y Redirect URLs

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** â†’ **URL Configuration**
3. Configura lo siguiente:

   **Site URL:**
   ```
   https://aplicaciones-myma.onrender.com
   ```

   **Redirect URLs:** (agrega todas estas lÃ­neas, una por lÃ­nea)
   ```
   https://aplicaciones-myma.onrender.com/**
   http://localhost:3000/**
   ```

   âš ï¸ **IMPORTANTE**: El `**` permite cualquier ruta dentro del dominio.

4. Haz clic en **Save**

---

## âœ… Paso 2: Configurar Google Cloud Console

### 2.1 Actualizar Authorized Redirect URIs

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Navega a **APIs & Services** â†’ **Credentials**
3. Busca y selecciona tu **OAuth 2.0 Client ID** (el que usas para MyMA)
4. En la secciÃ³n **Authorized redirect URIs**, asegÃºrate de tener estas URLs:

   ```
   https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback
   https://aplicaciones-myma.onrender.com
   http://localhost:3000
   ```

   âš ï¸ **CRÃTICO**: La URL de Supabase (`https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`) es la mÃ¡s importante, ya que es la que realmente procesa la autenticaciÃ³n.

5. Haz clic en **Save**

### 2.2 (Opcional) Actualizar Authorized JavaScript origins

En la misma pÃ¡gina de configuraciÃ³n de OAuth Client, en **Authorized JavaScript origins**, agrega:

```
https://aplicaciones-myma.onrender.com
http://localhost:3000
https://pugasfsnckeyitjemvju.supabase.co
```

6. Haz clic en **Save**

---

## âœ… Paso 3: Verificar que el CÃ³digo EstÃ© Correcto

El cÃ³digo ya estÃ¡ configurado para usar dinÃ¡micamente la URL actual. Verifica que en `components/Login.tsx` lÃ­nea 63 estÃ© asÃ­:

```63:63:components/Login.tsx
      const redirectUrl = `${window.location.origin}/auth/callback`;
```

Esto deberÃ­a funcionar automÃ¡ticamente con cualquier URL, incluyendo `https://aplicaciones-myma.onrender.com`.

---

## âœ… Paso 4: Limpiar Cache y Probar

### 4.1 Limpiar Cache del Navegador

1. Abre las herramientas de desarrollador (F12)
2. Ve a **Application** â†’ **Storage**
3. Haz clic en **Clear site data** (o elimina manualmente cookies y localStorage)
4. O prueba en modo incÃ³gnito

### 4.2 Probar el Login

1. Ve a `https://aplicaciones-myma.onrender.com/login`
2. Haz clic en **"Continuar con Google Workspace"**
3. Completa el login con Google
4. DeberÃ­as ser redirigido a `https://aplicaciones-myma.onrender.com/app`

---

## ðŸ” VerificaciÃ³n y Debugging

### Verificar la URL de RedirecciÃ³n en la Consola

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaÃ±a **Console**
3. Antes de hacer login, deberÃ­as ver:
   ```
   ðŸ”— URL de redirecciÃ³n: https://aplicaciones-myma.onrender.com/auth/callback
   ```
4. Si ves `localhost:3000`, hay un problema de cache - limpia el cache y prueba de nuevo

### Verificar en Supabase Logs

1. Ve a Supabase Dashboard â†’ **Logs** â†’ **Auth Logs**
2. Busca los intentos de login recientes
3. Verifica que no haya errores de "redirect_uri_mismatch"

---

## ðŸš¨ Errores Comunes y Soluciones

### Error: "redirect_uri_mismatch"

**Causa**: La URL no estÃ¡ configurada en Google Cloud Console o Supabase.

**SoluciÃ³n**:
- Verifica que agregaste `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback` en Google Cloud Console
- Verifica que agregaste `https://aplicaciones-myma.onrender.com/**` en Supabase Dashboard

### Error: DespuÃ©s del login vuelve a `/login` en lugar de `/app`

**Causa**: La sesiÃ³n no se estÃ¡ guardando correctamente o hay un problema con las cookies.

**SoluciÃ³n**:
- Verifica que no tengas bloqueadores de cookies activos
- Limpia el cache del navegador
- Verifica en la consola si hay errores de CORS o cookies

### Error: "Invalid redirect URL"

**Causa**: La URL en `redirectTo` no coincide con las URLs permitidas en Supabase.

**SoluciÃ³n**:
- Verifica en Supabase Dashboard â†’ Authentication â†’ URL Configuration
- AsegÃºrate de que `https://aplicaciones-myma.onrender.com/**` estÃ© en Redirect URLs
- El `**` es importante para permitir cualquier ruta dentro del dominio

---

## ðŸ“ Checklist de VerificaciÃ³n

Antes de considerar que estÃ¡ resuelto, verifica:

- [ ] **Supabase Dashboard**: Site URL configurado a `https://aplicaciones-myma.onrender.com`
- [ ] **Supabase Dashboard**: Redirect URLs incluye `https://aplicaciones-myma.onrender.com/**`
- [ ] **Google Cloud Console**: Authorized redirect URIs incluye `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`
- [ ] **Google Cloud Console**: Authorized JavaScript origins incluye `https://aplicaciones-myma.onrender.com`
- [ ] **Navegador**: Cache limpiado o probado en modo incÃ³gnito
- [ ] **Login**: Funciona y redirige correctamente a `/app`
- [ ] **Consola**: No hay errores de redirecciÃ³n

---

## ðŸŽ¯ Resumen de URLs Importantes

### Para Supabase Dashboard:
- **Site URL**: `https://aplicaciones-myma.onrender.com`
- **Redirect URLs**: 
  - `https://aplicaciones-myma.onrender.com/**`
  - `http://localhost:3000/**`

### Para Google Cloud Console:
- **Authorized redirect URIs**:
  - `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback` âš ï¸ **OBLIGATORIO**
  - `https://aplicaciones-myma.onrender.com`
  - `http://localhost:3000`

- **Authorized JavaScript origins**:
  - `https://aplicaciones-myma.onrender.com`
  - `http://localhost:3000`
  - `https://pugasfsnckeyitjemvju.supabase.co`

---

## âœ… Listo

Una vez que hayas configurado ambos lugares (Supabase y Google Cloud Console), el login deberÃ­a funcionar correctamente. Si aÃºn tienes problemas, verifica los logs en Supabase Dashboard y la consola del navegador para mÃ¡s detalles.
















