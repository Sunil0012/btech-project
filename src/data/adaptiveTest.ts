/**
 * Adaptive test data module
 * Exports functions for retrieving adaptive test questions.
 * The curated bank includes a few stretch questions so adaptive mode can
 * continue escalating once a learner gets hot.
 */

import { questions } from "./questions";
import type { Question } from "./questions";

const adaptiveHardQuestions: Question[] = [
  {
    id: "adaptive-hard-ml-1",
    subjectId: "machine-learning",
    topicId: "ml-supervised",
    question:
      "A soft-margin SVM is trained on a nearly separable dataset. If C is increased sharply, which outcome is most likely?",
    options: [
      "The margin widens and training violations become cheaper",
      "The classifier tolerates more slack variables and simpler boundaries",
      "The optimization penalizes misclassification more and usually narrows the margin",
      "The kernel matrix becomes identity regardless of the original kernel",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "A larger C penalizes slack more heavily, so the model prefers fewer training violations even if the margin becomes tighter.",
    difficulty: "hard",
    eloRating: 1560,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "adaptive-hard-la-1",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question:
      "If A is a real symmetric matrix with eigenvalues 2, 2, and -1, what is the determinant of exp(A)?",
    options: ["e^3", "e^4", "e^5", "e^-1"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "The eigenvalues of exp(A) are exp(2), exp(2), and exp(-1). Their product is exp(2 + 2 - 1) = exp(3).",
    difficulty: "hard",
    eloRating: 1540,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "adaptive-hard-ai-1",
    subjectId: "artificial-intelligence",
    topicId: "ai-search",
    question:
      "A heuristic h is admissible but inconsistent. Which statement remains guaranteed for A* graph search without reopening closed nodes?",
    options: [
      "Optimality is always preserved",
      "Completeness on finite graphs with positive step costs",
      "Every expanded node has nondecreasing f-value",
      "The first solution found must match uniform-cost search depth",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Inconsistency breaks the usual optimality guarantee for graph search without reopening, but completeness still holds on finite graphs with positive costs.",
    difficulty: "hard",
    eloRating: 1580,
    marks: 2,
    negativeMarks: 0.66,
  },
];

export const adaptiveQuestions: Question[] = [...questions, ...adaptiveHardQuestions];

export function getAdaptiveQuestionBank(subjectId: string | null): Question[] {
  if (!subjectId) {
    return [...adaptiveQuestions];
  }

  return adaptiveQuestions.filter((question) => question.subjectId === subjectId);
}
