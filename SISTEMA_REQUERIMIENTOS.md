# Sistema de Requerimientos por Empresa y Proyecto

## 📋 Descripción General

Este sistema automatiza la creación de requerimientos de acreditación para proyectos basándose en los requerimientos estándar de cada empresa cliente.

## 🏗️ Arquitectura del Sistema

### Tablas Involucradas:

1. **`cliente`**: Lista de empresas/clientes
2. **`empresa_requerimiento`**: Requerimientos estándar por empresa
3. **`proyecto_requerimientos_acreditacion`**: Requerimientos específicos de cada proyecto
4. **`solicitud_acreditacion`**: Datos del proyecto y responsables

## 🔄 Flujo de Trabajo

### Paso 1: Configuración Inicial (Una vez)

```sql
-- 1. Crear tabla cliente
-- Ejecutar: sql/create_cliente_table.sql

-- 2. Crear tablas de requerimientos
-- Ejecutar: sql/create_project_requirements_tables.sql

-- 3. Agregar columnas de responsables
-- Ejecutar: sql/add_responsables_columns.sql
```

### Paso 2: Asignar Responsables a un Proyecto

1. Usuario hace clic en un proyecto "Pendiente"
2. Se abre el modal "Asignar Responsables"
3. Usuario selecciona:
   - ✅ Empresa Contratista (ej: "CMP", "CODELCO")
   - ✅ JPRO (Jefe de Proyecto)
   - ✅ EPR (Especialista Prevención)
   - ✅ RRHH (Recursos Humanos)
   - ✅ Legal (Área Legal)
4. Usuario hace clic en "Guardar Responsables"

### Paso 3: Creación Automática de Requerimientos

Cuando se guardan los responsables, el sistema:

```javascript
1. Guarda responsables en solicitud_acreditacion
   ↓
2. Busca requerimientos estándar en empresa_requerimiento
   WHERE empresa = [empresa_seleccionada]
   ↓
3. Por cada requerimiento encontrado:
   Crea registro en proyecto_requerimientos_acreditacion
   {
     cliente: "CMP",
     codigo_proyecto: "PRJ-TEST-2025",
     requerimiento: "Inducción General CMP",
     categoria_requerimiento: "Capacitación",
     responsable: "JPRO",
     nombre_responsable: "Juan Pérez González",
     estado: "Pendiente"
   }
   ↓
4. Asigna nombre_responsable según el rol:
   - Si responsable = "JPRO" → nombre del JPRO asignado
   - Si responsable = "EPR" → nombre del EPR asignado
   - Si responsable = "RRHH" → nombre del RRHH asignado
   - Si responsable = "Legal" → nombre del Legal asignado
```

### Paso 4: Visualización en la Galería

En la vista de proyectos, cada proyecto muestra:

```
┌────────────────────────────────────────┐
│ PRJ-TEST-2025                          │
│ Cliente: CMP                           │
├────────────────────────────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│
│ │ 50%  │  │ 100% │  │  0%  │  │ 50%  ││
│ │ JPRO │  │ EPR  │  │ RRHH │  │LEGAL ││
│ │ 2/4  │  │ 2/2  │  │ 0/1  │  │ 1/2  ││
│ └──────┘  └──────┘  └──────┘  └──────┘│
└────────────────────────────────────────┘
```

### Paso 5: Gestión de Tareas en Vista Detalle

1. Usuario hace clic en proyecto "En Proceso"
2. Se abre la vista de detalle
3. Ve tabla con todos los requerimientos
4. Puede marcar como completado haciendo clic en ○ → ✓
5. Al marcar, se actualiza automáticamente en la base de datos

## 📊 Estructura de Datos

### `empresa_requerimiento`

```sql
empresa                | requerimiento            | categoria      | responsable
----------------------|--------------------------|----------------|------------
CMP                   | Inducción General CMP    | Capacitación   | JPRO
CMP                   | Examen Pre-ocupacional   | Salud          | EPR
CMP                   | Contrato de Trabajo      | Legal          | RRHH
CODELCO               | Inducción CODELCO        | Capacitación   | JPRO
```

### `proyecto_requerimientos_acreditacion`

```sql
cliente | codigo_proyecto | requerimiento           | responsable | nombre_responsable    | estado
--------|-----------------|------------------------|-------------|-----------------------|----------
CMP     | PRJ-TEST-2025   | Inducción General CMP   | JPRO        | Juan Pérez González   | Pendiente
CMP     | PRJ-TEST-2025   | Examen Pre-ocupacional  | EPR         | María López Rojas     | Completado
CMP     | PRJ-TEST-2025   | Contrato de Trabajo     | RRHH        | Pedro Silva Díaz      | Pendiente
```

## 🎨 Código Relevante

### Función Principal: `handleSaveResponsables`

```typescript
1. Guarda responsables → updateResponsablesSolicitud()
2. Busca requerimientos de empresa → fetchEmpresaRequerimientos()
3. Crea requerimientos del proyecto → createProyectoRequerimientos()
4. Recarga datos → onProjectUpdate()
```

### Funciones del Servicio:

- `fetchClientes()` - Obtiene lista de empresas
- `fetchEmpresaRequerimientos(empresa)` - Requerimientos estándar de una empresa
- `createProyectoRequerimientos()` - Crea requerimientos del proyecto
- `fetchProyectoRequerimientos(codigo)` - Obtiene requerimientos de un proyecto
- `updateRequerimientoEstado(id, estado)` - Marca tarea como completada

