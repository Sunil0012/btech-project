import { subjects } from "@/data/subjects";
import { questions, type Question } from "@/data/questions";

type MomentumLabel = "hot" | "steady" | "cold";
export type QuestionGraphEdgeKind = "same-topic" | "subject-flow" | "subject-bridge";

export interface AdaptiveSessionAttempt {
  questionId: string;
  topicId: string;
  difficulty: Question["difficulty"];
  eloRating: number;
  correct: boolean;
  timeSpentSeconds?: number;
  rapidGuessWarning?: boolean;
  remediationForQuestionId?: string | null;
}

export interface AdaptivePolicyState {
  focusTopicId: string;
  momentum: MomentumLabel;
}

export interface QuestionGraphNode {
  id: string;
  questionId: string;
  subjectId: string;
  topicId: string;
  difficulty: Question["difficulty"];
  eloRating: number;
  type: Question["type"];
}

export interface QuestionGraphEdge {
  sourceId: string;
  targetId: string;
  weight: number;
  kind: QuestionGraphEdgeKind;
  sameTopic: boolean;
}

export interface QuestionRecommendationGraph {
  nodes: QuestionGraphNode[];
  edges: QuestionGraphEdge[];
  edgesBySource: Map<string, QuestionGraphEdge[]>;
}

export interface NextBestQuestionRequest {
  subjectId?: string | null;
  studentElo: number;
  topicId?: string | null;
  currentQuestionId?: string | null;
  constrainToTopic?: boolean;
  answeredQuestionIds?: Set<string>;
  sessionQuestionIds?: Set<string>;
  sessionAttempts?: AdaptiveSessionAttempt[];
  questionBank?: Question[];
  hopLimit?: number;
}

export interface GraphRecommendationMetadata {
  mode: "seed" | "neighbor" | "fallback" | "remediation" | "retry";
  fromQuestionId: string | null;
  edgeWeight: number | null;
  edgeKind: QuestionGraphEdgeKind | null;
  neighborCount: number;
  hopDistance: number | null;
  remediationForQuestionId?: string | null;
}

export interface NextBestQuestionRecommendation {
  question: Question | null;
  reasons: string[];
  targetDifficulty: Question["difficulty"];
  targetElo: number;
  momentum: MomentumLabel;
  graph: GraphRecommendationMetadata | null;
}

interface GraphNeighborCandidate {
  question: Question;
  edge: QuestionGraphEdge | null;
  hopDistance: number;
}

interface RemediationProgress {
  attempts: AdaptiveSessionAttempt[];
  stepsCompleted: number;
  accuracy: number;
  rapidGuessHits: number;
}

const DIFFICULTY_ORDER: Record<Question["difficulty"], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};
const GRAPH_NEIGHBOR_WEIGHT = 34;
const GRAPH_FALLBACK_WEIGHT = 14;

const topicNameById = new Map(
  subjects.flatMap((subject) => subject.topics.map((topic) => [topic.id, topic.name] as const))
);

let defaultQuestionGraphCache: QuestionRecommendationGraph | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number = 4) {
  return Number(value.toFixed(decimals));
}

function getMomentum(sessionAttempts: AdaptiveSessionAttempt[]): MomentumLabel {
  const lastThree = sessionAttempts.slice(-3);
  const lastTwo = sessionAttempts.slice(-2);
  const rewardSignal = getRecentRewardSignal(sessionAttempts);

  if (
    lastThree.length === 3 &&
    lastThree.every((attempt) => attempt.correct) &&
    rewardSignal >= 1.4
  ) {
    return "hot";
  }

  if (
    (lastTwo.length === 2 && lastTwo.every((attempt) => !attempt.correct)) ||
    rewardSignal <= -1.35
  ) {
    return "cold";
  }

  return "steady";
}

function getRecentRewardSignal(sessionAttempts: AdaptiveSessionAttempt[]) {
  const recentAttempts = sessionAttempts.slice(-4);
  if (recentAttempts.length === 0) return 0;

  return round(
    recentAttempts.reduce((sum, attempt) => {
      let reward = attempt.correct ? 1.05 : -1;

      if (attempt.correct && attempt.difficulty === "hard") reward += 0.28;
      if (!attempt.correct && attempt.difficulty === "easy") reward -= 0.2;
      if (attempt.remediationForQuestionId && attempt.correct) reward += 0.18;
      if (attempt.rapidGuessWarning) reward -= 0.42;

      return sum + reward;
    }, 0)
  );
}

