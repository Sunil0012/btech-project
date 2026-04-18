/**
 * Student Insights Page
 * Displays comprehensive analytics: subject accuracy, test trends, completion metrics,
 * warning patterns, weak/strong topics, and AI-generated insights.
 */

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { studentSupabase } from "@/integrations/supabase/student-client";
import type { StudentTables } from "@/integrations/supabase/student-types";
import { visibleSubjects, getTopicById, getSubjectById } from "@/data/subjects";
import { generateAIInsights, AIInsightResult } from "@/lib/aiCoach";
import {
  BarChart3, TrendingUp, Target, Brain, Sparkles,
  BookOpen, Zap, AlertCircle, Trophy, Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";

// Recharts with proper naming
const RechartsLineChart = LineChart;
const RechartsBarChart = BarChart;
const RechartsPieChart = PieChart;
const RechartsXAxis = XAxis;
const RechartsYAxis = YAxis;
const RechartsTooltip = Tooltip;
const RechartsCartesianGrid = CartesianGrid;
const RechartsCell = Cell;
const RechartLine = Line;
const RechartsBar = Bar;
const RechartsPie = Pie;
const RechartsLegend = Legend;
const RechartsResponsiveContainer = ResponsiveContainer;

interface TestMetrics {
  totalTests: number;
  averageScore: number;
  totalMinutes: number;
  bestScore: number;
  worstScore: number;
  answerAccuracy: number;
}

interface SubjectMetrics {
  subjectId: string;
  subjectName: string;
  totalAttempts: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number;
  averageScore: number;
}

interface TopicMetrics {
  topicId: string;
  topicName: string;
  totalAttempts: number;
  accuracy: number;
  status: "weak" | "developing" | "strong";
}

interface WarningMetrics {
  focusLossCount: number;
  rapidGuessCount: number;
  timingWarningsCount: number;
}

export default function InsightsPage() {
  const { user, subjectScores } = useStudentAuth();
  const [testHistory, setTestHistory] = useState<StudentTables<"test_history">[]>([]);
  const [userProgress, setUserProgress] = useState<StudentTables<"user_progress">[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsightResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch test history
        const { data: historyData } = await studentSupabase
          .from("test_history")
          .select("*")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false });

        if (historyData) {
          setTestHistory(historyData);
        }

        // Fetch user progress
        const { data: progressData } = await studentSupabase
          .from("user_progress")
          .select("*")
          .eq("user_id", user.id);

        if (progressData) {
          setUserProgress(progressData);
        }

        // Generate AI insights
        if (historyData && historyData.length > 0) {
          setLoadingInsights(true);
          try {
            const insights = await generateAIInsights({
              userId: user.id,
              testHistory: historyData,
              userProgress: progressData || [],
            });
            setAiInsights(insights);
          } catch (error) {
            console.error("Failed to generate AI insights:", error);
          } finally {
            setLoadingInsights(false);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate test metrics
  const testMetrics = useMemo((): TestMetrics => {
    if (testHistory.length === 0) {
      return {
        totalTests: 0,
        averageScore: 0,
        totalMinutes: 0,
        bestScore: 0,
        worstScore: 0,
        answerAccuracy: 0,
      };
    }

    const scores = testHistory.map((t) => t.score || 0);
    const accuracies = testHistory.map((t) =>
      t.total_questions > 0 ? (t.correct_answers || 0) / t.total_questions : 0
    );

    return {
      totalTests: testHistory.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      totalMinutes: (testHistory.reduce((a, t) => a + (t.duration_seconds || 0), 0) / 60),
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      answerAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
    };
  }, [testHistory]);

  // Calculate subject metrics
  const subjectMetrics = useMemo((): SubjectMetrics[] => {
    return visibleSubjects
      .map((subject) => {
        const progress = userProgress.find((p) => p.subject_id === subject.id);
        const tests = testHistory.filter((t) => t.subject_id === subject.id);

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          totalAttempts: tests.length,
          correctAnswers: progress?.correct || 0,
          totalAnswers: progress?.total || 0,
          accuracy: progress && progress.total > 0 ? (progress.correct / progress.total) * 100 : 0,
          averageScore: tests.length > 0 ? tests.reduce((a, t) => a + (t.score || 0), 0) / tests.length : 0,
        };
      })
      .filter((m) => m.totalAttempts > 0 || m.totalAnswers > 0);
  }, [testHistory, userProgress]);

  // Calculate topic metrics
  const topicMetrics = useMemo((): TopicMetrics[] => {
    const topics: Map<string, TopicMetrics> = new Map();

    userProgress.forEach((progress) => {
      if (!progress.topic_id) return;

      const topic = visibleSubjects
        .flatMap((s) => s.topics)
        .find((t) => t.id === progress.topic_id);

      if (!topic) return;

      const accuracy = progress.total > 0 ? (progress.correct / progress.total) * 100 : 0;
      const status: "weak" | "developing" | "strong" =
        accuracy >= 75 ? "strong" : accuracy >= 50 ? "developing" : "weak";

      topics.set(progress.topic_id, {
        topicId: progress.topic_id,
        topicName: topic.name,
        totalAttempts: progress.total,
        accuracy,
        status,
      });
    });

    return Array.from(topics.values())
      .sort((a, b) => b.totalAttempts - a.totalAttempts)
      .slice(0, 10);
  }, [userProgress]);

  // Prepare test trend data
  const testTrendData = useMemo(() => {
    return testHistory
      .slice()
      .reverse()
      .slice(0, 10)
      .map((test, idx) => ({
        date: test.completed_at?.split("T")[0] || `Test ${idx}`,
        score: test.score || 0,
        maxScore: test.max_score || 100,
        accuracy: test.total_questions > 0 ? Math.round((test.correct_answers || 0 / test.total_questions) * 100) : 0,
      }));
  }, [testHistory]);

  // Prepare subject accuracy data
  const subjectAccuracyData = subjectMetrics.map((m) => ({
    name: m.subjectName,
    accuracy: Math.round(m.accuracy),
    attempts: m.totalAttempts,
  }));

  // Prepare weak vs strong topics data
  const topicStatusData = useMemo(() => {
    return [
      {
        name: "Strong",
        value: topicMetrics.filter((t) => t.status === "strong").length,
        color: "#22c55e",
      },
      {
        name: "Developing",
        value: topicMetrics.filter((t) => t.status === "developing").length,
        color: "#f59e0b",
      },
      {
        name: "Weak",
        value: topicMetrics.filter((t) => t.status === "weak").length,
        color: "#ef4444",
      },
    ];
  }, [topicMetrics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 flex items-center justify-center">
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-16 space-y-16">
        {/* Header */}
        <ScrollReveal>
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
              Learning Insights
            </h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive analytics of your learning journey and test performance across all subjects and topics.
            </p>
          </div>
        </ScrollReveal>

        {/* Key Metrics */}
        <ScrollReveal>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Tests Taken</p>
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{testMetrics.totalTests}</p>
              <p className="text-xs text-muted-foreground">Cumulative practice</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Avg. Accuracy</p>
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{Math.round(testMetrics.answerAccuracy * 100)}%</p>
              <p className="text-xs text-muted-foreground">Answer accuracy rate</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/30 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Best Score</p>
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{testMetrics.bestScore}</p>
              <p className="text-xs text-muted-foreground">Highest performance</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-800/30 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{Math.round(testMetrics.totalMinutes / 60)}h</p>
              <p className="text-xs text-muted-foreground">{Math.round(testMetrics.totalMinutes)} minutes</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Topics</p>
                <BookOpen className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{topicMetrics.length}</p>
              <p className="text-xs text-muted-foreground">Unique topics studied</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Test Trend Chart */}
        {testTrendData.length > 0 && (
          <ScrollReveal>
            <div className="bg-card border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Test Score Trend</h2>
                  <p className="text-xs text-muted-foreground mt-1">Performance over time</p>
                </div>
              </div>
              <div className="w-full h-72">
                <RechartsResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={testTrendData}>
                    <RechartsCartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <RechartsXAxis dataKey="date" stroke="var(--muted-foreground)" />
                    <RechartsYAxis stroke="var(--muted-foreground)" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <RechartLine type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: "#8b5cf6", r: 5 }} />
                  </RechartsLineChart>
                </RechartsResponsiveContainer>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Subject Accuracy - LeetCode Style */}
        <ScrollReveal>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Subject Progress</h2>
                <p className="text-xs text-muted-foreground mt-1">Your accuracy by subject area</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleSubjects.map((subject) => {
                const metric = subjectMetrics.find((m) => m.subjectId === subject.id);
                const accuracy = metric?.accuracy || 0;
                const attempts = metric?.totalAttempts || 0;
                const getStatusColor = (acc: number) => {
                  if (acc === 0) return "from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800";
                  if (acc >= 75) return "from-green-100 to-emerald-50 dark:from-green-900 dark:to-emerald-950";
                  if (acc >= 60) return "from-blue-100 to-cyan-50 dark:from-blue-900 dark:to-cyan-950";
                  if (acc >= 45) return "from-amber-100 to-yellow-50 dark:from-amber-900 dark:to-yellow-950";
                  return "from-red-100 to-orange-50 dark:from-red-900 dark:to-orange-950";
                };
                
                const getAccuracyLabel = (acc: number) => {
                  if (acc === 0) return "Not started";
                  if (acc >= 75) return "Excellent";
                  if (acc >= 60) return "Good";
                  if (acc >= 45) return "Okay";
                  return "Needs work";
                };

                return (
                  <div
                    key={subject.id}
                    className={`bg-gradient-to-br ${getStatusColor(accuracy)} border rounded-xl p-5 space-y-3 hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground line-clamp-2">{subject.name}</p>
                      </div>
                      {attempts > 0 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/80 dark:bg-black/30 text-xs font-bold text-foreground">
                          {Math.round(accuracy)}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-500"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{getAccuracyLabel(accuracy)}</span>
                        <span className="text-muted-foreground font-medium">{attempts} {attempts === 1 ? 'attempt' : 'attempts'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Topics Overview */}
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Skill Level Distribution Pie Chart */}
            {topicMetrics.length > 0 && (
              <div className="bg-card border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Skill Mastery Breakdown</h2>
                    <p className="text-xs text-muted-foreground mt-1">Topic proficiency distribution</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="w-full h-72">
                    <RechartsResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <RechartsPie
                          data={topicStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {topicStatusData.map((entry, index) => (
                            <RechartsCell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </RechartsPie>
                        <RechartsLegend />
                      </RechartsPieChart>
                    </RechartsResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{topicMetrics.filter((t) => t.status === "strong").length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Mastered</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{topicMetrics.filter((t) => t.status === "developing").length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Developing</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{topicMetrics.filter((t) => t.status === "weak").length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Needs Work</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Topics to Focus On - Enhanced */}
            <div className="bg-card border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Focus Areas</h2>
                  <p className="text-xs text-muted-foreground mt-1">Topics needing your attention</p>
                </div>
              </div>
              <div className="space-y-3">
                {topicMetrics
                  .filter((t) => t.status === "weak" || t.status === "developing")
                  .slice(0, 6)
                  .map((topic) => {
                    const statusColor = topic.status === "weak" 
                      ? "bg-red-50/50 dark:bg-red-950/10 border-red-200/30 dark:border-red-800/20" 
                      : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/30 dark:border-amber-800/20";
                    const progressColor = topic.status === "weak" 
                      ? "bg-red-500" 
                      : "bg-amber-500";
                    
                    return (
                      <div key={topic.topicId} className={`${statusColor} border rounded-lg p-4 space-y-2`}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">{topic.topicName}</p>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${topic.status === "weak" ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                            {Math.round(topic.accuracy)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{topic.totalAttempts} attempt{topic.totalAttempts !== 1 ? 's' : ''}</p>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={progressColor}
                            style={{ width: `${topic.accuracy}%`, transition: 'width 0.3s ease' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {topicMetrics.filter((t) => t.status === "weak" || t.status === "developing").length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No focus areas right now! You're performing great! 🎉</p>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Strong Topics - Master Level - LeetCode style */}
        {topicMetrics.filter((t) => t.status === "strong").length > 0 && (
          <ScrollReveal>
            <div className="bg-card border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Mastered Topics</h2>
                  <p className="text-xs text-muted-foreground mt-1">Topics where you've achieved proficiency</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                {topicMetrics
                  .filter((t) => t.status === "strong")
                  .map((topic) => (
                    <div 
                      key={topic.topicId} 
                      className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200/60 dark:border-green-800/40 rounded-lg p-4 space-y-3 hover:shadow-md transition-all hover:scale-105"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-green-900 dark:text-green-100 line-clamp-2">{topic.topicName}</p>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold flex-shrink-0">
                          ✓
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">{Math.round(topic.accuracy)}%</span>
                        <span className="text-xs text-green-600 dark:text-green-400">accuracy</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <span>•</span>
                        <span>{topic.totalAttempts} completed</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <ScrollReveal>
            <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 border border-purple-200/50 dark:border-purple-800/30 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-100">AI Insights</h2>
                  <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {aiInsights.strengths && aiInsights.strengths.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                      💪 Your Strengths
                    </h3>
                    <ul className="space-y-2">
                      {aiInsights.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-purple-800 dark:text-purple-200 flex gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiInsights.areasToImprove && aiInsights.areasToImprove.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                      🎯 Areas to Improve
                    </h3>
                    <ul className="space-y-2">
                      {aiInsights.areasToImprove.map((a, i) => (
                        <li key={i} className="text-sm text-purple-800 dark:text-purple-200 flex gap-2">
                          <span className="text-orange-600 dark:text-orange-400">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      📚 Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {aiInsights.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-purple-800 dark:text-purple-200 flex gap-2">
                          <span className="text-blue-600 dark:text-blue-400">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Ready to practice more?</p>
            <div className="flex gap-3 justify-center">
              <Link to="/practice">
                <Button variant="hero" size="lg" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Start Practice
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="outline" size="lg">
                  View History
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <Footer />
    </div>
  );
}
