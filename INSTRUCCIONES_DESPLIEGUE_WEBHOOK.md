# 📋 Instrucciones para Desplegar la Función Edge de Supabase

## Problema
El webhook de n8n bloquea solicitudes CORS desde el navegador. Para solucionarlo, hemos creado una función edge de Supabase que actúa como proxy.

## Pasos para Desplegar

### 1. Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

O usando Homebrew (Mac):
```bash
brew install supabase/tap/supabase
```

### 2. Iniciar sesión en Supabase CLI

```bash
supabase login
```

### 3. Vincular tu proyecto

```bash
supabase link --project-ref pugasfsnckeyitjemvju
```

### 4. Desplegar la función edge

```bash
supabase functions deploy send-webhook
```

### 5. Verificar el despliegue

La función estará disponible en:
```
https://pugasfsnckeyitjemvju.supabase.co/functions/v1/send-webhook
```

## Alternativa: Desplegar desde el Dashboard de Supabase

Si prefieres usar la interfaz web:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Edge Functions** en el menú lateral
3. Haz clic en **Create a new function**
4. Nombre: `send-webhook`
5. Copia y pega el contenido de `supabase/functions/send-webhook/index.ts`
6. Haz clic en **Deploy**

## Verificar que Funciona

Una vez desplegada, la aplicación debería funcionar correctamente sin errores de CORS.

Si encuentras problemas, verifica:
- Que la función esté desplegada correctamente
- Que tengas permisos para invocar funciones edge
- Revisa los logs en el Dashboard de Supabase

## Nota

La función edge actúa como proxy y:
- ✅ Evita problemas de CORS
- ✅ Mantiene la seguridad (solo permite POST)
- ✅ Maneja errores apropiadamente
- ✅ Devuelve respuestas con CORS habilitado





