function getTargetElo(studentElo: number, attempts: AdaptiveSessionAttempt[], momentum: MomentumLabel) {
  const lastAttempt = attempts[attempts.length - 1];
  let targetElo = studentElo;
  const rewardSignal = getRecentRewardSignal(attempts);

  if (momentum === "hot") targetElo += 75;
  if (momentum === "cold") targetElo -= 90;

  if (lastAttempt) {
    targetElo += lastAttempt.correct ? 35 : -60;
  }

  targetElo += rewardSignal * 24;

  return clamp(Math.round(targetElo), 1100, 1800);
}

function getTargetDifficulty(targetElo: number): Question["difficulty"] {
  if (targetElo < 1300) return "easy";
  if (targetElo < 1500) return "medium";
  return "hard";
}

function getTopicStats(sessionAttempts: AdaptiveSessionAttempt[]) {
  const stats = new Map<string, { correct: number; total: number }>();

  sessionAttempts.forEach((attempt) => {
    const current = stats.get(attempt.topicId) || { correct: 0, total: 0 };
    current.correct += attempt.correct ? 1 : 0;
    current.total += 1;
    stats.set(attempt.topicId, current);
  });

  return stats;
}

function getRecentTopicCount(sessionAttempts: AdaptiveSessionAttempt[], topicId: string) {
  return sessionAttempts
    .slice(-3)
    .filter((attempt) => attempt.topicId === topicId)
    .length;
}

function getTopicLabel(topicId: string) {
  return topicNameById.get(topicId) || topicId.replace(/-/g, " ");
}

function getFocusTopicId(sessionAttempts: AdaptiveSessionAttempt[]) {
  const topicStats = getTopicStats(sessionAttempts);
  let focusTopicId = sessionAttempts[sessionAttempts.length - 1]?.topicId || "general";
  let lowestAccuracy = Number.POSITIVE_INFINITY;

  topicStats.forEach((stats, topicId) => {
    const accuracy = stats.correct / stats.total;
    if (accuracy < lowestAccuracy) {
      lowestAccuracy = accuracy;
      focusTopicId = topicId;
    }
  });

  return focusTopicId;
}

function getAdaptivePolicyState(sessionAttempts: AdaptiveSessionAttempt[]): AdaptivePolicyState {
  const momentum = getMomentum(sessionAttempts);
  const focusTopicId = getFocusTopicId(sessionAttempts);

  return {
    focusTopicId,
    momentum,
  };
}

function chooseAnchorQuestion(questionList: Question[]) {
  if (questionList.length === 0) return null;

  const averageElo =
    questionList.reduce((sum, question) => sum + question.eloRating, 0) / questionList.length;

  return [...questionList].sort((left, right) => {
    const leftPenalty = left.difficulty === "medium" ? 0 : left.difficulty === "easy" ? 20 : 30;
    const rightPenalty =
      right.difficulty === "medium" ? 0 : right.difficulty === "easy" ? 20 : 30;
    const leftScore = Math.abs(left.eloRating - averageElo) + leftPenalty;
    const rightScore = Math.abs(right.eloRating - averageElo) + rightPenalty;

    if (leftScore !== rightScore) return leftScore - rightScore;
    return left.id.localeCompare(right.id);
  })[0];
}

function getTransitionWeight(fromQuestion: Question, toQuestion: Question) {
  if (fromQuestion.id === toQuestion.id) return 0;
  if (fromQuestion.subjectId !== toQuestion.subjectId) return 0;

  const sameTopic = fromQuestion.topicId === toQuestion.topicId;
  const difficultyGap =
    DIFFICULTY_ORDER[toQuestion.difficulty] - DIFFICULTY_ORDER[fromQuestion.difficulty];
  const eloDelta = toQuestion.eloRating - fromQuestion.eloRating;
  const eloCloseness = 1 - clamp(Math.abs(eloDelta) / 320, 0, 1);
  const progressionFit = 1 - clamp(Math.abs(eloDelta - 35) / 320, 0, 1);
  const difficultyFit =
    difficultyGap === 0 ? 0.92 : difficultyGap === 1 ? 1 : difficultyGap === -1 ? 0.72 : 0.35;
  const typeFit = fromQuestion.type === toQuestion.type ? 1 : 0.68;
  const markFit = fromQuestion.marks === toQuestion.marks ? 1 : 0.8;

  return round(
    clamp(
      (sameTopic ? 0.46 : 0.16) +
        eloCloseness * 0.2 +
        progressionFit * 0.12 +
        difficultyFit * 0.1 +
        typeFit * 0.07 +
        markFit * 0.05,
      0.05,
      0.99
    )
  );
}

