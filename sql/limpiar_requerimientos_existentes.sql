-- Script para limpiar requerimientos existentes que tienen el nombre del trabajador concatenado
-- Este script elimina el sufijo " - Nombre Trabajador" de la columna requerimiento
-- Ejecuta este script en Supabase SQL Editor ANTES de actualizar el constraint

-- PASO 1: Ver los requerimientos que tienen nombre concatenado (categoría Trabajadores)
SELECT 
  id,
  codigo_proyecto,
  requerimiento,
  nombre_trabajador,
  categoria_requerimiento,
  -- Extraer el requerimiento limpio (antes del último " - ")
  CASE 
    WHEN categoria_requerimiento ILIKE '%trabajador%' AND requerimiento LIKE '% - %' 
    THEN SUBSTRING(requerimiento FROM 1 FOR POSITION(' - ' || nombre_trabajador IN requerimiento) - 1)
    ELSE requerimiento
  END as requerimiento_limpio
FROM proyecto_requerimientos_acreditacion
WHERE categoria_requerimiento ILIKE '%trabajador%'
  AND requerimiento LIKE '% - %'
ORDER BY codigo_proyecto, id;

-- PASO 2: Actualizar los requerimientos para eliminar el nombre del trabajador
-- IMPORTANTE: Revisa primero el resultado del PASO 1 antes de ejecutar este UPDATE

UPDATE proyecto_requerimientos_acreditacion
SET requerimiento = SUBSTRING(requerimiento FROM 1 FOR POSITION(' - ' || nombre_trabajador IN requerimiento) - 1),
    updated_at = NOW()
WHERE categoria_requerimiento ILIKE '%trabajador%'
  AND requerimiento LIKE '% - %'
  AND nombre_trabajador IS NOT NULL
  AND POSITION(' - ' || nombre_trabajador IN requerimiento) > 0;

-- PASO 3: Verificar que se limpiaron correctamente
SELECT 
  id,
  codigo_proyecto,
  requerimiento,
  nombre_trabajador,
  categoria_requerimiento
FROM proyecto_requerimientos_acreditacion
WHERE categoria_requerimiento ILIKE '%trabajador%'
ORDER BY codigo_proyecto, requerimiento, nombre_trabajador
LIMIT 20;

-- PASO 4: Contar cuántos registros se actualizaron
SELECT 
  'Registros de categoría Trabajadores' as descripcion,
  COUNT(*) as cantidad
FROM proyecto_requerimientos_acreditacion
WHERE categoria_requerimiento ILIKE '%trabajador%';

