-- Agrega columna para guardar la respuesta generada con Experto IA en preguntas.
-- Ejecutar en Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'respuesta_experto_ia'
  ) THEN
    ALTER TABLE public.preguntas
      ADD COLUMN respuesta_experto_ia text NULL;
  END IF;
END;
$$;

COMMENT ON COLUMN public.preguntas.respuesta_experto_ia
  IS 'Borrador o respuesta asistida por IA experta para la observación.';
