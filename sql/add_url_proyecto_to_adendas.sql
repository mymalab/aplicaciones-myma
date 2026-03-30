-- Asegura la columna url_proyecto en public.adendas y refresca el cache de PostgREST.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'adendas'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'adendas'
        AND column_name = 'url_proyecto'
    ) THEN
      ALTER TABLE public.adendas
        ADD COLUMN url_proyecto text;
    END IF;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
