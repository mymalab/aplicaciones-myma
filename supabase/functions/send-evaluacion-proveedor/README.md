# Edge Function: send-evaluacion-proveedor

Esta función edge de Supabase recibe una evaluación de proveedor y la envía al webhook de n8n.

## Despliegue

Para desplegar esta función, ejecuta:

```bash
supabase functions deploy send-evaluacion-proveedor
```

## URL del Webhook

La función está configurada para enviar datos a:
- `https://mymalab.app.n8n.cloud/webhook/f6c3a6f2-d42f-4f51-96aa-1d6cac4b7d38`

## Formato del Payload

La función espera recibir un JSON con la siguiente estructura:

```json
{
  "tipo": "evaluacion_proveedor",
  "fecha_envio": "2024-01-20T12:00:00.000Z",
  "evaluacion": {
    "nombre_proveedor": "Nombre del Proveedor",
    "especialidad": "...",
    "actividad": "...",
    "orden_compra": "...",
    "codigo_proyecto": "...",
    "nombre_proyecto": "...",
    "fecha_evaluacion": "2024-01-20",
    "evaluador": "...",
    "evaluacion_calidad": "Sobresaliente",
    "evaluacion_disponibilidad": "Alta",
    "evaluacion_fecha_entrega": "Entrega por adelantado",
    "evaluacion_precio": "Muy buen precio",
    "nota_total_ponderada": 0.51,
    "categoria_proveedor": "A",
    "observacion": "...",
    "aplica_salida_terreno": false,
    "evaluacion_seguridad_terreno": null,
    "precio_servicio": 100000,
    "correo_contacto": "...",
    "descripcion_servicio": "...",
    "link_servicio_ejecutado": "..."
  },
  "evaluacion_id": 123
}
```

