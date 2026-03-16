# 🔐 Configuración de Autenticación con Google (Empresarial)

Esta guía te ayudará a verificar y configurar correctamente la autenticación con Google Workspace (empresarial) usando Supabase.

## ✅ Verificación de Configuración

### 1. Configuración en Supabase Dashboard

#### Paso 1: Habilitar Google como Proveedor OAuth

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Providers**
3. Busca **Google** en la lista de proveedores
4. Habilita el toggle para activar Google
5. Verifica que esté marcado como **Enabled**

#### Paso 2: Configurar Credenciales de Google OAuth

Necesitas obtener las credenciales de Google Cloud Console:

1. **Crear/Seleccionar Proyecto en Google Cloud Console:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com)
   - Crea un nuevo proyecto o selecciona uno existente

2. **Habilitar Google+ API:**
   - Ve a **APIs & Services** → **Library**
   - Busca "Google+ API" y habilítala

3. **Crear Credenciales OAuth 2.0:**
   - Ve a **APIs & Services** → **Credentials**
   - Haz clic en **Create Credentials** → **OAuth client ID**
   - Selecciona **Web application** como tipo
   - Configura:
     - **Name**: MyMA Authentication (o el nombre que prefieras)
     - **Authorized JavaScript origins**:
       ```
       http://localhost:3000
       https://gestionrequerimientos.onrender.com
       https://pugasfsnckeyitjemvju.supabase.co
       ```
     - **Authorized redirect URIs**:
       ```
       http://localhost:3000
       https://gestionrequerimientos.onrender.com
       https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback
       ```

4. **Copiar Credenciales:**
   - Copia el **Client ID** y **Client Secret**
   - Pégalos en Supabase Dashboard:
     - **Authentication** → **Providers** → **Google**
     - Pega el **Client ID** en el campo correspondiente
     - Pega el **Client Secret** en el campo correspondiente

#### Paso 3: Configurar URL de Redirección en Supabase

En Supabase Dashboard:
1. Ve a **Authentication** → **URL Configuration**
2. Agrega las siguientes URLs en **Redirect URLs**:
   ```
   http://localhost:3000/**
   https://gestionrequerimientos.onrender.com/**
   ```

### 2. Verificación del Código

El código ya está configurado correctamente:

- ✅ **Componente Login** (`components/Login.tsx`): Implementado con Google OAuth
- ✅ **Navegación desde Sidebar**: El botón de Configuración navega al login
- ✅ **Integración en App.tsx**: La vista de login está integrada
- ✅ **Configuración de Supabase**: El cliente está configurado en `config/supabase.ts`

### 3. Configuración para Google Workspace (Empresarial)

Para restringir el acceso solo a cuentas de Google Workspace de tu organización:

#### Opción A: Restricción en Google Cloud Console (Recomendado)

1. En Google Cloud Console, ve a **APIs & Services** → **OAuth consent screen**
2. En **User Type**, selecciona **Internal** (solo usuarios de tu organización)
3. Esto restringirá el acceso solo a usuarios de tu dominio de Google Workspace

#### Opción B: Restricción en el Código

El código ya incluye el parámetro `hd` (hosted domain) que permite especificar un dominio:

```typescript
queryParams: {
  access_type: 'offline',
  prompt: 'consent',
  hd: '', // Deja vacío para permitir cualquier dominio, o especifica tu dominio
}
```

Si quieres restringir a un dominio específico, cambia `hd: ''` por `hd: 'tudominio.com'`.

### 4. Prueba de Funcionamiento

#### Prueba Local:

1. Ejecuta la aplicación:
   ```bash
   npm run dev
   ```

2. Navega a `http://localhost:3000`

3. Haz clic en el botón de **Configuración** (⚙️) en el Sidebar

4. Deberías ver la pantalla de login

5. Haz clic en **"Continuar con Google"**

6. Deberías ser redirigido a Google para autenticarte

7. Después de autenticarte, serás redirigido de vuelta a la aplicación

#### Verificación en Consola del Navegador:

Abre las herramientas de desarrollador (F12) y verifica:

1. **No hay errores en la consola**
2. **La sesión se crea correctamente**: Verifica en la pestaña **Application** → **Local Storage** que hay una entrada de Supabase
3. **El usuario se muestra correctamente**: Después del login, deberías ver tu información de usuario

### 5. Solución de Problemas Comunes

#### Error: "redirect_uri_mismatch"

**Causa**: La URL de redirección no está configurada correctamente en Google Cloud Console.

**Solución**:
1. Ve a Google Cloud Console → **Credentials** → Tu OAuth Client
2. Agrega la URL exacta que aparece en el error a **Authorized redirect URIs**
3. Asegúrate de incluir: `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback`

#### Error: "access_denied"

**Causa**: El usuario no tiene permisos o la aplicación no está autorizada.

**Solución**:
1. Verifica que el OAuth consent screen esté configurado correctamente
2. Si usas "Internal", asegúrate de que el usuario pertenezca a tu organización
3. Si usas "External", verifica que el usuario esté en la lista de test users

#### Error: "invalid_client"

**Causa**: Las credenciales (Client ID o Client Secret) son incorrectas.

**Solución**:
1. Verifica que hayas copiado correctamente el Client ID y Client Secret
2. Asegúrate de que no haya espacios adicionales
3. Vuelve a copiar y pegar las credenciales en Supabase Dashboard

#### El login funciona pero no se mantiene la sesión

**Causa**: Problema con el almacenamiento de la sesión o la configuración de cookies.

**Solución**:
1. Verifica que no tengas bloqueadores de cookies activos
2. Verifica que el dominio de Supabase esté permitido
3. Revisa la configuración de **Site URL** en Supabase Dashboard → **Authentication** → **URL Configuration**

### 6. Verificación de la Sesión

Para verificar que la sesión está activa, puedes usar la consola del navegador:

```javascript
// Verificar usuario actual
const { data: { user } } = await supabase.auth.getUser();
console.log('Usuario:', user);

// Verificar sesión
const { data: { session } } = await supabase.auth.getSession();
console.log('Sesión:', session);
```

### 7. Configuración de Producción

Cuando despliegues a producción:

1. **Actualiza las URLs en Google Cloud Console:**
   - Agrega tu dominio de producción a **Authorized JavaScript origins**
   - Agrega `https://tu-dominio.com` y `https://pugasfsnckeyitjemvju.supabase.co/auth/v1/callback` a **Authorized redirect URIs**

2. **Actualiza las URLs en Supabase:**
   - Ve a **Authentication** → **URL Configuration**
   - Actualiza **Site URL** a tu dominio de producción
   - Agrega tu dominio a **Redirect URLs**

3. **Verifica las variables de entorno:**
   - Asegúrate de que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configuradas correctamente en tu plataforma de despliegue

## 📝 Checklist de Verificación

- [ ] Google OAuth está habilitado en Supabase Dashboard
- [ ] Client ID y Client Secret están configurados en Supabase
- [ ] Las URLs de redirección están configuradas en Google Cloud Console
- [ ] Las URLs de redirección están configuradas en Supabase
- [ ] El botón de Configuración navega correctamente al login
- [ ] El login con Google funciona correctamente
- [ ] La sesión se mantiene después del login
- [ ] El usuario puede ver su información después del login
- [ ] El logout funciona correctamente

## 🎉 ¡Listo!

Si todos los pasos están completos, tu autenticación con Google debería estar funcionando correctamente. Si encuentras algún problema, revisa la sección de "Solución de Problemas Comunes" o verifica los logs en la consola del navegador.

