#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULTS = {
  students: 220,
  interactionsPerStudent: 250,
  minTestsPerStudent: 5,
  maxTestsPerStudent: 10,
  testQuestionCounts: [30, 40, 50, 65],
  joinCode: "FTE455",
  courseTitle: "FTE455 - GATE DA Adaptive Readiness",
  questionBankPath: "tmp_question_bank_export.json",
  outputDir: "datasets/dars",
  seed: "dars-fte455-industry-trial",
};

const DIFFICULTY_RATING = {
  easy: 1200,
  medium: 1500,
  hard: 1800,
};

const FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Ananya", "Vivaan",
  "Sneha", "Kabir", "Meera", "Arjun", "Isha",
  "Karan", "Nisha", "Aditya", "Sara", "Dev",
  "Tanya", "Rahul", "Kavya", "Neil", "Pooja",
];

const LAST_NAMES = [
  "Sharma", "Nair", "Menon", "Iyer", "Reddy",
  "Kapoor", "Bose", "Verma", "Patel", "Gupta",
  "Khan", "Mehta", "Das", "Rao", "Chatterjee",
  "Joshi", "Malhotra", "Bhat", "Pillai", "Agarwal",
];

const PERSONAS = [
  { label: "steady_improver", accuracyBias: 0.06, speedBias: -0.05, growth: 0.05 },
  { label: "fast_but_careless", accuracyBias: -0.03, speedBias: -0.22, growth: 0.02 },
  { label: "slow_analytical", accuracyBias: 0.04, speedBias: 0.18, growth: 0.03 },
  { label: "volatile_practicer", accuracyBias: -0.01, speedBias: 0.03, growth: 0.00 },
  { label: "remediation_responder", accuracyBias: 0.01, speedBias: 0.08, growth: 0.04 },
];

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    switch (arg) {
      case "--students":
        options.students = readPositiveInt(next(), "students");
        break;
      case "--interactions-per-student":
        options.interactionsPerStudent = readPositiveInt(next(), "interactions-per-student");
        break;
      case "--min-tests":
        options.minTestsPerStudent = readPositiveInt(next(), "min-tests");
        break;
      case "--max-tests":
        options.maxTestsPerStudent = readPositiveInt(next(), "max-tests");
        break;
      case "--question-counts":
        options.testQuestionCounts = parseQuestionCounts(next());
        break;
      case "--join-code":
        options.joinCode = String(next() || "").trim().toUpperCase();
        break;
      case "--question-bank":
        options.questionBankPath = next();
        break;
      case "--output-dir":
        options.outputDir = next();
        break;
      case "--seed":
        options.seed = String(next() || DEFAULTS.seed);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.maxTestsPerStudent < options.minTestsPerStudent) {
    throw new Error("--max-tests must be greater than or equal to --min-tests.");
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
  return Math.min(max, Math.max(min, value));
}

