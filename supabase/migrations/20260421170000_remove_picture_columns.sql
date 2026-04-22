alter table "public"."users"
  drop column if exists "avatar_url";

alter table "public"."exercises"
  drop column if exists "image_url";

alter table "public"."muscle_group"
  drop column if exists "image_url";
