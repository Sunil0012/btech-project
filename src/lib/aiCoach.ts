import { generateWithOllama } from "./ollama";

const AI_SETTINGS_KEY = "gate_ai_settings";

export interface AISettings {
  provider: "gemini" | "ollama" | "fallback";
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AISubjectInsight {
  name: string;
  accuracy: number | null;
  attempted: number;
  totalQuestions: number;
}

export interface AITestInsight {
  type: string;
  correct: number;
  total: number;
  completedAt: string;
}

export interface AIInsightInput {
  studentName?: string;
  elo: number;
  tier: string;
  overallAccuracy: number;
  totalAnswered: number;
  streak: number;
  weakTopics: AISubjectInsight[];
  strongTopics: AISubjectInsight[];
  subjectPerformance: AISubjectInsight[];
  recentTests: AITestInsight[];
}

export interface AIInsightResult {
  summary: string;
  recommendations: string[];
  strengths: string[];
  risks: string[];
  source: "llm" | "fallback";
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatInput extends AIInsightInput {
  focusArea: string;
  messages: AIChatMessage[];
}

export interface AIChatResult {
  message: string;
  nextOptions: string[];
  source: "llm" | "fallback";
}

const envProvider = import.meta.env.VITE_AI_PROVIDER;
const hasGeminiApiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());
const isOllamaExplicitlyEnabled = envProvider === "ollama";

const defaultProvider: AISettings["provider"] =
  envProvider === "gemini"
    ? "gemini"
    : envProvider === "ollama"
      ? "ollama"
      : hasGeminiApiKey
        ? "gemini"
        : "fallback";

const MANAGED_OLLAMA_BASE_URL = "server-proxy";

const defaultSettings: AISettings = {
  provider: defaultProvider,
  apiKey:
    defaultProvider === "gemini"
      ? import.meta.env.VITE_GEMINI_API_KEY || ""
      : "",
  model:
    defaultProvider === "gemini"
      ? import.meta.env.VITE_AI_MODEL || "gemini-2.0-flash"
      : defaultProvider === "ollama"
        ? import.meta.env.VITE_OLLAMA_MODEL || "llama3:latest"
        : "fallback",
  baseUrl:
    defaultProvider === "gemini"
      ? import.meta.env.VITE_GEMINI_URL || "https://generativelanguage.googleapis.com/v1beta"
      : defaultProvider === "ollama"
        ? MANAGED_OLLAMA_BASE_URL
      : "",
};

function resolveProviderPreference(rawProvider?: AISettings["provider"]): AISettings["provider"] {
  if (envProvider === "gemini") return "gemini";
  if (envProvider === "ollama") return "ollama";
  if (rawProvider === "gemini") return "gemini";
  if (rawProvider === "fallback") return "fallback";
  if (rawProvider === "ollama" && isOllamaExplicitlyEnabled) return "ollama";
  return defaultProvider;
}

function normalizeAISettings(raw?: Partial<AISettings>): AISettings {
  const merged: AISettings = {
    ...defaultSettings,
    ...raw,
    provider: resolveProviderPreference(raw?.provider),
  };

  const normalizedModel = merged.model?.trim() || defaultSettings.model;
  const normalizedBaseUrl = merged.baseUrl?.trim() || defaultSettings.baseUrl;

  if (merged.provider === "ollama") {
    return {
      provider: "ollama",
      apiKey: "",
      model: normalizedModel || "llama3:latest",
      baseUrl:
        normalizedBaseUrl === MANAGED_OLLAMA_BASE_URL || normalizedBaseUrl === "supabase-proxy"
          ? MANAGED_OLLAMA_BASE_URL
          : normalizedBaseUrl.startsWith("http")
            ? normalizedBaseUrl
            : MANAGED_OLLAMA_BASE_URL,
    };
  }

  if (merged.provider === "fallback") {
    return {
      provider: "fallback",
      apiKey: "",
      model: "fallback",
      baseUrl: "",
    };
  }

  const isLegacyModel =
    normalizedModel.includes("/") ||
    normalizedModel.includes(":free") ||
    normalizedModel.startsWith("openrouter");

  return {
    provider: "gemini",
    apiKey: merged.apiKey?.trim() || "",
    model: isLegacyModel ? defaultSettings.model : normalizedModel,
    baseUrl: normalizedBaseUrl.includes("generativelanguage.googleapis.com")
      ? normalizedBaseUrl
      : defaultSettings.baseUrl,
  };
}

export function getAISettings(): AISettings {
  const fallbackSettings = normalizeAISettings(defaultSettings);

  try {
    const stored = localStorage.getItem(AI_SETTINGS_KEY);
    if (!stored) return fallbackSettings;

    const parsed = JSON.parse(stored) as Partial<AISettings>;
    const normalized = normalizeAISettings(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    localStorage.removeItem(AI_SETTINGS_KEY);
    return fallbackSettings;
  }
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(normalizeAISettings(settings)));
}

function buildFallbackInsights(input: AIInsightInput): AIInsightResult {
  const topWeak = input.weakTopics[0];
  const topStrong = input.strongTopics[0];
  const untouched = input.subjectPerformance.find((subject) => subject.attempted === 0);
  const lastTest = input.recentTests[0];

  const summaryParts = [
    `${input.studentName || "You"} are currently in the ${input.tier} tier with an ELO of ${input.elo}.`,
    `Overall accuracy is ${input.overallAccuracy}% across ${input.totalAnswered} solved questions.`,
    input.streak > 0 ? `Your current streak is ${input.streak} day${input.streak === 1 ? "" : "s"}.` : "You do not have an active streak yet.",
  ];

  const recommendations = [
    topWeak
      ? `Spend your next focused session on ${topWeak.name}; it is your weakest area at ${topWeak.accuracy ?? 0}% accuracy.`
      : "Start a focused practice session to generate stronger performance signals.",
    untouched
      ? `Open ${untouched.name} next because you have not attempted it yet.`
      : "Take one timed full test this week to improve exam rhythm and stamina.",
    lastTest
      ? `Review your most recent ${lastTest.type} test and rewrite every mistake before starting new questions.`
      : "Start with 10 to 15 targeted questions before moving into a longer timed session.",
  ];

  const strengths = [
    topStrong
      ? `${topStrong.name} is currently a strength at ${topStrong.accuracy ?? 0}% accuracy.`
      : "You are building a balanced base, but a clear strongest subject has not emerged yet.",
    input.totalAnswered >= 25
      ? "You already have enough solved-question history for meaningful pattern tracking."
      : "Your data is still early, so steady practice will quickly improve recommendation quality.",
  ];

  const risks = [
    topWeak
      ? `${topWeak.name} may drag down your overall score if it is left unreviewed.`
      : "Low attempt volume is the main risk right now.",
    input.streak === 0
      ? "An irregular study streak can slow retention."
      : "Protect your streak so consistency remains your advantage.",
  ];

  return {
    summary: summaryParts.join(" "),
    recommendations,
    strengths,
    risks,
    source: "fallback",
  };
}

function buildPrompt(input: AIInsightInput) {
  return `You are an exam-prep AI coach for GATE DA.
Return strict JSON with keys: summary, recommendations, strengths, risks.
Each of recommendations, strengths, risks must be an array of short strings.
Keep the tone encouraging, concrete, and data-driven.
Do not include markdown fences.

Student snapshot:
${JSON.stringify(input, null, 2)}`;
}

function buildChatPrompt(input: AIChatInput) {
  return `You are an exam-prep AI coach for GATE DA.
Return strict JSON with keys: message, nextOptions.
message must be a concise but helpful coaching reply tailored to the student's weak areas and performance.
nextOptions must be an array of 3 short guided follow-up options.
Prefer specific subjects and topics the student should study next.
Stay strictly within GATE DA prep: revision plans, weak areas, mock strategy, topic sequencing, and mistake analysis.
If asked anything outside this scope, respond briefly and steer back to GATE DA study guidance.
Do not include markdown fences.

Current focus area: ${input.focusArea}
Student snapshot:
${JSON.stringify(
    {
      studentName: input.studentName,
      elo: input.elo,
      tier: input.tier,
      overallAccuracy: input.overallAccuracy,
      totalAnswered: input.totalAnswered,
      streak: input.streak,
      weakTopics: input.weakTopics,
      strongTopics: input.strongTopics,
      recentTests: input.recentTests,
      messages: input.messages,
    },
    null,
    2
  )}`;
}

function isInScopeFocusArea(input: AIChatInput) {
  const focus = input.focusArea.toLowerCase();
  const conversationalKeywords = [
    "hi", "hello", "hey", "hii", "helo", "start", "help me", "coach me", "guide me",
  ];
  const baseKeywords = [
    "gate", "da", "study", "plan", "revise", "revision", "topic", "weak", "strong",
    "accuracy", "score", "streak", "mock", "practice", "question", "advice", "advices",
    "improve", "improvement", "help", "better", "mistake", "test", "subject",
  ];

  const subjectKeywords = input.subjectPerformance.map((subject) => subject.name.toLowerCase());
  return [...conversationalKeywords, ...baseKeywords, ...subjectKeywords].some((keyword) => focus.includes(keyword));
}

function extractJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function generateWithGemini(prompt: string, settings: AISettings, systemInstruction: string, temperature: number) {
  if (!settings.apiKey) return "";

  const response = await fetch(
    `${settings.baseUrl.replace(/\/$/, "")}/models/${settings.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function generateAIInsights(input: AIInsightInput): Promise<AIInsightResult> {
  const settings = getAISettings();

  if (settings.provider === "fallback") {
    return buildFallbackInsights(input);
  }

  if (settings.provider === "ollama") {
    try {
      const content = await generateWithOllama(
        buildPrompt(input),
        settings.model,
        settings.baseUrl,
        "You produce compact, practical study insights in valid JSON only.",
        0.4,
        "json",
        settings.apiKey
      );

      if (!content) throw new Error("Ollama response was empty.");
      const parsed = extractJson<AIInsightResult>(content);
      if (!parsed) throw new Error("Could not parse Ollama response.");

      return {
        summary: parsed.summary || buildFallbackInsights(input).summary,
        recommendations: parsed.recommendations || [],
        strengths: parsed.strengths || [],
        risks: parsed.risks || [],
        source: "llm",
      };
    } catch {
      return buildFallbackInsights(input);
    }
  }

  if (!settings.apiKey) return buildFallbackInsights(input);

  try {
    const content = await generateWithGemini(
      buildPrompt(input),
      settings,
      "You produce compact, practical study insights in valid JSON only.",
      0.4
    );

    if (!content) throw new Error("Gemini response was empty.");
    const parsed = extractJson<AIInsightResult>(content);
    if (!parsed) throw new Error("Could not parse Gemini response.");

    return {
      summary: parsed.summary || buildFallbackInsights(input).summary,
      recommendations: parsed.recommendations || [],
      strengths: parsed.strengths || [],
      risks: parsed.risks || [],
      source: "llm",
    };
  } catch {
    return buildFallbackInsights(input);
  }
}

function buildFallbackChatReply(input: AIChatInput): AIChatResult {
  const primaryWeak = input.weakTopics[0];
  const secondaryWeak = input.weakTopics[1];
  const primaryStrong = input.strongTopics.find((topic) => topic.name !== primaryWeak?.name);
  const focus = input.focusArea.toLowerCase();
  const weakName = primaryWeak?.name || "your weakest area";
  const secondWeakName = secondaryWeak?.name || "your next weakest area";
  const strongName = primaryStrong?.name || "your strongest area";

  if (focus.includes("which topic") || focus.includes("start today") || focus.includes("today")) {
    return {
      message: `Start today with ${weakName}. First 40 minutes: revise core concepts and formulas. Next 25 minutes: solve 8 to 10 timed questions. Last 20 minutes: review mistakes and write 3 short error notes. If you finish early, take 2 or 3 questions from ${secondWeakName}.`,
      nextOptions: [
        `Give me topic order for ${weakName}`,
        `Make a 3-day plan for ${weakName}`,
        "How should I analyze mistakes after practice?",
      ],
      source: "fallback",
    };
  }

  if (focus.includes("3-day") || focus.includes("3 day")) {
    return {
      message: `3-day plan for ${weakName}: Day 1 - concept revision + 20 easy questions. Day 2 - medium-level timed set + mistake log review. Day 3 - mixed mini test (20 to 25 questions) and full error analysis. Keep a 20-minute quick revision slot for ${strongName} each day so it stays warm.`,
      nextOptions: [
        "Build a 7-day revision plan",
        `Which subtopics in ${weakName} should I do first?`,
        "How many mocks should I take this week?",
      ],
      source: "fallback",
    };
  }

  if (focus.includes("7-day") || focus.includes("7 day")) {
    return {
      message: `7-day revision plan: Days 1 to 3 focus on ${weakName}, Days 4 to 5 focus on ${secondWeakName}, Day 6 mixed subject test, Day 7 full mock + post-mock analysis. Daily structure: 40 min revision, 25 min timed solving, 20 min mistake review, 10 min formula recap.`,
      nextOptions: [
        "Create a study plan for this week",
        "What should I revise before a full mock?",
        "How to split easy vs medium vs hard questions daily?",
      ],
      source: "fallback",
    };
  }

  if (focus.includes("weakest") && primaryWeak) {
    return {
      message: `${primaryWeak.name} needs the most attention right now. Start with its core concepts, then solve 10 easy questions, 10 medium questions, and review every error before moving on. ${secondaryWeak ? `After that, shift to ${secondaryWeak.name} for a shorter revision block.` : ""}`.trim(),
      nextOptions: [
        `Show topics inside ${primaryWeak.name}`,
        `Make a 3-day plan for ${primaryWeak.name}`,
        "What should I revise before a full mock?",
      ],
      source: "fallback",
    };
  }

  if (focus.includes("suggest topic") || focus.includes("topics to study") || focus.includes("study more")) {
    return {
      message: `Prioritize topics in this order: 1) high-error areas from ${weakName}, 2) speed-sensitive topics where you spend too much time, 3) 15-minute daily recap for ${strongName}. Use yesterday's mistakes as today's first revision block.`,
      nextOptions: [
        `Create a plan for ${weakName}`,
        `How should I revise ${strongName} without wasting time?`,
        "What should I do before my next mock?",
      ],
      source: "fallback",
    };
  }

  if (focus.includes("before my next mock") || focus.includes("next mock")) {
    return {
      message: `Before your next mock, do this: 1) revise formulas and short notes from ${weakName}, 2) solve one 45-minute timed set, 3) review common mistakes from recent tests, and 4) avoid learning brand-new topics just before the mock. Keep ${strongName} warm with a light recap only.`,
      nextOptions: [
        "Create a mock-day checklist",
        "How should I analyze mock mistakes?",
        `What should I revise from ${weakName} first?`,
      ],
      source: "fallback",
    };
  }

  if (focus.includes("compare") && primaryWeak && secondaryWeak) {
    return {
      message: `${primaryWeak.name} should get the larger study block because it is currently weaker. Use roughly a 60:40 split between ${primaryWeak.name} and ${secondaryWeak.name}. Start with concept revision in ${primaryWeak.name}, then switch to timed solving in ${secondaryWeak.name}.`,
      nextOptions: [
        `Make a joint plan for ${primaryWeak.name} and ${secondaryWeak.name}`,
        "How do I divide time this week?",
        "What should I practice today?",
      ],
      source: "fallback",
    };
  }

  if (focus.includes("study plan") || focus.includes("this week")) {
    return {
      message: `Use a weekly loop: 1) revise ${weakName} for 40 minutes, 2) solve timed questions for 25 minutes, 3) spend 20 minutes on mistake analysis, and 4) finish with a short recap note. Prioritize weak subjects first, then keep ${strongName} warm with a light daily revision block.`,
      nextOptions: [
        "Turn this into a 7-day plan",
        `Which topics from ${weakName} should come first?`,
        "What should I do before my next mock?",
      ],
      source: "fallback",
    };
  }

  return {
    message: `To improve faster, do this daily: 40 minutes concept revision in ${weakName}, 25 minutes timed practice, and 20 minutes mistake analysis. Track 3 recurring errors each day and revise those first in the next session.`,
    nextOptions: [
      "Create a study plan for this week",
      "Find my weakest area",
      "What should I revise before my next mock?",
    ],
    source: "fallback",
  };
}

function buildChatResultFromPlainText(text: string, input: AIChatInput): AIChatResult {
  const cleaned = text.trim();
  if (!cleaned) return buildFallbackChatReply(input);

  return {
    message: cleaned,
    nextOptions: [
      "Find my weakest area",
      "Create a study plan for this week",
      "What should I revise before my next mock?",
    ],
    source: "llm",
  };
}

function extractChatJson(text: string): AIChatResult | null {
  return extractJson<AIChatResult>(text);
}

export async function generateAIChatReply(input: AIChatInput): Promise<AIChatResult> {
  const settings = getAISettings();
  if (!isInScopeFocusArea(input)) {
    return {
      message: "I can only help with GATE DA prep in this chat. Ask me about weak topics, revision plans, practice strategy, or mock-test improvement.",
      nextOptions: [
        "Find my weakest area",
        "Create a study plan for this week",
        "What should I revise before my next mock?",
      ],
      source: "fallback",
    };
  }

  if (settings.provider === "fallback") {
    return buildFallbackChatReply(input);
  }

  if (settings.provider === "ollama") {
    try {
      const content = await generateWithOllama(
        buildChatPrompt(input),
        settings.model || "llama3:latest",
        settings.baseUrl,
        "You are a strict GATE DA study coach. Stay inside the given student data and GATE DA topics. Return valid JSON only.",
        0.35,
        "json",
        settings.apiKey
      );

      if (!content) throw new Error("Ollama chat response was empty.");
      const parsed = extractChatJson(content);
      if (!parsed) return buildChatResultFromPlainText(content, input);

      return {
        message: parsed.message || buildFallbackChatReply(input).message,
        nextOptions: parsed.nextOptions || [],
        source: "llm",
      };
    } catch {
      return buildFallbackChatReply(input);
    }
  }

  if (!settings.apiKey) return buildFallbackChatReply(input);

  try {
    const content = await generateWithGemini(
      buildChatPrompt(input),
      settings,
      "You are a strict GATE DA study coach. Stay inside the given student data and GATE DA topics. Return valid JSON only.",
      0.35
    );

    if (!content) throw new Error("Gemini chat response was empty.");
    const parsed = extractChatJson(content);
    if (!parsed) return buildChatResultFromPlainText(content, input);

    return {
      message: parsed.message || buildFallbackChatReply(input).message,
      nextOptions: parsed.nextOptions || [],
      source: "llm",
    };
  } catch {
    return buildFallbackChatReply(input);
  }
}
