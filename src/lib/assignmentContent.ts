import type { Question } from "@/data/questions";

export interface AssignmentAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface AssignmentAvailabilityWindow {
  startAt?: string | null;
  endAt?: string | null;
}

export interface AssignmentManualQuestion extends Question {
  source?: "manual-quiz";
}

export interface ParsedAssignmentContent {
  body: string;
  attachments: AssignmentAttachment[];
  availability: AssignmentAvailabilityWindow | null;
  manualQuestions: AssignmentManualQuestion[];
  questionSource: "bank" | "manual-quiz";
}

const ASSIGNMENT_META_PREFIX = "<!--GATE_ASSIGNMENT_META:";
const ASSIGNMENT_META_SUFFIX = "-->";

function encodeBase64(value: string) {
  return window.btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64(value: string) {
  return decodeURIComponent(escape(window.atob(value)));
}

export function serializeAssignmentDescription(body: string, attachments: AssignmentAttachment[]) {
  return serializeAssignmentContent({
    body,
    attachments,
  });
}

export function serializeAssignmentContent(input: {
  body: string;
  attachments?: AssignmentAttachment[];
  availability?: AssignmentAvailabilityWindow | null;
  manualQuestions?: AssignmentManualQuestion[];
  questionSource?: "bank" | "manual-quiz";
}) {
  const trimmedBody = input.body.trim();
  const attachments = input.attachments || [];
  const availability = input.availability || null;
  const manualQuestions = input.manualQuestions || [];
  const questionSource = input.questionSource || (manualQuestions.length > 0 ? "manual-quiz" : "bank");

  if (
    attachments.length === 0 &&
    !availability?.startAt &&
    !availability?.endAt &&
    manualQuestions.length === 0 &&
    questionSource === "bank"
  ) {
    return trimmedBody;
  }

  const payload = encodeBase64(
    JSON.stringify({
      attachments,
      availability,
      manualQuestions,
      questionSource,
    })
  );
  return `${ASSIGNMENT_META_PREFIX}${payload}${ASSIGNMENT_META_SUFFIX}\n${trimmedBody}`;
}

export function parseAssignmentDescription(rawDescription?: string | null): ParsedAssignmentContent {
  const description = rawDescription || "";

  if (!description.startsWith(ASSIGNMENT_META_PREFIX)) {
    return {
      body: description.trim(),
      attachments: [],
      availability: null,
      manualQuestions: [],
      questionSource: "bank",
    };
  }

  const suffixIndex = description.indexOf(ASSIGNMENT_META_SUFFIX);
  if (suffixIndex === -1) {
    return {
      body: description.trim(),
      attachments: [],
      availability: null,
      manualQuestions: [],
      questionSource: "bank",
    };
  }

  try {
    const encoded = description.slice(ASSIGNMENT_META_PREFIX.length, suffixIndex);
    const parsed = JSON.parse(decodeBase64(encoded)) as {
      attachments?: AssignmentAttachment[];
      availability?: AssignmentAvailabilityWindow | null;
      manualQuestions?: AssignmentManualQuestion[];
      questionSource?: "bank" | "manual-quiz";
    };
    return {
      body: description.slice(suffixIndex + ASSIGNMENT_META_SUFFIX.length).trim(),
      attachments: parsed.attachments || [],
      availability: parsed.availability || null,
      manualQuestions: parsed.manualQuestions || [],
      questionSource: parsed.questionSource || (parsed.manualQuestions?.length ? "manual-quiz" : "bank"),
    };
  } catch {
    return {
      body: description.trim(),
      attachments: [],
      availability: null,
      manualQuestions: [],
      questionSource: "bank",
    };
  }
}
