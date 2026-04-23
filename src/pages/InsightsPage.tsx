import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Flame,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { questions as allQuestions } from "@/data/questions";
import { useStudentAuth } from "@/contexts/AuthContext";
import { studentSupabase } from "@/integrations/supabase/student-client";
import type { StudentTables } from "@/integrations/supabase/student-types";
import { generateAIInsights, type AIInsightResult } from "@/lib/aiCoach";
import { buildStudentAnalyticsSummary } from "@/lib/studentAnalytics";

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export default function InsightsPage() {
  const { user, studentElo } = useStudentAuth();
  const [testHistory, setTestHistory] = useState<StudentTables<"test_history">[]>([]);
  const [userProgress, setUserProgress] = useState<StudentTables<"user_progress">[]>([]);
  const [activityRows, setActivityRows] = useState<StudentTables<"activity_events">[]>([]);
  const [profileStreak, setProfileStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsightResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [historyResult, progressResult, activityResult, profileResult] = await Promise.all([
          studentSupabase
            .from("test_history")
            .select("*")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false }),
          studentSupabase
            .from("user_progress")
            .select("*")
            .eq("user_id", user.id),
          studentSupabase
            .from("activity_events")
            .select("*")
            .or(`actor_id.eq.${user.id},target_user_id.eq.${user.id}`)
            .order("created_at", { ascending: false }),
          studentSupabase
            .from("profiles")
            .select("streak_count")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        setTestHistory(historyResult.data || []);
        setUserProgress(progressResult.data || []);
        setActivityRows(activityResult.data || []);
        setProfileStreak(profileResult.data?.streak_count || 0);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [user]);

  const analyticsSummary = useMemo(() => buildStudentAnalyticsSummary({
    testHistory,
    userProgress,
    activityRows,
    profileStreak,
    totalQuestionBankCount: allQuestions.length,
  }), [activityRows, profileStreak, testHistory, userProgress]);

  const overallAccuracy = analyticsSummary.questionsAnswered > 0
    ? Math.round((analyticsSummary.correctAnswers / analyticsSummary.questionsAnswered) * 100)
    : 0;

  const testTrendData = useMemo(() => {
    return testHistory
      .slice()
      .reverse()
      .slice(-12)
      .map((test, index) => ({
        label: `T${index + 1}`,
        date: new Date(test.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        scorePct: test.max_score > 0 ? Math.round((test.score / test.max_score) * 100) : 0,
        accuracy: test.total_questions > 0 ? Math.round((test.correct_answers / test.total_questions) * 100) : 0,
      }));
  }, [testHistory]);

  const subjectAccuracyData = analyticsSummary.subjectMetrics.map((metric) => ({
    name: metric.subjectName,
    accuracy: Math.round(metric.accuracy),
    attempts: metric.totalAnswers,
  }));

  const topicStatusData = useMemo(() => {
    const strong = analyticsSummary.topicMetrics.filter((topic) => topic.status === "strong").length;
    const developing = analyticsSummary.topicMetrics.filter((topic) => topic.status === "developing").length;
    const weak = analyticsSummary.topicMetrics.filter((topic) => topic.status === "weak").length;

    return [
      { name: "Strong", value: strong, color: "#22c55e" },
      { name: "Developing", value: developing, color: "#f59e0b" },
      { name: "Needs work", value: weak, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [analyticsSummary.topicMetrics]);

  useEffect(() => {
    if (!user || (analyticsSummary.questionsAnswered === 0 && testHistory.length === 0)) {
      setAiInsights(null);
      return;
    }

    const loadInsights = async () => {
      setLoadingInsights(true);
      try {
        const weakTopics = analyticsSummary.topicMetrics
          .filter((topic) => topic.status === "weak")
          .slice(0, 5)
          .map((topic) => ({
            name: topic.topicName,
            accuracy: Math.round(topic.accuracy),
            attempted: topic.totalAttempts,
            totalQuestions: topic.totalAttempts,
          }));
        const strongTopics = analyticsSummary.topicMetrics
          .filter((topic) => topic.status === "strong")
          .slice(0, 5)
          .map((topic) => ({
            name: topic.topicName,
            accuracy: Math.round(topic.accuracy),
            attempted: topic.totalAttempts,
            totalQuestions: topic.totalAttempts,
          }));

        const insights = await generateAIInsights({
          studentName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
          elo: studentElo,
          tier:
            overallAccuracy >= 80 ? "Advanced" :
            overallAccuracy >= 65 ? "Intermediate" :
            overallAccuracy >= 50 ? "Developing" :
            "Foundation",
          overallAccuracy,
          totalAnswered: analyticsSummary.questionsAnswered,
          streak: analyticsSummary.currentStreak,
          weakTopics,
          strongTopics,
          subjectPerformance: analyticsSummary.subjectMetrics.map((metric) => ({
            name: metric.subjectName,
            accuracy: Math.round(metric.accuracy),
            attempted: metric.totalAnswers,
            totalQuestions: metric.totalAnswers,
          })),
          recentTests: testHistory.slice(0, 8).map((test) => ({
            type: test.test_type,
            correct: test.correct_answers,
            total: test.total_questions,
            completedAt: test.completed_at,
          })),
        });
        setAiInsights(insights);
      } catch (error) {
        console.error("Failed to generate AI insights:", error);
      } finally {
        setLoadingInsights(false);
      }
    };

    void loadInsights();
  }, [analyticsSummary, overallAccuracy, studentElo, testHistory, user]);

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

      <div className="container py-10 space-y-8">
        <ScrollReveal>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Student insights
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Performance and readiness</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              A deeper view of your saved sessions, topic mastery, warnings, momentum, and practice activity.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={30}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Readiness" value={`${analyticsSummary.readinessScore}%`} detail="Blended score from recent accuracy, coverage, and streak" icon={Target} tone="text-blue-500" />
            <MetricCard label="Streak" value={`${analyticsSummary.currentStreak} days`} detail="Current active-day streak" icon={Flame} tone="text-orange-500" />
            <MetricCard label="Questions answered" value={analyticsSummary.questionsAnswered.toString()} detail={`${analyticsSummary.correctAnswers} correct answers saved`} icon={BookOpen} tone="text-cyan-500" />
            <MetricCard label="Active days" value={analyticsSummary.activeDays.toString()} detail="Days with saved history or activity" icon={CalendarDays} tone="text-violet-500" />
            <MetricCard label="Warnings" value={analyticsSummary.warnings.toString()} detail="Focus and rapid-guess warnings" icon={AlertTriangle} tone="text-amber-500" />
            <MetricCard label="Violations" value={analyticsSummary.violations.toString()} detail="Saved violation count across attempts" icon={ShieldAlert} tone="text-red-500" />
          </div>
        </ScrollReveal>

        <div className="grid gap-5 xl:grid-cols-2">
          <ScrollReveal delay={70}>
            <ChartCard
              title="Performance trend"
              description="Recent score and accuracy across your saved attempts."
              icon={TrendingUp}
            >
              {testTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={testTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="scorePct" name="Score %" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Complete a few sessions to unlock your performance trend." />
              )}
            </ChartCard>
          </ScrollReveal>

          <ScrollReveal delay={90}>
            <ChartCard
              title="Activity timeline"
              description="Tests, answered questions, and warnings over the last 14 active days."
              icon={Activity}
            >
              {analyticsSummary.activityTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsSummary.activityTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="questions" name="Questions" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="tests" name="Tests" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.18} />
                    <Area type="monotone" dataKey="warnings" name="Warnings" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Your activity timeline will appear once you save a few sessions." />
              )}
            </ChartCard>
          </ScrollReveal>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <ScrollReveal delay={110}>
            <ChartCard
              title="Subject accuracy"
              description="Accuracy and attempt volume across subjects."
              icon={BarChart3}
            >
              {subjectAccuracyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectAccuracyData} layout="vertical" margin={{ left: 20, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[0, 10, 10, 0]}>
                      {subjectAccuracyData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={entry.accuracy >= 75 ? "#22c55e" : entry.accuracy >= 55 ? "#3b82f6" : "#f59e0b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Subject analytics will show up once progress is saved." />
              )}
            </ChartCard>
          </ScrollReveal>

          <ScrollReveal delay={130}>
            <ChartCard
              title="Session mix"
              description="How your saved practice is distributed."
              icon={Trophy}
            >
              {analyticsSummary.testTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsSummary.testTypeDistribution}
                      dataKey="attempts"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={112}
                      label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
                    >
                      {analyticsSummary.testTypeDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Your test-type split will appear once you save practice sessions." />
              )}
            </ChartCard>
          </ScrollReveal>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ScrollReveal delay={150}>
            <div className="rounded-[28px] border bg-card/90 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Focus areas</h2>
                  <p className="text-sm text-muted-foreground">Topics where extra practice will help fastest.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {analyticsSummary.topicMetrics
                  .filter((topic) => topic.status !== "strong")
                  .slice(0, 6)
                  .map((topic) => (
                    <div key={topic.topicId} className="rounded-2xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{topic.topicName}</p>
                          <p className="text-xs text-muted-foreground">{topic.subjectName} · {topic.totalAttempts} attempts</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${topic.status === "weak" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                          {Math.round(topic.accuracy)}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={topic.status === "weak" ? "h-full bg-destructive" : "h-full bg-warning"}
                          style={{ width: `${Math.max(topic.accuracy, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                {analyticsSummary.topicMetrics.filter((topic) => topic.status !== "strong").length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No immediate weak zones. Your current topic mix looks healthy.</p>
                )}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={170}>
            <div className="rounded-[28px] border bg-card/90 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">AI insights</h2>
                  <p className="text-sm text-muted-foreground">
                    {loadingInsights ? "Refreshing study guidance..." : aiInsights?.source === "llm" ? "Fresh coach insights are ready." : "Using built-in guidance from your current history."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                {aiInsights?.summary || "Solve more questions and save a few more tests to unlock richer AI guidance."}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <InsightList title="Strengths" tone="text-success" items={aiInsights?.strengths || []} fallback="Your strongest patterns will appear here." />
                <InsightList title="Risks" tone="text-warning" items={aiInsights?.risks || []} fallback="No major risks detected yet." />
                <InsightList title="Recommendations" tone="text-primary" items={aiInsights?.recommendations || []} fallback="Next-step recommendations will appear here." />
              </div>
            </div>
          </ScrollReveal>
        </div>

        {topicStatusData.length > 0 && (
          <ScrollReveal delay={190}>
            <ChartCard
              title="Mastery distribution"
              description="A quick split of strong, developing, and weak topics."
              icon={Target}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {topicStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "16px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </ScrollReveal>
        )}

        <ScrollReveal delay={210}>
          <div className="text-center space-y-4 pb-6">
            <p className="text-sm text-muted-foreground">Ready to keep building momentum?</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/practice">
                <Button variant="hero" size="lg" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Start practice
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="outline" size="lg">
                  View history
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

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Target;
  tone: string;
}) {
  return (
    <div className="rounded-[24px] border bg-card/90 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border bg-card/90 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 h-80">
        {children}
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function InsightList({
  title,
  tone,
  items,
  fallback,
}: {
  title: string;
  tone: string;
  items: string[];
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/10 p-4">
      <p className={`text-sm font-semibold ${tone}`}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.slice(0, 3).map((item) => (
          <p key={item} className="text-sm leading-6 text-muted-foreground">{item}</p>
        ))}
        {items.length === 0 && (
          <p className="text-sm leading-6 text-muted-foreground">{fallback}</p>
        )}
      </div>
    </div>
  );
}