function pickOne(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function variance(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

function stddev(values) {
  return Math.sqrt(variance(values));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

async function loadQuestionBank(path) {
  const raw = await readFile(resolve(path), "utf8");
  const payload = JSON.parse(raw);
  const questions = (payload.adaptiveMixQuestions || payload.questions || [])
    .filter((question) => question?.id && question?.subjectId && question?.topicId)
    .map((question) => ({
      id: question.id,
      subjectId: question.subjectId,
      topicId: question.topicId,
      topicName: findTopicName(payload.subjects || [], question.topicId) || question.topicId,
      difficulty: normalizeDifficulty(question.difficulty),
      eloRating: Number(question.eloRating || DIFFICULTY_RATING[normalizeDifficulty(question.difficulty)]),
      marks: Number(question.marks || 1),
      negativeMarks: Number(question.negativeMarks || 0),
      stemLength: String(question.question || "").length,
      optionCount: Array.isArray(question.options) ? question.options.length : 0,
    }));

  if (questions.length < 50) {
    throw new Error(`Expected at least 50 usable questions, found ${questions.length}.`);
  }

  return questions;
}

function findTopicName(subjects, topicId) {
  for (const subject of subjects) {
    const topic = (subject.topics || []).find((candidate) => candidate.id === topicId);
    if (topic) return topic.name;
  }
  return null;
}

function normalizeDifficulty(value) {
  const difficulty = String(value || "medium").toLowerCase();
  return ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";
}

function buildStudents(options, rng) {
  return Array.from({ length: options.students }, (_, index) => {
    const number = index + 1;
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(index * 7) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const baseUsername = `${firstName}.${lastName}`.toLowerCase();
    const persona = PERSONAS[index % PERSONAS.length];
    const startingRating = 1320 + Math.round(rng() * 420);
    const token = hashString(`${options.seed}:${number}:password`).toString(36).slice(0, 6);

    return {
      user_id: `stu_${options.joinCode.toLowerCase()}_${String(number).padStart(3, "0")}`,
      username: `${baseUsername}.fte455.${String(number).padStart(2, "0")}`,
      full_name: fullName,
      email: `${baseUsername}.fte455.${String(number).padStart(2, "0")}@gateway-sim.edu`,
      password: `GateSim#${options.joinCode}_${String(number).padStart(3, "0")}_${token}`,
      course_join_code: options.joinCode,
      course_title: options.courseTitle,
      enrollment_status: "ready_to_join",
      persona: persona.label,
      starting_rating: startingRating,
      accuracyBias: persona.accuracyBias,
      speedBias: persona.speedBias,
      growth: persona.growth,
    };
  });
}

function buildGraph(questions, rng) {
  const byTopic = groupBy(questions, (question) => question.topicId);
  const bySubject = groupBy(questions, (question) => question.subjectId);
  const edgeMap = new Map();

  function addEdge(source, target, edgeType, rawWeight) {
    if (!source || !target || source.id === target.id) return;
    const key = `${source.id}::${target.id}::${edgeType}`;
    if (edgeMap.has(key)) return;
    edgeMap.set(key, {
      source_q: source.id,
      target_q: target.id,
      edge_type: edgeType,
      weight: Number(clamp(rawWeight, 0.05, 0.95).toFixed(3)),
    });
  }

  for (const topicQuestions of byTopic.values()) {
    const ordered = [...topicQuestions].sort((left, right) => left.eloRating - right.eloRating);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const current = ordered[index];
      const next = ordered[index + 1];
      const similarity = 1 - Math.min(0.85, Math.abs(current.eloRating - next.eloRating) / 1200);
      addEdge(current, next, "same-topic", 0.08 + (1 - similarity) * 0.32 + rng() * 0.04);
      addEdge(next, current, "same-topic", 0.1 + (1 - similarity) * 0.35 + rng() * 0.04);
    }

    const easy = ordered.filter((question) => question.difficulty === "easy");
    const mediumHard = ordered.filter((question) => question.difficulty !== "easy");
    for (let index = 0; index < Math.min(easy.length, mediumHard.length, 8); index += 1) {
      addEdge(easy[index], mediumHard[index], "prerequisite", 0.22 + rng() * 0.22);
    }
  }

  for (const subjectQuestions of bySubject.values()) {
    const topics = [...groupBy(subjectQuestions, (question) => question.topicId).values()]
      .map((items) => [...items].sort((left, right) => left.eloRating - right.eloRating));
    for (let index = 0; index < topics.length - 1; index += 1) {
      for (let hop = 0; hop < 5; hop += 1) {
        addEdge(topics[index][hop], topics[index + 1][hop], "prerequisite", 0.3 + rng() * 0.24);
      }
    }
  }

  const subjects = [...bySubject.values()].map((items) => shuffle(items, rng).slice(0, 20));
  for (let left = 0; left < subjects.length; left += 1) {
    for (let right = left + 1; right < subjects.length; right += 1) {
      const pairCount = Math.min(subjects[left].length, subjects[right].length, 8);
      for (let index = 0; index < pairCount; index += 1) {
        addEdge(subjects[left][index], subjects[right][index], "cross-domain", 0.45 + rng() * 0.35);
        if (rng() > 0.35) addEdge(subjects[right][index], subjects[left][index], "cross-domain", 0.48 + rng() * 0.35);
      }
    }
  }

  return [...edgeMap.values()].sort((left, right) =>
    left.source_q.localeCompare(right.source_q) ||
    left.target_q.localeCompare(right.target_q) ||
    left.edge_type.localeCompare(right.edge_type)
  );
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function buildAdjacency(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.source_q)) adjacency.set(edge.source_q, []);
    adjacency.get(edge.source_q).push(edge);
  }
  return adjacency;
}

function buildQuestionIndex(questions) {
  return new Map(questions.map((question) => [question.id, question]));
}

function estimateCentrality(question, adjacency) {
  const outDegree = adjacency.get(question.id)?.length || 0;
  return clamp(0.05 + outDegree / 18, 0.05, 0.95);
}