function createGraphEdge(
  sourceId: string,
  targetId: string,
  weight: number,
  kind: QuestionGraphEdgeKind,
  sameTopic: boolean
): QuestionGraphEdge {
  return {
    sourceId,
    targetId,
    weight: round(weight),
    kind,
    sameTopic,
  };
}

function upsertGraphEdge(
  edgeBuckets: Map<string, Map<string, QuestionGraphEdge>>,
  edge: QuestionGraphEdge
) {
  const sourceBucket = edgeBuckets.get(edge.sourceId) || new Map<string, QuestionGraphEdge>();
  const existing = sourceBucket.get(edge.targetId);

  if (
    !existing ||
    edge.weight > existing.weight ||
    (edge.weight === existing.weight && edge.kind === "same-topic" && existing.kind !== "same-topic")
  ) {
    sourceBucket.set(edge.targetId, edge);
  }

  edgeBuckets.set(edge.sourceId, sourceBucket);
}

function subjectSortIndex(subjectId: string) {
  const index = subjects.findIndex((subject) => subject.id === subjectId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function buildQuestionRecommendationGraph(questionBank: Question[] = questions): QuestionRecommendationGraph {
  const edgeBuckets = new Map<string, Map<string, QuestionGraphEdge>>();
  const questionById = new Map(questionBank.map((question) => [question.id, question]));
  const subjectMap = new Map<string, Question[]>();

  questionBank.forEach((question) => {
    const current = subjectMap.get(question.subjectId) || [];
    current.push(question);
    subjectMap.set(question.subjectId, current);
  });

  const sortedSubjectIds = [...subjectMap.keys()].sort((left, right) => {
    const leftIndex = subjectSortIndex(left);
    const rightIndex = subjectSortIndex(right);
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.localeCompare(right);
  });

  const subjectAnchors: Array<{ subjectId: string; questionId: string }> = [];

  sortedSubjectIds.forEach((subjectId) => {
    const subjectQuestions = subjectMap.get(subjectId) || [];
    const topicMap = new Map<string, Question[]>();

    subjectQuestions.forEach((question) => {
      const current = topicMap.get(question.topicId) || [];
      current.push(question);
      topicMap.set(question.topicId, current);
    });

    const topicAnchors = [...topicMap.entries()]
      .map(([topicId, topicQuestions]) => ({
        topicId,
        question: chooseAnchorQuestion(topicQuestions),
      }))
      .filter((entry): entry is { topicId: string; question: Question } => Boolean(entry.question))
      .sort((left, right) => left.topicId.localeCompare(right.topicId));

    const subjectAnchor = chooseAnchorQuestion(subjectQuestions);
    if (subjectAnchor) {
      subjectAnchors.push({ subjectId, questionId: subjectAnchor.id });
    }

    topicAnchors.forEach(({ question: anchorQuestion }) => {
      if (!subjectAnchor || subjectAnchor.id === anchorQuestion.id) return;

      const bridgeWeight = round((getTransitionWeight(subjectAnchor, anchorQuestion) + 0.22) / 2);
      upsertGraphEdge(
        edgeBuckets,
        createGraphEdge(subjectAnchor.id, anchorQuestion.id, bridgeWeight, "subject-flow", false)
      );
      upsertGraphEdge(
        edgeBuckets,
        createGraphEdge(anchorQuestion.id, subjectAnchor.id, bridgeWeight, "subject-flow", false)
      );
    });

    for (let index = 1; index < topicAnchors.length; index += 1) {
      const previousAnchor = topicAnchors[index - 1]?.question;
      const nextAnchor = topicAnchors[index]?.question;
      if (!previousAnchor || !nextAnchor) continue;

      const bridgeWeight = round((getTransitionWeight(previousAnchor, nextAnchor) + 0.18) / 2);
      upsertGraphEdge(
        edgeBuckets,
        createGraphEdge(previousAnchor.id, nextAnchor.id, bridgeWeight, "subject-flow", false)
      );
      upsertGraphEdge(
        edgeBuckets,
        createGraphEdge(nextAnchor.id, previousAnchor.id, bridgeWeight, "subject-flow", false)
      );
    }

    subjectQuestions.forEach((question) => {
      const sameTopicCandidates = subjectQuestions
        .filter((candidate) => candidate.id !== question.id && candidate.topicId === question.topicId)
        .map((candidate) => ({
          candidate,
          weight: getTransitionWeight(question, candidate),
        }))
        .sort((left, right) => right.weight - left.weight)
        .slice(0, 4);

      const crossTopicCandidates = subjectQuestions
        .filter((candidate) => candidate.id !== question.id && candidate.topicId !== question.topicId)
        .map((candidate) => ({
          candidate,
          weight: getTransitionWeight(question, candidate),
        }))
        .sort((left, right) => right.weight - left.weight)
        .slice(0, 2);

      sameTopicCandidates.forEach(({ candidate, weight }) => {
        upsertGraphEdge(
          edgeBuckets,
          createGraphEdge(question.id, candidate.id, weight, "same-topic", true)
        );
      });

      crossTopicCandidates.forEach(({ candidate, weight }) => {
        upsertGraphEdge(
          edgeBuckets,
          createGraphEdge(question.id, candidate.id, weight, "subject-flow", false)
        );
      });

      const topicAnchor = topicAnchors.find((entry) => entry.topicId === question.topicId)?.question;
      if (topicAnchor && topicAnchor.id !== question.id) {
        upsertGraphEdge(edgeBuckets, createGraphEdge(question.id, topicAnchor.id, 0.5, "same-topic", true));
      }

      if (subjectAnchor && subjectAnchor.id !== question.id) {
        upsertGraphEdge(
          edgeBuckets,
          createGraphEdge(question.id, subjectAnchor.id, 0.34, "subject-flow", false)
        );
      }
    });
  });

  for (let index = 1; index < subjectAnchors.length; index += 1) {
    const previous = questionById.get(subjectAnchors[index - 1].questionId);
    const next = questionById.get(subjectAnchors[index].questionId);
    if (!previous || !next) continue;

    upsertGraphEdge(
      edgeBuckets,
      createGraphEdge(previous.id, next.id, 0.24, "subject-bridge", false)
    );
    upsertGraphEdge(
      edgeBuckets,
      createGraphEdge(next.id, previous.id, 0.24, "subject-bridge", false)
    );
  }

  const edgesBySource = new Map<string, QuestionGraphEdge[]>();
  const edges = [...edgeBuckets.entries()].flatMap(([sourceId, bucket]) => {
    const sortedEdges = [...bucket.values()].sort((left, right) => right.weight - left.weight);
    edgesBySource.set(sourceId, sortedEdges);
    return sortedEdges;
  });

  return {
    nodes: questionBank.map((question) => ({
      id: question.id,
      questionId: question.id,
      subjectId: question.subjectId,
      topicId: question.topicId,
      difficulty: question.difficulty,
      eloRating: question.eloRating,
      type: question.type,
    })),
    edges,
    edgesBySource,
  };
}

function getDefaultQuestionGraph() {
  if (!defaultQuestionGraphCache) {
    defaultQuestionGraphCache = buildQuestionRecommendationGraph(questions);
  }

  return defaultQuestionGraphCache;
}

function getQuestionGraph(questionBank?: Question[]) {
  return questionBank && questionBank !== questions
    ? buildQuestionRecommendationGraph(questionBank)
    : getDefaultQuestionGraph();
}

function getQuestionGraphNeighborsWithinHops(
  sourceQuestionId: string,
  availableById: Map<string, Question>,
  maxHops: number,
  questionBank?: Question[]
) {
  const graph = getQuestionGraph(questionBank);
  const visited = new Set<string>([sourceQuestionId]);
  const queue: Array<{ questionId: string; hopDistance: number }> = [{ questionId: sourceQuestionId, hopDistance: 0 }];
  const bestByQuestionId = new Map<string, GraphNeighborCandidate>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current.hopDistance >= maxHops) continue;

    const edges = graph.edgesBySource.get(current.questionId) || [];
    edges.forEach((edge) => {
      const nextHopDistance = current.hopDistance + 1;
      const candidateQuestion = availableById.get(edge.targetId);

      if (candidateQuestion) {
        const existing = bestByQuestionId.get(edge.targetId);
        if (
          !existing ||
          nextHopDistance < existing.hopDistance ||
          (nextHopDistance === existing.hopDistance && edge.weight > (existing.edge?.weight ?? 0))
        ) {
          bestByQuestionId.set(edge.targetId, {
            question: candidateQuestion,
            edge,
            hopDistance: nextHopDistance,
          });
        }
      }

      if (!visited.has(edge.targetId) && nextHopDistance < maxHops) {
        visited.add(edge.targetId);
        queue.push({ questionId: edge.targetId, hopDistance: nextHopDistance });
      }
    });
  }

  return [...bestByQuestionId.values()].sort((left, right) => {
    if (left.hopDistance !== right.hopDistance) return left.hopDistance - right.hopDistance;
    return (right.edge?.weight ?? 0) - (left.edge?.weight ?? 0);
  });
}

