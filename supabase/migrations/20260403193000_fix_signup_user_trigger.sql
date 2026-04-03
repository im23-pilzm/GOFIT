alter table "public"."users"
  alter column "username" drop not null;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (id, email, created_at, username)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$function$
;
