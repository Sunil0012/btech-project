
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  elo_rating INTEGER NOT NULL DEFAULT 1500,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  study_goal TEXT DEFAULT 'crack_gate',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User progress table (per subject/topic)
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id TEXT NOT NULL,
  topic_id TEXT,
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  last_practiced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, subject_id, topic_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Test history table
CREATE TABLE public.test_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_type TEXT NOT NULL,
  subject_id TEXT,
  topic_id TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  violations INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own test history" ON public.test_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own test history" ON public.test_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Answered questions tracking
CREATE TABLE public.answered_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  was_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE public.answered_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own answers" ON public.answered_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON public.answered_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'teacher'));
  END IF;
END $$;

UPDATE public.profiles
SET email = auth_users.email,
    role = COALESCE(NULLIF(public.profiles.role, ''), 'student')
FROM auth.users AS auth_users
WHERE auth_users.id = public.profiles.user_id
  AND public.profiles.email IS NULL;

CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
  teacher_uid TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.teachers (user_id, teacher_uid)
SELECT
  public.profiles.user_id,
  upper(substring(replace(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8))
FROM public.profiles
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
  public.teachers.teacher_uid
FROM public.teachers
JOIN public.profiles ON public.profiles.user_id = public.teachers.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.courses
  WHERE public.courses.teacher_id = public.teachers.id
)
ON CONFLICT (join_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  subject_id TEXT,
  topic_id TEXT,
  difficulty TEXT NOT NULL DEFAULT 'mixed',
  question_count INTEGER NOT NULL DEFAULT 10,
  timer_minutes INTEGER NOT NULL DEFAULT 30,
  question_ids TEXT[] NOT NULL DEFAULT '{}',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  violations INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignments_type_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_type_check CHECK (type IN ('homework', 'test'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignments_difficulty_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_join_code ON public.courses(join_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read own teacher record" ON public.teachers;
CREATE POLICY "Teachers can read own teacher record"
  ON public.teachers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can insert own teacher record" ON public.teachers;
CREATE POLICY "Teachers can insert own teacher record"
  ON public.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can update own teacher record" ON public.teachers;
CREATE POLICY "Teachers can update own teacher record"
  ON public.teachers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can manage own courses" ON public.courses;
CREATE POLICY "Teachers can manage own courses"
  ON public.courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers
      WHERE public.teachers.id = public.courses.teacher_id
        AND public.teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teachers
      WHERE public.teachers.id = public.courses.teacher_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can discover courses" ON public.courses;
CREATE POLICY "Authenticated users can discover courses"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Students can read own enrollments" ON public.enrollments;
CREATE POLICY "Students can read own enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read course enrollments" ON public.enrollments;
CREATE POLICY "Teachers can read course enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.courses.id = public.enrollments.course_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can join courses" ON public.enrollments;
CREATE POLICY "Students can join courses"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can leave own enrollments" ON public.enrollments;
CREATE POLICY "Students can leave own enrollments"
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read classroom assignments" ON public.assignments;
CREATE POLICY "Teachers can read classroom assignments"
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.courses.id = public.assignments.course_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can read enrolled assignments" ON public.assignments;
CREATE POLICY "Students can read enrolled assignments"
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments
      WHERE public.enrollments.course_id = public.assignments.course_id
        AND public.enrollments.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can create assignments" ON public.assignments;
CREATE POLICY "Teachers can create assignments"
  ON public.assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.courses.id = public.assignments.course_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can update assignments" ON public.assignments;
CREATE POLICY "Teachers can update assignments"
  ON public.assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.courses.id = public.assignments.course_id
        AND public.teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.courses.id = public.assignments.course_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can delete assignments" ON public.assignments;
CREATE POLICY "Teachers can delete assignments"
  ON public.assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.courses.id = public.assignments.course_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can read own submissions" ON public.submissions;
CREATE POLICY "Students can read own submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read classroom submissions" ON public.submissions;
CREATE POLICY "Teachers can read classroom submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments
      JOIN public.courses ON public.courses.id = public.assignments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.assignments.id = public.submissions.assignment_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
CREATE POLICY "Students can create own submissions"
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1
      FROM public.assignments
      JOIN public.enrollments ON public.enrollments.course_id = public.assignments.course_id
      WHERE public.assignments.id = public.submissions.assignment_id
        AND public.enrollments.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
CREATE POLICY "Students can update own submissions"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view classroom profiles" ON public.profiles;
CREATE POLICY "Teachers can view classroom profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_id = public.profiles.user_id
        AND public.teachers.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.courses
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.teachers.user_id = public.profiles.user_id
        AND EXISTS (
          SELECT 1
          FROM public.enrollments
          WHERE public.enrollments.course_id = public.courses.id
            AND public.enrollments.student_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Teachers can read classroom progress" ON public.user_progress;
CREATE POLICY "Teachers can read classroom progress"
  ON public.user_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_id = public.user_progress.user_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can read classroom tests" ON public.test_history;
CREATE POLICY "Teachers can read classroom tests"
  ON public.test_history
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_id = public.test_history.user_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can read classroom answers" ON public.answered_questions;
CREATE POLICY "Teachers can read classroom answers"
  ON public.answered_questions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_id = public.answered_questions.user_id
        AND public.teachers.user_id = auth.uid()
    )
  );

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
  requested_teacher_code TEXT := upper(NULLIF(NEW.raw_user_meta_data->>'teacher_code', ''));
  default_course_title TEXT := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'course_title', ''),
    normalized_name || ' Classroom'
  );
  created_teacher_id UUID;
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
    INSERT INTO public.teachers (user_id, teacher_uid)
    VALUES (NEW.id, generated_teacher_uid)
    ON CONFLICT (user_id) DO UPDATE
      SET teacher_uid = EXCLUDED.teacher_uid
    RETURNING id INTO created_teacher_id;

    INSERT INTO public.courses (teacher_id, title, description, join_code)
    VALUES (
      created_teacher_id,
      default_course_title,
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'course_description', ''),
        'Primary classroom for teacher-led assignments and analytics.'
      ),
      upper(COALESCE(NULLIF(NEW.raw_user_meta_data->>'course_join_code', ''), generated_teacher_uid))
    )
    ON CONFLICT (join_code) DO NOTHING;
  ELSIF requested_teacher_code IS NOT NULL THEN
    INSERT INTO public.enrollments (student_id, course_id)
    SELECT NEW.id, public.courses.id
    FROM public.courses
    WHERE upper(public.courses.join_code) = requested_teacher_code
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public;
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
-- Teacher project migration for the dual-Supabase split.
-- Apply this on the teacher Supabase project after the shared classroom schema migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'student_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'student_external_id'
  ) THEN
    ALTER TABLE public.enrollments RENAME COLUMN student_id TO student_external_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'student_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'student_external_id'
  ) THEN
    ALTER TABLE public.submissions RENAME COLUMN student_id TO student_external_id;
  END IF;
