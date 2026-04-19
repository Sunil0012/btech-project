import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Layers3,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherAnalyticsCharts } from "@/components/teacher/TeacherAnalyticsCharts";
import { TeacherMetricCard } from "@/components/teacher/TeacherMetricCard";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { Button } from "@/components/ui/button";
import { useTeacherAuth } from "@/contexts/AuthContext";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import {
  buildAssignmentCompletionData,
  buildPerformanceDistribution,
  buildRecentTeacherActivity,
  buildTeacherCourseSummaries,
  buildTeacherInsights,
  buildTeacherStudentSummaries,
} from "@/lib/teacherAnalytics";

function TeacherDashboardPage() {
  const { profile } = useTeacherAuth();
  const { workspace, loading, syncing, lastUpdatedAt, liveUpdatesEnabled, workspaceReady } = useTeacherWorkspace();

  const students = buildTeacherStudentSummaries({
    students: workspace.students,
    enrollments: workspace.enrollments,
    progressRows: workspace.progressRows,
    assignments: workspace.assignments,
    submissions: workspace.submissions,
  });
  const courseSummaries = buildTeacherCourseSummaries({
    courses: workspace.courses,
    enrollments: workspace.enrollments,
    assignments: workspace.assignments,
    submissions: workspace.submissions,
  });
  const performanceDistribution = buildPerformanceDistribution(students);
  const completionData = buildAssignmentCompletionData(courseSummaries);
  const activity = buildRecentTeacherActivity({
    enrollments: workspace.enrollments,
    assignments: workspace.assignments,
    submissions: workspace.submissions,
    students: workspace.students,
    tests: workspace.testHistoryRows,
  });
  const insights = buildTeacherInsights({
    students,
    courseSummaries,
  });

  const avgStudentPerformance = students.length > 0
    ? Math.round(students.reduce((sum, student) => sum + student.accuracy, 0) / students.length)
    : 0;
  const weakTopic = insights.weakTopicsAcrossClass[0] || "No weak-topic pattern yet";
  const nextAction = insights.suggestedAssignments[0] || "Publish an assignment to begin collecting classroom performance data.";
  const activeRiskCount = students.filter((student) => student.riskLevel === "high").length;
  const supportedLearnerCount = students.filter((student) => student.riskLevel !== "low").length;
  const activeCourseCount = courseSummaries.filter((course) => course.studentCount > 0).length;

  const assignmentBoard = workspace.assignments
    .map((assignment) => {
      const course = workspace.courses.find((item) => item.id === assignment.course_id) || null;
      const studentCount = workspace.enrollments.filter((enrollment) => enrollment.course_id === assignment.course_id).length;
      const submissionCount = workspace.submissions.filter((submission) => submission.assignment_id === assignment.id).length;
      const completionRate = studentCount > 0 ? Math.round((submissionCount / studentCount) * 100) : 0;
      const dueAt = assignment.due_date ? new Date(assignment.due_date) : null;

      return {
        id: assignment.id,
        title: assignment.title,
        courseTitle: course?.title || "Course",
        submissionCount,
        studentCount,
        completionRate,
        dueAt,
      };
    })
    .sort((left, right) => {
      const leftDue = left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (leftDue !== rightDue) return leftDue - rightDue;
      return left.completionRate - right.completionRate;
    });

  const reviewQueue = assignmentBoard
    .filter((row) => row.submissionCount > 0 && row.completionRate < 100)
    .slice(0, 3);
  const dueSoonBoard = assignmentBoard
    .filter((row) => {
      if (!row.dueAt) return false;
      const dueTime = row.dueAt.getTime();
      const now = Date.now();
      return dueTime >= now && dueTime <= now + 7 * 24 * 60 * 60 * 1000;
    })
    .slice(0, 3);
  const lowMomentumCourses = [...courseSummaries]
    .filter((course) => course.studentCount > 0)
    .sort((left, right) => (left.avgAccuracy + left.completionRate) - (right.avgAccuracy + right.completionRate))
    .slice(0, 3);
  const strongestCourses = [...courseSummaries]
    .sort((left, right) => {
      const leftScore = left.avgAccuracy + left.completionRate + left.studentCount;
      const rightScore = right.avgAccuracy + right.completionRate + right.studentCount;
      return rightScore - leftScore;
    })
    .slice(0, 4);

  const liveSignalLabel = liveUpdatesEnabled
    ? syncing
      ? "Refreshing live classroom feed"
      : lastUpdatedAt
        ? `Live sync updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
        : "Live sync active"
    : "Live sync unavailable";

  const quickActions = [
    {
      to: "/teacher/assignments",
      label: "Assignments",
      detail: "Publish and review classwork",
      icon: ClipboardList,
      shell: "bg-primary/10 text-primary",
    },
    {
      to: "/teacher/students",
      label: "Students",
      detail: "Track learners and risks",
      icon: Users,
      shell: "bg-accent/10 text-accent",
    },
    {
      to: "/teacher/analytics",
      label: "Analytics",
      detail: "See class performance trends",
      icon: TrendingUp,
      shell: "bg-success/10 text-success",
    },
    {
      to: "/teacher/courses",
      label: "Courses",
      detail: "Manage classroom spaces",
      icon: BookOpen,
      shell: "bg-warning/10 text-warning",
    },
  ];

  if (!loading && workspaceReady && workspace.teacher && workspace.courses.length === 0) {
    return <Navigate to="/teacher/courses?create=1" replace />;
  }

  return (
    <TeacherLayout>
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <TeacherWorkspaceHeader
            eyebrow="Teacher Command Center"
            title={`Welcome back, ${profile?.full_name || profile?.email?.split("@")[0] || "Teacher"}`}
            description="This dashboard now follows the student portal's cleaner visual language, with classroom insights, learner tracking, and intervention signals kept front and center. Course creation stays inside Courses."
            chips={[
              `${workspace.courses.length} total courses`,
              `${students.length} learners tracked`,
              liveSignalLabel,
            ]}
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/teacher/assignments">
                    <ClipboardList className="h-4 w-4" />
                    Assignments
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/teacher/students">
                    <Users className="h-4 w-4" />
                    Students
                  </Link>
                </Button>
                <Button asChild variant="hero" size="sm" className="gap-2">
                  <Link to="/teacher/analytics">
                    <TrendingUp className="h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
              </>
            }
            aside={
              <div className="space-y-3">
                <div className="rounded-xl border border-accent/10 bg-accent/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-accent">Weakest topic</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{weakTopic}</p>
                </div>
                <div className="rounded-xl border border-success/10 bg-success/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-success">Recommended move</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextAction}</p>
                </div>
              </div>
            }
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TeacherMetricCard
              label="Tracked Learners"
              value={students.length}
              detail="Students enrolled across your active teacher courses."
              icon={Users}
              tone="blue"
            />
            <TeacherMetricCard
              label="Active Courses"
              value={activeCourseCount}
              detail="Courses currently carrying student activity and classroom data."
              icon={BookOpen}
              tone="orange"
            />
            <TeacherMetricCard
              label="Needs Review"
              value={reviewQueue.length}
              detail="Assignments with work in progress or incomplete submission coverage."
              icon={ClipboardCheck}
              tone="green"
            />
            <TeacherMetricCard
              label="Average Accuracy"
              value={`${avgStudentPerformance}%`}
              detail="Overall learner performance aggregated from current course activity."
              icon={TrendingUp}
              tone="rose"
            />
          </section>

          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to} className="block">
                <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${action.shell}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{action.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
                </div>
              </Link>
            ))}
          </section>

          <section className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Teaching Recommendation</p>
                  <p className="mt-1 text-sm text-muted-foreground">{nextAction}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/teacher/students">
                    Open learner watch
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="hero" size="sm" className="gap-2">
                  <Link to="/teacher/analytics">
                    Open analytics
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Today&apos;s Focus</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">Where attention should go next</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Watch risk, upcoming deadlines, and weak-topic concentration from one lighter classroom overview.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-destructive/10 bg-destructive/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-destructive">Risk Watch</p>
                  <p className="mt-3 text-3xl font-bold text-foreground">{activeRiskCount}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Learners currently flagged as high risk across accuracy and completion.</p>
                </div>
                <div className="rounded-xl border border-warning/10 bg-warning/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-warning">Due Soon</p>
                  <p className="mt-3 text-3xl font-bold text-foreground">{dueSoonBoard.length}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Assignments closing within the next seven days.</p>
                </div>
                <div className="rounded-xl border border-success/10 bg-success/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-success">Support Pool</p>
                  <p className="mt-3 text-3xl font-bold text-foreground">{supportedLearnerCount}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Students who would benefit from revision, follow-up, or a check-in.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Teaching brief</p>
                  </div>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {insights.suggestedAssignments.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/35 p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-foreground">Classroom signals</p>
                  </div>
                  <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Most repeated weak topic</p>
                      <p className="mt-1 font-semibold text-foreground">{weakTopic}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Top performer group</p>
                      <p className="mt-1 font-semibold text-foreground">{insights.topPerformers[0] || "No top-performer trend yet."}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Intervention Board</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">Assignments that need attention</h3>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Needs review</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {reviewQueue.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-card p-4">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.courseTitle}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {item.submissionCount}/{item.studentCount || 0} submitted
                        </p>
                      </div>
                    ))}
                    {reviewQueue.length === 0 && (
                      <div className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
                        Student submissions will appear here once classroom work starts coming in.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-warning/5 p-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold text-foreground">Due next</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {dueSoonBoard.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-card p-4">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.courseTitle}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Due {item.dueAt ? item.dueAt.toLocaleString() : "soon"}
                        </p>
                      </div>
                    ))}
                    {dueSoonBoard.length === 0 && (
                      <div className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
                        No assignment deadlines are scheduled in the next 7 days.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <TeacherAnalyticsCharts performanceDistribution={performanceDistribution} completionData={completionData} />

          <section className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-success">Learner Watchlist</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">Who needs support and who is leading</h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-foreground">Need support now</p>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      {insights.focusStudents.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                      {insights.focusStudents.length === 0 && <p>No flagged learners yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-success/5 p-4">
                    <p className="text-sm font-semibold text-foreground">Top performers</p>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      {insights.topPerformers.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                      {insights.topPerformers.length === 0 && <p>No top-performer trend yet.</p>}
                    </div>
                  </div>
                </div>
              </div>


            </div>

            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning">Cohort Radar</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">Courses losing momentum</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {lowMomentumCourses.map((course) => (
                    <div key={course.id} className="rounded-xl border bg-warning/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{course.title}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {course.avgAccuracy}% accuracy, {course.completionRate}% completion, {course.studentCount} learners.
                          </p>
                        </div>
                        <span className="rounded-full border border-warning/15 bg-card px-3 py-1 text-xs text-warning">
                          {course.assignmentCount} assignments
                        </span>
                      </div>
                    </div>
                  ))}
                  {lowMomentumCourses.length === 0 && (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      The radar will populate once students begin submitting work and classroom trends start forming.
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

export default TeacherDashboardPage;
