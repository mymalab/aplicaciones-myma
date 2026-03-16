# Guía para Agregar una Nueva Área

Esta guía explica cómo agregar una nueva área al sistema MyMA.

## Estructura de un Área

Cada área debe seguir esta estructura:

```
areas/
  tu-area/
    ├── pages/           # Páginas/componentes del área
    ├── components/      # Componentes específicos del área (ej: Sidebar)
    ├── services/        # Servicios/Supabase queries del área
    ├── routes.tsx       # Configuración de rutas del área
    ├── types.ts         # Tipos TypeScript específicos del área
    └── constants.ts     # Constantes del área (opcional)
```

## Pasos para Agregar una Nueva Área

### 1. Agregar el Área al Enum

Edita `packages/contracts/src/areas.ts`:

```typescript
export enum AreaId {
  ACREDITACION = 'acreditacion',
  FINANZAS = 'finanzas',
  OPERACIONES = 'operaciones',
  TU_AREA = 'tu-area', // Agregar aquí
}

export const AREAS: Record<AreaId, Area> = {
  // ... áreas existentes
  [AreaId.TU_AREA]: {
    id: AreaId.TU_AREA,
    name: 'tu-area',
    displayName: 'Tu Área',
    icon: 'icon_name',
    description: 'Descripción del área',
  },
};
```

### 2. Agregar Permisos

Edita `apps/web/src/shared/rbac/constants.ts`:

```typescript
export const AREA_PERMISSIONS: Record<AreaId, AreaPermission[]> = {
  // ... permisos existentes
  [AreaId.TU_AREA]: [
    'tu-area:view',
    'tu-area:create',
    'tu-area:edit',
    'tu-area:delete',
    'tu-area:admin',
  ],
};
```

### 3. Crear la Estructura de Carpetas

```bash
mkdir -p apps/web/src/areas/tu-area/{pages,components,services}
```

### 4. Crear el Archivo de Rutas

Crea `apps/web/src/areas/tu-area/routes.tsx`:

```typescript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TuAreaPage from './pages/TuAreaPage';

const TuAreaRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<TuAreaPage />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default TuAreaRoutes;
```

### 5. Crear el Sidebar

Crea `apps/web/src/areas/tu-area/components/Sidebar.tsx`:

```typescript
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@shared/api-client/supabase';
import { AreaId } from '@contracts/areas';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView?: string;
  hideOnDesktop?: boolean;
}

const TuAreaSidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeView, hideOnDesktop = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.TU_AREA}/${path}`;
  };

  return (
    <aside className={/* estilos del sidebar */}>
      {/* Contenido del sidebar */}
    </aside>
  );
};

export default TuAreaSidebar;
```

### 6. Registrar el Área en el Router

Edita `apps/web/src/app/App.tsx`:

```typescript
import TuAreaRoutes from '@areas/tu-area/routes';

// En el componente Routes:
<Route
  path="area/:areaId/*"
  element={
    <AreaGuard>
      <AreaLayout>
        <Routes>
          <Route path={AreaId.ACREDITACION} element={<AcreditacionRoutes />} />
          <Route path={AreaId.TU_AREA} element={<TuAreaRoutes />} />
          {/* ... */}
        </Routes>
      </AreaLayout>
    </AreaGuard>
  }
/>
```

### 7. Registrar el Sidebar en AreaLayout

Edita `apps/web/src/app/layouts/AreaLayout.tsx`:

```typescript
import TuAreaSidebar from '@areas/tu-area/components/Sidebar';

// En renderSidebar():
case AreaId.TU_AREA:
  return (
    <TuAreaSidebar
      isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      activeView={getActiveView()}
      hideOnDesktop={isFilterSidebarOpen}
    />
  );
```

### 8. Configurar Permisos en Supabase

Necesitarás crear/actualizar la tabla `user_areas` en Supabase para asignar permisos a los usuarios.

## Ejemplo Completo: Área de Finanzas

Ver `apps/web/src/areas/finanzas/` para un ejemplo completo de implementación.

## Notas

- Todas las rutas del área deben ser relativas: `requests`, `reports`, etc.
- El router global agrega automáticamente el prefijo `/app/area/:areaId/`
- Usa los hooks `useAreas()` y `usePermissions()` para verificar acceso
- Los servicios deben usar `@shared/api-client/supabase` para el cliente de Supabase











