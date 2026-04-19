import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  History,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { studentSupabase } from "@/integrations/supabase/student-client";
import type { Json, StudentTables } from "@/integrations/supabase/student-types";
import type { Question } from "@/data/questions";
import {
  createEmptyAnswer,
  getQuestionForPayloadReview,
  getReviewState,
  parseTestReviewPayload,
  summarizeTestWarnings,
  type PracticeAnswer,
  type QuestionSessionReviewPayload,
  type TestReviewPayload,
} from "@/lib/testReview";

type HistoryFilter = "all" | "full-mock" | "topic-wise" | "adaptive" | "assignment";

type ReviewEntry = {
  question: Question;
  answer: PracticeAnswer;
  review: QuestionSessionReviewPayload | null;
};

type SelectedHistoryReview = {
  row: StudentTables<"test_history">;
  payload: TestReviewPayload;
};

function getTypeLabel(testType: string) {
  switch (testType) {
    case "full-mock":
      return "Full GATE paper";
    case "topic-wise":
      return "Topic-wise practice";
    case "adaptive":
      return "Adaptive practice";
    case "assignment-test":
      return "Assignment test";
    case "assignment-homework":
      return "Assignment homework";
    default:
      return testType.replace(/-/g, " ");
  }
}

function getTypeTone(testType: string) {
  if (testType === "full-mock") return "bg-destructive/10 text-destructive";
  if (testType === "adaptive") return "bg-primary/10 text-primary";
  if (testType.startsWith("assignment")) return "bg-warning/10 text-warning";
  return "bg-accent/10 text-accent";
}

