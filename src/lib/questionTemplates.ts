import type { Question } from "@/data/questions";

import type { CustomQuestionBankQuestion } from "@/lib/customQuestionBank";

const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/g;

function formatShiftedNumber(originalToken: string, shiftedValue: number) {
  if (originalToken.includes(".")) {
    const decimalPlaces = originalToken.split(".")[1]?.length ?? 0;
    return shiftedValue.toFixed(decimalPlaces);
  }

  return Math.round(shiftedValue).toString();
}

function replaceNumericTokens(input: string, delta: number) {
  return input.replace(NUMBER_PATTERN, (token) => {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) return token;
    return formatShiftedNumber(token, parsed + delta);
  });
}

function cloneOptionsWithNumericShift(options: string[], delta: number) {
  return options.map((option) => replaceNumericTokens(option, delta));
}

export function generateTemplatedQuestionVariants(
  sourceQuestion: Question,
  variantCount: number
): CustomQuestionBankQuestion[] {
  const sourceText = [
    sourceQuestion.question,
    sourceQuestion.explanation,
    ...sourceQuestion.options,
  ].join(" ");

  const hasNumericContent = NUMBER_PATTERN.test(sourceText) || Boolean(sourceQuestion.correctNat);
  NUMBER_PATTERN.lastIndex = 0;

  if (!hasNumericContent) return [];

  return Array.from({ length: variantCount }, (_, index) => {
    const variantNumber = index + 1;
    const delta = variantNumber * (sourceQuestion.type === "nat" ? 2 : 3);
    const nextQuestion = replaceNumericTokens(sourceQuestion.question, delta);
    const nextExplanation = `${replaceNumericTokens(sourceQuestion.explanation, delta)} Generated template variant ${variantNumber}.`;
    const nextOptions = cloneOptionsWithNumericShift(sourceQuestion.options, delta);

    return {
      ...sourceQuestion,
      id: `${sourceQuestion.id}-tpl-${variantNumber}`,
      question: nextQuestion,
      options: nextOptions,
      explanation: nextExplanation,
      correctNat: sourceQuestion.correctNat
        ? {
            min: sourceQuestion.correctNat.min + delta,
            max: sourceQuestion.correctNat.max + delta,
          }
        : undefined,
      bankSource: "teacher-template",
      templateSourceId: sourceQuestion.id,
      createdAt: new Date().toISOString(),
    } satisfies CustomQuestionBankQuestion;
  });
}
