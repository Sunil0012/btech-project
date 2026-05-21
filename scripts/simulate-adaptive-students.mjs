#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULTS = {
  students: 200,
  testsPerStudent: null,
  minTestsPerStudent: 5,
  maxTestsPerStudent: 10,
  questionCounts: [30, 40, 50, 65],
  dateRangeDays: 90,
  concurrency: 2,
  emailDomain: "simulated.gate-da.local",
  outputDir: "simulator-output",
  questionBankPath: "tmp_question_bank_export.json",
  geminiModel: "gemini-2.5-flash-lite",
};

const OVERALL_TOPIC_ID = "__overall__";
const DIFFICULTY_LEVEL = { easy: 0, medium: 1, hard: 2 };
const SIM_FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Ananya", "Vivaan",
  "Sneha", "Kabir", "Meera", "Arjun", "Isha",
  "Karan", "Nisha", "Aditya", "Sara", "Dev",
  "Tanya", "Rahul", "Kavya", "Neil", "Pooja",
];
const SIM_LAST_NAMES = [
  "Sharma", "Nair", "Menon", "Iyer", "Reddy",
  "Kapoor", "Bose", "Verma", "Patel", "Gupta",
  "Khan", "Mehta", "Das", "Rao", "Chatterjee",
  "Joshi", "Malhotra", "Bhat", "Pillai", "Agarwal",
];

function printHelp() {
  console.log(`
Usage:
  npm run simulate:students -- [options]

Options:
  --students <n>            Number of student accounts to create. Default: 200
  --tests-per-student <n>   Fixed attempts per student. Default: random 5-10
  --min-tests <n>           Minimum attempts per student. Default: 5
  --max-tests <n>           Maximum attempts per student. Default: 10
  --question-counts <list>  Adaptive mix sizes to rotate through. Default: 30,40,50,65
  --date-range-days <n>     Random history window ending near today. Default: 90
  --concurrency <n>         Parallel students to process. Default: 2
  --batch <name>            Stable prefix for generated emails. Default: timestamp
  --email-domain <domain>   Domain for generated emails. Default: simulated.gate-da.local
  --join-code <code>        Optional classroom/course join code for all students
  --question-bank <path>    Exported question-bank JSON. Default: tmp_question_bank_export.json
  --output-dir <path>       Directory for credentials and run summary. Default: simulator-output
  --local-only              Do not call Gemini, even if GEMINI_API_KEY is present
  --gemini-only             Require Gemini for every simulated test; fail instead of falling back
  --dry-run                 Generate credentials and attempts without writing Supabase
  --help                    Show this help

Environment:
  VITE_STUDENT_SUPABASE_URL
  VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY
  GEMINI_API_KEY or GOOGLE_API_KEY
  GEMINI_MODEL
  SIM_STUDENT_PROMPT
`);
}

function parseArgs(argv) {
  const options = {
    ...DEFAULTS,
    batch: `sim${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`,
    joinCode: "",
    localOnly: false,
    geminiOnly: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];

    switch (arg) {
      case "--students":
        options.students = readPositiveInt(next(), "students");
        break;
      case "--tests-per-student":
        options.testsPerStudent = readPositiveInt(next(), "tests-per-student");
        break;
      case "--min-tests":
        options.minTestsPerStudent = readPositiveInt(next(), "min-tests");
        break;
      case "--max-tests":
        options.maxTestsPerStudent = readPositiveInt(next(), "max-tests");
        break;
      case "--question-counts":
        options.questionCounts = parseQuestionCounts(next());
        break;
      case "--questions-per-test":
        options.questionCounts = [readPositiveInt(next(), "questions-per-test")];
        options.testsPerStudent = options.testsPerStudent ?? DEFAULTS.minTestsPerStudent;
        break;
      case "--date-range-days":
        options.dateRangeDays = readPositiveInt(next(), "date-range-days");
        break;
      case "--concurrency":
        options.concurrency = readPositiveInt(next(), "concurrency");
        break;
      case "--batch":
        options.batch = sanitizeBatch(next());
        break;
      case "--email-domain":
        options.emailDomain = String(next() || "").trim().toLowerCase();
        break;
      case "--join-code":
        options.joinCode = normalizeJoinCode(next() || "");
        break;
      case "--question-bank":
        options.questionBankPath = next();
        break;
      case "--output-dir":
        options.outputDir = next();
        break;
      case "--local-only":
        options.localOnly = true;
        break;
      case "--gemini-only":
        options.geminiOnly = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.maxTestsPerStudent < options.minTestsPerStudent) {
    throw new Error("--max-tests must be greater than or equal to --min-tests.");
  }

  if (options.localOnly && options.geminiOnly) {
    throw new Error("--local-only and --gemini-only cannot be used together.");
  }

  return options;
}