function recommendQuestion({ questions, questionById, adjacency, answered, previousQuestion, weakTopics, remediationTopic, rating, rng }) {
  let source = "Graph route";
  let hopDistance = previousQuestion ? 1 : 0;
  let candidates = [];

  if (remediationTopic && previousQuestion) {
    candidates = (adjacency.get(previousQuestion.id) || [])
      .map((edge) => ({ edge, question: questionById.get(edge.target_q) }))
      .filter(({ question }) => question && !answered.has(question.id) && question.topicId === remediationTopic && question.eloRating <= previousQuestion.eloRating);
    source = "Graph route";
  }

  if (candidates.length === 0 && previousQuestion) {
    candidates = (adjacency.get(previousQuestion.id) || [])
      .map((edge) => ({ edge, question: questionById.get(edge.target_q) }))
      .filter(({ question }) => question && !answered.has(question.id));
  }

  if (candidates.length === 0) {
    source = "fallback";
    hopDistance = previousQuestion ? 2 + Math.floor(rng() * 2) : 0;
    candidates = questions
      .filter((question) => !answered.has(question.id))
      .map((question) => ({ edge: null, question }));
  }

  if (candidates.length === 0) {
    answered.clear();
    candidates = questions.map((question) => ({ edge: null, question }));
    source = "fallback";
    hopDistance = 0;
  }

  const targetRating = rating + 40;
  candidates.sort((left, right) => {
    const leftWeak = weakTopics.has(left.question.topicId) ? -90 : 0;
    const rightWeak = weakTopics.has(right.question.topicId) ? -90 : 0;
    const leftScore = Math.abs(left.question.eloRating - targetRating) + (left.edge?.weight || 0.6) * 120 + leftWeak + rng() * 35;
    const rightScore = Math.abs(right.question.eloRating - targetRating) + (right.edge?.weight || 0.6) * 120 + rightWeak + rng() * 35;
    return leftScore - rightScore;
  });

  const selected = candidates[0];
  return {
    question: selected.question,
    graphHopDistance: selected.edge ? 1 : hopDistance,
    recommendationSource: source,
  };
}

function simulateInteractions({ students, questions, graphEdges, options, rng }) {
  const questionById = buildQuestionIndex(questions);
  const adjacency = buildAdjacency(graphEdges);
  const interactions = [];
  const snapshots = [];
  const startTime = Date.UTC(2026, 0, 15, 8, 0, 0);
  const endTime = Date.UTC(2026, 4, 14, 18, 0, 0);

  for (const student of students) {
    const studentRng = createRng(`${options.seed}:${student.user_id}`);
    const state = {
      rating: student.starting_rating,
      streak: 0,
      answered: new Set(),
      recentDeltas: [],
      topicStats: new Map(),
      ratingTrace: [],
      previousQuestion: null,
      remediationTopic: null,
      missedStreak: 0,
    };

    for (let index = 0; index < options.interactionsPerStudent; index += 1) {
      const progress = index / Math.max(1, options.interactionsPerStudent - 1);
      const weakTopics = findWeakTopics(state.topicStats);
      const recommendation = recommendQuestion({
        questions,
        questionById,
        adjacency,
        answered: state.answered,
        previousQuestion: state.previousQuestion,
        weakTopics,
        remediationTopic: state.remediationTopic,
        rating: state.rating,
        rng: studentRng,
      });
      const question = recommendation.question;
      const remediationFlag = Boolean(state.remediationTopic && question.topicId === state.remediationTopic);
      const timestamp = new Date(startTime + progress * (endTime - startTime) + studentRng() * 1000 * 60 * 90).toISOString();
      const centrality = estimateCentrality(question, adjacency);
      const effectiveItemRating = question.eloRating + centrality * 120;
      const expected = 1 / (1 + 10 ** ((effectiveItemRating - state.rating) / 400));
      const fatigue = index > options.interactionsPerStudent * 0.78 ? -0.03 : 0;
      const improvement = student.growth * progress;
      const volatilitySwing = student.persona === "volatile_practicer" ? (studentRng() - 0.5) * 0.22 : 0;
      const difficultyBase = question.difficulty === "hard" ? 0.46 : question.difficulty === "medium" ? 0.56 : 0.7;
      const adaptiveFit = (expected - 0.5) * 0.25;
      const remediationBoost = remediationFlag ? 0.08 : 0;
      const coldRecovery = state.streak <= -3 ? 0.05 : 0;
      const probabilityCorrect = clamp(
        difficultyBase + adaptiveFit + student.accuracyBias + improvement + remediationBoost + coldRecovery + fatigue + volatilitySwing,
        0.18,
        0.95
      );
      const correct = studentRng() < probabilityCorrect;
      const responseTime = estimateResponseTime(question, correct, remediationFlag, student.speedBias, studentRng);
      const rapidGuessPenalty = computeRapidGuessPenalty(question, responseTime);
      const rapidGuessFlag = rapidGuessPenalty > 0;
      const ratingBefore = state.rating;
      const streakBefore = state.streak;
      const update = applyDarsUpdate({
        rating: state.rating,
        answeredCount: index,
        recentDeltas: state.recentDeltas,
        streak: state.streak,
        correct,
        responseTime,
        rapidGuessPenalty,
        question,
        centrality,
        remediationFlag,
      });

      state.rating = update.ratingAfter;
      state.streak = correct ? Math.max(1, state.streak + 1) : Math.min(-1, state.streak - 1);
      state.recentDeltas.push(update.delta);
      state.ratingTrace.push(state.rating);
      state.answered.add(question.id);
      state.previousQuestion = question;
      updateTopicStats(state.topicStats, question.topicId, question.topicName, correct);
      state.missedStreak = correct ? 0 : state.missedStreak + 1;
      state.remediationTopic = !correct || state.missedStreak >= 2 ? question.topicId : null;

      interactions.push({
        user_id: student.user_id,
        question_id: question.id,
        timestamp,
        correctness: correct ? 1 : 0,
        response_time: responseTime,
        rapid_guess_flag: rapidGuessFlag ? 1 : 0,
        rapid_guess_penalty: rapidGuessPenalty,
        streak_before: streakBefore,
        DARS_rating_before: ratingBefore,
        DARS_rating_after: state.rating,
        momentum_state: classifyMomentum(state.streak, state.recentDeltas.slice(-10)),
        topic: question.topicName,
        difficulty_label: titleCase(question.difficulty),
        graph_hop_distance: recommendation.graphHopDistance,
        remediation_flag: remediationFlag ? 1 : 0,
        recommendation_source: recommendation.recommendationSource,
      });
    }

    snapshots.push(buildSnapshot(student.user_id, state, options.interactionsPerStudent, rng));
  }

  return { interactions, snapshots };
}

