# 🧪 Guía de Prueba Rápida - Guardar Responsables

## ⚡ Acción Inmediata (5 minutos)

### **Paso 1: Ejecutar Scripts SQL** 📝

Abre **Supabase Dashboard** → **SQL Editor** y ejecuta estos scripts EN ORDEN:

#### **Script A: Agregar Columnas de Responsables** (OBLIGATORIO) ⭐

```sql
-- COPIA Y PEGA ESTO EN SUPABASE SQL EDITOR:

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

-- Verificar que se crearon:
SELECT 'Columnas creadas:' as mensaje;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND (column_name LIKE '%jpro%' OR column_name LIKE '%epr%' OR column_name LIKE '%rrhh%' OR column_name LIKE '%legal%' OR column_name LIKE '%empresa%')
ORDER BY column_name;
```

**✅ Resultado esperado:** Deberías ver 10 columnas listadas

#### **Script B: Crear Tabla de Clientes** (OPCIONAL)

```sql
-- Si no tienes tabla cliente, ejecuta esto:
-- Contenido completo en: sql/create_cliente_table.sql
```

#### **Script C: Crear Tabla de Requerimientos** (OPCIONAL)

```sql
-- Si quieres requerimientos automáticos por empresa, ejecuta:
-- Contenido completo en: sql/create_project_requirements_tables.sql
```

### **Paso 2: Recargar Aplicación** 🔄

```
Presiona F5 en el navegador
```

### **Paso 3: Prueba Manual** 🧪

1. **Abre la consola del navegador** (F12 → Console)

2. **Ve a "Gestión de Solicitudes de Acreditación"**

3. **Haz clic en un proyecto "Pendiente"**

4. **En el modal:**
   - Selecciona una empresa (puede estar vacío por ahora)
   - Selecciona al menos un responsable (ej: JPRO)
   - Haz clic en "Guardar Responsables"

5. **Verifica los logs en consola:**

```
LOGS ESPERADOS:
💾 Guardando responsables...
🔄 Actualizando responsables para solicitud ID: X
📝 Responsables recibidos: {...}
📦 Datos a guardar: {...}
✅ Responsables actualizados exitosamente
```

6. **Si ves el mensaje de éxito:**

```
✅ Responsables guardados exitosamente

Proyecto: PRJ-TEST-2025
JPRO: [Nombre seleccionado]
```

**¡FUNCIONA!** 🎉

### **Paso 4: Verificar en Supabase** 📊

```sql
-- Verifica que se guardaron los datos:
SELECT 
  codigo_proyecto,
  empresa_nombre,
  jpro_nombre,
  epr_nombre,
  rrhh_nombre,
  legal_nombre,
  estado_solicitud_acreditacion
FROM solicitud_acreditacion
WHERE jpro_nombre IS NOT NULL OR epr_nombre IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

## 🐛 Si Aún Falla

### **Caso 1: Error "column does not exist"**

**Causa:** No ejecutaste el Script A  
**Solución:** Ejecuta el Script A y recarga (F5)

### **Caso 2: Error "table cliente does not exist"**

**Causa:** No existe tabla cliente  
**Solución:** 
- Opción 1: Ejecuta `sql/create_cliente_table.sql`
- Opción 2: No selecciones empresa (deja vacío), solo selecciona responsables

### **Caso 3: Error "permission denied"**

**Causa:** No tienes permisos  
**Solución:** 
- Ve a Supabase → Authentication → Policies
- Habilita INSERT/UPDATE en `solicitud_acreditacion`

### **Caso 4: Se guarda pero no se ven los cambios**

**Causa:** No se está recargando la lista  
**Solución:** Recarga la página (F5) manualmente

## 🧪 Prueba Automática

En la consola del navegador, ejecuta:

```javascript
testSupabase()
```

Esto ejecutará pruebas automáticas y te dirá exactamente qué está fallando.

## ✅ Checklist Final

Antes de probar, asegúrate de:

- [ ] Ejecuté el Script A en Supabase (columnas de responsables)
- [ ] Vi que se crearon 10 columnas
- [ ] Recargué la aplicación (F5)
- [ ] Abrí la consola del navegador (F12)
- [ ] Estoy viendo los logs en tiempo real

## 📸 Evidencia de Éxito

Si todo funciona, verás en la galería de proyectos:

```
┌─────────────────────────────────────────┐
│ PRJ-TEST-2025                           │
│ Cliente: CMP                            │
├─────────────────────────────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│
│ │  0%  │  │  0%  │  │  0%  │  │  0%  ││
│ │ JPRO │  │ EPR  │  │ RRHH │  │LEGAL ││
│ │ 0/2  │  │ 0/2  │  │ 0/1  │  │ 0/1  ││
│ └──────┘  └──────┘  └──────┘  └──────┘│
└─────────────────────────────────────────┘
```

## 🎯 Qué Hace el Código Ahora

1. **Guarda responsables** en `solicitud_acreditacion` ✅
2. **Intenta cargar requerimientos** de `empresa_requerimiento` 
3. **Si encuentra requerimientos**, los crea en `proyecto_requerimientos_acreditacion`
4. **Si falla**, continúa sin error y usa tareas por defecto
5. **Actualiza la vista** automáticamente

## 💡 Modo Simplificado

Si solo quieres guardar responsables SIN requerimientos automáticos:

1. **Solo ejecuta Script A** (columnas responsables)
2. **NO ejecutes Script B ni C**
3. **Guarda responsables** normalmente
4. **Los anillos de progreso** usarán tareas por defecto

¡Esto funciona perfectamente sin necesidad de configurar todas las tablas!

## 📞 Siguiente Paso

**Ejecuta el Script A AHORA y dime el resultado.** 

¿Viste las 10 columnas creadas? 
- Sí → Perfecto, recarga y prueba
- No → Copia el error de Supabase y lo revisamos

