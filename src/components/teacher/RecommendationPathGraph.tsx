import {
  QuestionTraversalGraph,
  type TraversalNodeState,
} from "@/components/QuestionTraversalGraph";
import type { TeacherRecommendationPathSession } from "@/lib/teacherAnalytics";

function buildSessionNodeStates(session: TeacherRecommendationPathSession | null) {
  if (!session) return {};

  return session.steps.reduce<Record<string, TraversalNodeState | undefined>>((accumulator, step) => {
    if (step.correct === true) {
      accumulator[step.questionId] = "correct";
    } else if (step.correct === false) {
      accumulator[step.questionId] = "wrong";
    } else {
      accumulator[step.questionId] = "pending";
    }

    return accumulator;
  }, {});
}

export function RecommendationPathGraph({
  session,
  title = "Graph-guided path replay",
  emptyText = "A highlighted traversal will appear here after the student completes a graph-guided test.",
}: {
  session: TeacherRecommendationPathSession | null;
  title?: string;
  emptyText?: string;
}) {
  const description = session
    ? `${session.studentName} explored ${session.subjectName}${session.topicId ? ` -> ${session.topicName}` : ""} through neighboring graph nodes.`
    : undefined;

  const footerItems = session
    ? [
        session.testType.replace(/-/g, " "),
        `${session.totalQuestions} questions`,
        typeof session.accuracy === "number" ? `${session.accuracy}% accuracy` : null,
        new Date(session.createdAt).toLocaleString(),
      ].filter((item): item is string => Boolean(item))
    : [];

  return (
    <QuestionTraversalGraph
      title={title}
      description={description}
      emptyText={emptyText}
      questionIds={session?.questionIds || []}
      nodeStates={buildSessionNodeStates(session)}
      connectionMode="path"
      showOrder
      footerItems={footerItems}
    />
  );
}
