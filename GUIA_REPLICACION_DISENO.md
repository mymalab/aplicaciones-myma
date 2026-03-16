# 🎨 Guía Completa de Diseño y Tecnologías - Sistema MyMA

Esta guía documenta todas las herramientas, colores, iconos, diseño y tecnologías utilizadas en el proyecto para que puedas replicar una aplicación similar.

---

## 📦 Stack Tecnológico

### Framework y Librerías Principales

```json
{
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "react-router-dom": "^7.11.0",
  "typescript": "~5.8.2",
  "vite": "^6.2.0",
  "@vitejs/plugin-react": "^5.0.0"
}
```

### Base de Datos y Backend

- **Supabase** (`@supabase/supabase-js: ^2.87.3`)
  - Autenticación con Google OAuth
  - Base de datos PostgreSQL
  - Edge Functions para webhooks

### Estilos y Diseño

- **Tailwind CSS** (CDN)
  - Versión: CDN con plugins `forms` y `container-queries`
  - URL: `https://cdn.tailwindcss.com?plugins=forms,container-queries`

### Gráficos y Visualización

- **Recharts** (`recharts: ^3.6.0`)
  - Gráficos de área (AreaChart)
  - Gráficos de líneas (LineChart)
  - Gráficos de barras (BarChart)
  - Gráficos de pastel (PieChart)

### Servidor

- **Express** (`express: ^4.22.1`)
  - Servidor para producción

---

## 🎨 Sistema de Colores

### Colores Principales (Primary)

```javascript
// Definidos en index.html (Tailwind Config)
"primary": "#059669"        // Verde teal principal
"primary-hover": "#047857"   // Verde teal hover (más oscuro)
"primary-light": "#ecfdf5"   // Verde teal claro (fondo)
```

**Uso:**
- Botones principales
- Enlaces activos
- Sidebar activo
- Acentos de marca

### Colores de Fondo

```javascript
"background-light": "#f6f6f8"  // Fondo principal claro
"background-dark": "#101622"   // Fondo oscuro (no usado actualmente)
```

**Uso:**
- Fondo de la aplicación: `bg-[#f8fafc]` o `bg-background-light`
- Cards y contenedores: `bg-white`

### Colores de Texto

```javascript
"#111318"  // Texto principal (casi negro)
"#616f89"  // Texto secundario (gris medio)
"#6b7280"  // Texto terciario (gris)
"#9ca3af"  // Placeholders
```

**Uso:**
- Títulos: `text-[#111318]`
- Texto secundario: `text-[#616f89]` o `text-gray-500`
- Placeholders: `text-gray-400`

### Colores de Estado

#### Estados de Solicitudes/Requerimientos

```javascript
// Vigente/Actual
"emerald-600"  // #059669 - Verde
"emerald-100"  // Fondo claro
"emerald-700"  // Texto

// En Renovación
"blue-600"     // #2563eb - Azul
"blue-100"     // Fondo claro
"blue-700"     // Texto

// Por Vencer
"amber-600"    // #d97706 - Ámbar/Naranja
"amber-100"    // Fondo claro
"amber-700"    // Texto

// Vencido
"red-600"      // #dc2626 - Rojo
"red-100"      // Fondo claro
"red-700"      // Texto
```

#### Estados de Proyectos/Tareas

```javascript
// Completado
"green-500"    // #10b981
"emerald-500"  // #10b981
"emerald-600"  // #059669

// Pendiente
"amber-500"    // #f59e0b
"amber-600"    // #d97706

// En Proceso
"blue-500"     // #3b82f6
"blue-600"     // #2563eb

// Atrasado
"red-500"      // #ef4444
"red-600"      // #dc2626
```

### Colores de Gráficos (Dashboard)

```javascript
// Solicitudes
"hsl(243, 75%, 59%)"  // Índigo/púrpura

// Completadas
"hsl(160, 72%, 42%)"  // Verde esmeralda

// Pendientes
"hsl(4, 90%, 58%)"    // Rojo/naranja

// Atrasadas
"hsl(0, 90%, 40%)"    // Rojo oscuro

// Cumplimiento
"#eab308"             // Amarillo (yellow-500)
"yellow-500"           // #eab308
"yellow-600"           // #ca8a04

// Promedio (tiempos)
"hsl(217, 91%, 60%)"  // Azul

// Mínimo
"hsl(160, 72%, 42%)"  // Verde

// Máximo
"hsl(4, 90%, 58%)"    // Rojo
```