function simulateTestSessions({ students, questions, graphEdges, options, rng }) {
  const questionById = buildQuestionIndex(questions);
  const adjacency = buildAdjacency(graphEdges);
  const rows = [];
  const questionRows = [];
  const startTime = Date.UTC(2026, 1, 1, 7, 30, 0);
  const endTime = Date.UTC(2026, 4, 14, 20, 0, 0);

  for (const student of students) {
    const studentRng = createRng(`${options.seed}:tests:${student.user_id}`);
    const totalTests =
      options.minTestsPerStudent +
      Math.floor(studentRng() * (options.maxTestsPerStudent - options.minTestsPerStudent + 1));
    const baseCounts = shuffle(options.testQuestionCounts, studentRng);
    const state = {
      rating: student.starting_rating,
      streak: 0,
      answered: new Set(),
      recentDeltas: [],
      topicStats: new Map(),
      previousQuestion: null,
      remediationTopic: null,
      missedStreak: 0,
    };

    for (let testIndex = 0; testIndex < totalTests; testIndex += 1) {
      const progress = totalTests === 1 ? 1 : testIndex / (totalTests - 1);
      const questionCount =
        testIndex < baseCounts.length ? baseCounts[testIndex] : pickOne(options.testQuestionCounts, studentRng);
      const testId = `${student.user_id}_adaptive_mix_${String(testIndex + 1).padStart(2, "0")}`;
      const testStart = new Date(startTime + progress * (endTime - startTime) + studentRng() * 1000 * 60 * 180);
      const ratingBefore = state.rating;
      const momentumBefore = classifyMomentum(state.streak, state.recentDeltas.slice(-10));
      const topicHits = new Map();
      const currentTestQuestionRows = [];
      let score = 0;
      let maxScore = 0;
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let skippedQuestions = 0;
      let questionsAttempted = 0;
      let durationSeconds = 0;
      let responseSeconds = 0;
      let rapidGuessCount = 0;
      let rapidGuessPenaltyTotal = 0;
      let graphRouteCount = 0;
      let fallbackCount = 0;

      for (let questionIndex = 0; questionIndex < questionCount; questionIndex += 1) {
        const weakTopics = findWeakTopics(state.topicStats);
        const recommendation = recommendQuestion({
          questions,
          questionById,
          adjacency,
          answered: state.answered,
          previousQuestion: state.previousQuestion,
          weakTopics,
          remediationTopic: state.remediationTopic,
          rating: state.rating,
          rng: studentRng,
        });
        const question = recommendation.question;
        const remediationFlag = Boolean(state.remediationTopic && question.topicId === state.remediationTopic);
        const centrality = estimateCentrality(question, adjacency);
        const effectiveItemRating = question.eloRating + centrality * 120;
        const expected = 1 / (1 + 10 ** ((effectiveItemRating - state.rating) / 400));
        const testFatigue = questionIndex > questionCount * 0.72 ? -0.04 : 0;
        const longTermGrowth = student.growth * progress;
        const volatilitySwing = student.persona === "volatile_practicer" ? (studentRng() - 0.5) * 0.2 : 0;
        const difficultyBase = question.difficulty === "hard" ? 0.45 : question.difficulty === "medium" ? 0.56 : 0.7;
        const probabilityCorrect = clamp(
          difficultyBase + (expected - 0.5) * 0.24 + student.accuracyBias + longTermGrowth + testFatigue + volatilitySwing,
          0.16,
          0.94
        );
        const attemptProbability = clamp(
          0.96 - (question.difficulty === "hard" ? 0.1 : question.difficulty === "medium" ? 0.05 : 0) +
            student.accuracyBias * 0.25 -
            Math.max(0, questionIndex / questionCount - 0.75) * 0.12,
          0.72,
          0.99
        );
        const attempted = studentRng() < attemptProbability;
        const correct = attempted && studentRng() < probabilityCorrect;
        const streakBeforeQuestion = state.streak;
        const momentumBeforeQuestion = classifyMomentum(state.streak, state.recentDeltas.slice(-10));
        const questionStartedAt = new Date(testStart.getTime() + durationSeconds * 1000);
        const responseTime = attempted
          ? estimateResponseTime(question, correct, remediationFlag, student.speedBias, studentRng)
          : Math.round(clamp(12 + studentRng() * 28, 8, 45));
        const questionEndedAt = new Date(questionStartedAt.getTime() + responseTime * 1000);
        const rapidGuessPenalty = attempted ? computeRapidGuessPenalty(question, responseTime) : 0;

        maxScore += question.marks;
        durationSeconds += responseTime;
        state.answered.add(question.id);
        state.previousQuestion = question;
        topicHits.set(question.topicName, (topicHits.get(question.topicName) || 0) + 1);
        if (recommendation.recommendationSource === "Graph route") graphRouteCount += 1;
        else fallbackCount += 1;

        if (!attempted) {
          skippedQuestions += 1;
          currentTestQuestionRows.push({
            user_id: student.user_id,
            test_id: testId,
            question_order: questionIndex + 1,
            question_id: question.id,
            course_join_code: student.course_join_code,
            test_type: "adaptive_mix",
            adaptive_mix_label: `Adaptive test mix (${questionCount})`,
            question_count_in_test: questionCount,
            timestamp_start: questionStartedAt.toISOString(),
            timestamp_end: questionEndedAt.toISOString(),
            response_status: "skipped",
            attempted: 0,
            correctness: "",
            score_awarded: 0,
            max_marks: question.marks,
            negative_marks: question.negativeMarks,
            response_time: responseTime,
            rapid_guess_flag: 0,
            rapid_guess_penalty: 0,
            streak_before: streakBeforeQuestion,
            streak_after: state.streak,
            momentum_before: momentumBeforeQuestion,
            momentum_after: momentumBeforeQuestion,
            DARS_rating_before_test: ratingBefore,
            DARS_rating_after_test: "",
            test_rating_delta: "",
            expected_success: expected.toFixed(3),
            attempt_probability: attemptProbability.toFixed(3),
            topic: question.topicName,
            topic_id: question.topicId,
            subject_id: question.subjectId,
            difficulty_label: titleCase(question.difficulty),
            question_elo: question.eloRating,
            graph_hop_distance: recommendation.graphHopDistance,
            remediation_flag: remediationFlag ? 1 : 0,
            recommendation_source: recommendation.recommendationSource,
          });
          continue;
        }

        questionsAttempted += 1;
        responseSeconds += responseTime;
        if (rapidGuessPenalty > 0) {
          rapidGuessCount += 1;
          rapidGuessPenaltyTotal += rapidGuessPenalty;
        }

        if (correct) {
          correctAnswers += 1;
          score += question.marks;
        } else {
          wrongAnswers += 1;
          score -= question.negativeMarks;
        }

        state.streak = correct ? Math.max(1, state.streak + 1) : Math.min(-1, state.streak - 1);
        const momentumAfterQuestion = classifyMomentum(state.streak, state.recentDeltas.slice(-10));
        updateTopicStats(state.topicStats, question.topicId, question.topicName, correct);
        state.missedStreak = correct ? 0 : state.missedStreak + 1;
        state.remediationTopic = !correct || state.missedStreak >= 2 ? question.topicId : null;

        currentTestQuestionRows.push({
          user_id: student.user_id,
          test_id: testId,
          question_order: questionIndex + 1,
          question_id: question.id,
          course_join_code: student.course_join_code,
          test_type: "adaptive_mix",
          adaptive_mix_label: `Adaptive test mix (${questionCount})`,
          question_count_in_test: questionCount,
          timestamp_start: questionStartedAt.toISOString(),
          timestamp_end: questionEndedAt.toISOString(),
          response_status: correct ? "correct" : "incorrect",
          attempted: 1,
          correctness: correct ? 1 : 0,
          score_awarded: Number((correct ? question.marks : -question.negativeMarks).toFixed(2)),
          max_marks: question.marks,
          negative_marks: question.negativeMarks,
          response_time: responseTime,
          rapid_guess_flag: rapidGuessPenalty > 0 ? 1 : 0,
          rapid_guess_penalty: rapidGuessPenalty,
          streak_before: streakBeforeQuestion,
          streak_after: state.streak,
          momentum_before: momentumBeforeQuestion,
          momentum_after: momentumAfterQuestion,
          DARS_rating_before_test: ratingBefore,
          DARS_rating_after_test: "",
          test_rating_delta: "",
          expected_success: expected.toFixed(3),
          attempt_probability: attemptProbability.toFixed(3),
          topic: question.topicName,
          topic_id: question.topicId,
          subject_id: question.subjectId,
          difficulty_label: titleCase(question.difficulty),
          question_elo: question.eloRating,
          graph_hop_distance: recommendation.graphHopDistance,
          remediation_flag: remediationFlag ? 1 : 0,
          recommendation_source: recommendation.recommendationSource,
        });
      }

      const breakSeconds = testIndex > 0 ? Math.round(60 + studentRng() * 240) : 0;
      const testEnd = new Date(testStart.getTime() + (durationSeconds + breakSeconds) * 1000);
      const accuracy = questionsAttempted ? correctAnswers / questionsAttempted : 0;
      const completionRate = questionCount ? questionsAttempted / questionCount : 0;
      const dominantTopics = [...topicHits.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([topic]) => topic)
        .join("|");
      const weakTopicsAfter = [...state.topicStats.values()]
        .filter((row) => row.total >= 3 && row.correct / row.total < 0.55)
        .sort((left, right) => left.correct / left.total - right.correct / right.total)
        .slice(0, 3)
        .map((row) => row.topicName)
        .join("|") || "None";
      const recommendationMode = graphRouteCount >= fallbackCount ? "graph-dominant" : "fallback-heavy";
      const expectedAccuracy = questionCount >= 65 ? 0.56 : questionCount <= 30 ? 0.6 : 0.58;
      const performancePressure = (accuracy - expectedAccuracy) * 150;
      const completionPressure = (completionRate - 0.9) * 30;
      const rapidGuessPressure = rapidGuessPenaltyTotal * 0.4;
      const calibrationNoise = (studentRng() - 0.5) * 12;
      const testRatingDelta = Math.round(
        clamp(performancePressure + completionPressure - rapidGuessPressure + calibrationNoise, -55, 75)
      );
      state.rating = Math.round(clamp(ratingBefore + testRatingDelta, 850, 2300));
      state.recentDeltas.push(testRatingDelta);
      questionRows.push(
        ...currentTestQuestionRows.map((row) => ({
          ...row,
          DARS_rating_after_test: state.rating,
          test_rating_delta: testRatingDelta,
        }))
      );

      rows.push({
        user_id: student.user_id,
        test_id: testId,
        course_join_code: student.course_join_code,
        test_type: "adaptive_mix",
        adaptive_mix_label: `Adaptive test mix (${questionCount})`,
        timestamp_start: testStart.toISOString(),
        timestamp_end: testEnd.toISOString(),
        question_count: questionCount,
        questions_attempted: questionsAttempted,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        skipped_questions: skippedQuestions,
        score: Number(score.toFixed(2)),
        max_score: Number(maxScore.toFixed(2)),
        accuracy: accuracy.toFixed(3),
        completion_rate: completionRate.toFixed(3),
        duration_seconds: durationSeconds + breakSeconds,
        avg_response_time: questionsAttempted ? Math.round(responseSeconds / questionsAttempted) : 0,
        rapid_guess_count: rapidGuessCount,
        rapid_guess_penalty_total: Number(rapidGuessPenaltyTotal.toFixed(2)),
        DARS_rating_before: ratingBefore,
        DARS_rating_after: state.rating,
        rating_delta: testRatingDelta,
        momentum_before: momentumBefore,
        momentum_after: classifyMomentum(state.streak, state.recentDeltas.slice(-10)),
        dominant_topics: dominantTopics,
        weak_topics_after: weakTopicsAfter,
        recommendation_mode: recommendationMode,
      });
    }
  }

  return {
    sessions: rows.sort((left, right) => left.timestamp_start.localeCompare(right.timestamp_start)),
    questionResponses: questionRows.sort((left, right) =>
      left.timestamp_start.localeCompare(right.timestamp_start) || left.question_order - right.question_order
    ),
  };
}

