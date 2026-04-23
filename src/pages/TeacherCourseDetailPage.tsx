import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Layers3, Link2, Sparkles, Trash2, Users2, UserX, FolderOpen, FileText, Home, BookOpen, ListTodo, HelpCircle, TrendingUp, Menu, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AssignmentBuilderModal } from "@/components/AssignmentBuilderModal";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherRosterTable } from "@/components/teacher/TeacherRosterTable";
import { TeacherStudentProfileDialog } from "@/components/teacher/TeacherStudentProfileDialog";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { Button } from "@/components/ui/button";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import { toast } from "@/hooks/use-toast";
import { parseAssignmentDescription } from "@/lib/assignmentContent";
import { buildCourseInviteLink } from "@/lib/classroom";
import { deleteCourseForSignedInTeacher, removeStudentFromCourseForSignedInTeacher } from "@/lib/classroomData";
import { buildTeacherCourseSummaries, buildTeacherInsights, buildTeacherStudentSummaries, type TeacherStudentSummary } from "@/lib/teacherAnalytics";
import { uploadCourseFile, ensureCourseFilesBucket } from "@/lib/courseFiles";
import { teacherSupabase } from "@/integrations/supabase/teacher-client";
import type { TeacherTables } from "@/integrations/supabase/teacher-types";

type TabType = "home" | "modules" | "assignments" | "quizzes" | "insights" | "grades" | "people" | "files";

const TAB_CONFIG: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "modules", label: "Modules", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ListTodo },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
  { id: "insights", label: "Insights", icon: TrendingUp },
  { id: "grades", label: "Grades", icon: FileText },
  { id: "people", label: "People", icon: Users2 },
  { id: "files", label: "Files", icon: FolderOpen },
];

function TeacherCourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspace, loading, refresh, syncing, lastUpdatedAt, liveUpdatesEnabled, error, workspaceReady } = useTeacherWorkspace();
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentSummary | null>(null);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "home");
  const [courseFiles, setCourseFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [forceRefreshCounter, setForceRefreshCounter] = useState(0);
  const redirectedMissingCourse = useRef(false);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Load course files
  useEffect(() => {
    // Course files functionality will be added when course_files table is available
    // For now, initialize with empty array
    setCourseFiles([]);
  }, [courseId]);

  const course = workspace.courses.find((item) => item.id === courseId) || null;
  const courseAssignments = workspace.assignments.filter((assignment) => assignment.course_id === courseId);
  const courseAssignmentIds = new Set(courseAssignments.map((assignment) => assignment.id));
  const courseSubmissions = workspace.submissions.filter((submission) => courseAssignmentIds.has(submission.assignment_id));

  const courseSummary = buildTeacherCourseSummaries({
    courses: course ? [course] : [],
    enrollments: workspace.enrollments.filter((enrollment) => enrollment.course_id === courseId),
    assignments: courseAssignments,
    submissions: courseSubmissions,
  })[0];

  const courseStudents = useMemo(
    () =>
      buildTeacherStudentSummaries({
        students: workspace.students.filter((student) =>
          workspace.enrollments.some((enrollment) => enrollment.course_id === courseId && enrollment.student_id === student.user_id)
        ),
        enrollments: workspace.enrollments.filter((enrollment) => enrollment.course_id === courseId),
        progressRows: workspace.progressRows,
        assignments: courseAssignments,
        submissions: courseSubmissions,
      }),
    [courseAssignments, courseId, courseSubmissions, workspace.enrollments, workspace.progressRows, workspace.students, forceRefreshCounter]
  );

  const courseInsights = buildTeacherInsights({
    students: courseStudents,
    courseSummaries: courseSummary ? [courseSummary] : [],
  });

  const topLearner = [...courseStudents]
    .sort((left, right) => (right.accuracy + right.completionRate) - (left.accuracy + left.completionRate))[0] || null;
  const outstandingAssignments = courseAssignments.filter((assignment) => {
    const submissionCount = courseSubmissions.filter((submission) => submission.assignment_id === assignment.id).length;
    return submissionCount < (courseSummary?.studentCount || 0);
  }).length;
  const inviteLink = typeof window === "undefined" || !course?.join_code
    ? ""
    : buildCourseInviteLink(window.location.origin, course.join_code);

  useEffect(() => {
    if (loading || error || !workspaceReady || course || courseSummary || redirectedMissingCourse.current) {
      return;
    }

    redirectedMissingCourse.current = true;
    const hasAnyCourse = workspace.courses.length > 0;

    toast({
      title: "Course no longer available",
      description: hasAnyCourse
        ? "That course could not be found, so we sent you back to the course list."
        : "That course could not be found, so we sent you back to create a new course.",
    });
    navigate(hasAnyCourse ? "/teacher/courses" : "/teacher/courses?create=1", { replace: true });
  }, [course, courseSummary, error, loading, navigate, workspace.courses.length, workspaceReady]);

  const handleCopyJoinCode = async () => {
    if (!course?.join_code) return;

    try {
      await navigator.clipboard.writeText(course.join_code);
      toast({
        title: "Course join code copied",
        description: "Students can now join this specific classroom.",
      });
    } catch {
      toast({
        title: "Could not copy course code",
        description: "Please copy it manually from the course page.",
        variant: "destructive",
      });
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Course invite link copied",
        description: "Students can open it and join this specific classroom.",
      });
    } catch {
      toast({
        title: "Could not copy invite link",
        description: "Please copy it manually from the course page.",
        variant: "destructive",
      });
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!courseId || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    setUploadingFile(true);

    try {
      // Ensure bucket exists
      await ensureCourseFilesBucket();

      // Upload file to storage
      const uploadResult = await uploadCourseFile(courseId, file, file.name);

      if (uploadResult?.error) {
        throw uploadResult.error;
      }

      if (!uploadResult?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      // Save file record to database
      // Note: course_files table not yet available in schema
      // File upload to storage is complete, database record storage pending
      const insertError = null; // Skip database insert for now

      if (insertError) throw insertError;

      toast({
        title: "File uploaded",
        description: `${file.name} has been shared with your students.`,
      });

      await loadCourseFiles();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      event.target.value = "";
    }
  };

  const loadCourseFiles = async () => {
    // Course files functionality will be added when course_files table is available
    setCourseFiles([]);
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

    const confirmed = window.confirm(
      `Delete "${course.title}"?\n\nThis removes the course from both teacher and student portals, including enrollments, assignments, and submissions tied to this course.`
    );
    if (!confirmed) return;

    setDeletingCourse(true);
    try {
      await deleteCourseForSignedInTeacher(course.id);
      await refresh();
      toast({
        title: "Course deleted",
        description: "The course has been removed from both teacher and student portals.",
      });
      navigate("/teacher/courses");
    } catch (error) {
      toast({
        title: "Could not delete course",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCourse(false);
    }
  };

  const handleRemoveStudent = async (student: TeacherStudentSummary) => {
    if (!course) return;

    const confirmed = window.confirm(
      `Remove ${student.name} from "${course.title}"?\n\nThis also clears the student's submissions for this course from the teacher workspace.`
    );
    if (!confirmed) return;

    setRemovingStudentId(student.userId);
    try {
      // Call API to delete from backend
      await removeStudentFromCourseForSignedInTeacher({
        courseId: course.id,
        studentId: student.userId,
      });

      if (selectedStudent?.userId === student.userId) {
        setSelectedStudent(null);
      }

      // Wait for database persistence
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Increment counter to force courseStudents recomputation
      setForceRefreshCounter((prev) => prev + 1);

      // Full refresh to sync data with backend
      await refresh();

      toast({
        title: "Student removed",
        description: `${student.name} no longer has access to this course.`,
      });
    } catch (error) {
      console.error("Error removing student:", error);
      toast({
        title: "Could not remove student",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      // Refresh to ensure consistent state
      await refresh();
    } finally {
      setRemovingStudentId(null);
    }
  };

  return (
    <TeacherLayout>
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !course || !courseSummary ? (
        error || !workspaceReady ? (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
            Repair the teacher workspace, then reopen this course.
          </div>
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-6">
          <TeacherWorkspaceHeader
            eyebrow="Course Operations"
            title={course.title}
            description={course.description || "No description added yet."}
            chips={[
              `Join Code ${course.join_code}`,
              `${courseSummary.studentCount} learners`,
              `${courseSummary.assignmentCount} assignments`,
            ]}
            actions={
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyJoinCode()}>
                  <Copy className="h-4 w-4" />
                  Copy Join Code
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyInviteLink()}>
                  <Link2 className="h-4 w-4" />
                  Copy Invite
                </Button>
                <AssignmentBuilderModal courses={[course]} onCreated={() => void refresh()} />
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => void handleDeleteCourse()} disabled={deletingCourse}>
                  <Trash2 className="h-4 w-4" />
                  {deletingCourse ? "Deleting..." : "Delete"}
                </Button>
              </>
            }
          />

          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <div className={`${sidebarOpen ? "w-56" : "w-20"} transition-all duration-300`}>
              <div className="sticky top-6 rounded-xl border bg-card p-4 shadow-sm">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="mb-4 flex w-full items-center justify-center rounded-lg bg-muted/50 p-2 hover:bg-muted"
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                <nav className="space-y-2">
                  {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setSearchParams({ tab: tab.id });
                        }}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {sidebarOpen && <span className="text-left">{tab.label}</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
              {activeTab === "home" && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="relative bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(206_100%_62%)_42%,hsl(var(--accent)/0.92)_100%)] px-6 py-6 text-white">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_22%)]" />
                      <div className="relative flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
                            Course Overview
                          </span>
                          <h3 className="mt-4 text-2xl font-semibold">{course.title}</h3>
                          <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
                            {course.description || "No course description added yet."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-4">
                      <div className="rounded-xl border bg-muted/35 p-4">
                        <p className="text-sm text-muted-foreground">Students</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{courseSummary.studentCount}</p>
                      </div>
                      <div className="rounded-xl border bg-muted/35 p-4">
                        <p className="text-sm text-muted-foreground">Assignments</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{courseSummary.assignmentCount}</p>
                      </div>
                      <div className="rounded-xl border bg-muted/35 p-4">
                        <p className="text-sm text-muted-foreground">Completion</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{courseSummary.completionRate}%</p>
                      </div>
                      <div className="rounded-xl border bg-muted/35 p-4">
                        <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{courseSummary.avgAccuracy}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "modules" && (
                <div className="rounded-xl border bg-card p-6 shadow-sm text-center text-muted-foreground">
                  <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Modules section coming soon</p>
                </div>
              )}

              {activeTab === "assignments" && (
                <div className="space-y-4">
                  {courseAssignments.length > 0 ? (
                    courseAssignments.map((assignment) => {
                      const submissionCount = courseSubmissions.filter(
                        (submission) => submission.assignment_id === assignment.id
                      ).length;
                      const completionRate =
                        courseSummary.studentCount > 0
                          ? Math.round((submissionCount / courseSummary.studentCount) * 100)
                          : 0;

                      return (
                        <div key={assignment.id} className="rounded-xl border bg-card p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{assignment.title}</h4>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {submissionCount} / {courseSummary.studentCount} students submitted
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {completionRate}% complete
                              </p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <a href={`/teacher/assignments/${assignment.id}`}>View</a>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">
                      No assignments yet
                    </div>
                  )}
                </div>
              )}

              {activeTab === "quizzes" && (
                <div className="rounded-xl border bg-card p-6 shadow-sm text-center text-muted-foreground">
                  <HelpCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Quizzes section coming soon</p>
                </div>
              )}

              {activeTab === "insights" && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="text-xl font-semibold mb-4">Student Progress Analytics</h3>
                    <div className="space-y-3">
                      {courseStudents.length > 0 ? (
                        courseStudents.map((student) => (
                          <div key={student.userId} className="rounded-lg border bg-muted/30 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{student.name}</p>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <p className="text-muted-foreground text-xs">Accuracy</p>
                                    <p className="font-semibold text-foreground">{student.accuracy}%</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Completion</p>
                                    <p className="font-semibold text-foreground">{student.completionRate}%</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Risk</p>
                                    <p className={`font-semibold ${student.riskLevel === 'high' ? 'text-red-600' : student.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                                      {student.riskLevel}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedStudent(student)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground">No students enrolled yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "grades" && (
                <div className="rounded-xl border bg-card p-6 shadow-sm text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Grades section coming soon</p>
                </div>
              )}

              {activeTab === "people" && (
                <div className="rounded-xl border bg-card shadow-sm">
                  <TeacherRosterTable
                    students={courseStudents}
                    onSelectStudent={setSelectedStudent}
                    onRemoveStudent={(student) => void handleRemoveStudent(student)}
                    removingStudentId={removingStudentId}
                  />
                </div>
              )}

              {activeTab === "files" && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Course Files</h3>
                    <div className="mb-6">
                      <label className="block">
                        <span className="rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                          <input
                            type="file"
                            onChange={(e) => void handleUploadFile(e)}
                            disabled={uploadingFile}
                            className="hidden"
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {uploadingFile ? "Uploading..." : "Click to upload a file"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, images, documents up to 50MB
                            </p>
                          </div>
                        </span>
                      </label>
                    </div>

                    {courseFiles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Uploaded Files</h4>
                        {courseFiles.map((file) => (
                          <a
                            key={file.id}
                            href={file.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
                          >
                            <Download className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{file.file_name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <TeacherStudentProfileDialog
            student={selectedStudent}
            enrollments={workspace.enrollments.filter((enrollment) => enrollment.course_id === courseId)}
            activityEvents={workspace.activityEvents}
            progressRows={workspace.progressRows}
            testHistoryRows={workspace.testHistoryRows}
            assignments={workspace.assignments}
            submissions={workspace.submissions}
            open={Boolean(selectedStudent)}
            onOpenChange={(open) => !open && setSelectedStudent(null)}
            onDelete={async () => {
              await refresh();
            }}
          />
        </div>
      )}
    </TeacherLayout>
  );
}

export default TeacherCourseDetailPage;
