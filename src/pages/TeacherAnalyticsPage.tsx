import { Brain, ChartColumnBig, ShieldAlert, Trophy } from "lucide-react";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherAnalyticsCharts } from "@/components/teacher/TeacherAnalyticsCharts";
import { TeacherMetricCard } from "@/components/teacher/TeacherMetricCard";
import { RecommendationPathGraph } from "@/components/teacher/RecommendationPathGraph";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import {
  buildAssignmentCompletionData,
  buildPerformanceDistribution,
  buildTeacherCourseSummaries,
  buildTeacherInsights,
  buildTeacherRecommendationPathSessions,
  buildTeacherStudentSummaries,
} from "@/lib/teacherAnalytics";

function TeacherAnalyticsPage() {
  const { workspace, loading } = useTeacherWorkspace();

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
  const insights = buildTeacherInsights({
    students,
    courseSummaries,
  });
  const graphSessions = buildTeacherRecommendationPathSessions({
    activityEvents: workspace.activityEvents,
    students: workspace.students,
  });
  const latestGraphSession = graphSessions[0] || null;

  const weakStudents = [...students]
    .sort((left, right) => (left.accuracy + left.completionRate) - (right.accuracy + right.completionRate))
    .slice(0, 5);
  const topPerformers = [...students]
    .sort((left, right) => (right.accuracy + right.completionRate) - (left.accuracy + right.completionRate))
    .slice(0, 5);
  const averageCourseAccuracy = courseSummaries.length > 0
    ? Math.round(courseSummaries.reduce((sum, course) => sum + course.avgAccuracy, 0) / courseSummaries.length)
    : 0;

  return (
    <TeacherLayout>
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <TeacherWorkspaceHeader
            eyebrow="Analytics Lab"
            title="Deep classroom performance intelligence"
            description="Compare completion, course health, cohort accuracy, and learner risk from one cleaner analytics surface aligned with the student portal's visual language."
            chips={[
              `${courseSummaries.length} courses compared`,
              `${students.length} students measured`,
              `${averageCourseAccuracy}% avg course accuracy`,
            ]}
            aside={
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Dominant weak topic</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{insights.weakTopicsAcrossClass[0] || "No pattern yet"}</p>
                </div>
              </div>
            }
          />

          <section className="grid gap-4 md:grid-cols-3">
            <TeacherMetricCard
              label="Average Course Accuracy"
              value={`${averageCourseAccuracy}%`}
              detail="Mean accuracy aggregated across published course submissions."
              icon={ChartColumnBig}
              tone="blue"
            />
            <TeacherMetricCard
              label="Students Needing Intervention"
              value={weakStudents.length}
              detail="Lowest combined accuracy and assignment completion signals."
              icon={ShieldAlert}
              tone="rose"
            />
            <TeacherMetricCard
              label="Top Performing Learners"
              value={topPerformers.length}
              detail="Highest combined mastery and assignment completion signals."
              icon={Trophy}
              tone="green"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Reports desk</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Teacher intelligence summary</h3>
              <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">Class-wide weak topics</p>
                  <p className="mt-1">{insights.weakTopicsAcrossClass.join(", ") || "No pattern yet."}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Suggested next assignment</p>
                  <p className="mt-1">{insights.suggestedAssignments[0] || "Create the next assignment when new weak-topic signals appear."}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Support queue</p>
                  <p className="mt-1">{insights.focusStudents[0] || "No urgent learner intervention is currently flagged."}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warning">Course pattern readout</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Where to act first</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {courseSummaries.slice(0, 4).map((course) => (
                  <div key={course.id} className="rounded-xl border bg-muted/35 p-4">
                    <p className="font-semibold text-foreground">{course.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {course.avgAccuracy}% accuracy - {course.completionRate}% completion
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {course.studentCount} students - {course.assignmentCount} assignments
                    </p>
                  </div>
                ))}
                {courseSummaries.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground md:col-span-2">
                    Course performance cards will appear here once your teacher workspace has active classroom data.
                  </div>
                )}
              </div>
            </div>
          </section>

          <TeacherAnalyticsCharts performanceDistribution={performanceDistribution} completionData={completionData} />

          <RecommendationPathGraph
            session={latestGraphSession}
            title="Latest graph-guided student traversal"
            emptyText="Graph-guided test paths will appear here after students finish topic-wise or adaptive tests."
          />

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <h3 className="text-xl font-semibold text-foreground">Weak learners</h3>
              </div>
              <div className="mt-4 space-y-3">
                {weakStudents.map((student) => (
                  <div key={student.userId} className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="font-semibold text-foreground">{student.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {student.accuracy}% accuracy, {student.completionRate}% completion
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Focus: {student.weakTopics.join(", ") || "Need more attempts"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-warning" />
                <h3 className="text-xl font-semibold text-foreground">Top performers</h3>
              </div>
              <div className="mt-4 space-y-3">
                {topPerformers.map((student) => (
                  <div key={student.userId} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="font-semibold text-foreground">{student.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {student.accuracy}% accuracy, {student.completionRate}% completion
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      ELO {student.eloRating}, submission accuracy {student.averageSubmissionAccuracy}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">AI summary</h3>
              </div>
              <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">Weak topics across class</p>
                  <p className="mt-1">{insights.weakTopicsAcrossClass.join(", ") || "No pattern yet."}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Suggested assignments</p>
                  <div className="mt-2 space-y-2">
                    {insights.suggestedAssignments.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-foreground">Course comparison matrix</h3>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-primary/10 text-left text-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Students</th>
                    <th className="px-4 py-3 font-medium">Assignments</th>
                    <th className="px-4 py-3 font-medium">Avg Accuracy</th>
                    <th className="px-4 py-3 font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {courseSummaries.map((course) => (
                    <tr key={course.id} className="border-t border-border/70">
                      <td className="px-4 py-3 font-semibold text-foreground">{course.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{course.studentCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{course.assignmentCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{course.avgAccuracy}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{course.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </TeacherLayout>
  );
}

export default TeacherAnalyticsPage;
