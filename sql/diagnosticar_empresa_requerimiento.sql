-- Script para diagnosticar problemas con empresa_requerimiento

-- 1. Ver todas las empresas únicas en la tabla empresa_requerimiento
SELECT DISTINCT empresa 
FROM empresa_requerimiento 
ORDER BY empresa;

-- 2. Contar cuántos requerimientos hay por empresa
SELECT 
  empresa,
  COUNT(*) as total_requerimientos
FROM empresa_requerimiento 
GROUP BY empresa
ORDER BY empresa;

-- 3. Ver todos los nombres de empresas en la tabla cliente
SELECT 
  id,
  nombre,
  LENGTH(nombre) as longitud_nombre,
  ASCII(SUBSTRING(nombre, 1, 1)) as primer_caracter_ascii
FROM cliente 
ORDER BY nombre;

-- 4. Ver algunos registros de ejemplo de empresa_requerimiento
SELECT 
  id,
  empresa,
  requerimiento,
  categoria_requerimiento,
  responsable,
  observaciones,
  LENGTH(empresa) as longitud_empresa,
  ASCII(SUBSTRING(empresa, 1, 1)) as primer_caracter_ascii
FROM empresa_requerimiento 
LIMIT 10;

-- 5. Buscar específicamente por las empresas más comunes
SELECT * FROM empresa_requerimiento 
WHERE empresa IN ('CMP', 'CODELCO', 'ENAMI', 'HMC S.A', 'KINROSS', 'LAS CENIZAS', 'MLP')
ORDER BY empresa, requerimiento;

-- 6. Buscar con LIKE por si hay espacios extras o diferencias
SELECT 
  DISTINCT empresa,
  '|' || empresa || '|' as empresa_con_marcadores
FROM empresa_requerimiento
WHERE empresa ILIKE '%CODELCO%' 
   OR empresa ILIKE '%CMP%'
   OR empresa ILIKE '%ENAMI%'
   OR empresa ILIKE '%HMC%'
   OR empresa ILIKE '%KINROSS%'
   OR empresa ILIKE '%CENIZAS%'
   OR empresa ILIKE '%MLP%';

