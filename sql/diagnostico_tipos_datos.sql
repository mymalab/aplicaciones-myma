-- Script de diagnóstico completo para verificar tipos de datos y contenido
-- Ejecuta este script en Supabase SQL Editor

-- 1. Ver la estructura completa de la tabla con tipos de datos
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'proyecto_requerimientos_acreditacion'
ORDER BY ordinal_position;

-- 2. Ver todos los valores únicos de categoria_requerimiento (para ver qué categorías existen)
SELECT DISTINCT 
  categoria_requerimiento,
  COUNT(*) as cantidad
FROM proyecto_requerimientos_acreditacion
GROUP BY categoria_requerimiento
ORDER BY cantidad DESC;

-- 3. Ver una muestra de registros con todas las columnas relevantes
SELECT 
  id,
  codigo_proyecto,
  requerimiento,
  responsable,
  categoria_requerimiento,
  nombre_trabajador,
  categoria_empresa,
  id_proyecto_trabajador,
  nombre_responsable,
  estado
FROM proyecto_requerimientos_acreditacion
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar si hay registros con nombre_trabajador
SELECT 
  COUNT(*) as total_registros,
  COUNT(nombre_trabajador) as con_nombre_trabajador,
  COUNT(categoria_empresa) as con_categoria_empresa,
  COUNT(id_proyecto_trabajador) as con_id_trabajador
FROM proyecto_requerimientos_acreditacion;

-- 5. Ver registros de categoría "Trabajadores" específicamente
SELECT 
  id,
  codigo_proyecto,
  requerimiento,
  nombre_trabajador,
  categoria_empresa,
  id_proyecto_trabajador
FROM proyecto_requerimientos_acreditacion
WHERE categoria_requerimiento ILIKE '%trabajador%'
ORDER BY created_at DESC
LIMIT 10;

