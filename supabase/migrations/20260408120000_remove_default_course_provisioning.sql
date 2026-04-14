CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  normalized_role TEXT := CASE
    WHEN lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student')) = 'teacher' THEN 'teacher'
    ELSE 'student'
  END;
  normalized_name TEXT := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  generated_teacher_uid TEXT := upper(COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'teacher_uid', ''),
    substring(replace(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8)
  ));
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    normalized_name,
    NEW.email,
    normalized_role
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_at = now();

  IF normalized_role = 'teacher' THEN
    INSERT INTO teacher.teachers (user_id, teacher_uid)
    VALUES (NEW.id, generated_teacher_uid)
    ON CONFLICT (user_id) DO UPDATE
      SET teacher_uid = EXCLUDED.teacher_uid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public, teacher;