function getRemediationTarget(sessionAttempts: AdaptiveSessionAttempt[]) {
  let unresolvedQuestionId: string | null = null;

  for (const attempt of sessionAttempts) {
    if (attempt.correct) {
      if (attempt.questionId === unresolvedQuestionId) {
        unresolvedQuestionId = null;
      }
      continue;
    }

    unresolvedQuestionId = attempt.questionId;
  }

  if (!unresolvedQuestionId) return null;

  return sessionAttempts.findLast((attempt) => attempt.questionId === unresolvedQuestionId) || null;
}

function getRemediationAccuracy(sessionAttempts: AdaptiveSessionAttempt[], targetQuestionId: string) {
  const remediationAttempts = sessionAttempts.filter(
    (attempt) => attempt.remediationForQuestionId === targetQuestionId
  );

  if (remediationAttempts.length === 0) return 0;

  const correctCount = remediationAttempts.filter((attempt) => attempt.correct).length;
  return correctCount / remediationAttempts.length;
}

function getRemediationProgress(
  sessionAttempts: AdaptiveSessionAttempt[],
  targetQuestionId: string
): RemediationProgress {
  const attempts = sessionAttempts.filter(
    (attempt) => attempt.remediationForQuestionId === targetQuestionId
  );

  return {
    attempts,
    stepsCompleted: attempts.length,
    accuracy: attempts.length > 0 ? attempts.filter((attempt) => attempt.correct).length / attempts.length : 0,
    rapidGuessHits: attempts.filter((attempt) => attempt.rapidGuessWarning).length,
  };
}