END $$;

ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_student_id_fkey;

ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_external_id_course_id_key;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_assignment_id_student_external_id_key;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_student_external_id_course_id_key UNIQUE (student_external_id, course_id);

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_assignment_id_student_external_id_key UNIQUE (assignment_id, student_external_id);

CREATE TABLE IF NOT EXISTS public.student_profiles_mirror (
  student_external_id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  elo_rating INTEGER NOT NULL DEFAULT 1500,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_external_id UUID NOT NULL,
  subject_id TEXT NOT NULL,
  topic_id TEXT,
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  last_practiced TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_external_id, subject_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.student_test_history_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_external_id UUID NOT NULL,
  test_type TEXT NOT NULL,
  subject_id TEXT,
  topic_id TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  violations INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_external_id ON public.enrollments(student_external_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_external_id ON public.submissions(student_external_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_mirror_email ON public.student_profiles_mirror(email);
CREATE INDEX IF NOT EXISTS idx_student_progress_snapshots_student ON public.student_progress_snapshots(student_external_id);
CREATE INDEX IF NOT EXISTS idx_student_test_history_mirror_student ON public.student_test_history_mirror(student_external_id);

ALTER TABLE public.student_profiles_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_history_mirror ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read mirrored student profiles" ON public.student_profiles_mirror;
CREATE POLICY "Teachers can read mirrored student profiles"
  ON public.student_profiles_mirror
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_external_id = public.student_profiles_mirror.student_external_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can read mirrored student progress" ON public.student_progress_snapshots;
CREATE POLICY "Teachers can read mirrored student progress"
  ON public.student_progress_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_external_id = public.student_progress_snapshots.student_external_id
        AND public.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can read mirrored student tests" ON public.student_test_history_mirror;
CREATE POLICY "Teachers can read mirrored student tests"
  ON public.student_test_history_mirror
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments
      JOIN public.courses ON public.courses.id = public.enrollments.course_id
      JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
      WHERE public.enrollments.student_external_id = public.student_test_history_mirror.student_external_id
        AND public.teachers.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.touch_student_profile_mirror()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_student_profiles_mirror ON public.student_profiles_mirror;
CREATE TRIGGER trg_touch_student_profiles_mirror
BEFORE UPDATE ON public.student_profiles_mirror
FOR EACH ROW
EXECUTE FUNCTION public.touch_student_profile_mirror();

CREATE OR REPLACE FUNCTION public.touch_student_progress_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_student_progress_snapshots ON public.student_progress_snapshots;
CREATE TRIGGER trg_touch_student_progress_snapshots
BEFORE UPDATE ON public.student_progress_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.touch_student_progress_snapshot();
CREATE SCHEMA IF NOT EXISTS teacher;

GRANT USAGE ON SCHEMA teacher TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA teacher TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA teacher TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA teacher TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA teacher
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA teacher
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA teacher
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'student_external_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'student_id'
  ) THEN
    ALTER TABLE public.enrollments RENAME COLUMN student_external_id TO student_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'student_external_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'student_id'
  ) THEN
    ALTER TABLE public.submissions RENAME COLUMN student_external_id TO student_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.teachers') IS NOT NULL AND to_regclass('teacher.teachers') IS NULL THEN
    ALTER TABLE public.teachers SET SCHEMA teacher;
  END IF;

  IF to_regclass('public.courses') IS NOT NULL AND to_regclass('teacher.courses') IS NULL THEN
    ALTER TABLE public.courses SET SCHEMA teacher;
  END IF;

  IF to_regclass('public.enrollments') IS NOT NULL AND to_regclass('teacher.enrollments') IS NULL THEN
    ALTER TABLE public.enrollments SET SCHEMA teacher;
  END IF;

  IF to_regclass('public.assignments') IS NOT NULL AND to_regclass('teacher.assignments') IS NULL THEN
    ALTER TABLE public.assignments SET SCHEMA teacher;
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL AND to_regclass('teacher.submissions') IS NULL THEN
    ALTER TABLE public.submissions SET SCHEMA teacher;
  END IF;
END $$;

ALTER TABLE IF EXISTS teacher.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_external_id_course_id_key;

ALTER TABLE IF EXISTS teacher.submissions
  DROP CONSTRAINT IF EXISTS submissions_assignment_id_student_external_id_key;

ALTER TABLE IF EXISTS teacher.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_external_id_fkey;

ALTER TABLE IF EXISTS teacher.submissions
  DROP CONSTRAINT IF EXISTS submissions_student_external_id_fkey;

ALTER TABLE IF EXISTS teacher.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;

ALTER TABLE IF EXISTS teacher.submissions
  DROP CONSTRAINT IF EXISTS submissions_student_id_fkey;

ALTER TABLE IF EXISTS teacher.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_student_id_course_id_key;

ALTER TABLE IF EXISTS teacher.submissions
  DROP CONSTRAINT IF EXISTS submissions_assignment_id_student_id_key;

DO $$
BEGIN
  IF to_regclass('teacher.enrollments') IS NOT NULL THEN
    ALTER TABLE teacher.enrollments
      ADD CONSTRAINT enrollments_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

    ALTER TABLE teacher.enrollments
      ADD CONSTRAINT enrollments_student_id_course_id_key UNIQUE (student_id, course_id);
  END IF;

  IF to_regclass('teacher.submissions') IS NOT NULL THEN
    ALTER TABLE teacher.submissions
      ADD CONSTRAINT submissions_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

    ALTER TABLE teacher.submissions
      ADD CONSTRAINT submissions_assignment_id_student_id_key UNIQUE (assignment_id, student_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON teacher.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON teacher.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON teacher.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_join_code ON teacher.courses(join_code);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON teacher.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON teacher.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON teacher.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON teacher.submissions(student_id);

ALTER TABLE IF EXISTS teacher.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read own teacher record" ON teacher.teachers;
CREATE POLICY "Teachers can read own teacher record"
  ON teacher.teachers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can insert own teacher record" ON teacher.teachers;
CREATE POLICY "Teachers can insert own teacher record"
  ON teacher.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can update own teacher record" ON teacher.teachers;
CREATE POLICY "Teachers can update own teacher record"
  ON teacher.teachers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can manage own courses" ON teacher.courses;
CREATE POLICY "Teachers can manage own courses"
  ON teacher.courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.teachers
      WHERE teacher.teachers.id = teacher.courses.teacher_id
        AND teacher.teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM teacher.teachers
      WHERE teacher.teachers.id = teacher.courses.teacher_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can discover courses" ON teacher.courses;
CREATE POLICY "Authenticated users can discover courses"
  ON teacher.courses
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Students can read own enrollments" ON teacher.enrollments;
CREATE POLICY "Students can read own enrollments"
  ON teacher.enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read course enrollments" ON teacher.enrollments;
CREATE POLICY "Teachers can read course enrollments"
  ON teacher.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = teacher.enrollments.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can join courses" ON teacher.enrollments;
CREATE POLICY "Students can join courses"
  ON teacher.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can leave own enrollments" ON teacher.enrollments;
CREATE POLICY "Students can leave own enrollments"
  ON teacher.enrollments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read classroom assignments" ON teacher.assignments;
CREATE POLICY "Teachers can read classroom assignments"
  ON teacher.assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = teacher.assignments.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can read enrolled assignments" ON teacher.assignments;
CREATE POLICY "Students can read enrolled assignments"
  ON teacher.assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.enrollments
      WHERE teacher.enrollments.course_id = teacher.assignments.course_id
        AND teacher.enrollments.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can create assignments" ON teacher.assignments;
CREATE POLICY "Teachers can create assignments"
  ON teacher.assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = teacher.assignments.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can update assignments" ON teacher.assignments;
CREATE POLICY "Teachers can update assignments"
  ON teacher.assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = teacher.assignments.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = teacher.assignments.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can delete assignments" ON teacher.assignments;
CREATE POLICY "Teachers can delete assignments"
  ON teacher.assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = teacher.assignments.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can read own submissions" ON teacher.submissions;
CREATE POLICY "Students can read own submissions"
  ON teacher.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read classroom submissions" ON teacher.submissions;
CREATE POLICY "Teachers can read classroom submissions"
  ON teacher.submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher.assignments
      JOIN teacher.courses ON teacher.courses.id = teacher.assignments.course_id
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.assignments.id = teacher.submissions.assignment_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can create own submissions" ON teacher.submissions;
CREATE POLICY "Students can create own submissions"
  ON teacher.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1
      FROM teacher.assignments
      JOIN teacher.enrollments ON teacher.enrollments.course_id = teacher.assignments.course_id
      WHERE teacher.assignments.id = teacher.submissions.assignment_id
        AND teacher.enrollments.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can update own submissions" ON teacher.submissions;
CREATE POLICY "Students can update own submissions"
  ON teacher.submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view classroom profiles" ON public.profiles;
CREATE POLICY "Teachers can view classroom profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM teacher.enrollments
      JOIN teacher.courses ON teacher.courses.id = teacher.enrollments.course_id
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.enrollments.student_id = public.profiles.user_id
        AND teacher.teachers.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.teachers.user_id = public.profiles.user_id
        AND EXISTS (
          SELECT 1
          FROM teacher.enrollments
          WHERE teacher.enrollments.course_id = teacher.courses.id
            AND teacher.enrollments.student_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Teachers can read classroom progress" ON public.user_progress;
CREATE POLICY "Teachers can read classroom progress"
  ON public.user_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM teacher.enrollments
      JOIN teacher.courses ON teacher.courses.id = teacher.enrollments.course_id
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.enrollments.student_id = public.user_progress.user_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can read classroom tests" ON public.test_history;
CREATE POLICY "Teachers can read classroom tests"
  ON public.test_history
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM teacher.enrollments
      JOIN teacher.courses ON teacher.courses.id = teacher.enrollments.course_id
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.enrollments.student_id = public.test_history.user_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can read classroom answers" ON public.answered_questions;
CREATE POLICY "Teachers can read classroom answers"
  ON public.answered_questions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM teacher.enrollments
      JOIN teacher.courses ON teacher.courses.id = teacher.enrollments.course_id
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.enrollments.student_id = public.answered_questions.user_id
        AND teacher.teachers.user_id = auth.uid()
    )
  );

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
  requested_teacher_code TEXT := upper(NULLIF(NEW.raw_user_meta_data->>'teacher_code', ''));
  default_course_title TEXT := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'course_title', ''),
    normalized_name || ' Classroom'
  );
  created_teacher_id UUID;
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
      SET teacher_uid = EXCLUDED.teacher_uid
    RETURNING id INTO created_teacher_id;

    INSERT INTO teacher.courses (teacher_id, title, description, join_code)
    VALUES (
      created_teacher_id,
      default_course_title,
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'course_description', ''),
        'Primary classroom for teacher-led assignments and analytics.'
      ),
      upper(COALESCE(NULLIF(NEW.raw_user_meta_data->>'course_join_code', ''), generated_teacher_uid))
    )
    ON CONFLICT (join_code) DO NOTHING;
  ELSIF requested_teacher_code IS NOT NULL THEN
    INSERT INTO teacher.enrollments (student_id, course_id)
    SELECT NEW.id, teacher.courses.id
    FROM teacher.courses
    WHERE upper(teacher.courses.join_code) = requested_teacher_code
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public, teacher;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'teacher.teachers',
    'teacher.courses',
    'teacher.enrollments',
    'teacher.assignments',
    'teacher.submissions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = split_part(target_table, '.', 1)
        AND tablename = split_part(target_table, '.', 2)
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', target_table);
    END IF;
  END LOOP;
