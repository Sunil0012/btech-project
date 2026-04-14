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

export function getRapidGuessThresholdSeconds(question: Question) {
  const stemWords = question.question.trim().split(/\s+/).filter(Boolean).length;
  const optionWords = question.options.reduce(
    (sum, option) => sum + option.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  const rawThreshold = Math.round((stemWords + optionWords * 0.4) / 2.4);

  if (question.type === "nat") {
    return Math.max(10, Math.min(28, rawThreshold));
  }

  if (question.type === "msq") {
    return Math.max(12, Math.min(32, rawThreshold + 2));
  }

  return Math.max(8, Math.min(24, rawThreshold));
}

export function getRapidGuessPenalty(question: Question, timeSpentSeconds: number) {
  const threshold = getRapidGuessThresholdSeconds(question);
  if (timeSpentSeconds >= threshold) return 0;

  const severity = 1 - timeSpentSeconds / Math.max(threshold, 1);
  const basePenalty = Math.max(4, Math.round(question.eloRating * 0.004));
  return Math.max(0, Math.round(basePenalty * Math.max(0.35, severity)));
}

export function buildRapidGuessWarning(question: Question, timeSpentSeconds: number) {
  const threshold = getRapidGuessThresholdSeconds(question);
  if (timeSpentSeconds >= threshold) return null;

  return `Solved unusually fast in ${timeSpentSeconds}s. Marks count, but ELO is trimmed slightly because the attempt looks like a guess or skim.`;
}
