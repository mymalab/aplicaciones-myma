# 📊 DIAGRAMA DE FLUJO - CÓMO FUNCIONA EL SISTEMA

## 🔄 Flujo Completo de Guardado

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuario hace clic en proyecto "Pendiente"                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Se abre modal "Asignar Responsables"                        │
│     - Selecciona empresa: CMP                                   │
│     - Selecciona JPRO: Alan Flores                              │
│     - Selecciona EPR: Carolina Pacheco Vega                     │
│     - Selecciona RRHH: Camila Pérez Becerra                     │
│     - Selecciona Legal: Beatriz Rubilar Contreras               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Usuario hace clic en "Guardar Responsables"                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Código prepara los datos:                                   │
│     {                                                            │
│       empresa_id: "1",                                           │
│       empresa_nombre: "CMP",                                     │
│       jpro_id: 23,                                               │
│       jpro_nombre: "Alan Flores",                                │
│       epr_id: 79,                                                │
│       epr_nombre: "Carolina Pacheco Vega",                       │
│       ...                                                        │
│     }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Intenta guardar en tabla: solicitud_acreditacion           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
        ❌ CASO 1: FALLA          ✅ CASO 2: ÉXITO
    (Columnas no existen)      (Columnas existen)
                    │               │
                    ↓               ↓
    ┌───────────────────────┐   ┌───────────────────────┐
    │ ERROR 400             │   │ Responsables guardados│
    │ "column does not      │   │ en solicitud_         │
    │  exist"               │   │ acreditacion          │
    │                       │   └───────────────────────┘
    │ ⚠️ SOLUCIÓN:          │               ↓
    │ Ejecutar PASO 2       │   ┌───────────────────────┐
    │ (agregar columnas)    │   │ 6. Busca empresa_     │
    └───────────────────────┘   │    requerimiento      │
                                │    WHERE empresa =    │
                                │    'CMP'              │
                                └───────────────────────┘
                                            ↓
                                    ┌───────┴────────┐
                                    │                │
                        Tabla existe         Tabla NO existe
                        y tiene datos        (o está vacía)
                                    │                │
                                    ↓                ↓
            ┌───────────────────────┐    ┌───────────────────────┐
            │ 7. Crea requerimientos│    │ 7. Usa tareas         │
            │    en proyecto_       │    │    generadas por      │
            │    requerimientos_    │    │    defecto            │
            │    acreditacion       │    │                       │
            │                       │    │ ⚠️ FUNCIONA IGUAL,    │
            │ Ejemplo:              │    │ solo que menos        │
            │ - CMP, PRJ-001,       │    │ personalizado         │
            │   "Inducción CMP",    │    └───────────────────────┘
            │   JPRO, "Alan Flores",│                │
            │   Pendiente           │                │
            │ - CMP, PRJ-001,       │                │
            │   "Examen Médico",    │                │
            │   EPR, "Carolina...", │                │
            │   Pendiente           │                │
            └───────────────────────┘                │
                        │                            │
                        └────────────┬───────────────┘
                                     ↓
                    ┌────────────────────────────────┐
                    │ 8. Actualiza estado proyecto  │
                    │    a "En proceso"             │
                    └────────────────────────────────┘
                                     ↓
                    ┌────────────────────────────────┐
                    │ 9. Muestra mensaje de éxito   │
                    │                                │
                    │ ✅ Responsables guardados      │
                    │    exitosamente                │
                    │                                │
                    │ Proyecto: Proyecto 1           │
                    │ Empresa: CMP                   │
                    │ JPRO: Alan Flores              │
                    │ EPR: Carolina Pacheco Vega     │
                    │ RRHH: Camila Pérez Becerra     │
                    │ Legal: Beatriz Rubilar...      │
                    └────────────────────────────────┘
                                     ↓
                    ┌────────────────────────────────┐
                    │ 10. Recarga lista de proyectos│
                    │     Ahora muestra:             │
                    │                                │
                    │ ┌──────┐ ┌──────┐ ┌──────┐    │
                    │ │  0%  │ │  0%  │ │  0%  │    │
                    │ │ JPRO │ │ EPR  │ │ RRHH │    │
                    │ │ 0/6  │ │ 0/4  │ │ 0/2  │    │
                    │ └──────┘ └──────┘ └──────┘    │
                    └────────────────────────────────┘
```

---

## 🎯 PROBLEMA ACTUAL

Estás en el **CASO 1: FALLA** ❌

```
Tu error:
Failed to load resource: the server responded with a status of 400
```

**Causa:**
La tabla `solicitud_acreditacion` no tiene estas columnas:
- ❌ `empresa_id`
- ❌ `empresa_nombre`
- ❌ `jpro_id`
- ❌ `jpro_nombre`
- ❌ `epr_id`
- ❌ `epr_nombre`
- ❌ `rrhh_id`
- ❌ `rrhh_nombre`
- ❌ `legal_id`
- ❌ `legal_nombre`

---

## ✅ SOLUCIÓN

### 1. Ejecuta en Supabase SQL Editor:

```sql
ALTER TABLE solicitud_acreditacion 
  ADD COLUMN IF NOT EXISTS empresa_id TEXT,
  ADD COLUMN IF NOT EXISTS empresa_nombre TEXT,
  ADD COLUMN IF NOT EXISTS jpro_id INTEGER,
  ADD COLUMN IF NOT EXISTS jpro_nombre TEXT,
  ADD COLUMN IF NOT EXISTS epr_id INTEGER,
  ADD COLUMN IF NOT EXISTS epr_nombre TEXT,
  ADD COLUMN IF NOT EXISTS rrhh_id INTEGER,
  ADD COLUMN IF NOT EXISTS rrhh_nombre TEXT,
  ADD COLUMN IF NOT EXISTS legal_id INTEGER,
  ADD COLUMN IF NOT EXISTS legal_nombre TEXT;
