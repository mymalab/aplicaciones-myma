# 📋 Instrucciones para Corregir Requerimientos de Trabajadores

## 🎯 Problema Solucionado

Anteriormente, los requerimientos de categoría "Trabajadores" se guardaban con el nombre del trabajador concatenado:
- ❌ **Antes**: `"Anexo de vinculación a contrato - Biana Adones"`
- ✅ **Ahora**: `"Anexo de vinculación a contrato"` (nombre en columna separada)

---

## 📝 Pasos a Seguir (en orden)

### 1️⃣ Limpiar Datos Existentes
**Archivo**: `sql/limpiar_requerimientos_existentes.sql`

Este script:
- ✅ Muestra los requerimientos que tienen el nombre concatenado
- ✅ Elimina el sufijo " - Nombre Trabajador"
- ✅ Mantiene el nombre en la columna `nombre_trabajador`

```sql
-- Ejecutar en Supabase SQL Editor
-- Revisa primero los datos con PASO 1, luego ejecuta PASO 2
```

### 2️⃣ Actualizar Constraint UNIQUE
**Archivo**: `sql/actualizar_constraint_requerimientos.sql`

Este script:
- ✅ Elimina el constraint antiguo `(codigo_proyecto, requerimiento)`
- ✅ Crea nuevo constraint `(codigo_proyecto, requerimiento, id_proyecto_trabajador)`
- ✅ Permite que el mismo requerimiento exista para diferentes trabajadores

```sql
-- Ejecutar en Supabase SQL Editor
```

### 3️⃣ Verificar Columnas
**Archivo**: `sql/agregar_columnas_trabajadores_requerimientos.sql`

Este script ya debería estar ejecutado, pero verifica que las columnas existan:
- ✅ `nombre_trabajador` (TEXT)
- ✅ `categoria_empresa` (TEXT)
- ✅ `id_proyecto_trabajador` (BIGINT o TEXT)

---

## 🔍 Verificación Final

Ejecuta este SQL para verificar que todo está correcto:

```sql
-- Ver requerimientos de trabajadores con la estructura correcta
SELECT 
  id,
  codigo_proyecto,
  requerimiento,                    -- ✅ Sin nombre del trabajador
  nombre_trabajador,                -- ✅ Nombre en columna separada
  categoria_empresa,                -- ✅ MyMA o Contratista
  id_proyecto_trabajador,           -- ✅ ID del trabajador
  categoria_requerimiento,
  responsable,
  nombre_responsable
FROM proyecto_requerimientos_acreditacion
WHERE categoria_requerimiento ILIKE '%trabajador%'
ORDER BY codigo_proyecto, requerimiento, nombre_trabajador
LIMIT 20;
```

**Resultado Esperado**:
```
requerimiento               | nombre_trabajador     | categoria_empresa
---------------------------|-----------------------|------------------
Anexo de vinculación       | Biana Adones         | MyMA
Anexo de vinculación       | Carlos Pérez         | Contratista
Examen de altura           | Biana Adones         | MyMA
Examen de altura           | Carlos Pérez         | Contratista
```

---

## ✅ Próximos Guardados

Después de estos cambios, cuando guardes nuevos responsables:

1. **Requerimientos NO de categoría "Trabajadores"**:
   - Se guarda 1 registro
   - `nombre_trabajador` = NULL

2. **Requerimientos de categoría "Trabajadores"**:
   - Se guardan N registros (1 por trabajador)
   - `requerimiento` = Solo el nombre del requerimiento
   - `nombre_trabajador` = Nombre del trabajador específico
   - `categoria_empresa` = MyMA o Contratista
   - `id_proyecto_trabajador` = ID del trabajador

---

## 🎯 Resumen

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Requerimiento | "Examen - Juan Pérez" | "Examen" |
| Nombre Trabajador | NULL o parte del texto | "Juan Pérez" (columna) |
| Constraint UNIQUE | (codigo, requerimiento) | (codigo, requerimiento, trabajador) |
| Registros por trabajador | 1 concatenado | 1 separado por trabajador |

---

## 🚨 Importante

- Ejecuta los scripts en **orden**
- Revisa los resultados antes de confirmar cambios
- Haz backup si tienes datos importantes
- El código TypeScript ya está actualizado ✅