export default function TestHistoryPage() {
  const { user } = useStudentAuth();
  const [historyRows, setHistoryRows] = useState<StudentTables<"test_history">[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [selectedReview, setSelectedReview] = useState<SelectedHistoryReview | null>(null);

  useEffect(() => {
    if (!user) {
      setHistoryRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    studentSupabase
      .from("test_history")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading test history:", error);
        }
        console.log("Test history loaded from DB:", {
          rowCount: data?.length ?? 0,
          rows: data?.map((row) => ({
            id: row.id,
            testType: row.test_type,
            hasReviewPayload: Boolean(row.review_payload),
            reviewPayloadKeys: row.review_payload ? Object.keys(row.review_payload) : [],
          })) ?? [],
        });
        setHistoryRows(data || []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return historyRows;
    if (filter === "assignment") {
      return historyRows.filter((row) => row.test_type.startsWith("assignment"));
    }
    return historyRows.filter((row) => row.test_type === filter);
  }, [filter, historyRows]);

  const stats = useMemo(() => {
    const attempts = historyRows.length;
    const totalCorrect = historyRows.reduce((sum, row) => sum + row.correct_answers, 0);
    const totalQuestions = historyRows.reduce((sum, row) => sum + row.total_questions, 0);

    return {
      attempts,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      latest: historyRows[0]?.completed_at || null,
    };
  }, [historyRows]);

  const filterOptions: Array<{ value: HistoryFilter; label: string }> = [
    { value: "all", label: "All sessions" },
    { value: "full-mock", label: "Full papers" },
    { value: "topic-wise", label: "Topic-wise" },
    { value: "adaptive", label: "Adaptive" },
    { value: "assignment", label: "Assignments" },
  ];

  if (selectedReview) {
    return <HistoryReviewPage row={selectedReview.row} payload={selectedReview.payload} onExit={() => setSelectedReview(null)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <ScrollReveal>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <History className="h-3.5 w-3.5" />
                Student history
              </div>
              <h1 className="mt-4 text-3xl font-bold text-foreground">Completed tests and assignments</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Revisit every finished practice set, full paper, adaptive run, and assignment attempt from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/practice">
                <Button variant="hero" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Start practice
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={40}>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <HistoryMetric label="Attempts logged" value={stats.attempts.toString()} detail="All completed sessions" />
            <HistoryMetric label="Overall accuracy" value={`${stats.accuracy}%`} detail="Across your saved history" />
            <HistoryMetric
              label="Latest activity"
              value={stats.latest ? new Date(stats.latest).toLocaleDateString() : "No history"}
              detail="Most recent saved attempt"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Filter your saved sessions</h2>
                <p className="text-sm text-muted-foreground">Switch between full papers, adaptive work, topic drills, and assignments.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      filter === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="mt-8">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="grid gap-4">
              {filteredRows.map((row, index) => {
                const accuracy = row.total_questions > 0
                  ? Math.round((row.correct_answers / row.total_questions) * 100)
                  : 0;
                const durationText = (row.duration_seconds && row.duration_seconds > 0)
                  ? `${Math.max(1, Math.round(row.duration_seconds / 60))} min`
                  : "Untimed";
                const reviewPayload = parseTestReviewPayload(row.review_payload);
                const warningSummary = summarizeTestWarnings(reviewPayload, row.violations ?? 0);

                return (
                  <ScrollReveal key={row.id} delay={Math.min(index * 30, 180)}>
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                      <div className="flex flex-col gap-4 border-b bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--accent)/0.08),transparent)] p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeTone(row.test_type)}`}>
                            {getTypeLabel(row.test_type)}
                          </div>
                          <h3 className="mt-3 text-xl font-semibold text-foreground">
                            {row.subject_id || "Mixed subject"}
                            {row.topic_id ? ` - ${row.topic_id}` : ""}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Completed on {new Date(row.completed_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <MiniStat label="Score" value={`${row.score}/${row.max_score}`} />
                          <MiniStat label="Accuracy" value={`${accuracy}%`} />
                          <MiniStat label="Duration" value={durationText} />
                        </div>
                      </div>

                      <div className="grid gap-4 p-5 md:grid-cols-4">
                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Correct</p>
                          <p className="mt-2 text-2xl font-bold text-foreground">{row.correct_answers}</p>
                          <p className="text-xs text-muted-foreground">out of {row.total_questions}</p>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Attempted</p>
                          <p className="mt-2 text-2xl font-bold text-foreground">{row.questions_attempted}</p>
                          <p className="text-xs text-muted-foreground">questions answered</p>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Warnings</p>
                          <p className="mt-2 text-2xl font-bold text-foreground">{warningSummary.total}</p>
                          <p className="text-xs text-muted-foreground">
                            {warningSummary.rapidGuessWarnings > 0
                              ? `${warningSummary.focusWarnings} focus + ${warningSummary.rapidGuessWarnings} rapid-guess`
                              : "Saved with the attempt"}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Review answers</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {reviewPayload ? "Available now" : "Not available"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {reviewPayload
                              ? `${reviewPayload.question_ids.length} saved questions`
                              : "Only newer attempts with saved review data can open here."}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            disabled={!reviewPayload}
                            onClick={() => {
                              if (reviewPayload) {
                                setSelectedReview({ row, payload: reviewPayload });
                              }
                            }}
                          >
                            Review Answers
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            <ScrollReveal>
              <div className="rounded-2xl border border-dashed bg-card p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">No saved sessions yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Finish a topic test, adaptive practice, full paper, or assignment attempt and it will appear here automatically.
                </p>
                <Link to="/practice" className="mt-6 inline-flex">
                  <Button variant="hero" className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Go to practice
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function HistoryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const icon = label === "Duration" ? Clock3 : label === "Accuracy" ? BarChart3 : CalendarDays;

  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon === Clock3 ? <Clock3 className="h-4 w-4" /> : icon === BarChart3 ? <BarChart3 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
        <p className="text-xs uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function HistoryReviewPage({
  row,
  payload,
  onExit,
}: {
  row: StudentTables<"test_history">;
  payload: TestReviewPayload;
  onExit: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const entries = useMemo<ReviewEntry[]>(() => {
    const reviewLookup = new Map((payload.question_reviews || []).map((review) => [review.questionId, review]));

    return payload.question_ids
      .map((questionId, index) => {
        const question = getQuestionForPayloadReview(payload, index);
        if (!question) return null;

        return {
          question,
          answer: payload.answers[index] ?? createEmptyAnswer(question),
          review: reviewLookup.get(questionId) || null,
        };
      })
      .filter((entry): entry is ReviewEntry => Boolean(entry));
  }, [payload]);

  const missingCount = payload.question_ids.length - entries.length;
  const currentEntry = entries[currentIdx];

  const counts = useMemo(() => {
    return entries.reduce(
      (summary, entry) => {
        const state = getReviewState(entry.question, entry.answer);
        if (state === "correct") summary.correct += 1;
        if (state === "wrong") summary.wrong += 1;
        if (state === "unanswered") summary.unanswered += 1;
        return summary;
      },
      { correct: 0, wrong: 0, unanswered: 0 }
    );
  }, [entries]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <History className="h-3.5 w-3.5" />
              Attempt review
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground">{getTypeLabel(row.test_type)} review</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Completed on {new Date(row.completed_at).toLocaleString()}
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" />
            Back to history
          </Button>
        </div>

        {missingCount > 0 && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            {missingCount} question{missingCount === 1 ? "" : "s"} could not be reconstructed from the current question bank, so they are hidden from this review.
          </div>
        )}

        {entries.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-foreground">Review data is not available</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This attempt does not contain enough saved answer details to rebuild the question-by-question review.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <StatBox label="Total Questions" value={entries.length.toString()} tone="text-foreground" />
              <StatBox label="Correct" value={counts.correct.toString()} tone="text-success" />
              <StatBox label="Wrong" value={counts.wrong.toString()} tone="text-destructive" />
              <StatBox label="Unanswered" value={counts.unanswered.toString()} tone="text-foreground" />
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap gap-2">
                {entries.map((entry, index) => {
                  const status = getReviewState(entry.question, entry.answer);
                  const statusClass =
                    status === "correct"
                      ? "border-success/30 bg-success/10 text-success"
                      : status === "wrong"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-border bg-muted/40 text-muted-foreground";

                  return (
                    <button
                      key={entry.question.id}
                      type="button"
                      onClick={() => setCurrentIdx(index)}
                      className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        currentIdx === index ? "ring-2 ring-primary" : ""
                      } ${statusClass}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <ReviewQuestionCard
              question={currentEntry.question}
              selectedAnswer={currentEntry.answer}
            />

            {currentEntry.review && (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    Time spent: {currentEntry.review.timeSpentSeconds}s
                  </span>
                  {currentEntry.review.rapidGuessWarning && (
                    <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">
                      ELO adjusted by -{currentEntry.review.eloAdjustment}
                    </span>
                  )}
                </div>
                {currentEntry.review.warningText && (
                  <p className="mt-3 text-sm text-warning">{currentEntry.review.warningText}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((index) => index - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Question {currentIdx + 1} of {entries.length}
              </p>
              <Button variant="hero" disabled={currentIdx === entries.length - 1} onClick={() => setCurrentIdx((index) => index + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ReviewQuestionCard({
  question,
  selectedAnswer,
}: {
  question: Question;
  selectedAnswer: PracticeAnswer;
}) {
  const mcqAnswer = typeof selectedAnswer === "number" ? selectedAnswer : null;
  const msqAnswer = Array.isArray(selectedAnswer) ? selectedAnswer : [];
  const natAnswer = typeof selectedAnswer === "string" ? selectedAnswer : "";
  const correctIndexes = question.type === "msq"
    ? question.correctAnswers ?? []
    : [question.correctAnswer];
  const acceptedNatRange = question.correctNat
    ? question.correctNat.min === question.correctNat.max
      ? `${question.correctNat.min}`
      : `${question.correctNat.min} to ${question.correctNat.max}`
    : null;

  return (
    <div className="bg-card border rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          question.difficulty === "easy" ? "bg-success/10 text-success" :
          question.difficulty === "medium" ? "bg-warning/10 text-warning" :
          "bg-destructive/10 text-destructive"
        }`}>
          {question.difficulty}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{question.type === "mcq" ? "Multiple Choice" : question.type === "msq" ? "Multiple Select" : "Numerical Answer"}</span>
          <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">+{question.marks} marks</span>
          <span className="rounded-full bg-destructive/10 px-2 py-1 font-medium text-destructive">
            {question.type === "mcq" ? `-${question.negativeMarks} negative` : "No negative marks"}
          </span>
          <span>ELO: {question.eloRating}</span>
        </div>
      </div>

      <p className="text-lg font-medium leading-relaxed">{question.question}</p>

      {question.options.length > 0 && (
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = question.type === "msq" ? msqAnswer.includes(index) : mcqAnswer === index;
            const isCorrectChoice = correctIndexes.includes(index);
            let className = "w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ";

            if (isCorrectChoice) {
              className += "border-success bg-success/5 text-success";
            } else if (isSelected) {
              className += "border-destructive bg-destructive/5 text-destructive";
            } else {
              className += "border-border text-muted-foreground opacity-60";
            }

            return (
              <div key={index} className={className}>
                <span className="inline-flex items-center gap-3">
                  <span className={`h-7 w-7 shrink-0 border-2 flex items-center justify-center text-xs ${
                    question.type === "msq" ? "rounded-lg" : "rounded-full"
                  } ${
                    isCorrectChoice ? "border-success bg-success text-success-foreground" :
                    isSelected ? "border-destructive bg-destructive text-destructive-foreground" :
                    "border-border"
                  }`}>
                    {isCorrectChoice ? <CheckCircle2 className="h-4 w-4" /> :
                     isSelected ? <XCircle className="h-4 w-4" /> :
                     String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {question.type === "nat" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Submitted numerical answer</p>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background px-4 py-3 text-lg font-mono">
            {natAnswer || "No answer"}
          </div>
        </div>
      )}

      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <p className="text-sm font-medium text-primary mb-1">Explanation</p>
        <p className="text-sm text-muted-foreground">{question.explanation}</p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {question.type === "nat"
            ? `Accepted answer: ${acceptedNatRange}`
            : `Correct answer: ${correctIndexes.map((index) => String.fromCharCode(65 + index)).join(", ")}`}
        </p>
      </div>
    </div>
  );
}
