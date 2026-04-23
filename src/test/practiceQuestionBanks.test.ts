import { describe, expect, it } from "vitest";

import { availableFullTests, getFullTestQuestions } from "@/data/fullTests";
import { adaptiveMixQuestions } from "@/data/adaptiveMixTest";
import { adaptiveQuestions } from "@/data/adaptiveTest";
import { questions, updateElo } from "@/data/questions";
import { topicWiseQuestions, topicWiseQuestionsByTopic } from "@/data/topicWiseTest";

describe("curated practice banks", () => {
  it("builds a topic-wise bank that carries tags on every question", () => {
    expect(topicWiseQuestions.length).toBeGreaterThan(questions.length);
    expect(topicWiseQuestions.every((question) => question.tags.length >= 2)).toBe(true);
    expect(topicWiseQuestionsByTopic["la-matrices"]?.length ?? 0).toBeGreaterThan(0);
    expect(topicWiseQuestionsByTopic["ml-supervised"]?.length ?? 0).toBeGreaterThan(0);
  });

  it("adds harder questions to adaptive subject-wise and mix banks", () => {
    expect(adaptiveQuestions.some((question) => question.id === "adaptive-hard-ml-1")).toBe(true);
    expect(adaptiveMixQuestions.some((question) => question.id === "adaptive-mix-hard-1")).toBe(true);
    expect(
      adaptiveMixQuestions.filter((question) => question.difficulty === "hard").length
    ).toBeGreaterThan(
      adaptiveQuestions.filter((question) => question.difficulty === "hard").length
    );
  });

  it("includes mock papers 4 to 7 across shared and full-test banks", () => {
    expect(questions.some((question) => question.id === "mock4-q1")).toBe(true);
    expect(questions.some((question) => question.id === "mock5-q1")).toBe(true);
    expect(questions.some((question) => question.id === "mock6-q1")).toBe(true);
    expect(questions.some((question) => question.id === "mock7-q1")).toBe(true);
    expect(topicWiseQuestions.some((question) => question.id === "mock4-q1")).toBe(true);
    expect(adaptiveQuestions.some((question) => question.id === "mock5-q1")).toBe(true);
    expect(getFullTestQuestions("mock-paper-6").some((question) => question.id === "mock6-q1")).toBe(true);
    expect(availableFullTests.some((test) => test.id === "mock-paper-7")).toBe(true);
  });

  it("only upgrades ELO on correct answers", () => {
    expect(updateElo(1500, 1500, false)).toBe(1500);
    expect(updateElo(1500, 1500, true)).toBeGreaterThan(1500);
  });
});
