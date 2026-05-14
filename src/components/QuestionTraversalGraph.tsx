import { useMemo } from "react";
import { subjects } from "@/data/subjects";
import { questions } from "@/data/questions";
import {
  buildQuestionRecommendationGraph,
  type QuestionGraphEdge,
} from "@/lib/nextBestQuestionEngine";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#2e9d65",
  medium: "#d99017",
  hard: "#c14545",
};

const NODE_STATE_COLOR: Record<TraversalNodeState, string> = {
  correct: "#22c55e",
  wrong: "#ef4444",
  current: "#38bdf8",
  pending: "#f59e0b",
};

type PositionedNode = {
  id: string;
  x: number;
  y: number;
  subjectId: string;
  topicId: string;
  difficulty: string;
};

type BaseGraphModel = {
  graph: ReturnType<typeof buildQuestionRecommendationGraph>;
  positionedNodes: Map<string, PositionedNode>;
  width: number;
  height: number;
};

export type TraversalNodeState = "correct" | "wrong" | "current" | "pending";
export type TraversalConnectionMode = "path" | "graph";

export type TraversalLegendItem = {
  color: string;
  label: string;
  variant?: "fill" | "ring";
};

const QUESTION_LOOKUP = new Map(questions.map((question) => [question.id, question] as const));
const BASE_GRAPH_MODEL = createBaseGraphModel();

function createBaseGraphModel(): BaseGraphModel {
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

  return {
    graph,
    positionedNodes,
    width: Math.max(subjects.length * subjectWidth + 64, 960),
    height: Math.max(240, maxRow * 18 + 110),
  };
}

function getDefaultLegend(connectionMode: TraversalConnectionMode) {
  if (connectionMode === "graph") {
    return [
      { color: NODE_STATE_COLOR.correct, label: "Correct attempt" },
      { color: NODE_STATE_COLOR.wrong, label: "Wrong attempt" },
    ] satisfies TraversalLegendItem[];
  }

  return [
    { color: NODE_STATE_COLOR.current, label: "Current node", variant: "ring" },
    { color: NODE_STATE_COLOR.correct, label: "Correct" },
    { color: NODE_STATE_COLOR.wrong, label: "Wrong" },
    { color: NODE_STATE_COLOR.pending, label: "Unanswered path" },
  ] satisfies TraversalLegendItem[];
}

function uniqueQuestionIds(questionIds: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  questionIds.forEach((questionId) => {
    if (!questionId || seen.has(questionId)) return;
    seen.add(questionId);
    ordered.push(questionId);
  });

  return ordered;
}