function estimateResponseTime(question, correct, remediationFlag, speedBias, rng) {
  const base = question.difficulty === "hard" ? 118 : question.difficulty === "medium" ? 82 : 48;
  const stemLoad = Math.min(38, question.stemLength / 20);
  const correctnessAdjustment = correct ? -8 : 14;
  const remediationAdjustment = remediationFlag ? 12 : 0;
  const noise = (rng() - 0.5) * 34;
  return Math.round(clamp(base + stemLoad + correctnessAdjustment + remediationAdjustment + speedBias * 80 + noise, 12, 260));
}

function getReferenceTimeSeconds(question) {
  return question.difficulty === "hard" ? 130 : question.difficulty === "medium" ? 90 : 60;
}

function computeRapidGuessPenalty(question, responseTime) {
  const threshold = getReferenceTimeSeconds(question) * 0.35;
  if (responseTime >= threshold) return 0;
  const severity = (threshold - responseTime) / threshold;
  return Number(clamp(2 + severity * 10, 2, 12).toFixed(2));
}

function applyDarsUpdate({ rating, answeredCount, recentDeltas, streak, correct, responseTime, rapidGuessPenalty, question, centrality, remediationFlag }) {
  const reference = getReferenceTimeSeconds(question);
  const timeEfficiency = clamp((reference - responseTime + reference * 0.15) / reference, 0, 1);
  const streakQuality = 0.5 * (1 + streak / Math.max(Math.abs(streak), 5));
  const performanceQuality = correct
    ? clamp(0.65 * timeEfficiency + 0.35 * streakQuality, 0, 1)
    : Math.min(0.1, 0.05 * timeEfficiency);
  const kMax = 60;
  const kMin = 16;
  const countDecay = answeredCount < 30 ? 1 : Math.exp(-0.015 * (answeredCount - 30));
  const uncertainty = variance(recentDeltas.slice(-20));
  const uncertaintyWeight = uncertainty / (uncertainty + 100);
  const dynamicK = answeredCount < 30 ? kMax : clamp(kMin + (kMax - kMin) * countDecay * uncertaintyWeight, kMin, kMax);
  const adjustedK = remediationFlag ? dynamicK * 0.6 : dynamicK;
  const absStreak = Math.abs(streak);
  const streakMultiplier = absStreak < 3 ? 1 : streak > 0 ? 1 + Math.min(0.35, (absStreak - 3) / 4 * 0.35) : 1 - Math.min(0.35, (absStreak - 3) / 4 * 0.35);
  const effectiveDifficulty = question.eloRating + 150 * centrality;
  const expected = 1 / (1 + 10 ** ((effectiveDifficulty - rating) / 400));
  let delta = adjustedK * streakMultiplier * (performanceQuality - expected);
  if (rapidGuessPenalty > 0) delta -= rapidGuessPenalty;
  const roundedDelta = Math.round(delta);

  return {
    ratingAfter: Math.round(clamp(rating + roundedDelta, 800, 2400)),
    delta: roundedDelta,
  };
}

