import {
  type FullTestId,
  getFullTestQuestions,
} from "@/data/fullTests";
import { getQuestionById, type Question } from "@/data/questions";

export type PracticeAnswer = number | number[] | string | null;

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
  question_reviews?: QuestionSessionReviewPayload[];
}

const fullTestIds: FullTestId[] = [
  "full-gate",
  "mock-paper-2",
  "mock-paper-3",
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

export function buildTestReviewPayload({
  questions,
  answers,
  questionReviews,
  fullTestId,
}: {
  questions: Question[];
  answers: PracticeAnswer[];
  questionReviews?: Array<QuestionSessionReviewPayload | null>;
  fullTestId?: FullTestId | null;
}): TestReviewPayload {
  return {
    full_test_id: fullTestId || null,
    question_ids: questions.map((question) => question.id),
    answers,
    question_reviews: questionReviews?.filter(
      (review): review is QuestionSessionReviewPayload => Boolean(review)
    ),
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

export function getQuestionsForReview(questionIds: string[]) {
  return questionIds
    .map((questionId) => getQuestionForReview(questionId))
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
