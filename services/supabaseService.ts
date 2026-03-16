import { supabase } from '../config/supabase';

// Función para eliminar una solicitud de acreditación
export const deleteSolicitudAcreditacion = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('fct_acreditacion_solicitud')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting solicitud_acreditacion:', error);
    throw error;
  }
};

