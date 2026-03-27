-- Agrega campos de gestion en preguntas para encargado y especialidad.
-- Ejecutar en Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'encargado_persona_id'
  ) THEN
    ALTER TABLE public.preguntas
      ADD COLUMN encargado_persona_id integer NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'fecha_compromiso'
  ) THEN
    ALTER TABLE public.preguntas
      ADD COLUMN fecha_compromiso date NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'estrategia'
  ) THEN
    ALTER TABLE public.preguntas
      ADD COLUMN estrategia text NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'respuesta_ia'
  ) THEN
    ALTER TABLE public.preguntas
      ADD COLUMN respuesta_ia text NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'preguntas'
      AND column_name = 'especialidad_id'
  ) THEN
    ALTER TABLE public.preguntas
      ADD COLUMN especialidad_id bigint NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'preguntas'
      AND constraint_name = 'preguntas_encargado_persona_id_fkey'
  ) THEN
    ALTER TABLE public.preguntas
      ADD CONSTRAINT preguntas_encargado_persona_id_fkey
      FOREIGN KEY (encargado_persona_id)
      REFERENCES public.dim_core_persona(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'preguntas'
      AND constraint_name = 'preguntas_especialidad_id_fkey'
  ) THEN
    ALTER TABLE public.preguntas
      ADD CONSTRAINT preguntas_especialidad_id_fkey
      FOREIGN KEY (especialidad_id)
      REFERENCES public.dim_core_especialidad(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_preguntas_encargado_persona_id
  ON public.preguntas(encargado_persona_id);

CREATE INDEX IF NOT EXISTS idx_preguntas_especialidad_id
  ON public.preguntas(especialidad_id);

COMMENT ON COLUMN public.preguntas.encargado_persona_id
  IS 'Persona asignada como encargado de la pregunta (dim_core_persona.id).';

COMMENT ON COLUMN public.preguntas.especialidad_id
  IS 'Especialidad asignada a la pregunta (dim_core_especialidad.id).';

COMMENT ON COLUMN public.preguntas.estrategia
  IS 'Estrategia propuesta para responder la observación.';

COMMENT ON COLUMN public.preguntas.respuesta_ia
  IS 'Borrador o respuesta asistida por IA para la observación.';

COMMENT ON COLUMN public.preguntas.fecha_compromiso
  IS 'Fecha objetivo para completar la respuesta de la observación.';

