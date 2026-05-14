import type { Question } from "@/data/questions";
import { buildQuestionRecommendationGraph } from "@/lib/nextBestQuestionEngine";

export interface DarsRatingState {
  rating: number;
  answeredCount: number;
  streak: number;
  recentRatingDeltas: number[];
}

export interface DarsResponseInput {
  question: Question;
  correct: boolean;
  timeSpentSeconds?: number | null;
  hintsUsed?: number;
  maxHints?: number;
  remediationForQuestionId?: string | null;
}

export interface DarsRatingOutcome {
  previousRating: number;
  nextRating: number;
  delta: number;
  expected: number;
  performanceQuality: number;
  dynamicK: number;
  streakMultiplier: number;
  timeEfficiency: number;
  effectiveQuestionRating: number;
  rapidGuessCapped: boolean;
  rapidGuessAdjustment: number;
}

const DARS_K_MAX = 60;
const DARS_K_MIN = 16;
const DARS_PROVISIONAL_ITEMS = 30;
const DARS_DECAY_RATE = 0.015;
const DARS_REFERENCE_VARIANCE = 100;
const DARS_CENTRALITY_BONUS = 150;
const DARS_STREAK_THRESHOLD = 3;
const DARS_STREAK_SATURATION = 7;
const DARS_STREAK_MAX_MULTIPLIER_DELTA = 0.35;
const DARS_TIME_WEIGHT = 0.5;
const DARS_HINT_WEIGHT = 0.3;
const DARS_STREAK_QUALITY_WEIGHT = 0.2;
const DARS_REFERENCE_TIME_SLACK_RATIO = 0.15;
const DARS_RAPID_GUESS_FRACTION = 0.25;
const DARS_RAPID_GUESS_GAIN_CAP = DARS_K_MIN * 0.1;
const DARS_REMEDIATION_K_FACTOR = 0.6;

const MULTI_STEP_PATTERN =
  /\b(select all that apply|which of the following statements|using the following|based on the following)\b/i;
const COMPUTATION_PATTERN =
  /\b(calculate|compute|determine|evaluate|solve|derive|trace|determinant|eigenvalue|probability|expected value|variance|standard deviation|time complexity|space complexity)\b/i;

let centralityByQuestionIdCache: Map<string, number> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function variance(values: number[]) {
  if (values.length < 2) return DARS_REFERENCE_VARIANCE;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
}

function getComplexityIndex(question: Question) {
  const combinedText = [question.question, ...question.options].join(" ");
  let complexityIndex = 0;

  if (question.difficulty === "medium" || question.type === "msq") {
    complexityIndex = Math.max(complexityIndex, 0.5);
  }

  if (
    question.difficulty === "hard" ||
    question.type === "nat" ||
    MULTI_STEP_PATTERN.test(question.question) ||
    COMPUTATION_PATTERN.test(combinedText)
  ) {
    complexityIndex = 1;
  }

  return complexityIndex;
}

export function getDarsReferenceTimeSeconds(question: Question) {
  const stemLength = question.question.trim().length;
  const optionsLength = question.options.reduce((sum, option) => sum + option.trim().length, 0);
  const rawReferenceTime =
    10 + 0.02 * stemLength + 0.01 * optionsLength + 30 * getComplexityIndex(question);

  return Math.max(10, Math.round(rawReferenceTime));
}

function getTimeEfficiency(question: Question, timeSpentSeconds?: number | null) {
  const referenceTime = getDarsReferenceTimeSeconds(question);
  if (typeof timeSpentSeconds !== "number" || !Number.isFinite(timeSpentSeconds) || timeSpentSeconds <= 0) {
    return 0.75;
  }

  const slack = DARS_REFERENCE_TIME_SLACK_RATIO * referenceTime;
  return clamp((referenceTime - timeSpentSeconds + slack) / referenceTime, 0, 1);
}

function getHintPenalty(hintsUsed = 0, maxHints = 0) {
  if (maxHints <= 0) return 0;
  return clamp(hintsUsed / maxHints, 0, 1);
}

function getStreakQuality(streak: number) {
  if (streak === 0) return 0.5;
  return clamp(0.5 * (1 + streak / Math.max(Math.abs(streak), 5)), 0, 1);
}

function getPerformanceQuality(input: DarsResponseInput, streak: number) {
  const timeEfficiency = getTimeEfficiency(input.question, input.timeSpentSeconds);
  const hintPenalty = getHintPenalty(input.hintsUsed, input.maxHints);

  if (!input.correct) {
    return {
      performanceQuality: round(clamp(0.05 * timeEfficiency, 0, 0.1)),
      timeEfficiency,
    };
  }

  const performanceQuality =
    DARS_TIME_WEIGHT * timeEfficiency +
    DARS_HINT_WEIGHT * (1 - hintPenalty) +
    DARS_STREAK_QUALITY_WEIGHT * getStreakQuality(streak);

  return {
    performanceQuality: round(clamp(performanceQuality, 0, 1)),
    timeEfficiency,
  };
}