function getPreferredNeighborHop(
  momentum: MomentumLabel,
  rewardSignal: number,
  lastAttemptCorrect: boolean | undefined,
  hopLimit: number
) {
  if (!lastAttemptCorrect) return 1;
  if (momentum === "hot" && rewardSignal >= 2.25) return Math.min(3, hopLimit);
  if (momentum === "hot" || rewardSignal >= 0.9) return Math.min(2, hopLimit);
  return 1;
}

export function getQuestionGraphEdge(
  sourceQuestionId: string,
  targetQuestionId: string,
  questionBank?: Question[]
) {
  const graph = getQuestionGraph(questionBank);
  return (
    graph.edgesBySource.get(sourceQuestionId)?.find((edge) => edge.targetId === targetQuestionId) || null
  );
}

function scoreCandidate(
  candidate: Question,
  targetElo: number,
  targetDifficulty: Question["difficulty"],
  sessionAttempts: AdaptiveSessionAttempt[],
  topicStats: Map<string, { correct: number; total: number }>,
  remediationTargetQuestionId?: string | null,
  rewardSignal: number = 0
) {
  const lastAttempt = sessionAttempts[sessionAttempts.length - 1];
  const eloDistance = Math.abs(candidate.eloRating - targetElo);
  let score = 120 - eloDistance / 12;

  const difficultyGap = Math.abs(
    DIFFICULTY_ORDER[candidate.difficulty] - DIFFICULTY_ORDER[targetDifficulty]
  );
  score += difficultyGap === 0 ? 14 : difficultyGap === 1 ? 4 : -10;

  const candidateTopicStats = topicStats.get(candidate.topicId);
  if (candidateTopicStats) {
    const accuracy = candidateTopicStats.correct / candidateTopicStats.total;
    score += (1 - accuracy) * 26;
  } else {
    score += 5;
  }

  if (!lastAttempt) {
    score += candidate.difficulty === "medium" ? 3 : 0;
    return score;
  }

  const recentTopicCount = getRecentTopicCount(sessionAttempts, candidate.topicId);

  if (candidate.topicId === lastAttempt.topicId) {
    score += lastAttempt.correct ? 14 : 24;

    if (lastAttempt.correct && candidate.eloRating > lastAttempt.eloRating) {
      score += 16;
    }

    if (!lastAttempt.correct && candidate.eloRating <= lastAttempt.eloRating) {
      score += 18;
    }
  } else {
    score += recentTopicCount === 0 ? 8 : 0;
  }

  if (recentTopicCount >= 2 && lastAttempt.correct && candidate.topicId === lastAttempt.topicId) {
    score -= 12;
  }

  if (candidate.type !== "mcq" && targetDifficulty !== "easy") {
    score += 2;
  }

  if (remediationTargetQuestionId) {
    const remediationAttempts = sessionAttempts.filter(
      (attempt) => attempt.remediationForQuestionId === remediationTargetQuestionId
    );
    const rapidGuessHits = remediationAttempts.filter((attempt) => attempt.rapidGuessWarning).length;
    if (rapidGuessHits > 0 && candidate.type === "mcq") {
      score -= 3;
    }
  }

  if (rewardSignal >= 1.4) {
    score += candidate.eloRating >= targetElo ? 7 : 2;
    if (candidate.difficulty === "hard") score += 3;
  } else if (rewardSignal <= -1) {
    score += candidate.difficulty === "easy" ? 7 : candidate.difficulty === "medium" ? 2 : -8;
    if (candidate.eloRating > targetElo) score -= 6;
  }

  return score;
}

