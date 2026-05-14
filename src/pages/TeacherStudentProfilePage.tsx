import { ChevronLeft, AlertTriangle, BarChart3, Trophy, Target, BookOpen, Clock3, ShieldAlert, Activity, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RecommendationPathGraph } from "@/components/teacher/RecommendationPathGraph";
import { toast } from "@/hooks/use-toast";
import { deleteStudentProfileForSignedInTeacher } from "@/lib/classroomData";
import { buildTeacherStudentSummaries, buildTeacherStudentProfile, type TeacherStudentSummary } from "@/lib/teacherAnalytics";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import { useState } from "react";

export function TeacherStudentProfilePage() {
  const { studentId: routeStudentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { workspace } = useTeacherWorkspace();
  
  const studentId = routeStudentId;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onClose = () => navigate(-1);

  const students = buildTeacherStudentSummaries({
    students: workspace.students,
    enrollments: workspace.enrollments,
    progressRows: workspace.progressRows,
    assignments: workspace.assignments,
    submissions: workspace.submissions,
  });

  const student = students.find((s) => s.userId === studentId) || null;

  const profile = student
    ? buildTeacherStudentProfile({
        summary: student,
        enrollments: workspace.enrollments,
        activityEvents: workspace.activityEvents,
        progressRows: workspace.progressRows,
        testHistoryRows: workspace.testHistoryRows,
        assignments: workspace.assignments,
        submissions: workspace.submissions,
      })
    : null;

  const handleDeleteStudent = async () => {
    if (!student) return;

    setIsDeleting(true);
    try {
      await deleteStudentProfileForSignedInTeacher(student.userId);

      toast({
        title: "Profile deleted",
        description: `${student.name}'s profile has been permanently removed.`,
      });

      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      toast({
        title: "Could not delete profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!student || !profile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="p-8 max-w-md w-full mx-4 text-center">
          <p className="text-muted-foreground mb-4">Student not found</p>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      {/* Sticky header */}
      <div className="border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
          {/* Debug info */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Profile: {profile ? "loaded" : "not loaded"} | Subjects: {profile?.subjectProgress.length || 0} | Tests: {profile?.testTypeProgress.length || 0} | Recent: {profile?.recentTests.length || 0}
          </div>
          
          {/* Top metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard icon={Target} label="Overall accuracy" value={`${profile.summary.accuracy}%`} />
            <MetricCard icon={Trophy} label="ELO" value={profile.summary.eloRating.toString()} />
            <MetricCard icon={BookOpen} label="Solved questions" value={profile.summary.questionsSolved.toString()} />
            <MetricCard
              icon={Clock3}
              label="Last active"
              value={profile.summary.lastActive ? new Date(profile.summary.lastActive).toLocaleDateString() : "No recent signal"}
            />
          </div>

          {/* Subject and test progress */}
          <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <section className="rounded-xl border bg-muted/20 p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Subject progress</h3>
              </div>
              <div className="mt-4 space-y-4">
                {profile.subjectProgress.map((item) => (
                  <div key={item.subjectId} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.correct}/{item.total} correct
                          {item.lastPracticed ? ` · updated ${new Date(item.lastPracticed).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.accuracy}%</span>
                    </div>
                    <Progress className="mt-3 h-2.5" value={item.accuracy} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-muted/20 p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Test progress by type</h3>
              </div>
              <div className="mt-4 space-y-4">
                {profile.testTypeProgress.map((item) => (
                  <div key={item.key} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.attempts} attempt{item.attempts === 1 ? "" : "s"}
                          {item.latestCompletedAt ? ` · latest ${new Date(item.latestCompletedAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.avgAccuracy}% avg</span>
                    </div>
                    <Progress className="mt-3 h-2.5" value={item.avgAccuracy} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Teacher signal and recent activity */}
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-xl border bg-muted/20 p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert
                  className={`h-5 w-5 ${
                    profile.summary.riskLevel === "high"
                      ? "text-rose-500"
                      : profile.summary.riskLevel === "medium"
                        ? "text-orange-500"
                        : "text-emerald-500"
                  }`}
                />
                <h3 className="text-lg font-semibold text-foreground">Teacher signal</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <StatTile
                  label="Assignment completion"
                  value={`${profile.summary.completionRate}%`}
                  detail={`${profile.summary.assignmentsCompleted}/${profile.summary.assignmentsAssigned} submitted`}
                />
                <StatTile
                  label="Submission accuracy"
                  value={`${profile.summary.averageSubmissionAccuracy}%`}
                  detail="Across assignments"
                />
                <StatTile
                  label="Risk level"
                  value={profile.summary.riskLevel}
                  detail={profile.summary.weakTopics[0] ? `Focus: ${profile.summary.weakTopics[0]}` : "Need more data"}
                />
                <StatTile
                  label="Active courses"
                  value={profile.activeCourses.length.toString()}
                  detail="Enrolled in"
                />
              </div>
            </section>

            <section className="rounded-xl border bg-muted/20 p-5">
              <h3 className="text-lg font-semibold text-foreground">Recent activity</h3>
              <div className="mt-4 space-y-3">
                {profile.recentTests.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border bg-background p-4">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.scoreText}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{item.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Graph visualization */}
          {profile.latestGraphSession && (
            <RecommendationPathGraph
              session={profile.latestGraphSession}
              title="Latest graph traversal"
              emptyText="No graph session data"
            />
          )}

          {/* Delete section */}
          <section className="rounded-xl border border-red-200 bg-red-50/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900">Delete student profile</h3>
                <p className="mt-1 text-sm text-red-800">Permanently remove this student and all their data.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <ul className="space-y-2 text-sm text-red-700">
                <li className="ml-4 flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                  <span>Remove all course enrollments</span>
                </li>
                <li className="ml-4 flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                  <span>Delete all submissions and grades</span>
                </li>
                <li className="ml-4 flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                  <span>Clear all activity history</span>
                </li>
              </ul>

              {showDeleteConfirm ? (
                <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-900">
                    Are you absolutely sure? This cannot be undone.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => void handleDeleteStudent()}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Yes, delete permanently"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete student profile
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/35 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