function getDynamicK(state: DarsRatingState) {
  if (state.answeredCount < DARS_PROVISIONAL_ITEMS) return DARS_K_MAX;

  const countDecay = Math.exp(-DARS_DECAY_RATE * Math.max(0, state.answeredCount - DARS_PROVISIONAL_ITEMS));
  const uncertainty = variance(state.recentRatingDeltas.slice(-20));
  const uncertaintyWeight = uncertainty / (uncertainty + DARS_REFERENCE_VARIANCE);

  return round(DARS_K_MIN + (DARS_K_MAX - DARS_K_MIN) * countDecay * uncertaintyWeight);
}

function getStreakMultiplier(streak: number) {
  const absoluteStreak = Math.abs(streak);
  if (absoluteStreak < DARS_STREAK_THRESHOLD) return 1;

  const scaled =
    (absoluteStreak - DARS_STREAK_THRESHOLD) /
    Math.max(1, DARS_STREAK_SATURATION - DARS_STREAK_THRESHOLD);
  const bounded = clamp(scaled, 0, 1) * DARS_STREAK_MAX_MULTIPLIER_DELTA;

  return round(streak > 0 ? 1 + bounded : 1 - bounded);
}

function getCentralityByQuestionId() {
  if (centralityByQuestionIdCache) return centralityByQuestionIdCache;

  const graph = buildQuestionRecommendationGraph();
  const degreeByQuestionId = new Map<string, number>();

  graph.nodes.forEach((node) => degreeByQuestionId.set(node.questionId, 0));
  graph.edges.forEach((edge) => {
    degreeByQuestionId.set(edge.sourceId, (degreeByQuestionId.get(edge.sourceId) || 0) + 1);
    degreeByQuestionId.set(edge.targetId, (degreeByQuestionId.get(edge.targetId) || 0) + 1);
  });

  const maxDegree = Math.max(1, ...degreeByQuestionId.values());
  centralityByQuestionIdCache = new Map(
    [...degreeByQuestionId.entries()].map(([questionId, degree]) => [questionId, degree / maxDegree])
  );

  return centralityByQuestionIdCache;
}

function getEffectiveQuestionRating(question: Question) {
  const centrality = getCentralityByQuestionId().get(question.id) || 0;
  return Math.round(question.eloRating + DARS_CENTRALITY_BONUS * centrality);
}

export function createInitialDarsRatingState(rating: number, answeredCount = 0): DarsRatingState {
  return {
    rating,
    answeredCount,
    streak: 0,
    recentRatingDeltas: [],
  };
}

export function applyDarsRatingUpdate(
  state: DarsRatingState,
  input: DarsResponseInput
): { state: DarsRatingState; outcome: DarsRatingOutcome } {
  const previousRating = state.rating;
  const effectiveQuestionRating = getEffectiveQuestionRating(input.question);
  const expected = 1 / (1 + Math.pow(10, (effectiveQuestionRating - previousRating) / 400));
  const { performanceQuality, timeEfficiency } = getPerformanceQuality(input, state.streak);
  const baseDynamicK = getDynamicK(state);
  const dynamicK = input.remediationForQuestionId
    ? round(baseDynamicK * DARS_REMEDIATION_K_FACTOR)
    : baseDynamicK;
  const streakMultiplier = getStreakMultiplier(state.streak);
  let delta = dynamicK * streakMultiplier * (performanceQuality - expected);
  const uncappedDelta = delta;
  let rapidGuessCapped = false;

  const referenceTime = getDarsReferenceTimeSeconds(input.question);
  if (
    input.correct &&
    typeof input.timeSpentSeconds === "number" &&
    input.timeSpentSeconds > 0 &&
    input.timeSpentSeconds < DARS_RAPID_GUESS_FRACTION * referenceTime &&
    delta > DARS_RAPID_GUESS_GAIN_CAP
  ) {
    delta = DARS_RAPID_GUESS_GAIN_CAP;
    rapidGuessCapped = true;
  }

  const roundedDelta = Math.round(delta);
  const nextRating = Math.max(0, Math.round(previousRating + roundedDelta));
  const nextStreak = input.correct
    ? Math.max(1, state.streak > 0 ? state.streak + 1 : 1)
    : Math.min(-1, state.streak < 0 ? state.streak - 1 : -1);
  const nextDeltas = [...state.recentRatingDeltas, roundedDelta].slice(-20);
  const nextState: DarsRatingState = {
    rating: nextRating,
    answeredCount: state.answeredCount + 1,
    streak: nextStreak,
    recentRatingDeltas: nextDeltas,
  };

  return {
    state: nextState,
    outcome: {
      previousRating,
      nextRating,
      delta: roundedDelta,
      expected: round(expected),
      performanceQuality,
      dynamicK,
      streakMultiplier,
      timeEfficiency: round(timeEfficiency),
      effectiveQuestionRating,
      rapidGuessCapped,
      rapidGuessAdjustment: rapidGuessCapped ? Math.max(0, Math.round(uncappedDelta - delta)) : 0,
    },
  };
}
