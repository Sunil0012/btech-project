/**
 * ExamShellComponent - Unified exam execution for Topic-Wise and Adaptive tests
 * Features: Timer, full question set before solutions, palette with visited state,
 * skip/next, mark-for-review, exit confirmation, no explanations during attempt.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { Question, getQuestionsBySubject, getQuestionsByTopic, questions as allQuestions } from "@/data/questions";
import { getTopicById, getSubjectById } from "@/data/subjects";
import { Navbar } from "@/components/Navbar";
import { buildTestReviewPayload, calculateWarningBreakdown, type AttemptKind, type PracticeAnswer } from "@/lib/testReview";
import {
  createExamShellState,
  reduceExamShellState,
  updatePaletteStatus,
  getAnswersArray,
  type ExamShellState,
  type ExamShellAction,
} from "@/lib/examShellState";
import {
  recommendNextBestAdaptiveQuestion,
  type NextBestQuestionRecommendation,
} from "@/lib/nextBestQuestionEngine";
import {
  buildRapidGuessWarning,
  getRapidGuessPenalty,
  getRapidGuessThresholdSeconds,
} from "@/lib/practiceReview";
import { logStudentActivityEvent } from "@/lib/activityEvents";
import {
  Clock, ChevronLeft, ChevronRight, Flag, X, CheckCircle2, AlertCircle, BookOpen, Eye, EyeOff,
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
  } = useStudentAuth();

  // Calculate duration based on timePerQuestion or use fixed duration
  const calculatedDurationMinutes = fixedDuration ?? questionCount * timePerQuestion;

  // Load questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const sessionIdRef = useRef(Math.random().toString(36).slice(2, 10));

  useEffect(() => {
    let availableQuestions: Question[] = [];

    // For adaptive mix test, pull from all subjects
    if (testType === "adaptive" && adaptiveType === "mix") {
      availableQuestions = allQuestions;
    } else if (topicId) {
      availableQuestions = getQuestionsByTopic(topicId);
    } else {
      availableQuestions = getQuestionsBySubject(subjectId);
    }

    // Shuffle questions for mix type to ensure variety
    if (testType === "adaptive" && adaptiveType === "mix") {
      // Fisher-Yates shuffle
      const shuffled = [...availableQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const selected = shuffled.slice(0, questionCount);
      setQuestions(selected);
    } else {
      // Limit to questionCount
      const selected = availableQuestions.slice(0, questionCount);
      setQuestions(selected);
    }
  }, [subjectId, topicId, questionCount, testType, adaptiveType]);

  // Initialize exam shell state
  const [examState, setExamState] = useState<ExamShellState | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(calculatedDurationMinutes);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!questions.length || examState) return;

    const state = createExamShellState({
      sessionId: sessionIdRef.current,
      testType,
      totalQuestions: questions.length,
      targetQuestions: Math.min(questionCount, questions.length),
      durationSeconds: calculatedDurationMinutes * 60,
    });

    setExamState(state);
  }, [questions, calculatedDurationMinutes, questionCount, testType, examState]);

  // Timer effect
  useEffect(() => {
    if (!examState || examState.submitted || !examState.isTimerActive || !questions.length) return;

    const interval = setInterval(() => {
      setExamState((prev) => {
        if (!prev) return prev;

        const elapsed = (Date.now() - prev.timerStartedAt) / 1000;
        const remaining = Math.max(0, prev.durationSeconds - elapsed);

        // Convert to minutes and seconds for display
        setTimerMinutes(Math.floor(remaining / 60));
        setTimerSeconds(Math.round(remaining % 60));

        if (remaining === 0) {
          return reduceExamShellState(prev, { type: "SUBMIT" });
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examState, questions.length]);

  // Process state action
  const processAction = useCallback((action: ExamShellAction) => {
    setExamState((prev) => {
      if (!prev) return prev;
      return reduceExamShellState(prev, action);
    });
  }, []);

  const currentQuestion = examState ? questions[examState.currentQuestionIndex] : null;
  const currentAnswer = examState ? examState.answers.get(examState.currentQuestionIndex) : null;
  const isMarkedForReview = examState?.markedForReview.has(examState.currentQuestionIndex) ?? false;

  const handleAnswerChange = useCallback((answer: PracticeAnswer) => {
    processAction({
      type: "ANSWER_QUESTION",
      payload: {
        questionIndex: examState?.currentQuestionIndex,
        answer,
      },
    });
  }, [examState?.currentQuestionIndex, processAction]);

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
    if (nextIdx < examState.targetQuestions && examState.palette[nextIdx]?.isUnlocked) {
      processAction({
        type: "NAVIGATE_TO_QUESTION",
        payload: { questionIndex: nextIdx },
      });
    }
  }, [examState, processAction]);

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
    processAction({ type: "SKIP_QUESTION" });
  }, [examState, processAction]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!examState || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError(null);

    try {
      const attemptDurationSeconds = Math.min(
        calculatedDurationMinutes * 60,
        Math.max(0, Math.round((Date.now() - examState.timerStartedAt) / 1000))
      );

      // Calculate results
      let correctCount = 0;
      let totalMarks = 0;
      let maxMarks = 0;
      let attemptedCount = 0;

      questions.forEach((q, i) => {
        const answer = examState.answers.get(i);
        const isAnswered = answer !== null && answer !== undefined && (typeof answer !== "string" || answer.trim() !== "") && (typeof answer !== "object" || (Array.isArray(answer) && answer.length > 0));
        const isCorrect = isAnswered && (
          (q.type === "mcq" && answer === q.correctAnswer) ||
          (q.type === "msq" && q.correctAnswers && Array.isArray(answer) && q.correctAnswers.length === answer.length && q.correctAnswers.every((v) => answer.includes(v))) ||
          (q.type === "nat" && q.correctNat && typeof answer === "string" && !isNaN(parseFloat(answer)) && parseFloat(answer) >= q.correctNat.min && parseFloat(answer) <= q.correctNat.max)
        );

        maxMarks += q.marks;
        if (isCorrect) {
          totalMarks += q.marks;
          correctCount++;
        } else if (isAnswered && q.type === "mcq") {
          totalMarks -= q.negativeMarks;
        }

        if (isAnswered) attemptedCount++;
        if (user) {
          addAnsweredQuestion(q.id, isCorrect);
          updateSubjectScore(q.subjectId, isCorrect);
        }
      });

      // Build warning breakdown
      const warningBreakdown = calculateWarningBreakdown(0, testType);

      // Get answers in the correct format
      const answersArray = getAnswersArray(examState, questions.length);

      // Build review payload with question IDs and answers
      const reviewPayload = buildTestReviewPayload({
        questions,
        answers: answersArray,
        attemptKind: (testType === "topic-wise" ? "topic-wise" : "adaptive") as AttemptKind,
        countsForStats: true,
        countsForRating: true,
        warningBreakdown,
        reviewMetadata: {
          attemptDuration: attemptDurationSeconds,
          startTime: new Date(examState.timerStartedAt).toISOString(),
          endTime: new Date().toISOString(),
          testType,
        },
      });

      // Save to history if user exists
      if (user) {
        await recordTestHistory({
          test_type: testType,
          subject_id: subjectId,
          topic_id: topicId || null,
          score: totalMarks,
          max_score: maxMarks,
          questions_attempted: attemptedCount,
          correct_answers: correctCount,
          total_questions: questions.length,
          violations: 0,
          duration_seconds: attemptDurationSeconds,
          review_payload: reviewPayload,
        });

        // Log activity
        await logStudentActivityEvent({
          actorId: user.id,
          actorRole: "student",
          actorName: user.email?.split("@")[0] || "Student",
          eventType: `${testType}_test_completed`,
          subjectId,
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
      processAction({ type: "SUBMIT" });

      // Callback or redirect
      if (onComplete) {
        onComplete(reviewPayload);
      } else {
        navigate("/practice");
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit test. Please try again.");
      submittingRef.current = false;
    }
  }, [examState, user, questions, calculatedDurationMinutes, testType, subjectId, topicId, recordTestHistory, addAnsweredQuestion, updateSubjectScore, navigate, onComplete, processAction]);

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
      const answer = examState.answers.get(i);
      const isAnswered = answer !== null && answer !== undefined && (typeof answer !== "string" || answer.trim() !== "") && (typeof answer !== "object" || (Array.isArray(answer) && answer.length > 0));
      const isCorrect = isAnswered && (
        (q.type === "mcq" && answer === q.correctAnswer) ||
        (q.type === "msq" && q.correctAnswers && Array.isArray(answer) && q.correctAnswers.length === answer.length && q.correctAnswers.every((v) => answer.includes(v))) ||
        (q.type === "nat" && q.correctNat && typeof answer === "string" && !isNaN(parseFloat(answer)) && parseFloat(answer) >= q.correctNat.min && parseFloat(answer) <= q.correctNat.max)
      );

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
    const isCorrect = currentQuestion && (
      (currentQuestion.type === "mcq" && currentAnswer === currentQuestion.correctAnswer) ||
      (currentQuestion.type === "msq" && currentQuestion.correctAnswers && Array.isArray(currentAnswer) && currentQuestion.correctAnswers.length === currentAnswer.length && currentQuestion.correctAnswers.every((v) => currentAnswer.includes(v))) ||
      (currentQuestion.type === "nat" && currentQuestion.correctNat && typeof currentAnswer === "string" && !isNaN(parseFloat(currentAnswer)) && parseFloat(currentAnswer) >= currentQuestion.correctNat.min && parseFloat(currentAnswer) <= currentQuestion.correctNat.max)
    );
    const isAnswered = currentAnswer !== null && currentAnswer !== undefined && (typeof currentAnswer !== "string" || currentAnswer.trim() !== "") && (typeof currentAnswer !== "object" || (Array.isArray(currentAnswer) && currentAnswer.length > 0));

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
                    const ans = examState?.answers.get(i);
                    const correct = (q.type === "mcq" && ans === q.correctAnswer) ||
                      (q.type === "msq" && q.correctAnswers && Array.isArray(ans) && q.correctAnswers.length === ans.length && q.correctAnswers.every((v) => ans.includes(v))) ||
                      (q.type === "nat" && q.correctNat && typeof ans === "string" && !isNaN(parseFloat(ans)) && parseFloat(ans) >= q.correctNat.min && parseFloat(ans) <= q.correctNat.max);
                    const answered = ans !== null && ans !== undefined && (typeof ans !== "string" || ans.trim() !== "") && (typeof ans !== "object" || (Array.isArray(ans) && ans.length > 0));
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

  const attemptedCount = Array.from(examState.answers.values()).filter(a => a !== null && a !== undefined && (typeof a !== "string" || a.trim() !== "") && (typeof a !== "object" || (Array.isArray(a) && a.length > 0))).length;

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
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : timerMinutes < 5 
                ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                : "text-muted-foreground"
            }`}>
              <Clock className={`h-5 w-5 ${timerMinutes === 0 && timerSeconds < 60 ? "animate-pulse" : ""}`} />
              <span className={`text-lg ${timerMinutes === 0 && timerSeconds < 60 ? "font-bold" : ""}`}>
                {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
              </span>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={examState.submitted}>
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 container py-8 grid md:grid-cols-4 gap-6">
        {/* Question content */}
        <div className="md:col-span-3 space-y-6">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question text */}
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold">Question {examState.currentQuestionIndex + 1}</h2>
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

                {currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                        <input
                          type="radio"
                          checked={currentAnswer === idx}
                          onChange={() => handleAnswerChange(idx)}
                          className="w-4 h-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "nat" && (
                  <input
                    type="text"
                    placeholder="Enter numerical answer"
                    value={currentAnswer || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
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
