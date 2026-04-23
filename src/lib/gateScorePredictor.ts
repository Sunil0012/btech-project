export interface GatePredictionSubjectPerformance {
  name: string;
  accuracy: number | null;
  score?: {
    correct: number;
    total: number;
  };
}

export interface GatePredictionHistoryItem {
  test_type: string;
  score: number;
  max_score: number;
  correct_answers?: number;
  total_questions?: number;
  completed_at?: string | null;
}

export interface GatePredictionResult {
  minScore: number;
  maxScore: number;
  expectedScore: number;
  confidence: number;
  recommendation: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function getAccuracyPercent({
  score,
  maxScore,
  correctAnswers,
  totalQuestions,
}: {
  score: number;
  maxScore: number;
  correctAnswers?: number;
  totalQuestions?: number;
}) {
  if (typeof correctAnswers === "number" && typeof totalQuestions === "number" && totalQuestions > 0) {
    return (correctAnswers / totalQuestions) * 100;
  }

  if (maxScore <= 0) return null;
  return (score / maxScore) * 100;
}

function sortHistory(items: GatePredictionHistoryItem[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.completed_at ? new Date(left.completed_at).getTime() : 0;
    const rightTime = right.completed_at ? new Date(right.completed_at).getTime() : 0;
    return leftTime - rightTime;
  });
}

function summarizeTests(testHistory: GatePredictionHistoryItem[] = []) {
  const grouped = {
    fullMock: [] as number[],
    topicWise: [] as number[],
    adaptive: [] as number[],
  };

  testHistory.forEach((test) => {
    const accuracy = getAccuracyPercent({
      score: test.score,
      maxScore: test.max_score,
      correctAnswers: test.correct_answers,
      totalQuestions: test.total_questions,
    });
    if (accuracy === null) return;

    if (test.test_type === "full-mock") grouped.fullMock.push(accuracy);
    if (test.test_type === "topic-wise") grouped.topicWise.push(accuracy);
    if (test.test_type === "adaptive") grouped.adaptive.push(accuracy);
  });

  const chronological = sortHistory(testHistory)
    .map((test) =>
      getAccuracyPercent({
        score: test.score,
        maxScore: test.max_score,
        correctAnswers: test.correct_answers,
        totalQuestions: test.total_questions,
      })
    )
    .filter((value): value is number => value !== null);
  const recent = chronological.slice(-6);
  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));
  const trendDelta =
    firstHalf.length > 0 && secondHalf.length > 0
      ? (average(secondHalf) - average(firstHalf)) / 100
      : 0;

  return {
    fullMockSignal: average(grouped.fullMock) / 100,
    topicWiseSignal: average(grouped.topicWise) / 100,
    adaptiveSignal: average(grouped.adaptive) / 100,
    testTypeCount: [grouped.fullMock, grouped.topicWise, grouped.adaptive].filter((bucket) => bucket.length > 0).length,
    trendSignal: clamp(0.5 + trendDelta * 2.2, 0, 1),
  };
}

function getRecommendation(signals: Record<string, number>) {
  const weakest = Object.entries(signals).sort((left, right) => left[1] - right[1])[0]?.[0];

  switch (weakest) {
    case "correctness":
      return "Raise the percentage of correct answers first. Review mistakes immediately and convert near-misses into full marks.";
    case "fullMock":
      return "Take more full-length mocks under exam conditions. That signal has the biggest impact on the present prediction band.";
    case "topicWise":
      return "Topic-wise mastery is still uneven. Tighten fundamentals in weaker topics before chasing more volume.";
    case "adaptive":
      return "Adaptive performance is lagging. Spend more time on high-ELO questions and mixed concept transitions.";
    case "consistency":
      return "Your subject profile is uneven. Bring weaker subjects closer to your strong ones to stabilize the prediction.";
    case "trend":
      return "Recent momentum is flat. Use short review loops and a fixed mock-analysis routine to create an upward trend.";
    default:
      return "Keep accuracy high and continue balancing full mocks, topic-wise practice, and adaptive sets.";
  }
}

export function calculateGateScorePrediction({
  studentElo,
  overallAccuracy,
  subjectPerformance,
  testHistory = [],
  answeredQuestionsCount = 0,
}: {
  studentElo: number;
  overallAccuracy: number;
  subjectPerformance: GatePredictionSubjectPerformance[];
  testHistory?: GatePredictionHistoryItem[];
  answeredQuestionsCount?: number;
}): GatePredictionResult {
  const subjectAccuracies = subjectPerformance
    .filter((subject) => subject.accuracy !== null)
    .map((subject) => (subject.accuracy || 0) / 100);
  const totalCorrect = subjectPerformance.reduce(
    (sum, subject) => sum + (subject.score?.correct || 0),
    0
  );
  const totalAttempted = subjectPerformance.reduce(
    (sum, subject) => sum + (subject.score?.total || 0),
    0
  );
  const correctnessSignal =
    totalAttempted > 0 ? totalCorrect / totalAttempted : clamp(overallAccuracy / 100, 0, 1);
  const subjectMasterySignal =
    subjectAccuracies.length > 0 ? average(subjectAccuracies) : correctnessSignal;
  const consistencySignal =
    subjectAccuracies.length > 1
      ? clamp(1 - standardDeviation(subjectAccuracies) / 0.35, 0, 1)
      : clamp(0.55 + subjectMasterySignal * 0.35, 0, 1);

  const {
    fullMockSignal,
    topicWiseSignal,
    adaptiveSignal,
    testTypeCount,
    trendSignal,
  } = summarizeTests(testHistory);

  const robustnessCandidates = [
    fullMockSignal || correctnessSignal,
    topicWiseSignal || subjectMasterySignal,
    adaptiveSignal || correctnessSignal,
  ];
  const robustnessSignal = average(robustnessCandidates);
  const eloSignal = clamp((studentElo - 1200) / 1400, 0, 1);

  // Lightweight feature-based regression model.
  const regressionLogit =
    eloSignal * 0.85 +
    correctnessSignal * 1.55 +
    robustnessSignal * 0.8 +
    consistencySignal * 0.35 +
    trendSignal * 0.25 +
    subjectMasterySignal * 0.45 -
    2.1;

  const regressionProbability = sigmoid(regressionLogit);
  const expectedScore = clamp(Math.round(14 + regressionProbability * 82), 0, 100);

  const confidence = clamp(
    Math.round(
      48 +
      testTypeCount * 6 +
      Math.min(18, answeredQuestionsCount * 0.35) +
      consistencySignal * 12
    ),
    50,
    95
  );
  const margin = clamp(
    Math.round(18 - (confidence - 50) * 0.18 - testTypeCount * 1.2),
    6,
    16
  );

  const recommendation = getRecommendation({
    correctness: correctnessSignal,
    fullMock: fullMockSignal || 0,
    topicWise: topicWiseSignal || 0,
    adaptive: adaptiveSignal || 0,
    consistency: consistencySignal,
    trend: trendSignal,
  });

  return {
    minScore: clamp(expectedScore - margin, 0, 100),
    maxScore: clamp(expectedScore + margin, 0, 100),
    expectedScore,
    confidence,
    recommendation,
  };
}
