import {
  type FullTestId,
  getFullTestQuestions,
} from "@/data/fullTests";
import { getQuestionById, type Question } from "@/data/questions";

export type PracticeAnswer = number | number[] | string | null;
export type AttemptKind =
  | "full-mock"
  | "topic-wise"
  | "adaptive"
  | "assignment-test"
  | "assignment-homework"
  | "reattempt-same"
  | "reattempt-templated"
  | (string & {});

export type ReviewQuestionSnapshot = Omit<Question, "eloRating"> & { eloRating?: number };

export interface QuestionSessionReviewPayload {
  questionId: string;
  correct: boolean;
  timeSpentSeconds: number;
  rapidGuessWarning: boolean;
  rapidGuessThresholdSeconds: number;
  eloAdjustment: number;
  warningText: string | null;
  remediationForQuestionId: string | null;
}

export interface TestReviewPayload {
  full_test_id?: FullTestId | null;
  question_ids: string[];
  answers: PracticeAnswer[];
  question_snapshots?: ReviewQuestionSnapshot[];
  question_reviews?: QuestionSessionReviewPayload[];
  attemptKind?: AttemptKind;
  countsForStats?: boolean;
  countsForRating?: boolean;
  warningBreakdown?: Record<string, any>;
  reviewMetadata?: Record<string, any>;
}

export interface TestWarningSummary {
  total: number;
  focusWarnings: number;
  rapidGuessWarnings: number;
}

const fullTestIds: FullTestId[] = [
  "full-gate",
  "mock-paper-2",
  "mock-paper-3",
  "mock-paper-4",
  "mock-paper-5",
  "mock-paper-6",
  "mock-paper-7",
  "da-2024-s1",
  "da-2025",
  "da-2026",
];

function normalizeReviewQuestion(question: Omit<Question, "eloRating"> & { eloRating?: number }): Question {
  return {
    ...question,
    eloRating: question.eloRating ?? 1500,
  };
}

function cloneReviewQuestion(question: Question): ReviewQuestionSnapshot {
  return {
    id: question.id,
    subjectId: question.subjectId,
    topicId: question.topicId,
    question: question.question,
    options: [...question.options],
    correctAnswer: question.correctAnswer,
    correctAnswers: question.correctAnswers ? [...question.correctAnswers] : undefined,
    correctNat: question.correctNat ? { ...question.correctNat } : undefined,
    type: question.type,
    explanation: question.explanation,
    difficulty: question.difficulty,
    eloRating: question.eloRating,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
  };
}

function isQuestionType(value: unknown): value is Question["type"] {
  return value === "mcq" || value === "msq" || value === "nat";
}

function isDifficulty(value: unknown): value is Question["difficulty"] {
  return value === "easy" || value === "medium" || value === "hard";
}

export function coerceReviewQuestionSnapshot(value: unknown): ReviewQuestionSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.subjectId !== "string" ||
    typeof candidate.topicId !== "string" ||
    typeof candidate.question !== "string" ||
    !Array.isArray(candidate.options) ||
    !candidate.options.every((option) => typeof option === "string") ||
    typeof candidate.correctAnswer !== "number" ||
    !isQuestionType(candidate.type) ||
    typeof candidate.explanation !== "string" ||
    !isDifficulty(candidate.difficulty) ||
    typeof candidate.marks !== "number" ||
    typeof candidate.negativeMarks !== "number"
  ) {
    return null;
  }

  const correctAnswers = Array.isArray(candidate.correctAnswers)
    ? candidate.correctAnswers.filter((answer): answer is number => typeof answer === "number")
    : undefined;
  const correctNat =
    candidate.correctNat &&
    typeof candidate.correctNat === "object" &&
    !Array.isArray(candidate.correctNat) &&
    typeof (candidate.correctNat as Record<string, unknown>).min === "number" &&
    typeof (candidate.correctNat as Record<string, unknown>).max === "number"
      ? {
          min: (candidate.correctNat as Record<string, number>).min,
          max: (candidate.correctNat as Record<string, number>).max,
        }
      : undefined;

  return {
    id: candidate.id,
    subjectId: candidate.subjectId,
    topicId: candidate.topicId,
    question: candidate.question,
    options: [...candidate.options],
    correctAnswer: candidate.correctAnswer,
    correctAnswers,
    correctNat,
    type: candidate.type,
    explanation: candidate.explanation,
    difficulty: candidate.difficulty,
    eloRating: typeof candidate.eloRating === "number" ? candidate.eloRating : undefined,
    marks: candidate.marks,
    negativeMarks: candidate.negativeMarks,
  };
}

