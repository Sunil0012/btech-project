/**
 * ExamShellComponent - Unified exam execution for Topic-Wise and Adaptive tests
 * Features: Timer, full question set before solutions, palette with visited state,
 * skip/next, mark-for-review, exit confirmation, no explanations during attempt.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { Question } from "@/data/questions";
import { getTopicWiseTestQuestions } from "@/data/topicWiseTest";
import { getAdaptiveQuestionBank } from "@/data/adaptiveTest";
import { getAdaptiveMixQuestionBank } from "@/data/adaptiveMixTest";
import { Navbar } from "@/components/Navbar";
import {
  buildRapidGuessWarning,
  getRapidGuessAdjustedEloGain,
  getRapidGuessThresholdSeconds,
} from "@/lib/practiceReview";
import {
  buildTestReviewPayload,
  calculateWarningBreakdown,
  type AttemptKind,
  type PracticeAnswer,
  type QuestionSessionReviewPayload,
} from "@/lib/testReview";
import {
  createExamShellState,
  reduceExamShellState,
  getAnswersArray,
  type ExamShellState,
  type ExamShellAction,
} from "@/lib/examShellState";
import {
  recommendNextBestAdaptiveQuestion,
  type AdaptiveSessionAttempt,
} from "@/lib/nextBestQuestionEngine";
import { logStudentActivityEvent } from "@/lib/activityEvents";
import {
  Clock, ChevronLeft, ChevronRight, Flag, X, CheckCircle2,
} from "lucide-react";

interface ExamShellComponentProps {
  // Test configuration
  testType: "topic-wise" | "adaptive";
  adaptiveType?: "mix" | "subject-wise"; // For adaptive tests
  subjectId: string;
  topicId?: string;
  durationMinutes?: number; // Optional if timePerQuestion is used
  timePerQuestion?: number; // Minutes per question (default 3). If set, durationMinutes is calculated
  questionCount: number;
  
  // Callbacks
  onComplete?: (payload: any) => void;
  onExit?: () => void;
}

function isAnsweredValue(answer: PracticeAnswer) {
  return (
    answer !== null &&
    answer !== undefined &&
    (typeof answer !== "string" || answer.trim() !== "") &&
    (typeof answer !== "object" || (Array.isArray(answer) && answer.length > 0))
  );
}

function isCorrectValue(question: Question, answer: PracticeAnswer) {
  if (!isAnsweredValue(answer)) return false;

  if (question.type === "mcq") {
    return answer === question.correctAnswer;
  }

  if (question.type === "msq" && question.correctAnswers && Array.isArray(answer)) {
    return (
      question.correctAnswers.length === answer.length &&
      question.correctAnswers.every((value) => answer.includes(value))
    );
  }

  if (question.type === "nat" && question.correctNat && typeof answer === "string") {
    const parsed = Number.parseFloat(answer);
    return !Number.isNaN(parsed) && parsed >= question.correctNat.min && parsed <= question.correctNat.max;
  }

  return false;
}

function selectFallbackAdaptiveQuestion(
  questionBank: Question[],
  servedIds: Set<string>,
  answeredIds: Set<string>,
  studentElo: number,
  subjectId?: string | null,
  topicId?: string
) {
  return [...questionBank]
    .filter((question) => {
      if (subjectId && question.subjectId !== subjectId) return false;
      if (topicId && question.topicId !== topicId) return false;
      if (servedIds.has(question.id) || answeredIds.has(question.id)) return false;
      return true;
    })
    .sort((left, right) => {
      const leftGap = Math.abs(left.eloRating - studentElo);
      const rightGap = Math.abs(right.eloRating - studentElo);
      if (leftGap !== rightGap) return leftGap - rightGap;
      return right.eloRating - left.eloRating;
    })[0] || null;
}

export function ExamShellComponent({
  testType,
  adaptiveType,
  subjectId,
  topicId,
  durationMinutes: fixedDuration,
  timePerQuestion = 3, // Default 3 minutes per question
  questionCount,
  onComplete,
  onExit,
}: ExamShellComponentProps) {
  const navigate = useNavigate();
  const {
    user,
    answeredQuestions,
    addAnsweredQuestion,
    updateSubjectScore,
    recordTestHistory,
    studentElo,
    setStudentElo,
  } = useStudentAuth();

  // Calculate duration based on timePerQuestion or use fixed duration
  const calculatedDurationMinutes = fixedDuration ?? questionCount * timePerQuestion;

  const activeAdaptiveBank = useMemo(
    () =>
      adaptiveType === "mix"
        ? getAdaptiveMixQuestionBank()
        : getAdaptiveQuestionBank(subjectId || null),
    [adaptiveType, subjectId]
  );

  const adaptiveSubjectId = adaptiveType === "mix" ? null : subjectId;
  const sessionConfigKey = useMemo(
    () =>
      [
        testType,
        adaptiveType || "default",
        subjectId || "all-subjects",
        topicId || "all-topics",
        questionCount,
      ].join("::"),
    [adaptiveType, questionCount, subjectId, testType, topicId]
  );

  // Load questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [adaptiveSessionAttempts, setAdaptiveSessionAttempts] = useState<AdaptiveSessionAttempt[]>([]);
  const sessionIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const adaptiveExpandedIndicesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    sessionIdRef.current = Math.random().toString(36).slice(2, 10);
    adaptiveExpandedIndicesRef.current = new Set();
    submittingRef.current = false;
    setExamState(null);
    setAdaptiveSessionAttempts([]);
    setShowReviewMode(false);
    setSubmitError(null);

    if (testType === "topic-wise") {
      setQuestions(
        getTopicWiseTestQuestions({
          subjectId: subjectId || undefined,
          topicId: topicId || undefined,
          count: questionCount,
          answeredIds: answeredQuestions,
        })
      );
      return;
    }

    const seedRecommendation = recommendNextBestAdaptiveQuestion({
      subjectId: adaptiveSubjectId,
      studentElo,
      topicId: topicId || null,
      constrainToTopic: Boolean(topicId),
      answeredQuestionIds: answeredQuestions,
      sessionQuestionIds: new Set<string>(),
      sessionAttempts: [],
      questionBank: activeAdaptiveBank,
    });

    const seedQuestion =
      seedRecommendation.question ||
      selectFallbackAdaptiveQuestion(
        activeAdaptiveBank,
        new Set<string>(),
        answeredQuestions,
        studentElo,
        adaptiveSubjectId,
        topicId
      );

    setQuestions(seedQuestion ? [seedQuestion] : []);
  }, [
    activeAdaptiveBank,
    adaptiveSubjectId,
    sessionConfigKey,
    testType,
    topicId,
  ]);

  const [examState, setExamState] = useState<ExamShellState | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(calculatedDurationMinutes);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [questionTimeSpent, setQuestionTimeSpent] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const submittingRef = useRef(false);
  const lastWarningTimeRef = useRef<number>(0);
  const [eloBreakdown, setEloBreakdown] = useState<Array<{ questionId: string; gain: number; penalty: number; total: number }>>();

  useEffect(() => {
    if (!questions.length || examState) return;

    const targetQuestionCount =
      testType === "adaptive" ? questionCount : Math.min(questionCount, questions.length);

    const state = createExamShellState({
      sessionId: sessionIdRef.current,
      testType,
      totalQuestions: targetQuestionCount,
      targetQuestions: targetQuestionCount,
      durationSeconds: calculatedDurationMinutes * 60,
    });

    setExamState(state);
  }, [questions, calculatedDurationMinutes, questionCount, testType, examState]);

  useEffect(() => {
    setTimerMinutes(calculatedDurationMinutes);
    setTimerSeconds(0);
  }, [calculatedDurationMinutes]);

  // Timer effect - update timer display
  useEffect(() => {
    if (!examState || examState.submitted || !examState.isTimerActive || !questions.length) return;

    const interval = setInterval(() => {
      setExamState((prev) => {
        if (!prev) return prev;

        const elapsed = (Date.now() - prev.timerStartedAt) / 1000;
        const remaining = Math.max(0, prev.durationSeconds - elapsed);

        if (remaining === 0) {
          return reduceExamShellState(prev, { type: "SUBMIT" });
        }

        return prev;
      });
    }, 500); // Update more frequently for smoother display

    return () => clearInterval(interval);
  }, [examState, questions.length]);

  // Separate effect to update timer display values
  useEffect(() => {
    if (!examState) return;

    const updateDisplay = () => {
      const elapsed = (Date.now() - examState.timerStartedAt) / 1000;
      const remaining = Math.max(0, examState.durationSeconds - elapsed);

      setTimerMinutes(Math.floor(remaining / 60));
      setTimerSeconds(Math.round(remaining % 60));

      // Show warnings at specific intervals
      if (remaining > 0 && remaining <= 300) {
        // Show warning if less than 5 minutes and not shown recently
        if (Date.now() - lastWarningTimeRef.current > 60000) {
          setShowTimeWarning(true);
          lastWarningTimeRef.current = Date.now();
          // Auto hide warning after 3 seconds
          setTimeout(() => setShowTimeWarning(false), 3000);
        }
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 500);
    return () => clearInterval(interval);
  }, [examState]);

  // Track per-question time
  useEffect(() => {
    if (!examState || examState.submitted) return;

    const updateQuestionTime = () => {
      const currentSlot = examState.palette[examState.currentQuestionIndex];
      if (currentSlot) {
        const slotTimeSpent = currentSlot.timeSpentSeconds || 0;
        const activeElapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - examState.lastNavigatedAt) / 1000)
        );
        setQuestionTimeSpent(slotTimeSpent + activeElapsedSeconds);
      }
    };

    updateQuestionTime();
    const interval = setInterval(updateQuestionTime, 500);
    return () => clearInterval(interval);
  }, [examState]);

  const processAction = useCallback((action: ExamShellAction) => {
    setExamState((prev) => {
      if (!prev) return prev;
      return reduceExamShellState(prev, action);
    });
  }, []);

  const currentQuestion = examState ? questions[examState.currentQuestionIndex] : null;
  const currentAnswer = examState ? examState.answers.get(examState.currentQuestionIndex) : null;
  const isMarkedForReview = examState?.markedForReview.has(examState.currentQuestionIndex) ?? false;

  const buildNextAdaptiveAttempt = useCallback(() => {
    if (!examState || testType !== "adaptive") return adaptiveSessionAttempts;

    const currentIndex = examState.currentQuestionIndex;
    const activeQuestion = questions[currentIndex];
    if (!activeQuestion) return adaptiveSessionAttempts;

    const answer = examState.answers.get(currentIndex) ?? null;
    if (!isAnsweredValue(answer)) return adaptiveSessionAttempts;

    const nextAttempt: AdaptiveSessionAttempt = {
      questionId: activeQuestion.id,
      topicId: activeQuestion.topicId,
      difficulty: activeQuestion.difficulty,
      eloRating: activeQuestion.eloRating,
      correct: isCorrectValue(activeQuestion, answer),
    };

    return [...adaptiveSessionAttempts, nextAttempt];
  }, [adaptiveSessionAttempts, examState, questions, testType]);

  const unlockAndNavigate = useCallback((targetIndex: number) => {
    setExamState((prev) => {
      if (!prev) return prev;
      const unlockedState = prev.palette[targetIndex]?.isUnlocked
        ? prev
        : reduceExamShellState(prev, { type: "UNLOCK_NEXT_QUESTIONS_BLOCK" });
      return reduceExamShellState(unlockedState, {
        type: "NAVIGATE_TO_QUESTION",
        payload: { questionIndex: targetIndex },
      });
    });
  }, []);

  const ensureAdaptiveNextQuestion = useCallback(() => {
    if (!examState || testType !== "adaptive") return false;

    const currentIndex = examState.currentQuestionIndex;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questionCount) return false;

    if (questions[nextIndex]) return true;
    if (adaptiveExpandedIndicesRef.current.has(currentIndex)) return Boolean(questions[nextIndex]);

    adaptiveExpandedIndicesRef.current.add(currentIndex);
    const nextSessionAttempts = buildNextAdaptiveAttempt();
    if (nextSessionAttempts.length !== adaptiveSessionAttempts.length) {
      setAdaptiveSessionAttempts(nextSessionAttempts);
    }

    const servedIds = new Set(questions.map((question) => question.id));
    const currentQuestionForPath = questions[currentIndex];
    const recommendation = recommendNextBestAdaptiveQuestion({
      subjectId: adaptiveSubjectId,
      studentElo,
      topicId: topicId || null,
      currentQuestionId: currentQuestionForPath?.id || null,
      constrainToTopic: Boolean(topicId),
      answeredQuestionIds: answeredQuestions,
      sessionQuestionIds: servedIds,
      sessionAttempts: nextSessionAttempts,
      questionBank: activeAdaptiveBank,
    });

    const nextQuestion =
      recommendation.question ||
      selectFallbackAdaptiveQuestion(
        activeAdaptiveBank,
        servedIds,
        answeredQuestions,
        studentElo,
        adaptiveSubjectId,
        topicId
      );

    if (!nextQuestion) return false;

    setQuestions((previous) =>
      previous.some((question) => question.id === nextQuestion.id)
        ? previous
        : [...previous, nextQuestion]
    );

    return true;
  }, [
    activeAdaptiveBank,
    adaptiveSessionAttempts.length,
    adaptiveSubjectId,
    answeredQuestions,
    buildNextAdaptiveAttempt,
    examState,
    questionCount,
    questions,
    studentElo,
    testType,
    topicId,
  ]);

  const handleAnswerChange = useCallback((answer: PracticeAnswer) => {
    processAction({
      type: "ANSWER_QUESTION",
      payload: {
        questionIndex: examState?.currentQuestionIndex,
        answer,
      },
    });
  }, [examState?.currentQuestionIndex, processAction]);

  const handleToggleMsqOption = useCallback((optionIndex: number) => {
    if (!currentQuestion || currentQuestion.type !== "msq") return;
    const existing = Array.isArray(currentAnswer) ? currentAnswer : [];
    const nextValue = existing.includes(optionIndex)
      ? existing.filter((value) => value !== optionIndex)
      : [...existing, optionIndex].sort((left, right) => left - right);
    handleAnswerChange(nextValue);
  }, [currentAnswer, currentQuestion, handleAnswerChange]);

  const handleMarkForReview = useCallback(() => {
    if (!examState) return;
    if (isMarkedForReview) {
      processAction({
        type: "UNMARK_REVIEW",
        payload: { questionIndex: examState.currentQuestionIndex },
      });
    } else {
      processAction({
        type: "MARK_REVIEW",
        payload: { questionIndex: examState.currentQuestionIndex },
      });
    }
  }, [examState, isMarkedForReview, processAction]);

  const handleNext = useCallback(() => {
    if (!examState) return;
    const nextIdx = examState.currentQuestionIndex + 1;
    if (nextIdx >= examState.targetQuestions) return;

    if (testType === "adaptive") {
      const ready = ensureAdaptiveNextQuestion();
      if (!ready) return;
      unlockAndNavigate(nextIdx);
      return;
    }

    processAction({
      type: "NAVIGATE_TO_QUESTION",
      payload: { questionIndex: nextIdx },
    });
  }, [ensureAdaptiveNextQuestion, examState, processAction, testType, unlockAndNavigate]);

  const handlePrevious = useCallback(() => {
    if (!examState) return;
    const prevIdx = examState.currentQuestionIndex - 1;
    if (prevIdx >= 0) {
      processAction({
        type: "NAVIGATE_TO_QUESTION",
        payload: { questionIndex: prevIdx },
      });
    }
  }, [examState, processAction]);

  const handleSkip = useCallback(() => {
    if (!examState) return;
    if (testType === "adaptive") {
      const nextIdx = examState.currentQuestionIndex + 1;
      if (nextIdx >= examState.targetQuestions) return;
      const ready = ensureAdaptiveNextQuestion();
      if (!ready) return;
      unlockAndNavigate(nextIdx);
      return;
    }

    processAction({ type: "SKIP_QUESTION" });
  }, [ensureAdaptiveNextQuestion, examState, processAction, testType, unlockAndNavigate]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!examState || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError(null);

    try {
      const submissionTime = Date.now();
      const finalizedState = reduceExamShellState(examState, {
        type: "SUBMIT",
        payload: { now: submissionTime },
      });
      const attemptDurationSeconds = Math.min(
        calculatedDurationMinutes * 60,
        Math.max(0, Math.round((submissionTime - finalizedState.timerStartedAt) / 1000))
      );

      // Calculate results
      let correctCount = 0;
      let totalMarks = 0;
      let maxMarks = 0;
      let attemptedCount = 0;
      let nextElo = studentElo;
      const questionReviews: QuestionSessionReviewPayload[] = [];

      questions.forEach((q, i) => {
        const answer = finalizedState.answers.get(i) ?? null;
        const isAnswered = isAnsweredValue(answer);
        const isCorrect = isCorrectValue(q, answer);
        const timeSpentSeconds = finalizedState.palette[i]?.timeSpentSeconds ?? 0;
        const rapidGuessThresholdSeconds = getRapidGuessThresholdSeconds(q);
        const rapidGuessWarning = isCorrect && timeSpentSeconds < rapidGuessThresholdSeconds;
        let eloAdjustment = 0;

        maxMarks += q.marks;
        if (isCorrect) {
          totalMarks += q.marks;
          correctCount++;
          const eloOutcome = getRapidGuessAdjustedEloGain(nextElo, q, timeSpentSeconds, true);
          nextElo += eloOutcome.adjustedGain;
          eloAdjustment = eloOutcome.appliedPenalty;
        } else if (isAnswered && q.type === "mcq") {
          totalMarks -= q.negativeMarks;
        }

        if (isAnswered) {
          attemptedCount++;
          addAnsweredQuestion(q.id, isCorrect);
          updateSubjectScore(q.subjectId, isCorrect, q.topicId);
        }

        questionReviews.push({
          questionId: q.id,
          correct: isCorrect,
          timeSpentSeconds,
          rapidGuessWarning,
          rapidGuessThresholdSeconds,
          eloAdjustment,
          warningText: rapidGuessWarning ? buildRapidGuessWarning(q, timeSpentSeconds) : null,
          remediationForQuestionId: null,
        });
      });

      setStudentElo(nextElo);

      // Build warning breakdown
      const warningBreakdown = calculateWarningBreakdown(0, testType);

      // Get answers in the correct format
      const answersArray = getAnswersArray(finalizedState, questions.length);

      // Build review payload with question IDs and answers
      const reviewPayload = buildTestReviewPayload({
        questions,
        answers: answersArray,
        questionReviews,
        attemptKind: (testType === "topic-wise" ? "topic-wise" : "adaptive") as AttemptKind,
        countsForStats: true,
        countsForRating: true,
        warningBreakdown,
        reviewMetadata: {
          attemptDuration: attemptDurationSeconds,
          startTime: new Date(finalizedState.timerStartedAt).toISOString(),
          endTime: new Date(submissionTime).toISOString(),
          testType,
        },
      });

      // Save to history if user exists
      if (user) {
        await recordTestHistory({
          test_type: testType,
          subject_id: testType === "adaptive" && adaptiveType === "mix" ? null : subjectId,
          topic_id: topicId || null,
          score: totalMarks,
          max_score: maxMarks,
          questions_attempted: attemptedCount,
          correct_answers: correctCount,
          total_questions: questions.length,
          violations: 0,
          duration_seconds: attemptDurationSeconds,
          review_payload: reviewPayload as any,
        });

        // Log activity
        await logStudentActivityEvent({
          actorId: user.id,
          actorRole: "student",
          actorName: user.email?.split("@")[0] || "Student",
          eventType: `${testType}_test_completed`,
          subjectId: testType === "adaptive" && adaptiveType === "mix" ? null : subjectId,
          topicId: topicId || null,
          metadata: {
            test_type: testType,
            total_questions: questions.length,
            correct_answers: correctCount,
            score: totalMarks,
            max_score: maxMarks,
            duration_seconds: attemptDurationSeconds,
          },
        });
      }

      // Mark exam as submitted
      setExamState(finalizedState);

      // Callback or redirect
      if (onComplete) {
        onComplete(reviewPayload);
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit test. Please try again.");
      submittingRef.current = false;
    }
  }, [
    adaptiveType,
    addAnsweredQuestion,
    calculatedDurationMinutes,
    examState,
    onComplete,
    processAction,
    questions,
    recordTestHistory,
    setStudentElo,
    studentElo,
    subjectId,
    testType,
    topicId,
    updateSubjectScore,
    user,
  ]);

  useEffect(() => {
    if (!examState?.submitted || submittingRef.current || !questions.length) return;
    void handleSubmit();
  }, [examState?.submitted, handleSubmit, questions.length]);

  const handleExit = useCallback(() => {
    setShowExitConfirmation(true);
  }, []);

  const confirmExit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      navigate(-1);
    }
  }, [onExit, navigate]);

  if (!examState || !questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (examState.submitted && !showReviewMode) {
    // Calculate results
    let correctCount = 0;
    let totalMarks = 0;
    let maxMarks = 0;
    let attemptedCount = 0;

    questions.forEach((q, i) => {
      const answer = examState.answers.get(i) ?? null;
      const isAnswered = isAnsweredValue(answer);
      const isCorrect = isCorrectValue(q, answer);

      maxMarks += q.marks;
      if (isCorrect) {
        totalMarks += q.marks;
        correctCount++;
      } else if (isAnswered && q.type === "mcq") {
        totalMarks -= q.negativeMarks;
      }

      if (isAnswered) attemptedCount++;
    });

    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 max-w-3xl">
          <div className="bg-card border rounded-xl p-8 space-y-6">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-center">Test Complete!</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{totalMarks.toFixed(2)}/{maxMarks}</p>
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
                <p className="text-2xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => setShowReviewMode(true)}>Review Answers</Button>
              <Button variant="outline" onClick={() => navigate("/practice")}>Back to Practice</Button>
              <Button variant="hero" onClick={() => navigate("/dashboard")}>View Dashboard</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showReviewMode) {
    const currentIdx = examState?.currentQuestionIndex || 0;
    const currentQuestion = questions[currentIdx];
    const currentAnswer = currentQuestion ? examState?.answers.get(currentIdx) : null;
    const isCorrect = currentQuestion ? isCorrectValue(currentQuestion, currentAnswer ?? null) : false;
    const isAnswered = isAnsweredValue(currentAnswer ?? null);

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 max-w-4xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Test Review</h1>
              <p className="text-muted-foreground">Q{currentIdx + 1} of {questions.length} - Review your answers.</p>
            </div>

            {currentQuestion && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
                  <div className="space-y-3">
                    {currentQuestion.type === "nat" ? (
                      <div>
                        <p className="text-sm font-medium mb-2">Your Answer:</p>
                        <p className="text-sm bg-muted rounded-lg p-3">{currentAnswer || "(No answer)"}</p>
                        {currentQuestion.correctNat && (
                          <p className="text-sm text-success mt-2">Correct Range: {currentQuestion.correctNat.min} - {currentQuestion.correctNat.max}</p>
                        )}
                      </div>
                    ) : (
                      currentQuestion.options.map((option, idx) => {
                        const isSelectedByUser = currentQuestion.type === "mcq" ? currentAnswer === idx : Array.isArray(currentAnswer) && currentAnswer.includes(idx);
                        const isCorrectAnswer = currentQuestion.type === "mcq" ? idx === currentQuestion.correctAnswer : currentQuestion.correctAnswers?.includes(idx);
                        return (
                          <div key={idx} className={`p-4 rounded-lg border transition-colors ${
                            isSelectedByUser && isCorrectAnswer ? "bg-success/10 border-success" :
                            isSelectedByUser && !isCorrectAnswer ? "bg-destructive/10 border-destructive" :
                            isCorrectAnswer && !isSelectedByUser ? "bg-success/5 border-success/50" :
                            "bg-muted/30"
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded border flex items-center justify-center text-sm font-medium ${
                                isSelectedByUser && isCorrectAnswer ? "bg-success text-white border-success" :
                                isSelectedByUser && !isCorrectAnswer ? "bg-destructive text-white border-destructive" :
                                isCorrectAnswer ? "bg-success/20 border-success" :
                                "bg-muted border-muted-foreground/30"
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{option}</p>
                                {isSelectedByUser && isCorrectAnswer && <p className="text-xs text-success mt-1">Your correct answer</p>}
                                {isSelectedByUser && !isCorrectAnswer && <p className="text-xs text-destructive mt-1">Your incorrect answer</p>}
                                {isCorrectAnswer && !isSelectedByUser && <p className="text-xs text-success mt-1">Correct answer</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {currentQuestion.explanation && (
                  <div className="rounded-xl border bg-primary/5 border-primary/20 p-6">
                    <p className="text-sm font-semibold text-primary mb-2">Explanation</p>
                    <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-8 gap-2 max-h-32 overflow-y-auto p-4 bg-muted/30 rounded-lg">
                  {questions.map((q, i) => {
                    const ans = examState?.answers.get(i) ?? null;
                    const correct = isCorrectValue(q, ans);
                    const answered = isAnsweredValue(ans);
                    return (
                      <button
                        key={q.id}
                        onClick={() => setExamState((prev) => prev ? {...prev, currentQuestionIndex: i} : prev)}
                        className={`p-2 rounded text-xs font-medium transition-colors ${
                          i === currentIdx ? "bg-primary text-primary-foreground" :
                          correct ? "bg-success text-white" :
                          answered ? "bg-warning text-white" :
                          "bg-muted hover:bg-muted-foreground/20"
                        }`}
                      >
                        Q{i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReviewMode(false)}>
                Back to Results
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attemptedCount = Array.from(examState.answers.values()).filter((answer) => isAnsweredValue(answer)).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header with timer */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleExit} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Exit test">
              <X className="h-4 w-4" />
            </button>
            <div className="text-sm">
              <span className="text-muted-foreground">Q{examState.currentQuestionIndex + 1} of {examState.targetQuestions}</span>
              <span className="text-muted-foreground ml-2">•</span>
              <span className="text-muted-foreground ml-2">{attemptedCount} answered</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-mono font-bold px-3 py-2 rounded-lg transition-all ${
              timerMinutes === 0 && timerSeconds < 60 
                ? "bg-destructive text-destructive-foreground animate-pulse scale-105"
                : timerMinutes < 5 
                ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/50 animate-pulse"
                : timerMinutes < 10
                ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                : "text-muted-foreground"
            }`}>
              <Clock className={`h-5 w-5 ${timerMinutes < 5 ? "animate-pulse" : ""}`} />
              <span className={`text-lg tabular-nums ${timerMinutes === 0 && timerSeconds < 60 ? "font-bold animate-pulse" : ""}`}>
                {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
              </span>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={examState.submitted}>
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Time warning banner */}
      {showTimeWarning && timerMinutes < 5 && (
        <div className="bg-destructive/10 border-t border-b border-destructive/30 px-4 py-3 sticky top-16 z-20 animate-in fade-in slide-in-from-top">
          <div className="container flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">
                ⏰ Time Running Out! {timerMinutes}:{String(timerSeconds).padStart(2, "0")} remaining
              </p>
              <p className="text-xs text-destructive/80 mt-0.5">Please hurry up and submit your answers soon.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 container py-8 grid md:grid-cols-4 gap-6">
        {/* Question content */}
        <div className="md:col-span-3 space-y-6">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question text */}
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">Question {examState.currentQuestionIndex + 1}</h2>
                    <p className="text-xs text-muted-foreground mt-1">Time spent on this question: {Math.floor(questionTimeSpent / 60)}m {questionTimeSpent % 60}s</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isMarkedForReview ? "default" : "outline"}
                    onClick={handleMarkForReview}
                    className="gap-2"
                  >
                    <Flag className="h-4 w-4" />
                    {isMarkedForReview ? "Marked" : "Mark"}
                  </Button>
                </div>
                <div className="text-muted-foreground">{currentQuestion.question}</div>

                {currentQuestion.type === "mcq" && currentQuestion.options.length > 0 && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                        <input
                          type="radio"
                          checked={currentAnswer === idx}
                          onChange={() => handleAnswerChange(idx)}
                          className="w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "msq" && currentQuestion.options.length > 0 && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Array.isArray(currentAnswer) && currentAnswer.includes(idx)}
                          onChange={() => handleToggleMsqOption(idx)}
                          className="w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "nat" && (
                  <input
                    type="text"
                    placeholder="Enter numerical answer"
                    value={typeof currentAnswer === "string" ? currentAnswer : ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                )}

                {submitError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={examState.currentQuestionIndex === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleSkip} className="gap-2">
                    Skip
                  </Button>
                  <Button onClick={handleNext} disabled={examState.currentQuestionIndex >= examState.targetQuestions - 1} className="gap-2">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Palette sidebar */}
        <div className="md:col-span-1">
          <div className="bg-card border rounded-lg p-4 space-y-3 sticky top-20">
            <h3 className="font-semibold text-sm">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {examState.palette.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (slot.isUnlocked) {
                      processAction({
                        type: "NAVIGATE_TO_QUESTION",
                        payload: { questionIndex: i },
                      });
                    }
                  }}
                  disabled={!slot.isUnlocked}
                  className={`aspect-square rounded-lg border text-xs font-medium transition-colors flex items-center justify-center ${
                    i === examState.currentQuestionIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : slot.status === "answered"
                      ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300"
                      : slot.status === "answered-review"
                      ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                      : slot.status === "not-answered-review"
                      ? "bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-300"
                      : !slot.isUnlocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                      : "hover:bg-muted"
                  }`}
                  title={`Q${i + 1}: ${slot.status}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-gray-400" />
                <span>Not visited</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit confirmation modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Exit test?</h2>
            <p className="text-sm text-muted-foreground">
              Your answers will not be saved. Are you sure you want to exit?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowExitConfirmation(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmExit}>
                Exit Test
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