END $$;
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
DO $$
BEGIN
  IF to_regclass('teacher.enrollments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Teachers can remove course enrollments" ON teacher.enrollments';
    EXECUTE $policy$
      CREATE POLICY "Teachers can remove course enrollments"
        ON teacher.enrollments
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM teacher.courses
            JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
            WHERE teacher.courses.id = teacher.enrollments.course_id
              AND teacher.teachers.user_id = auth.uid()
          )
        )
    $policy$;
  END IF;

  IF to_regclass('public.enrollments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Teachers can remove course enrollments" ON public.enrollments';
    EXECUTE $policy$
      CREATE POLICY "Teachers can remove course enrollments"
        ON public.enrollments
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.courses
            JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
            WHERE public.courses.id = public.enrollments.course_id
              AND public.teachers.user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('teacher.submissions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Students can delete own submissions" ON teacher.submissions';
    EXECUTE $policy$
      CREATE POLICY "Students can delete own submissions"
        ON teacher.submissions
        FOR DELETE
        TO authenticated
        USING (auth.uid() = student_id)
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "Teachers can delete classroom submissions" ON teacher.submissions';
    EXECUTE $policy$
      CREATE POLICY "Teachers can delete classroom submissions"
        ON teacher.submissions
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM teacher.assignments
            JOIN teacher.courses ON teacher.courses.id = teacher.assignments.course_id
            JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
            WHERE teacher.assignments.id = teacher.submissions.assignment_id
              AND teacher.teachers.user_id = auth.uid()
          )
        )
    $policy$;
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Students can delete own submissions" ON public.submissions';
    EXECUTE $policy$
      CREATE POLICY "Students can delete own submissions"
        ON public.submissions
        FOR DELETE
        TO authenticated
        USING (
          auth.uid() = COALESCE(student_id, student_external_id)
        )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "Teachers can delete classroom submissions" ON public.submissions';
    EXECUTE $policy$
      CREATE POLICY "Teachers can delete classroom submissions"
        ON public.submissions
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.assignments
            JOIN public.courses ON public.courses.id = public.assignments.course_id
            JOIN public.teachers ON public.teachers.id = public.courses.teacher_id
            WHERE public.assignments.id = public.submissions.assignment_id
              AND public.teachers.user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('student', 'teacher')),
  actor_name TEXT,
  event_type TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES teacher.courses(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES teacher.assignments(id) ON DELETE SET NULL,
  question_id TEXT,
  subject_id TEXT,
  topic_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_actor_id
  ON public.activity_events(actor_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_target_user_id
  ON public.activity_events(target_user_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_course_id
  ON public.activity_events(course_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_assignment_id
  ON public.activity_events(assignment_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_created_at
  ON public.activity_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_event_type
  ON public.activity_events(event_type);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own activity events" ON public.activity_events;
CREATE POLICY "Users can insert own activity events"
  ON public.activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

DROP POLICY IF EXISTS "Users can read related activity events" ON public.activity_events;
CREATE POLICY "Users can read related activity events"
  ON public.activity_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = actor_id
    OR auth.uid() = target_user_id
    OR EXISTS (
      SELECT 1
      FROM teacher.courses
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.courses.id = public.activity_events.course_id
        AND teacher.teachers.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM teacher.enrollments
      JOIN teacher.courses ON teacher.courses.id = teacher.enrollments.course_id
      JOIN teacher.teachers ON teacher.teachers.id = teacher.courses.teacher_id
      WHERE teacher.teachers.user_id = auth.uid()
        AND (
          teacher.enrollments.student_id = public.activity_events.actor_id
          OR teacher.enrollments.student_id = public.activity_events.target_user_id
        )
    )
  );
alter table public.test_history
add column if not exists review_payload jsonb;
-- Create course_files table
CREATE TABLE IF NOT EXISTS teacher.course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES teacher.courses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON teacher.course_files TO authenticated;
GRANT ALL ON teacher.course_files TO service_role;

-- Create index
CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON teacher.course_files(course_id);

-- Enable RLS
ALTER TABLE teacher.course_files ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Teachers can view their course files"
  ON teacher.course_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher.courses c
      INNER JOIN teacher.teachers t ON c.teacher_id = t.id
      WHERE c.id = course_files.course_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can upload files to their courses"
  ON teacher.course_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher.courses c
      INNER JOIN teacher.teachers t ON c.teacher_id = t.id
      WHERE c.id = course_files.course_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete files from their courses"
  ON teacher.course_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teacher.courses c
      INNER JOIN teacher.teachers t ON c.teacher_id = t.id
      WHERE c.id = course_files.course_id
        AND t.user_id = auth.uid()
    )
  );
-- Create assignment_files table for proper file management
CREATE TABLE IF NOT EXISTS teacher.assignment_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES teacher.assignments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 1500000),
  file_data BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON teacher.assignment_files TO authenticated;
GRANT ALL ON teacher.assignment_files TO service_role;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_assignment_files_assignment_id ON teacher.assignment_files(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_files_created_by ON teacher.assignment_files(created_by);
CREATE INDEX IF NOT EXISTS idx_assignment_files_created_at ON teacher.assignment_files(created_at DESC);

-- Enable RLS
ALTER TABLE teacher.assignment_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Teachers can view files from their own assignments
CREATE POLICY "Teachers can view assignment files"
  ON teacher.assignment_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher.assignments a
      INNER JOIN teacher.courses c ON a.course_id = c.id
      INNER JOIN teacher.teachers t ON c.teacher_id = t.id
      WHERE a.id = assignment_files.assignment_id
        AND t.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM teacher.enrollments e
      INNER JOIN teacher.assignments a ON a.course_id = e.course_id
      WHERE a.id = assignment_files.assignment_id
        AND e.student_id = auth.uid()
    )
  );

