begin;

-- Remove exercise-related test data first to satisfy FK constraints.
delete from public.sets
where workout_exercise_id in (
  select id from public.workout_exercise
);

delete from public.workout_exercise;
delete from public.exercise_muscles;
delete from public.exercises;

-- Seed German equipment names.
insert into public.equipment (name)
values
  ('Langhantel'),
  ('Kurzhantel'),
  ('Kabelzug'),
  ('Klimmzugstange'),
  ('Kettlebell'),
  ('SZ-Stange'),
  ('Beinpresse'),
  ('Brustpresse'),
  ('Latzugmaschine'),
  ('Rudergerät'),
  ('Multipresse'),
  ('Widerstandsband'),
  ('Gymnastikball'),
  ('Sprossenwand'),
  ('Körpergewicht')
on conflict (name) do nothing;

-- Seed German muscle group names.
insert into public.muscle_group (name)
values
  ('Brust'),
  ('Rücken'),
  ('Schultern'),
  ('Bizeps'),
  ('Trizeps'),
  ('Unterarme'),
  ('Bauch'),
  ('Seitliche Bauchmuskeln'),
  ('Unterer Rücken'),
  ('Gesäß'),
  ('Quadrizeps'),
  ('Beinbeuger'),
  ('Waden'),
  ('Nacken'),
  ('Ganzkörper')
on conflict (name) do nothing;

commit;
