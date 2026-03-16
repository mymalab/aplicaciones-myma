# 📋 Sistema de Gestión de Solicitudes - MYMA

Sistema completo para la gestión de solicitudes de acreditación, requerimientos por persona y proyectos.

## 🚀 Características

- ✅ **Gestión de Requerimientos por Persona**: Visualiza y gestiona los requerimientos de los colaboradores
- ✅ **Formulario de Solicitud de Acreditación**: Crea solicitudes para proyectos de terreno
- ✅ **Galería de Proyectos**: Vista general de todos los proyectos con seguimiento de tareas
- ✅ **Asignación de Responsables**: Asigna JPRO, EPR, RRHH y Legal a cada proyecto
- ✅ **Seguimiento de Progreso**: Visualiza el progreso de tareas por responsable
- ✅ **Estados Automáticos**: Cálculo automático de estados basado en fechas de vencimiento
- ✅ **Responsive Design**: Interfaz optimizada para móviles y escritorio

## 📦 Tecnologías

- **React 19** con TypeScript
- **Vite** para build rápido
- **Supabase** como base de datos
- **Tailwind CSS** para estilos
- **Material Symbols** para iconos

## 🏃 Ejecutar Localmente

**Prerequisitos:** Node.js 18+

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno (opcional):**
   
   Las credenciales de Supabase ya están configuradas en `config/supabase.ts`. Si deseas usar variables de entorno, crea un archivo `.env` con:
   ```
   VITE_SUPABASE_URL=tu-url-de-supabase
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima
   ```

3. **Ejecutar la aplicación:**
   ```bash
   npm run dev
   ```
   
   La aplicación estará disponible en `http://localhost:3000` (o el siguiente puerto disponible)

## 📚 Estructura del Proyecto

```
├── components/           # Componentes React
│   ├── AssignResponsiblesModal.tsx
│   ├── FieldRequestForm.tsx
│   ├── ProjectDetailView.tsx
│   ├── ProjectGalleryV2.tsx
│   ├── RequestForm.tsx
│   ├── RequestList.tsx
│   ├── Sidebar.tsx
│   └── WorkerList.tsx
├── config/              # Configuración
│   └── supabase.ts
├── services/            # Servicios de API
│   └── supabaseService.ts
├── utils/               # Utilidades
│   ├── projectTasks.ts
│   └── testSupabase.ts
├── types.ts             # Definiciones de tipos
├── constants.ts         # Constantes
├── App.tsx              # Componente principal
└── index.tsx           # Punto de entrada

```

## 🗄️ Base de Datos

El proyecto utiliza Supabase con las siguientes tablas principales:

- `persona` - Colaboradores/trabajadores
- `requerimientos` - Tipos de requerimientos (AUD, CTT, etc.)
- `brg_acreditacion_persona_requerimiento_sst` - Requerimientos asignados a personas
- `fct_acreditacion_solicitud` - Solicitudes de proyectos (antes `solicitud_acreditacion`)
- `cliente` - Clientes/empresas
- `brg_acreditacion_cliente_requerimiento` - Requerimientos por empresa
- `brg_acreditacion_solicitud_requerimiento` - Tareas de proyectos (antes `proyecto_requerimientos_acreditacion`)

## 📱 Uso de la Aplicación

### Vista de Requerimientos por Persona
1. Navega a la primera sección (ícono de cuadrícula)
2. Visualiza todos los requerimientos con sus estados
3. Edita fechas o estados manualmente
4. Crea nuevos registros persona-requerimiento

### Solicitud de Acreditación
1. Navega a la sección de Proyectos (ícono de maletín)
2. Completa el formulario con:
   - Datos del proyecto
   - Cliente y contrato
   - Trabajadores MYMA
   - Información de contratista (si aplica)
   - Vehículos y seguridad

### Galería de Proyectos
1. Navega a la sección de Reportes (ícono de gráfico)
2. Visualiza todos los proyectos con su progreso
3. Asigna responsables a proyectos pendientes
4. Visualiza detalles y tareas de cada proyecto
5. Filtra por cliente, estado o progreso

## ✅ Estado del Proyecto

### ✔️ Funcionalidades Implementadas y Probadas

- [x] Listado de requerimientos por persona
- [x] Creación y edición de requerimientos
- [x] Formulario de solicitud de acreditación
- [x] Galería de proyectos con filtros
- [x] Modal de asignación de responsables
- [x] Vista detallada de proyectos
- [x] Cálculo automático de estados
- [x] Seguimiento de tareas por responsable
- [x] Diseño responsive (móvil y escritorio)
- [x] Integración completa con Supabase
- [x] Sin errores de linter
- [x] Sin errores críticos en consola

### 🎨 Características de UI/UX

- Sidebar con navegación intuitiva
- Badges de estado con colores semánticos
- Progress bars para seguimiento visual
- Filtros avanzados en galería de proyectos
- Formularios con validación
- Feedback visual en todas las acciones
- Iconos Material Symbols
- Animaciones suaves

## 🐛 Problemas Conocidos

- ⚠️ Warning de Tailwind CDN en producción (usar PostCSS en producción)
- 📌 Favicon básico (considerar agregar uno personalizado)

## 🚀 Deploy

Para hacer deploy en producción:

1. **Instalar Tailwind CSS como PostCSS plugin:**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **Actualizar `index.html`** para eliminar el CDN de Tailwind

3. **Build de producción:**
   ```bash
   npm run build
   ```

4. **Deploy a Render/Vercel/Netlify:**
   - Conecta tu repositorio
   - Configura las variables de entorno
   - Deploy automático

## 📞 Soporte

Para problemas o preguntas, revisar:
- `INSTRUCCIONES_URGENTES.md` - Solución de problemas comunes
- `GUIA_DEFINITIVA_SOLUCION.md` - Guía técnica detallada
- Scripts SQL en carpeta `sql/` - Para configuración de base de datos

## 📄 Licencia

Propiedad de MYMA - Todos los derechos reservados