## 📈 Ejemplo Completo

### Configuración Empresa CMP:

```javascript
empresa_requerimiento:
[
  { empresa: "CMP", requerimiento: "Inducción General CMP", categoria: "Capacitación", responsable: "JPRO" },
  { empresa: "CMP", requerimiento: "Examen Pre-ocupacional", categoria: "Salud", responsable: "EPR" },
  { empresa: "CMP", requerimiento: "Licencia Conducir B", categoria: "Conducción", responsable: "JPRO" },
  { empresa: "CMP", requerimiento: "Curso Altura", categoria: "Capacitación", responsable: "EPR" },
  { empresa: "CMP", requerimiento: "Contrato Trabajo", categoria: "Legal", responsable: "RRHH" },
  { empresa: "CMP", requerimiento: "Cert. Antecedentes", categoria: "Legal", responsable: "Legal" }
]
```

### Al Asignar Responsables:

Usuario selecciona:
- Empresa: CMP
- JPRO: Juan Pérez
- EPR: María López
- RRHH: Pedro Silva
- Legal: Ana Torres

### Se Crean Automáticamente:

```javascript
proyecto_requerimientos_acreditacion:
[
  { cliente: "CMP", codigo_proyecto: "PRJ-001", requerimiento: "Inducción General CMP", 
    responsable: "JPRO", nombre_responsable: "Juan Pérez", estado: "Pendiente" },
  { cliente: "CMP", codigo_proyecto: "PRJ-001", requerimiento: "Examen Pre-ocupacional", 
    responsable: "EPR", nombre_responsable: "María López", estado: "Pendiente" },
  { cliente: "CMP", codigo_proyecto: "PRJ-001", requerimiento: "Licencia Conducir B", 
    responsable: "JPRO", nombre_responsable: "Juan Pérez", estado: "Pendiente" },
  { cliente: "CMP", codigo_proyecto: "PRJ-001", requerimiento: "Curso Altura", 
    responsable: "EPR", nombre_responsable: "María López", estado: "Pendiente" },
  { cliente: "CMP", codigo_proyecto: "PRJ-001", requerimiento: "Contrato Trabajo", 
    responsable: "RRHH", nombre_responsable: "Pedro Silva", estado: "Pendiente" },
  { cliente: "CMP", codigo_proyecto: "PRJ-001", requerimiento: "Cert. Antecedentes", 
    responsable: "Legal", nombre_responsable: "Ana Torres", estado: "Pendiente" }
]
```

### Resultado en la Galería:

```
JPRO: 0/2 (0%) - Pendientes: Inducción, Licencia
EPR:  0/2 (0%) - Pendientes: Examen, Curso Altura
RRHH: 0/1 (0%) - Pendiente: Contrato
Legal: 0/1 (0%) - Pendiente: Certificado
```

## 🔧 Mantenimiento

### Agregar Requerimientos para una Nueva Empresa:

```sql
INSERT INTO empresa_requerimiento (empresa, requerimiento, categoria_requerimiento, responsable, orden) VALUES
  ('NUEVA_EMPRESA', 'Requerimiento 1', 'Categoría', 'JPRO', 1),
  ('NUEVA_EMPRESA', 'Requerimiento 2', 'Categoría', 'EPR', 2);
```

### Modificar Requerimientos Existentes:

```sql
UPDATE empresa_requerimiento 
SET requerimiento = 'Nuevo nombre del requerimiento'
WHERE id = 123;
```

## 🚀 Ventajas del Sistema

✅ **Automatización**: Crea tareas automáticamente  
✅ **Estandarización**: Mismos requerimientos para la misma empresa  
✅ **Trazabilidad**: Historial completo de estados  
✅ **Asignación Clara**: Cada tarea tiene responsable específico  
✅ **Progreso Visual**: Anillos de progreso por responsable  
✅ **Flexibilidad**: Fácil agregar nuevas empresas/requerimientos  

## 📞 Troubleshooting

### "No se crean requerimientos al guardar"

1. Verifica que la tabla `empresa_requerimiento` existe
2. Verifica que hay registros para la empresa seleccionada:
   ```sql
   SELECT * FROM empresa_requerimiento WHERE empresa = 'CMP';
   ```
3. Revisa la consola del navegador (F12) para ver logs

### "Los requerimientos no aparecen en la vista"

1. Verifica que `proyecto_requerimientos_acreditacion` tiene registros:
   ```sql
   SELECT * FROM proyecto_requerimientos_acreditacion 
   WHERE codigo_proyecto = 'PRJ-TEST-2025';
   ```
2. Recarga la página

### "No puedo marcar como completado"

1. Verifica permisos de escritura en Supabase
2. Revisa logs en consola del navegador
3. Verifica que el ID del requerimiento es válido

## 📚 Empresas Incluidas por Defecto

El script SQL incluye datos de ejemplo para:

- CMP (6 requerimientos)
- CODELCO (6 requerimientos)
- ENAMI (4 requerimientos)
- HMC S.A (4 requerimientos)
- KINROSS (5 requerimientos)
- LAS CENIZAS (3 requerimientos)
- MLP (5 requerimientos)

¡Total: 33 requerimientos estándar precargados!

