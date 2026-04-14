import { describe, expect, it } from "vitest";

import {
  parseAssignmentDescription,
  serializeAssignmentContent,
} from "@/lib/assignmentContent";

describe("assignmentContent", () => {
  it("round-trips assignment metadata for manual quizzes", () => {
    const serialized = serializeAssignmentContent({
      body: "Solve the quiz carefully.",
      availability: {
        startAt: "2026-04-12T08:00:00.000Z",
        endAt: "2026-04-13T08:00:00.000Z",
      },
      attachments: [
        {
          name: "formula-sheet.pdf",
          type: "application/pdf",
          size: 2048,
          dataUrl: "data:application/pdf;base64,ZmFrZQ==",
        },
      ],
      manualQuestions: [
        {
          id: "manual-q1",
          subjectId: "linear-algebra",
          topicId: "la-matrices",
          question: "What is the determinant of the identity matrix?",
          options: ["0", "1"],
          correctAnswer: 1,
          type: "mcq",
          explanation: "The determinant of the identity matrix is 1.",
          difficulty: "easy",
          eloRating: 1180,
          marks: 1,
          negativeMarks: 0.33,
          source: "manual-quiz",
        },
      ],
      questionSource: "manual-quiz",
    });

    const parsed = parseAssignmentDescription(serialized);

    expect(parsed.body).toBe("Solve the quiz carefully.");
    expect(parsed.questionSource).toBe("manual-quiz");
    expect(parsed.availability).toEqual({
      startAt: "2026-04-12T08:00:00.000Z",
      endAt: "2026-04-13T08:00:00.000Z",
    });
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.manualQuestions).toHaveLength(1);
    expect(parsed.manualQuestions[0]?.id).toBe("manual-q1");
  });

  it("returns plain-body defaults when no metadata is present", () => {
    const parsed = parseAssignmentDescription("  Plain assignment body  ");

    expect(parsed).toEqual({
      body: "Plain assignment body",
      attachments: [],
      availability: null,
      manualQuestions: [],
      questionSource: "bank",
    });
  });
});
