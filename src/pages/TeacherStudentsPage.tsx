import { useMemo, useState } from "react";
import { AlertTriangle, Search, ShieldCheck, Users } from "lucide-react";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherMetricCard } from "@/components/teacher/TeacherMetricCard";
import { TeacherRosterTable } from "@/components/teacher/TeacherRosterTable";
import { TeacherStudentProfileDialog } from "@/components/teacher/TeacherStudentProfileDialog";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { Input } from "@/components/ui/input";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import { buildTeacherStudentSummaries, type TeacherStudentSummary } from "@/lib/teacherAnalytics";

function TeacherStudentsPage() {
  const { workspace, loading } = useTeacherWorkspace();
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const students = useMemo(
    () =>
      buildTeacherStudentSummaries({
        students: workspace.students,
        enrollments: workspace.enrollments,
        progressRows: workspace.progressRows,
        assignments: workspace.assignments,
        submissions: workspace.submissions,
      }).sort((left, right) => {
        const leftScore = left.accuracy + left.completionRate;
        const rightScore = right.accuracy + right.completionRate;
        return leftScore - rightScore;
      }),
    [workspace.assignments, workspace.enrollments, workspace.progressRows, workspace.students, workspace.submissions]
  );

  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return students.filter((student) => {
      const matchesRisk = riskFilter === "all" || student.riskLevel === riskFilter;
      if (!matchesRisk) return false;

      if (!normalizedQuery) return true;

      const searchable = [
        student.name,
        student.email || "",
        ...student.courseTitles,
        ...student.weakTopics,
      ].join(" ").toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [riskFilter, searchQuery, students]);

  const atRiskCount = students.filter((student) => student.riskLevel === "high").length;
  const mediumRiskCount = students.filter((student) => student.riskLevel === "medium").length;
  const averageCompletion = students.length > 0
    ? Math.round(students.reduce((sum, student) => sum + student.completionRate, 0) / students.length)
    : 0;
  const interventionQueue = students.filter((student) => student.riskLevel !== "low").slice(0, 4);
  const recognitionBoard = [...students]
    .sort((left, right) => (right.accuracy + right.completionRate) - (left.accuracy + left.completionRate))
    .slice(0, 4);

  return (
    <TeacherLayout>
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <TeacherWorkspaceHeader
            eyebrow="Learner Monitoring"
            title="Track every student like an operations desk"
            description="See who is slipping, who is consistent, and where intervention should happen next. Search across students, courses, and weak topics without leaving the teacher workspace."
            chips={[
              `${students.length} tracked learners`,
              `${atRiskCount} high-risk`,
              `${mediumRiskCount} medium-risk`,
              `${averageCompletion}% avg completion`,
            ]}
            aside={
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Teacher note</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Open any learner profile to inspect weak topics, assignment completion, ELO, and recent course activity.
                  </p>
                </div>
              </div>
            }
          />

          <section className="grid gap-4 md:grid-cols-3">
            <TeacherMetricCard
              label="Total Students"
              value={students.length}
              detail="All learners connected to your teacher workspace."
              icon={Users}
              tone="blue"
            />
            <TeacherMetricCard
              label="High-risk Learners"
              value={atRiskCount}
              detail="Students needing immediate follow-up based on accuracy and completion."
              icon={AlertTriangle}
              tone="rose"
            />
            <TeacherMetricCard
              label="Average Completion"
              value={`${averageCompletion}%`}
              detail="Mean assignment completion across the full roster."
              icon={ShieldCheck}
              tone="green"
            />
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                  placeholder="Search by student, course, or weak topic"
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value as "all" | "high" | "medium" | "low")}
              >
                <option value="all">All risk levels</option>
                <option value="high">High risk</option>
                <option value="medium">Medium risk</option>
                <option value="low">Low risk</option>
              </select>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="text-xl font-semibold text-foreground">Intervention queue</h3>
              </div>
              <div className="mt-4 space-y-3">
                {interventionQueue.map((student) => (
                  <button
                    key={student.userId}
                    type="button"
                    className="w-full rounded-xl border border-rose-100 bg-rose-50 p-4 text-left transition-colors hover:bg-rose-100/70"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <p className="font-semibold text-foreground">{student.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {student.accuracy}% accuracy - {student.completionRate}% completion
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Focus: {student.weakTopics[0] || "Need more data"}
                    </p>
                  </button>
                ))}
                {interventionQueue.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No learners are currently flagged for intervention.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-success" />
                <h3 className="text-xl font-semibold text-foreground">Recognition board</h3>
              </div>
              <div className="mt-4 space-y-3">
                {recognitionBoard.map((student) => (
                  <button
                    key={student.userId}
                    type="button"
                    className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left transition-colors hover:bg-emerald-100/70"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <p className="font-semibold text-foreground">{student.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      ELO {student.eloRating} - submission accuracy {student.averageSubmissionAccuracy}%
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Courses: {student.courseTitles.join(", ") || "No course data"}
                    </p>
                  </button>
                ))}
                {recognitionBoard.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    High-performing learners will appear here once submissions come in.
                  </div>
                )}
              </div>
            </div>
          </section>

          <TeacherRosterTable students={filteredStudents} onSelectStudent={setSelectedStudent} />

          <TeacherStudentProfileDialog
            student={selectedStudent}
            enrollments={workspace.enrollments}
            activityEvents={workspace.activityEvents}
            progressRows={workspace.progressRows}
            testHistoryRows={workspace.testHistoryRows}
            assignments={workspace.assignments}
            submissions={workspace.submissions}
            open={Boolean(selectedStudent)}
            onOpenChange={(open) => !open && setSelectedStudent(null)}
          />
        </div>
      )}
    </TeacherLayout>
  );
}

export default TeacherStudentsPage;