function classifyMomentum(streak, recentDeltas) {
  const meanDelta = recentDeltas.length
    ? recentDeltas.reduce((sum, value) => sum + value, 0) / recentDeltas.length
    : 0;
  if (streak >= 4 && meanDelta > 0) return "hot";
  if (streak <= -3 || meanDelta < -7) return "cold";
  return "steady";
}

function updateTopicStats(topicStats, topicId, topicName, correct) {
  const current = topicStats.get(topicId) || { topicName, correct: 0, total: 0 };
  current.total += 1;
  if (correct) current.correct += 1;
  topicStats.set(topicId, current);
}

function findWeakTopics(topicStats) {
  const weak = new Set();
  for (const [topicId, stats] of topicStats.entries()) {
    if (stats.total >= 4 && stats.correct / stats.total < 0.52) weak.add(topicId);
  }
  return weak;
}

function buildSnapshot(userId, state, expectedInteractions, rng) {
  const topicRows = [...state.topicStats.values()];
  const total = topicRows.reduce((sum, row) => sum + row.total, 0);
  const correct = topicRows.reduce((sum, row) => sum + row.correct, 0);
  const accuracies = topicRows.map((row) => row.correct / row.total);
  const accuracy = total ? correct / total : 0;
  const consistency = clamp(1 - stddev(accuracies) / 0.35, 0, 1);
  const volatility = stddev(state.ratingTrace.slice(-80));
  const completionRate = clamp(total / Math.round(expectedInteractions * (1.04 + rng() * 0.16)), 0, 1);
  const weakTopics = topicRows
    .filter((row) => row.total >= 5 && row.correct / row.total < 0.55)
    .sort((left, right) => left.correct / left.total - right.correct / right.total)
    .slice(0, 4)
    .map((row) => row.topicName)
    .join("|") || "None";
  const normalizedProficiency = clamp((state.rating - 1200) / 900, 0, 1);
  const stability = clamp(1 - volatility / 180, 0, 1);
  const predictedScore = Math.round(100 * (
    0.35 * accuracy +
    0.25 * normalizedProficiency +
    0.2 * consistency +
    0.1 * completionRate +
    0.1 * stability
  ));

  return {
    user_id: userId,
    accuracy: accuracy.toFixed(3),
    consistency: consistency.toFixed(3),
    volatility: volatility.toFixed(2),
    completion_rate: completionRate.toFixed(3),
    weak_topics: weakTopics,
    predicted_score: predictedScore,
  };
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rng = createRng(options.seed);
  const questions = await loadQuestionBank(options.questionBankPath);
  const students = buildStudents(options, rng);
  const graphEdges = buildGraph(questions, rng);
  const { interactions, snapshots } = simulateInteractions({ students, questions, graphEdges, options, rng });
  const { sessions: testSessions, questionResponses: testQuestionResponses } = simulateTestSessions({
    students,
    questions,
    graphEdges,
    options,
    rng,
  });

  const outputDir = resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const studentRows = students.map((student) => ({
    user_id: student.user_id,
    username: student.username,
    full_name: student.full_name,
    email: student.email,
    password: student.password,
    course_join_code: student.course_join_code,
    course_title: student.course_title,
    enrollment_status: student.enrollment_status,
    persona: student.persona,
    starting_rating: student.starting_rating,
  }));

  const interactionHeaders = [
    "user_id",
    "question_id",
    "timestamp",
    "correctness",
    "response_time",
    "rapid_guess_flag",
    "rapid_guess_penalty",
    "streak_before",
    "DARS_rating_before",
    "DARS_rating_after",
    "momentum_state",
    "topic",
    "difficulty_label",
    "graph_hop_distance",
    "remediation_flag",
    "recommendation_source",
  ];
  const graphHeaders = ["source_q", "target_q", "edge_type", "weight"];
  const testSessionHeaders = [
    "user_id",
    "test_id",
    "course_join_code",
    "test_type",
    "adaptive_mix_label",
    "timestamp_start",
    "timestamp_end",
    "question_count",
    "questions_attempted",
    "correct_answers",
    "wrong_answers",
    "skipped_questions",
    "score",
    "max_score",
    "accuracy",
    "completion_rate",
    "duration_seconds",
    "avg_response_time",
    "rapid_guess_count",
    "rapid_guess_penalty_total",
    "DARS_rating_before",
    "DARS_rating_after",
    "rating_delta",
    "momentum_before",
    "momentum_after",
    "dominant_topics",
    "weak_topics_after",
    "recommendation_mode",
  ];
  const testQuestionResponseHeaders = [
    "user_id",
    "test_id",
    "question_order",
    "question_id",
    "course_join_code",
    "test_type",
    "adaptive_mix_label",
    "question_count_in_test",
    "timestamp_start",
    "timestamp_end",
    "response_status",
    "attempted",
    "correctness",
    "score_awarded",
    "max_marks",
    "negative_marks",
    "response_time",
    "rapid_guess_flag",
    "rapid_guess_penalty",
    "streak_before",
    "streak_after",
    "momentum_before",
    "momentum_after",
    "DARS_rating_before_test",
    "DARS_rating_after_test",
    "test_rating_delta",
    "expected_success",
    "attempt_probability",
    "topic",
    "topic_id",
    "subject_id",
    "difficulty_label",
    "question_elo",
    "graph_hop_distance",
    "remediation_flag",
    "recommendation_source",
  ];
  const snapshotHeaders = ["user_id", "accuracy", "consistency", "volatility", "completion_rate", "weak_topics", "predicted_score"];
  const studentHeaders = ["user_id", "username", "full_name", "email", "password", "course_join_code", "course_title", "enrollment_status", "persona", "starting_rating"];

  await writeFile(resolve(outputDir, "student_interactions.csv"), `${toCsv(interactionHeaders, interactions)}\n`, "utf8");
  await writeFile(resolve(outputDir, "question_knowledge_graph.csv"), `${toCsv(graphHeaders, graphEdges)}\n`, "utf8");
  await writeFile(resolve(outputDir, "student_test_sessions.csv"), `${toCsv(testSessionHeaders, testSessions)}\n`, "utf8");
  await writeFile(resolve(outputDir, "student_test_question_responses.csv"), `${toCsv(testQuestionResponseHeaders, testQuestionResponses)}\n`, "utf8");
  await writeFile(resolve(outputDir, "student_performance_snapshots.csv"), `${toCsv(snapshotHeaders, snapshots)}\n`, "utf8");
  await writeFile(resolve(outputDir, "bot_students_fte455.csv"), `${toCsv(studentHeaders, studentRows)}\n`, "utf8");

  const manifest = {
    generatedAt: new Date().toISOString(),
    options,
    sourceQuestionBank: resolve(options.questionBankPath),
    files: {
      studentInteractions: "student_interactions.csv",
      questionKnowledgeGraph: "question_knowledge_graph.csv",
      studentTestSessions: "student_test_sessions.csv",
      studentTestQuestionResponses: "student_test_question_responses.csv",
      studentPerformanceSnapshots: "student_performance_snapshots.csv",
      botStudents: "bot_students_fte455.csv",
    },
    rowCounts: {
      studentInteractions: interactions.length,
      questionKnowledgeGraph: graphEdges.length,
      studentTestSessions: testSessions.length,
      studentTestQuestionResponses: testQuestionResponses.length,
      studentPerformanceSnapshots: snapshots.length,
      botStudents: studentRows.length,
    },
  };
  await writeFile(resolve(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
