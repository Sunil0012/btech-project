import { describe, expect, it } from "vitest";

import { parseTestReviewPayload } from "@/lib/testReview";

describe("test review payload parsing", () => {
  it("accepts stringified legacy payloads with mixed key styles", () => {
    const payload = parseTestReviewPayload(JSON.stringify({
      fullTestId: "mock-paper-4",
      questionIds: ["mock4-q1"],
      answers: [1],
      questionSnapshots: [
        {
          id: "mock4-q1",
          subjectId: "general-aptitude",
          topicId: "ga-verbal-reasoning",
          question: "Sample question",
          options: ["A", "B", "C", "D"],
          correctAnswer: 1,
          type: "mcq",
          explanation: "Sample explanation",
          difficulty: "easy",
          marks: 1,
          negativeMarks: 0.33,
        },
      ],
      questionReviews: [
        {
          questionId: "mock4-q1",
          correct: true,
          timeSpentSeconds: 42,
          rapidGuessWarning: false,
          rapidGuessThresholdSeconds: 20,
          eloAdjustment: 0,
        },
      ],
      attempt_kind: "full-mock",
      counts_for_stats: true,
      counts_for_rating: true,
      review_metadata: {
        attemptDuration: 420,
      },
    }));

    expect(payload).not.toBeNull();
    expect(payload?.full_test_id).toBe("mock-paper-4");
    expect(payload?.question_ids).toEqual(["mock4-q1"]);
    expect(payload?.question_reviews?.[0]?.timeSpentSeconds).toBe(42);
    expect(payload?.attemptKind).toBe("full-mock");
    expect(payload?.countsForStats).toBe(true);
    expect(payload?.countsForRating).toBe(true);
    expect(payload?.reviewMetadata?.attemptDuration).toBe(420);
  });
});