function buildReasons(
  candidate: Question,
  targetElo: number,
  targetDifficulty: Question["difficulty"],
  momentum: MomentumLabel,
  sessionAttempts: AdaptiveSessionAttempt[],
  topicStats: Map<string, { correct: number; total: number }>,
  policyState: AdaptivePolicyState,
  graph: GraphRecommendationMetadata | null,
  remediationTargetQuestionId?: string | null,
  rewardSignal: number = 0
) {
  const reasons = [
    `Targets your current level around ELO ${targetElo} with a ${targetDifficulty} question.`,
  ];

  const lastAttempt = sessionAttempts[sessionAttempts.length - 1];
  const topicLabel = getTopicLabel(candidate.topicId);
  const topicPerformance = topicStats.get(candidate.topicId);
  const focusTopicLabel = getTopicLabel(policyState.focusTopicId);

  if (graph?.mode === "retry" && remediationTargetQuestionId === candidate.id) {
    reasons.push("This question is returning after enough related follow-up work to retry it with better context.");
  } else if (!lastAttempt) {
    reasons.push(`Starts with a balanced entry point in ${topicLabel}.`);
  } else if (candidate.topicId === lastAttempt.topicId && lastAttempt.correct) {
    reasons.push("Builds on your last correct answer by pushing the same topic one step further.");
  } else if (candidate.topicId === lastAttempt.topicId && !lastAttempt.correct) {
    reasons.push(`Reinforces ${topicLabel} immediately after a miss so the concept settles before moving on.`);
  } else {
    reasons.push(`Rotates to ${topicLabel} to keep the test challenging without repeating the same pattern.`);
  }

  if (topicPerformance) {
    const accuracy = topicPerformance.correct / topicPerformance.total;
    if (accuracy < 0.6) {
      reasons.push(`${topicLabel} is still a weak spot in this session, so it gets extra priority.`);
    }
  }

  if (policyState.focusTopicId !== "general") {
    reasons.push(`The current session focus is ${focusTopicLabel} based on your recent attempts.`);
  }

  if (graph?.mode === "remediation" && graph.remediationForQuestionId) {
    reasons.push("This is part of a short remediation path connected to the question you just missed.");
  } else if (graph?.mode === "retry" && graph.remediationForQuestionId) {
    reasons.push("The engine is bringing back the original missed question after enough progress on related steps.");
  } else if (graph?.mode === "neighbor" && graph.fromQuestionId) {
    reasons.push("The next question stays on a neighboring node in the recommendation graph.");
  } else if (graph?.mode === "fallback") {
    reasons.push("The engine widened the graph search because the closest neighboring nodes were already used.");
  } else if (graph?.mode === "seed") {
    reasons.push(`This node acts as the graph entry point for ${topicLabel}.`);
  }

  if (graph?.hopDistance && graph.hopDistance > 1) {
    reasons.push(`It sits on circle ${graph.hopDistance} of the graph path, so the engine is still following the same learning trail.`);
  }

  if (momentum === "hot") {
    reasons.push("Your recent streak is strong, so the engine is raising the challenge slightly.");
  } else if (momentum === "cold") {
    reasons.push("Recent misses lowered the difficulty target a bit to help you recover faster.");
  }

  if (rewardSignal >= 1.4) {
    reasons.push("Recent reward signals are positive, so the engine is comfortable stretching you a bit further.");
  } else if (rewardSignal <= -1) {
    reasons.push("Recent penalties pulled the recommendation back toward recovery and steadier accuracy.");
  }

  return reasons;
}

