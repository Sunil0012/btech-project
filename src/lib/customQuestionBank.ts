import type { Question } from "@/data/questions";

export type CustomQuestionBankQuestion = Question & {
  bankSource?: "teacher-manual" | "teacher-template";
  templateSourceId?: string | null;
  createdAt?: string;
};

const CUSTOM_QUESTION_BANK_STORAGE_KEY = "gate_teacher_custom_question_bank_v1";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function dedupeQuestions(questionList: CustomQuestionBankQuestion[]) {
  const byId = new Map<string, CustomQuestionBankQuestion>();

  questionList.forEach((question) => {
    byId.set(question.id, question);
  });

  return [...byId.values()];
}

export function readCustomQuestionBank(): CustomQuestionBankQuestion[] {
  if (!hasStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CUSTOM_QUESTION_BANK_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CustomQuestionBankQuestion[];
    return Array.isArray(parsed) ? dedupeQuestions(parsed) : [];
  } catch {
    return [];
  }
}

export function writeCustomQuestionBank(questionList: CustomQuestionBankQuestion[]) {
  if (!hasStorage()) return;

  window.localStorage.setItem(
    CUSTOM_QUESTION_BANK_STORAGE_KEY,
    JSON.stringify(dedupeQuestions(questionList))
  );
}

export function upsertCustomQuestionBankEntries(
  incomingQuestions: CustomQuestionBankQuestion[],
  existingQuestions: CustomQuestionBankQuestion[] = readCustomQuestionBank()
) {
  const merged = dedupeQuestions([...existingQuestions, ...incomingQuestions]);
  writeCustomQuestionBank(merged);
  return merged;
}