### Gradientes Utilizados

```javascript
// Gradientes principales
"from-teal-600 to-blue-600"      // Header login, botones principales
"from-teal-700 to-teal-900"      // Logo MyMA
"from-teal-500 to-blue-500"      // Avatar por defecto
"from-teal-50 to-blue-50"        // Fondos suaves
"from-indigo-50 to-blue-50"      // Cards destacados
"from-gray-50 to-blue-50/30"     // Fondo de páginas
"from-green-500 to-emerald-500"  // Barras de progreso
"from-indigo-600 to-blue-600"    // Botones secundarios
"from-primary to-blue-600"        // Iconos destacados
```

### Bordes y Sombras

```javascript
// Bordes
"border-gray-200"     // Bordes estándar
"border-[#e5e7eb]"    // Borde gris claro
"border-gray-300"     // Bordes de inputs

// Sombras
"shadow-sm"           // Sombra pequeña (cards)
"shadow-md"           // Sombra media (hover)
"shadow-lg"           // Sombra grande (modales)
"shadow-xl"           // Sombra extra grande (dropdowns)
"shadow-2xl"           // Sombra máxima (modales grandes)
```

---

## 🔤 Tipografía

### Fuente Principal

```html
<!-- Fuente: Inter (Google Fonts) -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

**Pesos utilizados:**
- `300` - Light (poco usado)
- `400` - Regular (texto normal)
- `500` - Medium (texto secundario)
- `600` - Semibold (títulos secundarios)
- `700` - Bold (títulos principales)

**Configuración en Tailwind:**
```javascript
fontFamily: {
  "sans": ["Inter", "sans-serif"]
}
```

### Tamaños de Texto

```javascript
"text-xs"    // 12px - Labels pequeños, badges
"text-sm"    // 14px - Texto secundario, descripciones
"text-base"  // 16px - Texto normal
"text-lg"    // 18px - Subtítulos
"text-xl"    // 20px - Títulos de sección
"text-2xl"   // 24px - Títulos principales
"text-3xl"   // 30px - Títulos grandes (KPIs)
```

---

## 🎯 Iconos

### Librería de Iconos

**Material Symbols Outlined** (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
```

**Configuración CSS:**
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  aspect-ratio: 1 / 1;
  width: 1em;
  height: 1em;
}

