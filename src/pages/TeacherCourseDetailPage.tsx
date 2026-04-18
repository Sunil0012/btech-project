import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Layers3, Link2, Sparkles, Trash2, Users2, UserX, FolderOpen, FileText } from "lucide-react";
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
import { teacherSupabase } from "@/integrations/supabase/teacher-client";
import type { TeacherTables } from "@/integrations/supabase/teacher-types";

function TeacherCourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspace, loading, refresh, syncing, lastUpdatedAt, liveUpdatesEnabled, error, workspaceReady } = useTeacherWorkspace();
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentSummary | null>(null);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "assignments" | "people" | "files">((searchParams.get("tab") as any) || "overview");
  const [courseFiles, setCourseFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const redirectedMissingCourse = useRef(false);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Load course files
  useEffect(() => {
    if (!courseId) return;

    const loadFiles = async () => {
      try {
        const { data: files, error } = await teacherSupabase
          .from("course_files")
          .select("*")
          .eq("course_id", courseId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCourseFiles(files || []);
      } catch (error) {
        console.error("Failed to load files:", error);
      }
    };

    loadFiles();
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
    [courseAssignments, courseId, courseSubmissions, workspace.enrollments, workspace.progressRows, workspace.students]
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
      // Upload to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await teacherSupabase.storage
        .from("course-files")
        .upload(`${courseId}/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = teacherSupabase.storage
        .from("course-files")
        .getPublicUrl(`${courseId}/${fileName}`);

      // Save file record
      const { error: insertError } = await teacherSupabase
        .from("course_files")
        .insert({
          course_id: courseId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          uploaded_by: workspace.profile?.user_id || "",
        });

      if (insertError) throw insertError;

      toast({
        title: "File uploaded",
        description: `${file.name} has been shared with your students.`,
      });

      await loadCourseFiles();
    } catch (error) {
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
    if (!courseId) return;
    try {
      const { data: files, error } = await teacherSupabase
        .from("course_files")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCourseFiles(files || []);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
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
      await removeStudentFromCourseForSignedInTeacher({
        courseId: course.id,
        studentId: student.userId,
      });
      if (selectedStudent?.userId === student.userId) {
        setSelectedStudent(null);
      }
      await refresh();
      toast({
        title: "Student removed",
        description: `${student.name} no longer has access to this course.`,
      });
    } catch (error) {
      toast({
        title: "Could not remove student",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
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
        <>
        <div className="space-y-6">
          <TeacherWorkspaceHeader
            eyebrow="Course Operations"
            title={course.title}
            description={course.description || "No description added yet."}
            chips={[
              `Join Code ${course.join_code}`,
              `${courseSummary.studentCount} learners`,
              `${courseSummary.assignmentCount} assignments`,
              liveUpdatesEnabled
                ? syncing
                  ? "Syncing course data"
                  : lastUpdatedAt
                    ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
                    : "Live sync active"
                : "Live sync unavailable",
            ]}
            actions={
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyJoinCode()}>
                  <Copy className="h-4 w-4" />
                  Copy Join Code
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyInviteLink()}>
                  <Link2 className="h-4 w-4" />
                  Copy Invite Link
                </Button>
                {inviteLink && (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href={inviteLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open Invite
                    </a>
                  </Button>
                )}
                <AssignmentBuilderModal courses={[course]} onCreated={() => void refresh()} />
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => void handleDeleteCourse()} disabled={deletingCourse}>
                  {deletingCourse ? <Trash2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  {deletingCourse ? "Deleting..." : "Delete Course"}
                </Button>
              </>
            }
            aside={
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Average accuracy</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{courseSummary.avgAccuracy}%</p>
                </div>
                <div className="rounded-xl border border-warning/10 bg-warning/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-warning">Completion</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{courseSummary.completionRate}%</p>
                </div>
              </div>
            }
          />

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b bg-card rounded-t-lg px-6">
            {[
              { id: "overview" as const, label: "Overview", icon: Sparkles },
              { id: "assignments" as const, label: "Assignments", icon: Layers3 },
              { id: "people" as const, label: "People", icon: Users2 },
              { id: "files" as const, label: "Files", icon: FolderOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="relative bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(206_100%_62%)_42%,hsl(var(--accent)/0.92)_100%)] px-6 py-6 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_22%)]" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
                      Course Workspace
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold">{course.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
                      {course.description || "No course description added yet."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/12 px-4 py-3 text-right backdrop-blur">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">Join code</p>
                    <p className="mt-2 text-xl font-bold">{course.join_code}</p>
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
                  <p className="text-sm text-muted-foreground">Outstanding items</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{outstandingAssignments}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Course desk</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Teacher operating view</h3>
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Course health</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {courseSummary.studentCount > 0
                      ? `${courseSummary.studentCount} learners are connected to this course and ${courseSummary.completionRate}% of assigned work is complete.`
                      : "No learners are enrolled yet. Share the join code to start building the roster."}
                  </p>
                </div>
                <div className="rounded-xl border border-warning/10 bg-warning/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Recommended next move</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {courseInsights.suggestedAssignments[0] || "Create the next assignment once this course starts generating topic-level performance data."}
                  </p>
                </div>
                <div className="rounded-xl border border-success/10 bg-success/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Top learner signal</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {topLearner
                      ? `${topLearner.name} is leading this course at ${topLearner.accuracy}% accuracy and ${topLearner.completionRate}% completion.`
                      : "A top learner will appear here once the course has enough activity."}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-foreground">Roster control</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Open a student profile to review visual progress, or remove a learner from this course if they should no longer have access.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-background px-3 py-1.5 text-xs font-semibold text-rose-600">
                    <UserX className="h-3.5 w-3.5" />
                    Teacher-managed enrollment removal enabled
                  </div>
                </div>
              </div>
            </div>

            <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Course intelligence brief</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">What this classroom needs next</h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Weak topics across course</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {courseInsights.weakTopicsAcrossClass.map((topic) => (
                      <span key={topic} className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-medium text-primary">
                        {topic}
                      </span>
                    ))}
                    {courseInsights.weakTopicsAcrossClass.length === 0 && (
                      <span className="text-sm text-muted-foreground">No strong weak-topic pattern yet.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-warning/10 bg-warning/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Suggested assignment next</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {courseInsights.suggestedAssignments.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-foreground">Course spotlight</h3>
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Needs support</p>
                  <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {courseInsights.focusStudents.map((student) => (
                      <p key={student}>{student}</p>
                    ))}
                    {courseInsights.focusStudents.length === 0 && <p>No learners are flagged yet.</p>}
                  </div>
                </div>

                <div className="rounded-xl border bg-success/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Leading performers</p>
                  <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {courseInsights.topPerformers.map((student) => (
                      <p key={student}>{student}</p>
                    ))}
                    {courseInsights.topPerformers.length === 0 && <p>No top-performer trend yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Assignments in this course</h3>
                  <p className="text-sm text-muted-foreground">Review active work and submission counts by assignment.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {courseAssignments.map((assignment) => {
                  const submissionCount = courseSubmissions.filter((submission) => submission.assignment_id === assignment.id).length;
                  const assignmentContent = parseAssignmentDescription(assignment.description);
                  return (
                    <div key={assignment.id} className="rounded-xl border bg-muted/35 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{assignment.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{assignmentContent.body || "No assignment description provided."}</p>
                        </div>
                        <span className="rounded-full border border-primary/15 bg-card px-3 py-1 text-xs font-semibold text-primary">
                          {assignment.type === "test" ? "Assessment" : "Homework"}
                        </span>
                      </div>

                      {assignmentContent.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignmentContent.attachments.map((file) => (
                            <a
                              key={`${assignment.id}-${file.name}`}
                              href={file.dataUrl}
                              download={file.name}
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              <Download className="h-3.5 w-3.5 text-primary" />
                              {file.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Questions</p>
                          <p className="mt-1 font-semibold text-foreground">{assignment.question_count}</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Timer</p>
                          <p className="mt-1 font-semibold text-foreground">{assignment.timer_minutes} min</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Submissions</p>
                          <p className="mt-1 font-semibold text-foreground">{submissionCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {courseAssignments.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                    No assignments yet for this course.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Student roster</h3>
                    <p className="text-sm text-muted-foreground">Review accuracy, assignment completion, ELO, course activity, open visual student profiles, and remove learners when needed.</p>
                  </div>
                </div>
              </div>
              <TeacherRosterTable
                students={courseStudents}
                onSelectStudent={setSelectedStudent}
                onRemoveStudent={(student) => void handleRemoveStudent(student)}
                removingStudentId={removingStudentId}
              />
            </div>
          </section>
            </>
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Assignments in this course</h3>
                  <p className="text-sm text-muted-foreground">Review active work and submission counts by assignment.</p>
                </div>
              </div>

              <div className="space-y-3">
                {courseAssignments.map((assignment) => {
                  const submissionCount = courseSubmissions.filter((submission) => submission.assignment_id === assignment.id).length;
                  const assignmentContent = parseAssignmentDescription(assignment.description);
                  return (
                    <div key={assignment.id} className="rounded-xl border bg-muted/35 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{assignment.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{assignmentContent.body || "No assignment description provided."}</p>
                        </div>
                        <span className="rounded-full border border-primary/15 bg-card px-3 py-1 text-xs font-semibold text-primary">
                          {assignment.type === "test" ? "Assessment" : "Homework"}
                        </span>
                      </div>

                      {assignmentContent.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignmentContent.attachments.map((file) => (
                            <a
                              key={`${assignment.id}-${file.name}`}
                              href={file.dataUrl}
                              download={file.name}
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              <Download className="h-3.5 w-3.5 text-primary" />
                              {file.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Questions</p>
                          <p className="mt-1 font-semibold text-foreground">{assignment.question_count}</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Timer</p>
                          <p className="mt-1 font-semibold text-foreground">{assignment.timer_minutes} min</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Submissions</p>
                          <p className="mt-1 font-semibold text-foreground">{submissionCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {courseAssignments.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                    No assignments yet for this course.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* People Tab */}
          {activeTab === "people" && (
            <section className="space-y-4">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Student roster</h3>
                    <p className="text-sm text-muted-foreground">Review accuracy, assignment completion, ELO, course activity, open visual student profiles, and remove learners when needed.</p>
                  </div>
                </div>
              </div>
              <TeacherRosterTable
                students={courseStudents}
                onSelectStudent={setSelectedStudent}
                onRemoveStudent={(student) => void handleRemoveStudent(student)}
                removingStudentId={removingStudentId}
              />
            </section>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Course files</h3>
                    <p className="text-sm text-muted-foreground">Share resources and materials with your students.</p>
                  </div>
                </div>
                <label>
                  <input
                    type="file"
                    onChange={(e) => void handleUploadFile(e)}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                  <Button
                    asChild
                    variant="hero"
                    size="sm"
                    className="gap-2 cursor-pointer"
                    disabled={uploadingFile}
                  >
                    <span>
                      {uploadingFile ? "Uploading..." : "Upload File"}
                    </span>
                  </Button>
                </label>
              </div>

              {courseFiles.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No files shared yet.</p>
                  <p className="text-sm text-muted-foreground">Upload files to share them with your students.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate group-hover:text-primary">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}
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
          />
        </>
      )}
    </TeacherLayout>
  );
}

export default TeacherCourseDetailPage;
