# MyMA Monorepo - Sistema de Gestión Multi-Área

Sistema de gestión modular con soporte para múltiples áreas (Acreditaciones, Finanzas, Operaciones, etc.) con sistema de permisos RBAC.

## 🏗️ Estructura del Monorepo

```
/
├── apps/
│   └── web/                    # Aplicación principal (único deploy)
│       ├── src/
│       │   ├── app/            # Router principal y layouts
│       │   ├── areas/          # Módulos por área
│       │   │   ├── acreditacion/
│       │   │   ├── finanzas/
│       │   │   └── operaciones/
│       │   └── shared/         # Código compartido
│       │       ├── auth/       # Autenticación
│       │       ├── rbac/       # Sistema de permisos
│       │       ├── api-client/ # Cliente Supabase
│       │       └── ui/         # Design system
│       └── package.json
├── packages/
│   └── contracts/              # Tipos compartidos y DTOs
└── package.json                # Root package.json
```

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 18+
- pnpm 8+ (o npm/yarn)
- Cuenta de Supabase

### Instalación

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build
pnpm build
```

## 📦 Tecnologías

- **React 19** + TypeScript
- **Vite** - Build tool
- **Turborepo** - Monorepo management
- **Supabase** - Backend y autenticación
- **React Router** - Routing
- **Tailwind CSS** - Estilos
- **Recharts** - Gráficos

## 🎯 Sistema de Áreas

El sistema está organizado por áreas. Cada área tiene:

- **Páginas**: Componentes principales del área
- **Componentes**: Componentes específicos (ej: Sidebar)
- **Servicios**: Lógica de negocio y queries a Supabase
- **Rutas**: Configuración de rutas del área
- **Tipos**: Tipos TypeScript específicos

### Áreas Disponibles

- **Acreditaciones**: Gestión de acreditaciones y requerimientos
- **Finanzas**: Gestión financiera (ejemplo mínimo)
- **Operaciones**: Gestión de operaciones (pendiente)

## 🔐 Sistema de Permisos

El sistema usa RBAC (Role-Based Access Control) con permisos por área:

1. **Permisos por Área**: Cada área tiene sus propios permisos
2. **Verificación**: Los hooks `useAreas()` y `usePermissions()` verifican acceso
3. **Protección**: `AreaGuard` y `PermissionGuard` protegen rutas y componentes

### Configurar Permisos

Ver `INSTRUCCIONES_PERMISOS_SUPABASE.md` para configurar permisos en Supabase.

## 📚 Agregar una Nueva Área

Ver `apps/web/src/areas/README.md` para la guía completa.

Pasos básicos:

1. Agregar el área al enum en `packages/contracts/src/areas.ts`
2. Agregar permisos en `apps/web/src/shared/rbac/constants.ts`
3. Crear estructura de carpetas
4. Crear `routes.tsx` y `components/Sidebar.tsx`
5. Registrar en `App.tsx` y `AreaLayout.tsx`

## 🛣️ Rutas

Las rutas siguen este patrón:

- `/login` - Login
- `/auth/callback` - Callback de OAuth
- `/app/area/:areaId/*` - Rutas del área

Ejemplos:
- `/app/area/acreditacion/requests` - Lista de solicitudes
- `/app/area/acreditacion/reports` - Reportes
- `/app/area/finanzas/dashboard` - Dashboard de finanzas

## 🔧 Scripts

```bash
# Desarrollo
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm type-check

# Limpiar
pnpm clean
```

## 📝 Notas Importantes

1. **Deploy**: Solo `apps/web` se despliega
2. **Permisos**: Los admins tienen acceso a todas las áreas
3. **Rutas**: Todas las rutas del área son relativas
4. **Imports**: Usa path aliases (`@shared`, `@areas`, `@contracts`)

## 🐛 Troubleshooting

### Error de imports
- Verifica que los path aliases estén configurados en `vite.config.ts` y `tsconfig.json`

### Permisos no funcionan
- Verifica que la tabla `user_areas` esté creada en Supabase
- Ejecuta el script SQL en `sql/create_user_areas_permissions.sql`

### Rutas no funcionan
- Verifica que el área esté registrada en `App.tsx`
- Verifica que el sidebar esté registrado en `AreaLayout.tsx`

## 📖 Documentación Adicional

- `GUIA_REPLICACION_DISENO.md` - Guía de diseño y tecnologías
- `apps/web/src/areas/README.md` - Guía para agregar áreas
- `INSTRUCCIONES_PERMISOS_SUPABASE.md` - Configuración de permisos

## ✅ Estado del Proyecto

- ✅ Monorepo configurado con Turborepo
- ✅ Sistema de áreas implementado
- ✅ RBAC básico implementado
- ✅ Área de Acreditaciones migrada
- ✅ Template para nuevas áreas
- ⚠️ Permisos en Supabase (pendiente ejecutar SQL)











