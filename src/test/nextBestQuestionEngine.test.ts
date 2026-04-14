import { describe, expect, it } from "vitest";

import type { Question } from "@/data/questions";
import {
  recommendNextBestAdaptiveQuestion,
} from "@/lib/nextBestQuestionEngine";

const questionBank: Question[] = [
  {
    id: "a-easy",
    subjectId: "linear-algebra",
    topicId: "la-matrices",
    question: "Easy matrices",
    options: ["A", "B"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "test",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "a-medium",
    subjectId: "linear-algebra",
    topicId: "la-matrices",
    question: "Medium matrices",
    options: ["A", "B"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "test",
    difficulty: "medium",
    eloRating: 1400,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "a-hard",
    subjectId: "linear-algebra",
    topicId: "la-matrices",
    question: "Hard matrices",
    options: ["A", "B"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "test",
    difficulty: "hard",
    eloRating: 1580,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "b-medium",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question: "Medium eigenvalues",
    options: ["A", "B"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "test",
    difficulty: "medium",
    eloRating: 1410,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "b-hard",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question: "Hard eigenvalues",
    options: ["A", "B"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "test",
    difficulty: "hard",
    eloRating: 1600,
    marks: 2,
    negativeMarks: 0.66,
  },
];

describe("nextBestQuestionEngine", () => {
  it("recommends a simpler same-topic follow-up after a miss", () => {
    const recommendation = recommendNextBestAdaptiveQuestion({
      subjectId: "linear-algebra",
      studentElo: 1460,
      questionBank,
      sessionQuestionIds: new Set(["a-medium"]),
      sessionAttempts: [
        {
          questionId: "a-medium",
          topicId: "la-matrices",
          difficulty: "medium",
          eloRating: 1400,
          correct: false,
        },
      ],
    });

    expect(recommendation.question?.id).toBe("a-easy");
    expect(recommendation.reasons.join(" ")).toContain("Reinforces");
  });

  it("builds a remediation path after an unresolved miss", () => {
    const recommendation = recommendNextBestAdaptiveQuestion({
      subjectId: "linear-algebra",
      studentElo: 1460,
      questionBank,
      sessionQuestionIds: new Set(["a-medium"]),
      sessionAttempts: [
        {
          questionId: "a-medium",
          topicId: "la-matrices",
          difficulty: "medium",
          eloRating: 1400,
          correct: false,
          timeSpentSeconds: 6,
          rapidGuessWarning: true,
        },
      ],
    });

    expect(recommendation.question?.id).toBe("a-easy");
    expect(recommendation.graph?.mode).toBe("remediation");
    expect(recommendation.graph?.remediationForQuestionId).toBe("a-medium");
  });

  it("uses graph neighbors to move into a harder follow-up after a correct answer", () => {
    const recommendation = recommendNextBestAdaptiveQuestion({
      subjectId: "linear-algebra",
      studentElo: 1450,
      questionBank,
      sessionQuestionIds: new Set(["a-medium"]),
      sessionAttempts: [
        {
          questionId: "a-medium",
          topicId: "la-matrices",
          difficulty: "medium",
          eloRating: 1400,
          correct: true,
        },
      ],
    });

    expect(recommendation.question?.id).toBe("a-hard");
    expect(recommendation.graph?.mode).toBe("neighbor");
  });

  it("retries the original missed question after three related remediation hops", () => {
    const recommendation = recommendNextBestAdaptiveQuestion({
      subjectId: "linear-algebra",
      studentElo: 1480,
      questionBank,
      answeredQuestionIds: new Set(["a-easy", "b-medium", "a-hard"]),
      sessionQuestionIds: new Set(["a-medium", "a-easy", "b-medium", "a-hard"]),
      sessionAttempts: [
        {
          questionId: "a-medium",
          topicId: "la-matrices",
          difficulty: "medium",
          eloRating: 1400,
          correct: false,
        },
        {
          questionId: "a-easy",
          topicId: "la-matrices",
          difficulty: "easy",
          eloRating: 1200,
          correct: true,
          remediationForQuestionId: "a-medium",
        },
        {
          questionId: "b-medium",
          topicId: "la-eigenvalues",
          difficulty: "medium",
          eloRating: 1410,
          correct: true,
          remediationForQuestionId: "a-medium",
        },
        {
          questionId: "a-hard",
          topicId: "la-matrices",
          difficulty: "hard",
          eloRating: 1580,
          correct: true,
          remediationForQuestionId: "a-medium",
        },
      ],
    });

    expect(recommendation.question?.id).toBe("a-medium");
    expect(recommendation.graph?.mode).toBe("retry");
  });

  it("never returns an answered or already-served question", () => {
    const recommendation = recommendNextBestAdaptiveQuestion({
      subjectId: "linear-algebra",
      studentElo: 1500,
      questionBank,
      answeredQuestionIds: new Set(["a-hard", "b-hard"]),
      sessionQuestionIds: new Set(["a-easy", "a-medium", "b-medium"]),
      sessionAttempts: [
        {
          questionId: "a-medium",
          topicId: "la-matrices",
          difficulty: "medium",
          eloRating: 1400,
          correct: true,
        },
      ],
    });

    expect(recommendation.question).toBeNull();
  });
});
