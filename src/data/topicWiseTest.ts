/**
 * Topic-wise test data module
 * Exports both the runtime topic-wise selectors and a tagged curated bank
 * used by insights/tests.
 */

import { subjects } from "./subjects";
import { getQuestionsBySubject, getTopicWiseQuestions, questions } from "./questions";
import type { Question } from "./questions";

export type TopicWiseBankQuestion = Question & {
  tags: string[];
  sourceQuestionId: string;
  practiceMode: "topic-wise";
};

const subjectMetaById = new Map(subjects.map((subject) => [subject.id, subject]));
const topicMetaById = new Map(
  subjects.flatMap((subject) =>
    subject.topics.map((topic) => [topic.id, { topic, subject }] as const)
  )
);

function buildTags(question: Question) {
  const subjectMeta = subjectMetaById.get(question.subjectId);
  const topicMeta = topicMetaById.get(question.topicId);

  return [
    subjectMeta?.shortName || question.subjectId,
    topicMeta?.topic.name || question.topicId,
    question.difficulty,
  ];
}

function toTaggedQuestion(
  question: Question,
  extraTags: string[] = [],
  overrides: Partial<Question> = {}
): TopicWiseBankQuestion {
  return {
    ...question,
    ...overrides,
    tags: [...buildTags(question), ...extraTags],
    sourceQuestionId: question.id,
    practiceMode: "topic-wise",
  };
}

const guidedTopicVariants = Array.from(
  new Map(questions.map((question) => [question.topicId, question])).values()
).map((question) =>
  toTaggedQuestion(question, ["guided-practice"], {
    id: `${question.id}-topic-guide`,
  })
);

export const topicWiseQuestions: TopicWiseBankQuestion[] = [
  ...questions.map((question) => toTaggedQuestion(question)),
  ...guidedTopicVariants,
];

export const topicWiseQuestionsByTopic = topicWiseQuestions.reduce<
  Record<string, TopicWiseBankQuestion[]>
>((accumulator, question) => {
  const bucket = accumulator[question.topicId] || [];
  bucket.push(question);
  accumulator[question.topicId] = bucket;
  return accumulator;
}, {});

export function getTopicWiseTestQuestions({
  subjectId,
  topicId,
  count,
  answeredIds,
}: {
  subjectId?: string;
  topicId?: string;
  count: number;
  answeredIds: Set<string>;
}): Question[] {
  if (topicId) {
    return getTopicWiseQuestions(topicId, answeredIds, count);
  }

  if (subjectId) {
    return getQuestionsBySubject(subjectId)
      .filter((question) => !answeredIds.has(question.id))
      .slice(0, count);
  }

  return [];
}
