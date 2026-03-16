-- Script para verificar que los requerimientos de trabajadores se están guardando correctamente
-- Ejecuta este script en Supabase SQL Editor para diagnosticar el flujo completo

-- 1. Ver todos los proyectos con sus trabajadores
SELECT 
  sa.id AS id_proyecto,
  sa.codigo_proyecto,
  sa.nombre_proyecto,
  sa.cantidad_trabajadores_myma,
  sa.cantidad_trabajadores_contratista,
  COUNT(pt.id) AS trabajadores_guardados
FROM solicitud_acreditacion sa
LEFT JOIN proyecto_trabajadores pt ON pt.id_proyecto = sa.id
GROUP BY sa.id, sa.codigo_proyecto, sa.nombre_proyecto
ORDER BY sa.created_at DESC;

-- 2. Ver trabajadores de un proyecto específico (cambiar CODIGO_PROYECTO por el código real)
SELECT 
  pt.id,
  pt.codigo_proyecto,
  pt.nombre_trabajador,
  pt.categoria_empresa,
  pt.created_at
FROM proyecto_trabajadores pt
WHERE pt.codigo_proyecto = 'CODIGO_PROYECTO'  -- Cambiar aquí
ORDER BY pt.categoria_empresa, pt.nombre_trabajador;

-- 3. Ver requerimientos del proyecto con información de trabajadores
SELECT 
  pra.id,
  pra.codigo_proyecto,
  pra.requerimiento,
  pra.categoria_requerimiento,
  pra.responsable,
  pra.nombre_responsable,
  pra.nombre_trabajador,
  pra.categoria_empresa,
  pra.id_proyecto_trabajador,
  pra.estado,
  pt.nombre_trabajador AS trabajador_verificado
FROM proyecto_requerimientos_acreditacion pra
LEFT JOIN proyecto_trabajadores pt ON pt.id = pra.id_proyecto_trabajador
WHERE pra.codigo_proyecto = 'CODIGO_PROYECTO'  -- Cambiar aquí
ORDER BY pra.categoria_requerimiento, pra.nombre_trabajador;

-- 4. Contar requerimientos por categoría para un proyecto
SELECT 
  pra.codigo_proyecto,
  pra.categoria_requerimiento,
  COUNT(*) AS cantidad_requerimientos,
  COUNT(DISTINCT pra.nombre_trabajador) AS trabajadores_unicos
FROM proyecto_requerimientos_acreditacion pra
WHERE pra.codigo_proyecto = 'CODIGO_PROYECTO'  -- Cambiar aquí
GROUP BY pra.codigo_proyecto, pra.categoria_requerimiento
ORDER BY pra.categoria_requerimiento;

-- 5. Verificar consistencia entre proyecto_trabajadores y proyecto_requerimientos_acreditacion
-- (debe haber N requerimientos de categoría "Trabajadores" por cada trabajador)
SELECT 
  pt.codigo_proyecto,
  pt.nombre_trabajador,
  pt.categoria_empresa,
  COUNT(pra.id) AS requerimientos_asignados
FROM proyecto_trabajadores pt
LEFT JOIN proyecto_requerimientos_acreditacion pra 
  ON pra.id_proyecto_trabajador = pt.id 
  AND pra.categoria_requerimiento = 'Trabajadores'
WHERE pt.codigo_proyecto = 'CODIGO_PROYECTO'  -- Cambiar aquí
GROUP BY pt.codigo_proyecto, pt.nombre_trabajador, pt.categoria_empresa
ORDER BY pt.categoria_empresa, pt.nombre_trabajador;

-- 6. Ver ejemplo de requerimientos de trabajadores con todas las columnas
SELECT 
  pra.id,
  pra.requerimiento,
  pra.nombre_trabajador,
  pra.categoria_empresa,
  pra.responsable,
  pra.nombre_responsable,
  pt.nombre_trabajador AS trabajador_real,
  pt.categoria_empresa AS categoria_real
FROM proyecto_requerimientos_acreditacion pra
LEFT JOIN proyecto_trabajadores pt ON pt.id = pra.id_proyecto_trabajador
WHERE pra.categoria_requerimiento = 'Trabajadores'
  AND pra.codigo_proyecto = 'CODIGO_PROYECTO'  -- Cambiar aquí
LIMIT 10;

