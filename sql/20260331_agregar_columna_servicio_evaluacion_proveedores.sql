-- Agrega columna "servicio" a la tabla de evaluaciones de proveedores.
-- Se usa para persistir explicitamente el servicio seleccionado en el formulario.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fct_proveedores_evaluacion_evt'
      AND column_name = 'servicio'
  ) THEN
    ALTER TABLE public.fct_proveedores_evaluacion_evt
      ADD COLUMN servicio text NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.fct_proveedores_evaluacion_evt.servicio
  IS 'Servicio seleccionado para la evaluacion; fuente: brg_proveedores_servicios filtrado por rut.';

CREATE INDEX IF NOT EXISTS idx_fct_proveedores_evaluacion_evt_servicio
  ON public.fct_proveedores_evaluacion_evt (servicio);
