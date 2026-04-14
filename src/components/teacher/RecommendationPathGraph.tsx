import { useMemo } from "react";
import { subjects } from "@/data/subjects";
import { questions } from "@/data/questions";
import {
  buildQuestionRecommendationGraph,
  type QuestionGraphEdge,
} from "@/lib/nextBestQuestionEngine";
import type { TeacherRecommendationPathSession } from "@/lib/teacherAnalytics";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#2e9d65",
  medium: "#d99017",
  hard: "#c14545",
};

type PositionedNode = {
  id: string;
  x: number;
  y: number;
  subjectId: string;
  topicId: string;
  difficulty: string;
};

export function RecommendationPathGraph({
  session,
  title = "Graph-guided path replay",
  emptyText = "A highlighted traversal will appear here after the student completes a graph-guided test.",
}: {
  session: TeacherRecommendationPathSession | null;
  title?: string;
  emptyText?: string;
}) {
  const graphModel = useMemo(() => {
    const graph = buildQuestionRecommendationGraph(questions);
    const subjectWidth = 220;
    const clusterPadding = 28;
    const difficultyX = {
      easy: 36,
      medium: 102,
      hard: 168,
    } as const;

    const positionedNodes = new Map<string, PositionedNode>();
    let maxRow = 0;

    subjects.forEach((subject, subjectIndex) => {
      const subjectQuestions = questions
        .filter((question) => question.subjectId === subject.id)
        .sort((left, right) => {
          const leftTopicIndex = subject.topics.findIndex((topic) => topic.id === left.topicId);
          const rightTopicIndex = subject.topics.findIndex((topic) => topic.id === right.topicId);
          if (leftTopicIndex !== rightTopicIndex) return leftTopicIndex - rightTopicIndex;
          if (left.eloRating !== right.eloRating) return left.eloRating - right.eloRating;
          return left.id.localeCompare(right.id);
        });

      const topicBuckets = new Map<string, typeof subjectQuestions>();
      subjectQuestions.forEach((question) => {
        const current = topicBuckets.get(question.topicId) || [];
        current.push(question);
        topicBuckets.set(question.topicId, current);
      });

      let row = 0;
      subject.topics.forEach((topic) => {
        const topicQuestions = topicBuckets.get(topic.id) || [];
        topicQuestions.forEach((question) => {
          positionedNodes.set(question.id, {
            id: question.id,
            subjectId: question.subjectId,
            topicId: question.topicId,
            difficulty: question.difficulty,
            x: subjectIndex * subjectWidth + difficultyX[question.difficulty] + clusterPadding,
            y: 78 + row * 18,
          });
          row += 1;
        });

        if (topicQuestions.length > 0) {
          row += 1;
        }
      });

      maxRow = Math.max(maxRow, row);
    });

    const pathQuestionIds = session?.questionIds || [];
    const pathNodeSet = new Set(pathQuestionIds);
    const pathEdgeSet = new Set(
      pathQuestionIds.slice(1).map((questionId, index) => `${pathQuestionIds[index]}::${questionId}`)
    );

    const visibleEdges = graph.edges.filter((edge) => {
      if (pathEdgeSet.has(`${edge.sourceId}::${edge.targetId}`)) return true;
      if (edge.kind === "subject-bridge") return true;
      if (pathNodeSet.has(edge.sourceId) && edge.sameTopic) return true;
      return false;
    });

    return {
      graph,
      positionedNodes,
      visibleEdges,
      pathNodeSet,
      pathEdgeSet,
      width: Math.max(subjects.length * subjectWidth + 64, 960),
      height: Math.max(240, maxRow * 18 + 110),
    };
  }, [session]);

  if (!session) {
    return (
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <div className="mt-4 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          {emptyText}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.studentName} explored {session.subjectName}
            {session.topicId ? ` -> ${session.topicName}` : ""} through neighboring graph nodes.
          </p>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <LegendItem color={DIFFICULTY_COLOR.easy} label="Easy node" />
          <LegendItem color={DIFFICULTY_COLOR.medium} label="Medium node" />
          <LegendItem color={DIFFICULTY_COLOR.hard} label="Hard node" />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border bg-slate-950/95 p-3">
        <svg
          width={graphModel.width}
          height={graphModel.height}
          viewBox={`0 0 ${graphModel.width} ${graphModel.height}`}
          className="min-w-full"
        >
          {subjects.map((subject, index) => {
            const x = index * 220 + 12;
            return (
              <g key={subject.id}>
                <rect
                  x={x}
                  y={16}
                  width={196}
                  height={graphModel.height - 28}
                  rx={18}
                  fill="rgba(255,255,255,0.03)"
                  stroke="rgba(255,255,255,0.08)"
                />
                <text x={x + 16} y={42} fill="#f8fafc" fontSize="13" fontWeight="700">
                  {subject.name}
                </text>
                <text x={x + 16} y={58} fill="#94a3b8" fontSize="10">
                  easy / medium / hard
                </text>
              </g>
            );
          })}

          {graphModel.visibleEdges.map((edge) => (
            <GraphEdgeLine
              key={`${edge.sourceId}-${edge.targetId}`}
              edge={edge}
              nodes={graphModel.positionedNodes}
              highlighted={graphModel.pathEdgeSet.has(`${edge.sourceId}::${edge.targetId}`)}
            />
          ))}

          {[...graphModel.positionedNodes.values()].map((node) => {
            const pathIndex = session.questionIds.findIndex((questionId) => questionId === node.id);
            const highlighted = pathIndex !== -1;

            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={highlighted ? 7.5 : 4}
                  fill={DIFFICULTY_COLOR[node.difficulty] || "#58a6ff"}
                  stroke={highlighted ? "#f8fafc" : "rgba(255,255,255,0.12)"}
                  strokeWidth={highlighted ? 2.6 : 0.8}
                  opacity={highlighted ? 1 : 0.78}
                />
                {highlighted && (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={12}
                      fill="none"
                      stroke="rgba(250,204,21,0.35)"
                      strokeWidth={2}
                    />
                    <text
                      x={node.x}
                      y={node.y - 12}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="10"
                      fontWeight="700"
                    >
                      {pathIndex + 1}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
          {session.testType.replace(/-/g, " ")}
        </span>
        <span className="rounded-full bg-muted px-3 py-1">
          {session.totalQuestions} questions
        </span>
        {typeof session.accuracy === "number" && (
          <span className="rounded-full bg-muted px-3 py-1">
            {session.accuracy}% accuracy
          </span>
        )}
        <span className="rounded-full bg-muted px-3 py-1">
          {new Date(session.createdAt).toLocaleString()}
        </span>
      </div>
    </section>
  );
}

function GraphEdgeLine({
  edge,
  nodes,
  highlighted,
}: {
  edge: QuestionGraphEdge;
  nodes: Map<string, PositionedNode>;
  highlighted: boolean;
}) {
  const source = nodes.get(edge.sourceId);
  const target = nodes.get(edge.targetId);
  if (!source || !target) return null;

  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={
        highlighted
          ? "#facc15"
          : edge.kind === "subject-bridge"
            ? "rgba(96,165,250,0.28)"
            : edge.sameTopic
              ? "rgba(46,157,101,0.18)"
              : "rgba(148,163,184,0.16)"
      }
      strokeWidth={highlighted ? 3.2 : edge.kind === "subject-bridge" ? 1.4 : 1}
      strokeOpacity={highlighted ? 0.95 : 1}
    />
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
