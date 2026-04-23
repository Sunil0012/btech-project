import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RecommendationPathGraph } from "@/components/teacher/RecommendationPathGraph";
import { toast } from "@/hooks/use-toast";
import { deleteStudentProfileForSignedInTeacher } from "@/lib/classroomData";
import type {
  ActivityEventRow,
  AssignmentRow,
  EnrollmentWithCourse,
  SubmissionRow,
  TestHistoryRow,
  UserProgressRow,
} from "@/lib/classroom";
import { buildTeacherStudentProfile, type TeacherStudentSummary } from "@/lib/teacherAnalytics";

interface TeacherStudentProfileDialogProps {
  student: TeacherStudentSummary | null;
  enrollments: EnrollmentWithCourse[];
  activityEvents: ActivityEventRow[];
  progressRows: UserProgressRow[];
  testHistoryRows: TestHistoryRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
}

export function TeacherStudentProfileDialog({
  student,
  enrollments,
  activityEvents,
  progressRows,
  testHistoryRows,
  assignments,
  submissions,
  open,
  onOpenChange,
  onDelete,
}: TeacherStudentProfileDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const profile = student
    ? buildTeacherStudentProfile({
        summary: student,
        enrollments,
        activityEvents,
        progressRows,
        testHistoryRows,
        assignments,
        submissions,
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

      onOpenChange(false);
      setShowDeleteConfirm(false);
      onDelete?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl rounded-[1.5rem] border-border/70">
        {profile && (
          <>
            <DialogHeader>
              <DialogTitle>{profile.summary.name}</DialogTitle>
              <DialogDescription>{profile.summary.email || "No email on file"}</DialogDescription>
            </DialogHeader>

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
                  {profile.subjectProgress.length === 0 && (
                    <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                      No subject progress has been synced yet.
                    </div>
                  )}
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
                      <p className="mt-2 text-xs text-muted-foreground">Best performance: {item.bestAccuracy}%</p>
                    </div>
                  ))}
                  {profile.testTypeProgress.length === 0 && (
                    <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                      No practice or test history yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

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
                    detail="Across assignment submissions"
                  />
                  <StatTile
                    label="Risk level"
                    value={profile.summary.riskLevel}
                    detail={profile.summary.weakTopics[0] ? `Focus on ${profile.summary.weakTopics[0]}` : "Need more topic data"}
                  />
                  <StatTile
                    label="Joined courses"
                    value={profile.activeCourses.length.toString()}
                    detail="Visible in teacher workspace"
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
                  {profile.recentTests.length === 0 && (
                    <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                      Recent tests will appear here after the student starts practicing.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-xl border bg-muted/20 p-5">
              <h3 className="text-lg font-semibold text-foreground">Practice review history</h3>
              <div className="mt-4 space-y-3">
                {profile.practiceReviewSessions.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.subjectName}
                          {item.topicName !== "Across subject" ? ` · ${item.topicName}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-foreground">
                          {item.accuracy ?? 0}% accuracy · {item.totalQuestions} questions
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 ${item.totalWarnings > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                        {item.totalWarnings} timing warning{item.totalWarnings === 1 ? "" : "s"}
                      </span>
                      {item.warningQuestions.slice(0, 3).map((questionId) => (
                        <span key={questionId} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                          {questionId}
                        </span>
                      ))}
                    </div>
                    {item.questionsReviewed.length > 0 && (
                      <details className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          Inspect question trail
                        </summary>
                        <div className="mt-4 space-y-3">
                          {item.questionsReviewed.map((question) => (
                            <div key={`${item.id}-${question.order}-${question.questionId}`} className="rounded-xl border bg-background p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    Q{question.order} · {question.questionText}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {question.difficulty || "unknown"} difficulty
                                    {typeof question.hopDistance === "number" ? ` · hop ${question.hopDistance}` : ""}
                                    {question.remediationForQuestionId ? ` · remediation for ${question.remediationForQuestionId}` : ""}
                                  </p>
                                </div>
                                <PracticeOutcomeBadge correct={question.correct} />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                {typeof question.timeSpentSeconds === "number" && (
                                  <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                                    {question.timeSpentSeconds}s spent
                                  </span>
                                )}
                                {question.rapidGuessWarning && (
                                  <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">
                                    Rapid-guess warning
                                  </span>
                                )}
                                {question.fromQuestionId && (
                                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                                    From {question.fromQuestionId}
                                  </span>
                                )}
                              </div>
                              {question.warningText && (
                                <p className="mt-3 text-sm text-warning">{question.warningText}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {profile.practiceReviewSessions.length === 0 && (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    Practice review sessions will appear here after the learner completes topic-wise or adaptive work.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border bg-muted/20 p-5">
              <h3 className="text-lg font-semibold text-foreground">Assignment submission history</h3>
              <div className="mt-4 space-y-3">
                {profile.assignmentHistory.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.courseTitle} · {item.type}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-foreground">{item.accuracy}%</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.scoreText}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                        {item.questionsReviewed.length} questions reviewed
                      </span>
                      <span className={`rounded-full px-3 py-1 ${item.violations > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                        {item.violations} warning{item.violations === 1 ? "" : "s"}
                      </span>
                    </div>
                    {item.questionsReviewed.length > 0 && (
                      <details className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          Review answers
                        </summary>
                        <div className="mt-4 space-y-3">
                          {item.questionsReviewed.map((question, index) => (
                            <div key={`${item.id}-${question.questionId}`} className="rounded-xl border bg-background p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    Q{index + 1} · {question.questionText}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {question.topicName} · {question.difficulty} · {question.questionType.toUpperCase()} · {question.marks} mark{question.marks === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <AssignmentOutcomeBadge answered={question.answered} correct={question.correct} />
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border bg-muted/20 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Student answer</p>
                                  <p className="mt-2 text-sm text-foreground">{question.studentAnswerText}</p>
                                </div>
                                <div className="rounded-xl border bg-success/5 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Correct answer</p>
                                  <p className="mt-2 text-sm text-foreground">{question.correctAnswerText}</p>
                                </div>
                              </div>
                              <div className="mt-3 rounded-xl border bg-primary/5 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Solution logic</p>
                                <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {profile.assignmentHistory.length === 0 && (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    Assignment submissions will appear here after this learner starts attempting teacher-published work.
                  </div>
                )}
              </div>
            </section>

            <RecommendationPathGraph
              session={profile.latestGraphSession}
              title="Latest graph traversal"
              emptyText="This learner has not finished a graph-guided topic or adaptive test yet."
            />

            {profile.latestGraphSession && (
              <section className="rounded-xl border bg-muted/20 p-5">
                <h3 className="text-lg font-semibold text-foreground">Latest graph traversal detail</h3>
                <div className="mt-4 space-y-3">
                  {profile.latestGraphSession.steps.map((step) => (
                    <div key={`${step.order}-${step.questionId}`} className="rounded-xl border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Step {step.order} · {step.questionText}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {profile.latestGraphSession.subjectName}
                            {step.topicId ? ` · ${profile.latestGraphSession.topicName}` : ""}
                            {step.difficulty ? ` · ${step.difficulty}` : ""}
                            {typeof step.hopDistance === "number" ? ` · hop ${step.hopDistance}` : ""}
                          </p>
                        </div>
                        <PracticeOutcomeBadge correct={step.correct} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {step.fromQuestionId && (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                            Linked from {step.fromQuestionId}
                          </span>
                        )}
                        {step.remediationForQuestionId && (
                          <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">
                            Retry path for {step.remediationForQuestionId}
                          </span>
                        )}
                        {typeof step.timeSpentSeconds === "number" && (
                          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                            {step.timeSpentSeconds}s spent
                          </span>
                        )}
                        {step.rapidGuessWarning && (
                          <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">
                            Rapid-guess flag
                          </span>
                        )}
                      </div>
                      {step.warningText && (
                        <p className="mt-3 text-sm text-warning">{step.warningText}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                    <span>Remove all enrollments from courses</span>
                  </li>
                  <li className="ml-4 flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    <span>Delete all submissions and grades</span>
                  </li>
                  <li className="ml-4 flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    <span>Clear all activity history</span>
                  </li>
                  <li className="ml-4 flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    <span>Permanently delete the profile</span>
                  </li>
                </ul>

                {showDeleteConfirm ? (
                  <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-900">
                      Are you absolutely sure? This action cannot be undone.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={() => void handleDeleteStudent()}
                        disabled={isDeleting}
                        className="gap-2"
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
                    className="gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Delete student profile
                  </Button>
                )}
              </div>
            </section>

          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PracticeOutcomeBadge({ correct }: { correct: boolean | null }) {
  if (correct === null) {
    return <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Observed</span>;
  }

  return correct ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Correct
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
      <XCircle className="h-3.5 w-3.5" />
      Needs review
    </span>
  );
}

function AssignmentOutcomeBadge({ answered, correct }: { answered: boolean; correct: boolean }) {
  if (!answered) {
    return <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Unanswered</span>;
  }

  return correct ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Correct
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
      <XCircle className="h-3.5 w-3.5" />
      Wrong
    </span>
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
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold capitalize text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
