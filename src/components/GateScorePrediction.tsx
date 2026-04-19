import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Lock, TrendingUp, Target, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface GateScorePredictionProps {
  studentElo: number;
  answeredQuestionsCount: number;
  overallAccuracy: number;
  completion: {
    fullMockPercent: number;
    topicWisePercent: number;
    adaptivePercent: number;
  };
  subjectPerformance: Array<{
    name: string;
    accuracy: number | null;
    score?: { correct: number; total: number };
  }>;
  testHistory?: Array<{
    test_type: string;
    score: number;
    max_score: number;
  }>;
}

const UNLOCK_ELO_THRESHOLD = 2500;
const UNLOCK_COMPLETION_THRESHOLD = 70;
const BASE_ELO_FOR_PROGRESS = 1200;
const BASE_GATE_SCORE = 35;

interface GatePrediction {
  minScore: number;
  maxScore: number;
  expectedScore: number;
  confidence: number;
  recommendation: string;
}

function calculateGateScorePrediction(
  eloScore: number,
  accuracy: number,
  subjectPerformance: Array<{
    name: string;
    accuracy: number | null;
    score?: { correct: number; total: number };
  }>,
  testHistory?: Array<{
    test_type: string;
    score: number;
    max_score: number;
  }>
): GatePrediction {
  const eloNormalized = Math.max(0, Math.min(100, ((eloScore - 1200) / 600) * 100));

  // Filter tests by type and performance threshold
  const filterTestsByThreshold = (testType: string, threshold: number) => {
    if (!testHistory) return [];
    return testHistory.filter((test) => {
      if (test.test_type !== testType) return false;
      if (test.max_score === 0) return false;
      const percentage = (test.score / test.max_score) * 100;
      return percentage >= threshold;
    });
  };

  const fullMockTests = filterTestsByThreshold("full-mock", 50);
  const topicWiseTests = filterTestsByThreshold("topic-wise", 70);
  const adaptiveTests = filterTestsByThreshold("adaptive", 70);

  // Calculate separate averages for each test type
  const getTestTypeAverage = (tests: typeof testHistory) => {
    if (!tests || tests.length === 0) return null;
    const totalScore = tests.reduce((sum, test) => sum + test.score, 0);
    const totalMaxScore = tests.reduce((sum, test) => sum + test.max_score, 0);
    return totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : null;
  };

  const fullMockAvg = getTestTypeAverage(fullMockTests);
  const topicWiseAvg = getTestTypeAverage(topicWiseTests);
  const adaptiveAvg = getTestTypeAverage(adaptiveTests);

  // Use filtered test averages, fall back to subject accuracy if no tests available
  const testBasedAccuracy = (
    (fullMockAvg || 0) * 0.5 +
    (topicWiseAvg || 0) * 0.25 +
    (adaptiveAvg || 0) * 0.25
  );

  const subjectAccuracies = subjectPerformance
    .filter((subject) => subject.accuracy !== null)
    .map((subject) => subject.accuracy || 0);

  const avgSubjectAccuracy = subjectAccuracies.length > 0
    ? subjectAccuracies.reduce((sum, value) => sum + value, 0) / subjectAccuracies.length
    : 50;

  // Use test-based accuracy if available, otherwise fall back to overall accuracy
  const finalAccuracy = testBasedAccuracy > 0 ? testBasedAccuracy : accuracy;
  const accuracyFactor = finalAccuracy;
  const eloFactor = eloNormalized;
  const consistencyFactor = Math.min(100, 100 - Math.abs(finalAccuracy - avgSubjectAccuracy));
  const improvementFactor = 50 + (finalAccuracy / 2);

  const predictedPercentage = (
    (accuracyFactor * 0.4) +
    (eloFactor * 0.3) +
    (consistencyFactor * 0.2) +
    (improvementFactor * 0.1)
  );

  const baseScore = BASE_GATE_SCORE + (predictedPercentage / 60) * 40;
  const expectedScore = Math.round(baseScore);
  const minScore = Math.max(0, Math.round(baseScore - 8));
  const maxScore = Math.min(100, Math.round(baseScore + 8));
  const confidence = Math.min(95, 50 + (accuracy / 2) + (eloNormalized / 5));

  let recommendation = "";
  if (finalAccuracy < 50) {
    recommendation = "Build stronger fundamentals first, then increase practice volume topic by topic.";
  } else if (finalAccuracy < 70) {
    recommendation = "Good momentum. Improve weak subjects and keep solving consistently to push your score band upward.";
  } else if (finalAccuracy < 85) {
    recommendation = "You are performing well. Focus on hard questions, mock-test stamina, and error reduction.";
  } else {
    recommendation = "Excellent shape. Maintain consistency and spend more time on advanced and mixed-difficulty sets.";
  }

  // Add test-specific insight
  if (testBasedAccuracy > 0) {
    if (fullMockTests.length > 0 && topicWiseTests.length === 0 && adaptiveTests.length === 0) {
      recommendation += " Focus on topic-wise and adaptive tests to build a more robust assessment.";
    } else if (fullMockTests.length === 0 && topicWiseTests.length > 0 && adaptiveTests.length === 0) {
      recommendation += " Take full mock tests to assess your performance under exam conditions.";
    }
  }

  return {
    minScore,
    maxScore,
    expectedScore,
    confidence: Math.round(confidence),
    recommendation,
  };
}

