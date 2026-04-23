import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { ExamShellComponent } from "@/components/ExamShellComponent";
import { useStudentAuth } from "@/contexts/AuthContext";
import { visibleSubjects } from "@/data/subjects";
import {
  getFullMockQuestions,
  updateElo, Question,
} from "@/data/questions";
import {
  availableFullTests, getFullTestMeta, getFullTestQuestions, FullTestId,
} from "@/data/fullTests";
import {
  recommendNextBestAdaptiveQuestion,
  type AdaptiveSessionAttempt,
  type NextBestQuestionRecommendation,
} from "@/lib/nextBestQuestionEngine";
import { logStudentActivityEvent } from "@/lib/activityEvents";
import {
  buildRapidGuessWarning,
  getRapidGuessPenalty,
  getRapidGuessThresholdSeconds,
  type PracticeQuestionReview,
} from "@/lib/practiceReview";
import { buildTestReviewPayload } from "@/lib/testReview";
import {
  AlertTriangle, CheckCircle2, XCircle, ArrowRight,
  Play, Timer, Shield, BookOpen, Target, ChevronLeft, ChevronRight,
  Flag, Eye, EyeOff, User, X,
} from "lucide-react";

type PracticeMode = "select" | "full-mock" | "topic-wise" | "adaptive";
type ExamSection = "aptitude" | "technical";
type FullQuestionStatus =
  | "answered"
  | "not-answered"
  | "not-visited"
  | "review"
  | "answered-review";
type PracticeAnswer = number | number[] | string | null;
type PracticeResult = {
  correct: boolean;
  earnedMarks: number;
  maxMarks: number;
};
type QuestionSessionReview = PracticeQuestionReview & {
  correct: boolean;
};
type ReviewState = "correct" | "wrong" | "unanswered";
type QuestionLinkItem = {
  label: number;
  targetIndex: number | null;
  available: boolean;
};

function getDisplayedQuestionNumber(question: { id: string }, index: number) {
  const match = question.id.match(/q(\d+)$/);
  return match ? parseInt(match[1], 10) : index + 1;
}

function getQuestionLinkItems(questions: Array<{ id: string }>, displayQuestionCount?: number): QuestionLinkItem[] {
  const parsedNumbers = questions.map((question, index) => getDisplayedQuestionNumber(question, index));
  const maxNumber = displayQuestionCount || Math.max(...parsedNumbers, questions.length);
  const numberToIndex = new Map(parsedNumbers.map((number, index) => [number, index]));

  return Array.from({ length: maxNumber }, (_, index) => {
    const label = index + 1;
    return {
      label,
      targetIndex: numberToIndex.get(label) ?? null,
      available: numberToIndex.has(label),
    };
  });
}

function getExamSection(questionNumber: number): ExamSection {
  return questionNumber <= 10 ? "aptitude" : "technical";
}

function getQuestionTypeLabel(type: Question["type"]) {
  if (type === "mcq") return "Multiple Choice";
  if (type === "msq") return "Multiple Select";
  return "Numerical Answer";
}

function createEmptyAnswer(question?: Question): PracticeAnswer {
  if (!question) return null;
  if (question.type === "msq") return [];
  if (question.type === "nat") return "";
  return null;
}

function isQuestionAnswered(question: Question, answer: PracticeAnswer) {
  if (question.type === "mcq") return typeof answer === "number";
  if (question.type === "msq") return Array.isArray(answer) && answer.length > 0;
  return typeof answer === "string" && answer.trim() !== "";
}

function isQuestionCorrect(question: Question, answer: PracticeAnswer) {
  if (question.type === "mcq") return answer === question.correctAnswer;

  if (question.type === "msq" && question.correctAnswers && Array.isArray(answer)) {
    return (
      question.correctAnswers.length === answer.length &&
      question.correctAnswers.every((value) => answer.includes(value))
    );
  }

  if (question.type === "nat" && question.correctNat && typeof answer === "string") {
    const value = parseFloat(answer);
    return !Number.isNaN(value) && value >= question.correctNat.min && value <= question.correctNat.max;
  }

  return false;
}

function getEarnedMarks(question: Question, answer: PracticeAnswer) {
  if (!isQuestionAnswered(question, answer)) return 0;
  if (isQuestionCorrect(question, answer)) return question.marks;
  if (question.type === "mcq") return -question.negativeMarks;
  return 0;
}

function getReviewState(question: Question, answer: PracticeAnswer): ReviewState {
  if (!isQuestionAnswered(question, answer)) return "unanswered";
  return isQuestionCorrect(question, answer) ? "correct" : "wrong";
}

function createGraphSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `graph-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStudentActorName(
  user: { user_metadata?: Record<string, unknown> | null; email?: string | null } | null
) {
  const fullName = user?.user_metadata?.full_name;
  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : user?.email?.split("@")[0] || "Learner";
}

function buildGraphPathMetadata({
  sessionId,
  testType,
  questions,
  recommendations,
  results,
  questionReviews,
  subjectId,
  topicId,
}: {
  sessionId: string;
  testType: string;
  questions: Question[];
  recommendations: NextBestQuestionRecommendation[];
  results: PracticeResult[];
  questionReviews: Array<QuestionSessionReview | null>;
  subjectId: string;
  topicId: string | null;
}) {
  const accuracy = results.length > 0
    ? Math.round((results.filter((result) => result.correct).length / results.length) * 100)
    : 0;

  return {
    session_id: sessionId,
    test_type: testType,
    subject_id: subjectId,
    topic_id: topicId,
    total_questions: questions.length,
    accuracy,
    question_path: questions.map((question) => question.id),
    steps: questions.map((question, index) => ({
      order: index + 1,
      question_id: question.id,
      from_question_id: recommendations[index]?.graph?.fromQuestionId || null,
      correct: results[index]?.correct ?? null,
      difficulty: question.difficulty,
      edge_weight: recommendations[index]?.graph?.edgeWeight ?? null,
      edge_kind: recommendations[index]?.graph?.edgeKind ?? null,
      hop_distance: recommendations[index]?.graph?.hopDistance ?? null,
      remediation_for_question_id: recommendations[index]?.graph?.remediationForQuestionId ?? null,
      subject_id: question.subjectId,
      topic_id: question.topicId,
      time_spent_seconds: questionReviews[index]?.timeSpentSeconds ?? null,
      rapid_guess_warning: questionReviews[index]?.rapidGuessWarning ?? null,
      rapid_guess_threshold_seconds: questionReviews[index]?.rapidGuessThresholdSeconds ?? null,
      elo_adjustment: questionReviews[index]?.eloAdjustment ?? null,
      warning_text: questionReviews[index]?.warningText ?? null,
    })),
  };
}

function buildQuestionReview(
  question: Question,
  correct: boolean,
  timeSpentSeconds: number,
  remediationForQuestionId?: string | null
): QuestionSessionReview {
  const rapidGuessThresholdSeconds = getRapidGuessThresholdSeconds(question);
  const rapidGuessWarning = correct && timeSpentSeconds < rapidGuessThresholdSeconds;
  const eloAdjustment = rapidGuessWarning ? getRapidGuessPenalty(question, timeSpentSeconds) : 0;

  return {
    questionId: question.id,
    correct,
    timeSpentSeconds,
    rapidGuessWarning,
    rapidGuessThresholdSeconds,
    eloAdjustment,
    warningText: rapidGuessWarning ? buildRapidGuessWarning(question, timeSpentSeconds) : null,
    remediationForQuestionId: remediationForQuestionId || null,
  };
}

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get("mode") as PracticeMode | null;
  const urlSubject = searchParams.get("subject");
  const urlTopic = searchParams.get("topic");
  const urlTest = searchParams.get("test") as FullTestId | null;
  const hasRequestedFullTest = availableFullTests.some((test) => test.id === urlTest);

  const [mode, setMode] = useState<PracticeMode>(urlMode || "select");
  const [selectedSubject, setSelectedSubject] = useState(urlSubject || "");
  const [selectedTopic, setSelectedTopic] = useState(urlTopic || "");
  const [customTimer, setCustomTimer] = useState(30);
  const [topicQuestionCount, setTopicQuestionCount] = useState(10);
  const [adaptiveQuestionCount, setAdaptiveQuestionCount] = useState(10);
  const [adaptiveType, setAdaptiveType] = useState<"mix" | "subject-wise">("subject-wise");
  const [selectedFullTest, setSelectedFullTest] = useState<FullTestId>(hasRequestedFullTest ? urlTest! : "da-2025");

  useEffect(() => {
    if (urlMode) setMode(urlMode);
    if (urlSubject) setSelectedSubject(urlSubject);
    if (urlTopic) setSelectedTopic(urlTopic);
    if (hasRequestedFullTest && urlTest) setSelectedFullTest(urlTest);
  }, [hasRequestedFullTest, urlMode, urlSubject, urlTest, urlTopic]);

  if (mode === "full-mock") return <GateStyleMockTest testId={selectedFullTest} />;
  if (mode === "topic-wise" && (selectedTopic || selectedSubject))
    return (
      <ExamShellComponent
        testType="topic-wise"
        subjectId={selectedSubject}
        topicId={selectedTopic}
        durationMinutes={customTimer}
        questionCount={topicQuestionCount}
        onExit={() => setMode("select")}
      />
    );
  if (mode === "adaptive" && (adaptiveType === "mix" || selectedSubject))
    return (
      <ExamShellComponent
        testType="adaptive"
        adaptiveType={adaptiveType}
        subjectId={selectedSubject}
        questionCount={adaptiveQuestionCount}
        onExit={() => setMode("select")}
      />
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-12">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Practice</h1>
          <p className="text-muted-foreground mb-8">Choose your practice mode and start preparing.</p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <ScrollReveal delay={0}>
            <div className="bg-card border rounded-xl p-6 space-y-4 h-full min-h-[430px] flex flex-col">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Full GATE Paper</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Open an official-style exam page with exam information, question links, timer, palette, and GATE question types.
              </p>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={selectedFullTest}
                onChange={(e) => setSelectedFullTest(e.target.value as FullTestId)}
              >
                {availableFullTests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.label} ({test.displayQuestionCount || test.questionCount} questions)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {getFullTestMeta(selectedFullTest).description}
              </p>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Paper:</strong> {getFullTestMeta(selectedFullTest).paperCode || "Practice Paper"}</p>
                <p><strong>Questions:</strong> {getFullTestMeta(selectedFullTest).displayQuestionCount || getFullTestMeta(selectedFullTest).questionCount}</p>
                <p><strong>Duration:</strong> {getFullTestMeta(selectedFullTest).durationMinutes} minutes</p>
                <p><strong>Marks:</strong> {getFullTestMeta(selectedFullTest).maxMarks}</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Full-length paper mode with timer and palette</li>
                <li>• 180 minutes with tab-switch detection</li>
                <li>• 3 violations = auto-submit + penalty</li>
              </ul>
              <Button variant="hero" className="w-full gap-2 mt-auto" onClick={() => setMode("full-mock")}>
                <Play className="h-4 w-4" /> Open Exam
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <div className="bg-card border rounded-xl p-6 space-y-4 h-full min-h-[430px] flex flex-col">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold text-lg">Topic-wise Test</h3>
              <p className="text-sm text-muted-foreground">Practice specific topics with a custom timer.</p>

              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}>
                <option value="">Select subject...</option>
                {visibleSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {selectedSubject && (
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
                  <option value="">All topics</option>
                  {visibleSubjects.find((s) => s.id === selectedSubject)?.topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Timer: {customTimer} minutes</label>
                <input type="range" min={5} max={120} value={customTimer}
                  onChange={(e) => setCustomTimer(parseInt(e.target.value))}
                  className="w-full accent-primary" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Questions</label>
                <select
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm mt-1"
                  value={topicQuestionCount}
                  onChange={(e) => setTopicQuestionCount(parseInt(e.target.value))}
                >
                  {[10, 20, 30].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>

              <Button variant="hero" className="w-full gap-2 mt-auto" disabled={!selectedSubject}
                onClick={() => setMode("topic-wise")}>
                <Play className="h-4 w-4" /> Start Topic Test
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={160}>
            <div className="bg-card border rounded-xl p-6 space-y-4 h-full min-h-[430px] flex flex-col">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Adaptive Practice (Advanced)</h3>
              <p className="text-sm text-muted-foreground">Each next question is recommended live using your ELO, streak, weak topics, and recent answers.</p>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Adaptive Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdaptiveType("subject-wise")}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      adaptiveType === "subject-wise"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted hover:border-primary"
                    }`}
                  >
                    Subject-wise
                  </button>
                  <button
                    onClick={() => setAdaptiveType("mix")}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      adaptiveType === "mix"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted hover:border-primary"
                    }`}
                  >
                    Mix (All)
                  </button>
                </div>
              </div>

              {adaptiveType === "subject-wise" && (
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  <option value="">Select subject...</option>
                  {visibleSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Questions (3 min each)</label>
                <select
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm mt-1"
                  value={adaptiveQuestionCount}
                  onChange={(e) => setAdaptiveQuestionCount(parseInt(e.target.value))}
                >
                  {[10, 20, 30].map((count) => (
                    <option key={count} value={count}>{count} questions (~{count * 3} min)</option>
                  ))}
                </select>
              </div>

              <Button variant="hero" className="w-full gap-2 mt-auto" disabled={adaptiveType === "subject-wise" && !selectedSubject}
                onClick={() => setMode("adaptive")}>
                <Play className="h-4 w-4" /> Start Adaptive Practice
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GATE-Style Full Mock Test
// ============================================================
function GateStyleMockTest({ testId }: { testId: FullTestId }) {
  const {
    user,
    answeredQuestions,
    addAnsweredQuestion,
    updateSubjectScore,
    recordTestHistory,
    studentElo,
    setStudentElo,
  } = useStudentAuth();
  const fullTestMeta = getFullTestMeta(testId);
  const [questions] = useState(() => {
    if (testId === "full-gate") return getFullMockQuestions(answeredQuestions);
    return getFullTestQuestions(testId);
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  // answers: for MCQ = number|null, for MSQ = number[], for NAT = string
  const [answers, setAnswers] = useState<(number | number[] | string | null)[]>(
    () => questions.map((q) => (q.type === "msq" ? [] : q.type === "nat" ? "" : null))
  );
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(fullTestMeta.durationMinutes * 60);
  const [violations, setViolations] = useState(0);
  const [finished, setFinished] = useState(false);
  const [riskFinish, setRiskFinish] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set());
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningReason, setWarningReason] = useState("");
  const violationRef = useRef(violations);
  const lastViolationAtRef = useRef(0);
  const pendingWarningReasonRef = useRef<string | null>(null);
  const focusLossActiveRef = useRef(false);
  const questionLinkItems = getQuestionLinkItems(questions, fullTestMeta.displayQuestionCount);
  const displayedQuestionNumber = getDisplayedQuestionNumber(questions[currentIdx], currentIdx);
  const visibleQuestionCount = fullTestMeta.displayQuestionCount || questions.length;

  useEffect(() => { violationRef.current = violations; }, [violations]);

  const flushPendingWarning = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.hidden || !document.hasFocus()) return;

    const pendingReason = pendingWarningReasonRef.current;
    if (!pendingReason) return;

    pendingWarningReasonRef.current = null;
    setWarningReason(pendingReason);
    setWarningOpen(true);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.alert(
          `Warning: Test Focus Lost\n\n${pendingReason}\n\nWarnings used: ${violationRef.current}/3`
        );
      }, 0);
    }
  }, []);

  const acknowledgeWarning = useCallback(() => {
    setWarningOpen(false);
  }, []);

  useEffect(() => {
    if (!examStarted) return;
    setVisitedQuestions((prev) => {
      if (prev.has(currentIdx)) return prev;
      const next = new Set(prev);
      next.add(currentIdx);
      return next;
    });
  }, [examStarted, currentIdx]);

  // Timer
  useEffect(() => {
    if (finished || !examStarted) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setFinished(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, finished]);

  // Anti-cheat
  useEffect(() => {
    if (finished || !examStarted) return;
    const registerViolation = (reason: string) => {
      const now = Date.now();
      if (now - lastViolationAtRef.current < 1200) return;
      lastViolationAtRef.current = now;

      const n = violationRef.current + 1;
      setViolations(n);
      if (n >= 3) {
        pendingWarningReasonRef.current = null;
        setWarningOpen(false);
        return;
      }

      if (typeof document !== "undefined" && (document.hidden || !document.hasFocus())) {
        pendingWarningReasonRef.current = reason;
      } else {
        pendingWarningReasonRef.current = null;
        setWarningReason(reason);
        setWarningOpen(true);
      }
    };

    const registerFocusLossViolation = (reason: string) => {
      if (focusLossActiveRef.current) return;
      focusLossActiveRef.current = true;
      registerViolation(reason);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        registerFocusLossViolation("You moved away from the full mock test tab or minimized the exam window.");
        return;
      }

      focusLossActiveRef.current = false;
      flushPendingWarning();
    };

    const handleBlur = () => {
      registerFocusLossViolation("The full mock test lost focus. Switching tabs, using floating windows, or minimizing is not allowed.");
    };

    const handleFocus = () => {
      focusLossActiveRef.current = false;
      flushPendingWarning();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === "t" || key === "n") {
        event.preventDefault();
        event.stopPropagation();
        registerViolation("Opening a new browser tab or window is not allowed during the full mock test.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [examStarted, finished, flushPendingWarning]);

  const isAnswered = useCallback((idx: number) => {
    const a = answers[idx];
    const q = questions[idx];
    if (q.type === "mcq") return a !== null && a !== undefined;
    if (q.type === "msq") return Array.isArray(a) && a.length > 0;
    if (q.type === "nat") return typeof a === "string" && a.trim() !== "";
    return false;
  }, [answers, questions]);

  const isCorrect = useCallback((idx: number) => {
    const a = answers[idx];
    const q = questions[idx];
    if (q.type === "mcq") return a === q.correctAnswer;
    if (q.type === "msq" && q.correctAnswers && Array.isArray(a)) {
      return q.correctAnswers.length === a.length && q.correctAnswers.every((v) => a.includes(v));
    }
    if (q.type === "nat" && q.correctNat && typeof a === "string") {
      const val = parseFloat(a);
      return !isNaN(val) && val >= q.correctNat.min && val <= q.correctNat.max;
    }
    return false;
  }, [answers, questions]);

  const getQuestionStatus = (idx: number): FullQuestionStatus => {
    const answered = isAnswered(idx);
    const marked = markedForReview.has(idx);
    const visited = visitedQuestions.has(idx) || (examStarted && idx === currentIdx);

    if (answered && marked) return "answered-review";
    if (marked) return "review";
    if (answered) return "answered";
    if (visited) return "not-answered";
    return "not-visited";
  };

  const submitTest = useCallback((options?: { forceRiskFinish?: boolean; violationCountOverride?: number }) => {
    const finalRiskFinish = options?.forceRiskFinish ?? riskFinish;
    const finalViolations = options?.violationCountOverride ?? violations;
    let totalMarks = 0;
    let maxMarks = 0;
    let correctCount = 0;
    let attemptedCount = 0;
    let nextElo = studentElo;

    questions.forEach((q, i) => {
      const correct = isCorrect(i);
      const answered = isAnswered(i);

      maxMarks += q.marks;
      if (correct) {
        totalMarks += q.marks;
        correctCount += 1;
        nextElo = updateElo(nextElo, q.eloRating || 1500, true);
      } else if (answered && q.type === "mcq") {
        totalMarks -= q.negativeMarks;
      }

        if (answered) {
          attemptedCount += 1;
          addAnsweredQuestion(q.id, correct);
          updateSubjectScore(q.subjectId, correct, q.topicId);
        }
      });

    setStudentElo(nextElo);

    if (finalRiskFinish) totalMarks = Math.max(0, totalMarks - 5);
    const attemptDurationSeconds = Math.max(fullTestMeta.durationMinutes * 60 - timeLeft, 0);

    const testReviewPayload = buildTestReviewPayload({
      questions,
      answers,
      fullTestId: testId,
      attemptKind: "full-mock",
      countsForStats: true,
      countsForRating: true,
      warningBreakdown: { violations: finalViolations, testType: "full-mock" },
      reviewMetadata: {
        attemptDuration: attemptDurationSeconds,
        testType: "full-mock",
      },
    });

    void recordTestHistory({
      test_type: "full-mock",
      subject_id: null,
      topic_id: null,
      score: totalMarks,
      max_score: maxMarks,
      questions_attempted: attemptedCount,
      correct_answers: correctCount,
      total_questions: questions.length,
      violations: finalViolations,
      duration_seconds: attemptDurationSeconds,
      review_payload: testReviewPayload,
    });

    if (finalRiskFinish) {
      setRiskFinish(true);
    }
    setWarningOpen(false);
    setFinished(true);
  }, [
    addAnsweredQuestion,
    fullTestMeta.durationMinutes,
    isAnswered,
    isCorrect,
    questions,
    recordTestHistory,
    riskFinish,
    setStudentElo,
    studentElo,
    timeLeft,
    updateSubjectScore,
    violations,
  ]);

  useEffect(() => {
    if (!examStarted || finished || violations < 3) return;
    submitTest({ forceRiskFinish: true, violationCountOverride: violations });
  }, [examStarted, finished, submitTest, violations]);

  const setAnswer = (val: number | number[] | string | null) => {
    setAnswers((prev) => {
      const n = [...prev];
      n[currentIdx] = val;
      return n;
    });
  };

  const goToNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.add(currentIdx);
      return next;
    });
    goToNextQuestion();
  };

  const jumpToSection = (section: ExamSection) => {
    const target = questionLinkItems.find(
      (item) => item.available && getExamSection(item.label) === section && item.targetIndex !== null
    );

    if (target?.targetIndex !== null && target?.targetIndex !== undefined) {
      setCurrentIdx(target.targetIndex);
    }
  };

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 max-w-5xl space-y-8">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {fullTestMeta.paperCode || "Practice Paper"}
            </p>
            <h1 className="text-3xl font-bold">{fullTestMeta.label}</h1>
            <p className="text-muted-foreground">{fullTestMeta.description}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Maximum Marks</p>
              <p className="text-2xl font-bold mt-1">{fullTestMeta.maxMarks}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Questions</p>
              <p className="text-2xl font-bold mt-1">{visibleQuestionCount}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-2xl font-bold mt-1">{fullTestMeta.durationMinutes} mins</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Loaded Questions</p>
              <p className="text-2xl font-bold mt-1">{questions.length}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg">Question Links</h2>
                <p className="text-sm text-muted-foreground">
                  Jump-style preview similar to the official exam page. Disabled numbers are omitted from the imported paper.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-13 gap-2">
              {questionLinkItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={!item.available}
                  onClick={() => {
                    if (item.targetIndex !== null) {
                      setCurrentIdx(item.targetIndex);
                    }
                  }}
                  className={`h-9 rounded-md border text-xs font-medium transition-colors ${
                    item.available
                      ? "bg-background hover:bg-muted"
                      : "bg-muted/40 text-muted-foreground/50 cursor-not-allowed"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {fullTestMeta.note && (
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-muted-foreground">
                {fullTestMeta.note}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-3 text-sm text-muted-foreground">
            <p>The test uses the existing GATE-style interface with MCQ, MSQ, and NAT support.</p>
            <p>Timer starts only after you click start.</p>
            <p>Switching tabs or losing focus three times will auto-submit the test with a penalty.</p>
          </div>

          <div className="flex gap-3">
            <Link to="/practice">
              <Button variant="outline">Back</Button>
            </Link>
            <Button variant="hero" className="gap-2" onClick={() => { setVisitedQuestions(new Set([0])); setExamStarted(true); }}>
              <Play className="h-4 w-4" />
              Start Exam
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    let totalMarks = 0;
    let maxMarks = 0;
    questions.forEach((q, i) => {
      maxMarks += q.marks;
      if (isCorrect(i)) {
        totalMarks += q.marks;
      } else if (isAnswered(i) && q.type === "mcq") {
        totalMarks -= q.negativeMarks;
      }
    });
    if (riskFinish) totalMarks = Math.max(0, totalMarks - 5);
    const correctCount = questions.filter((_, i) => isCorrect(i)).length;
    const attemptedCount = questions.filter((_, i) => isAnswered(i)).length;

    if (reviewMode) {
      return (
        <TestReviewPage
          title={`${fullTestMeta.label} Review`}
          subtitle="Review your submitted answers, the correct answers, and every explanation."
          questions={questions}
          answers={answers}
          onExit={() => setReviewMode(false)}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 max-w-3xl">
          <div className="bg-card border rounded-xl p-8 space-y-6">
            {riskFinish ? (
              <>
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-destructive text-center">Test Terminated — Risk Detected</h2>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-sm space-y-1">
                  <p><strong>Violations:</strong> {violations} tab switches detected</p>
                  <p><strong>Reason:</strong> Leaving the test window is not allowed during a full mock test.</p>
                  <p><strong>Penalty:</strong> 5 marks deducted from total score</p>
                  <p><strong>Rule applied:</strong> On the 3rd violation, the test is auto-submitted immediately.</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-center">Test Complete!</h2>
              </>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{totalMarks.toFixed(1)}/{maxMarks}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{attemptedCount}/{questions.length}</p>
                <p className="text-xs text-muted-foreground">Attempted</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-success">{correctCount}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{violations}</p>
                <p className="text-xs text-muted-foreground">Violations</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => setReviewMode(true)}>Review Answers</Button>
              <Link to={`/practice?mode=full-mock&test=${testId}`}><Button variant="outline">Take Test Again</Button></Link>
              <Link to="/dashboard"><Button variant="hero">View Dashboard</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const hrs = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  const currentQuestionNumber = displayedQuestionNumber;
  const currentSection = getExamSection(currentQuestionNumber);
  const candidateName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidate";
  const answeredCount = questions.filter((_, i) => getQuestionStatus(i) === "answered").length;
  const notAnsweredCount = questions.filter((_, i) => getQuestionStatus(i) === "not-answered").length;
  const notVisitedCount = questions.filter((_, i) => getQuestionStatus(i) === "not-visited").length;
  const reviewCount = questions.filter((_, i) => getQuestionStatus(i) === "review").length;
  const answeredReviewCount = questions.filter((_, i) => getQuestionStatus(i) === "answered-review").length;
  const aptitudeCount = questionLinkItems.filter((item) => item.available && getExamSection(item.label) === "aptitude").length;
  const technicalCount = questionLinkItems.filter((item) => item.available && getExamSection(item.label) === "technical").length;

  return (
    <>
      {warningOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/35 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <button
              type="button"
              onClick={acknowledgeWarning}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close warning"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="space-y-2 pr-8">
                <h2 className="text-xl font-semibold text-red-600">Warning: Test Focus Lost</h2>
                <p className="text-sm leading-6 text-slate-600">{warningReason}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-slate-700">
              <p><strong>Warnings used:</strong> {violations}/3</p>
              <p><strong>Action:</strong> Stay on this tab until the test is complete.</p>
              <p><strong>Rule:</strong> After 3 violations, the test is auto-submitted with a 5-mark penalty.</p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={acknowledgeWarning}>
                Continue Test
              </Button>
            </div>
          </div>
        </div>
      )}

      <OfficialGateExamShell
        fullTestMeta={fullTestMeta}
        question={q}
        currentQuestionNumber={currentQuestionNumber}
        currentSection={currentSection}
        aptitudeCount={aptitudeCount}
        technicalCount={technicalCount}
        hrs={hrs}
        mins={mins}
        secs={secs}
        timeLeft={timeLeft}
        questionLinkItems={questionLinkItems}
        currentIdx={currentIdx}
        currentAnswer={answers[currentIdx]}
        showPalette={showPalette}
        candidateName={candidateName}
        violations={violations}
        answeredCount={answeredCount}
        notAnsweredCount={notAnsweredCount}
        notVisitedCount={notVisitedCount}
        reviewCount={reviewCount}
        answeredReviewCount={answeredReviewCount}
        getQuestionStatus={getQuestionStatus}
        onJumpToSection={jumpToSection}
        onJumpToQuestion={setCurrentIdx}
        onSetAnswer={setAnswer}
        onShowPaletteChange={setShowPalette}
        onPrevious={() => setCurrentIdx((i) => i - 1)}
        onClearResponse={() => setAnswer(q.type === "msq" ? [] : q.type === "nat" ? "" : null)}
        onMarkForReviewAndNext={handleMarkForReviewAndNext}
        onSaveAndNext={goToNextQuestion}
        onSubmit={submitTest}
        canGoPrevious={currentIdx > 0}
        canGoNext={currentIdx < questions.length - 1}
      />
    </>
  );
}

function OfficialGateExamShell({
  fullTestMeta,
  question,
  currentQuestionNumber,
  currentSection,
  aptitudeCount,
  technicalCount,
  hrs,
  mins,
  secs,
  timeLeft,
  questionLinkItems,
  currentIdx,
  currentAnswer,
  showPalette,
  candidateName,
  violations,
  answeredCount,
  notAnsweredCount,
  notVisitedCount,
  reviewCount,
  answeredReviewCount,
  getQuestionStatus,
  onJumpToSection,
  onJumpToQuestion,
  onSetAnswer,
  onShowPaletteChange,
  onPrevious,
  onClearResponse,
  onMarkForReviewAndNext,
  onSaveAndNext,
  onSubmit,
  canGoPrevious,
  canGoNext,
}: {
  fullTestMeta: ReturnType<typeof getFullTestMeta>;
  question: {
    type: Question["type"];
    question: string;
    options: string[];
    marks: number;
    negativeMarks: number;
  };
  currentQuestionNumber: number;
  currentSection: ExamSection;
  aptitudeCount: number;
  technicalCount: number;
  hrs: number;
  mins: number;
  secs: number;
  timeLeft: number;
  questionLinkItems: QuestionLinkItem[];
  currentIdx: number;
  currentAnswer: number | number[] | string | null;
  showPalette: boolean;
  candidateName: string;
  violations: number;
  answeredCount: number;
  notAnsweredCount: number;
  notVisitedCount: number;
  reviewCount: number;
  answeredReviewCount: number;
  getQuestionStatus: (idx: number) => FullQuestionStatus;
  onJumpToSection: (section: ExamSection) => void;
  onJumpToQuestion: (idx: number) => void;
  onSetAnswer: (value: number | number[] | string | null) => void;
  onShowPaletteChange: (show: boolean) => void;
  onPrevious: () => void;
  onClearResponse: () => void;
  onMarkForReviewAndNext: () => void;
  onSaveAndNext: () => void;
  onSubmit: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}) {
  const msqAnswer = Array.isArray(currentAnswer) ? currentAnswer : [];
  const currentSectionTitle = currentSection === "aptitude" ? "General Aptitude" : "Subject Questions";
  const sectionQuestionItems = questionLinkItems.filter(
    (item) => item.available && getExamSection(item.label) === currentSection
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#eef1f5] text-[#1b1b1b]">
      <div className="border-t-4 border-[#2b3a1e] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="text-[11px] font-black tracking-[0.24em] text-[#a31f21] sm:text-[13px]">GATE</div>
            <div className="-mt-1 text-[10px] font-semibold tracking-[0.16em] text-[#2f2f2f] sm:text-[11px]">DA PREP</div>
          </div>

          <div className="text-center leading-tight">
            <h1 className="text-lg font-bold text-[#991b1b] sm:text-[2rem]">Mock Test Assessment</h1>
            <p className="text-xs font-semibold text-[#1479c7] sm:text-xl">Organizer : GateWay</p>
          </div>

          <div className="hidden min-w-0 text-right sm:block">
            <div className="text-[11px] font-black tracking-[0.24em] text-[#a31f21] sm:text-[13px]">GATE</div>
            <div className="-mt-1 text-[10px] font-semibold tracking-[0.16em] text-[#2f2f2f] sm:text-[11px]">DA PREP</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#2f2f2f] px-3 py-2 text-white sm:px-6">
          <p className="text-sm font-bold sm:text-lg">{fullTestMeta.label.toUpperCase()}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${
              violations > 0 ? "bg-[#7f1d1d] text-white" : "bg-white/10 text-white"
            }`}>
              <AlertTriangle className="h-4 w-4" />
              Warnings {violations}/3
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5aa6dd] text-[10px] font-bold text-white">i</span>
              Instructions
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium">
              <BookOpen className="h-4 w-4" />
              Question Paper
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="grid min-h-0 grid-rows-[auto_auto_auto_1fr_auto] border-r border-[#d6d9de]">
          <div className="border-b border-[#d8d8d8] bg-[#f7f7f7] px-3 py-2 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Sections</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToSection("aptitude")}
                    className={`rounded-sm border px-4 py-2 text-sm font-semibold transition-colors ${
                      currentSection === "aptitude"
                        ? "border-[#2b7ec0] bg-[#2b7ec0] text-white"
                        : "border-[#d0d0d0] bg-white text-[#1b1b1b]"
                    }`}
                  >
                    General Aptitude
                    <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px]">{aptitudeCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToSection("technical")}
                    className={`rounded-sm border px-4 py-2 text-sm font-semibold transition-colors ${
                      currentSection === "technical"
                        ? "border-[#2b7ec0] bg-[#2b7ec0] text-white"
                        : "border-[#d0d0d0] bg-white text-[#1b1b1b]"
                    }`}
                  >
                    Subject Questions
                    <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px]">{technicalCount}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-sm border border-[#dadada] bg-white px-4 py-2 lg:min-w-[255px]">
                <span className="text-sm font-semibold text-[#303030]">Time Left :</span>
                <span className={`font-mono text-lg font-bold sm:text-xl ${timeLeft < 300 ? "text-[#c62828]" : "text-[#111827]"}`}>
                  {String(hrs).padStart(2, "0")}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          {fullTestMeta.note && (
            <div className="border-b border-[#e0d7a7] bg-[#fff8df] px-3 py-2 text-sm text-[#6d5b00] sm:px-6">
              {fullTestMeta.note}
            </div>
          )}

          <div className="border-b border-[#d8d8d8] bg-white px-3 py-2 text-sm sm:px-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <p>
                <span className="font-semibold">Question Type :</span> {getQuestionTypeLabel(question.type)}
              </p>
              <p className="text-right">
                Marks for correct answer <span className="font-semibold text-[#1d7bbf]">{question.marks}</span>
                {" "} | {" "}
                Negative Marks <span className="font-semibold text-[#cf2c2c]">{question.type === "mcq" ? question.negativeMarks : 0}</span>
              </p>
            </div>
          </div>

          <div className="border-b border-[#d8d8d8] bg-white px-3 py-2 text-sm sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#1f2937]">{currentSectionTitle}</span>
              <span className="whitespace-nowrap font-semibold text-[#1f2937]">Q. No. {currentQuestionNumber}</span>
            </div>
          </div>

          <div className="min-h-0 overflow-hidden px-2 py-2 sm:px-4 sm:py-3">
            <div className="flex h-full min-h-0 flex-col rounded-sm border border-[#d3d7dc] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="min-h-0 flex-1 overflow-y-auto border-b border-[#e5e7eb] px-4 py-3 sm:px-5">
                <div className="space-y-3 text-[13px] leading-5 text-[#202020]">
                  <p className="whitespace-pre-line">{question.question}</p>

                  {question.options.length > 0 && (
                    <div className="space-y-1 pt-1 text-[13px]">
                      {question.options.map((opt, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="min-w-5 font-medium">{String.fromCharCode(65 + i)}.</span>
                          <span className="whitespace-pre-wrap leading-5">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-2.5 sm:px-5">
                <p className="text-sm font-semibold text-[#111827]">Your Answer:</p>

                {question.type === "mcq" && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {question.options.map((opt, i) => {
                      const selected = currentAnswer === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSetAnswer(i)}
                          className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? "border-[#1d7bbf] bg-[#eef7ff]"
                              : "border-[#d5d9de] bg-white hover:border-[#92b9d8]"
                          }`}
                        >
                          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#8d98a5]">
                            <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-[#1d7bbf]" : "bg-transparent"}`} />
                          </span>
                          <span className="flex items-start gap-2 text-sm leading-5 text-[#242424]">
                            <span className="font-semibold">{String.fromCharCode(65 + i)}</span>
                            <span className="whitespace-pre-wrap">{opt}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {question.type === "msq" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[#5c6470]">Select one or more options.</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {question.options.map((opt, i) => {
                        const selected = msqAnswer.includes(i);

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (selected) onSetAnswer(msqAnswer.filter((value) => value !== i));
                              else onSetAnswer([...msqAnswer, i]);
                            }}
                            className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors ${
                              selected
                                ? "border-[#1d7bbf] bg-[#eef7ff]"
                                : "border-[#d5d9de] bg-white hover:border-[#92b9d8]"
                            }`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-sm border ${
                              selected ? "border-[#1d7bbf] bg-[#1d7bbf] text-white" : "border-[#8d98a5] bg-white text-transparent"
                            }`}>
                              X
                            </span>
                            <span className="flex items-start gap-2 text-sm leading-5 text-[#242424]">
                              <span className="font-semibold">{String.fromCharCode(65 + i)}</span>
                              <span className="whitespace-pre-wrap">{opt}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {question.type === "nat" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[#5c6470]">Enter a numerical answer. Decimals are allowed.</p>
                    <input
                      type="number"
                      step="any"
                      value={typeof currentAnswer === "string" ? currentAnswer : ""}
                      onChange={(e) => onSetAnswer(e.target.value)}
                      className="w-full max-w-sm rounded-sm border border-[#c9d1db] bg-white px-4 py-2.5 text-lg font-mono outline-none transition-colors focus:border-[#1d7bbf]"
                      placeholder="Type your answer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-[#d8d8d8] bg-white px-3 py-2 sm:px-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-[#bfc6d0] bg-white text-[#202020] hover:bg-[#f4f6f9]"
                  disabled={!canGoPrevious}
                  onClick={onPrevious}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="border-[#bfc6d0] bg-white text-[#202020] hover:bg-[#f4f6f9]"
                  onClick={onClearResponse}
                >
                  Clear Response
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  variant="outline"
                  className="border-[#c69b00] bg-[#fff7d6] text-[#6e5200] hover:bg-[#ffefb2]"
                  onClick={onMarkForReviewAndNext}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Mark for Review & Next
                </Button>
                <Button
                  variant="hero"
                  className="bg-[#2b7ec0] text-white hover:bg-[#246fa9]"
                  onClick={onSaveAndNext}
                  disabled={!canGoNext}
                >
                  Save & Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showPalette && (
          <aside className="flex min-h-0 flex-col border-t border-[#d8d8d8] bg-[#d9ebf6] xl:border-t-0 xl:border-l">
            <div className="flex items-center justify-between border-b border-[#cfdbe4] bg-white px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-[#d8d8d8] bg-[#f7f7f7]">
                  <User className="h-8 w-8 text-[#7d7d7d]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#5e6a78]">Candidate</p>
                  <p className="max-w-[170px] break-words text-lg font-semibold text-[#1c2430]">{candidateName}</p>
                </div>
              </div>

              <button type="button" onClick={() => onShowPaletteChange(false)} className="hidden text-[#5b6775] xl:block">
                <EyeOff className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-[#cfdbe4] bg-white px-4 py-3">
              <p className="mb-3 text-sm font-semibold text-[#202020]">Legend</p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex min-w-9 justify-center rounded-sm bg-[#39a949] px-2 py-2 font-bold text-white">{answeredCount}</span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex min-w-9 justify-center rounded-sm bg-[#e53935] px-2 py-2 font-bold text-white">{notAnsweredCount}</span>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex min-w-9 justify-center rounded-sm bg-[#8f8f8f] px-2 py-2 font-bold text-white">{notVisitedCount}</span>
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex min-w-9 justify-center rounded-full bg-[#7f31b5] px-2 py-2 font-bold text-white">{reviewCount}</span>
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="relative inline-flex min-w-9 justify-center rounded-full bg-[#7f31b5] px-2 py-2 font-bold text-white">
                    {answeredReviewCount}
                    <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white bg-[#39a949]" />
                  </span>
                  <span>Answered and Marked for Review</span>
                </div>
              </div>

              {violations > 0 && (
                <div className="mt-4 rounded-sm border border-[#f2c9c8] bg-[#fff0f0] px-3 py-2 text-xs text-[#9b1c1c]">
                  Focus warnings: {violations}/3
                </div>
              )}
            </div>

            <div className="bg-[#2b86b3] px-4 py-2 text-sm font-semibold text-white">
              {currentSectionTitle}
            </div>

            <div className="min-h-0 flex flex-1 flex-col px-4 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1c2430]">Choose a Question</p>
                <button type="button" onClick={() => onShowPaletteChange(false)} className="text-[#5b6775] xl:hidden">
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-5 gap-1">
                  {sectionQuestionItems.map((item) => {
                    if (item.targetIndex === null) {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          disabled
                          className="h-8 rounded-sm border border-dashed border-[#b5bcc4] bg-white/60 text-[11px] font-semibold text-[#95a0ad]"
                        >
                          {item.label}
                        </button>
                      );
                    }

                    const status = getQuestionStatus(item.targetIndex);
                    const isCurrent = item.targetIndex === currentIdx;
                    const statusClasses =
                      status === "answered"
                        ? "bg-[#39a949] text-white"
                        : status === "not-answered"
                          ? "bg-[#e53935] text-white"
                          : status === "review"
                            ? "bg-[#7f31b5] text-white"
                            : status === "answered-review"
                              ? "bg-[#7f31b5] text-white"
                              : "bg-[#8f8f8f] text-white";

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => onJumpToQuestion(item.targetIndex as number)}
                        className={`relative h-8 rounded-sm text-[11px] font-semibold transition-transform ${statusClasses} ${
                          isCurrent ? "ring-2 ring-[#ffb74d] ring-offset-2 ring-offset-[#d9ebf6]" : ""
                        }`}
                      >
                        {item.label}
                        {status === "answered-review" && (
                          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white bg-[#39a949]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <Button
                variant="hero"
                className="w-full bg-[#4da2d3] text-base font-semibold text-white hover:bg-[#3f8fbd]"
                onClick={onSubmit}
              >
                Submit
              </Button>
            </div>
          </aside>
        )}
      </div>

      {!showPalette && (
        <button
          type="button"
          onClick={() => onShowPaletteChange(true)}
          className="fixed bottom-5 right-5 rounded-full border border-[#ccd5de] bg-white p-3 shadow-lg xl:bottom-auto xl:right-[18px] xl:top-1/2 xl:-translate-y-1/2"
        >
          <Eye className="h-5 w-5 text-[#344050]" />
        </button>
      )}
    </div>
  );
}

// ============================================================
// Shared Review Screen
// Shared Review Screen
// ============================================================
function TestReviewPage({
  title,
  subtitle,
  questions,
  answers,
  questionReviews,
  onExit,
}: {
  title: string;
  subtitle: string;
  questions: Question[];
  answers: PracticeAnswer[];
  questionReviews?: Array<QuestionSessionReview | null>;
  onExit: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentQuestion = questions[currentIdx];
  const currentAnswer = answers[currentIdx] ?? createEmptyAnswer(currentQuestion);
  const currentReview = questionReviews?.[currentIdx] ?? null;

  const correctCount = questions.filter((question, index) => getReviewState(question, answers[index]) === "correct").length;
  const wrongCount = questions.filter((question, index) => getReviewState(question, answers[index]) === "wrong").length;
  const unansweredCount = questions.filter((question, index) => getReviewState(question, answers[index]) === "unanswered").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <Button variant="outline" onClick={onExit}>Back to Result</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-2xl font-bold">{questions.length}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-2xl font-bold text-success">{correctCount}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-2xl font-bold text-destructive">{wrongCount}</p>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-2xl font-bold">{unansweredCount}</p>
            <p className="text-xs text-muted-foreground">Unanswered</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {questions.map((question, index) => {
              const status = getReviewState(question, answers[index]);
              const statusClass =
                status === "correct"
                  ? "border-success/30 bg-success/10 text-success"
                  : status === "wrong"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-muted/40 text-muted-foreground";

              return (
                <button
                  key={question.id}
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

        <QuestionCard
          question={currentQuestion}
          selectedAnswer={currentAnswer}
          onAnswerChange={() => {}}
          showExplanation
        />

        {currentReview && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                Time spent: {currentReview.timeSpentSeconds}s
              </span>
              {currentReview.rapidGuessWarning && (
                <span className="rounded-full bg-warning/10 px-3 py-1 text-warning">
                  ELO adjusted by -{currentReview.eloAdjustment}
                </span>
              )}
            </div>
            {currentReview.warningText && (
              <p className="mt-3 text-sm text-warning">{currentReview.warningText}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((index) => index - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Question {currentIdx + 1} of {questions.length}
          </p>
          <Button
            variant="hero"
            disabled={currentIdx === questions.length - 1}
            onClick={() => setCurrentIdx((index) => index + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Question Card Component (for topic/adaptive modes)
// ============================================================
function QuestionCard({
  question, selectedAnswer, onAnswerChange, showExplanation,
}: {
  question: Question;
  selectedAnswer: PracticeAnswer;
  onAnswerChange: (answer: PracticeAnswer) => void;
  showExplanation: boolean;
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
          <span>{getQuestionTypeLabel(question.type)}</span>
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
          {question.options.map((opt, i) => {
            const isSelected = question.type === "msq" ? msqAnswer.includes(i) : mcqAnswer === i;
            const isCorrectChoice = correctIndexes.includes(i);
            let className = "w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ";

            if (showExplanation) {
              if (isCorrectChoice) {
                className += "border-success bg-success/5 text-success";
              } else if (isSelected) {
                className += "border-destructive bg-destructive/5 text-destructive";
              } else {
                className += "border-border text-muted-foreground opacity-50";
              }
            } else {
              className += isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/30 hover:bg-muted/50 active:scale-[0.98]";
            }

            return (
              <button
                key={i}
                className={className}
                onClick={() => {
                  if (showExplanation) return;
                  if (question.type === "msq") {
                    onAnswerChange(
                      msqAnswer.includes(i)
                        ? msqAnswer.filter((value) => value !== i)
                        : [...msqAnswer, i]
                    );
                    return;
                  }
                  onAnswerChange(i);
                }}
                disabled={showExplanation}
              >
                <span className="inline-flex items-center gap-3">
                  <span className={`h-7 w-7 shrink-0 border-2 flex items-center justify-center text-xs ${
                    question.type === "msq" ? "rounded-lg" : "rounded-full"
                  } ${
                    showExplanation && isCorrectChoice ? "border-success bg-success text-success-foreground" :
                    showExplanation && isSelected ? "border-destructive bg-destructive text-destructive-foreground" :
                    isSelected ? "border-primary bg-primary text-primary-foreground" :
                    "border-border"
                  }`}>
                    {showExplanation && isCorrectChoice ? <CheckCircle2 className="h-4 w-4" /> :
                     showExplanation && isSelected ? <XCircle className="h-4 w-4" /> :
                     String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === "nat" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Enter a numerical answer. Decimals are allowed.</p>
          <input
            type="number"
            step="any"
            value={natAnswer}
            onChange={(event) => onAnswerChange(event.target.value)}
            disabled={showExplanation}
            className="w-full max-w-sm rounded-xl border border-border bg-background px-4 py-3 text-lg font-mono outline-none transition-colors focus:border-primary"
            placeholder="Type your answer"
          />
        </div>
      )}

      {showExplanation && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
          <p className="text-sm font-medium text-primary mb-1">Explanation</p>
          <p className="text-sm text-muted-foreground">{question.explanation}</p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {question.type === "nat"
              ? `Accepted answer: ${acceptedNatRange}`
              : `Correct answer: ${correctIndexes.map((index) => String.fromCharCode(65 + index)).join(", ")}`}
          </p>
        </div>
      )}
    </div>
  );
}
