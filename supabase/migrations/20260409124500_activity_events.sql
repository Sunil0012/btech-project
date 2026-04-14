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
