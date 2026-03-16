# Análisis del Formulario FieldRequestForm

## Comparación: Formulario vs Esquema de Tabla

### ❌ PROBLEMAS ENCONTRADOS:

#### 1. **Campo `placas_patente` (MYMA)**
- **Tabla espera:** `placas_patente text[]` (array de texto simple)
- **Formulario envía:** `vehiculos_placas` como JSONB con objetos `{placa, conductor}`
- **Problema:** El nombre del campo es incorrecto Y el tipo de dato es incorrecto
- **Solución:** Enviar `placas_patente` como array de strings `['ABC123', 'DEF456']`

#### 2. **Campo `placas_vehiculos_contratista`**
- **Tabla espera:** `placas_vehiculos_contratista text[]` (array de texto simple)
- **Formulario envía:** `vehiculos_contratista_placas` como JSONB con objetos
- **Problema:** El nombre del campo es incorrecto Y el tipo de dato es incorrecto
- **Solución:** Enviar `placas_vehiculos_contratista` como array de strings

### ✅ CAMPOS CORRECTOS:

| Campo Formulario | Campo Tabla | Estado |
|-----------------|-------------|--------|
| `codigo_proyecto` | `codigo_proyecto` | ✅ Correcto |
| `fecha_solicitud` | `fecha_solicitud` | ✅ Correcto |
| `nombre_solicitante` | `nombre_solicitante` | ✅ Correcto |
| `fecha_reunion_arranque` | `fecha_reunion_arranque` | ✅ Correcto |
| `fecha_inicio_terreno` | `fecha_inicio_terreno` | ✅ Correcto |
| `requisito` | `requisito` | ✅ Correcto |
| `nombre_cliente` | `nombre_cliente` | ✅ Correcto |
| `nombre_contacto_cliente` | `nombre_contacto_cliente` | ✅ Correcto |
| `email_contacto_cliente` | `email_contacto_cliente` | ✅ Correcto |
| `jefe_proyectos_myma` | `jefe_proyectos_myma` | ✅ Correcto |
| `admin_contrato_myma` | `admin_contrato_myma` | ✅ Correcto |
| `encargado_seguimiento_acreditacion` | `encargado_seguimiento_acreditacion` | ✅ Correcto |
| `aviso_prevencion_riesgo` (boolean) | `aviso_prevencion_riesgo` (boolean) | ✅ Correcto |
| `requiere_acreditar_empresa` (boolean) | `requiere_acreditar_empresa` (boolean) | ✅ Correcto |
| `nombre_contrato` | `nombre_contrato` | ✅ Correcto |
| `numero_contrato` | `numero_contrato` | ✅ Correcto |
| `administrador_contrato` | `administrador_contrato` | ✅ Correcto |
| `horarios_trabajo` (JSONB) | `horarios_trabajo` (JSONB) | ✅ Correcto |
| `cantidad_vehiculos` | `cantidad_vehiculos` | ✅ Correcto |
| `cantidad_trabajadores_myma` | `cantidad_trabajadores_myma` | ✅ Correcto |
| `requiere_acreditar_contratista` (boolean) | `requiere_acreditar_contratista` (boolean) | ✅ Correcto |
| `modalidad_contrato_contratista` | `modalidad_contrato_contratista` | ✅ Correcto |
| `razon_social_contratista` | `razon_social_contratista` | ✅ Correcto |
| `nombre_responsable_contratista` | `nombre_responsable_contratista` | ✅ Correcto |
| `telefono_responsable_contratista` | `telefono_responsable_contratista` | ✅ Correcto |
| `email_responsable_contratista` | `email_responsable_contratista` | ✅ Correcto |
| `cantidad_vehiculos_contratista` | `cantidad_vehiculos_contratista` | ✅ Correcto |
| `cantidad_trabajadores_contratista` | `cantidad_trabajadores_contratista` | ✅ Correcto |
| `registro_sst_terreno` (boolean) | `registro_sst_terreno` (boolean) | ✅ Correcto |

### 📝 NOTA IMPORTANTE:

Los campos `created_at` y `updated_at` se manejan automáticamente por la base de datos.
El campo `estado_solicitud_acreditacion` tiene default 'Pendiente' en la tabla, no es necesario enviarlo.

## Correcciones necesarias:

1. Cambiar `vehiculos_placas` → `placas_patente` y convertir de JSONB a `text[]`
2. Cambiar `vehiculos_contratista_placas` → `placas_vehiculos_contratista` y convertir de JSONB a `text[]`