export function GateScorePrediction({
  studentElo,
  answeredQuestionsCount,
  overallAccuracy,
  completion,
  subjectPerformance,
  testHistory,
}: GateScorePredictionProps) {
  const isUnlocked =
    studentElo >= UNLOCK_ELO_THRESHOLD &&
    completion.fullMockPercent >= UNLOCK_COMPLETION_THRESHOLD &&
    completion.topicWisePercent >= UNLOCK_COMPLETION_THRESHOLD &&
    completion.adaptivePercent >= UNLOCK_COMPLETION_THRESHOLD;

  const eloRemaining = Math.max(0, UNLOCK_ELO_THRESHOLD - studentElo);

  const prediction = useMemo(() => {
    if (!isUnlocked) return null;
    return calculateGateScorePrediction(studentElo, overallAccuracy, subjectPerformance, testHistory);
  }, [isUnlocked, studentElo, overallAccuracy, subjectPerformance, testHistory]);

  const eloProgressToUnlock = Math.max(
    0,
    Math.min(
      100,
      ((studentElo - BASE_ELO_FOR_PROGRESS) / (UNLOCK_ELO_THRESHOLD - BASE_ELO_FOR_PROGRESS)) * 100
    )
  );

  const subjectChartData = useMemo(() => {
    return subjectPerformance
      .filter((subject) => subject.accuracy !== null)
      .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
      .slice(0, 6)
      .map((subject) => ({
        name: subject.name.slice(0, 12),
        accuracy: subject.accuracy || 0,
        fill: `hsl(${subject.accuracy! >= 70
          ? "var(--success)"
          : subject.accuracy! >= 50
            ? "var(--accent)"
            : "var(--destructive)"})`,
      }));
  }, [subjectPerformance]);

  const predictionChartData = useMemo(() => {
    if (!prediction) return [];
    return [
      { name: "Min", score: prediction.minScore, fill: "hsl(var(--muted))" },
      { name: "Expected", score: prediction.expectedScore, fill: "hsl(var(--primary))" },
      { name: "Max", score: prediction.maxScore, fill: "hsl(var(--success))" },
    ];
  }, [prediction]);

  return (
    <div className="space-y-4">
      <Card className={`p-5 border-2 ${isUnlocked ? "border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5" : "border-muted-foreground/20"}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {isUnlocked ? (
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted/40 flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                GATE Score Prediction
                {!isUnlocked && (
                  <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground font-normal">
                    Locked
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                This section predicts the score a student may get in next year&apos;s GATE DA exam.
              </p>
            </div>
          </div>
        </div>

        {!isUnlocked ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The prediction unlocks only after the student reaches both required milestones.
            </p>

            <div className="space-y-3">
              {[
                { label: "Full GATE Tests", value: completion.fullMockPercent, color: "bg-accent", icon: Target },
                { label: "Topic-wise Tests", value: completion.topicWisePercent, color: "bg-success", icon: TrendingUp },
                { label: "Adaptive Tests", value: completion.adaptivePercent, color: "bg-warning", icon: Zap },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {item.value}% / {UNLOCK_COMPLETION_THRESHOLD}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${Math.min(100, item.value)}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {item.value >= UNLOCK_COMPLETION_THRESHOLD
                      ? "Milestone completed"
                      : `${UNLOCK_COMPLETION_THRESHOLD - item.value}% more completion needed`}
                  </p>
                </div>
              ))}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">ELO Rating</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {studentElo} / {UNLOCK_ELO_THRESHOLD}
                  </span>
                </div>

                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${eloProgressToUnlock}%` }}
                  />
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  {eloRemaining > 0
                    ? `${eloRemaining} more ELO points needed`
                    : "ELO milestone completed"}
                </p>
              </div>

              <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-warning mb-1">Unlock requirement</p>
                    <p className="text-xs text-muted-foreground">
                      Reach at least {UNLOCK_ELO_THRESHOLD} ELO and complete at least {UNLOCK_COMPLETION_THRESHOLD}% of full GATE tests, topic-wise tests, and adaptive tests to enable the prediction engine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          prediction && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/40 border">
                  <p className="text-xs text-muted-foreground mb-1">Min Expected</p>
                  <p className="text-3xl font-bold text-warning">{prediction.minScore}</p>
                  <p className="text-xs text-muted-foreground mt-1">Conservative case</p>
                </div>

                <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20 scale-105">
                  <p className="text-xs text-muted-foreground mb-1">Expected Score</p>
                  <p className="text-4xl font-bold text-primary">{prediction.expectedScore}</p>
                  <p className="text-xs text-primary mt-1">{prediction.confidence}% confident</p>
                </div>

                <div className="text-center p-4 rounded-lg bg-muted/40 border">
                  <p className="text-xs text-muted-foreground mb-1">Max Expected</p>
                  <p className="text-3xl font-bold text-success">{prediction.maxScore}</p>
                  <p className="text-xs text-muted-foreground mt-1">Strong-performance case</p>
                </div>
              </div>

              {predictionChartData.length > 0 && (
                <div className="rounded-lg border p-4 bg-card">
                  <h4 className="text-sm font-semibold mb-3">Predicted Score Range</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={predictionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                        {predictionChartData.map((entry, index) => (
                          <Cell key={`prediction-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {subjectChartData.length > 0 && (
                <div className="rounded-lg border p-4 bg-card">
                  <h4 className="text-sm font-semibold mb-3">Subject Performance</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={subjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                        {subjectChartData.map((entry, index) => (
                          <Cell key={`subject-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on the current subject-wise accuracy profile.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">Recommended focus</p>
                    <p className="text-sm text-muted-foreground">{prediction.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button asChild variant="hero" className="flex-1" size="sm">
                  <Link to="/dashboard">
                    <TrendingUp className="h-4 w-4" />
                    View Detailed Analysis
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/ai-coach">
                    <Target className="h-4 w-4" />
                    Open Study Coach
                  </Link>
                </Button>
              </div>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
