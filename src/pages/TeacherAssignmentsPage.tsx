import { ArrowRight, CalendarClock, ClipboardCheck, ClipboardList, Clock3, Download, Layers3, Send, Sparkles, Users2 } from "lucide-react";
import { AssignmentBuilderModal } from "@/components/AssignmentBuilderModal";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherMetricCard } from "@/components/teacher/TeacherMetricCard";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import { parseAssignmentDescription } from "@/lib/assignmentContent";
import { getAssignmentSubjectLabel } from "@/lib/classroom";

function TeacherAssignmentsPage() {
  const { workspace, loading, refresh } = useTeacherWorkspace();
  const now = Date.now();

  const assignmentRows = workspace.assignments
    .map((assignment) => {
      const course = workspace.courses.find((item) => item.id === assignment.course_id) || null;
      const studentCount = workspace.enrollments.filter((enrollment) => enrollment.course_id === assignment.course_id).length;
      const submissionCount = workspace.submissions.filter((submission) => submission.assignment_id === assignment.id).length;
      const completionRate = studentCount > 0 ? Math.round((submissionCount / studentCount) * 100) : 0;
      const dueAt = assignment.due_date ? new Date(assignment.due_date) : null;

      return {
        assignment,
        course,
        studentCount,
        submissionCount,
        completionRate,
        dueAt,
      };
    })
    .sort((left, right) => (left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER));

  const dueSoonCount = assignmentRows.filter((row) => {
    if (!row.dueAt) return false;
    const dueTime = row.dueAt.getTime();
    return dueTime >= now && dueTime <= now + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const awaitingResponseCount = assignmentRows.filter((row) => row.studentCount > row.submissionCount).length;
  const totalAssignedSlots = assignmentRows.reduce((sum, row) => sum + row.studentCount, 0);
  const averageResponseRate = totalAssignedSlots > 0
    ? Math.round((assignmentRows.reduce((sum, row) => sum + row.submissionCount, 0) / totalAssignedSlots) * 100)
    : 0;
  const lowResponseAssignments = assignmentRows
    .filter((row) => row.studentCount > 0)
    .slice()
    .sort((left, right) => left.completionRate - right.completionRate)
    .slice(0, 3);
  const recentSubmissions = workspace.submissions.slice(0, 6).map((submission) => {
    const assignment = workspace.assignments.find((item) => item.id === submission.assignment_id) || null;
    const student = workspace.students.find((item) => item.user_id === submission.student_id) || null;
    return { submission, assignment, student };
  });

  return (
    <TeacherLayout>
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <TeacherWorkspaceHeader
            eyebrow="Assignment Center"
            title="Publish, review, and monitor classroom work"
            description="Create coursework from a teacher-only publishing surface, then monitor submission gaps, due dates, and classroom response without stepping into the student product."
            chips={[
              `${workspace.assignments.length} total assignments`,
              `${workspace.submissions.length} submissions received`,
              `${workspace.courses.length} connected courses`,
            ]}
            actions={<AssignmentBuilderModal courses={workspace.courses} onCreated={() => void refresh()} />}
            aside={
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Teacher workflow</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Publish work per course, then use submissions and analytics to decide who needs revision, follow-up, or intervention.
                  </p>
                </div>
                <div className="rounded-xl border border-warning/10 bg-warning/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-warning">This week</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{dueSoonCount}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Assignments due within the next 7 days.</p>
                </div>
              </div>
            }
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TeacherMetricCard
              label="Assignments Published"
              value={workspace.assignments.length}
              detail="Active classroom items currently visible to learners."
              icon={ClipboardList}
              tone="blue"
            />
            <TeacherMetricCard
              label="Linked Courses"
              value={workspace.courses.length}
              detail="Classrooms receiving assignments from this portal."
              icon={Layers3}
              tone="orange"
            />
            <TeacherMetricCard
              label="Need Student Response"
              value={awaitingResponseCount}
              detail="Assignments with outstanding student submissions."
              icon={ClipboardCheck}
              tone="rose"
            />
            <TeacherMetricCard
              label="Average Response Rate"
              value={`${averageResponseRate}%`}
              detail="Submission coverage across all published coursework."
              icon={Sparkles}
              tone="green"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Publishing Queue</p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">All classroom work</h2>
                <p className="mt-2 text-muted-foreground">
                  Review active homework and assessments across all of your courses.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {assignmentRows.map(({ assignment, course, submissionCount, studentCount, completionRate, dueAt }) => {
                  const assignmentContent = parseAssignmentDescription(assignment.description);

                  return (
                    <div key={assignment.id} className="rounded-xl border bg-muted/25 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-primary">{course?.title || "Course"}</p>
                          <h3 className="mt-2 text-xl font-semibold text-foreground">{assignment.title}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-primary/15 bg-card px-3 py-1 text-xs font-semibold text-primary">
                            {assignment.type === "test" ? "Assessment" : "Homework"}
                          </span>
                          {assignmentContent.questionSource === "manual-quiz" && (
                            <span className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                              Manual quiz
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {assignmentContent.body || "No assignment description provided."}
                      </p>

                      {assignmentContent.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignmentContent.attachments.map((file) => (
                            <a
                              key={`${assignment.id}-${file.name}`}
                              href={file.dataUrl}
                              download={file.name}
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              <Download className="h-3.5 w-3.5 text-primary" />
                              {file.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Focus</p>
                          <p className="mt-1 font-semibold text-foreground">{getAssignmentSubjectLabel(assignment)}</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Difficulty</p>
                          <p className="mt-1 font-semibold capitalize text-foreground">{assignment.difficulty}</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Timer</p>
                          <p className="mt-1 flex items-center gap-1 font-semibold text-foreground">
                            <Clock3 className="h-3.5 w-3.5 text-warning" />
                            {assignment.timer_minutes} min
                          </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Coverage</p>
                          <p className="mt-1 font-semibold text-foreground">{completionRate}%</p>
                        </div>
                        <div className="rounded-xl border bg-card p-3">
                          <p className="text-muted-foreground">Question source</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {assignmentContent.questionSource === "manual-quiz" ? `${assignmentContent.manualQuestions.length} teacher-authored` : "Bank"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          <p className="font-semibold text-foreground">{submissionCount}/{studentCount || 0} submitted</p>
                          <p className="mt-1">Due {dueAt ? dueAt.toLocaleString() : "whenever students are ready"}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}

                {assignmentRows.length === 0 && (
                  <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground lg:col-span-2">
                    Assignments will appear here after you publish the first homework or assessment.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <CalendarClock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Operations board</h3>
                    <p className="text-sm text-muted-foreground">See what needs teacher attention before the next class cycle.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Users2 className="h-5 w-5 text-destructive" />
                  <h3 className="text-lg font-semibold text-foreground">Needs follow-up</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {lowResponseAssignments.map(({ assignment, course, completionRate, studentCount, submissionCount }) => (
                    <div key={assignment.id} className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                      <p className="font-semibold text-foreground">{assignment.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{course?.title || "Course"} - {completionRate}% response</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {submissionCount}/{studentCount} submitted
                      </p>
                    </div>
                  ))}
                  {lowResponseAssignments.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                      Publish coursework to start seeing follow-up recommendations here.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Publishing checklist</h3>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Use homework for guided revision and timed assessments for course checkpoints.</p>
                  <p>Set due dates when you want the assignment to show up in the weekly operations board.</p>
                  <p>Check low-response items first before publishing additional work to the same cohort.</p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-5 w-5 text-success" />
                  <h3 className="text-lg font-semibold text-foreground">Recent submissions</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {recentSubmissions.map(({ submission, assignment, student }) => (
                    <div key={submission.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="font-semibold text-foreground">{student?.full_name || student?.email || "Student"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{assignment?.title || "Assignment"}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Score {submission.score} - {submission.correct_answers}/{submission.total_questions} correct - {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {recentSubmissions.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                      Student submissions will appear here as soon as assignments are attempted.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </TeacherLayout>
  );
}

export default TeacherAssignmentsPage;