-- Teachers can upload files to their assignments
CREATE POLICY "Teachers can upload assignment files"
  ON teacher.assignment_files FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM teacher.assignments a
      INNER JOIN teacher.courses c ON a.course_id = c.id
      INNER JOIN teacher.teachers t ON c.teacher_id = t.id
      WHERE a.id = assignment_files.assignment_id
        AND t.user_id = auth.uid()
    )
  );

-- Teachers can delete their own file uploads
CREATE POLICY "Teachers can delete assignment files"
  ON teacher.assignment_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teacher.assignments a
      INNER JOIN teacher.courses c ON a.course_id = c.id
      INNER JOIN teacher.teachers t ON c.teacher_id = t.id
      WHERE a.id = assignment_files.assignment_id
        AND t.user_id = auth.uid()
    )
  );
-- Keep test_history private by default, but allow explicit admin JWTs to read
-- student rows through the normal authenticated Supabase client.
--
-- The publishable key alone is still not an admin credential. To use this
-- policy, sign in as a user whose JWT app_metadata contains either:
--   {"role": "admin"} or {"app_role": "admin"} or {"roles": ["admin"]}

CREATE OR REPLACE FUNCTION public.current_user_is_project_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'app_role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin';
$$;

REVOKE ALL ON FUNCTION public.current_user_is_project_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_project_admin() TO authenticated;

GRANT SELECT ON public.test_history TO authenticated;
GRANT SELECT ON public.activity_events TO authenticated;

DROP POLICY IF EXISTS "Admins can read all test history" ON public.test_history;
CREATE POLICY "Admins can read all test history"
  ON public.test_history
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_project_admin());

DROP POLICY IF EXISTS "Admins can read all activity events" ON public.activity_events;
CREATE POLICY "Admins can read all activity events"
  ON public.activity_events
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_project_admin());
