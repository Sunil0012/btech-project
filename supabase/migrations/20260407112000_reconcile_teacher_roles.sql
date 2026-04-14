UPDATE public.profiles
SET
  role = CASE
    WHEN lower(COALESCE(auth_users.raw_user_meta_data->>'role', 'student')) = 'teacher' THEN 'teacher'
    ELSE 'student'
  END,
  email = COALESCE(public.profiles.email, auth_users.email),
  full_name = COALESCE(
    NULLIF(public.profiles.full_name, ''),
    NULLIF(auth_users.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(auth_users.email, ''), '@', 1)
  ),
  updated_at = now()
FROM auth.users AS auth_users
WHERE auth_users.id = public.profiles.user_id;

INSERT INTO public.teachers (user_id, teacher_uid)
SELECT
  public.profiles.user_id,
  upper(COALESCE(
    NULLIF(auth_users.raw_user_meta_data->>'teacher_uid', ''),
    substring(replace(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8)
  ))
FROM public.profiles
JOIN auth.users AS auth_users ON auth_users.id = public.profiles.user_id
WHERE public.profiles.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1
    FROM public.teachers
    WHERE public.teachers.user_id = public.profiles.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.courses (teacher_id, title, description, join_code)
SELECT
  public.teachers.id,
  COALESCE(NULLIF(public.profiles.full_name, ''), split_part(COALESCE(public.profiles.email, 'Teacher'), '@', 1)) || ' Classroom',
  'Primary classroom for teacher-led assignments and analytics.',
  COALESCE(NULLIF(auth_users.raw_user_meta_data->>'course_join_code', ''), public.teachers.teacher_uid)
FROM public.teachers
JOIN public.profiles ON public.profiles.user_id = public.teachers.user_id
JOIN auth.users AS auth_users ON auth_users.id = public.profiles.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.courses
  WHERE public.courses.teacher_id = public.teachers.id
)
ON CONFLICT (join_code) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
