-- Runs before SalonProfile CREATE in migration order; safe no-op until table exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SalonProfile'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SalonProfile' AND column_name = 'accentColor2'
  ) THEN
    ALTER TABLE "SalonProfile" ADD COLUMN "accentColor2" TEXT DEFAULT '#ec4899';
  END IF;
END $$;
