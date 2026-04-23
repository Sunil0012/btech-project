import type { Question } from "./questions";
import { fullGateTestQuestions } from "./fullGateTest";
import { gateMockPaper2Questions } from "./gateMockPaper2";
import { gateMockPaper3Questions } from "./gateMockPaper3";
import {
  gateMockPaper4Questions,
  gateMockPaper5Questions,
  gateMockPaper6Questions,
  gateMockPaper7Questions,
} from "./additionalMockPapers";
import { da24S1Questions } from "./DA2024";
import { da2025Questions } from "./DA2025";
import { da2026Questions } from "./DA2026";

export type FullTestId =
  | "full-gate"
  | "mock-paper-2"
  | "mock-paper-3"
  | "mock-paper-4"
  | "mock-paper-5"
  | "mock-paper-6"
  | "mock-paper-7"
  | "da-2024-s1"
  | "da-2025"
  | "da-2026";

export interface FullTestMeta {
  id: FullTestId;
  label: string;
  description: string;
  questionCount: number;
  displayQuestionCount?: number;
  durationMinutes: number;
  maxMarks: number;
  paperCode?: string;
  note?: string;
}

export type FullTestQuestion = Omit<Question, "eloRating"> & { eloRating?: number };

function getTotalMarks(questions: ReadonlyArray<{ marks: number }>) {
  return questions.reduce((sum, question) => sum + question.marks, 0);
}

const fullTests: Record<FullTestId, { meta: FullTestMeta; questions: readonly FullTestQuestion[] }> = {
  "full-gate": {
    meta: {
      id: "full-gate",
      label: "Full GATE Test",
      description: "Fixed full-length GATE-style paper built from the internal mock question bank.",
      questionCount: fullGateTestQuestions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(fullGateTestQuestions),
      paperCode: "Internal Mock",
    },
    questions: fullGateTestQuestions,
  },
  "mock-paper-2": {
    meta: {
      id: "mock-paper-2",
      label: "Mock Paper 2",
      description: "Interactive version of Mock Paper 2 using the extracted text-only questions.",
      questionCount: gateMockPaper2Questions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(gateMockPaper2Questions),
      paperCode: "Mock Paper",
    },
    questions: gateMockPaper2Questions,
  },
  "mock-paper-3": {
    meta: {
      id: "mock-paper-3",
      label: "Mock Paper 3",
      description: "Interactive version of Mock Paper 3 using the extracted text-only questions.",
      questionCount: gateMockPaper3Questions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(gateMockPaper3Questions),
      paperCode: "Mock Paper",
    },
    questions: gateMockPaper3Questions,
  },
  "mock-paper-4": {
    meta: {
      id: "mock-paper-4",
      label: "Mock Paper 4",
      description: "Interactive version of Mock Paper 4 using the newly added GATE DA question bank.",
      questionCount: gateMockPaper4Questions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(gateMockPaper4Questions),
      paperCode: "Mock Paper",
    },
    questions: gateMockPaper4Questions,
  },
  "mock-paper-5": {
    meta: {
      id: "mock-paper-5",
      label: "Mock Paper 5",
      description: "Interactive version of Mock Paper 5 using the newly added GATE DA question bank.",
      questionCount: gateMockPaper5Questions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(gateMockPaper5Questions),
      paperCode: "Mock Paper",
    },
    questions: gateMockPaper5Questions,
  },
  "mock-paper-6": {
    meta: {
      id: "mock-paper-6",
      label: "Mock Paper 6",
      description: "Interactive version of Mock Paper 6 using the newly added GATE DA question bank.",
      questionCount: gateMockPaper6Questions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(gateMockPaper6Questions),
      paperCode: "Mock Paper",
    },
    questions: gateMockPaper6Questions,
  },
  "mock-paper-7": {
    meta: {
      id: "mock-paper-7",
      label: "Mock Paper 7",
      description: "Interactive version of Mock Paper 7 using the newly added GATE DA question bank.",
      questionCount: gateMockPaper7Questions.length,
      durationMinutes: 180,
      maxMarks: getTotalMarks(gateMockPaper7Questions),
      paperCode: "Mock Paper",
    },
    questions: gateMockPaper7Questions,
  },
  "da-2024-s1": {
    meta: {
      id: "da-2024-s1",
      label: "GATE DA 2024",
      description: "Official-style paper import from DA 2024 with usable answer-key mapping.",
      questionCount: da24S1Questions.length,
      displayQuestionCount: 65,
      durationMinutes: 180,
      maxMarks: getTotalMarks(da24S1Questions),
      paperCode: "Official Paper",
    },
    questions: da24S1Questions,
  },
  "da-2025": {
    meta: {
      id: "da-2025",
      label: "GATE DA 2025",
      description: "Official-style DA 2025 paper experience in the GateWay exam interface.",
      questionCount: da2025Questions.length,
      displayQuestionCount: 65,
      durationMinutes: 180,
      maxMarks: 100,
      paperCode: "Official Paper",
    },
    questions: da2025Questions,
  },
  "da-2026": {
    meta: {
      id: "da-2026",
      label: "GATE DA 2026",
      description: "Official-style DA 2026 paper imported from the paper PDF and answer key.",
      questionCount: da2026Questions.length,
      displayQuestionCount: 65,
      durationMinutes: 180,
      maxMarks: 100,
      paperCode: "Official Paper",
    },
    questions: da2026Questions,
  },
};

export const availableFullTests: FullTestMeta[] = Object.values(fullTests).map((entry) => entry.meta);

export function getFullTestMeta(testId: FullTestId): FullTestMeta {
  return fullTests[testId].meta;
}

export function getFullTestQuestions(testId: FullTestId): FullTestQuestion[] {
  return [...fullTests[testId].questions];
}
