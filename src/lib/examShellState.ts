/**
 * Shared exam shell state model for topic-wise and adaptive exam execution.
 * Manages timer, question navigation, answers, marked-for-review, and palette state.
 */

import { Question } from "@/data/questions";
import { PracticeAnswer } from "@/lib/testReview";

export interface ExamPaletteSlot {
  questionIndex: number;
  status: "not-visited" | "answered" | "answered-review" | "not-answered" | "not-answered-review";
  isUnlocked: boolean;
  timeSpentSeconds: number;
}

export interface ExamShellState {
  // Basic session info
  sessionId: string;
  testType: "topic-wise" | "adaptive";
  totalQuestions: number;
  targetQuestions: number; // How many questions to show
  
  // Timer state
  timerStartedAt: number; // Timestamp
  durationSeconds: number; // Remaining time (updated as timer counts down)
  isTimerActive: boolean;
  timerCompletedAt?: number;
  
  // Question navigation
  currentQuestionIndex: number;
  visitedIndices: Set<number>; // Questions user has seen
  
  // Answers and marking
  answers: Map<number, PracticeAnswer>; // Map of question index to answer
  markedForReview: Set<number>; // Question indices marked for review
  
  // Palette state
  palette: ExamPaletteSlot[];
  
  // Skip/next tracking
  lastNavigatedAt: number; // Timestamp
  
  // Exit confirmation
  attemptedExit: boolean;
  submitted: boolean;
}

export interface ExamShellAction {
  type:
    | "INIT"
    | "ANSWER_QUESTION"
    | "MARK_REVIEW"
    | "UNMARK_REVIEW"
    | "NAVIGATE_TO_QUESTION"
    | "SKIP_QUESTION"
    | "UNLOCK_NEXT_QUESTIONS_BLOCK"
    | "SUBMIT"
    | "CONFIRM_EXIT"
    | "TICK_TIMER"
    | "RESTORE_STATE";
  payload?: Record<string, any>;
}

function getActionTimestamp(action: ExamShellAction): number {
  return typeof action.payload?.now === "number" ? action.payload.now : Date.now();
}

function accumulateCurrentQuestionTime(
  state: ExamShellState,
  now: number
): ExamShellState {
  const currentSlot = state.palette[state.currentQuestionIndex];
  if (!currentSlot) {
    return now === state.lastNavigatedAt ? state : { ...state, lastNavigatedAt: now };
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - state.lastNavigatedAt) / 1000)
  );

  if (elapsedSeconds === 0) {
    return now === state.lastNavigatedAt ? state : { ...state, lastNavigatedAt: now };
  }

  return {
    ...state,
    palette: state.palette.map((slot, index) =>
      index === state.currentQuestionIndex
        ? { ...slot, timeSpentSeconds: slot.timeSpentSeconds + elapsedSeconds }
        : slot
    ),
    lastNavigatedAt: now,
  };
}

/**
 * Initialize exam shell state
 */
export function createExamShellState({
  sessionId,
  testType,
  totalQuestions,
  targetQuestions,
  durationSeconds,
}: {
  sessionId: string;
  testType: "topic-wise" | "adaptive";
  totalQuestions: number;
  targetQuestions: number;
  durationSeconds: number;
}): ExamShellState {
  const now = Date.now();
  
  // For topic-wise: show all target slots, all unlocked.
  // For adaptive: unlock only the first slot and reveal the path one question at a time.
  const isAdaptive = testType === "adaptive";
  const unlockedCount = isAdaptive ? Math.min(1, targetQuestions) : targetQuestions;
  
  const palette: ExamPaletteSlot[] = Array.from({ length: targetQuestions }, (_, i) => ({
    questionIndex: i,
    status: "not-visited",
    isUnlocked: i < unlockedCount,
    timeSpentSeconds: 0,
  }));

  return {
    sessionId,
    testType,
    totalQuestions,
    targetQuestions,
    timerStartedAt: now,
    durationSeconds,
    isTimerActive: true,
    currentQuestionIndex: 0,
    visitedIndices: new Set(),
    answers: new Map(),
    markedForReview: new Set(),
    palette,
    lastNavigatedAt: now,
    attemptedExit: false,
    submitted: false,
  };
}

/**
 * Update palette status based on current answers and marked state
 */
export function updatePaletteStatus(
  state: ExamShellState,
  questionIndex: number
): ExamPaletteSlot {
  const answer = state.answers.get(questionIndex);
  const isAnswered = answer !== null && answer !== undefined && (typeof answer !== "string" || answer.trim() !== "") && (typeof answer !== "object" || (Array.isArray(answer) && answer.length > 0));
  const isMarked = state.markedForReview.has(questionIndex);

  let status: ExamPaletteSlot["status"];
  if (isAnswered && isMarked) {
    status = "answered-review";
  } else if (isAnswered) {
    status = "answered";
  } else if (isMarked) {
    status = "not-answered-review";
  } else if (state.visitedIndices.has(questionIndex)) {
    status = "not-answered";
  } else {
    status = "not-visited";
  }

  return { ...state.palette[questionIndex], status };
}

