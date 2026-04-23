import type { Question } from "@/data/questions";

export interface PracticeQuestionReview {
  questionId: string;
  timeSpentSeconds: number;
  rapidGuessWarning: boolean;
  rapidGuessThresholdSeconds: number;
  eloAdjustment: number;
  warningText: string | null;
  remediationForQuestionId?: string | null;
}

const RAPID_GUESS_ALPHA_0 = 10;
const RAPID_GUESS_ALPHA_1 = 0.02;
const RAPID_GUESS_ALPHA_2 = 0.01;
const RAPID_GUESS_ALPHA_3 = 30;
const RAPID_GUESS_MAX_PENALTY = 20;

const MULTI_STEP_PATTERN =
  /\b(select all that apply|which of the following statements|using the following|based on the following)\b/i;
const COMPUTATION_PATTERN =
  /\b(calculate|compute|determine|evaluate|solve|derive|trace|determinant|eigenvalue|probability|expected value|variance|standard deviation|time complexity|space complexity)\b/i;

export interface RapidGuessEloOutcome {
  standardGain: number;
  penalty: number;
  appliedPenalty: number;
  adjustedGain: number;
}

function getStemLength(question: Question) {
  return question.question.trim().length;
}

function getOptionsLength(question: Question) {
  return question.options.reduce((sum, option) => sum + option.trim().length, 0);
}

export function getRapidGuessComplexityIndex(question: Question) {
  const combinedText = [question.question, ...question.options].join(" ");
  let complexityIndex = 0;

  if (question.difficulty === "medium" || question.type === "msq") {
    complexityIndex = Math.max(complexityIndex, 0.5);
  }

  if (
    question.difficulty === "hard" ||
    question.type === "nat" ||
    MULTI_STEP_PATTERN.test(question.question) ||
    COMPUTATION_PATTERN.test(combinedText)
  ) {
    complexityIndex = 1;
  }

  return complexityIndex;
}

export function getRapidGuessThresholdSeconds(question: Question) {
  const rawThreshold =
    RAPID_GUESS_ALPHA_0 +
    RAPID_GUESS_ALPHA_1 * getStemLength(question) +
    RAPID_GUESS_ALPHA_2 * getOptionsLength(question) +
    RAPID_GUESS_ALPHA_3 * getRapidGuessComplexityIndex(question);

  return Math.max(RAPID_GUESS_ALPHA_0, Math.round(rawThreshold));
}

export function getRapidGuessPenalty(question: Question, timeSpentSeconds: number) {
  const threshold = getRapidGuessThresholdSeconds(question);
  if (timeSpentSeconds >= threshold) return 0;

  const severity = 1 - timeSpentSeconds / Math.max(threshold, 1);
  return Math.max(0, Math.round(severity * RAPID_GUESS_MAX_PENALTY));
}

export function getStandardEloGain(studentElo: number, questionElo: number) {
  const expected = 1 / (1 + Math.pow(10, (questionElo - studentElo) / 400));
  return Math.max(0, Math.round(32 * (1 - expected)));
}

export function getRapidGuessAdjustedEloGain(
  studentElo: number,
  question: Question,
  timeSpentSeconds: number,
  correct: boolean
): RapidGuessEloOutcome {
  if (!correct) {
    return {
      standardGain: 0,
      penalty: 0,
      appliedPenalty: 0,
      adjustedGain: 0,
    };
  }

  const standardGain = getStandardEloGain(studentElo, question.eloRating);
  const penalty = getRapidGuessPenalty(question, timeSpentSeconds);
  const adjustedGain = Math.max(0, standardGain - penalty);

  return {
    standardGain,
    penalty,
    appliedPenalty: standardGain - adjustedGain,
    adjustedGain,
  };
}

export function buildRapidGuessWarning(question: Question, timeSpentSeconds: number) {
  const threshold = getRapidGuessThresholdSeconds(question);
  if (timeSpentSeconds >= threshold) return null;

  return `Solved in ${timeSpentSeconds}s against an estimated minimum of ${threshold}s. Marks still count, but ELO gain is reduced to limit guess-driven inflation.`;
}
