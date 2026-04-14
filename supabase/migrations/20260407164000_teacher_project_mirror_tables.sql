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