export function coerceQuestionSessionReviewPayload(value: unknown): QuestionSessionReviewPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const review = value as Record<string, unknown>;
  if (
    typeof review.questionId !== "string" ||
    typeof review.correct !== "boolean" ||
    typeof review.timeSpentSeconds !== "number" ||
    typeof review.rapidGuessWarning !== "boolean" ||
    typeof review.rapidGuessThresholdSeconds !== "number" ||
    typeof review.eloAdjustment !== "number"
  ) {
    return null;
  }

  return {
    questionId: review.questionId,
    correct: review.correct,
    timeSpentSeconds: review.timeSpentSeconds,
    rapidGuessWarning: review.rapidGuessWarning,
    rapidGuessThresholdSeconds: review.rapidGuessThresholdSeconds,
    eloAdjustment: review.eloAdjustment,
    warningText: typeof review.warningText === "string" ? review.warningText : null,
    remediationForQuestionId:
      typeof review.remediationForQuestionId === "string" ? review.remediationForQuestionId : null,
  };
}

function parsePracticeAnswer(value: unknown): PracticeAnswer {
  if (value === null || typeof value === "number" || typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((item): item is number => typeof item === "number");
  }
  return null;
}

function parseReviewPayloadSource(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parseReviewPayloadSource(parsed);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseObjectRecord(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, any>;
}

function buildSyntheticQuestionReview(question: Question, answer: PracticeAnswer): QuestionSessionReviewPayload {
  return {
    questionId: question.id,
    correct: isQuestionCorrect(question, answer),
    timeSpentSeconds: 0,
    rapidGuessWarning: false,
    rapidGuessThresholdSeconds: 0,
    eloAdjustment: 0,
    warningText: null,
    remediationForQuestionId: null,
  };
}

export function parseTestReviewPayload(value: unknown): TestReviewPayload | null {
  const payload = parseReviewPayloadSource(value);
  if (!payload) return null;

  const rawQuestionIds = payload.question_ids ?? payload.questionIds;
  const rawQuestionSnapshots =
    payload.question_snapshots ?? payload.questionSnapshots ?? payload.questions_snapshot ?? payload.questionsSnapshot;
  const rawQuestionReviews = payload.question_reviews ?? payload.questionReviews;
  const rawWarningBreakdown = payload.warningBreakdown ?? payload.warning_breakdown;
  const rawReviewMetadata = payload.reviewMetadata ?? payload.review_metadata;

  const questionIds = Array.isArray(rawQuestionIds)
    ? rawQuestionIds.filter((item): item is string => typeof item === "string")
    : [];
  const questionSnapshots = Array.isArray(rawQuestionSnapshots)
    ? rawQuestionSnapshots
        .map((item) => coerceReviewQuestionSnapshot(item))
        .filter((item): item is ReviewQuestionSnapshot => Boolean(item))
    : [];

  if (questionIds.length === 0 && questionSnapshots.length === 0) return null;

  return {
    full_test_id:
      typeof payload.full_test_id === "string"
        ? payload.full_test_id
        : typeof payload.fullTestId === "string"
          ? payload.fullTestId
          : null,
    question_ids: questionIds.length > 0 ? questionIds : questionSnapshots.map((snapshot) => snapshot.id),
    answers: Array.isArray(payload.answers) ? payload.answers.map((item) => parsePracticeAnswer(item)) : [],
    question_snapshots: questionSnapshots,
    question_reviews: Array.isArray(rawQuestionReviews)
      ? rawQuestionReviews
          .map((item) => coerceQuestionSessionReviewPayload(item))
          .filter((item): item is QuestionSessionReviewPayload => Boolean(item))
      : [],
    attemptKind:
      typeof payload.attemptKind === "string"
        ? payload.attemptKind
        : typeof payload.attempt_kind === "string"
          ? payload.attempt_kind
          : undefined,
    countsForStats:
      typeof payload.countsForStats === "boolean"
        ? payload.countsForStats
        : typeof payload.counts_for_stats === "boolean"
          ? payload.counts_for_stats
          : undefined,
    countsForRating:
      typeof payload.countsForRating === "boolean"
        ? payload.countsForRating
        : typeof payload.counts_for_rating === "boolean"
          ? payload.counts_for_rating
          : undefined,
    warningBreakdown: parseObjectRecord(rawWarningBreakdown),
    reviewMetadata: parseObjectRecord(rawReviewMetadata),
  };
}

export function summarizeTestWarnings(payload: TestReviewPayload | null, rowViolations = 0): TestWarningSummary {
  const focusWarnings =
    typeof payload?.warningBreakdown?.violations === "number"
      ? payload.warningBreakdown.violations
      : rowViolations;
  const rapidGuessWarnings =
    payload?.question_reviews?.filter((review) => review.rapidGuessWarning).length ?? 0;

  return {
    total: focusWarnings + rapidGuessWarnings,
    focusWarnings,
    rapidGuessWarnings,
  };
}

export function getQuestionForPayloadReview(
  payload: Pick<TestReviewPayload, "question_ids" | "question_snapshots">,
  questionIndex: number
): Question | null {
  const snapshot = payload.question_snapshots?.[questionIndex];
  if (snapshot) {
    return normalizeReviewQuestion(snapshot);
  }

  const questionId = payload.question_ids[questionIndex];
  return questionId ? getQuestionForReview(questionId) : null;
}

export function buildTestReviewPayload({
  questions,
  answers,
  questionReviews,
  fullTestId,
  attemptKind,
  countsForStats,
  countsForRating,
  warningBreakdown,
  reviewMetadata,
}: {
  questions: Question[];
  answers: PracticeAnswer[];
  questionReviews?: Array<QuestionSessionReviewPayload | null>;
  fullTestId?: FullTestId | null;
  attemptKind?: AttemptKind;
  countsForStats?: boolean;
  countsForRating?: boolean;
  warningBreakdown?: Record<string, any>;
  reviewMetadata?: Record<string, any>;
}): TestReviewPayload {
  // Ensure answers array matches questions length
  const normalizedAnswers = answers.length === questions.length 
    ? answers 
    : [...answers, ...Array(Math.max(0, questions.length - answers.length)).fill(null)];
  const questionReviewMap = new Map(
    (questionReviews || [])
      .filter((review): review is QuestionSessionReviewPayload => Boolean(review))
      .map((review) => [review.questionId, review])
  );

  const payload: TestReviewPayload = {
    full_test_id: fullTestId || null,
    question_ids: questions.map((question) => question.id),
    question_snapshots: questions.map((question) => cloneReviewQuestion(question)),
    answers: normalizedAnswers,
    question_reviews: questions.map((question, index) => {
      const explicitReview = questionReviewMap.get(question.id);
      return explicitReview ?? buildSyntheticQuestionReview(question, normalizedAnswers[index] ?? null);
    }),
    attemptKind: attemptKind || undefined,
    countsForStats: countsForStats === true,
    countsForRating: countsForRating === true,
    warningBreakdown: warningBreakdown || undefined,
    reviewMetadata: reviewMetadata || undefined,
  };

  return payload;
}

export function calculateWarningBreakdown(violations: number, testType?: string): Record<string, any> {
  return {
    violations,
    testType,
  };
}

export function getQuestionForReview(questionId: string): Question | null {
  const bankQuestion = getQuestionById(questionId);
  if (bankQuestion) return bankQuestion;

  for (const fullTestId of fullTestIds) {
    const fullTestQuestion = getFullTestQuestions(fullTestId).find((question) => question.id === questionId);
    if (fullTestQuestion) {
      return normalizeReviewQuestion(fullTestQuestion);
    }
  }

  return null;
}

export function getQuestionsForReview(questionIds: string[], questionSnapshots?: ReviewQuestionSnapshot[]) {
  return questionIds
    .map((_, index) =>
      questionSnapshots?.[index]
        ? normalizeReviewQuestion(questionSnapshots[index])
        : getQuestionForReview(questionIds[index])
    )
    .filter((question): question is Question => Boolean(question));
}

export function createEmptyAnswer(question?: Question): PracticeAnswer {
  if (!question) return null;
  if (question.type === "msq") return [];
  if (question.type === "nat") return "";
  return null;
}

export function isQuestionAnswered(question: Question, answer: PracticeAnswer) {
  if (question.type === "mcq") return typeof answer === "number";
  if (question.type === "msq") return Array.isArray(answer) && answer.length > 0;
  return typeof answer === "string" && answer.trim() !== "";
}

export function isQuestionCorrect(question: Question, answer: PracticeAnswer) {
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

export function getReviewState(question: Question, answer: PracticeAnswer) {
  if (!isQuestionAnswered(question, answer)) return "unanswered" as const;
  return isQuestionCorrect(question, answer) ? "correct" as const : "wrong" as const;
}