export function recommendNextBestAdaptiveQuestion(
  request: NextBestQuestionRequest
): NextBestQuestionRecommendation {
  const questionBank = request.questionBank || questions;
  const sessionAttempts = request.sessionAttempts || [];
  const answeredQuestionIds = request.answeredQuestionIds || new Set<string>();
  const sessionQuestionIds = request.sessionQuestionIds || new Set<string>();
  const policyState = getAdaptivePolicyState(sessionAttempts);
  const momentum = policyState.momentum;
  const rewardSignal = getRecentRewardSignal(sessionAttempts);
  const targetElo = getTargetElo(request.studentElo, sessionAttempts, momentum);
  const targetDifficulty = getTargetDifficulty(targetElo);
  const topicStats = getTopicStats(sessionAttempts);
  const currentQuestionId =
    request.currentQuestionId || sessionAttempts[sessionAttempts.length - 1]?.questionId || null;
  const hopLimit = clamp(request.hopLimit ?? 3, 1, 3);
  const remediationTarget = getRemediationTarget(sessionAttempts);
  const remediationTargetQuestion = remediationTarget
    ? questionBank.find((question) => question.id === remediationTarget.questionId) || null
    : null;
  const remediationProgress = remediationTarget
    ? getRemediationProgress(sessionAttempts, remediationTarget.questionId)
    : null;
  const retryEligible = Boolean(
    remediationTarget &&
      remediationProgress &&
      remediationProgress.stepsCompleted >= hopLimit &&
      remediationProgress.accuracy >= 0.34
  );

  const excludedIds = new Set([...answeredQuestionIds, ...sessionQuestionIds]);
  if (retryEligible && remediationTarget) {
    excludedIds.delete(remediationTarget.questionId);
  }

  const available = questionBank.filter(
    (question) =>
      (!request.subjectId || question.subjectId === request.subjectId) &&
      !excludedIds.has(question.id) &&
      (!request.constrainToTopic || !request.topicId || question.topicId === request.topicId)
  );
  const availableById = new Map(available.map((question) => [question.id, question]));

  let candidatePool = available;
  let graphMode: GraphRecommendationMetadata["mode"] = currentQuestionId ? "fallback" : "seed";
  let graphNeighborCount = 0;
  const graphEdgeByQuestionId = new Map<string, QuestionGraphEdge>();
  const hopDistanceByQuestionId = new Map<string, number>();

  if (
    retryEligible &&
    remediationTarget &&
    remediationTargetQuestion &&
    availableById.has(remediationTarget.questionId)
  ) {
    const retryQuestion = availableById.get(remediationTarget.questionId);
    if (retryQuestion) {
      graphMode = "retry";
      candidatePool = [retryQuestion];
      hopDistanceByQuestionId.set(retryQuestion.id, 0);
    }
  } else if (remediationTarget && remediationTargetQuestion) {
    const remediationNeighbors = getQuestionGraphNeighborsWithinHops(
      remediationTarget.questionId,
      availableById,
      hopLimit,
      questionBank
    )
      .filter((candidate) => candidate.question.id !== remediationTarget.questionId)
      .sort((left, right) => {
        const leftSameTopic = left.question.topicId === remediationTargetQuestion.topicId ? 1 : 0;
        const rightSameTopic = right.question.topicId === remediationTargetQuestion.topicId ? 1 : 0;
        if (rightSameTopic !== leftSameTopic) return rightSameTopic - leftSameTopic;
        if (left.hopDistance !== right.hopDistance) return left.hopDistance - right.hopDistance;
        return (right.edge?.weight ?? 0) - (left.edge?.weight ?? 0);
      });

    if (remediationNeighbors.length > 0) {
      graphMode = "remediation";
      graphNeighborCount = remediationNeighbors.length;
      const preferredCircle = remediationProgress
        ? clamp(remediationProgress.stepsCompleted + 1, 1, hopLimit)
        : 1;
      const circleScopedNeighbors = remediationNeighbors.filter(
        (candidate) => candidate.hopDistance === preferredCircle
      );
      const remediationPool = circleScopedNeighbors.length > 0
        ? circleScopedNeighbors
        : remediationNeighbors;

      candidatePool = remediationPool.map((candidate) => {
        if (candidate.edge) {
          graphEdgeByQuestionId.set(candidate.question.id, candidate.edge);
        }
        hopDistanceByQuestionId.set(candidate.question.id, candidate.hopDistance);
        return candidate.question;
      });
    }
  }

  if ((graphMode === "fallback" || graphMode === "seed") && currentQuestionId) {
    const graphNeighbors = getQuestionGraphNeighborsWithinHops(
      currentQuestionId,
      availableById,
      hopLimit,
      questionBank
    );
    graphNeighborCount = graphNeighbors.length;

    if (graphNeighbors.length > 0) {
      const preferredCircle = getPreferredNeighborHop(
        momentum,
        rewardSignal,
        sessionAttempts[sessionAttempts.length - 1]?.correct,
        hopLimit
      );
      const circleScopedNeighbors = graphNeighbors.filter(
        (candidate) => candidate.hopDistance === preferredCircle
      );
      const neighborPool = circleScopedNeighbors.length > 0
        ? circleScopedNeighbors
        : graphNeighbors;
      graphMode = "neighbor";
      candidatePool = neighborPool.map((candidate) => {
        if (candidate.edge) {
          graphEdgeByQuestionId.set(candidate.question.id, candidate.edge);
        }
        hopDistanceByQuestionId.set(candidate.question.id, candidate.hopDistance);
        return candidate.question;
      });
    }
  }

  if (available.length === 0 || candidatePool.length === 0) {
    return {
      question: null,
      reasons: [],
      targetDifficulty,
      targetElo,
      momentum,
      graph: null,
    };
  }

  const heuristicRanked = candidatePool
    .map((candidate) => ({
        candidate,
        heuristicScore: scoreCandidate(
          candidate,
          targetElo,
          targetDifficulty,
          sessionAttempts,
          topicStats,
          remediationTarget?.questionId || null,
          rewardSignal
        ),
      }))
    .sort((left, right) => {
      if (right.heuristicScore !== left.heuristicScore) {
        return right.heuristicScore - left.heuristicScore;
      }
      return left.candidate.id.localeCompare(right.candidate.id);
    });

  const heuristicLeader = heuristicRanked[0];
  const ranked = heuristicRanked
    .map(({ candidate, heuristicScore }) => {
      const graphEdge =
        graphEdgeByQuestionId.get(candidate.id) ||
        (currentQuestionId ? getQuestionGraphEdge(currentQuestionId, candidate.id, questionBank) : null);
      const graphBoost = graphEdge
        ? graphEdge.weight * (graphMode === "neighbor" ? GRAPH_NEIGHBOR_WEIGHT : GRAPH_FALLBACK_WEIGHT)
        : 0;
      const combinedScore = heuristicScore + graphBoost;

      return {
        candidate,
        heuristicScore,
        combinedScore,
        graphEdge,
        graphBoost,
        hopDistance: hopDistanceByQuestionId.get(candidate.id) ?? null,
      };
    })
    .sort((left, right) => {
      if (right.combinedScore !== left.combinedScore) return right.combinedScore - left.combinedScore;
      if (right.graphBoost !== left.graphBoost) return right.graphBoost - left.graphBoost;
      if (right.heuristicScore !== left.heuristicScore) return right.heuristicScore - left.heuristicScore;
      return Math.abs(left.candidate.eloRating - targetElo) - Math.abs(right.candidate.eloRating - targetElo);
    });

  const selected = ranked[0];

  const graph: GraphRecommendationMetadata = {
    mode: graphMode,
    fromQuestionId: currentQuestionId,
    edgeWeight: selected.graphEdge?.weight ?? null,
    edgeKind: selected.graphEdge?.kind ?? null,
    neighborCount: graphNeighborCount,
    hopDistance: selected.hopDistance,
    remediationForQuestionId: remediationTarget?.questionId || null,
  };

  return {
    question: selected.candidate,
    reasons: buildReasons(
      selected.candidate,
      targetElo,
      targetDifficulty,
      momentum,
      sessionAttempts,
      topicStats,
      policyState,
      graph,
      remediationTarget?.questionId || null,
      rewardSignal
    ),
    targetDifficulty,
    targetElo,
    momentum,
    graph,
  };
}