function readPositiveInt(raw, label) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${label} must be a positive integer.`);
  }
  return value;
}

function parseQuestionCounts(raw) {
  const counts = String(raw || "")
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (counts.length === 0) {
    throw new Error("--question-counts must contain at least one positive integer.");
  }

  return [...new Set(counts)];
}

function sanitizeBatch(value) {
  const batch = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!batch) throw new Error("--batch cannot be empty.");
  return batch;
}

function normalizeJoinCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function loadEnvFile(path = ".env") {
  try {
    const raw = await readFile(resolve(path), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] === undefined) {
        process.env[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function loadQuestionBank(questionBankPath) {
  const raw = await readFile(resolve(questionBankPath), "utf8");
  const payload = JSON.parse(raw);
  const questions = Array.isArray(payload.adaptiveMixQuestions)
    ? payload.adaptiveMixQuestions
    : Array.isArray(payload.questions)
      ? payload.questions
      : [];

  if (questions.length === 0) {
    throw new Error(`No questions found in ${questionBankPath}. Run npm run export:questions first if needed.`);
  }

  return {
    subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
    questions: questions.filter(isUsableQuestion),
  };
}

function isUsableQuestion(question) {
  return (
    question &&
    typeof question.id === "string" &&
    typeof question.subjectId === "string" &&
    typeof question.topicId === "string" &&
    typeof question.type === "string" &&
    typeof question.marks === "number"
  );
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = hashString(seed);
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickOne(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function buildCredentials(options) {
  return Array.from({ length: options.students }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    const firstName = SIM_FIRST_NAMES[index % SIM_FIRST_NAMES.length];
    const lastName = SIM_LAST_NAMES[(index * 7) % SIM_LAST_NAMES.length];
    const displayNumber = String(index + 1).padStart(2, "0");
    const nameSlug = `${firstName}.${lastName}`.toLowerCase();
    const passwordSeed = hashString(`${options.batch}:${number}:gateway-sim-student`).toString(36);
    return {
      index: index + 1,
      username: `${nameSlug}.${options.batch}.${displayNumber}@${options.emailDomain}`,
      password: `GateSim#${options.batch}_${number}_${passwordSeed}`,
      fullName: `${firstName} ${lastName}`,
    };
  });
}

function buildPersona(credential, subjects) {
  const rng = createRng(`persona:${credential.username}`);
  const archetypes = [
    { label: "high performer", elo: 1660, accuracy: 0.76, consistency: 0.13, weight: 0.16 },
    { label: "steady improver", elo: 1510, accuracy: 0.62, consistency: 0.18, weight: 0.38 },
    { label: "average learner", elo: 1410, accuracy: 0.52, consistency: 0.22, weight: 0.34 },
    { label: "struggling learner", elo: 1280, accuracy: 0.38, consistency: 0.25, weight: 0.12 },
  ];
  const archetype = weightedPick(archetypes, rng);
  const outcomeRoll = rng();
  const growthProfile =
    outcomeRoll < 0.04
      ? { label: "regresses", improvement: -0.025, finalPush: -0.04 }
      : outcomeRoll < 0.10
        ? { label: "stagnates", improvement: 0.004, finalPush: 0 }
        : outcomeRoll < 0.30
          ? { label: "slow improver", improvement: 0.045 + rng() * 0.025, finalPush: 0.08 }
          : { label: "clear improver", improvement: 0.075 + rng() * 0.045, finalPush: 0.16 };
  const subjectIds = subjects.map((subject) => subject.id).filter(Boolean);
  const strongSubjects = shuffle(subjectIds, rng).slice(0, 2);
  const weakSubjects = shuffle(subjectIds, rng).filter((id) => !strongSubjects.includes(id)).slice(0, 2);
  const subjectBias = Object.fromEntries(subjectIds.map((id) => [id, (rng() - 0.5) * 0.16]));
  strongSubjects.forEach((id) => {
    subjectBias[id] = (subjectBias[id] || 0) + 0.14;
  });
  weakSubjects.forEach((id) => {
    subjectBias[id] = (subjectBias[id] || 0) - 0.16;
  });

  return {
    label: archetype.label,
    startingElo: Math.round(archetype.elo + (rng() - 0.5) * 120),
    targetAccuracy: clamp(archetype.accuracy + (rng() - 0.5) * 0.1, 0.25, 0.9),
    consistency: archetype.consistency,
    speed: clamp(0.75 + rng() * 0.7, 0.6, 1.6),
    carelessRate: clamp(0.02 + rng() * 0.08, 0.01, 0.14),
    skipBias: clamp((rng() - 0.5) * 0.14, -0.07, 0.07),
    riskAppetite: clamp(0.35 + rng() * 0.5, 0.25, 0.9),
    growthProfile: growthProfile.label,
    improvement: growthProfile.improvement,
    finalPush: growthProfile.finalPush,
    subjectBias,
    strongSubjects,
    weakSubjects,
  };
}

