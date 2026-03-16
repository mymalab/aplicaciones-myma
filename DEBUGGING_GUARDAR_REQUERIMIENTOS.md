# 🔍 GUÍA DE DEBUGGING: Guardar Requerimientos No Funciona

## 🎯 Problema
El botón "Guardar Responsables" no está guardando nada en `proyecto_requerimientos_acreditacion`

## 📝 Cambios Implementados

### 1. **Logging Extensivo** ✅
He agregado logs detallados en `services/supabaseService.ts` función `createProyectoRequerimientos`:

- ✅ Log de inicio con todos los parámetros recibidos
- ✅ Verificación de requerimientos existentes
- ✅ Log de búsqueda de `solicitud_acreditacion`
- ✅ Log de búsqueda de trabajadores en `proyecto_trabajadores`
- ✅ Log detallado de construcción de cada requerimiento
- ✅ Log del INSERT con respuesta completa de Supabase
- ✅ Log de errores con detalles completos

### 2. **Error Handling Mejorado** ✅
En `components/ProjectGalleryV2.tsx`:
- ✅ Ahora muestra alerta si falla el guardado de requerimientos
- ✅ Logs más detallados en consola

## 🧪 PASOS DE DEBUGGING (ORDEN DE EJECUCIÓN)

### **PASO 1: Abrir Consola del Navegador** 🖥️
1. Presiona `F12` en Chrome/Edge
2. Ve a la pestaña "Console"
3. Limpia la consola (botón 🚫 o Ctrl+L)

### **PASO 2: Reproducir el Error** 🔄
1. En la aplicación, selecciona proyecto "MYMA-18"
2. Click en "Asignar responsables"
3. Selecciona una empresa (ej: CODELCO)
4. Asigna al menos un responsable
5. Click en "Guardar Responsables"
6. **OBSERVA LA CONSOLA**

### **PASO 3: Analizar los Logs** 📊

Busca estos mensajes en la consola:

```
═══════════════════════════════════════════════════
🚀 INICIO: createProyectoRequerimientos
═══════════════════════════════════════════════════
```

**3.1 Verificar Datos de Entrada:**
- ¿Dice cuántos "Empresa Requerimientos recibidos"?
- Si dice 0, el problema es que no se están pasando los requerimientos

**3.2 Verificar Requerimientos Existentes:**
```
📊 Requerimientos existentes: X
```
- Si dice > 0, significa que YA HAY requerimientos guardados
- Si es así, el sistema sale sin crear nuevos (para evitar duplicados)

**3.3 Verificar ID del Proyecto:**
```
✅ ID Proyecto encontrado: X
```
- Si dice "Error", el proyecto no existe en la BD

**3.4 Verificar Trabajadores:**
```
✅ Trabajadores encontrados: X
```
- Si dice 0 y hay requerimientos de categoría "Trabajadores", no se crearán registros

**3.5 Verificar Construcción de Registros:**
```
📦 TOTAL DE REGISTROS A INSERTAR: X
```
- Si dice 0, algo falló en la construcción
- Si dice > 0, los registros se construyeron OK

**3.6 Verificar INSERT:**
```
💾 INSERTANDO EN BASE DE DATOS...
```
- Si ves "❌ ERROR EN INSERT", copia el mensaje de error completo
- Si ves "✅ INSERT EXITOSO", ¡funcionó!

### **PASO 4: Problemas Comunes y Soluciones** 🔧

#### **Problema A: "Ya existen requerimientos"**
```
⚠️ Ya existen requerimientos para este proyecto
```
**Solución:** Los requerimientos ya fueron creados antes. Si quieres recrearlos:

```sql
-- Eliminar requerimientos del proyecto en Supabase
DELETE FROM proyecto_requerimientos_acreditacion 
WHERE codigo_proyecto = 'MYMA-18';
```

#### **Problema B: "Error de UNIQUE constraint"**
```
❌ ERROR EN INSERT
... duplicate key value violates unique constraint ...
```
**Solución:** Ejecuta el script:
```
sql/URGENTE_actualizar_constraint.sql
```

#### **Problema C: "No se encontró el proyecto"**
```
❌ Error obteniendo solicitud
```
**Solución:** Verifica que el proyecto existe:

```sql
SELECT id, codigo_proyecto 
FROM solicitud_acreditacion 
WHERE codigo_proyecto = 'MYMA-18';
```

#### **Problema D: "0 Empresa Requerimientos recibidos"**
```
❌ NO HAY REQUERIMIENTOS PARA GUARDAR
```
**Causa:** No se seleccionó empresa o la empresa no tiene requerimientos definidos

**Solución:**
1. Verifica que seleccionaste una empresa en el modal
2. Verifica que hay requerimientos para esa empresa:

```sql
SELECT * FROM empresa_requerimiento 
WHERE empresa = 'CODELCO';  -- Cambia por tu empresa
```

#### **Problema E: "No hay trabajadores"**
```
✅ Trabajadores encontrados: 0
```
**Causa:** No hay trabajadores guardados en `proyecto_trabajadores`

**Solución:**
- Los trabajadores se guardan al crear la solicitud
- Verifica:

```sql
SELECT * FROM proyecto_trabajadores 
WHERE codigo_proyecto = 'MYMA-18';
```

### **PASO 5: Test Manual en Base de Datos** 🧪

Ejecuta en Supabase SQL Editor:
```
sql/TEST_insertar_requerimiento_manual.sql
```

Este script:
1. Muestra la estructura de la tabla
2. Muestra los constraints
3. Intenta insertar un registro de prueba
4. Verifica el resultado
5. Limpia el registro de prueba

Si el INSERT manual falla, el problema está en la BD (estructura, constraints, permisos).

## 📋 Checklist de Verificación

- [ ] Abriste la consola del navegador (F12)
- [ ] Limpiaste la consola antes de probar
- [ ] Ejecutaste "Guardar Responsables"
- [ ] Viste los logs en consola
- [ ] Identificaste en qué paso falla (ver PASO 3)
- [ ] Aplicaste la solución correspondiente
- [ ] Volviste a probar

## 🆘 Si Nada Funciona

Envíame:
1. **Captura de todos los logs** de la consola (desde "🚀 INICIO" hasta "═══════")
2. **Resultado de estos SQLs:**
```sql
-- 1. Estructura de la tabla
\d proyecto_requerimientos_acreditacion

-- 2. Constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'proyecto_requerimientos_acreditacion'::regclass;

-- 3. Requerimientos existentes
SELECT COUNT(*) FROM proyecto_requerimientos_acreditacion 
WHERE codigo_proyecto = 'MYMA-18';

-- 4. Trabajadores
SELECT COUNT(*) FROM proyecto_trabajadores 
WHERE codigo_proyecto = 'MYMA-18';

-- 5. Requerimientos de empresa
SELECT COUNT(*) FROM empresa_requerimiento 
WHERE empresa = 'CODELCO';  -- Tu empresa
```

## 🎯 Próximos Pasos

Una vez identifiques el problema específico, podré ayudarte con la solución exacta.

