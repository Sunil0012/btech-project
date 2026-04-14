import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { useStudentAssignments } from "@/hooks/useStudentAssignments";
import { visibleSubjects } from "@/data/subjects";
import { getQuestionsBySubject } from "@/data/questions";
import { studentSupabase } from "@/integrations/supabase/student-client";
import { generateAIChatReply, type AIChatMessage, type AITestInsight } from "@/lib/aiCoach";
import { Bot, RotateCcw, SendHorizonal, Sparkles, Zap } from "lucide-react";

const CHAT_STORAGE_PREFIX = "study_coach_chat_v1";

function getStarterOptions(subjectPerformance: {
  id: string;
  name: string;
  accuracy: number | null;
  total: number;
}[]) {
  const attempted = subjectPerformance.filter((subject) => subject.total > 0 && subject.accuracy !== null);
  const sorted = [...attempted].sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100));
  const weakest = sorted[0];
  const secondWeakest = sorted[1];

  return [
    weakest ? `Help me improve ${weakest.name}` : "Find my weakest area",
    weakest ? `Which topics in ${weakest.name} should I do first?` : "What should I study first?",
    "Create a study plan for this week",
    secondWeakest ? `How should I balance ${weakest?.name} and ${secondWeakest.name}?` : "What should I revise before my next mock?",
    "Give me a 3-day revision plan",
    "How should I analyze my mistakes?",
    "What should I do before a full mock test?",
    "Build a weekly study routine for me",
  ];
}

function getInitialCoachMessage(nextAssignmentTitle?: string | null): AIChatMessage {
  return {
    role: "assistant",
    content: nextAssignmentTitle
      ? `I am your study coach. Your next teacher-assigned task is "${nextAssignmentTitle}", and I can help you plan it along with revision, mock strategy, and mistake review.`
      : "I am your study coach. I can help with weak topics, revision plans, mock strategy, mistake analysis, and what to study next based on your performance.",
  };
}

