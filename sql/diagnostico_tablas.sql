-- Script de diagnóstico para verificar la configuración de las tablas
-- Ejecutar este script en Supabase SQL Editor para verificar el estado del sistema

-- ====================================================================
-- DIAGNÓSTICO: TABLAS EXISTENTES
-- ====================================================================

SELECT 'VERIFICANDO TABLAS EXISTENTES' as paso;

-- Verificar que la tabla solicitud_acreditacion existe
SELECT 
  'solicitud_acreditacion' as tabla,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitud_acreditacion')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

-- Verificar que la tabla cliente existe
SELECT 
  'cliente' as tabla,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cliente')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar: sql/create_cliente_table.sql'
  END as estado;

-- Verificar que la tabla empresa_requerimiento existe
SELECT 
  'empresa_requerimiento' as tabla,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresa_requerimiento')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar: sql/create_project_requirements_tables.sql'
  END as estado;

-- Verificar que la tabla proyecto_requerimientos_acreditacion existe
SELECT 
  'proyecto_requerimientos_acreditacion' as tabla,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proyecto_requerimientos_acreditacion')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar: sql/create_project_requirements_tables.sql'
  END as estado;

-- ====================================================================
-- DIAGNÓSTICO: COLUMNAS DE RESPONSABLES
-- ====================================================================

SELECT 'VERIFICANDO COLUMNAS DE RESPONSABLES' as paso;

SELECT 
  column_name,
  data_type,
  '✅ OK' as estado
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN (
    'empresa_id', 'empresa_nombre',
    'jpro_id', 'jpro_nombre',
    'epr_id', 'epr_nombre',
    'rrhh_id', 'rrhh_nombre',
    'legal_id', 'legal_nombre'
  )
ORDER BY column_name;

-- ====================================================================
-- DIAGNÓSTICO: DATOS DE PRUEBA
-- ====================================================================

SELECT 'VERIFICANDO DATOS EN TABLAS' as paso;

-- Contar clientes
SELECT 
  'cliente' as tabla,
  COUNT(*) as total_registros,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CON DATOS'
    ELSE '⚠️ SIN DATOS - Ejecutar inserts en sql/create_cliente_table.sql'
  END as estado
FROM cliente;

-- Contar empresa_requerimiento (si la tabla existe)
SELECT 
  'empresa_requerimiento' as tabla,
  COUNT(*) as total_registros,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CON DATOS'
    ELSE '⚠️ SIN DATOS - Ejecutar inserts en sql/create_project_requirements_tables.sql'
  END as estado
FROM empresa_requerimiento
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresa_requerimiento');

-- ====================================================================
-- RESUMEN FINAL
-- ====================================================================

SELECT 'RESUMEN DEL DIAGNÓSTICO' as paso;

SELECT 
  '📊 Total Clientes' as metrica,
  COUNT(*) as valor
FROM cliente
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cliente');

SELECT 
  '📋 Total Empresas con Requerimientos' as metrica,
  COUNT(DISTINCT empresa) as valor
FROM empresa_requerimiento
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresa_requerimiento');

SELECT 
  '✅ Total Proyectos con Responsables Asignados' as metrica,
  COUNT(*) as valor
FROM solicitud_acreditacion
WHERE jpro_id IS NOT NULL OR epr_id IS NOT NULL OR rrhh_id IS NOT NULL OR legal_id IS NOT NULL;

-- ====================================================================
-- ACCIONES RECOMENDADAS
-- ====================================================================

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cliente')
    THEN '❌ EJECUTAR: sql/create_cliente_table.sql'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresa_requerimiento')
    THEN '❌ EJECUTAR: sql/create_project_requirements_tables.sql'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicitud_acreditacion' AND column_name = 'jpro_id')
    THEN '❌ EJECUTAR: sql/add_responsables_columns.sql'
    ELSE '✅ TODO CONFIGURADO CORRECTAMENTE'
  END as resultado_diagnostico;

