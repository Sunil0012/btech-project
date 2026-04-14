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
