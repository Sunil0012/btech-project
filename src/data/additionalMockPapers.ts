import { daMockPaper7Questions as rawMockPaper4Questions } from "./GateMockPaper4";
import { daMockPaper6Questions as rawMockPaper5Questions } from "./GateMockPaper5";
import { daMockPaper5Questions as rawMockPaper6Questions } from "./GateMockPaper6";
import { daMockPaper5Questions as rawMockPaper7Questions } from "./GateMockPaper7";
import { normalizeMockPaperQuestions } from "./gateMockPaperUtils";

export const gateMockPaper4Questions = normalizeMockPaperQuestions(rawMockPaper4Questions, "mock4");
export const gateMockPaper5Questions = normalizeMockPaperQuestions(rawMockPaper5Questions, "mock5");
export const gateMockPaper6Questions = normalizeMockPaperQuestions(rawMockPaper6Questions, "mock6");
export const gateMockPaper7Questions = normalizeMockPaperQuestions(rawMockPaper7Questions, "mock7");

export const additionalMockPaperQuestions = [
  ...gateMockPaper4Questions,
  ...gateMockPaper5Questions,
  ...gateMockPaper6Questions,
  ...gateMockPaper7Questions,
];