export function QuestionTraversalGraph({
  title,
  description,
  emptyText = "A traversal will appear here once the student starts moving through the graph.",
  questionIds,
  currentQuestionId = null,
  nodeStates,
  connectionMode = "path",
  showOrder = connectionMode === "path",
  legendItems,
  footerItems = [],
}: {
  title: string;
  description?: string;
  emptyText?: string;
  questionIds: string[];
  currentQuestionId?: string | null;
  nodeStates?: Record<string, TraversalNodeState | undefined>;
  connectionMode?: TraversalConnectionMode;
  showOrder?: boolean;
  legendItems?: TraversalLegendItem[];
  footerItems?: string[];
}) {
  const orderedQuestionIds = useMemo(() => uniqueQuestionIds(questionIds), [questionIds]);

  const graphModel = useMemo(() => {
    const pathNodeSet = new Set(orderedQuestionIds);
    const overlayPairs = orderedQuestionIds.slice(1).map((questionId, index) => ({
      sourceId: orderedQuestionIds[index],
      targetId: questionId,
      key: `${orderedQuestionIds[index]}::${questionId}`,
    }));

    const visibleEdges = BASE_GRAPH_MODEL.graph.edges.filter((edge) => {
      if (connectionMode === "graph") {
        return pathNodeSet.has(edge.sourceId) && pathNodeSet.has(edge.targetId);
      }

      if (edge.kind === "subject-bridge") return true;
      if (pathNodeSet.has(edge.sourceId) && pathNodeSet.has(edge.targetId)) return true;
      if (pathNodeSet.has(edge.sourceId) && edge.sameTopic) return true;
      return false;
    });

    return {
      ...BASE_GRAPH_MODEL,
      visibleEdges,
      overlayPairs,
      pathNodeSet,
    };
  }, [connectionMode, orderedQuestionIds]);

  const activeLegend = legendItems || getDefaultLegend(connectionMode);

  if (orderedQuestionIds.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
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
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {activeLegend.map((item) => (
            <LegendItem
              key={`${item.label}-${item.color}`}
              color={item.color}
              label={item.label}
              variant={item.variant}
            />
          ))}
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
              key={`${edge.sourceId}-${edge.targetId}-${connectionMode}`}
              edge={edge}
              nodes={graphModel.positionedNodes}
              highlighted={graphModel.pathNodeSet.has(edge.sourceId) && graphModel.pathNodeSet.has(edge.targetId)}
              muted={connectionMode === "path"}
            />
          ))}

          {connectionMode === "path" &&
            graphModel.overlayPairs.map((pair, index) => (
              <PathOverlayLine
                key={`${pair.key}-${index}`}
                sourceId={pair.sourceId}
                targetId={pair.targetId}
                nodes={graphModel.positionedNodes}
              />
            ))}

          {[...graphModel.positionedNodes.values()].map((node) => {
            const pathIndex = orderedQuestionIds.findIndex((questionId) => questionId === node.id);
            const highlighted = pathIndex !== -1;
            const state = nodeStates?.[node.id];
            const isCurrent = currentQuestionId === node.id || state === "current";
            const fill = state ? NODE_STATE_COLOR[state] : DIFFICULTY_COLOR[node.difficulty] || "#58a6ff";
            const stroke = highlighted ? "#f8fafc" : "rgba(255,255,255,0.12)";
            const opacity = highlighted ? 1 : 0.78;
            const question = QUESTION_LOOKUP.get(node.id);
            const tooltipLines = [
              question?.question || node.id,
              `Difficulty: ${node.difficulty}`,
            ];

            if (state === "correct") tooltipLines.push("Latest outcome: Correct");
            if (state === "wrong") tooltipLines.push("Latest outcome: Wrong");
            if (state === "current") tooltipLines.push("Current active question");
            if (state === "pending") tooltipLines.push("Seen in path, not answered yet");

            return (
              <g key={node.id}>
                <title>{tooltipLines.join("\n")}</title>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={highlighted ? 7.5 : 4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={highlighted ? 2.6 : 0.8}
                  opacity={opacity}
                />
                {isCurrent && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={13.5}
                    fill="none"
                    stroke="rgba(56,189,248,0.75)"
                    strokeWidth={2.4}
                  />
                )}
                {showOrder && highlighted && (
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
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {footerItems.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {footerItems.map((item) => (
            <span key={item} className="rounded-full bg-muted px-3 py-1">
              {item}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function GraphEdgeLine({
  edge,
  nodes,
  highlighted,
  muted,
}: {
  edge: QuestionGraphEdge;
  nodes: Map<string, PositionedNode>;
  highlighted: boolean;
  muted: boolean;
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
          ? muted
            ? "rgba(250,204,21,0.2)"
            : "rgba(148,163,184,0.32)"
          : edge.kind === "subject-bridge"
            ? "rgba(96,165,250,0.24)"
            : edge.sameTopic
              ? "rgba(46,157,101,0.16)"
              : "rgba(148,163,184,0.12)"
      }
      strokeWidth={highlighted ? 1.8 : edge.kind === "subject-bridge" ? 1.4 : 1}
      strokeOpacity={1}
    />
  );
}

function PathOverlayLine({
  sourceId,
  targetId,
  nodes,
}: {
  sourceId: string;
  targetId: string;
  nodes: Map<string, PositionedNode>;
}) {
  const source = nodes.get(sourceId);
  const target = nodes.get(targetId);
  if (!source || !target) return null;

  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke="#facc15"
      strokeWidth={3}
      strokeLinecap="round"
      strokeOpacity={0.92}
    />
  );
}

function LegendItem({
  color,
  label,
  variant = "fill",
}: {
  color: string;
  label: string;
  variant?: "fill" | "ring";
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full"
        style={{
          backgroundColor: variant === "fill" ? color : "transparent",
          border: variant === "ring" ? `2px solid ${color}` : "none",
        }}
      />
      <span>{label}</span>
    </div>
  );
}
