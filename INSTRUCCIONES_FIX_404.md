# 🔧 Solución: Error 404 en /auth/callback en Render.com

## Problema
El error 404 en `/auth/callback` ocurre porque Render.com necesita un servidor para manejar las rutas de React Router en una Single Page Application (SPA).

## Solución: Cambiar de Static Site a Web Service

### Paso 1: En Render.com Dashboard

1. Ve a tu servicio: https://dashboard.render.com
2. Selecciona tu servicio `rrs1`
3. Ve a **Settings** (Configuración)
4. **IMPORTANTE:** En la sección "Service Type" o "Tipo de Servicio":
   - Cambia de **Static Site** a **Web Service**
   - O si no puedes cambiarlo directamente, necesitarás crear un nuevo servicio Web Service

5. Si creas un nuevo servicio:
   - Tipo: **Web Service**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: **Node**

### Paso 2: Verificar Archivos en el Repositorio

Asegúrate de que estos archivos estén en tu repositorio:

1. ✅ `server.js` - Servidor Express
2. ✅ `package.json` - Con script `start` y dependencia `express`
3. ✅ `render.yaml` - Configuración (opcional pero recomendado)

### Paso 3: Hacer Commit y Push

```bash
git add .
git commit -m "Add Express server for React Router support"
git push
```

### Paso 4: Verificar el Deploy

1. Ve a los **Logs** de tu servicio en Render.com
2. Verifica que:
   - El build se complete exitosamente
   - El servidor inicie con: `Server is running on port <PORT>`
   - No haya errores relacionados con `server.js`

### Paso 5: Probar la Aplicación

1. Ve a `https://rrs1.onrender.com/login`
2. Intenta iniciar sesión con Google
3. Debería redirigir a `/auth/callback` sin error 404
4. Luego debería redirigir automáticamente a `/app`

## Verificación

Si después de estos pasos sigue el 404:

1. **Verifica los Logs de Render.com:**
   - Ve a tu servicio → **Logs**
   - Busca errores relacionados con el servidor

2. **Verifica que el servidor esté corriendo:**
   - Los logs deben mostrar: `Server is running on port XXXX`

3. **Verifica la configuración:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Service Type: **Web Service** (NO Static Site)

## Archivos Necesarios

### server.js
```javascript
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    const indexContent = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexContent);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### package.json
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.22.1"
  }
}
```

