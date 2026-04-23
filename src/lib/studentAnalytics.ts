import { getQuestionById } from "@/data/questions";
import { visibleSubjects } from "@/data/subjects";
import type { StudentTables } from "@/integrations/supabase/student-types";
import {
  getQuestionForPayloadReview,
  getReviewState,
  parseTestReviewPayload,
  summarizeTestWarnings,
} from "@/lib/testReview";

const OVERALL_TOPIC_ID = "__overall__";

type TestHistoryRow = StudentTables<"test_history">;
type UserProgressRow = StudentTables<"user_progress">;
type ActivityEventRow = StudentTables<"activity_events">;

export interface DerivedQuestionAttempt {
  questionId: string;
  subjectId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  answered: boolean;
  correct: boolean;
  completedAt: string;
  testType: string;
}

export interface DerivedSubjectMetric {
  subjectId: string;
  subjectName: string;
  correctAnswers: number;
  totalAnswers: number;
  totalAttempts: number;
  accuracy: number;
  averageScore: number;
}

export interface DerivedTopicMetric {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  totalAttempts: number;
  correctAnswers: number;
  accuracy: number;
  status: "weak" | "developing" | "strong";
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  tests: number;
  questions: number;
  warnings: number;
  events: number;
}

export interface TestTypePoint {
  name: string;
  attempts: number;
}

