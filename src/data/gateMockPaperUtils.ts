import type { Question } from "./questions";

type RawMockQuestion = {
  id: string;
  subjectId: string;
  topicId: string;
  question: string;
  options: readonly string[];
  correctAnswer: number | readonly number[];
  correctNat?: {
    min: number;
    max: number;
  };
  type: Question["type"];
  explanation: string;
  difficulty: Question["difficulty"];
  marks: number;
  negativeMarks: number;
};

const generalAptitudeTopicMap = {
  "verbal-reasoning": "ga-verbal-reasoning",
  "quantitative-aptitude": "ga-quantitative-aptitude",
  "logical-reasoning": "ga-logical-reasoning",
} as const;

function normalizeType(question: RawMockQuestion): Question["type"] {
  if (question.type === "nat" || question.correctNat) return "nat";
  if (Array.isArray(question.correctAnswer)) return "msq";
  return "mcq";
}

function getDerivedElo(
  difficulty: Question["difficulty"],
  marks: number,
  type: Question["type"]
): number {
  if (type === "nat") {
    if (difficulty === "easy") return marks === 1 ? 1225 : 1325;
    if (difficulty === "medium") return marks === 1 ? 1350 : 1475;
    return marks === 1 ? 1475 : 1600;
  }

  if (difficulty === "easy") return marks === 1 ? 1200 : 1300;
  if (difficulty === "medium") return marks === 1 ? 1350 : 1450;
  return marks === 1 ? 1500 : 1600;
}

function getNegativeMarks(type: Question["type"], marks: number): number {
  if (type !== "mcq") return 0;
  return marks === 1 ? 0.33 : 0.66;
}

function mapSubjectAndTopic(question: RawMockQuestion): Pick<Question, "subjectId" | "topicId"> {
  const haystack = `${question.topicId} ${question.question}`.toLowerCase();

  if (question.topicId in generalAptitudeTopicMap) {
    return {
      subjectId: "general-aptitude",
      topicId: generalAptitudeTopicMap[question.topicId as keyof typeof generalAptitudeTopicMap],
    };
  }

  switch (question.topicId) {
    case "probability":
    case "probability-theory":
    case "conditional-probability":
      return {
        subjectId: "probability-statistics",
        topicId: "ps-probability",
      };
    case "statistics":
      return {
        subjectId: "probability-statistics",
        topicId: /confidence|hypothesis|interval|p-value|significance|test statistic|chi-square|t-test|z-test/i.test(
          haystack
        )
          ? "ps-hypothesis"
          : "ps-distributions",
      };
    case "calculus":
      return {
        subjectId: "calculus-optimization",
        topicId: /integral|series|sum|converges|diverges|area/i.test(haystack)
          ? "co-integration"
          : /gradient|lagrang|convex|optimi/i.test(haystack)
            ? "co-optimization"
            : "co-differentiation",
      };
    case "linear-algebra":
      return {
        subjectId: "linear-algebra",
        topicId: /eigen|orthogonal|trace|diagonal|spectral|rank/i.test(haystack)
          ? "la-eigenvalues"
          : "la-matrices",
      };
    case "machine-learning":
    case "regularization":
      return {
        subjectId: "machine-learning",
        topicId: /precision|recall|auc|roc|bias|variance|bagging|boosting|f1|cross-validation/i.test(
          haystack
        )
          ? "ml-evaluation"
          : "ml-supervised",
      };
    case "probabilistic-models":
    case "probabilistic-graphical-models":
      return {
        subjectId: "machine-learning",
        topicId: "ml-unsupervised",
      };
    case "ai":
      return {
        subjectId: "artificial-intelligence",
        topicId: /logic|predicate|proposition|entail|resolution/i.test(haystack)
          ? "ai-logic"
          : "ai-search",
      };
    case "ai-search":
      return {
        subjectId: "artificial-intelligence",
        topicId: "ai-search",
      };
    case "algorithms":
    case "discrete-mathematics":
      return {
        subjectId: "programming-dsa",
        topicId: "dsa-complexity",
      };
    case "data-structures":
    case "graph-algorithms":
    case "graph-theory":
      return {
        subjectId: "programming-dsa",
        topicId: "dsa-trees",
      };
    case "dbms":
    case "normalization":
      return {
        subjectId: "dbms",
        topicId:
          question.topicId === "normalization" ||
          /normal form|candidate key|functional dependency|dependency preservation|lossless|bcnf|3nf|2nf|1nf|closure/i.test(
            haystack
          )
            ? "dbms-normalization"
            : "dbms-sql",
      };
    default:
      return {
        subjectId: "machine-learning",
        topicId: "ml-supervised",
      };
  }
}

function normalizeId(id: string, prefix: "mock2" | "mock3") {
  return id.replace(/^daMock\d+-q/, `${prefix}-q`);
}

export function normalizeMockPaperQuestions(
  rawQuestions: readonly RawMockQuestion[],
  prefix: "mock2" | "mock3"
): Question[] {
  return rawQuestions.map((question) => {
    const type = normalizeType(question);
    const { subjectId, topicId } = mapSubjectAndTopic(question);
    const correctAnswers = Array.isArray(question.correctAnswer)
      ? [...question.correctAnswer].sort((left, right) => left - right)
      : undefined;

    return {
      id: normalizeId(question.id, prefix),
      subjectId,
      topicId,
      question: question.question.trim(),
      options: [...question.options],
      correctAnswer: Array.isArray(question.correctAnswer)
        ? (question.correctAnswer[0] ?? 0)
        : question.correctAnswer,
      correctAnswers,
      correctNat: question.correctNat ? { ...question.correctNat } : undefined,
      type,
      explanation: question.explanation.trim(),
      difficulty: question.difficulty,
      eloRating: getDerivedElo(question.difficulty, question.marks, type),
      marks: question.marks,
      negativeMarks: getNegativeMarks(type, question.marks),
    };
  });
}
