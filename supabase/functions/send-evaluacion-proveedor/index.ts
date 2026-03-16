// Supabase Edge Function para enviar evaluación de proveedor a n8n
const WEBHOOK_URL = 'https://mymalab.app.n8n.cloud/webhook/f6c3a6f2-d42f-4f51-96aa-1d6cac4b7d38';

// Headers CORS que permiten todos los headers de Supabase
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
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
    console.log('📦 Payload de evaluación recibido:', JSON.stringify(payload, null, 2));

    // Enviar al webhook de n8n
    console.log('🌐 Enviando evaluación a webhook n8n:', WEBHOOK_URL);
    console.log('📤 Payload a enviar:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Respuesta del webhook recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Leer la respuesta
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log('📄 Contenido de la respuesta:', responseData);

    // Si el webhook devuelve 404, es un error pero no crítico
    if (response.status === 404) {
      console.warn('⚠️ Webhook de n8n no encontrado (404). Verifica que el workflow esté activo y la URL sea correcta.');
    }

    console.log('✅ Respuesta procesada, devolviendo resultado');

    // Devolver la respuesta con CORS habilitado
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: responseData,
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

