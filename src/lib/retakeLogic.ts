/**
 * Retake Logic - Exact and Templated Reattempts
 * 
 * Exact reattempt: Uses stored question snapshots, counts_for_stats=false
 * Templated reattempt: Generates numeric variants or similar-topic replacements, counts_for_stats=true
 */

import { Question, getQuestionById, getQuestionsBySubject, getQuestionsByTopic } from "@/data/questions";
import { QuestionSnapshot, PracticeAnswer } from "@/lib/testReview";

/**
 * Generate a numeric template variant of a question.
 * For NAT questions, slightly modify the range.
 * For MCQ/ MSQ with numeric options, modify the numbers.
 */
export function createNumericTemplateVariant(question: Question): Question | null {
  // Only applicable to NAT and some MCQ/MSQ with numeric content
  if (question.type === "nat" && question.correctNat) {
    const originalMin = question.correctNat.min;
    const originalMax = question.correctNat.max;
    const range = originalMax - originalMin;
    const offset = Math.floor(range * 0.5); // 50% variation

    return {
      ...question,
      correctNat: {
        min: originalMin + offset,
        max: originalMax + offset,
      },
      question: question.question.replace(/range|interval|range values/i, `range (±${offset})`),
    };
  }

  // For MCQ with numeric options, shift values
  if (question.type === "mcq" && question.options && question.correctAnswer !== undefined) {
    const correctOption = question.options[question.correctAnswer];
    const numericValue = parseFloat(correctOption);

    if (!isNaN(numericValue)) {
      const modifier = numericValue * 0.1; // 10% modification
      const newCorrectValue = numericValue + modifier;
      const newOptions = question.options.map((opt, idx) => {
        const val = parseFloat(opt);
        if (!isNaN(val)) {
          return (val + modifier).toString();
        }
        return opt;
      });

      return {
        ...question,
        options: newOptions,
      };
    }
  }

  return null;
}

/**
 * Find a similar-topic replacement question if templating is not possible
 */
export function findSimilarTopicReplacement(
  originalQuestion: Question,
  questionBank: Question[],
  usedQuestionIds: Set<string>
): Question | null {
  // Find unused questions from the same topic
  const similarTopicQuestions = questionBank.filter(
    (q) =>
      q.topicId === originalQuestion.topicId &&
      q.id !== originalQuestion.id &&
      !usedQuestionIds.has(q.id) &&
      q.type === originalQuestion.type &&
      q.difficulty === originalQuestion.difficulty
  );

  if (similarTopicQuestions.length === 0) {
    // Fallback: try same subject, different topic
    return questionBank.find(
      (q) =>
        q.subjectId === originalQuestion.subjectId &&
        q.id !== originalQuestion.id &&
        !usedQuestionIds.has(q.id) &&
        q.type === originalQuestion.type
    ) || null;
  }

  return similarTopicQuestions[Math.floor(Math.random() * similarTopicQuestions.length)];
}

/**
 * Build exact reattempt: use stored snapshots
 */
export function buildExactReattempt(
  snapshots: QuestionSnapshot[],
  savedAnswers: PracticeAnswer[]
): {
  questions: Question[];
  answers: PracticeAnswer[];
} {
  const questions: Question[] = snapshots.map((snap) => ({
    id: snap.id,
    text: snap.text,
    type: snap.type,
    options: snap.options,
    correctAnswer: snap.correctAnswer,
    correctAnswers: snap.correctAnswers,
    correctNat: snap.correctNat,
    marks: snap.marks,
    negativeMarks: snap.negativeMarks,
    difficulty: snap.difficulty,
    explanation: snap.explanation,
    subjectId: snap.subjectId,
    topicId: snap.topicId,
    eloRating: snap.eloRating || 1500,
  } as Question));

  return {
    questions,
    answers: [...savedAnswers], // Copy saved answers
  };
}

/**
 * Build templated reattempt: generate variants or find replacements
 */
export function buildTemplatedReattempt(
  originalSnapshots: QuestionSnapshot[],
  questionBank: Question[]
): {
  questions: Question[];
  variantInfo: Array<{ originalId: string; variantType: "templated" | "replaced"; sourceId?: string }>;
} {
  const variantInfo: Array<{ originalId: string; variantType: "templated" | "replaced"; sourceId?: string }> = [];
  const questions: Question[] = [];
  const usedIds = new Set<string>();

  originalSnapshots.forEach((snap) => {
    const original = snapshotToQuestion(snap);
    usedIds.add(snap.id);

    // Try to create a template variant
    const variant = createNumericTemplateVariant(original);
    if (variant) {
      questions.push(variant);
      variantInfo.push({
        originalId: snap.id,
        variantType: "templated",
      });
      return;
    }

    // Try to find a similar-topic replacement
    const replacement = findSimilarTopicReplacement(original, questionBank, usedIds);
    if (replacement) {
      questions.push(replacement);
      usedIds.add(replacement.id);
      variantInfo.push({
        originalId: snap.id,
        variantType: "replaced",
        sourceId: replacement.id,
      });
      return;
    }

    // Fallback: use original
    questions.push(original);
    variantInfo.push({
      originalId: snap.id,
      variantType: "templated", // Even though it's not actually templated
    });
  });

  return { questions, variantInfo };
}

/**
 * Convert a snapshot back to a Question object
 */
function snapshotToQuestion(snap: QuestionSnapshot): Question {
  return {
    id: snap.id,
    text: snap.text,
    type: snap.type,
    options: snap.options,
    correctAnswer: snap.correctAnswer,
    correctAnswers: snap.correctAnswers,
    correctNat: snap.correctNat,
    marks: snap.marks,
    negativeMarks: snap.negativeMarks,
    difficulty: snap.difficulty,
    explanation: snap.explanation,
    subjectId: snap.subjectId,
    topicId: snap.topicId,
    eloRating: snap.eloRating || 1500,
  } as Question;
}

/**
 * Get all questions that can be used for retakes
 */
export function getRetakeQuestionBank(subjectId?: string, topicId?: string): Question[] {
  if (topicId) {
    return getQuestionsByTopic(topicId);
  }
  if (subjectId) {
    return getQuestionsBySubject(subjectId);
  }
  return [];
}
