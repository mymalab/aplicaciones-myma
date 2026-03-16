# 📧 Instrucciones para el Reporte Semanal de Acreditación

## Descripción
Este documento explica cómo utilizar el template HTML `reporte-semanal-acreditacion.html` para generar reportes semanales de estados de acreditación.

## Variables a Reemplazar

### Fechas
- `{{FECHA_INICIO}}` - Fecha de inicio del período (ej: "01/01/2024")
- `{{FECHA_FIN}}` - Fecha de fin del período (ej: "07/01/2024")
- `{{AÑO}}` - Año actual (ej: "2024")

### Estadísticas Generales
- `{{TOTAL_PENDIENTES}}` - Total de requerimientos con estado "Pendiente"
- `{{TOTAL_EN_PROCESO}}` - Total de requerimientos con estado "En Proceso"
- `{{TOTAL_COMPLETADOS}}` - Total de requerimientos con estado "Completado"
- `{{TOTAL_CANCELADOS}}` - Total de requerimientos con estado "Cancelado"

### Proyectos Destacados
- `{{CODIGO_PROYECTO_1}}`, `{{CODIGO_PROYECTO_2}}`, `{{CODIGO_PROYECTO_3}}` - Códigos de proyectos
- `{{CLIENTE_1}}`, `{{CLIENTE_2}}`, `{{CLIENTE_3}}` - Nombres de clientes
- `{{TOTAL_REQ_1}}`, `{{TOTAL_REQ_2}}`, `{{TOTAL_REQ_3}}` - Total de requerimientos por proyecto
- `{{ESTADO_1}}`, `{{ESTADO_2}}`, `{{ESTADO_3}}` - Estados (pendiente, en-proceso, completado, cancelado)

### Resumen por Responsable
- `{{TOTAL_JPRO}}` - Total de requerimientos asignados a Jefe de Proyecto
- `{{TOTAL_EPR}}` - Total de requerimientos asignados a Especialista en Prevención de Riesgo
- `{{TOTAL_RRHH}}` - Total de requerimientos asignados a Recursos Humanos
- `{{TOTAL_LEGAL}}` - Total de requerimientos asignados a Legal

### Resumen por Categoría
- `{{TOTAL_CAPACITACION}}` - Total de requerimientos de categoría "Capacitación"
- `{{TOTAL_SALUD}}` - Total de requerimientos de categoría "Salud"
- `{{TOTAL_LEGAL_CAT}}` - Total de requerimientos de categoría "Legal"
- `{{TOTAL_OTROS}}` - Total de requerimientos de otras categorías

## Consultas SQL Sugeridas

### Obtener Totales por Estado
```sql
SELECT 
    estado,
    COUNT(*) as total
FROM proyecto_requerimientos_acreditacion
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY estado;
```

### Obtener Proyectos Destacados
```sql
SELECT 
    codigo_proyecto,
    cliente,
    COUNT(*) as total_requerimientos,
    COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
    COUNT(CASE WHEN estado = 'Completado' THEN 1 END) as completados
FROM proyecto_requerimientos_acreditacion
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY codigo_proyecto, cliente
ORDER BY pendientes DESC, total_requerimientos DESC
LIMIT 5;
```

### Obtener Totales por Responsable
```sql
SELECT 
    responsable,
    COUNT(*) as total
FROM proyecto_requerimientos_acreditacion
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY responsable;
```

### Obtener Totales por Categoría
```sql
SELECT 
    categoria_requerimiento,
    COUNT(*) as total
FROM proyecto_requerimientos_acreditacion
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY categoria_requerimiento;
```

## Implementación en Código

### Ejemplo con Node.js/TypeScript
```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function generarReporteSemanal() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Obtener fechas del período
  const fechaFin = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - 7);
  
  // Obtener estadísticas
  const { data: estados } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('estado')
    .gte('created_at', fechaInicio.toISOString());
  
  const totales = {
    pendientes: estados?.filter(e => e.estado === 'Pendiente').length || 0,
    enProceso: estados?.filter(e => e.estado === 'En Proceso').length || 0,
    completados: estados?.filter(e => e.estado === 'Completado').length || 0,
    cancelados: estados?.filter(e => e.estado === 'Cancelado').length || 0,
  };
  
  // Leer template
  let html = fs.readFileSync('reporte-semanal-acreditacion.html', 'utf-8');
  
  // Reemplazar variables
  html = html.replace(/\{\{FECHA_INICIO\}\}/g, fechaInicio.toLocaleDateString('es-CL'));
  html = html.replace(/\{\{FECHA_FIN\}\}/g, fechaFin.toLocaleDateString('es-CL'));
  html = html.replace(/\{\{TOTAL_PENDIENTES\}\}/g, totales.pendientes.toString());
  html = html.replace(/\{\{TOTAL_EN_PROCESO\}\}/g, totales.enProceso.toString());
  html = html.replace(/\{\{TOTAL_COMPLETADOS\}\}/g, totales.completados.toString());
  html = html.replace(/\{\{TOTAL_CANCELADOS\}\}/g, totales.cancelados.toString());
  html = html.replace(/\{\{AÑO\}\}/g, new Date().getFullYear().toString());
  
  // Guardar o enviar por correo
  return html;
}
```

## Envío del Correo

### Opción 1: Usar un servicio de email (Recomendado)
- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://www.mailgun.com
- **AWS SES**: https://aws.amazon.com/ses/
- **Nodemailer** (Node.js): https://nodemailer.com

### Opción 2: Usar Supabase Edge Function
Puedes crear una función edge en Supabase que genere y envíe el reporte automáticamente cada semana usando un cron job.

## Personalización

### Cambiar Colores
Los colores están definidos en las clases CSS:
- Pendiente: `#f59e0b` (naranja)
- En Proceso: `#3b82f6` (azul)
- Completado: `#10b981` (verde)
- Cancelado: `#ef4444` (rojo)

### Agregar Más Secciones
Puedes agregar nuevas secciones siguiendo el patrón de `summary-section` y usando las mismas clases CSS.

## Notas Importantes

1. **Compatibilidad de Email**: El HTML está diseñado para ser compatible con la mayoría de clientes de correo, pero algunos pueden no soportar todas las características CSS modernas.

2. **Imágenes**: Si necesitas agregar imágenes, usa URLs absolutas o adjunta las imágenes al correo.

3. **Tablas**: Las tablas son la forma más compatible de estructurar contenido en emails.

4. **Testing**: Siempre prueba el correo en diferentes clientes (Gmail, Outlook, Apple Mail) antes de enviarlo a producción.




























