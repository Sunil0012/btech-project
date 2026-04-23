import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { GateScorePrediction } from "@/components/GateScorePrediction";
import { JoinCourseModal } from "@/components/JoinCourseModal";
import { StudentTopicMasteryPanel } from "@/components/StudentTopicMasteryPanel";
import { useStudentAuth } from "@/contexts/AuthContext";
import { useStudentAssignments } from "@/hooks/useStudentAssignments";
import { visibleSubjects } from "@/data/subjects";
import { getQuestionById, getQuestionsBySubject, questions as allQuestions } from "@/data/questions";
import { availableFullTests } from "@/data/fullTests";
import { getAssignmentSubjectLabel } from "@/lib/classroom";
import { buildStudentAnalyticsSummary } from "@/lib/studentAnalytics";
import { studentSupabase } from "@/integrations/supabase/student-client";
import type { StudentTables } from "@/integrations/supabase/student-types";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { generateAIInsights, AIInsightResult } from "@/lib/aiCoach";
import {
  BarChart3, TrendingUp, Target, ArrowRight,
  AlertTriangle, Trophy, Brain, Play,
  Zap, Flame, Clock, Award, Sparkles,
  BookOpen, RotateCcw, FileText, Link2,
} from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export default function DashboardPage() {
  const { user, studentElo, subjectScores, answeredQuestions, enrolledCourses, hasRequiredCourse, leaveCourse } = useStudentAuth();
  const [testHistory, setTestHistory] = useState<StudentTables<"test_history">[]>([]);
  const [userProgress, setUserProgress] = useState<StudentTables<"user_progress">[]>([]);
  const [activityRows, setActivityRows] = useState<StudentTables<"activity_events">[]>([]);
  const [streak, setStreak] = useState(0);
  const [aiInsights, setAiInsights] = useState<AIInsightResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [leavingCourseId, setLeavingCourseId] = useState<string | null>(null);
  const {
    assignments,
    nextAssignment,
    syncing: assignmentsSyncing,
    lastUpdatedAt: assignmentsUpdatedAt,
    liveUpdatesEnabled,
  } = useStudentAssignments();

  useEffect(() => {
    if (!user) return;
    studentSupabase
      .from("test_history")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTestHistory(data);
      });

    studentSupabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setUserProgress(data);
      });

    studentSupabase
      .from("activity_events")
      .select("*")
      .or(`actor_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setActivityRows(data);
      });

    studentSupabase
      .from("profiles")
      .select("streak_count")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setStreak(data.streak_count);
      });
  }, [user]);

  const totalQuestions = allQuestions.length;
  const analyticsSummary = useMemo(() => buildStudentAnalyticsSummary({
    testHistory,
    userProgress,
    activityRows,
    profileStreak: streak,
    totalQuestionBankCount: totalQuestions,
  }), [activityRows, streak, testHistory, totalQuestions, userProgress]);

  const mergedSubjectScores = useMemo(() => {
    const merged = { ...subjectScores };

    analyticsSummary.subjectMetrics.forEach((metric) => {
      const current = merged[metric.subjectId];
      if (!current || current.total === 0) {
        merged[metric.subjectId] = {
          correct: metric.correctAnswers,
          total: metric.totalAnswers,
        };
      }
    });

    return merged;
  }, [analyticsSummary.subjectMetrics, subjectScores]);

  const totalAnswered = Math.max(
    Object.values(mergedSubjectScores).reduce((a, s) => a + s.total, 0),
    analyticsSummary.questionsAnswered
  );
  const totalCorrect = Math.max(
    Object.values(mergedSubjectScores).reduce((a, s) => a + s.correct, 0),
    analyticsSummary.correctAnswers
  );
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const solvedCoveragePercent = Math.max(
    totalQuestions > 0 ? (answeredQuestions.size / totalQuestions) * 100 : 0,
    analyticsSummary.coveragePercent
  );
  const displayStreak = Math.max(streak, analyticsSummary.currentStreak);
  const totalTopicCount = visibleSubjects.reduce((sum, subject) => sum + subject.topics.length, 0);
  const masteryThresholds = useMemo(() => {
    if (studentElo >= 1700) return { weak: 68, strong: 84, minAttempts: 8 };
    if (studentElo >= 1500) return { weak: 64, strong: 80, minAttempts: 6 };
    if (studentElo >= 1300) return { weak: 60, strong: 76, minAttempts: 4 };
    return { weak: 56, strong: 72, minAttempts: 3 };
  }, [studentElo]);

  const completion = useMemo(() => {
    const fullMockAttempts = new Set(
      testHistory
        .filter((test) => test.test_type === "full-mock")
        .map((test) => {
          const subjectPart = typeof test.subject_id === "string" ? test.subject_id : "";
          const topicPart = typeof test.topic_id === "string" ? test.topic_id : "";
          const completedAt = typeof test.completed_at === "string" ? test.completed_at.slice(0, 10) : "";
          return `${subjectPart}::${topicPart}::${completedAt}::${test.score}`;
        })
    ).size;
    const topicWiseTopics = new Set(
      testHistory
        .filter((test) => test.test_type === "topic-wise" && typeof test.topic_id === "string")
        .map((test) => test.topic_id)
    ).size;
    const adaptiveSubjects = new Set(
      testHistory
        .filter((test) => test.test_type === "adaptive" && typeof test.subject_id === "string")
        .map((test) => test.subject_id)
    ).size;

    return {
      fullMockPercent: Math.min(100, Math.round((fullMockAttempts / Math.max(availableFullTests.length, 1)) * 100)),
      topicWisePercent: Math.min(100, Math.round((topicWiseTopics / Math.max(totalTopicCount, 1)) * 100)),
      adaptivePercent: Math.min(100, Math.round((adaptiveSubjects / Math.max(visibleSubjects.length, 1)) * 100)),
    };
  }, [testHistory, totalTopicCount]);

  const subjectPerformance = useMemo(() => (
    visibleSubjects.map((s) => {
      const score = subjectScores[s.id];
      const fallbackScore = mergedSubjectScores[s.id];
      const resolvedScore = score?.total ? score : fallbackScore;
      const accuracy = resolvedScore && resolvedScore.total > 0 ? Math.round((resolvedScore.correct / resolvedScore.total) * 100) : null;
      const attempted = resolvedScore?.total || 0;
      const totalQs = getQuestionsBySubject(s.id).length;
      const coverage = totalQs > 0 ? Math.round((attempted / totalQs) * 100) : 0;
      const masteryScore = accuracy === null ? 0 : Math.round(accuracy * 0.78 + coverage * 0.22);

      return {
        ...s,
        score: resolvedScore,
        accuracy,
        coverage,
        masteryScore,
        totalQs,
        isWeak:
          accuracy !== null &&
          attempted >= masteryThresholds.minAttempts &&
          masteryScore < masteryThresholds.weak,
        isStrong:
          accuracy !== null &&
          attempted >= masteryThresholds.minAttempts &&
          masteryScore >= masteryThresholds.strong,
      };
    })
  ), [masteryThresholds.minAttempts, masteryThresholds.strong, masteryThresholds.weak, mergedSubjectScores, subjectScores]);

  const weakTopics = useMemo(
    () => subjectPerformance.filter((s) => s.isWeak).sort((left, right) => left.masteryScore - right.masteryScore),
    [subjectPerformance]
  );
  const strongTopics = useMemo(
    () => subjectPerformance.filter((s) => s.isStrong).sort((left, right) => right.masteryScore - left.masteryScore),
    [subjectPerformance]
  );

  const eloTier = studentElo >= 1800 ? "Expert" : studentElo >= 1600 ? "Advanced" : studentElo >= 1400 ? "Intermediate" : studentElo >= 1200 ? "Beginner" : "Novice";
  const eloColor = studentElo >= 1800 ? "text-warning" : studentElo >= 1600 ? "text-primary" : studentElo >= 1400 ? "text-accent" : "text-muted-foreground";

  const subjectChartData = subjectPerformance
    .filter((s) => s.score)
    .map((s) => ({
      name: s.shortName,
      accuracy: s.accuracy || 0,
      fill: `hsl(${s.color})`,
    }));

  const accuracyRadial = [{ name: "Accuracy", value: overallAccuracy, fill: "hsl(var(--primary))" }];
  const solvedDifficultyBreakdown = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0 };

    answeredQuestions.forEach((questionId) => {
      const question = getQuestionById(questionId);
      if (!question) return;
      counts[question.difficulty] += 1;
    });

    return counts;
  }, [answeredQuestions]);

  const topicMasteryGraphData = useMemo(() => {
    return analyticsSummary.topicMetrics.map((topic) => ({
      id: topic.topicId,
      label: topic.topicName,
      subjectLabel: topic.subjectName,
      accuracy: Math.round(topic.accuracy),
      attempts: topic.totalAttempts,
      status: topic.status,
    }));
  }, [analyticsSummary.topicMetrics]);

  // Recommended next action
  const getRecommendation = () => {
    if (!hasRequiredCourse) {
      return {
        text: "Join your first course from the dashboard using a course code or invite link to unlock practice and tests.",
        action: "/dashboard",
        label: "Join a Course",
      };
    }
    const nextAssignmentRecommendation = assignments.find((assignment) => !assignment.submission);
    if (nextAssignmentRecommendation) {
      return {
        text: `Teacher assigned "${nextAssignmentRecommendation.title}". Focus on ${getAssignmentSubjectLabel(nextAssignmentRecommendation)} next.`,
        action: `/assignments/${nextAssignmentRecommendation.id}`,
        label: "Open Assignment",
      };
    }
    if (totalAnswered === 0) return { text: "Start your first practice session", action: "/subjects", label: "Start Learning" };
    if (weakTopics.length > 0) return { text: `Focus on ${weakTopics[0].name} - your weakest subject`, action: `/subjects/${weakTopics[0].id}`, label: "Study Now" };
    const leastPracticed = subjectPerformance.filter((subject) => !subject.score).at(0);
    if (leastPracticed) return { text: `Try ${leastPracticed.name} - you haven't started yet`, action: `/subjects/${leastPracticed.id}`, label: "Explore" };
    return { text: "Great progress! Keep practicing to maintain your streak", action: "/subjects", label: "Continue" };
  };

  const recommendation = getRecommendation();

  const summaryText = useMemo(() => {
    const text = loadingInsights ? "Generating fresh study insights..." : aiInsights?.summary || "No insights available yet.";
    return text
      .replace(/â€”/g, "-")
      .replace(/â€™/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }, [loadingInsights, aiInsights]);

  useEffect(() => {
    const loadInsights = async () => {
      setLoadingInsights(true);
      try {
        const insights = await generateAIInsights({
          studentName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student",
          elo: studentElo,
          tier: eloTier,
          overallAccuracy,
          totalAnswered,
          streak: displayStreak,
          weakTopics: weakTopics.map((subject) => ({
            name: subject.name,
            accuracy: subject.accuracy,
            attempted: subject.score?.total || 0,
            totalQuestions: subject.totalQs,
          })),
          strongTopics: strongTopics.map((subject) => ({
            name: subject.name,
            accuracy: subject.accuracy,
            attempted: subject.score?.total || 0,
            totalQuestions: subject.totalQs,
          })),
          subjectPerformance: subjectPerformance.map((subject) => ({
            name: subject.name,
            accuracy: subject.accuracy,
            attempted: subject.score?.total || 0,
            totalQuestions: subject.totalQs,
          })),
          recentTests: testHistory.map((test) => ({
            type: test.test_type,
            correct: test.correct_answers,
            total: test.total_questions,
            completedAt: test.completed_at,
          })),
        });
        setAiInsights(insights);
      } finally {
        setLoadingInsights(false);
      }
    };

    void loadInsights();
  }, [user, studentElo, eloTier, overallAccuracy, totalAnswered, displayStreak, weakTopics, strongTopics, subjectPerformance, testHistory]);

  const handleLeaveCourse = async (courseId: string, courseTitle: string) => {
    const confirmed = window.confirm(
      `Leave "${courseTitle}"?\n\nYou will lose access to this course's assignments and teacher-linked classroom access until you join it again.`
    );
    if (!confirmed) return;

    setLeavingCourseId(courseId);
    try {
      await leaveCourse(courseId);
      toast({
        title: "Course left",
        description: `You left ${courseTitle}. You can join again later with the same invite code or link.`,
      });
    } catch (error) {
      toast({
        title: "Could not leave course",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeavingCourseId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container py-6 flex-1">
        {/* Header */}
        <ScrollReveal>
          <div className="mb-8">
            <h1 className="text-2xl font-bold">
              {user ? `Welcome back, ${user.user_metadata?.full_name || user.email?.split("@")[0]}` : "Dashboard"}
            </h1>
            <p className="text-muted-foreground">Your GateWay preparation overview.</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={20}>
          {!hasRequiredCourse && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm mb-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary" /> Join your first course
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Paste a course code or invite link from your teacher. Your dashboard stays available now, and practice, tests, coach, and assignments unlock after you join at least one course.
                  </p>
                </div>
                <JoinCourseModal triggerLabel="Join with code or link" />
              </div>
            </div>
          )}

          {/* Courses Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="h-5 w-5 text-accent" /> Your Courses
              </h2>
              <JoinCourseModal triggerLabel="Join course" />
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No courses joined yet.</p>
                <p className="text-sm text-muted-foreground">Use a course code or invite link from your teacher to join your first classroom.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {enrolledCourses.map((enrollment) => {
                  const courseCode = enrollment.course?.join_code || "—";
                  const courseName = enrollment.course?.title || "Untitled Course";
                  const courseColor = `hsl(${Math.abs(courseName.charCodeAt(0)) % 360}, 70%, 60%)`;

                  return (
                    <Link
                      key={enrollment.id}
                      to={`/student/courses/${enrollment.course_id}`}
                      className="group"
                    >
                      <div
                        className="relative h-40 rounded-2xl overflow-hidden border-2 border-muted hover:shadow-lg transition-all cursor-pointer group-hover:border-primary/50"
                        style={{
                          background: `linear-gradient(135deg, hsl(${(enrollment.course_id.charCodeAt(0) * 137) % 360}, 65%, 55%) 0%, hsl(${(enrollment.course_id.charCodeAt(1) * 137) % 360}, 60%, 50%) 100%)`,
                        }}
                      >
                        <div className="p-6 h-full flex flex-col justify-between text-white relative z-10">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest opacity-90 mb-2">Course Code</p>
                            <p className="text-2xl font-bold font-mono break-words">{courseCode}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium line-clamp-2">{courseName}</p>
                          </div>
                        </div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity pointer-events-none" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <ScrollReveal delay={0}>
            <Link to="/subjects" className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Continue Practice</h3>
                <p className="text-xs text-muted-foreground mt-1">Pick up where you left off</p>
              </div>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <Link to="/practice?mode=full-mock" className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
                  <RotateCcw className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-sm">Full Mock Test</h3>
                <p className="text-xs text-muted-foreground mt-1">GATE-style 3hr test</p>
              </div>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            <Link to="/ai-coach" className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <Brain className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-sm">Study Coach</h3>
                <p className="text-xs text-muted-foreground mt-1">Guided chat based on weak areas</p>
              </div>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={180}>
            <Link to="/insights" className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center mb-3">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <h3 className="font-semibold text-sm">View Analysis</h3>
                <p className="text-xs text-muted-foreground mt-1">Detailed performance</p>
              </div>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={240}>
            <Link to="/settings" className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <h3 className="font-semibold text-sm">Settings</h3>
                <p className="text-xs text-muted-foreground mt-1">Profile & preferences</p>
              </div>
            </Link>
          </ScrollReveal>
        </div>

        {/* Recommendation Banner */}
        <ScrollReveal>
          <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20 rounded-xl p-5 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Study Recommendation</p>
                <p className="text-sm text-muted-foreground">{recommendation.text}</p>
              </div>
            </div>
            {hasRequiredCourse ? (
              <Link to={recommendation.action}>
                <Button variant="hero" size="sm" className="gap-1 shrink-0">
                  {recommendation.label} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            ) : (
              <JoinCourseModal triggerLabel={recommendation.label} />
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={40}>
          <div className="bg-card border rounded-xl p-5 shadow-sm mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" /> Study Insights
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiInsights?.source === "llm"
                    ? "Fresh coach insights are ready."
                    : "Using built-in study insights from your current progress."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  setLoadingInsights(true);
                  const insights = await generateAIInsights({
                    studentName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student",
                    elo: studentElo,
                    tier: eloTier,
                    overallAccuracy,
                    totalAnswered,
                    streak: displayStreak,
                    weakTopics: weakTopics.map((subject) => ({
                      name: subject.name,
                      accuracy: subject.accuracy,
                      attempted: subject.score?.total || 0,
                      totalQuestions: subject.totalQs,
                    })),
                    strongTopics: strongTopics.map((subject) => ({
                      name: subject.name,
                      accuracy: subject.accuracy,
                      attempted: subject.score?.total || 0,
                      totalQuestions: subject.totalQs,
                    })),
                    subjectPerformance: subjectPerformance.map((subject) => ({
                      name: subject.name,
                      accuracy: subject.accuracy,
                      attempted: subject.score?.total || 0,
                      totalQuestions: subject.totalQs,
                    })),
                    recentTests: testHistory.map((test) => ({
                      type: test.test_type,
                      correct: test.correct_answers,
                      total: test.total_questions,
                      completedAt: test.completed_at,
                    })),
                  });
                  setAiInsights(insights);
                  setLoadingInsights(false);
                }}
              >
                {loadingInsights ? "Analyzing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_1fr_1fr] gap-4">
              <div className="rounded-xl border bg-primary/5 border-primary/10 p-4 min-h-[190px] overflow-hidden">
                <p className="text-xs uppercase tracking-wide text-primary mb-2">Summary</p>
                <p className="text-sm text-muted-foreground break-words leading-6 whitespace-pre-wrap [overflow-wrap:anywhere] max-h-[132px] overflow-y-auto pr-1">
                  {summaryText}
                </p>
                <div className="mt-4">
                  <Link to="/ai-coach">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Brain className="h-4 w-4" />
                      Open Coach
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border p-4 min-h-[190px] overflow-hidden">
                <p className="text-xs uppercase tracking-wide text-success mb-2">Strengths</p>
                <div className="space-y-2">
                  {(aiInsights?.strengths || []).slice(0, 3).map((item) => (
                    <p key={item} className="text-sm text-muted-foreground break-words leading-6">{item}</p>
                  ))}
                  {!loadingInsights && (!aiInsights || aiInsights.strengths.length === 0) && (
                    <p className="text-sm text-muted-foreground break-words leading-6">Keep practicing to unlock clearer strength signals.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4 min-h-[190px] overflow-hidden">
                <p className="text-xs uppercase tracking-wide text-warning mb-2">Next Moves</p>
                <div className="space-y-2">
                  {(aiInsights?.recommendations || []).slice(0, 3).map((item) => (
                    <p key={item} className="text-sm text-muted-foreground break-words leading-6">{item}</p>
                  ))}
                  {!loadingInsights && (!aiInsights || aiInsights.recommendations.length === 0) && (
                    <p className="text-sm text-muted-foreground break-words leading-6">Take a few more questions or open the coach to generate richer guidance.</p>
                  )}
                </div>
              </div>
            </div>

            {aiInsights && aiInsights.risks.length > 0 && (
              <div className="mt-4 rounded-xl border border-destructive/10 bg-destructive/5 p-4">
                <p className="text-xs uppercase tracking-wide text-destructive mb-2">Risk Watch</p>
                <div className="space-y-2">
                  {aiInsights.risks.slice(0, 2).map((item) => (
                    <p key={item} className="text-sm text-muted-foreground">{item}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* GATE Score Prediction Section */}
        <ScrollReveal delay={60}>
          <GateScorePrediction
            studentElo={studentElo}
            answeredQuestionsCount={answeredQuestions.size}
            overallAccuracy={overallAccuracy}
            completion={completion}
            subjectPerformance={subjectPerformance}
            testHistory={testHistory}
          />
        </ScrollReveal>

        <div className="mb-8" />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <ScrollReveal delay={0}>
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ELO Rating</p>
                  <p className={`text-2xl font-bold ${eloColor}`}>{studentElo}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Award className="h-3 w-3 text-warning" />
                <span className="text-xs font-medium">{eloTier}</span>
              </div>
            </div>
          </ScrollReveal>

          {[
            { label: "Questions Solved", value: answeredQuestions.size, icon: Target, color: "text-accent", sub: `of ${totalQuestions}` },
            { label: "Accuracy", value: `${overallAccuracy}%`, icon: BarChart3, color: overallAccuracy >= 60 ? "text-success" : "text-destructive", sub: `${totalCorrect}/${totalAnswered}` },
            { label: "Streak", value: `${displayStreak} days`, icon: Flame, color: "text-warning", sub: "Keep it up!" },
            { label: "Tests Taken", value: testHistory.length, icon: Clock, color: "text-primary", sub: "Total sessions" },
          ].map((stat, i) => (
            <ScrollReveal key={stat.label} delay={(i + 1) * 60}>
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={40}>
          <div className="mb-8">
            <StudentTopicMasteryPanel
              totalSolved={Math.max(answeredQuestions.size, analyticsSummary.uniqueCorrectQuestions)}
              totalSubmissions={totalAnswered}
              acceptanceRate={overallAccuracy}
              coveragePercent={solvedCoveragePercent}
              difficultyBreakdown={
                answeredQuestions.size > 0
                  ? solvedDifficultyBreakdown
                  : analyticsSummary.difficultyBreakdown
              }
              topics={topicMasteryGraphData}
              compact
            />
          </div>
        </ScrollReveal>

        {/* Charts */}
        {totalAnswered > 0 && (
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            <ScrollReveal>
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Overall Accuracy
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={accuracyRadial} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-3xl font-bold -mt-4">{overallAccuracy}%</p>
                <p className="text-center text-xs text-muted-foreground">Overall accuracy</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={80}>
              <div className="bg-card border rounded-xl p-5 shadow-sm lg:col-span-2">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Subject-wise Accuracy
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px", fontSize: "12px",
                      }} />
                      <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                        {subjectChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* Weak vs Strong Topics */}
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          {weakTopics.length > 0 && (
            <ScrollReveal>
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Weak Topics
                </h3>
                <div className="space-y-3">
                  {weakTopics.map((s) => (
                    <Link key={s.id} to={`/subjects/${s.id}`} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `hsl(${s.color} / 0.1)`, color: `hsl(${s.color})` }}>
                          {s.shortName}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">Mastery {s.masteryScore}% | Coverage {s.coverage}%</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-destructive">{s.accuracy}%</span>
                    </Link>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}

          {strongTopics.length > 0 && (
            <ScrollReveal delay={80}>
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" /> Strong Topics
                </h3>
                <div className="space-y-3">
                  {strongTopics.map((s) => (
                    <Link key={s.id} to={`/subjects/${s.id}`} className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10 hover:bg-success/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `hsl(${s.color} / 0.1)`, color: `hsl(${s.color})` }}>
                          {s.shortName}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">Mastery {s.masteryScore}% | Coverage {s.coverage}%</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-success">{s.accuracy}%</span>
                    </Link>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* Completed Tests */}
        {testHistory.length > 0 && (
          <ScrollReveal>
            <div className="bg-card border rounded-xl p-5 shadow-sm mb-8">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Completed Tests And Assignments
              </h3>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {testHistory.map((test) => {
                  const accuracy = test.total_questions > 0
                    ? Math.round((test.correct_answers / test.total_questions) * 100)
                    : 0;
                  const durationText = test.duration_seconds
                    ? `${Math.max(1, Math.round(test.duration_seconds / 60))} min`
                    : "Untimed";

                  return (
                  <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        test.test_type === "full-mock" ? "bg-destructive/10 text-destructive" :
                        test.test_type === "adaptive" ? "bg-primary/10 text-primary" :
                        test.test_type.startsWith("assignment") ? "bg-warning/10 text-warning" :
                        "bg-accent/10 text-accent"
                      }`}>
                        {test.test_type === "full-mock"
                          ? "FM"
                          : test.test_type === "adaptive"
                            ? "AD"
                            : test.test_type.startsWith("assignment")
                              ? "AS"
                              : "TW"}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{test.test_type.replace("-", " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(test.completed_at).toLocaleString()} • {durationText}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{test.score}/{test.max_score}</p>
                      <p className="text-xs text-muted-foreground">{accuracy}% accuracy • {test.correct_answers}/{test.total_questions}</p>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Empty state */}
        {totalAnswered === 0 && (
          <ScrollReveal delay={200}>
            <div className="bg-card border rounded-xl p-8 text-center space-y-4">
              <Brain className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Start Your Preparation</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Begin practicing to see your progress, get personalized recommendations, and track weak areas.
              </p>
              <Link to="/subjects">
                <Button variant="hero" size="lg" className="gap-2">
                  <Play className="h-4 w-4" /> Explore Subjects
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
      <Footer />
    </div>
  );
}
