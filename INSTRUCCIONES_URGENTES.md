# 🚨 INSTRUCCIONES URGENTES - SOLUCIONAR ERROR 400

## ❌ Problema Actual

```
Failed to load resource: the server responded with a status of 400
```

**Causa:** Las columnas `jpro_id`, `jpro_nombre`, `epr_id`, `epr_nombre`, `rrhh_id`, `rrhh_nombre`, `legal_id`, `legal_nombre`, `empresa_id`, `empresa_nombre` **NO EXISTEN** en la tabla `solicitud_acreditacion` de Supabase.

## ✅ Solución (5 minutos)

### **📍 PASO 1: Abrir Supabase**

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Click en **SQL Editor** (ícono de base de datos en el menú izquierdo)
4. Click en **+ New query**

### **📍 PASO 2: Copiar y Pegar Script**

Abre el archivo: **`sql/EJECUTAR_ESTO_AHORA.sql`**

Copia **TODO** el contenido y pégalo en el SQL Editor de Supabase.

### **📍 PASO 3: Ejecutar Script**

1. Click en el botón **RUN** (o presiona Ctrl+Enter / Cmd+Enter)
2. Espera a que termine (debería tomar 1-2 segundos)

### **📍 PASO 4: Verificar Resultado**

Deberías ver en los resultados:

```
✅ Columnas creadas exitosamente
total_columnas: 10
```

Y una lista con estas columnas:

```
empresa_id       | text
empresa_nombre   | text
epr_id          | integer
epr_nombre      | text
jpro_id         | integer
jpro_nombre     | text
legal_id        | integer
legal_nombre    | text
rrhh_id         | integer
rrhh_nombre     | text
```

### **📍 PASO 5: Recargar Aplicación**

1. Vuelve a tu aplicación en el navegador
2. Presiona **F5** para recargar
3. Intenta guardar responsables de nuevo
4. **¡Debería funcionar!** ✅

---

## 🧪 Verificación Rápida

Si quieres verificar ANTES de ejecutar el script:

**Ejecuta esto en Supabase SQL Editor:**

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN ('jpro_id', 'jpro_nombre', 'epr_id', 'epr_nombre')
ORDER BY column_name;
```

**Si no aparece NADA** → Necesitas ejecutar el script  
**Si aparecen 4 filas** → Las columnas ya existen (error es otro)

---

## 📋 Checklist

- [ ] Abrí Supabase Dashboard
- [ ] Entré a SQL Editor
- [ ] Copié el contenido de `sql/EJECUTAR_ESTO_AHORA.sql`
- [ ] Pegué y ejecuté el script
- [ ] Vi que se crearon 10 columnas
- [ ] Recargué la aplicación (F5)
- [ ] Intenté guardar responsables de nuevo

---

## 🎯 Qué Esperar Después

Una vez ejecutes el script y recargues, cuando guardes responsables verás:

```
✅ Responsables actualizados exitosamente
✅ Responsables guardados exitosamente

Proyecto: Proyecto 1
Empresa: CMP
JPRO: Alan Flores
EPR: Carolina Pacheco Vega
RRHH: Camila Pérez Becerra
Legal: Beatriz Rubilar Contreras

🎉 Se crearon X requerimientos automáticamente
```

---

## ❓ Si Aún Falla

Copia **TODO** el mensaje de error que aparece en la consola y compártelo aquí.

---

## 📞 Siguiente Paso

**EJECUTA EL SCRIPT AHORA** y luego dime:

1. ✅ ¿Viste "total_columnas: 10"?
2. ✅ ¿Recargaste la aplicación?
3. ✅ ¿Qué sucedió al intentar guardar responsables?

Si hay algún problema, comparte el error **EXACTO** que aparece.