export default function AICoachPage() {
  const { user, studentElo, subjectScores } = useStudentAuth();
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [guidedOptions, setGuidedOptions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastReplySource, setLastReplySource] = useState<"llm" | "fallback" | null>(null);
  const messagesRef = useRef<AIChatMessage[]>([]);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { assignments, syncing: assignmentsSyncing, liveUpdatesEnabled } = useStudentAssignments();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (!user) return;

    studentSupabase
      .from("test_history")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setTestHistory(data);
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

  const subjectPerformance = useMemo(() => {
    return visibleSubjects.map((subject) => {
      const score = subjectScores[subject.id];
      return {
        id: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        accuracy: score ? Math.round((score.correct / score.total) * 100) : null,
        total: score?.total || 0,
        correct: score?.correct || 0,
        totalQuestions: getQuestionsBySubject(subject.id).length,
      };
    });
  }, [subjectScores]);

  const totalAnswered = subjectPerformance.reduce((sum, subject) => sum + subject.total, 0);
  const totalCorrect = subjectPerformance.reduce((sum, subject) => sum + subject.correct, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const eloTier =
    studentElo >= 1800 ? "Expert" :
    studentElo >= 1600 ? "Advanced" :
    studentElo >= 1400 ? "Intermediate" :
    studentElo >= 1200 ? "Beginner" :
    "Novice";

  const weakTopics = useMemo(
    () =>
      subjectPerformance
        .filter((subject) => subject.total > 0 && subject.accuracy !== null)
        .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
        .slice(0, 3)
        .map((subject) => ({
          name: subject.name,
          accuracy: subject.accuracy,
          attempted: subject.total,
          totalQuestions: subject.totalQuestions,
        })),
    [subjectPerformance]
  );

  const strongTopics = useMemo(
    () =>
      subjectPerformance
        .filter((subject) => subject.total > 0 && subject.accuracy !== null)
        .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
        .slice(0, 3)
        .map((subject) => ({
          name: subject.name,
          accuracy: subject.accuracy,
          attempted: subject.total,
          totalQuestions: subject.totalQuestions,
        })),
    [subjectPerformance]
  );

  const recentTests: AITestInsight[] = useMemo(
    () =>
      testHistory.map((test) => ({
        type: test.test_type,
        correct: test.correct_answers,
        total: test.total_questions,
        completedAt: test.completed_at,
      })),
    [testHistory]
  );

  const quickPrompts = useMemo(() => {
    const weakest = weakTopics[0]?.name || "my weakest subject";
    const strongest = strongTopics[0]?.name || "my strongest subject";
    const nextAssignment = assignments.find((assignment) => !assignment.submission);

    return [
      {
        label: nextAssignment ? "Assigned work" : "Today's plan",
        description: nextAssignment ? "Prepare for the next teacher-assigned task." : "A focused study block for the next session.",
        prompt: nextAssignment ? `How should I prepare for my assignment "${nextAssignment.title}"?` : `What should I study today if ${weakest} is my weakest area?`,
      },
      {
        label: "Weakest area",
        description: "Find the subject dragging my score down.",
        prompt: "Find my weakest area",
      },
      {
        label: "Weekly revision",
        description: "Build a realistic 7-day revision flow.",
        prompt: "Create a study plan for this week",
      },
      {
        label: "Balance subjects",
        description: "Split time between weak and strong areas.",
        prompt: `How should I balance ${weakest} and ${strongest} this week?`,
      },
      {
        label: "Mistake review",
        description: "Turn recent mistakes into revision targets.",
        prompt: "How should I analyze my mistakes and fix them fast?",
      },
      {
        label: "Mock strategy",
        description: "Plan before and after a full test.",
        prompt: "Give me a strategy for my next full mock test.",
      },
    ];
  }, [assignments, strongTopics, weakTopics]);

  useEffect(() => {
    const nextAssignment = assignments.find((assignment) => !assignment.submission);
    const storageKey = `${CHAT_STORAGE_PREFIX}:${user?.id || "guest"}`;
    const starters = getStarterOptions(subjectPerformance);
    setGuidedOptions(starters);

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { messages?: AIChatMessage[]; guidedOptions?: string[] };
        const storedMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
        if (storedMessages.length > 0) {
          messagesRef.current = storedMessages;
          setMessages(storedMessages);
          if (Array.isArray(parsed.guidedOptions) && parsed.guidedOptions.length > 0) {
            setGuidedOptions(parsed.guidedOptions);
          }
          return;
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }

    const intro = getInitialCoachMessage(nextAssignment?.title);
    messagesRef.current = [intro];
    setMessages([intro]);
    setLastReplySource(null);
  }, [assignments, subjectPerformance, user?.id]);

  useEffect(() => {
    if (!user) return;
    const storageKey = `${CHAT_STORAGE_PREFIX}:${user.id}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        messages,
        guidedOptions,
      })
    );
  }, [guidedOptions, messages, user]);

  const handleReset = () => {
    const starters = getStarterOptions(subjectPerformance);
    const nextAssignment = assignments.find((assignment) => !assignment.submission);
    const intro: AIChatMessage = getInitialCoachMessage(nextAssignment?.title);
    messagesRef.current = [intro];
    setMessages([intro]);
    setGuidedOptions(starters);
    setDraft("");
    setLastReplySource(null);
    composerRef.current?.focus();
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages: AIChatMessage[] = [...messagesRef.current, { role: "user", content: trimmed }];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    try {
      const reply = await generateAIChatReply({
        studentName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student",
        elo: studentElo,
        tier: eloTier,
        overallAccuracy,
        totalAnswered,
        streak,
        weakTopics,
        strongTopics,
        subjectPerformance: subjectPerformance.map((subject) => ({
          name: subject.name,
          accuracy: subject.accuracy,
          attempted: subject.total,
          totalQuestions: subject.totalQuestions,
        })),
        recentTests,
        focusArea: trimmed,
        messages: nextMessages,
      });

      const updatedMessages: AIChatMessage[] = [...nextMessages, { role: "assistant", content: reply.message }];
      messagesRef.current = updatedMessages;
      setMessages(updatedMessages);
      setGuidedOptions(reply.nextOptions.length > 0 ? reply.nextOptions : getStarterOptions(subjectPerformance));
      setLastReplySource(reply.source);
    } finally {
      setLoading(false);
      setTimeout(() => composerRef.current?.focus(), 0);
    }
  };

  const summaryChips = [
    `${eloTier} tier`,
    `${overallAccuracy}% accuracy`,
    `${totalAnswered} solved`,
    `${streak} day streak`,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container flex-1 py-6">
        <ScrollReveal>
          <div className="mx-auto mb-6 max-w-5xl">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Study Coach</h1>
                <p className="text-muted-foreground">
                  Chat naturally about your preparation and get focused help for GATE DA.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {summaryChips.map((chip) => (
                  <span key={chip} className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {quickPrompts.map((item) => (
                <button
                  key={item.label}
                  onClick={() => void sendMessage(item.prompt)}
                  className="rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={60}>
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="border-b bg-gradient-to-r from-primary/10 via-background to-accent/10 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Chat with your coach</p>
                    {liveUpdatesEnabled && assignments.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {assignmentsSyncing
                          ? "Refreshing teacher-assigned work context..."
                          : `${assignments.filter((assignment) => !assignment.submission).length} active classroom task(s) in context.`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    lastReplySource === "llm"
                      ? "bg-success/10 text-success"
                      : lastReplySource === "fallback"
                        ? "bg-warning/10 text-warning"
                        : "bg-primary/10 text-primary"
                  }`}>
                    {lastReplySource === "llm"
                      ? "Coach online"
                      : lastReplySource === "fallback"
                        ? "Guided reply"
                        : "Ready"}
                  </span>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" />
                    New chat
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[620px] px-4 py-5 md:px-6">
              <div className="space-y-5">
                {messages.map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  const isLatestAssistant = isAssistant && index === messages.length - 1 && !loading;

                  return (
                    <div key={`${message.role}-${index}`} className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}>
                      {isAssistant && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}

                      <div className={`max-w-[88%] ${isAssistant ? "" : "order-first"}`}>
                        <div
                          className={`rounded-3xl px-4 py-3 text-sm leading-7 ${
                            isAssistant
                              ? "border bg-muted/60 text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {message.content}
                        </div>

                        {isLatestAssistant && guidedOptions.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <Sparkles className="h-3.5 w-3.5" />
                              Suggested follow-ups
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {guidedOptions.slice(0, 8).map((option) => (
                                <button
                                  key={option}
                                  onClick={() => void sendMessage(option)}
                                  className="rounded-full border bg-background px-3 py-2 text-xs transition-colors hover:bg-muted"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {!isAssistant && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                          You
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="max-w-[88%] rounded-3xl border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse [animation-delay:120ms]" />
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse [animation-delay:240ms]" />
                        </span>
                        Building your next study step...
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t bg-background/90 p-4 md:p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  "Find my weakest area",
                  "What should I revise before my next mock?",
                  "Give me a 3-day revision plan",
                  "How should I analyze my mistakes?",
                  "How do I improve mock score steadily?",
                  "Make a revision order for all my weak subjects",
                  "Which topic should I finish today?",
                  "How should I split time between practice and revision?",
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => void sendMessage(preset)}
                    className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="rounded-3xl border bg-card p-3 shadow-sm">
                <Textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(draft);
                    }
                  }}
                  placeholder="Type your message..."
                  className="min-h-[110px] resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Button
                    variant="hero"
                    className="gap-2 self-end"
                    disabled={loading || !draft.trim()}
                    onClick={() => void sendMessage(draft)}
                  >
                    <Zap className="h-4 w-4" />
                    Send
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
      <Footer />
    </div>
  );
}
