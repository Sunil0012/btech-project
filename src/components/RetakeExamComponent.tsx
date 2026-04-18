/**
 * Retake Exam Component - Handles exact and templated retakes
 * Wraps ExamShellComponent with retake-specific logic
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExamShellComponent } from "@/components/ExamShellComponent";
import { useStudentAuth } from "@/contexts/AuthContext";
import { getRetakeQuestionBank, buildExactReattempt, buildTemplatedReattempt } from "@/lib/retakeLogic";
import { buildTestReviewPayload, type QuestionSnapshot, type TestReviewPayload } from "@/lib/testReview";
import { Question } from "@/data/questions";

export interface RetakeExamComponentProps {
  sourcePayload: TestReviewPayload;
  retakeMode: "exact" | "templated";
  subjectId: string;
  topicId?: string;
  onComplete?: (payload: TestReviewPayload) => void;
  onExit?: () => void;
}

/**
 * Component wrapper that prepares retake questions and passes them to ExamShellComponent
 */
export function RetakeExamComponent({
  sourcePayload,
  retakeMode,
  subjectId,
  topicId,
  onComplete,
  onExit,
}: RetakeExamComponentProps) {
  const navigate = useNavigate();
  const { user, recordTestHistory } = useStudentAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      if (retakeMode === "exact" && sourcePayload.questions_snapshot) {
        // Exact retake: use stored snapshots
        const { questions: retakeQuestions } = buildExactReattempt(
          sourcePayload.questions_snapshot,
          sourcePayload.answers
        );
        setQuestions(retakeQuestions);
      } else if (retakeMode === "templated") {
        // Templated retake: generate variants or replacements
        if (!sourcePayload.questions_snapshot) {
          setError("Template variants not available - question snapshots missing");
          return;
        }

        const questionBank = getRetakeQuestionBank(subjectId, topicId);
        const { questions: retakeQuestions } = buildTemplatedReattempt(
          sourcePayload.questions_snapshot,
          questionBank
        );
        setQuestions(retakeQuestions);
      }
    } catch (err) {
      console.error("Error preparing retake:", err);
      setError("Failed to prepare retake exam");
    } finally {
      setLoading(false);
    }
  }, [sourcePayload, retakeMode, subjectId, topicId]);

  const handleComplete = async (payload: TestReviewPayload) => {
    try {
      // Add retake-specific metadata
      const retakePayload: TestReviewPayload = {
        ...payload,
        source_attempt_id: sourcePayload.full_test_id || undefined,
        attempt_kind: retakeMode === "exact" ? "retake-exact" : "retake-templated",
        counts_for_stats: retakeMode !== "exact", // Exact retakes don't count for stats
        counts_for_rating: retakeMode !== "exact",
      };

      if (onComplete) {
        onComplete(retakePayload);
      } else {
        navigate("/practice");
      }
    } catch (err) {
      console.error("Error completing retake:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Preparing {retakeMode === "exact" ? "exact retake" : "templated retake"}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive font-semibold">{error}</p>
          <button
            onClick={() => onExit?.() || navigate(-1)}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No questions loaded for retake</p>
      </div>
    );
  }

  return (
    <ExamShellComponent
      testType={sourcePayload.attempt_kind as any === "topic-wise" ? "topic-wise" : "adaptive"}
      subjectId={subjectId}
      topicId={topicId}
      durationMinutes={Math.ceil((sourcePayload.review_metadata?.attemptDuration || 30 * 60) / 60)}
      questionCount={questions.length}
      onComplete={handleComplete}
      onExit={onExit}
    />
  );
}
