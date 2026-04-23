import { describe, expect, it } from "vitest";

import { buildStudentAnalyticsSummary } from "@/lib/studentAnalytics";

describe("studentAnalytics activity timeline", () => {
  it("uses saved history counts and ignores empty non-warning event buckets", () => {
    const summary = buildStudentAnalyticsSummary({
      testHistory: [
        {
          id: "history-1",
          user_id: "student-1",
          test_type: "topic-wise",
          subject_id: "linear-algebra",
          topic_id: "la-matrices",
          score: 8,
          max_score: 10,
          questions_attempted: 4,
          correct_answers: 3,
          total_questions: 5,
          violations: 0,
          duration_seconds: 600,
          completed_at: "2026-04-20T08:00:00.000Z",
          review_payload: null,
        },
      ] as any,
      userProgress: [],
      activityRows: [
        {
          id: "event-1",
          actor_id: "student-1",
          actor_role: "student",
          actor_name: "Student",
          assignment_id: null,
          course_id: null,
          created_at: "2026-04-21T08:00:00.000Z",
          event_type: "student_signed_in",
          metadata: {},
          question_id: null,
          subject_id: null,
          target_user_id: null,
          topic_id: null,
        },
      ] as any,
      profileStreak: 0,
      totalQuestionBankCount: 100,
    });

    expect(summary.activityTimeline).toHaveLength(1);
    expect(summary.activityTimeline[0]).toMatchObject({
      tests: 1,
      questions: 4,
      warnings: 0,
    });
  });
});
