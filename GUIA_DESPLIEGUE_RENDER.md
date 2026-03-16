# 🚀 Guía de Despliegue en Render

Esta guía te explicará paso a paso cómo desplegar tu aplicación de gestión de solicitudes en Render.

## 📋 Requisitos Previos

1. **Cuenta en Render**: Crea una cuenta gratuita en [render.com](https://render.com)
2. **Repositorio Git**: Tu código debe estar en GitHub, GitLab o Bitbucket
3. **Node.js**: La aplicación está configurada para Node.js

## 🔧 Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que todos tus cambios estén commiteados y pusheados a tu repositorio:

```bash
git add .
git commit -m "Preparar para despliegue en Render"
git push origin main
```

### 2. Crear un Nuevo Servicio Web en Render

1. Inicia sesión en [Render Dashboard](https://dashboard.render.com)
2. Haz clic en **"New +"** y selecciona **"Web Service"**
3. Conecta tu repositorio de Git:
   - Si es la primera vez, autoriza a Render para acceder a tu cuenta de GitHub/GitLab
   - Selecciona el repositorio `gestión-de-solicitudes`

### 3. Configuración del Servicio

Render debería detectar automáticamente el archivo `render.yaml`. Si no, configura manualmente:

#### Configuración Manual (si no usa render.yaml):

- **Name**: `gestion-solicitudes-myma` (o el nombre que prefieras)
- **Environment**: `Node`
- **Region**: `Oregon` (o la región más cercana a ti)
- **Branch**: `main` (o la rama que uses)
- **Root Directory**: `.` (raíz del proyecto)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4. Variables de Entorno

En la sección **Environment Variables** del dashboard de Render, puedes agregar:

#### Variables Opcionales (si no usas los valores por defecto):

- `VITE_SUPABASE_URL`: Tu URL de Supabase
- `VITE_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase

**Nota**: Tu aplicación ya tiene valores por defecto en `config/supabase.ts`, así que estas variables son opcionales.

#### Variables Automáticas:

- `NODE_ENV`: Se establece automáticamente a `production` desde `render.yaml`
- `PORT`: Render asigna automáticamente el puerto, pero está configurado para usar el puerto 3000 si no se proporciona

### 5. Iniciar el Despliegue

1. Haz clic en **"Create Web Service"**
2. Render comenzará automáticamente:
   - Instalar dependencias (`npm install`)
   - Construir la aplicación (`npm run build`)
   - Iniciar el servidor (`npm start`)

### 6. Verificar el Despliegue

Una vez completado el despliegue:

1. Render te proporcionará una URL como: `https://gestion-solicitudes-myma.onrender.com`
2. Visita la URL para verificar que la aplicación funciona correctamente
3. Revisa los logs en el dashboard si hay algún problema

## 🔍 Solución de Problemas

### Error: "Build failed"

- **Causa común**: Dependencias faltantes o errores de compilación
- **Solución**: 
  - Verifica los logs de build en Render
  - Asegúrate de que `package.json` tiene todas las dependencias
  - Prueba el build localmente con `npm run build`

### Error: "Application failed to respond"

- **Causa común**: El servidor no está escuchando en el puerto correcto
- **Solución**: 
  - Verifica que `server.js` usa `process.env.PORT` (ya está configurado)
  - Asegúrate de que el `startCommand` sea `npm start`

### Error 404 en rutas

- **Causa común**: React Router necesita que todas las rutas sirvan `index.html`
- **Solución**: 
  - Tu `server.js` ya tiene configurado `app.get('*', ...)` para manejar esto
  - Verifica que la ruta al `dist` folder sea correcta

### La aplicación se ve mal (estilos faltantes)

- **Causa común**: Problemas con Tailwind CSS o assets
- **Solución**: 
  - Verifica que el build genera la carpeta `dist` correctamente
  - Revisa que los assets estén siendo servidos desde `dist`

## 🔄 Actualizaciones Automáticas

Render puede configurarse para desplegar automáticamente cada vez que hagas push a la rama principal:

1. En el dashboard de Render, ve a tu servicio
2. En **Settings** → **Auto-Deploy**, asegúrate de que esté habilitado
3. Cada `git push` desplegará automáticamente

## 📊 Monitoreo

- **Logs**: Puedes ver los logs en tiempo real en el dashboard de Render
- **Métricas**: Render proporciona métricas básicas de uso
- **Health Check**: Configurado en `render.yaml` para verificar que la app está funcionando

## 💰 Planes de Render

- **Free Tier**: 
  - Apropiado para desarrollo y pruebas
  - El servicio puede "dormir" después de 15 minutos de inactividad
  - El primer request después de dormir puede tomar 30-60 segundos

- **Paid Plans**: 
  - Para producción con usuarios reales
  - Sin tiempos de arranque
  - Mejor rendimiento

## ✅ Checklist de Despliegue

- [ ] Código pusheado al repositorio
- [ ] Servicio web creado en Render
- [ ] Variables de entorno configuradas (si es necesario)
- [ ] Build completado exitosamente
- [ ] Aplicación accesible en la URL de Render
- [ ] Todas las rutas funcionando correctamente
- [ ] Estilos y assets cargándose correctamente
- [ ] Conexión a Supabase funcionando

## 📝 Notas Importantes

1. **Primera carga lenta**: En el plan gratuito, la primera carga puede tardar si el servicio estaba dormido
2. **Variables de entorno**: Si cambias variables de entorno, necesitas hacer un nuevo despliegue
3. **Base de datos**: Asegúrate de que tu base de datos Supabase permita conexiones desde cualquier origen (CORS configurado)
4. **Dominio personalizado**: Puedes configurar un dominio personalizado en Settings → Custom Domain

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Render Dashboard
2. Verifica que la aplicación funciona localmente con `npm run build && npm start`
3. Consulta la documentación de Render: [render.com/docs](https://render.com/docs)

---

¡Listo! Tu aplicación debería estar funcionando en Render. 🎉















