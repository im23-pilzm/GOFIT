create table "public"."workout_templates" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "name" text not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."workout_templates" enable row level security;

create table "public"."workout_template_exercises" (
  "id" uuid not null default gen_random_uuid(),
  "template_id" uuid not null,
  "exercise_id" uuid not null,
  "position" bigint not null,
  "rest_timer_seconds" bigint not null default 90,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."workout_template_exercises" enable row level security;

create table "public"."workout_template_sets" (
  "id" uuid not null default gen_random_uuid(),
  "template_exercise_id" uuid not null,
  "position" bigint not null,
  "weight_kg" numeric,
  "reps" bigint,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."workout_template_sets" enable row level security;

create unique index workout_templates_pkey on public.workout_templates using btree (id);
create unique index workout_template_exercises_pkey on public.workout_template_exercises using btree (id);
create unique index workout_template_sets_pkey on public.workout_template_sets using btree (id);

create index workout_templates_user_id_idx on public.workout_templates using btree (user_id);
create index workout_template_exercises_template_id_idx on public.workout_template_exercises using btree (template_id);
create index workout_template_sets_template_exercise_id_idx on public.workout_template_sets using btree (template_exercise_id);

alter table "public"."workout_templates"
  add constraint "workout_templates_pkey" primary key using index "workout_templates_pkey";

alter table "public"."workout_template_exercises"
  add constraint "workout_template_exercises_pkey" primary key using index "workout_template_exercises_pkey";

alter table "public"."workout_template_sets"
  add constraint "workout_template_sets_pkey" primary key using index "workout_template_sets_pkey";

alter table "public"."workout_templates"
  add constraint "workout_templates_user_id_fkey"
  foreign key (user_id) references public.users(id) on delete cascade not valid;

alter table "public"."workout_templates"
  validate constraint "workout_templates_user_id_fkey";

alter table "public"."workout_template_exercises"
  add constraint "workout_template_exercises_template_id_fkey"
  foreign key (template_id) references public.workout_templates(id) on delete cascade not valid;

alter table "public"."workout_template_exercises"
  validate constraint "workout_template_exercises_template_id_fkey";

alter table "public"."workout_template_exercises"
  add constraint "workout_template_exercises_exercise_id_fkey"
  foreign key (exercise_id) references public.exercises(id) not valid;

alter table "public"."workout_template_exercises"
  validate constraint "workout_template_exercises_exercise_id_fkey";

alter table "public"."workout_template_sets"
  add constraint "workout_template_sets_template_exercise_id_fkey"
  foreign key (template_exercise_id) references public.workout_template_exercises(id) on delete cascade not valid;

alter table "public"."workout_template_sets"
  validate constraint "workout_template_sets_template_exercise_id_fkey";

alter table "public"."workout_template_exercises"
  add constraint "workout_template_exercises_template_position_key"
  unique (template_id, position);

alter table "public"."workout_template_sets"
  add constraint "workout_template_sets_template_exercise_position_key"
  unique (template_exercise_id, position);

grant select, insert, update, delete on table "public"."workout_templates" to "authenticated";
grant select, insert, update, delete on table "public"."workout_templates" to "service_role";

grant select, insert, update, delete on table "public"."workout_template_exercises" to "authenticated";
grant select, insert, update, delete on table "public"."workout_template_exercises" to "service_role";

grant select, insert, update, delete on table "public"."workout_template_sets" to "authenticated";
grant select, insert, update, delete on table "public"."workout_template_sets" to "service_role";

create policy "workout_templates: select own"
on "public"."workout_templates"
as permissive
for select
to public
using ((auth.uid() = user_id));

create policy "workout_templates: insert own"
on "public"."workout_templates"
as permissive
for insert
to public
with check ((auth.uid() = user_id));

create policy "workout_templates: update own"
on "public"."workout_templates"
as permissive
for update
to public
using ((auth.uid() = user_id));

create policy "workout_templates: delete own"
on "public"."workout_templates"
as permissive
for delete
to public
using ((auth.uid() = user_id));

create policy "workout_template_exercises: select own"
on "public"."workout_template_exercises"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM public.workout_templates wt
  WHERE ((wt.id = workout_template_exercises.template_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_exercises: insert own"
on "public"."workout_template_exercises"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM public.workout_templates wt
  WHERE ((wt.id = workout_template_exercises.template_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_exercises: update own"
on "public"."workout_template_exercises"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM public.workout_templates wt
  WHERE ((wt.id = workout_template_exercises.template_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_exercises: delete own"
on "public"."workout_template_exercises"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM public.workout_templates wt
  WHERE ((wt.id = workout_template_exercises.template_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_sets: select own"
on "public"."workout_template_sets"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM public.workout_template_exercises wte
   JOIN public.workout_templates wt ON ((wt.id = wte.template_id))
  WHERE ((wte.id = workout_template_sets.template_exercise_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_sets: insert own"
on "public"."workout_template_sets"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM public.workout_template_exercises wte
   JOIN public.workout_templates wt ON ((wt.id = wte.template_id))
  WHERE ((wte.id = workout_template_sets.template_exercise_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_sets: update own"
on "public"."workout_template_sets"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM public.workout_template_exercises wte
   JOIN public.workout_templates wt ON ((wt.id = wte.template_id))
  WHERE ((wte.id = workout_template_sets.template_exercise_id) AND (wt.user_id = auth.uid())))));

create policy "workout_template_sets: delete own"
on "public"."workout_template_sets"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM public.workout_template_exercises wte
   JOIN public.workout_templates wt ON ((wt.id = wte.template_id))
  WHERE ((wte.id = workout_template_sets.template_exercise_id) AND (wt.user_id = auth.uid())))));