export interface StudentAnalyticsSummary {
  questionAttempts: DerivedQuestionAttempt[];
  subjectMetrics: DerivedSubjectMetric[];
  topicMetrics: DerivedTopicMetric[];
  questionsAnswered: number;
  correctAnswers: number;
  uniqueAttemptedQuestions: number;
  uniqueCorrectQuestions: number;
  activeDays: number;
  currentStreak: number;
  warnings: number;
  violations: number;
  readinessScore: number;
  coveragePercent: number;
  difficultyBreakdown: { easy: number; medium: number; hard: number };
  activityTimeline: DailyActivityPoint[];
  testTypeDistribution: TestTypePoint[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safePercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function formatTimelineLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDateKey(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getSubjectName(subjectId: string) {
  return visibleSubjects.find((subject) => subject.id === subjectId)?.name || subjectId;
}

function getTopicName(subjectId: string, topicId: string) {
  const subject = visibleSubjects.find((candidate) => candidate.id === subjectId);
  return subject?.topics.find((topic) => topic.id === topicId)?.name || topicId;
}

function deriveStatus(accuracy: number) {
  if (accuracy >= 75) return "strong" as const;
  if (accuracy >= 55) return "developing" as const;
  return "weak" as const;
}

export function extractQuestionAttemptsFromHistory(testHistory: TestHistoryRow[]): DerivedQuestionAttempt[] {
  return testHistory.flatMap((row) => {
    const payload = parseTestReviewPayload(row.review_payload);
    if (!payload) return [];

    return payload.question_ids.map((questionId, index) => {
      const question =
        getQuestionForPayloadReview(payload, index) || getQuestionById(questionId);
      if (!question) return null;

      const answer = payload.answers[index] ?? null;
      const reviewState = getReviewState(question, answer);

      return {
        questionId: question.id,
        subjectId: question.subjectId,
        topicId: question.topicId,
        difficulty: question.difficulty,
        answered: reviewState !== "unanswered",
        correct: reviewState === "correct",
        completedAt: row.completed_at,
        testType: row.test_type,
      } satisfies DerivedQuestionAttempt;
    }).filter((attempt): attempt is DerivedQuestionAttempt => Boolean(attempt));
  });
}

function buildSubjectMetricsFromProgress(progressRows: UserProgressRow[], testHistory: TestHistoryRow[]) {
  const overallRows = progressRows.filter(
    (row) => (row.topic_id === OVERALL_TOPIC_ID || row.topic_id === null) && row.total > 0
  );

  if (overallRows.length === 0) return [] as DerivedSubjectMetric[];

  return overallRows
    .map((row) => {
      const relatedHistory = testHistory.filter((item) => item.subject_id === row.subject_id);
      const averageScore = relatedHistory.length > 0
        ? relatedHistory.reduce((sum, item) => sum + (item.score || 0), 0) / relatedHistory.length
        : 0;

      return {
        subjectId: row.subject_id,
        subjectName: getSubjectName(row.subject_id),
        correctAnswers: row.correct || 0,
        totalAnswers: row.total || 0,
        totalAttempts: relatedHistory.length,
        accuracy: safePercent(row.correct || 0, row.total || 0),
        averageScore,
      } satisfies DerivedSubjectMetric;
    })
    .sort((left, right) => right.totalAnswers - left.totalAnswers || right.accuracy - left.accuracy);
}

function buildSubjectMetricsFromHistory(testHistory: TestHistoryRow[], attempts: DerivedQuestionAttempt[]) {
  const stats = new Map<string, { correct: number; total: number }>();

  attempts.forEach((attempt) => {
    if (!attempt.answered) return;
    const current = stats.get(attempt.subjectId) || { correct: 0, total: 0 };
    current.correct += attempt.correct ? 1 : 0;
    current.total += 1;
    stats.set(attempt.subjectId, current);
  });

  return [...stats.entries()]
    .map(([subjectId, value]) => {
      const relatedHistory = testHistory.filter((item) => item.subject_id === subjectId);
      return {
        subjectId,
        subjectName: getSubjectName(subjectId),
        correctAnswers: value.correct,
        totalAnswers: value.total,
        totalAttempts: relatedHistory.length,
        accuracy: safePercent(value.correct, value.total),
        averageScore: relatedHistory.length > 0
          ? relatedHistory.reduce((sum, item) => sum + (item.score || 0), 0) / relatedHistory.length
          : 0,
      } satisfies DerivedSubjectMetric;
    })
    .sort((left, right) => right.totalAnswers - left.totalAnswers || right.accuracy - left.accuracy);
}

function buildTopicMetricsFromProgress(progressRows: UserProgressRow[]) {
  const topicRows = progressRows.filter(
    (row) => Boolean(row.topic_id) && row.topic_id !== OVERALL_TOPIC_ID && (row.total || 0) > 0
  );

  if (topicRows.length === 0) return [] as DerivedTopicMetric[];

  return topicRows
    .map((row) => {
      const accuracy = safePercent(row.correct || 0, row.total || 0);
      const topicId = row.topic_id || `${row.subject_id}-topic`;
      return {
        topicId,
        topicName: getTopicName(row.subject_id, topicId),
        subjectId: row.subject_id,
        subjectName: getSubjectName(row.subject_id),
        totalAttempts: row.total || 0,
        correctAnswers: row.correct || 0,
        accuracy,
        status: deriveStatus(accuracy),
      } satisfies DerivedTopicMetric;
    })
    .sort((left, right) => right.totalAttempts - left.totalAttempts || right.accuracy - left.accuracy);
}

function buildTopicMetricsFromHistory(attempts: DerivedQuestionAttempt[]) {
  const stats = new Map<string, { subjectId: string; topicId: string; correct: number; total: number }>();

  attempts.forEach((attempt) => {
    if (!attempt.answered) return;
    const key = `${attempt.subjectId}::${attempt.topicId}`;
    const current = stats.get(key) || {
      subjectId: attempt.subjectId,
      topicId: attempt.topicId,
      correct: 0,
      total: 0,
    };
    current.correct += attempt.correct ? 1 : 0;
    current.total += 1;
    stats.set(key, current);
  });

  return [...stats.values()]
    .map((value) => {
      const accuracy = safePercent(value.correct, value.total);
      return {
        topicId: value.topicId,
        topicName: getTopicName(value.subjectId, value.topicId),
        subjectId: value.subjectId,
        subjectName: getSubjectName(value.subjectId),
        totalAttempts: value.total,
        correctAnswers: value.correct,
        accuracy,
        status: deriveStatus(accuracy),
      } satisfies DerivedTopicMetric;
    })
    .sort((left, right) => right.totalAttempts - left.totalAttempts || right.accuracy - left.accuracy);
}

function deriveCurrentStreak(dateKeys: string[]) {
  if (dateKeys.length === 0) return 0;

  const uniqueDates = [...new Set(dateKeys)].sort((left, right) => right.localeCompare(left));
  let streak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00`);
    const current = new Date(`${uniqueDates[index]}T00:00:00`);
    const diffDays = Math.round((previous.getTime() - current.getTime()) / 86400000);
    if (diffDays !== 1) break;
    streak += 1;
  }

  return streak;
}

function buildActivityTimeline(
  testHistory: TestHistoryRow[],
  activityRows: ActivityEventRow[]
) {
  const bucket = new Map<string, DailyActivityPoint>();

  const ensurePoint = (dateKey: string) => {
    const current = bucket.get(dateKey);
    if (current) return current;

    const created: DailyActivityPoint = {
      date: dateKey,
      label: formatTimelineLabel(dateKey),
      tests: 0,
      questions: 0,
      warnings: 0,
      events: 0,
    };
    bucket.set(dateKey, created);
    return created;
  };

  testHistory.forEach((row) => {
    const dateKey = getDateKey(row.completed_at);
    if (!dateKey) return;
    const point = ensurePoint(dateKey);
    point.tests += 1;
    point.questions += row.questions_attempted || 0;
    point.warnings += summarizeTestWarnings(parseTestReviewPayload(row.review_payload), row.violations || 0).total;
  });

  activityRows.forEach((row) => {
    const isWarningEvent = /warning|rapid|focus/i.test(row.event_type || "");
    if (!isWarningEvent) return;

    const dateKey = getDateKey(row.created_at);
    if (!dateKey) return;
    const point = ensurePoint(dateKey);
    point.events += 1;
    point.warnings += 1;
  });

  return [...bucket.values()]
    .filter((point) => point.tests > 0 || point.questions > 0 || point.warnings > 0)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-14);
}

function buildTestTypeDistribution(testHistory: TestHistoryRow[]) {
  const counts = new Map<string, number>();

  testHistory.forEach((row) => {
    const label =
      row.test_type === "full-mock"
        ? "Full papers"
        : row.test_type === "topic-wise"
          ? "Topic tests"
          : row.test_type === "adaptive"
            ? "Adaptive"
            : row.test_type.startsWith("assignment")
              ? "Assignments"
              : row.test_type;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, attempts]) => ({ name, attempts }))
    .sort((left, right) => right.attempts - left.attempts);
}

export function buildStudentAnalyticsSummary({
  testHistory,
  userProgress,
  activityRows,
  profileStreak = 0,
  totalQuestionBankCount,
}: {
  testHistory: TestHistoryRow[];
  userProgress: UserProgressRow[];
  activityRows: ActivityEventRow[];
  profileStreak?: number;
  totalQuestionBankCount: number;
}): StudentAnalyticsSummary {
  const questionAttempts = extractQuestionAttemptsFromHistory(testHistory);
  const answeredAttempts = questionAttempts.filter((attempt) => attempt.answered);
  const uniqueAttemptedQuestions = new Set(answeredAttempts.map((attempt) => attempt.questionId));
  const uniqueCorrectAttempts = new Map<string, DerivedQuestionAttempt>();

  answeredAttempts.forEach((attempt) => {
    const existing = uniqueCorrectAttempts.get(attempt.questionId);
    if (!existing || attempt.correct) {
      uniqueCorrectAttempts.set(attempt.questionId, attempt);
    }
  });

  const progressQuestionTotal = userProgress
    .filter((row) => row.topic_id === OVERALL_TOPIC_ID || row.topic_id === null)
    .reduce((sum, row) => sum + (row.total || 0), 0);
  const progressCorrectTotal = userProgress
    .filter((row) => row.topic_id === OVERALL_TOPIC_ID || row.topic_id === null)
    .reduce((sum, row) => sum + (row.correct || 0), 0);

  const historyQuestionTotal = testHistory.reduce((sum, row) => sum + (row.questions_attempted || 0), 0);
  const historyCorrectTotal = testHistory.reduce((sum, row) => sum + (row.correct_answers || 0), 0);

  const questionsAnswered = Math.max(answeredAttempts.length, progressQuestionTotal, historyQuestionTotal);
  const correctAnswers = Math.max(
    answeredAttempts.filter((attempt) => attempt.correct).length,
    progressCorrectTotal,
    historyCorrectTotal
  );

  const subjectMetrics = buildSubjectMetricsFromProgress(userProgress, testHistory);
  const fallbackSubjectMetrics = subjectMetrics.length > 0
    ? subjectMetrics
    : buildSubjectMetricsFromHistory(testHistory, questionAttempts);
  const topicMetrics = buildTopicMetricsFromProgress(userProgress);
  const fallbackTopicMetrics = topicMetrics.length > 0
    ? topicMetrics
    : buildTopicMetricsFromHistory(questionAttempts);

  const historyWarnings = testHistory.reduce((sum, row) => sum + summarizeTestWarnings(parseTestReviewPayload(row.review_payload), row.violations || 0).total, 0);
  const eventWarnings = activityRows.filter((row) => /warning|rapid|focus/i.test(row.event_type || "")).length;
  const historyViolations = testHistory.reduce((sum, row) => sum + (row.violations || 0), 0);
  const eventViolations = activityRows.filter((row) => /violation|breach|tab/i.test(row.event_type || "")).length;

  const activityDateKeys = [
    ...testHistory.map((row) => getDateKey(row.completed_at)).filter((value): value is string => Boolean(value)),
    ...activityRows.map((row) => getDateKey(row.created_at)).filter((value): value is string => Boolean(value)),
    ...answeredAttempts.map((attempt) => getDateKey(attempt.completedAt)).filter((value): value is string => Boolean(value)),
  ];

  const recentAccuracy = testHistory.length > 0
    ? testHistory.slice(-5).reduce((sum, row) => sum + safePercent(row.correct_answers || 0, row.total_questions || 0), 0) / Math.min(5, testHistory.length)
    : safePercent(correctAnswers, questionsAnswered);
  const subjectAccuracyAverage = fallbackSubjectMetrics.length > 0
    ? fallbackSubjectMetrics.reduce((sum, metric) => sum + metric.accuracy, 0) / fallbackSubjectMetrics.length
    : safePercent(correctAnswers, questionsAnswered);
  const solvedCoveragePercent = totalQuestionBankCount > 0
    ? (uniqueAttemptedQuestions.size / totalQuestionBankCount) * 100
    : 0;
  const currentStreak = Math.max(profileStreak, deriveCurrentStreak(activityDateKeys));
  const readinessScore = Math.round(
    clamp(
      recentAccuracy * 0.45 +
        subjectAccuracyAverage * 0.3 +
        solvedCoveragePercent * 0.15 +
        Math.min(currentStreak * 4, 10),
      0,
      100
    )
  );

  const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
  uniqueCorrectAttempts.forEach((attempt) => {
    if (attempt.correct) {
      difficultyBreakdown[attempt.difficulty] += 1;
    }
  });

  return {
    questionAttempts,
    subjectMetrics: fallbackSubjectMetrics,
    topicMetrics: fallbackTopicMetrics,
    questionsAnswered,
    correctAnswers,
    uniqueAttemptedQuestions: uniqueAttemptedQuestions.size,
    uniqueCorrectQuestions: [...uniqueCorrectAttempts.values()].filter((attempt) => attempt.correct).length,
    activeDays: [...new Set(activityDateKeys)].length,
    currentStreak,
    warnings: Math.max(historyWarnings, eventWarnings),
    violations: Math.max(historyViolations, eventViolations),
    readinessScore,
    coveragePercent: solvedCoveragePercent,
    difficultyBreakdown,
    activityTimeline: buildActivityTimeline(testHistory, activityRows),
    testTypeDistribution: buildTestTypeDistribution(testHistory),
  };
}
