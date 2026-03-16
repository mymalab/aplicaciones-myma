-- Script para verificar que los requerimientos se guardaron correctamente
-- en proyecto_requerimientos_acreditacion

-- 1. Ver todos los requerimientos guardados, agrupados por proyecto
SELECT 
  codigo_proyecto,
  cliente,
  COUNT(*) as total_requerimientos,
  COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN estado = 'En Progreso' THEN 1 END) as en_progreso,
  COUNT(CASE WHEN estado = 'Completado' THEN 1 END) as completados
FROM proyecto_requerimientos_acreditacion
GROUP BY codigo_proyecto, cliente
ORDER BY codigo_proyecto;

-- 2. Ver los requerimientos de un proyecto específico (reemplaza 'MYMA-05' con tu código)
SELECT 
  id,
  codigo_proyecto,
  requerimiento,
  categoria_requerimiento,
  responsable,
  nombre_responsable,
  estado,
  observaciones,
  created_at
FROM proyecto_requerimientos_acreditacion
WHERE codigo_proyecto = 'MYMA-05'
ORDER BY created_at DESC;

-- 3. Ver cuántos requerimientos tiene cada responsable
SELECT 
  codigo_proyecto,
  responsable,
  nombre_responsable,
  COUNT(*) as cantidad_requerimientos
FROM proyecto_requerimientos_acreditacion
WHERE codigo_proyecto = 'MYMA-05'
GROUP BY codigo_proyecto, responsable, nombre_responsable
ORDER BY responsable;

-- 4. Ver requerimientos sin responsable asignado
SELECT 
  codigo_proyecto,
  requerimiento,
  responsable as cargo,
  nombre_responsable,
  estado
FROM proyecto_requerimientos_acreditacion
WHERE nombre_responsable IS NULL 
   OR nombre_responsable = '' 
   OR nombre_responsable = 'Sin asignar'
ORDER BY codigo_proyecto, requerimiento;

-- 5. Ver los últimos 10 requerimientos creados
SELECT 
  codigo_proyecto,
  cliente,
  requerimiento,
  responsable,
  nombre_responsable,
  estado,
  created_at
FROM proyecto_requerimientos_acreditacion
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verificar duplicados (no debería haber por el UNIQUE constraint)
SELECT 
  codigo_proyecto,
  requerimiento,
  COUNT(*) as cantidad
FROM proyecto_requerimientos_acreditacion
GROUP BY codigo_proyecto, requerimiento
HAVING COUNT(*) > 1;

-- 7. Ver estadísticas generales
SELECT 
  COUNT(DISTINCT codigo_proyecto) as total_proyectos,
  COUNT(*) as total_requerimientos,
  COUNT(DISTINCT requerimiento) as requerimientos_unicos,
  COUNT(CASE WHEN nombre_responsable IS NOT NULL AND nombre_responsable != 'Sin asignar' THEN 1 END) as con_responsable_asignado,
  COUNT(CASE WHEN nombre_responsable IS NULL OR nombre_responsable = 'Sin asignar' THEN 1 END) as sin_responsable_asignado
FROM proyecto_requerimientos_acreditacion;