/**
 * Process exam shell action
 */
export function reduceExamShellState(
  state: ExamShellState,
  action: ExamShellAction
): ExamShellState {
  switch (action.type) {
    case "ANSWER_QUESTION": {
      const { questionIndex, answer } = action.payload;
      const newState = { ...state };
      newState.answers = new Map(state.answers);
      newState.answers.set(questionIndex, answer);
      newState.visitedIndices = new Set(state.visitedIndices);
      newState.visitedIndices.add(questionIndex);
      
      // Update palette
      const updatedSlot = updatePaletteStatus(newState, questionIndex);
      newState.palette = state.palette.map((slot, i) =>
        i === questionIndex ? updatedSlot : slot
      );
      
      return newState;
    }

    case "MARK_REVIEW": {
      const { questionIndex } = action.payload;
      const newState = { ...state };
      newState.markedForReview = new Set(state.markedForReview);
      newState.markedForReview.add(questionIndex);
      
      // Update palette status
      const updatedSlot = updatePaletteStatus(newState, questionIndex);
      newState.palette = state.palette.map((slot, i) =>
        i === questionIndex ? updatedSlot : slot
      );
      
      return newState;
    }

    case "UNMARK_REVIEW": {
      const { questionIndex } = action.payload;
      const newState = { ...state };
      newState.markedForReview = new Set(state.markedForReview);
      newState.markedForReview.delete(questionIndex);
      
      // Update palette status
      const updatedSlot = updatePaletteStatus(newState, questionIndex);
      newState.palette = state.palette.map((slot, i) =>
        i === questionIndex ? updatedSlot : slot
      );
      
      return newState;
    }

    case "NAVIGATE_TO_QUESTION": {
      const { questionIndex } = action.payload;
      if (questionIndex < 0 || questionIndex >= state.targetQuestions) {
        return state;
      }

      // Can only navigate to unlocked questions
      if (!state.palette[questionIndex]?.isUnlocked) {
        return state;
      }

      const now = getActionTimestamp(action);
      const timedState = accumulateCurrentQuestionTime(state, now);

      return {
        ...timedState,
        currentQuestionIndex: questionIndex,
        visitedIndices: new Set([...timedState.visitedIndices, questionIndex]),
      };
    }

    case "SKIP_QUESTION": {
      // Move to next unlocked question
      const nextIndex = Array.from({ length: state.targetQuestions }, (_, i) => i)
        .slice(state.currentQuestionIndex + 1)
        .find((i) => state.palette[i]?.isUnlocked);

      if (nextIndex !== undefined) {
        const now = getActionTimestamp(action);
        const timedState = accumulateCurrentQuestionTime(state, now);

        return {
          ...timedState,
          currentQuestionIndex: nextIndex,
          visitedIndices: new Set([...timedState.visitedIndices, nextIndex]),
        };
      }

      return state;
    }

    case "UNLOCK_NEXT_QUESTIONS_BLOCK": {
      // Unlock the next question slot (adaptive only).
      if (state.testType !== "adaptive") return state;

      const unlockedCount = state.palette.filter((s) => s.isUnlocked).length;
      const nextBlockEnd = Math.min(unlockedCount + 1, state.targetQuestions);

      const newPalette = state.palette.map((slot, i) => ({
        ...slot,
        isUnlocked: i < nextBlockEnd,
      }));

      return { ...state, palette: newPalette };
    }

    case "TICK_TIMER": {
      const now = getActionTimestamp(action);
      const totalElapsedSeconds = (now - state.timerStartedAt) / 1000;
      const remaining = Math.max(0, state.durationSeconds - totalElapsedSeconds);

      if (remaining === 0) {
        const timedState = accumulateCurrentQuestionTime(state, now);
        return {
          ...timedState,
          isTimerActive: false,
          timerCompletedAt: now,
          durationSeconds: 0,
          submitted: true, // Auto-submit when time runs out
        };
      }

      return state;
    }

    case "SUBMIT": {
      const now = getActionTimestamp(action);
      const timedState = accumulateCurrentQuestionTime(state, now);
      return {
        ...timedState,
        submitted: true,
        isTimerActive: false,
        timerCompletedAt: now,
      };
    }

    case "CONFIRM_EXIT": {
      return { ...state, attemptedExit: true };
    }

    default:
      return state;
  }
}

/**
 * Get answers array in order (for saving to history)
 */
export function getAnswersArray(state: ExamShellState, totalQuestions: number): PracticeAnswer[] {
  return Array.from({ length: totalQuestions }, (_, i) => state.answers.get(i) ?? null);
}

/**
 * Check if exam can submit (all required questions answered or timer expired)
 */
export function canSubmitExam(state: ExamShellState): boolean {
  return state.submitted || state.durationSeconds <= 0;
}

/**
 * Get attempted questions count
 */
export function getAttemptedCount(state: ExamShellState): number {
  return Array.from(state.answers.values()).filter((a) => a !== null && a !== undefined && (typeof a !== "string" || a.trim() !== "") && (typeof a !== "object" || (Array.isArray(a) && a.length > 0))).length;
}
