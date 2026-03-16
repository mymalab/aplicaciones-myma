# 🔧 Solución: Error al Guardar Responsables

## ❌ Error Encontrado

```
Error al guardar los responsables
Por favor, intente nuevamente o contacte al administrador.
```

## 🔍 Diagnóstico

Este error ocurre porque **las columnas de responsables no existen en la tabla `solicitud_acreditacion`** de Supabase.

## ✅ Solución Paso a Paso

### **Paso 1: Verificar el Estado Actual** 🔍

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Copia y pega el script: `sql/diagnostico_tablas.sql`
4. Haz clic en **Run**
5. Revisa los resultados

### **Paso 2: Ejecutar Scripts Necesarios** 📝

Ejecuta los siguientes scripts **EN ORDEN**:

#### **A. Crear Tabla de Clientes** (si no existe)

```sql
-- Archivo: sql/create_cliente_table.sql
-- Copia TODO el contenido y ejecuta en Supabase SQL Editor
```

Esto creará:
- ✅ Tabla `cliente`
- ✅ 10 empresas de ejemplo

#### **B. Agregar Columnas de Responsables** (OBLIGATORIO)

```sql
-- Archivo: sql/add_responsables_columns.sql
-- Copia TODO el contenido y ejecuta en Supabase SQL Editor
```

Esto agregará las columnas:
- ✅ empresa_id, empresa_nombre
- ✅ jpro_id, jpro_nombre
- ✅ epr_id, epr_nombre
- ✅ rrhh_id, rrhh_nombre
- ✅ legal_id, legal_nombre

#### **C. Crear Tablas de Requerimientos** (OPCIONAL pero recomendado)

```sql
-- Archivo: sql/create_project_requirements_tables.sql
-- Copia TODO el contenido y ejecuta en Supabase SQL Editor
```

Esto creará:
- ✅ Tabla `empresa_requerimiento`
- ✅ Tabla `proyecto_requerimientos_acreditacion`
- ✅ 33 requerimientos estándar para 7 empresas

### **Paso 3: Verificar la Solución** ✔️

Después de ejecutar los scripts:

1. **Recarga la aplicación** (F5 en el navegador)
2. **Abre la consola** (F12 → pestaña Console)
3. **Intenta guardar responsables nuevamente**
4. **Deberías ver logs como:**

```
💾 Guardando responsables...
✅ Responsables guardados exitosamente en la base de datos
🏢 Intentando crear requerimientos para empresa: CMP
📋 Encontrados 6 requerimientos estándar
✅ Requerimientos del proyecto creados automáticamente
✅ Responsables guardados exitosamente
```

5. **Si ves el mensaje de éxito** → ¡Todo funcionó! 🎉

## 🐛 Si Aún Tienes Errores

### Error: "relation does not exist"

**Causa:** La tabla no existe  
**Solución:** Ejecuta el script correspondiente

### Error: "column does not exist"

**Causa:** Faltan columnas en la tabla  
**Solución:** Ejecuta `sql/add_responsables_columns.sql`

### Error: "permission denied"

**Causa:** No tienes permisos de escritura  
**Solución:** 
1. Ve a Supabase Dashboard → Authentication → Policies
2. Asegúrate de tener permisos de INSERT/UPDATE en `solicitud_acreditacion`

### Error: "duplicate key value"

**Causa:** Intentando crear requerimientos que ya existen  
**Solución:** 
```sql
-- Eliminar requerimientos duplicados
DELETE FROM proyecto_requerimientos_acreditacion 
WHERE codigo_proyecto = 'TU_CODIGO_PROYECTO';
```

## 📋 Checklist de Verificación

Antes de guardar responsables, verifica que:

- [ ] Ejecutaste `sql/add_responsables_columns.sql` en Supabase
- [ ] Recargaste la aplicación (F5)
- [ ] Abriste la consola del navegador (F12)
- [ ] Seleccionaste al menos una empresa
- [ ] Asignaste al menos un responsable

## 🔄 Orden de Ejecución de Scripts

```
1️⃣ sql/create_cliente_table.sql
   ↓
2️⃣ sql/add_responsables_columns.sql (OBLIGATORIO)
   ↓
3️⃣ sql/create_project_requirements_tables.sql
   ↓
4️⃣ Recargar aplicación (F5)
   ↓
5️⃣ Probar guardar responsables
```

## 💡 Mejora Implementada

El código ahora es más robusto:

✅ **Antes:** Si fallaba crear requerimientos → todo fallaba  
✅ **Ahora:** Si falla crear requerimientos → responsables se guardan igual

Esto significa que **incluso si no ejecutas los scripts de requerimientos, podrás guardar responsables sin problemas**.

## 📞 Soporte

Si después de seguir todos los pasos aún tienes problemas:

1. **Copia los logs de la consola** (F12 → Console → Clic derecho → Save as...)
2. **Toma screenshot del error de Supabase SQL Editor** (si hay)
3. **Ejecuta el diagnóstico:**
   ```sql
   -- sql/diagnostico_tablas.sql
   ```
4. **Comparte los resultados**

## 🎯 Resultado Esperado

Después de ejecutar los scripts correctamente, cuando guardes responsables verás:

```
✅ Responsables guardados exitosamente

Proyecto: PRJ-TEST-2025
Empresa: CMP
JPRO: Juan Pérez González
EPR: María López Rojas
RRHH: Pedro Silva Díaz
Legal: Ana Torres Muñoz
```

Y en la galería verás las tarjetas de progreso por responsable.

## 🚀 Acción Inmediata

**Ejecuta AHORA este script en Supabase:**

```sql
-- COPIA ESTO Y EJECUTA EN SUPABASE SQL EDITOR:

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

-- Verificar que se crearon
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name LIKE '%responsable%' OR column_name LIKE '%empresa%'
ORDER BY column_name;
```

**Después de ejecutar, recarga la app (F5) y prueba nuevamente.**

