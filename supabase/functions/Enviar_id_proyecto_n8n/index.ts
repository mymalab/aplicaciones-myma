// Supabase Edge Function para enviar ID del proyecto a n8n
const WEBHOOK_URL = 'https://mymalab.app.n8n.cloud/webhook/proyecto/trigger';

// Headers CORS que permiten todos los headers de Supabase
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('📥 Request recibido:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Manejar CORS preflight - DEBE ser lo primero
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondiendo a OPTIONS (CORS preflight)');
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Solo permitir POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Obtener el payload del request
    const payload = await req.json();
    console.log('📦 Payload recibido completo:', JSON.stringify(payload, null, 2));
    console.log('📧 Email usuario recibido:', payload.email_usuario);

    // Validar que se recibió el id_proyecto
    if (!payload.id_proyecto) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'id_proyecto es requerido' 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Preparar el payload para n8n - SIEMPRE incluir email_usuario
    const parsedSolicitudPrueba =
      typeof payload.solicitud_prueba === 'boolean'
        ? payload.solicitud_prueba
        : String(payload.solicitud_prueba).toLowerCase() === 'true';

    const n8nPayload: any = {
      id_proyecto: payload.id_proyecto,
      timestamp: new Date().toISOString(),
      solicitud_prueba: parsedSolicitudPrueba,
    };

    // Incluir email_usuario SIEMPRE (incluso si es null o undefined)
    if (payload.email_usuario !== undefined && payload.email_usuario !== null) {
      n8nPayload.email_usuario = payload.email_usuario;
    } else {
      n8nPayload.email_usuario = null;
    }

    // Logging detallado
    console.log('📧 Email usuario en payload recibido:', payload.email_usuario);
    console.log('📧 Email usuario tipo:', typeof payload.email_usuario);
    console.log('🧪 solicitud_prueba recibida:', payload.solicitud_prueba);
    console.log('🧪 solicitud_prueba parseada:', parsedSolicitudPrueba);
    console.log('📤 Payload completo a enviar a n8n:', JSON.stringify(n8nPayload, null, 2));
    console.log('📤 Verificación - email_usuario en n8nPayload:', n8nPayload.email_usuario);
    console.log('📤 Verificación - solicitud_prueba en n8nPayload:', n8nPayload.solicitud_prueba);

    // Enviar al webhook de n8n
    console.log('🌐 Enviando a webhook:', WEBHOOK_URL);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    console.log('📥 Respuesta del webhook recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    // Leer la respuesta
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log('✅ Respuesta procesada, devolviendo resultado');

    // Devolver la respuesta con CORS habilitado
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: responseData,
        id_proyecto: payload.id_proyecto,
      }),
      {
        status: response.ok ? 200 : response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error en función edge:', error);
    console.error('❌ Stack trace:', error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error desconocido',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