function weightedPick(items, rng) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let cursor = rng() * total;
  for (const item of items) {
    cursor -= item.weight || 1;
    if (cursor <= 0) return item;
  }
  return items.at(-1);
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function pickAdaptiveMixQuestions(bank, answeredIds, studentElo, count, rng) {
  const unused = bank.filter((question) => !answeredIds.has(question.id));
  const source = unused.length >= count ? unused : bank;
  const selected = [];
  const subjectCounts = new Map();

  while (selected.length < count && selected.length < source.length) {
    const alreadySelected = new Set(selected.map((question) => question.id));
    const candidates = source
      .filter((question) => !alreadySelected.has(question.id))
      .map((question) => {
        const subjectCount = subjectCounts.get(question.subjectId) || 0;
        const eloDistance = Math.abs((question.eloRating || 1400) - studentElo);
        const jitter = rng() * 80;
        return { question, score: eloDistance + subjectCount * 130 + jitter };
      })
      .sort((left, right) => left.score - right.score)
      .slice(0, 16);

    if (candidates.length === 0) break;
    const chosen = pickOne(candidates.slice(0, Math.min(6, candidates.length)), rng).question;
    selected.push(chosen);
    subjectCounts.set(chosen.subjectId, (subjectCounts.get(chosen.subjectId) || 0) + 1);
  }

  return selected;
}

function localAnswerForQuestion(question, persona, state, testIndex, totalTests, rng) {
  const expected = 1 / (1 + Math.pow(10, ((question.eloRating || 1400) - state.elo) / 400));
  const subjectBias = persona.subjectBias[question.subjectId] || 0;
  const difficultyPenalty = (DIFFICULTY_LEVEL[question.difficulty] || 1) * 0.035;
  const progress = totalTests <= 1 ? 1 : testIndex / (totalTests - 1);
  const lateStage = progress > 0.65 ? (progress - 0.65) / 0.35 : 0;
  const learningBoost = progress * persona.improvement + lateStage * persona.finalPush;
  const testDayMood = state.currentAttemptMood ?? 0;
  const fatiguePenalty = (state.currentQuestionCount || 30) >= 50 ? progress * 0.015 : 0;
  const noise = (rng() - 0.5) * persona.consistency + testDayMood;
  const probabilityCorrect = clamp(
    expected * 0.35 + persona.targetAccuracy * 0.65 + subjectBias + learningBoost - difficultyPenalty - fatiguePenalty + noise,
    0.08,
    persona.growthProfile === "regresses" ? 0.76 : 0.96
  );
  const probabilityAttempt = clamp(
    0.76 + persona.targetAccuracy * 0.18 - difficultyPenalty + subjectBias / 2 + persona.skipBias + persona.riskAppetite * 0.05,
    0.52,
    0.99
  );
  const attempted = rng() <= probabilityAttempt;
  const correct = attempted && rng() <= probabilityCorrect && rng() > persona.carelessRate;
  const timeBase = 42 + (question.eloRating || 1400) / 40 + (question.type === "nat" ? 24 : 0);
  const timeSpentSeconds = Math.round(clamp(timeBase / persona.speed + rng() * 70 + fatiguePenalty * 300, 12, 260));

  return {
    answer: attempted ? buildAnswer(question, correct, rng) : null,
    correct,
    attempted,
    timeSpentSeconds,
  };
}

