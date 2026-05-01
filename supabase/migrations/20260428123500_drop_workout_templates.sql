-- Migration: Entfernen der workout_templates Tabellen und zugehöriger Constraints/Policies
set check_function_bodies = off;

-- Entferne Policies (sicherheitsshalber, falls vorhanden)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_templates: select own') THEN
    EXECUTE 'DROP POLICY "workout_templates: select own" ON public.workout_templates';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_templates: insert own') THEN
    EXECUTE 'DROP POLICY "workout_templates: insert own" ON public.workout_templates';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_templates: update own') THEN
    EXECUTE 'DROP POLICY "workout_templates: update own" ON public.workout_templates';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_templates: delete own') THEN
    EXECUTE 'DROP POLICY "workout_templates: delete own" ON public.workout_templates';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_exercises: select own') THEN
    EXECUTE 'DROP POLICY "workout_template_exercises: select own" ON public.workout_template_exercises';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_exercises: insert own') THEN
    EXECUTE 'DROP POLICY "workout_template_exercises: insert own" ON public.workout_template_exercises';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_exercises: update own') THEN
    EXECUTE 'DROP POLICY "workout_template_exercises: update own" ON public.workout_template_exercises';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_exercises: delete own') THEN
    EXECUTE 'DROP POLICY "workout_template_exercises: delete own" ON public.workout_template_exercises';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_sets: select own') THEN
    EXECUTE 'DROP POLICY "workout_template_sets: select own" ON public.workout_template_sets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_sets: insert own') THEN
    EXECUTE 'DROP POLICY "workout_template_sets: insert own" ON public.workout_template_sets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_sets: update own') THEN
    EXECUTE 'DROP POLICY "workout_template_sets: update own" ON public.workout_template_sets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'workout_template_sets: delete own') THEN
    EXECUTE 'DROP POLICY "workout_template_sets: delete own" ON public.workout_template_sets';
  END IF;
END $$;

-- Entferne Foreign Key Constraints falls vorhanden
ALTER TABLE IF EXISTS public.workout_template_exercises
  DROP CONSTRAINT IF EXISTS workout_template_exercises_template_id_fkey;
ALTER TABLE IF EXISTS public.workout_template_exercises
  DROP CONSTRAINT IF EXISTS workout_template_exercises_exercise_id_fkey;
ALTER TABLE IF EXISTS public.workout_template_sets
  DROP CONSTRAINT IF EXISTS workout_template_sets_template_exercise_id_fkey;
ALTER TABLE IF EXISTS public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_user_id_fkey;

-- Lösche die Tabellen in der richtigen Reihenfolge
DROP TABLE IF EXISTS public.workout_template_sets;
DROP TABLE IF EXISTS public.workout_template_exercises;
DROP TABLE IF EXISTS public.workout_templates;
