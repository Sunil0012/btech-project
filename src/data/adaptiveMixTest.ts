/**
 * Adaptive Mix test data module
 * Exports functions for retrieving mixed adaptive test questions (all subjects)
 */

import { adaptiveQuestions } from "./adaptiveTest";
import type { Question } from "./questions";

const adaptiveMixOnlyQuestions: Question[] = [
  {
    id: "adaptive-mix-hard-1",
    subjectId: "probability-statistics",
    topicId: "ps-hypothesis",
    question:
      "For a level-alpha Neyman-Pearson test between two simple hypotheses, which property characterizes the likelihood-ratio test?",
    options: [
      "It minimizes Type II error among all unbiased tests only",
      "It maximizes power among all tests with size at most alpha",
      "It is valid only for asymptotic normal models",
      "It always coincides with a two-sided z-test",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The Neyman-Pearson lemma states that the likelihood-ratio test is the most powerful test for simple-vs-simple hypotheses at a fixed size.",
    difficulty: "hard",
    eloRating: 1590,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "adaptive-mix-hard-2",
    subjectId: "calculus-optimization",
    topicId: "co-optimization",
    question:
      "If a twice-differentiable function has a positive semidefinite Hessian everywhere on a convex domain, what follows?",
    options: [
      "Every stationary point is a saddle point",
      "The function is convex on that domain",
      "Gradient descent must converge in one step",
      "All local maxima are global maxima",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "A positive semidefinite Hessian everywhere is a standard sufficient condition for convexity on a convex domain.",
    difficulty: "hard",
    eloRating: 1550,
    marks: 2,
    negativeMarks: 0.66,
  },
  {
    id: "adaptive-mix-hard-3",
    subjectId: "dbms",
    topicId: "dbms-normalization",
    question:
      "Which decomposition property guarantees that joining the decomposed relations recreates exactly the original relation without spurious tuples?",
    options: [
      "Dependency preservation",
      "Lossless join",
      "Third normal form",
      "Minimal cover",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "A lossless-join decomposition ensures the original relation can be reconstructed exactly, without introducing spurious tuples.",
    difficulty: "hard",
    eloRating: 1530,
    marks: 2,
    negativeMarks: 0.66,
  },
];

export const adaptiveMixQuestions: Question[] = [
  ...adaptiveQuestions,
  ...adaptiveMixOnlyQuestions,
];

export function getAdaptiveMixQuestionBank(): Question[] {
  return [...adaptiveMixQuestions];
}
