-- Migration: Entfernen der Tabelle public.exercise_type und der Verweise
set check_function_bodies = off;

-- Fremdschlüssel von public.exercises auf public.exercise_type entfernen
ALTER TABLE IF EXISTS public.exercises
  DROP CONSTRAINT IF EXISTS exercises_exercise_type_id_fkey;

-- Spalte exercise_type_id aus public.exercises entfernen
ALTER TABLE IF EXISTS public.exercises
  DROP COLUMN IF EXISTS exercise_type_id;

-- Falls vorhanden Policy entfernen (sicherheitshalber)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'exercise_type: public read') THEN
    EXECUTE 'DROP POLICY "exercise_type: public read" ON public.exercise_type';
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- table does not exist, ignore
  NULL;
END $$;

-- Tabelle public.exercise_type löschen
DROP TABLE IF EXISTS public.exercise_type;
