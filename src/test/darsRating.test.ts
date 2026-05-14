import { describe, expect, it } from "vitest";

import type { Question } from "@/data/questions";
import { applyDarsRatingUpdate, createInitialDarsRatingState } from "@/lib/darsRating";

const question: Question = {
  id: "dars-test-q1",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Compute the determinant of a 2 by 2 matrix.",
  options: ["1", "2", "3", "4"],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Test fixture",
  difficulty: "medium",
  eloRating: 1500,
  marks: 2,
  negativeMarks: 0.66,
};

describe("DARS rating update", () => {
  it("uses no-hint DARS scoring to reward a correct answer", () => {
    const { outcome } = applyDarsRatingUpdate(createInitialDarsRatingState(1500, 0), {
      question,
      correct: true,
      timeSpentSeconds: 20,
      hintsUsed: 0,
      maxHints: 0,
    });

    expect(outcome.delta).toBeGreaterThan(0);
    expect(outcome.performanceQuality).toBeGreaterThan(0.5);
  });

  it("penalizes an incorrect submitted answer", () => {
    const { outcome } = applyDarsRatingUpdate(createInitialDarsRatingState(1500, 0), {
      question,
      correct: false,
      timeSpentSeconds: 20,
      hintsUsed: 0,
      maxHints: 0,
    });

    expect(outcome.delta).toBeLessThan(0);
  });

  it("caps suspiciously fast correct-answer gains", () => {
    const { outcome } = applyDarsRatingUpdate(createInitialDarsRatingState(1500, 0), {
      question,
      correct: true,
      timeSpentSeconds: 1,
      hintsUsed: 0,
      maxHints: 0,
    });

    expect(outcome.rapidGuessCapped).toBe(true);
    expect(outcome.delta).toBeLessThanOrEqual(2);
  });
});
