import { describe, expect, it } from "vitest";

import { createExamShellState, reduceExamShellState } from "@/lib/examShellState";

describe("examShellState question timer", () => {
  it("stores elapsed time on the current question before navigating away", () => {
    const state = createExamShellState({
      sessionId: "session-1",
      testType: "topic-wise",
      totalQuestions: 3,
      targetQuestions: 3,
      durationSeconds: 1800,
    });

    const timedState = {
      ...state,
      lastNavigatedAt: 1_000,
    };

    const nextState = reduceExamShellState(timedState, {
      type: "NAVIGATE_TO_QUESTION",
      payload: {
        questionIndex: 1,
        now: 6_000,
      },
    });

    expect(nextState.palette[0]?.timeSpentSeconds).toBe(5);
    expect(nextState.currentQuestionIndex).toBe(1);
    expect(nextState.lastNavigatedAt).toBe(6_000);
  });

  it("captures the active question time when the exam is submitted", () => {
    const state = createExamShellState({
      sessionId: "session-2",
      testType: "topic-wise",
      totalQuestions: 2,
      targetQuestions: 2,
      durationSeconds: 1200,
    });

    const activeQuestionState = {
      ...state,
      currentQuestionIndex: 1,
      lastNavigatedAt: 2_000,
      palette: state.palette.map((slot, index) =>
        index === 1 ? { ...slot, timeSpentSeconds: 3 } : slot
      ),
    };

    const submittedState = reduceExamShellState(activeQuestionState, {
      type: "SUBMIT",
      payload: { now: 7_000 },
    });

    expect(submittedState.palette[1]?.timeSpentSeconds).toBe(8);
    expect(submittedState.submitted).toBe(true);
    expect(submittedState.timerCompletedAt).toBe(7_000);
  });
});
