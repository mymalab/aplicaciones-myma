# Configuración de Responsables de Proyectos

## 📋 Descripción

Este documento explica cómo configurar y guardar los responsables de cada proyecto en la base de datos.

## 🔧 Configuración Inicial

### 1. **Crear Tabla de Clientes (si no existe)**

Primero, asegúrate de que la tabla `cliente` existe en Supabase:

1. Ve a tu proyecto en **Supabase Dashboard**
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo `sql/create_cliente_table.sql`
4. Haz clic en **Run** para ejecutar el script

Este script creará la tabla `cliente` con datos de ejemplo si no existe.

### 2. **Ejecutar Script SQL de Responsables**

Para que los responsables se guarden correctamente, necesitas ejecutar el script SQL en tu base de datos de Supabase:

1. Ve a tu proyecto en **Supabase Dashboard**
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo `sql/add_responsables_columns.sql`
4. Haz clic en **Run** para ejecutar el script

El script creará automáticamente las siguientes columnas si no existen:

```sql
- empresa_id (TEXT)
- empresa_nombre (TEXT)
- jpro_id (INTEGER)
- jpro_nombre (TEXT)
- epr_id (INTEGER)
- epr_nombre (TEXT)
- rrhh_id (INTEGER)
- rrhh_nombre (TEXT)
- legal_id (INTEGER)
- legal_nombre (TEXT)
```

### 3. **Verificar la Configuración**

Después de ejecutar ambos scripts, verifica que todo se creó correctamente:

**Verificar tabla Cliente:**

```sql
SELECT * FROM cliente ORDER BY nombre;
```

**Verificar columnas de Responsables:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name LIKE '%_id' OR column_name LIKE '%_nombre'
ORDER BY column_name;
```

## 💾 Cómo Guardar Responsables

### Desde la Interfaz:

1. **Ir a "Gestión de Solicitudes de Acreditación"**
2. **Hacer clic en un proyecto** que NO esté en estado "Pendiente"
3. Si el proyecto está "Pendiente", se abrirá el **Modal de Asignación**
4. **Seleccionar la Empresa Contratista** (lista desplegable)
5. **Seleccionar cada Responsable**:
   - JPRO (Jefe de Proyecto)
   - EPR (Especialista en Prevención de Riesgo)
   - RRHH (Recursos Humanos)
   - Legal
6. **Hacer clic en "Guardar Responsables"** (botón verde)
7. **Confirmar** el mensaje de éxito que muestra los responsables guardados

### Datos que se Guardan:

```javascript
{
  empresa_id: "tech_mining",
  empresa_nombre: "Tech Mining SpA",
  jpro_id: 123,
  jpro_nombre: "Juan Pérez González",
  epr_id: 456,
  epr_nombre: "María López Rojas",
  rrhh_id: 789,
  rrhh_nombre: "Pedro Silva Díaz",
  legal_id: 321,
  legal_nombre: "Ana Torres Muñoz",
  estado_solicitud_acreditacion: "En proceso",
  updated_at: "2024-12-18T10:30:00.000Z"
}
```

## 📊 Visualización de Responsables

Una vez guardados, los responsables se mostrarán en:

1. **Vista de Galería**: Tarjetas individuales por responsable con progreso
2. **Vista de Detalle**: Tabla con tareas asignadas a cada responsable

### Ejemplo Visual:

```
┌─────────────────┐
│  ○ 50%  JPRO    │
│  2/4 tareas     │
└─────────────────┘
```

## 🔍 Logs y Debugging

### Logs en Consola:

Al guardar responsables, verás en la consola del navegador:

```
🔄 Actualizando responsables para solicitud ID: 123
📝 Responsables recibidos: {...}
📦 Datos a guardar: {...}
✅ Responsables actualizados exitosamente
```

### En Caso de Error:

Si aparece un error, verifica:

1. ✅ Que ejecutaste el script SQL en Supabase
2. ✅ Que las columnas existen en la tabla
3. ✅ Que tienes permisos de escritura en Supabase
4. ✅ Que la conexión a Supabase está activa

## 🔄 Actualización de Datos

Los responsables se actualizan automáticamente cuando:

- Guardas cambios en el modal
- Recargas la página de proyectos
- El componente padre actualiza los datos

## 📝 Notas Importantes

1. **Estado del Proyecto**: Al asignar responsables, el estado cambia automáticamente a "En proceso"
2. **Datos Opcionales**: Todos los responsables son opcionales, puedes guardar solo los que necesites
3. **Empresa**: La empresa contratista también es opcional
4. **Historial**: El campo `updated_at` guarda la fecha de última actualización

## 🆘 Soporte

Si los responsables no se guardan:

1. Abre la **Consola del Navegador** (F12)
2. Ve a la pestaña **Console**
3. Busca mensajes de error en rojo
4. Verifica los logs que comienzan con 🔄, 📝 o 📦
5. Copia el mensaje de error y contacta al administrador

## ✅ Checklist de Verificación

- [ ] Script SQL ejecutado en Supabase
- [ ] Columnas creadas correctamente
- [ ] Índices creados para mejor rendimiento
- [ ] Puedo abrir el modal de responsables
- [ ] Puedo seleccionar empresa y responsables
- [ ] Al guardar, veo mensaje de éxito
- [ ] Los datos se ven reflejados al recargar
- [ ] Las tarjetas por responsable aparecen en la galería

