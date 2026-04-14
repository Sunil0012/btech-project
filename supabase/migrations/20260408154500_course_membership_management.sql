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
