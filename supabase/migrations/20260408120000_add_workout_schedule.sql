create table "public"."workout_schedule" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "workout_id" uuid,
  "workout_name" text not null,
  "scheduled_for" timestamp with time zone not null,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."workout_schedule" enable row level security;

create unique index workout_schedule_pkey on public.workout_schedule using btree (id);
create index workout_schedule_user_scheduled_idx on public.workout_schedule using btree (user_id, scheduled_for);

alter table "public"."workout_schedule"
  add constraint "workout_schedule_pkey" primary key using index "workout_schedule_pkey";

alter table "public"."workout_schedule"
  add constraint "workout_schedule_user_id_fkey"
  foreign key (user_id) references public.users(id) on delete cascade not valid;

alter table "public"."workout_schedule"
  validate constraint "workout_schedule_user_id_fkey";

alter table "public"."workout_schedule"
  add constraint "workout_schedule_workout_id_fkey"
  foreign key (workout_id) references public.workouts(id) on delete set null not valid;

alter table "public"."workout_schedule"
  validate constraint "workout_schedule_workout_id_fkey";

grant select, insert, update, delete on table "public"."workout_schedule" to "authenticated";
grant select, insert, update, delete on table "public"."workout_schedule" to "service_role";

create policy "workout_schedule: select own"
on "public"."workout_schedule"
as permissive
for select
to public
using ((auth.uid() = user_id));

create policy "workout_schedule: insert own"
on "public"."workout_schedule"
as permissive
for insert
to public
with check ((auth.uid() = user_id));

create policy "workout_schedule: update own"
on "public"."workout_schedule"
as permissive
for update
to public
using ((auth.uid() = user_id));

create policy "workout_schedule: delete own"
on "public"."workout_schedule"
as permissive
for delete
to public
using ((auth.uid() = user_id));
