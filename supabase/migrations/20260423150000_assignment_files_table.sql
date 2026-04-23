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