.material-symbols-outlined.fill {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

### Iconos Principales Utilizados

#### Navegación (Sidebar)
```javascript
"description"    // Solicitudes
"engineering"    // Proyectos
"assessment"     // Reportes
"bar_chart"      // Gráficos/Dashboards
"logout"         // Cerrar sesión
```

#### Acciones Generales
```javascript
"check_circle"   // Completado
"pending"        // Pendiente
"warning"        // Advertencia/Atrasado
"schedule"       // Tiempo/Fecha
"event"          // Calendario
"event_available" // Fecha disponible
"arrow_back"     // Volver
"close"          // Cerrar
"save"           // Guardar
"edit"           // Editar
"delete"         // Eliminar
"add"            // Agregar
"search"         // Buscar
"filter_list"    // Filtros
"visibility"     // Ver
"open_in_new"    // Abrir en nueva pestaña
"upload_file"    // Subir archivo
"send"           // Enviar
"info"           // Información
"lock"           // Seguridad
"business"       // Empresa/Cliente
"person"         // Persona
"groups"         // Grupo/Trabajadores
"account_circle" // Perfil de usuario
"assignment"    // Asignación
"analytics"      // Análisis
"show_chart"     // Mostrar gráfico
"open_in_full"   // Ampliar
"check"          // Check simple
```

#### Requerimientos Específicos
```javascript
"engineering"           // AUD
"build"                // CTT
"folder_shared"        // CCD
"science"              // CEXT
"precision_manufacturing" // EPP
"supervisor_account"   // X4X4
```

**Uso en código:**
```jsx
<span className="material-symbols-outlined text-2xl">description</span>
<span className="material-symbols-outlined fill">description</span> // Con relleno
```

---

## 🎨 Sistema de Diseño

### Espaciado (Spacing)

Sistema basado en múltiplos de 4px (Tailwind estándar):

```javascript
// Padding/Margin común
"p-2"   // 8px
"p-3"   // 12px
"p-4"   // 16px
"p-5"   // 20px
"p-6"   // 24px
"p-8"   // 32px

// Gaps
"gap-2"  // 8px
"gap-3"  // 12px
"gap-4"  // 16px
"gap-6"  // 24px
```

### Bordes Redondeados (Border Radius)

```javascript
"rounded"      // 4px
"rounded-lg"   // 8px
"rounded-xl"   // 12px
"rounded-2xl"  // 16px
"rounded-full" // 100% (círculos)
```

### Componentes de Diseño

#### Cards/Tarjetas

```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 hover:shadow-md transition-shadow duration-200">
  {/* Contenido */}
</div>
```

#### Botones Principales

```jsx
// Botón primario
<button className="bg-primary text-white hover:bg-primary-hover rounded-lg px-4 py-3 font-semibold transition-colors">
  Texto
</button>

// Botón secundario
<button className="bg-white border-2 border-gray-300 hover:border-teal-500 text-[#111318] rounded-lg px-4 py-3 font-semibold transition-all">
  Texto
</button>
```

#### Badges/Etiquetas de Estado

```jsx
// Badge verde (vigente)
<span className="bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-sm font-medium">
  Vigente
</span>

// Badge azul (en renovación)
<span className="bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-sm font-medium">
  En Renovación
</span>

// Badge ámbar (por vencer)
<span className="bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-sm font-medium">
  Por Vencer
</span>

// Badge rojo (vencido)
<span className="bg-red-100 text-red-700 border border-red-200 rounded-full px-3 py-1 text-sm font-medium">
  Vencido
</span>
```

#### Inputs/Formularios

```jsx
<input 
  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-[#111318]"
  type="text"
/>
```

#### Tablas

```jsx
<table className="w-full">
  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
    <tr>
      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
        Columna
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-sm text-[#111318]">
        Contenido
      </td>
    </tr>
  </tbody>
</table>
```

#### Modales

```jsx
{/* Overlay */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  {/* Modal */}
  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden">
    {/* Contenido */}
  </div>
</div>
```

### Sidebar

```jsx
<aside 
  className="fixed top-0 left-0 flex-col border-r border-[#e5e7eb] bg-white"
  style={{ 
    width: '80px', 
    height: '100vh',
    zIndex: 9999
  }}
>
  {/* Navegación */}
</aside>
```

**Características:**
- Ancho fijo: 80px
- Fondo blanco
- Borde derecho gris claro
- Iconos centrados
- Tooltips al hover (desktop)

---

## 🎭 Animaciones y Transiciones

### Animaciones CSS Personalizadas

Definidas en `index.css`:

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide In From Top */
@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide In From Left */
@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Slide In From Right */
@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Clases de Animación

```javascript
"animate-in"              // fadeIn 0.2s
"fade-in"                 // fadeIn 0.2s
"slide-in-from-top-2"     // slideInFromTop 0.2s
"animate-slide-in-right"  // slideInFromRight 0.3s
"animate-slide-in"        // slideInFromRight 0.3s
```

### Transiciones Tailwind

```javascript
"transition-colors"       // Transición de colores
"transition-all"         // Todas las propiedades
"transition-shadow"      // Sombra
"transition-transform"   // Transformaciones
"duration-200"           // 200ms
"duration-300"           // 300ms
"ease-in-out"            // Curva de animación
"ease-out"               // Curva de animación
```

---

## 📱 Diseño Responsive

### Breakpoints (Tailwind)

```javascript
// Mobile First
"sm:"   // ≥ 640px
"md:"   // ≥ 768px
"lg:"   // ≥ 1024px
"xl:"   // ≥ 1280px
"2xl:"  // ≥ 1536px
```

### Estrategia Mobile-First

```jsx
// Ejemplo: Grid responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
  {/* Cards */}
</div>

// Ejemplo: Sidebar
<aside className={`
  ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
`}>
  {/* Contenido */}
</aside>
```

### Optimizaciones Móviles

```css
/* Tamaño mínimo de touch targets */
@media (max-width: 1024px) {
  button, a {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Prevenir zoom en iOS */
input[type="text"],
input[type="date"],
select,
textarea {
  font-size: 16px !important;
}
```

---

## 🎨 Componentes de UI Específicos

### Header de Página

```jsx
<div className="mb-8">
  <div className="flex items-center gap-3 mb-2">
    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
      <span className="material-symbols-outlined text-primary text-2xl">icon_name</span>
    </div>
    <div className="flex flex-col">
      <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">
        Título Principal
      </h1>
      <p className="text-gray-500 text-sm font-medium mt-0.5">
        Descripción
      </p>
    </div>
  </div>
</div>
```

### Cards de Estadísticas (KPIs)

```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-5 hover:shadow-md transition-shadow duration-200">
  <div className="flex items-start justify-between mb-4">
    <div className="p-3 rounded-2xl bg-[hsl(160,72%,42%)] w-12 h-12 flex items-center justify-center">
      <span className="material-symbols-outlined text-white text-xl">icon</span>
    </div>
    <span className="text-sm font-semibold text-[hsl(160,72%,42%)]">
      +12%
    </span>
  </div>
  <p className="text-sm text-gray-500 mb-1">Título</p>
  <p className="text-3xl font-bold text-[#111318]">Valor</p>
</div>
```

### Barras de Progreso

```jsx
<div className="w-full bg-gray-100 rounded-full h-2">
  <div 
    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
    style={{ width: `${percentage}%` }}
  />
</div>
```

### Dropdown Menus

```jsx
<div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
  {/* Contenido del menú */}
</div>
```

---

## 📊 Gráficos (Recharts)

### Configuración Base

```jsx
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
```

### Estilo de Gráficos

```jsx
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
    <defs>
      <linearGradient id="colorData" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3} />
        <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
    <XAxis 
      dataKey="mes" 
      stroke="#6b7280"
      fontSize={13}
      fontWeight={500}
      tickLine={false}
      axisLine={false}
    />
    <YAxis 
      stroke="#6b7280"
      fontSize={13}
      fontWeight={500}
      tickLine={false}
      axisLine={false}
    />
    <Tooltip content={<CustomTooltip />} />
    <Area
      type="monotone"
      dataKey="value"
      stroke="hsl(243, 75%, 59%)"
      strokeWidth={2.5}
      fill="url(#colorData)"
    />
  </AreaChart>
</ResponsiveContainer>
```

---

## 🔐 Autenticación

### Google OAuth (Supabase)

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
      hd: '', // Google Workspace
    },
  },
});
```

---

## 📁 Estructura de Archivos

```
├── components/          # Componentes React
│   ├── Sidebar.tsx      # Navegación lateral
│   ├── Login.tsx        # Página de login
│   ├── DashboardView.tsx # Dashboards con gráficos
│   ├── RequestList.tsx  # Lista de solicitudes
│   └── ...
├── config/
│   └── supabase.ts      # Configuración Supabase
├── services/
│   └── supabaseService.ts # Servicios de API
├── utils/               # Utilidades
├── types.ts             # Tipos TypeScript
├── constants.ts         # Constantes
├── index.css            # Estilos globales
├── index.html           # HTML principal
├── App.tsx              # Componente raíz
└── vite.config.ts       # Configuración Vite
```

---

## 🚀 Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Iniciar servidor Express
npm start
```

