# 🚀 Desplegar Función Edge de Supabase

## Error 404 - La función no está desplegada

Si ves el error 404, significa que la función edge `send-webhook` no está desplegada en Supabase.

## Opción 1: Desplegar desde el Dashboard de Supabase (MÁS FÁCIL)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto: **pugasfsnckeyitjemvju**
3. En el menú lateral, ve a **Edge Functions**
4. Haz clic en **Create a new function**
5. **Nombre de la función**: `send-webhook` (exactamente así, sin espacios)
6. **Código**: Copia y pega todo el contenido del archivo `supabase/functions/send-webhook/index.ts`
7. Haz clic en **Deploy**

## Opción 2: Desplegar usando Supabase CLI

### Paso 1: Instalar Supabase CLI

```bash
npm install -g supabase
```

O con Homebrew (Mac):
```bash
brew install supabase/tap/supabase
```

### Paso 2: Iniciar sesión

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte.

### Paso 3: Vincular tu proyecto

```bash
supabase link --project-ref pugasfsnckeyitjemvju
```

### Paso 4: Desplegar la función

```bash
supabase functions deploy send-webhook
```

## Verificar que funciona

Después de desplegar, la función debería estar disponible en:
```
https://pugasfsnckeyitjemvju.supabase.co/functions/v1/send-webhook
```

Puedes probar haciendo una solicitud POST desde tu aplicación.

## Solución de problemas

### Si el despliegue falla:
- Verifica que estés autenticado: `supabase login`
- Verifica que el proyecto esté vinculado: `supabase projects list`
- Verifica que el archivo `supabase/functions/send-webhook/index.ts` exista

### Si sigue dando 404:
- Verifica que el nombre de la función sea exactamente `send-webhook`
- Verifica que la función esté desplegada en el Dashboard
- Espera unos minutos después del despliegue para que se propague





