function buildAnswer(question, correct, rng) {
  if (question.type === "mcq") {
    if (correct) return question.correctAnswer;
    const options = Array.from({ length: question.options?.length || 4 }, (_, index) => index)
      .filter((index) => index !== question.correctAnswer);
    return pickOne(options.length ? options : [0], rng);
  }

  if (question.type === "msq") {
    const correctAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers : [question.correctAnswer];
    if (correct) return correctAnswers;
    const optionCount = question.options?.length || 4;
    const shuffled = shuffle(Array.from({ length: optionCount }, (_, index) => index), rng);
    const wrong = shuffled.slice(0, Math.max(1, Math.floor(rng() * optionCount)));
    return arraysEqual([...wrong].sort(), [...correctAnswers].sort()) ? [((wrong[0] || 0) + 1) % optionCount] : wrong;
  }

  if (question.type === "nat") {
    const range = question.correctNat || { min: 0, max: 0 };
    if (correct) return String(Number(((range.min + range.max) / 2).toFixed(2)));
    const offset = Math.max(1, Math.abs(range.max - range.min) + 1);
    return String(Number((range.max + offset + rng() * offset).toFixed(2)));
  }

  return null;
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function geminiAnswersForTest({ apiKey, model, promptTemplate, persona, questions, testIndex, totalTests }) {
  if (!apiKey) return null;

  const prompt = `${promptTemplate}

Student persona:
${JSON.stringify({
  label: persona.label,
  targetAccuracy: persona.targetAccuracy,
  strongSubjects: persona.strongSubjects,
  weakSubjects: persona.weakSubjects,
  growthProfile: persona.growthProfile,
  testNumber: testIndex + 1,
  totalTests,
  questionCount: questions.length,
}, null, 2)}

Questions:
${JSON.stringify(questions.map((question, index) => ({
  index,
  id: question.id,
  type: question.type,
  subjectId: question.subjectId,
  topicId: question.topicId,
  difficulty: question.difficulty,
  marks: question.marks,
  question: String(question.question || "").slice(0, 700),
  options: question.options || [],
})), null, 2)}

Return only JSON. Shape:
{"answers":[{"index":0,"attempted":true,"confidence":0.62}]}
Use confidence as the probability that this simulated student gets that question right.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Gemini request failed: ${response.status} ${text.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text.trim()) return null;

  const parsed = JSON.parse(text);
  return Array.isArray(parsed.answers) ? parsed.answers : null;
}

async function simulateTest({ questions, persona, state, testIndex, totalTests, completedAt, rng, geminiConfig }) {
  state.currentQuestionCount = questions.length;
  state.currentAttemptMood = (rng() - 0.5) * 0.08;

  let llmHints = null;
  if (geminiConfig?.apiKey) {
    try {
      llmHints = await geminiAnswersForTest({
        apiKey: geminiConfig.apiKey,
        model: geminiConfig.model,
        promptTemplate: geminiConfig.prompt,
        persona,
        questions,
        testIndex,
        totalTests,
      });
    } catch (error) {
      if (geminiConfig.requireGemini) {
        throw error;
      }
      const statusLabel = error?.status ? `HTTP ${error.status}` : "request error";
      console.warn(`Gemini fallback to local for ${state.username} test ${testIndex + 1} (${statusLabel}): ${error.message}`);
    }
  }

  if (geminiConfig?.requireGemini && !Array.isArray(llmHints)) {
    throw new Error(`Gemini returned no usable answers for ${state.username} test ${testIndex + 1}.`);
  }

  let score = 0;
  let maxScore = 0;
  let correctAnswers = 0;
  let questionsAttempted = 0;
  const answers = [];
  const questionReviews = [];
  const answerRows = [];
  const progressDelta = new Map();

  questions.forEach((question, index) => {
    maxScore += question.marks || 0;
    const local = localAnswerForQuestion(question, persona, state, testIndex, totalTests, rng);
    const llmHint = llmHints?.find((item) => item.index === index);
    let result = local;

    if (llmHint && typeof llmHint.confidence === "number") {
      const attempted = llmHint.attempted !== false;
      const correct = attempted && rng() <= clamp(llmHint.confidence, 0, 1);
      result = {
        ...local,
        attempted,
        correct,
        answer: attempted ? buildAnswer(question, correct, rng) : null,
      };
    }

    if (result.attempted) {
      questionsAttempted += 1;
      if (result.correct) {
        correctAnswers += 1;
        score += question.marks || 0;
      } else {
        score -= question.negativeMarks || 0;
      }

      answerRows.push({
        question_id: question.id,
        was_correct: result.correct,
      });

      addProgressDelta(progressDelta, question.subjectId, OVERALL_TOPIC_ID, result.correct);
      addProgressDelta(progressDelta, question.subjectId, question.topicId, result.correct);
      state.answeredIds.add(question.id);
      state.elo = updateElo(state.elo, question.eloRating || 1400, result.correct);
    }

    answers.push(result.answer);
    questionReviews.push({
      questionId: question.id,
      correct: result.correct,
      timeSpentSeconds: result.timeSpentSeconds,
      rapidGuessWarning: result.timeSpentSeconds < 20,
      rapidGuessThresholdSeconds: 20,
      eloAdjustment: 0,
      warningText: result.timeSpentSeconds < 20 ? "Very fast answer in simulated attempt." : null,
      remediationForQuestionId: null,
    });
  });

  const durationSeconds = questionReviews.reduce((sum, review) => sum + review.timeSpentSeconds, 0);
  const accuracy = questionsAttempted > 0 ? correctAnswers / questionsAttempted : 0;

  return {
    history: {
      test_type: "adaptive",
      subject_id: null,
      topic_id: null,
      score: Number(score.toFixed(2)),
      max_score: Number(maxScore.toFixed(2)),
      questions_attempted: questionsAttempted,
      correct_answers: correctAnswers,
      total_questions: questions.length,
      violations: rng() < 0.04 ? 1 : 0,
      duration_seconds: durationSeconds,
      completed_at: completedAt,
      review_payload: buildReviewPayload({
        questions,
        answers,
        questionReviews,
        durationSeconds,
        completedAt,
        accuracy,
      }),
    },
    answerRows,
    progressDelta,
    summary: {
      score: Number(score.toFixed(2)),
      maxScore: Number(maxScore.toFixed(2)),
      correctAnswers,
      totalQuestions: questions.length,
      questionsAttempted,
      accuracy: Number(accuracy.toFixed(3)),
      completedAt,
      questionCount: questions.length,
    },
  };
}

function addProgressDelta(map, subjectId, topicId, correct) {
  const key = `${subjectId}::${topicId}`;
  const current = map.get(key) || { subject_id: subjectId, topic_id: topicId, correct: 0, total: 0 };
  current.total += 1;
  if (correct) current.correct += 1;
  map.set(key, current);
}

function updateElo(currentElo, questionElo, correct) {
  const expected = 1 / (1 + Math.pow(10, (questionElo - currentElo) / 400));
  const k = correct ? 24 : 8;
  const next = currentElo + k * ((correct ? 1 : 0) - expected);
  return Math.round(clamp(next, 850, 2200));
}

function buildReviewPayload({ questions, answers, questionReviews, durationSeconds, completedAt, accuracy }) {
  const sessionId = `sim-${randomUUID()}`;
  const answeredQuestions = answers.filter((answer) => {
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== null && answer !== "";
  }).length;

  return {
    full_test_id: null,
    question_ids: questions.map((question) => question.id),
    question_snapshots: questions.map((question) => ({ ...question })),
    answers,
    question_reviews: questionReviews,
    graph_path: {
      session_id: sessionId,
      test_type: "adaptive",
      subject_id: null,
      topic_id: null,
      total_questions: questions.length,
      answered_questions: answeredQuestions,
      accuracy: Math.round(accuracy * 100),
      current_question_id: questions.at(-1)?.id || null,
      question_path: questions.map((question) => question.id),
      steps: questions.map((question, index) => ({
        order: index + 1,
        question_id: question.id,
        from_question_id: index > 0 ? questions[index - 1].id : null,
        correct: questionReviews[index]?.correct ?? null,
        difficulty: question.difficulty || null,
        edge_weight: 1,
        edge_kind: "simulated-adaptive-mix",
        hop_distance: 1,
        remediation_for_question_id: null,
        subject_id: question.subjectId,
        topic_id: question.topicId,
        time_spent_seconds: questionReviews[index]?.timeSpentSeconds ?? null,
        rapid_guess_warning: questionReviews[index]?.rapidGuessWarning ?? false,
        rapid_guess_threshold_seconds: questionReviews[index]?.rapidGuessThresholdSeconds ?? 20,
        warning_text: questionReviews[index]?.warningText ?? null,
      })),
    },
    attemptKind: "adaptive",
    countsForStats: true,
    countsForRating: true,
    warningBreakdown: { violations: 0, testType: "adaptive" },
    reviewMetadata: {
      attemptDuration: durationSeconds,
      startTime: new Date(new Date(completedAt).getTime() - durationSeconds * 1000).toISOString(),
      endTime: completedAt,
      testType: "adaptive",
      adaptiveType: "mix",
      simulator: "simulate-adaptive-students",
      graphSessionId: sessionId,
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableSupabaseError(error) {
  const text = [
    error?.name,
    error?.code,
    error?.message,
    error?.cause?.code,
    error?.cause?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error?.status === 0 ||
    error?.status === 429 ||
    error?.status === 500 ||
    error?.status === 502 ||
    error?.status === 503 ||
    error?.status === 504 ||
    text.includes("fetch failed") ||
    text.includes("econnreset") ||
    text.includes("etimedout") ||
    text.includes("eai_again") ||
    text.includes("authretryablefetcherror") ||
    text.includes("network")
  );
}

async function withSupabaseRetry(label, operation, attempts = 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableSupabaseError(error) || attempt === attempts) {
        throw error;
      }

      const delayMs = Math.round(700 * Math.pow(2, attempt - 1) + Math.random() * 400);
      console.warn(`${label} failed transiently (${error?.cause?.code || error?.code || error?.message}); retry ${attempt + 1}/${attempts} in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function signUpOrSignIn(client, credential) {
  const metadata = {
    full_name: credential.fullName,
    email: credential.username,
    role: "student",
    simulated_student: true,
  };

  const signUp = await withSupabaseRetry(`signUp ${credential.username}`, () =>
    client.auth.signUp({
      email: credential.username,
      password: credential.password,
      options: { data: metadata },
    })
  );

  if (signUp.error) {
    const message = signUp.error.message.toLowerCase();
    if (!message.includes("already") && !message.includes("registered")) {
      throw signUp.error;
    }

    const signIn = await withSupabaseRetry(`signIn ${credential.username}`, () =>
      client.auth.signInWithPassword({
        email: credential.username,
        password: credential.password,
      })
    );
    if (signIn.error) {
      const isInvalidCredentials =
        signIn.error.code === "invalid_credentials" ||
        signIn.error.message?.toLowerCase().includes("invalid login credentials");

      if (isInvalidCredentials) {
        throw new Error(
          `The simulated user ${credential.username} already exists in Supabase with a different password. ` +
            "Use a new --batch value, or delete/reset that existing auth user before rerunning this batch."
        );
      }

      throw signIn.error;
    }
    if (!signIn.data.session) throw new Error("Could not start session for existing simulated student.");
    return signIn.data.session.user;
  }

  if (!signUp.data.session) {
    throw new Error(
      "Supabase created the user but did not return a session. Disable email confirmation for this test project or use a service-role seeder."
    );
  }

  return signUp.data.session.user;
}

async function ensureProfile(client, user, credential, elo) {
  const payload = {
    user_id: user.id,
    full_name: credential.fullName,
    email: credential.username,
    role: "student",
    elo_rating: elo,
    last_active: new Date().toISOString(),
    study_goal: "crack_gate",
    theme: "system",
  };

  const { error } = await withSupabaseRetry(`upsert profile ${credential.username}`, () =>
    client.from("profiles").upsert(payload, { onConflict: "user_id" })
  );
  if (error) throw error;
}

function tableClient(client, schema, tableName) {
  return schema && schema !== "public" ? client.schema(schema).from(tableName) : client.from(tableName);
}

function isMissingTableError(error, tableName) {
  const text = [error?.code, error?.message, error?.hint].filter(Boolean).join(" ").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    (text.includes("could not find") && text.includes(tableName.toLowerCase()))
  );
}

async function findCourseByJoinCode(client, schema, joinCode) {
  return withSupabaseRetry(`find ${schema}.courses ${joinCode}`, () =>
    tableClient(client, schema, "courses")
      .select("id,title,join_code")
      .eq("join_code", joinCode)
      .maybeSingle()
  );
}

async function joinCourseIfRequested(client, userId, joinCode, classroomSchema = "teacher") {
  if (!joinCode) return null;

  let schema = "public";
  let { data: course, error: courseError } = await findCourseByJoinCode(client, schema, joinCode);

  if (courseError && isMissingTableError(courseError, "courses") && classroomSchema !== "public") {
    schema = classroomSchema;
    const fallback = await findCourseByJoinCode(client, schema, joinCode);
    course = fallback.data;
    courseError = fallback.error;
  }

  if (courseError) throw courseError;
  if (!course) throw new Error(`No course found for join code ${joinCode}.`);

  const { error } = await withSupabaseRetry(`join course ${joinCode}`, () =>
    tableClient(client, schema, "enrollments")
      .upsert({ student_id: userId, course_id: course.id }, { onConflict: "student_id,course_id" })
  );

  if (error) throw error;
  return { ...course, schema };
}

async function persistAttempt(client, user, credential, attempt) {
  const { error: historyError } = await withSupabaseRetry(`insert test history ${credential.username}`, () =>
    client.from("test_history").insert({
      ...attempt.history,
      user_id: user.id,
    })
  );
  if (historyError) throw historyError;

  if (attempt.answerRows.length > 0) {
    const { error: answeredError } = await withSupabaseRetry(
      `upsert answered questions ${credential.username}`,
      () =>
        client.from("answered_questions").upsert(
          attempt.answerRows.map((row) => ({ ...row, user_id: user.id })),
          { onConflict: "user_id,question_id" }
        )
    );
    if (answeredError) throw answeredError;
  }

  const progressRows = Array.from(attempt.progressDelta.values()).map((row) => ({
    ...row,
    user_id: user.id,
    last_practiced: attempt.history.completed_at,
  }));
  if (progressRows.length > 0) {
    await upsertProgressRows(client, user.id, progressRows);
  }

  const { error: activityError } = await withSupabaseRetry(`insert activity ${credential.username}`, () =>
    client.from("activity_events").insert({
      actor_id: user.id,
      actor_role: "student",
      actor_name: credential.fullName,
      event_type: "adaptive_test_completed",
      subject_id: null,
      topic_id: null,
      metadata: {
        simulator: "simulate-adaptive-students",
        test_type: "adaptive",
        adaptive_type: "mix",
        score: attempt.history.score,
        max_score: attempt.history.max_score,
        questions_attempted: attempt.history.questions_attempted,
        correct_answers: attempt.history.correct_answers,
        total_questions: attempt.history.total_questions,
        duration_seconds: attempt.history.duration_seconds,
        completed_at: attempt.history.completed_at,
      },
    })
  );
  if (activityError) {
    console.warn(`Activity log skipped for ${credential.username}: ${activityError.message}`);
  }
}

async function upsertProgressRows(client, userId, deltaRows) {
  for (const delta of deltaRows) {
    const { data: existing, error: readError } = await withSupabaseRetry(`read progress ${userId}`, () =>
      client
        .from("user_progress")
        .select("correct,total")
        .eq("user_id", userId)
        .eq("subject_id", delta.subject_id)
        .eq("topic_id", delta.topic_id)
        .maybeSingle()
    );
    if (readError) throw readError;

    const { error } = await withSupabaseRetry(`upsert progress ${userId}`, () =>
      client.from("user_progress").upsert(
        {
          user_id: userId,
          subject_id: delta.subject_id,
          topic_id: delta.topic_id,
          correct: (existing?.correct || 0) + delta.correct,
          total: (existing?.total || 0) + delta.total,
          last_practiced: delta.last_practiced,
        },
        { onConflict: "user_id,subject_id,topic_id" }
      )
    );
    if (error) throw error;
  }
}

function buildAttemptPlan(options, rng) {
  const totalTests = options.testsPerStudent
    ? options.testsPerStudent
    : options.minTestsPerStudent + Math.floor(rng() * (options.maxTestsPerStudent - options.minTestsPerStudent + 1));
  const baseCounts = shuffle(options.questionCounts, rng);
  const questionCounts = [];

  while (questionCounts.length < totalTests) {
    const nextCount = questionCounts.length < baseCounts.length
      ? baseCounts[questionCounts.length]
      : pickOne(options.questionCounts, rng);
    questionCounts.push(nextCount);
  }

  return {
    totalTests,
    questionCounts,
    completedAtDates: buildAttemptDates(totalTests, options.dateRangeDays, rng),
  };
}

function buildAttemptDates(totalTests, dateRangeDays, rng) {
  const now = Date.now();
  const newestOffsetDays = 1 + Math.floor(rng() * 7);
  const oldestOffsetDays = Math.max(newestOffsetDays + totalTests + 3, Math.floor(dateRangeDays * (0.45 + rng() * 0.55)));
  const offsets = [];

  for (let index = 0; index < totalTests; index += 1) {
    const progress = totalTests === 1 ? 1 : index / (totalTests - 1);
    const baseOffset = oldestOffsetDays - progress * (oldestOffsetDays - newestOffsetDays);
    const jitter = (rng() - 0.5) * Math.max(1, dateRangeDays / totalTests / 2);
    offsets.push(clamp(baseOffset + jitter, newestOffsetDays, oldestOffsetDays));
  }

  return offsets
    .sort((left, right) => right - left)
    .map((offsetDays) => {
      const hour = 7 + Math.floor(rng() * 14);
      const minute = Math.floor(rng() * 60);
      const second = Math.floor(rng() * 60);
      const date = new Date(now - offsetDays * 24 * 60 * 60 * 1000);
      date.setHours(hour, minute, second, 0);
      return date.toISOString();
    });
}

async function processStudent({ credential, options, bank, subjects, supabaseConfig, geminiConfig }) {
  const rng = createRng(`attempts:${credential.username}`);
  const persona = buildPersona(credential, subjects);
  const attemptPlan = buildAttemptPlan(options, rng);
  const state = {
    username: credential.username,
    elo: persona.startingElo,
    answeredIds: new Set(),
  };

  let user = { id: `dry-run-${credential.index}` };
  let client = null;
  let joinedCourse = null;

  if (!options.dryRun) {
    client = createClient(supabaseConfig.url, supabaseConfig.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    user = await signUpOrSignIn(client, credential);
    await ensureProfile(client, user, credential, state.elo);
    joinedCourse = await joinCourseIfRequested(client, user.id, options.joinCode, supabaseConfig.classroomSchema);
  }

  const attempts = [];
  for (let testIndex = 0; testIndex < attemptPlan.totalTests; testIndex += 1) {
    const questionCount = attemptPlan.questionCounts[testIndex];
    const selectedQuestions = pickAdaptiveMixQuestions(bank, state.answeredIds, state.elo, questionCount, rng);
    const attempt = await simulateTest({
      questions: selectedQuestions,
      persona,
      state,
      testIndex,
      totalTests: attemptPlan.totalTests,
      completedAt: attemptPlan.completedAtDates[testIndex],
      rng,
      geminiConfig,
    });

    attempts.push(attempt.summary);
    if (!options.dryRun) {
      await persistAttempt(client, user, credential, attempt);
      await ensureProfile(client, user, credential, state.elo);
    }
  }

  if (client) {
    await client.auth.signOut();
  }

  return {
    index: credential.index,
    username: credential.username,
    password: credential.password,
    fullName: credential.fullName,
    loginReady: !options.dryRun,
    userId: user.id,
    persona: persona.label,
    growthProfile: persona.growthProfile,
    startingElo: persona.startingElo,
    endingElo: state.elo,
    joinedCourse: joinedCourse?.join_code || null,
    joinedCourseSchema: joinedCourse?.schema || null,
    plannedQuestionCounts: attemptPlan.questionCounts,
    attempts,
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

function toCsv(rows) {
  const headers = ["index", "username", "password", "fullName", "loginReady", "userId", "persona", "growthProfile", "startingElo", "endingElo", "joinedCourse", "joinedCourseSchema"];
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

async function main() {
  await loadEnvFile();
  const options = parseArgs(process.argv.slice(2));
  const supabaseConfig = {
    url: process.env.VITE_STUDENT_SUPABASE_URL || "",
    key: process.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY || "",
    classroomSchema: process.env.VITE_TEACHER_SUPABASE_SCHEMA || "teacher",
  };
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (options.geminiOnly && !geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY. --gemini-only cannot run without a Gemini API key.");
  }

  const geminiConfig = !options.localOnly && geminiApiKey
    ? {
        apiKey: geminiApiKey,
        model: process.env.GEMINI_MODEL || options.geminiModel,
        requireGemini: options.geminiOnly,
        prompt:
          process.env.SIM_STUDENT_PROMPT ||
          "Simulate a realistic GATE DA student taking an adaptive mixed-subject test. Think like an actual student: use partial knowledge, strengths, weak areas, fatigue, guessing, occasional careless mistakes, and gradual learning. Most students should improve by later attempts, but a very small number should stagnate or regress.",
      }
    : null;

  if (!options.dryRun && (!supabaseConfig.url || !supabaseConfig.key)) {
    throw new Error("Missing VITE_STUDENT_SUPABASE_URL or VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY in .env.");
  }

  const { subjects, questions } = await loadQuestionBank(options.questionBankPath);
  const credentials = buildCredentials(options);
  const outputDir = resolve(options.outputDir);
  const baseName = `${options.batch}-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
  const csvPath = resolve(outputDir, `${baseName}-credentials.csv`);
  const jsonPath = resolve(outputDir, `${baseName}-summary.json`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    csvPath,
    `${toCsv(credentials.map((credential) => ({ ...credential, loginReady: options.dryRun ? false : "pending" })))}\n`,
    "utf8"
  );

  console.log(`Simulator batch: ${options.batch}`);
  console.log(
    `Students: ${options.students}, tests each: ${
      options.testsPerStudent || `${options.minTestsPerStudent}-${options.maxTestsPerStudent}`
    }, question-count rotation: ${options.questionCounts.join(",")}`
  );
  console.log(`Random completion dates span roughly the last ${options.dateRangeDays} days`);
  console.log(`Question bank: ${questions.length} adaptive-mix questions`);
  console.log(
    `Gemini: ${geminiConfig ? `enabled (${geminiConfig.model}${geminiConfig.requireGemini ? ", required" : ""})` : "disabled, using local behavior model"}`
  );
  console.log(`Supabase writes: ${options.dryRun ? "disabled (--dry-run)" : "enabled"}`);
  if (options.dryRun) {
    console.log("Dry run mode: generated usernames/passwords are not login-ready because no Supabase auth users are created.");
  }

  const results = await mapLimit(credentials, options.concurrency, async (credential) => {
    const result = await processStudent({
      credential,
      options,
      bank: questions,
      subjects,
      supabaseConfig,
      geminiConfig,
    });
    console.log(`Done ${String(result.index).padStart(3, "0")}/${options.students}: ${result.username}`);
    return result;
  });

  await writeFile(csvPath, `${toCsv(results)}\n`, "utf8");
  await writeFile(jsonPath, JSON.stringify({ options, generatedAt: new Date().toISOString(), results }, null, 2), "utf8");

  console.log(`Credentials CSV: ${csvPath}`);
  console.log(`Run summary JSON: ${jsonPath}`);
}

main().catch(async (error) => {
  try {
    await mkdir(dirname(resolve(DEFAULTS.outputDir, "error.log")), { recursive: true });
  } catch {
    // Ignore error-log directory failures.
  }
  console.error(error);
  process.exit(1);
});
