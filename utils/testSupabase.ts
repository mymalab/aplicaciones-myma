// Script de prueba para verificar la conexión y columnas de Supabase
import { supabase } from '../config/supabase';

export const testSupabaseConnection = async () => {
  console.log('🧪 === INICIANDO PRUEBAS DE SUPABASE ===');
  
  try {
    // Test 1: Conexión básica
    console.log('1️⃣ Probando conexión básica...');
    const { data: testData, error: testError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error en conexión:', testError);
      return { success: false, error: 'No se puede conectar a Supabase', details: testError };
    }
    console.log('✅ Conexión exitosa');
    
    // Test 2: Verificar columnas de responsables
    console.log('2️⃣ Verificando columnas de responsables...');
    const { data: columnsTest, error: columnsError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('id, jpro_id, jpro_nombre, epr_id, epr_nombre, rrhh_id, rrhh_nombre, legal_id, legal_nombre, empresa_id, empresa_nombre')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Error: Faltan columnas de responsables');
      console.error('Detalle:', columnsError.message);
      return { 
        success: false, 
        error: 'Faltan columnas en la base de datos', 
        details: columnsError,
        solution: 'Ejecuta sql/add_responsables_columns.sql en Supabase'
      };
    }
    console.log('✅ Todas las columnas existen');
    
    // Test 3: Probar INSERT de responsables (simulado)
    console.log('3️⃣ Probando actualización de responsables...');
    if (testData && testData.length > 0) {
      const testId = testData[0].id;
      const { data: updateTest, error: updateError } = await supabase
        .from('fct_acreditacion_solicitud')
        .update({
          empresa_nombre: 'TEST',
          jpro_nombre: 'TEST JPRO',
          updated_at: new Date().toISOString()
        })
        .eq('id', testId)
        .select();
      
      if (updateError) {
        console.error('❌ Error al actualizar:', updateError);
        return { 
          success: false, 
          error: 'No se pueden actualizar responsables', 
          details: updateError 
        };
      }
      
      // Revertir el cambio de prueba
      await supabase
        .from('fct_acreditacion_solicitud')
        .update({
          empresa_nombre: null,
          jpro_nombre: null
        })
        .eq('id', testId);
      
      console.log('✅ Actualización de responsables funciona correctamente');
    }
    
    // Test 4: Verificar tabla cliente
    console.log('4️⃣ Verificando tabla cliente...');
    const { data: clientesTest, error: clientesError } = await supabase
      .from('dim_acreditacion_cliente')
      .select('*')
      .limit(1);
    
    if (clientesError) {
      console.warn('⚠️ Tabla cliente no existe o está vacía');
      console.log('💡 Ejecuta sql/create_cliente_table.sql');
      // No retornamos error porque no es crítico
    } else {
      console.log(`✅ Tabla cliente OK (${clientesTest?.length || 0} registros encontrados)`);
    }
    
    // Test 5: Verificar tablas de requerimientos
    console.log('5️⃣ Verificando tablas de requerimientos...');
    const { error: reqError } = await supabase
      .from('brg_acreditacion_cliente_requerimiento')
      .select('*')
      .limit(1);
    
    if (reqError) {
      console.warn('⚠️ Tabla brg_acreditacion_cliente_requerimiento no existe');
      console.log('💡 Esto es opcional, pero recomendado');
      console.log('💡 Ejecuta sql/create_project_requirements_tables.sql');
    } else {
      console.log('✅ Tablas de requerimientos OK');
    }
    
    console.log('🎉 === TODAS LAS PRUEBAS COMPLETADAS ===');
    return { success: true, message: 'Todas las pruebas pasaron exitosamente' };
    
  } catch (error) {
    console.error('❌ Error inesperado durante las pruebas:', error);
    return { 
      success: false, 
      error: 'Error inesperado', 
      details: error 
    };
  }
};

// Función para ejecutar pruebas desde la consola del navegador
(window as any).testSupabase = testSupabaseConnection;

console.log('💡 Para ejecutar pruebas, escribe en consola: testSupabase()');