---

## 📝 Notas Importantes

1. **Tailwind CDN**: El proyecto usa Tailwind vía CDN, no como dependencia npm. Esto permite cambios rápidos pero limita algunas funcionalidades avanzadas.

2. **Material Symbols**: Los iconos se cargan desde Google Fonts. Asegúrate de tener conexión a internet.

3. **Colores HSL**: Los gráficos usan colores en formato HSL para mayor control de opacidad en gradientes.

4. **Responsive**: El diseño es mobile-first. El sidebar se oculta en móvil y se muestra en desktop.

5. **Z-index**: El sidebar usa `z-index: 9999` para estar siempre visible.

6. **Fuente Inter**: Cargada desde Google Fonts. Asegúrate de tener conexión o usa una alternativa local.

---

## 🎯 Resumen Rápido

### Para Replicar el Diseño:

1. **Instalar dependencias**: React 19, TypeScript, Vite, Supabase, Recharts
2. **Configurar Tailwind**: CDN o npm, con colores personalizados
3. **Cargar fuentes**: Inter (Google Fonts) y Material Symbols
4. **Usar colores**: Primary `#059669`, textos `#111318` y `#616f89`
5. **Iconos**: Material Symbols Outlined desde Google Fonts
6. **Componentes**: Cards blancos con bordes redondeados, sombras suaves
7. **Gráficos**: Recharts con colores HSL personalizados
8. **Responsive**: Mobile-first con breakpoints de Tailwind

---

¡Con esta guía deberías poder replicar el diseño y la estructura de la aplicación! 🎨✨












