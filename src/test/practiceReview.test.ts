import { describe, expect, it } from "vitest";

import type { Question } from "@/data/questions";
import {
  getRapidGuessAdjustedEloGain,
  getRapidGuessComplexityIndex,
  getRapidGuessPenalty,
  getRapidGuessThresholdSeconds,
} from "@/lib/practiceReview";

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "review-q",
    subjectId: "linear-algebra",
    topicId: "la-matrices",
    question: "A".repeat(100),
    options: ["B".repeat(40), "C".repeat(10)],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Explanation",
    difficulty: "easy",
    eloRating: 1500,
    marks: 1,
    negativeMarks: 0.33,
    ...overrides,
  };
}

describe("practiceReview rapid-guess engine", () => {
  it("computes the minimum solve time from stem length, option length, and complexity", () => {
    const baselineQuestion = createQuestion();
    const highComplexityQuestion = createQuestion({
      type: "nat",
      options: [],
      difficulty: "hard",
      question: "D".repeat(50),
    });

    expect(getRapidGuessComplexityIndex(baselineQuestion)).toBe(0);
    expect(getRapidGuessThresholdSeconds(baselineQuestion)).toBe(13);

    expect(getRapidGuessComplexityIndex(highComplexityQuestion)).toBe(1);
    expect(getRapidGuessThresholdSeconds(highComplexityQuestion)).toBe(41);
  });

  it("applies the specified proportional penalty when solved too quickly", () => {
    const thresholdTwentyQuestion = createQuestion({
      question: "A".repeat(500),
      options: [],
    });

    expect(getRapidGuessThresholdSeconds(thresholdTwentyQuestion)).toBe(20);
    expect(getRapidGuessPenalty(thresholdTwentyQuestion, 10)).toBe(10);
    expect(getRapidGuessPenalty(thresholdTwentyQuestion, 20)).toBe(0);
  });

  it("clips the adjusted ELO gain at zero after rapid-guess penalty", () => {
    const thresholdTwentyQuestion = createQuestion({
      question: "A".repeat(500),
      options: [],
      eloRating: 1500,
    });

    const partiallyReduced = getRapidGuessAdjustedEloGain(
      1500,
      thresholdTwentyQuestion,
      10,
      true
    );

    expect(partiallyReduced.standardGain).toBe(16);
    expect(partiallyReduced.penalty).toBe(10);
    expect(partiallyReduced.appliedPenalty).toBe(10);
    expect(partiallyReduced.adjustedGain).toBe(6);

    const fullyClipped = getRapidGuessAdjustedEloGain(
      1500,
      thresholdTwentyQuestion,
      0,
      true
    );

    expect(fullyClipped.penalty).toBe(20);
    expect(fullyClipped.appliedPenalty).toBe(16);
    expect(fullyClipped.adjustedGain).toBe(0);
  });
});
