import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Eye, EyeOff, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { parseAssignmentDescription } from "@/lib/assignmentContent";
import { logStudentActivityEvent } from "@/lib/activityEvents";
import { getStudentAssignmentAttempt, submitAssignmentResult } from "@/lib/teacherSync";
import { buildTestReviewPayload } from "@/lib/testReview";
import {
  getAssignmentSubjectLabel,
  getQuestionsByAssignment,
  gradeAssignment,
  isQuestionAnswered,
  isQuestionCorrect,
  type AssignmentAnswerValue,
} from "@/lib/classroom";
import { updateElo } from "@/data/questions";

type QuestionStatus = "answered" | "not-answered" | "not-visited";

function AssignmentAttemptPage() {
  const { assignmentId } = useParams();
  const {
    user,
    profile,
    addAnsweredQuestion,
    updateSubjectScore,
    studentElo,
    setStudentElo,
    recordTestHistory,
  } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Awaited<ReturnType<typeof getStudentAssignmentAttempt>>["assignment"]>(null);
  const [existingSubmission, setExistingSubmission] = useState<Awaited<ReturnType<typeof getStudentAssignmentAttempt>>["submission"]>(null);
  const [answers, setAnswers] = useState<Record<string, AssignmentAnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [showPalette, setShowPalette] = useState(true);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const assignmentRef = useRef<Awaited<ReturnType<typeof getStudentAssignmentAttempt>>["assignment"]>(null);
  const answersRef = useRef<Record<string, AssignmentAnswerValue>>({});
  const questionsRef = useRef<ReturnType<typeof getQuestionsByAssignment>>([]);
  const timeLeftRef = useRef(0);
  const finishedRef = useRef(false);
  const submittingRef = useRef(false);
  const violationsRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    setAssignment(null);
    setExistingSubmission(null);
    setAnswers({});
    setCurrentIndex(0);
    setVisitedQuestions(new Set());
    setMarkedQuestions(new Set());
    setShowPalette(true);
    setStarted(false);
    setFinished(false);
    setTimeLeft(0);
    setViolations(0);
    setWarning("");
    assignmentRef.current = null;
    answersRef.current = {};
    questionsRef.current = [];
    timeLeftRef.current = 0;
    finishedRef.current = false;
    violationsRef.current = 0;
    submittingRef.current = false;

    if (!assignmentId || !user) {
      setLoading(false);
      return;
    }

    void getStudentAssignmentAttempt(assignmentId, user.id)
      .then((result) => {
        setAssignment(result.assignment);
        setExistingSubmission(result.submission);
        if (result.submission) {
          setFinished(true);
          setAnswers((result.submission.answers as Record<string, AssignmentAnswerValue>) || {});
        } else {
          setTimeLeft((result.assignment?.timer_minutes || 0) * 60);
        }
      })
      .finally(() => setLoading(false));
  }, [assignmentId, user]);

  const questions = useMemo(() => (assignment ? getQuestionsByAssignment(assignment) : []), [assignment]);
  const currentQuestion = questions[currentIndex];
  const gradedResult = useMemo(() => gradeAssignment(questions, answers), [answers, questions]);
  const assignmentContent = useMemo(() => parseAssignmentDescription(assignment?.description), [assignment?.description]);

  useEffect(() => {
    assignmentRef.current = assignment;
  }, [assignment]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  const handleSubmit = useCallback(
    async (forced = false, violationCount = violationsRef.current) => {
      const currentAssignment = assignmentRef.current;

      if (!currentAssignment || !user || finishedRef.current || submittingRef.current) return;

      submittingRef.current = true;

      try {
        const currentQuestions = questionsRef.current;
        const currentAnswers = answersRef.current;
        const remainingTime = timeLeftRef.current;
        const result = gradeAssignment(currentQuestions, currentAnswers);
        const attemptedCount = currentQuestions.filter((question) =>
          isQuestionAnswered(question, currentAnswers[question.id] ?? null)
        ).length;

        const submission = await submitAssignmentResult({
          assignmentId: currentAssignment.id,
          student: {
            studentExternalId: user.id,
            email: user.email || null,
            fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
          },
          answers: currentAnswers,
          score: result.score,
          correctAnswers: result.correctCount,
          totalQuestions: result.totalQuestions,
          violations: violationCount,
        });

        if (!submission) {
          throw new Error("The teacher sync backend did not accept the submission. Deploy the `teacher-sync` edge function and verify the teacher Supabase secrets.");
        }

        let nextElo = studentElo;
        const answerObjects: Array<number | number[] | string | null> = [];
        
        currentQuestions.forEach((question) => {
          const correct = isQuestionCorrect(question, currentAnswers[question.id] ?? null);
          answerObjects.push(currentAnswers[question.id] ?? null);
          addAnsweredQuestion(question.id, correct);
          updateSubjectScore(question.subjectId, correct);
          nextElo = updateElo(nextElo, question.eloRating, correct);
        });
        setStudentElo(nextElo);

        try {
          const reviewPayload = buildTestReviewPayload({
            questions: currentQuestions,
            answers: answerObjects,
            attemptKind: currentAssignment.type === "test" ? "assignment-test" : "assignment-homework",
            countsForStats: true,
            countsForRating: true,
          });

          await recordTestHistory({
            test_type: currentAssignment.type === "test" ? "assignment-test" : "assignment-homework",
            subject_id: currentAssignment.subject_id,
            topic_id: currentAssignment.topic_id,
            score: result.score,
            max_score: result.maxScore,
            questions_attempted: attemptedCount,
            correct_answers: result.correctCount,
            total_questions: result.totalQuestions,
            violations: violationCount,
            duration_seconds: Math.max(currentAssignment.timer_minutes * 60 - remainingTime, 0),
            review_payload: reviewPayload,
          });
        } catch (error) {
          console.error("Could not record assignment history", error);
        }

        await logStudentActivityEvent({
          actorId: user.id,
          actorRole: "student",
          actorName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
          eventType: "assignment_submitted",
          assignmentId: currentAssignment.id,
          subjectId: currentAssignment.subject_id,
          topicId: currentAssignment.topic_id,
          metadata: {
            assignment_type: currentAssignment.type,
            score: result.score,
            max_score: result.maxScore,
            correct_answers: result.correctCount,
            total_questions: result.totalQuestions,
            violations: violationCount,
            forced_submit: forced,
          },
        });

        setExistingSubmission(submission);
        setFinished(true);
        finishedRef.current = true;

        if (forced) {
          setWarning("The assignment was auto-submitted.");
        }
      } finally {
        submittingRef.current = false;
      }
    },
    [
      addAnsweredQuestion,
      recordTestHistory,
      setStudentElo,
      studentElo,
      updateSubjectScore,
      profile,
      user,
    ]
  );

  useEffect(() => {
    if (!started || finished || existingSubmission || questions.length === 0) return;

    setVisitedQuestions((previous) => {
      const next = new Set(previous);
      next.add(questions[currentIndex].id);
      return next;
    });
  }, [currentIndex, existingSubmission, finished, questions, started]);

  useEffect(() => {
    if (!started || finished || existingSubmission) return;

    const interval = window.setInterval(() => {
      setTimeLeft((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(interval);
          void handleSubmit(true);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [existingSubmission, finished, handleSubmit, started]);

  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  const handleViolation = useCallback((message: string) => {
    const nextViolations = violationsRef.current + 1;
    violationsRef.current = nextViolations;
    setViolations(nextViolations);
    setWarning(message);

    if (nextViolations >= 3) {
      void handleSubmit(true, nextViolations);
    }
  }, [handleSubmit]);

  useEffect(() => {
    if (!started || finished || existingSubmission) return;

    const onVisibility = () => {
      if (document.hidden) {
        handleViolation("Stay on the assignment tab while you work. Too many focus losses will auto-submit.");
      }
    };

    const onBlur = () => {
      handleViolation("This assignment is still active. Switching away counts as a warning.");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [existingSubmission, finished, handleViolation, started]);

  const getStatus = (questionId: string): QuestionStatus => {
    const question = questions.find((item) => item.id === questionId);
    if (!question) return "not-visited";
    const answer = answers[questionId] ?? null;
    if (isQuestionAnswered(question, answer)) return "answered";
    if (visitedQuestions.has(questionId)) return "not-answered";
    return "not-visited";
  };

  const handleSelectOption = (questionId: string, value: number) => {
    const question = questions.find((item) => item.id === questionId);
    if (!question || finished) return;

    if (question.type === "mcq") {
      setAnswers((previous) => ({ ...previous, [questionId]: value }));
      return;
    }

    if (question.type === "msq") {
      setAnswers((previous) => {
        const current = Array.isArray(previous[questionId]) ? (previous[questionId] as number[]) : [];
        const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        return { ...previous, [questionId]: next };
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-[2rem] border border-dashed p-10 text-center text-muted-foreground">
          Assignment not found.
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-xl rounded-[2rem] border border-dashed p-10 text-center text-muted-foreground">
          This assignment does not have any question data yet. Ask your teacher to regenerate it from the assignment builder.
        </div>
      </div>
    );
  }

  if (finished || existingSubmission) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Assignment Complete</p>
                <h1 className="mt-1 text-2xl font-bold">{assignment.title}</h1>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <SummaryCard label="Score" value={`${gradedResult.score}/${gradedResult.maxScore}`} />
              <SummaryCard label="Correct" value={`${gradedResult.correctCount}/${gradedResult.totalQuestions}`} />
              <SummaryCard label="Accuracy" value={`${gradedResult.totalQuestions > 0 ? Math.round((gradedResult.correctCount / gradedResult.totalQuestions) * 100) : 0}%`} />
              <SummaryCard label="Warnings" value={`${existingSubmission?.violations || violations}`} />
            </div>

            {warning && (
              <div className="mt-5 rounded-3xl border border-warning/20 bg-warning/5 p-4 text-sm text-muted-foreground">
                {warning}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="hero">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/practice">Continue practicing</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => {
              const answer = answers[question.id] ?? null;
              const correct = isQuestionCorrect(question, answer);
              return (
                <div key={question.id} className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Question {index + 1}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {correct ? "Correct" : "Review needed"}
                    </span>
                  </div>
                  <p className="mt-4 text-base leading-7">{question.question}</p>
                  {question.type !== "nat" && (
                    <div className="mt-4 space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const selected = Array.isArray(answer) ? answer.includes(optionIndex) : answer === optionIndex;
                        const shouldHighlightCorrect = question.type === "msq"
                          ? question.correctAnswers?.includes(optionIndex)
                          : question.correctAnswer === optionIndex;

                        return (
                          <div
                            key={`${question.id}-${optionIndex}`}
                            className={`rounded-2xl border px-4 py-3 text-sm ${
                              shouldHighlightCorrect
                                ? "border-success bg-success/5"
                                : selected
                                  ? "border-destructive bg-destructive/5"
                                  : "border-border"
                            }`}
                          >
                            {option}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {question.type === "nat" && (
                    <div className="mt-4 rounded-2xl border px-4 py-3 text-sm">
                      Your answer: {typeof answer === "string" ? answer : "Not answered"}
                    </div>
                  )}
                  <div className="mt-4 rounded-2xl border bg-primary/5 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-primary">Explanation</p>
                    <p className="mt-2 leading-6">{question.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{getAssignmentSubjectLabel(assignment)}</p>
            <h1 className="mt-1 text-xl font-semibold">{assignment.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? "text-destructive" : ""}`}>
              <Clock className="mr-2 inline h-4 w-4" />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setShowPalette((current) => !current)}>
              {showPalette ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {warning && (
        <div className="border-b border-warning/20 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
          <div className="mx-auto flex max-w-[1500px] items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {warning} Warning {violations}/3.
          </div>
        </div>
      )}

      {!started ? (
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-sm">
            <h2 className="text-2xl font-bold">{assignment.title}</h2>
            <p className="mt-3 text-muted-foreground">
              {assignmentContent.body || "Complete the assignment within the timer and submit for instant grading."}
            </p>
            {assignmentContent.attachments.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {assignmentContent.attachments.map((file) => (
                  <a
                    key={`${assignment.id}-${file.name}`}
                    href={file.dataUrl}
                    download={file.name}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    {file.name}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <SummaryCard label="Questions" value={assignment.question_count} />
              <SummaryCard label="Timer" value={`${assignment.timer_minutes} min`} />
              <SummaryCard label="Type" value={assignment.type} />
              <SummaryCard label="Warnings" value="3 max" />
            </div>
            <Button variant="hero" className="mt-6" onClick={() => setStarted(true)}>
              Start assignment
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold capitalize">{currentQuestion?.difficulty} question</h2>
                </div>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium ${
                    markedQuestions.has(currentQuestion.id) ? "border-warning/20 bg-warning/10 text-warning" : ""
                  }`}
                  onClick={() => {
                    setMarkedQuestions((previous) => {
                      const next = new Set(previous);
                      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
                      else next.add(currentQuestion.id);
                      return next;
                    });
                  }}
                >
                  <Flag className="mr-1 inline h-3.5 w-3.5" />
                  Mark for review
                </button>
              </div>

              <p className="mt-6 text-lg leading-8">{currentQuestion?.question}</p>

              <div className="mt-6 space-y-3">
                {currentQuestion?.type === "nat" ? (
                  <input
                    type="text"
                    value={typeof answers[currentQuestion.id] === "string" ? (answers[currentQuestion.id] as string) : ""}
                    onChange={(event) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [currentQuestion.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                    placeholder="Enter numerical answer"
                  />
                ) : (
                  currentQuestion?.options.map((option, index) => {
                    const answer = answers[currentQuestion.id];
                    const selected = Array.isArray(answer) ? answer.includes(index) : answer === index;
                    return (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, index)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
                          selected ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/40"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [currentQuestion.id]: currentQuestion.type === "msq" ? [] : currentQuestion.type === "nat" ? "" : null,
                      }))
                    }
                  >
                    Clear response
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button variant="hero" className="gap-2" onClick={() => setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))}>
                      Save & Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="hero" className="gap-2" onClick={() => void handleSubmit(false)}>
                      Submit Assignment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showPalette && (
            <aside className="rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Question Palette</h3>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {questions.map((question, index) => {
                  const status = getStatus(question.id);
                  const marked = markedQuestions.has(question.id);
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`relative h-10 rounded-xl text-sm font-semibold ${
                        status === "answered"
                          ? "bg-success text-success-foreground"
                          : status === "not-answered"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                      } ${currentIndex === index ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    >
                      {index + 1}
                      {marked && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-warning" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Answered:</span> Green</p>
                <p><span className="font-medium text-foreground">Visited:</span> Red</p>
                <p><span className="font-medium text-foreground">Not visited:</span> Grey</p>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default AssignmentAttemptPage;
