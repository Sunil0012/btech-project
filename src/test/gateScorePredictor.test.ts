import { describe, expect, it } from "vitest";

import { calculateGateScorePrediction } from "@/lib/gateScorePredictor";

describe("gateScorePredictor", () => {
  it("does not increase expected score just because attempt volume increased at the same correctness rate", () => {
    const lowVolume = calculateGateScorePrediction({
      studentElo: 1700,
      answeredQuestionsCount: 10,
      overallAccuracy: 80,
      subjectPerformance: [
        { name: "Linear Algebra", accuracy: 80, score: { correct: 8, total: 10 } },
      ],
      testHistory: [],
    });

    const highVolume = calculateGateScorePrediction({
      studentElo: 1700,
      answeredQuestionsCount: 20,
      overallAccuracy: 80,
      subjectPerformance: [
        { name: "Linear Algebra", accuracy: 80, score: { correct: 16, total: 20 } },
      ],
      testHistory: [],
    });

    expect(highVolume.expectedScore).toBe(lowVolume.expectedScore);
    expect(highVolume.confidence).toBeGreaterThanOrEqual(lowVolume.confidence);
  });

  it("raises the prediction when correctness and test quality improve", () => {
    const weaker = calculateGateScorePrediction({
      studentElo: 1650,
      answeredQuestionsCount: 40,
      overallAccuracy: 52,
      subjectPerformance: [
        { name: "Linear Algebra", accuracy: 50, score: { correct: 10, total: 20 } },
        { name: "Probability", accuracy: 55, score: { correct: 11, total: 20 } },
      ],
      testHistory: [
        { test_type: "topic-wise", score: 22, max_score: 50, completed_at: "2026-04-10T08:00:00.000Z" },
      ],
    });

    const stronger = calculateGateScorePrediction({
      studentElo: 1850,
      answeredQuestionsCount: 40,
      overallAccuracy: 78,
      subjectPerformance: [
        { name: "Linear Algebra", accuracy: 80, score: { correct: 16, total: 20 } },
        { name: "Probability", accuracy: 75, score: { correct: 15, total: 20 } },
      ],
      testHistory: [
        { test_type: "topic-wise", score: 38, max_score: 50, completed_at: "2026-04-10T08:00:00.000Z" },
        { test_type: "adaptive", score: 34, max_score: 40, completed_at: "2026-04-18T08:00:00.000Z" },
        { test_type: "full-mock", score: 62, max_score: 100, completed_at: "2026-04-20T08:00:00.000Z" },
      ],
    });

    expect(stronger.expectedScore).toBeGreaterThan(weaker.expectedScore);
    expect(stronger.maxScore).toBeGreaterThan(weaker.maxScore);
  });

  it("uses correct answers from history instead of penalized marks when available", () => {
    const lowerMarkedScore = calculateGateScorePrediction({
      studentElo: 1800,
      answeredQuestionsCount: 30,
      overallAccuracy: 70,
      subjectPerformance: [
        { name: "Linear Algebra", accuracy: 70, score: { correct: 14, total: 20 } },
      ],
      testHistory: [
        {
          test_type: "full-mock",
          score: 42,
          max_score: 100,
          correct_answers: 21,
          total_questions: 30,
          completed_at: "2026-04-20T08:00:00.000Z",
        },
      ],
    });

    const sameCorrectnessBetterMarks = calculateGateScorePrediction({
      studentElo: 1800,
      answeredQuestionsCount: 30,
      overallAccuracy: 70,
      subjectPerformance: [
        { name: "Linear Algebra", accuracy: 70, score: { correct: 14, total: 20 } },
      ],
      testHistory: [
        {
          test_type: "full-mock",
          score: 70,
          max_score: 100,
          correct_answers: 21,
          total_questions: 30,
          completed_at: "2026-04-20T08:00:00.000Z",
        },
      ],
    });

    expect(lowerMarkedScore.expectedScore).toBe(sameCorrectnessBetterMarks.expectedScore);
    expect(lowerMarkedScore.maxScore).toBe(sameCorrectnessBetterMarks.maxScore);
  });
});
