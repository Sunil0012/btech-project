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
