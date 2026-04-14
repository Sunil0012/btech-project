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