```

### 2. Recarga la app (F5)

### 3. Intenta guardar de nuevo

### 4. Ahora irás por el **CASO 2: ÉXITO** ✅

---

## 📊 TABLAS INVOLUCRADAS

### 1. `solicitud_acreditacion` 
**Propósito:** Guarda proyectos y responsables asignados

**Columnas que necesita:**
```sql
CREATE TABLE solicitud_acreditacion (
  id SERIAL PRIMARY KEY,
  codigo_proyecto TEXT,
  cliente TEXT,
  estado_solicitud_acreditacion TEXT,
  
  -- ⚠️ ESTAS FALTAN (por agregar):
  empresa_id TEXT,
  empresa_nombre TEXT,
  jpro_id INTEGER,
  jpro_nombre TEXT,
  epr_id INTEGER,
  epr_nombre TEXT,
  rrhh_id INTEGER,
  rrhh_nombre TEXT,
  legal_id INTEGER,
  legal_nombre TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 2. `empresa_requerimiento` (OPCIONAL)
**Propósito:** Define requerimientos estándar por empresa

```sql
CREATE TABLE empresa_requerimiento (
  id SERIAL PRIMARY KEY,
  empresa TEXT,                    -- "CMP", "CODELCO", etc.
  requerimiento TEXT,              -- "Inducción CMP"
  categoria_requerimiento TEXT,    -- "Capacitación"
  responsable TEXT                 -- "JPRO", "EPR", etc.
);
```

**Ejemplo de datos:**
```
| empresa | requerimiento        | categoria    | responsable |
|---------|---------------------|--------------|-------------|
| CMP     | Inducción CMP       | Capacitación | JPRO        |
| CMP     | Examen Médico       | Salud        | EPR         |
| CMP     | Contrato Trabajo    | Legal        | RRHH        |
```

### 3. `proyecto_requerimientos_acreditacion` (YA EXISTE ✅)
**Propósito:** Guarda tareas específicas de cada proyecto

```sql
CREATE TABLE proyecto_requerimientos_acreditacion (
  id BIGINT PRIMARY KEY,
  codigo_proyecto TEXT,        -- "PRJ-001"
  cliente TEXT,                -- "CMP"
  requerimiento TEXT,          -- "Inducción CMP"
  categoria_requerimiento TEXT,-- "Capacitación"
  responsable TEXT,            -- "JPRO"
  nombre_responsable TEXT,     -- "Alan Flores"
  estado TEXT,                 -- "Pendiente"
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Ejemplo de datos (después de guardar):**
```
| codigo_proyecto | cliente | requerimiento    | responsable | nombre_responsable    | estado    |
|----------------|---------|------------------|-------------|-----------------------|-----------|
| PRJ-001        | CMP     | Inducción CMP    | JPRO        | Alan Flores           | Pendiente |
| PRJ-001        | CMP     | Examen Médico    | EPR         | Carolina Pacheco Vega | Pendiente |
| PRJ-001        | CMP     | Contrato Trabajo | RRHH        | Camila Pérez Becerra  | Pendiente |
```

---

## 🔄 RELACIÓN ENTRE TABLAS

```
solicitud_acreditacion (Proyecto)
├── Guarda: proyecto + responsables asignados
└── Alan Flores es JPRO de PRJ-001
    Carolina Pacheco Vega es EPR de PRJ-001
    
        ↓ (al guardar, si existe empresa_requerimiento)
        
empresa_requerimiento (Plantilla)
├── Requerimientos estándar de CMP
└── "Inducción CMP" debe ser hecha por JPRO
    "Examen Médico" debe ser hecho por EPR
    
        ↓ (crea tareas combinando ambos)
        
proyecto_requerimientos_acreditacion (Tareas)
├── Tareas específicas de PRJ-001
└── "Inducción CMP" - JPRO: Alan Flores - Pendiente
    "Examen Médico" - EPR: Carolina Pacheco Vega - Pendiente
```

---

## ⚡ RESUMEN EJECUTIVO

1. **Ejecuta PASO 2** → Agregar 10 columnas a `solicitud_acreditacion`
2. **Recarga app (F5)**
3. **Guarda responsables** → ¡Debería funcionar!
4. **(Opcional) Ejecuta PASO 3** → Para requerimientos personalizados por empresa

**Sin PASO 2:** Error 400 ❌  
**Con PASO 2:** Funciona ✅  
**Con PASO 2 + PASO 3:** Funciona + requerimientos automáticos personalizados 🎯

